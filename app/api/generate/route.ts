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

  const prompt = `Analyze these motivational/discipline TikTok transcripts and create a JAW-DROPPING, SCROLL-STOPPING script for content creation.

TRANSCRIPTS:
${combinedTranscripts}

ORIGINAL WORD COUNT: ${originalWordCount} words
TARGET SCRIPT LENGTH: 150-200 words maximum (optimized for 40-60 second videos)

TARGET AUDIENCE: Ambitious men aged 20-40 seeking discipline, self-improvement, and peak performance. They struggle with consistency and want practical strategies, not just motivational fluff.

CONTENT FOCUS: Motivational Content & Discipline Transformation, Daily discipline strategies, Success scenarios, Men's self-improvement, Ancient wisdom for modern challenges.

TONE REQUIREMENTS:
- Authoritative yet approachable
- Confident and Direct
- Inspiring but Grounded
- Fresh and Modern
- Use power words that EMPHASIZE and CONVINCE

SCRIPT STRUCTURE REQUIREMENTS:
1. POWERFUL HOOK (First 3-5 seconds): Must be attention-grabbing, controversial, or surprising statement that makes viewers STOP scrolling
2. PROBLEM IDENTIFICATION: Call out the exact struggle your audience faces
3. SOLUTION/INSIGHT: Provide practical, actionable wisdom
4. TRANSFORMATION PROMISE: Paint the picture of who they can become
5. CALL TO ACTION: Direct, masculine, action-oriented ending

POWERFUL LANGUAGE PATTERNS (ROTATE FOR VARIETY):

**Psychological Triggers (pick ONE that fits the content best):**
- "Most men will never..." / "The average guy doesn't..."
- "Here's what separates champions from the rest..."
- "The brutal truth is..."
- "This is what nobody tells you about..."
- "While others make excuses, you..."
- "Here's why 99% fail at..."
- "Stop doing what everyone else does..."
- "The difference between success and failure is..."

**Engagement Hooks:**
- "If you're serious about..."
- "This changed everything for me..."
- "Stop lying to yourself..."
- "The secret that changed everything..."
- "What if I told you..."

**Power Words:** DOMINATE, CONQUER, MASTER, UNLEASH, TRANSFORM, ELEVATE, BREAKTHROUGH, DESTROY, BUILD, CREATE

CRITICAL: Choose the psychological trigger that best matches the specific content and tone. Avoid overused phrases - select based on what creates maximum impact for THIS particular message.

AVOID:
- Weak language or hesitation
- Generic motivational clichés
- Complicated concepts without practical application
- Anything that sounds like basic self-help

The script must be IMMEDIATELY engaging from word one, maintain intensity throughout, and end with viewers feeling compelled to take action. This is going to CapCut AI for voice generation - make it POWERFUL.

VARIETY REQUIREMENTS:
- Select the psychological trigger that best fits THIS specific content
- Choose hook style based on the message (question, statement, challenge, revelation)
- Use power words that naturally fit the transformation being described
- Make each script feel authentic to its specific message, not formulaic

DESCRIPTION & HASHTAG REQUIREMENTS:
- Description: 1-2 sentences max, punchy call-to-action, include relevant emojis
- Hashtags: Mix of 3-5 UNIQUE tags combining broad appeal (#Motivation) with specific niche (#GrindSeason, #DisciplineTransformation). NO DUPLICATES.
- Style reference: "Unlock your potential! 🌟 Remember, it's you against yourself. Stay focused, eliminate distractions, and prioritize your goals. Transform your life today! 💪 #Motivation #SelfGrowth #GrindSeason #DreamBig ✨"

{
  "script": "Transform the content into a jaw-dropping, scroll-stopping script with powerful hook, clear problem/solution, ONE psychological trigger that fits this specific message, and strong call to action. 150-200 words maximum for optimal 40-60 second video length...",
  "title": "Powerful, masculine title that promises transformation or reveals a hard truth...",
  "description": "Punchy 1-2 sentence description with emojis and call-to-action that complements the script...",
  "hashtags": "#Motivation #SpecificNiche #BroadAppeal #ActionOriented"
}`;

  const completion = await openai.chat.completions.create({
    model: "o1-mini",
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
