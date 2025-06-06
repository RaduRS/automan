import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedContent {
  script: string;
  title: string;
}

async function generateScript(
  transcripts: string[]
): Promise<GeneratedContent> {
  const combinedTranscripts = transcripts
    .map((t, i) => `Video ${i + 1}:\n${t}`)
    .join("\n\n");

  // Count words in original content to maintain similar length
  const originalWordCount = combinedTranscripts.split(/\s+/).length;
  const targetWordCount = Math.round(originalWordCount * 0.9); // Aim for 90% of original length

  const prompt = `Analyze these TikTok transcripts and create a fresh script for content creation.

TRANSCRIPTS:
${combinedTranscripts}

ORIGINAL WORD COUNT: ${originalWordCount} words
TARGET SCRIPT LENGTH: ${targetWordCount} words (±20%)

Transform the original content with a FRESH PERSPECTIVE while maintaining similar length and core message. Make it conversational and natural. The script should be approximately ${targetWordCount} words to maintain similar video duration.

IMPORTANT GUIDELINES:
- DON'T just summarize - give it fresh perspective while keeping the same depth
- MAINTAIN similar speaking duration as original content
- Make it conversational and natural
- Keep the core insights and message intact
- Respond with ONLY valid JSON, no markdown formatting

{
  "script": "Fresh perspective on the original content, conversational and natural, approximately ${targetWordCount} words...",
  "title": "Engaging title for the content..."
}`;

  const completion = await openai.chat.completions.create({
    model: "o1-mini",
    messages: [
      {
        role: "user",
        content: `You are an expert content creator specializing in transforming viral social media content into fresh, engaging scripts. Your job is to give fresh perspective to existing content while maintaining similar length and depth. Focus on creating natural, conversational scripts that can be used for video content creation. Always respond with valid JSON only, no markdown formatting.

${prompt}`,
      },
    ],
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error("No response from OpenAI");
  }

  console.log("🤖 Raw OpenAI Response:", response);

  try {
    // Handle potential markdown code blocks from OpenAI
    let jsonString = response.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    console.log("🔍 Cleaned JSON String:", jsonString);

    const parsedContent = JSON.parse(jsonString);
    console.log(
      "✅ Parsed OpenAI Content:",
      JSON.stringify(parsedContent, null, 2)
    );

    return parsedContent;
  } catch (parseError) {
    console.error("❌ Failed to parse OpenAI response:", response);
    console.error("❌ Parse error:", parseError);
    throw new Error("Invalid JSON response from OpenAI");
  }
}

async function updateJobWithGeneratedContent(
  jobId: string,
  content: GeneratedContent
) {
  console.log("💾 Updating job with generated content:", {
    jobId,
    content: JSON.stringify(content, null, 2),
  });

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "script_generated",
      openai_script: content.script,
      job_title: content.title,
      // Store additional content in a JSON field if we add it later
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`);
  }

  console.log("✅ Job updated successfully in database");
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

    console.log(`Starting script generation for job: ${jobId}`);

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

    // Check if transcription is complete
    if (job.status !== "transcription_complete") {
      return NextResponse.json(
        { success: false, error: "Transcription not complete" },
        { status: 400 }
      );
    }

    // Collect available transcripts
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

    // Update status to generating
    await supabase
      .from("jobs")
      .update({ status: "generating_script" })
      .eq("id", jobId);

    // Generate content using OpenAI
    const generatedContent = await generateScript(transcripts);

    // Update job with generated content
    await updateJobWithGeneratedContent(jobId, generatedContent);

    console.log(`Script generation completed for job: ${jobId}`);

    const responseContent = {
      success: true,
      message: "Script generated successfully",
      content: {
        title: generatedContent.title,
        script: generatedContent.script,
      },
    };

    console.log(
      "📤 API Response Content:",
      JSON.stringify(responseContent, null, 2)
    );

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
