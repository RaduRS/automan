import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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
  transcripts: string[]
): Promise<GeneratedContent> {
  const combinedTranscripts = transcripts
    .map((t, i) => `Video ${i + 1}:\n${t}`)
    .join("\n\n");

  const prompt = `You are "Peak Script", an expert viral scriptwriter for men's self-improvement content. Your target audience is ambitious men (20-40) seeking practical discipline strategies. Your tone is authentic, direct, and conversational—like a friend giving real advice.

You will transform the following transcripts into a new, original, scroll-stopping script, outputting it as a JSON object containing a title, description, and an array of scenes.

**SOURCE TRANSCRIPTS:**
${combinedTranscripts}
TARGET SCRIPT LENGTH: Strictly between 180-200 words (optimized for a video duration of approximately 60 seconds).

**YOUR THOUGHT PROCESS (Chain-of-Thought):**
1.  **Deconstruct Core Message:** What is the single most powerful idea or insight from the source transcripts?
2.  **Brainstorm Hooks:** Based on the core message, brainstorm 3 different, powerful opening hooks using the "APPROVED OPENING PATTERNS". They must feel authentic and not cliché.
3.  **Select Best Hook:** Choose the most potent, scroll-stopping hook from the brainstormed list.
4.  **Draft the Script:** (In Your Head) Mentally draft a complete, ~180-word script that starts with the chosen hook and develops the core message. It must be conversational and provide practical insight.
5.  **Refine & Polish:** Review the draft against all "CRITICAL RULES & CONSTRAINTS". Fix any banned phrases, check grammar, and ensure it flows like natural speech.
6.  **Breakdown and Refine Scenes:** Follow the SCENE BREAKDOWN INSTRUCTIONS.
7.  **Generate Metadata:** Create a compelling title and a short description. The description MUST end with an engaging question for the audience.

**CRITICAL RULES & CONSTRAINTS:**
-   **Tone:** Authentic, direct, conversational, no corporate fluff.
-   **Banned Words/Phrases:** "The brutal truth is...", "Unleash", "Dominate", "Conquer", "Elevate", "Transform your mindset", "Ancient wisdom", "Unlock your potential", "It's time to...", "Ever notice", "You ever", "Did you ever". Avoid all generic hustle-culture buzzwords.
-   **Output Format:** You MUST return ONLY a valid JSON object. Do not include any text or markdown before or after the JSON.

**SCENE BREAKDOWN INSTRUCTIONS (CRITICAL):**
- Your primary task is to generate the "scenes" array. The full script will be constructed from this array.
- Each scene = 1 sentence. **Semantic Cohesion Rule:** If two consecutive sentences are directly related and form a single idea (like a setup and a payoff, or a person and their achievement), you MUST combine them into a single scene.
- **Target Scene Count:** The final number of scenes MUST be between 8 and 12. This is the ideal range for a ~60-second video to maintain viewer engagement.
- **This is the most important rule: Every single string in the "scenes" array MUST be between 10 and 25 words.** This is a strict requirement.
}

CRITICAL: You MUST return the response in this EXACT JSON format:

{
  "scenes": [
    "First scene sentence here",
    "Second scene sentence here",
    "Third scene sentence here"
  ],
  "title": "Video title here",
  "description": "Description here",
}
`;

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

    // Programmatically add your strategic hashtags
    generatedContent.hashtags =
      "#peakshifts #motivation #selfimprovement #discipline #mindsetshift";

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
      hashtags: "#peakshifts #error",
    };
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
        scenes: generatedContent.scenes,
        description: generatedContent.description,
        hashtags: generatedContent.hashtags,
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
