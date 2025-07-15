import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBrandConfig, type BrandName } from "@/lib/brand-config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedContent {
  script: string;
  scenes: string[];
  title: string;
  description: string;
  hashtags: string;
}

async function generateScript(
  inputTexts: string[],
  brand: BrandName
): Promise<GeneratedContent> {
  const combinedInput = inputTexts
    .map((text, i) =>
      inputTexts.length > 1 ? `Source ${i + 1}:\n${text}` : text
    )
    .join("\n\n");

  const brandConfig = getBrandConfig(brand);
  const prompt = brandConfig.scriptPrompt.replace(
    "{INPUT_TEXT}",
    combinedInput
  );

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      // Enforce JSON output for reliability
      response_format: { type: "json_object" },
      // Parameters to discourage repetition
      frequency_penalty: 0.4,
      presence_penalty: 0.4,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const contentString = completion.choices[0]?.message?.content;
    if (!contentString) {
      throw new Error("No content received from OpenAI");
    }

    // Parse the JSON response
    const generatedContent: GeneratedContent = JSON.parse(contentString);

    // Generate basic hashtags based on brand theme
    const baseHashtags = {
      peakshifts: "#motivation #selfimprovement #mindset",
      dreamfloat: "#sleepcore #peaceful #relaxation",
      lorespark: "#scifi #fantasy #storytelling",
      heartbeats: "#emotional #growth #selfcare",
    };
    generatedContent.hashtags = baseHashtags[brand] || "#motivation #content";

    const scenes = generatedContent.scenes;

    generatedContent.script = scenes.join(" ");

    return generatedContent;
  } catch (error) {
    console.error("Error in generateScript:", error);
    // Provide a fallback JSON object in case of error
    return {
      script: "Something went wrong. Could not generate script.",
      scenes: ["Error generating script."],
      title: "Error",
      description: "An error occurred.",
      hashtags: "#motivation #error",
    };
  }
}

async function updateJobWithGeneratedContent(
  jobId: string,
  content: GeneratedContent
) {
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "script_generated",
      openai_script: content.script,
      script_scenes: JSON.stringify(content.scenes),
      job_title: content.title,
      job_description: content.description,
      job_hashtags: content.hashtags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  let jobId: string | undefined;

  try {
    const requestBody = await request.json();
    jobId = requestBody.jobId;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get job details
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // Check if ready for script generation
    const isTextMode = job.input_mode === "text";
    const isReadyForGeneration =
      job.status === "transcription_complete" ||
      (isTextMode && job.status === "submitted");

    if (!isReadyForGeneration) {
      return NextResponse.json(
        { success: false, error: "Job not ready for script generation" },
        { status: 400 }
      );
    }

    // Prepare input based on input mode
    let inputTexts: string[] = [];

    if (job.input_mode === "text") {
      // Use text input directly
      if (!job.text_input || !job.text_input.trim()) {
        return NextResponse.json(
          { success: false, error: "No text input available" },
          { status: 400 }
        );
      }
      inputTexts = [job.text_input.trim()];
    } else if (job.input_mode === "tiktok") {
      // Use transcripts from TikTok processing
      const transcripts = [
        job.transcript_1,
        job.transcript_2,
        job.transcript_3,
      ].filter(Boolean) as string[];

      if (transcripts.length === 0) {
        return NextResponse.json(
          { success: false, error: "No transcripts available" },
          { status: 400 }
        );
      }
      inputTexts = transcripts;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid input mode" },
        { status: 400 }
      );
    }

    // For text mode, first update to transcription_complete, then to generating_script
    if (isTextMode && job.status === "submitted") {
      await supabase
        .from("jobs")
        .update({ status: "transcription_complete" })
        .eq("id", jobId);
    }

    // Update status to generating
    await supabase
      .from("jobs")
      .update({ status: "generating_script" })
      .eq("id", jobId);

    // Generate content using OpenAI with brand-specific prompt
    const brand = (job.brand as BrandName) || "peakshifts";
    const generatedContent = await generateScript(inputTexts, brand);

    // Update job with generated content
    await updateJobWithGeneratedContent(jobId, generatedContent);

    const responseContent = {
      success: true,
      message: "Script generated successfully",
      content: {
        title: generatedContent.title,
        script: generatedContent.script,
        scenes: generatedContent.scenes,
        description: generatedContent.description,
        hashtags: generatedContent.hashtags,
      },
    };

    return NextResponse.json(responseContent);
  } catch (error) {
    console.error("Generate API error:", error);

    // Update job status to error if we have a jobId
    if (jobId) {
      try {
        await supabase
          .from("jobs")
          .update({
            status: "error",
            error_message: `Script generation failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          })
          .eq("id", jobId);
      } catch (updateError) {
        console.error("Failed to update job error status:", updateError);
      }
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
