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
    const { prompt, sentence } = requestBody;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    console.log(
      `Regenerating image with existing prompt: "${prompt.substring(
        0,
        100
      )}..."`
    );

    // Generate image using the existing prompt (skip OpenAI)
    console.log("Regenerating image with Replicate...");
    const imageUrl = await generateImage(prompt.trim());
    console.log("Regenerated image URL:", imageUrl);

    // Store the regenerated image in database (without cost tracking)
    const { data: dbData, error: dbError } = await supabase
      .from("image_generations")
      .insert({
        sentence: sentence?.trim() || "Regenerated image",
        prompt_generated: prompt.trim(),
        image_url: imageUrl,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Failed to store regenerated image in database:", dbError);
    }

    const result: ImageResult = {
      url: imageUrl,
      prompt: prompt.trim(),
      id: dbData?.id,
    };

    return NextResponse.json({
      success: true,
      message: "Image regenerated successfully",
      image: result,
    });
  } catch (error) {
    console.error("Regenerate image API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
