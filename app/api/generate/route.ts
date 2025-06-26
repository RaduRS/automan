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

HOOK VARIETY REQUIREMENTS (CRITICAL - CHOOSE DIVERSE OPENINGS):
- AVOID predictable patterns like always starting with "Ever notice"
- SELECT opening styles that best match the content and audience
- PRIORITIZE fresh, unexpected hooks over formulaic ones
- CHOOSE from diverse opening approaches to keep content engaging

AUTHENTIC LANGUAGE PATTERNS (Select the most natural fit for this specific content):
- Direct questions: "You know what's crazy?" "Know what I realized?" "What if I told you..."
- Real observations: "Here's the thing..." "Look..." "I noticed something..."
- Personal insights: "I figured out..." "Here's what changed for me..." "Let me tell you something..."
- Conversational challenges: "Stop playing that game..." "Cut that out..." "Here's your problem..."
- Bold statements: "Most guys get this wrong..." "Nobody talks about this..." "This changed everything..."
- Relatable scenarios: "Picture this..." "You know that feeling when..." "We've all been there..."
- Natural transitions: "But here's the deal..." "The thing is..." "Here's what's wild..."

PRESERVE AUTHENTICITY:
- Keep any natural speech patterns from the original transcripts
- Don't over-polish the language - rough edges make it real
- Use contractions and casual language when appropriate
- Maintain the emotional tone and intensity of the original
- Let personality shine through instead of corporate polish

AVOID AT ALL COSTS:
- Template language that sounds like every other motivational post
- Buzzword-heavy sentences
- Overly formal or "professional" tone
- Generic self-help speak
- Anything that doesn't sound like natural conversation
- OVERUSED OPENING PATTERNS (especially defaulting to "Ever notice")
- Predictable or formulaic hooks that sound like templates
- Generic openings that could apply to any motivational content

DESCRIPTION & HASHTAG REQUIREMENTS:
- Description: 1-2 sentences max, conversational tone with relevant emojis
- Hashtags: Mix of 3-5 UNIQUE tags combining broad appeal (#Motivation) with specific niche. Avoid overused tags like #GrindSeason
- Keep it authentic, not corporate

{
  "script": "Transform the content while preserving the authentic conversational voice and natural energy. Keep it real, relatable, and true to the original speaking style. 150-200 words maximum...",
  "title": "Authentic, attention-grabbing title that sounds like real conversation, not corporate speak...",
  "description": "Natural, conversational description with emojis that complements the authentic script...",
  "hashtags": "#Motivation #SpecificNiche #BroadAppeal #ActionOriented"
}`;

  const completion = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [
      {
        role: "user",
        content: `You are an expert content creator specializing in creating VIRAL motivational content for ambitious men. Your specialty is transforming existing motivational content into JAW-DROPPING, SCROLL-STOPPING scripts that command attention and drive action.

Your audience consists of ambitious men aged 20-40 who:
- Struggle with consistency in their personal development
- Want practical discipline strategies, not just motivational fluff
- Are interested in ancient wisdom applied to modern challenges
- Consume content on mobile platforms (TikTok, Instagram, YouTube)
- Value transformation and results over entertainment

Your tone must be authoritative yet approachable, confident and direct, inspiring but grounded. Use masculine, powerful language that emphasizes and convinces. Always start with a hook that makes viewers STOP scrolling immediately.

Focus on discipline transformation, peak performance, success scenarios, and practical self-improvement strategies. Always respond with valid JSON only, no markdown formatting.

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
