import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function regenerateTextWithOpenAI(
  currentText: string,
  fullScript: string
): Promise<string> {
  // Count words in current text
  const currentWordCount = currentText.trim().split(/\s+/).length;
  const targetMinWords = Math.max(1, currentWordCount - 4);
  const targetMaxWords = Math.min(35, currentWordCount + 3);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert content writer. Your task is to rewrite a given sentence to say the same thing but in a different, more engaging way. Keep the core meaning and tone, but make it fresh and compelling. 

CRITICAL REQUIREMENTS:
- The rewritten text must be between ${targetMinWords} and ${targetMaxWords} words (current text has ${currentWordCount} words)
- Maximum 35 words regardless of original length
- Return ONLY the rewritten sentence without any quotes or additional formatting
- Keep the same meaning and tone`,
      },
      {
        role: "user",
        content: `Here is the full script context: "${fullScript}"\n\nPlease rewrite this specific sentence (${currentWordCount} words) to say the same thing but differently and more engagingly, keeping it between ${targetMinWords}-${targetMaxWords} words: "${currentText}"`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });

  const regeneratedText = completion.choices[0]?.message?.content?.trim();
  if (!regeneratedText) {
    throw new Error("No response from OpenAI");
  }
  return regeneratedText;
}

export async function POST(request: NextRequest) {
  try {
    const { sceneId, currentText, fullScript, jobId } = await request.json();

    if (!sceneId || !currentText || !fullScript || !jobId) {
      return NextResponse.json(
        {
          error: "Scene ID, current text, full script, and job ID are required",
        },
        { status: 400 }
      );
    }

    // Use OpenAI GPT-4o-mini directly
    const regeneratedText = await regenerateTextWithOpenAI(
      currentText,
      fullScript
    );

    // Now update the scene in the database
    const { data: jobData, error: fetchError } = await supabase
      .from("jobs")
      .select("script_scenes")
      .eq("id", jobId)
      .single();

    if (fetchError || !jobData?.script_scenes) {
      return NextResponse.json(
        { error: "Failed to fetch job data" },
        { status: 500 }
      );
    }

    // Parse scenes and update the specific scene
    const scenes = JSON.parse(jobData.script_scenes) as string[];
    const sceneIndex = sceneId - 1;

    if (sceneIndex < 0 || sceneIndex >= scenes.length) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Update the scene with regenerated text
    scenes[sceneIndex] = regeneratedText;

    // Regenerate the full script
    const updatedFullScript = scenes.join(" ");

    // Save both updated scenes and full script to database
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        script_scenes: JSON.stringify(scenes),
        openai_script: updatedFullScript,
      })
      .eq("id", jobId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update scene in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      regeneratedText,
      updatedFullScript,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
