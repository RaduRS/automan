import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

// Configure OpenAI
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

  // Count words in original content for reference
  const originalWordCount = combinedTranscripts.split(/\s+/).length;

  const prompt = `Transform these motivational/discipline TikTok transcripts into an authentic, scroll-stopping script that preserves the raw, conversational energy.

TRANSCRIPTS:
${combinedTranscripts}

ORIGINAL WORD COUNT: ${originalWordCount} words
TARGET SCRIPT LENGTH: 150-200 words maximum (optimized for 40-60 second videos)

TARGET AUDIENCE: Ambitious men aged 20-40 seeking discipline, self-improvement, and peak performance. They struggle with consistency and want practical strategies, not just motivational fluff.

CONTENT FOCUS: Motivational Content & Discipline Transformation, Daily discipline strategies, Success scenarios, Men's self-improvement, Ancient wisdom for modern challenges.

CRITICAL TONE REQUIREMENTS:
- PRESERVE the conversational, authentic voice from the original transcripts
- Keep the natural flow and rhythm - don't make it sound scripted
- Use the SAME energy level as the original content
- Maintain any slang, casual language, or personality quirks that make it authentic
- Sound like someone talking to a friend, not giving a corporate presentation

BANNED PHRASES & WORDS (DO NOT USE):
- "The brutal truth is..."
- "Unleash", "Dominate", "Conquer", "Destroy", "Elevate"  
- "Transform your mindset"
- "Ancient wisdom"
- "Unlock your potential"
- "It's time to..." (unless naturally occurring in original)
- Generic hustle culture buzzwords
- Corporate motivational speak

SCRIPT STRUCTURE REQUIREMENTS:
1. AUTHENTIC HOOK (First 3-5 seconds): Use natural, conversational opening that feels real - questions, observations, or relatable statements
2. KEEP IT REAL: Maintain the speaking style and energy of the original content
3. PRACTICAL INSIGHT: Give actionable advice in natural language
4. RELATABLE CONCLUSION: End with something that feels genuine, not forced
5. NATURAL CALL TO ACTION: If included, make it feel organic to the conversation

CRITICAL HOOK REQUIREMENTS:
- NEVER start with "Ever notice", "You ever", "Did you ever" - these are BANNED
- Use FRESH, powerful openings that grab attention immediately
- Each script must have PERFECT grammar and flow naturally

APPROVED OPENING PATTERNS (choose one):
- Bold statements: "Most guys get this wrong..." "Nobody talks about this..." "This changed everything..."
- Direct challenges: "Stop playing that game..." "Cut that out..." "Here's your problem..."
- Powerful observations: "Here's the thing..." "Look..." "I noticed something..."
- Personal insights: "I figured out..." "Here's what changed for me..." "Let me tell you something..."
- Questions (NOT "ever" questions): "You know what's crazy?" "Know what I realized?" "What if I told you..."
- Relatable scenarios: "Picture this..." "You know that feeling when..." "We've all been there..."

GRAMMAR & FLOW REQUIREMENTS:
- Check EVERY sentence for proper grammar
- Ensure natural speech patterns
- Fix any awkward phrasing immediately
- Each scene must be a complete, well-formed thought

PRESERVE AUTHENTICITY:
- Keep any natural speech patterns from the original transcripts
- Don't over-polish the language - rough edges make it real
- Use contractions and casual language when appropriate
- Maintain the emotional tone and intensity of the original
- Let personality shine through instead of corporate polish

BANNED PHRASES & PATTERNS:
- "Ever notice", "You ever", "Did you ever" - NEVER USE THESE
- "The brutal truth is..."
- "Unleash", "Dominate", "Conquer", "Destroy", "Elevate"
- "Transform your mindset", "Ancient wisdom", "Unlock your potential"
- Template language and buzzwords
- Poor grammar like "You have so fucking potential" (should be "You have so fucking MUCH potential")
- Generic openings that sound like every other motivational post

CRITICAL: You MUST return the response in this EXACT JSON format:

{
  "script": "The complete script as one piece...",
  "scenes": [
    "First scene sentence here",
    "Second scene sentence here",
    "Third scene sentence here"
  ],
  "title": "Video title here",
  "description": "Description here",
  "hashtags": "#Tag1 #Tag2 #Tag3"
}

SCENE BREAKDOWN INSTRUCTIONS:
- Take your complete script and BREAK IT into 6-12 individual sentences
- Each scene = 1 sentence that makes sense on its own
- When played together, scenes = the complete script
- Each sentence should be 8-25 words (good for voice timing)

EXAMPLE:
If script is: "You know what's crazy? Most people quit right before their breakthrough. Here's what I learned..."
Then scenes should be: ["You know what's crazy?", "Most people quit right before their breakthrough.", "Here's what I learned..."]`;

  const completion = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [
      {
        role: "user",
        content: `You create viral motivational scripts for men aged 20-40. Create a complete script AND break it into individual sentences (scenes) for video production.

IMPORTANT: Respond with ONLY valid JSON, no markdown. Follow the exact format shown in the prompt.

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
