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
  hashtags: string;
  hook: string;
  speaking_instructions: {
    tone: string;
    pace: string;
    emphasis_points: string[];
  };
  video_elements: {
    background_suggestion: string;
    text_overlays: string[];
    call_to_action: string;
  };
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

  const prompt = `Analyze these TikTok transcripts and create optimized content for Anam AI avatar video generation.

TRANSCRIPTS:
${combinedTranscripts}

ORIGINAL WORD COUNT: ${originalWordCount} words
TARGET SCRIPT LENGTH: ${targetWordCount} words (±20%)

Create content optimized for Anam AI avatar video generation:

1. SPEAKING SCRIPT: Transform the original content with a FRESH PERSPECTIVE while maintaining similar length and core message. Make it conversational and natural for AI avatar delivery. The script should be approximately ${targetWordCount} words to maintain similar video duration.

2. TITLE: Attention-grabbing title (under 100 characters)
3. HASHTAGS: 3-5 relevant hashtags for social media  
4. HOOK: Opening line that captures attention (under 25 words)
5. SPEAKING INSTRUCTIONS: How the AI avatar should deliver the content
6. VIDEO ELEMENTS: Visual suggestions to enhance the AI avatar video

IMPORTANT GUIDELINES:
- DON'T just summarize - give it fresh perspective while keeping the same depth
- MAINTAIN similar speaking duration as original content
- Make it conversational and natural for AI avatar
- Keep the core insights and message intact
- Respond with ONLY valid JSON, no markdown formatting

{
  "script": "Fresh perspective on the original content, conversational for AI avatar, approximately ${targetWordCount} words...",
  "title": "Engaging title...",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3",
  "hook": "Attention-grabbing opening line...",
  "speaking_instructions": {
    "tone": "conversational/professional/energetic/calm",
    "pace": "normal/slow/fast", 
    "emphasis_points": ["key phrase 1", "key phrase 2"]
  },
  "video_elements": {
    "background_suggestion": "Simple background description for Anam template",
    "text_overlays": ["Text overlay 1", "Text overlay 2"],
    "call_to_action": "Clear call to action for viewers"
  }
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert content creator specializing in transforming viral social media content into engaging AI avatar videos for Anam AI. Your job is to give fresh perspective to existing content while maintaining similar length and depth. Focus on creating natural, conversational scripts that AI avatars can deliver effectively, matching the original content's speaking duration. Always respond with valid JSON only, no markdown formatting.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 3000, // Increased to handle longer content
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

async function createAnamVideo(script: string, jobId: string): Promise<string> {
  const anamApiKey = process.env.ANAM_API_KEY;
  const anamApiId = process.env.ANAM_API_ID;

  if (!anamApiKey || !anamApiId) {
    throw new Error("Anam API credentials not configured");
  }

  console.log("🎬 Creating Anam video session...");

  try {
    // First, create a session token for the avatar
    const sessionResponse = await fetch(
      `https://api.anam.ai/v1/auth/session-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anamApiKey}`,
        },
        body: JSON.stringify({
          personaConfig: {
            id: anamApiId, // Use your specific persona ID (Bella)
          },
        }),
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("❌ Anam session creation failed:", errorText);
      throw new Error(
        `Anam session creation failed: ${sessionResponse.status}`
      );
    }

    const sessionData = await sessionResponse.json();
    const sessionToken = sessionData.sessionToken;

    console.log("✅ Anam session created successfully");

    // For now, we'll store the session token and mark as video_generated
    // In a real implementation, you would use Anam's video generation capabilities
    // or integrate with their streaming SDK to create downloadable videos

    // Update job with Anam session info
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        status: "video_generated",
        anam_session_token: sessionToken,
        anam_session_id: sessionData.sessionId || sessionToken,
        video_url: null, // Will be populated when Anam provides video URL
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      throw new Error(
        `Failed to update job with Anam data: ${updateError.message}`
      );
    }

    return sessionToken;
  } catch (error) {
    console.error("❌ Anam video creation error:", error);
    throw error;
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

    console.log(
      `Starting script generation and video creation for job: ${jobId}`
    );

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

    // Create Anam video
    await supabase
      .from("jobs")
      .update({ status: "generating_video" })
      .eq("id", jobId);

    const anamSessionToken = await createAnamVideo(
      generatedContent.script,
      jobId
    );

    console.log(
      `Script generation and video creation completed for job: ${jobId}`
    );

    const responseContent = {
      success: true,
      message: "Script generated and Anam video session created successfully",
      content: {
        title: generatedContent.title,
        script: generatedContent.script,
        hook: generatedContent.hook,
        hashtags: generatedContent.hashtags,
        speaking_instructions: generatedContent.speaking_instructions,
        video_elements: generatedContent.video_elements,
        anam_session_token: anamSessionToken,
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
            error_message: `Script generation or video creation failed: ${
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
