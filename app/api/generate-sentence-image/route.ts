import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

// Configure Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface ImageResult {
  url: string;
  prompt: string;
  id?: string;
}

async function generateImagePrompt(
  sentence: string,
  scriptContext?: string
): Promise<string> {
  try {
    // Create the context-aware prompt for OpenAI
    const contextPrompt = scriptContext
      ? `Based on this full motivational script context:
"${scriptContext}"

Now create a visual image description specifically for this sentence from the script: "${sentence}"`
      : `Create a visual image description inspired by this concept: "${sentence}"`;

    // Use OpenAI o1-mini to generate a creative image prompt based on the sentence
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "user",
          content: `${contextPrompt}

ANALYZE THE SENTENCE MEANING FIRST:
Look at the SPECIFIC words, emotions, and concepts in this sentence. Don't use generic templates.

For "${sentence}":
- What is the main ACTION or concept?
- What EMOTION or feeling does it convey?
- What specific OBJECTS, SETTINGS, or SCENES would visually represent this?
- Is it about learning, breakthrough, change, action, struggle, success, time, relationships, etc.?

CRITICAL REQUIREMENTS:
- Black and white photography with MODERATE contrast (avoid pure black areas)
- Soft shadows with visible details throughout the frame
- ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING anywhere in the image
- Professional composition suitable for social media
- FAMILY-FRIENDLY content only

SENTENCE-SPECIFIC VISUAL MAPPING:
- LEARNING/REALIZATION ("attention", "teaching", "shifted", "understanding"): Books, lightbulb moments, open journals, studying scenes, breakthrough moments
- GROWTH/PROGRESS ("building", "growing", "developing"): Plants growing, construction, stairs, ladders, before/after contrasts
- TIME/CONSISTENCY ("daily", "routine", "habit"): Clocks, calendars, sunrise/sunset, repeated patterns
- STRENGTH/POWER ("strong", "discipline", "force"): Gym equipment, natural forces, solid structures
- OBSTACLES/CHALLENGES ("setback", "struggle", "difficult"): Hurdles, rocky paths, storms clearing, bridges
- BREAKTHROUGH/CHANGE ("shifted", "breakthrough", "transformed"): Doors opening, walls breaking, light through darkness
- FOCUS/ATTENTION ("focus", "concentrate", "attention"): Magnifying glass, telescope, spotlight, clear vs blurry
- ACTION/MOVEMENT ("take action", "start", "move"): Running, walking, hands in motion, beginning gestures

CREATE A UNIQUE VISUAL REPRESENTATION:
Based on the sentence's SPECIFIC meaning, describe ONE clear, realistic scene that a photographer could actually capture.

AVOID:
- Generic "person sitting on bench" unless the sentence is specifically about sitting or resting
- Repetitive imagery you've used before
- Abstract concepts that can't be photographed
- Multiple unrelated objects in one scene

Return ONLY a clean, simple sentence describing ONE realistic scene that directly relates to the meaning of "${sentence}". Be specific and varied.`,
        },
      ],
    });

    const prompt = completion.choices[0]?.message?.content?.trim();

    if (!prompt) {
      throw new Error("No prompt generated from OpenAI");
    }

    return prompt;
  } catch (error) {
    console.error("Error generating prompt with OpenAI:", error);
    // Fallback: generate a basic prompt based on the sentence
    return `A professional business setting with clean lighting and motivational atmosphere, representing determination and focus`;
  }
}

async function generateImage(prompt: string): Promise<string> {
  try {
    const input = {
      prompt: `${prompt}. Black and white photography with SOFT contrast, gentle shadows with visible details, balanced lighting that avoids harsh darkness, professional quality, motivational and dynamic imagery. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS, NO TYPOGRAPHY anywhere in the image. This is a pure visual image with NO TEXT ELEMENTS AT ALL. Ensure ALL areas have visible detail - no pure black or pure white zones. Action-oriented, powerful, and inspiring content`,
      go_fast: true,
      num_outputs: 1,
      aspect_ratio: "9:16", // Vertical format
      output_format: "png",
      output_quality: 90,
    };

    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input,
    });

    if (output && Array.isArray(output) && output[0]) {
      return output[0].toString();
    } else {
      throw new Error("No image generated from Replicate");
    }
  } catch (error) {
    console.error("Error generating image with Replicate:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { sentence, scriptContext } = requestBody;

    if (!sentence || typeof sentence !== "string" || !sentence.trim()) {
      return NextResponse.json(
        { error: "Sentence is required" },
        { status: 400 }
      );
    }

    console.log(`Generating image for sentence: "${sentence}"`);
    if (scriptContext) {
      console.log(
        `Using script context: "${scriptContext.substring(0, 100)}..."`
      );
    }

    // Step 1: Generate image prompt using OpenAI o1-mini
    console.log("Generating image prompt with OpenAI o1-mini...");
    const imagePrompt = await generateImagePrompt(
      sentence.trim(),
      scriptContext?.trim()
    );
    console.log("Generated prompt:", imagePrompt);

    // Step 2: Generate image using Replicate
    console.log("Generating image with Replicate...");
    const imageUrl = await generateImage(imagePrompt);
    console.log("Generated image URL:", imageUrl);

    // Track generation in database
    const { data: dbData, error: dbError } = await supabase
      .from("image_generations")
      .insert({
        sentence: sentence.trim(),
        prompt_generated: imagePrompt,
        image_url: imageUrl,
        cost: 0.003,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Failed to track generation in database:", dbError);
    }

    // Update cumulative stats (historical usage that never decreases)
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        }/api/update-cumulative-stats`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cost: 0.003,
            increment: 1,
          }),
        }
      );
    } catch (statsError) {
      console.error("Failed to update cumulative stats:", statsError);
      // Don't fail the request if stats update fails
    }

    const result: ImageResult = {
      url: imageUrl,
      prompt: imagePrompt,
      id: dbData?.id,
    };

    return NextResponse.json({
      success: true,
      message: "Image generated successfully",
      image: result,
    });
  } catch (error) {
    console.error("Generate sentence image API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
