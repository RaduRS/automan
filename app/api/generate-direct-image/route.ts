import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
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
    const { prompt } = requestBody;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    console.log(`Generating image with direct prompt: "${prompt}"`);

    // Generate image directly using Replicate (skip OpenAI)
    console.log("Generating image with Replicate...");
    const imageUrl = await generateImage(prompt.trim());
    console.log("Generated image URL:", imageUrl);

    // Track generation in database
    const { data: dbData, error: dbError } = await supabase
      .from("image_generations")
      .insert({
        sentence: "Direct prompt",
        prompt_generated: prompt.trim(),
        image_url: imageUrl,
        cost: 0.003, // Only Replicate cost, no OpenAI cost
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
      prompt: prompt.trim(),
      id: dbData?.id,
    };

    return NextResponse.json({
      success: true,
      message: "Image generated successfully",
      image: result,
    });
  } catch (error) {
    console.error("Generate direct image API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
