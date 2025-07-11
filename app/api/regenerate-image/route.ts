import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

interface ImageResult {
  url: string;
  prompt: string;
  id?: string;
}

async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await fetch(
      "https://api.studio.nebius.ai/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux-schnell",
          prompt: `${prompt}. Black and white photography with SOFT contrast, gentle shadows with visible details, balanced lighting that avoids harsh darkness, professional quality, motivational and dynamic imagery. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS, NO TYPOGRAPHY anywhere in the image. This is a pure visual image with NO TEXT ELEMENTS AT ALL. Ensure ALL areas have visible detail - no pure black or pure white zones. Action-oriented, powerful, and inspiring content`,
          width: 768,
          height: 1344,
          num_inference_steps: 4,
          negative_prompt:
            "blurry, low quality, pixelated, distorted, ugly, deformed, text, writing, letters",
          response_extension: "png",
          response_format: "b64_json",
          seed: -1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Nebius API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.data && data.data[0] && data.data[0].b64_json) {
      // Create unique filename (without extension, Cloudinary will add it)
      const timestamp = Date.now();
      const filename = `regenerated-image-${timestamp}`;

      // Upload to Cloudinary (consistent with your existing setup)
      const imageUrl = await uploadImageToCloudinary(
        data.data[0].b64_json,
        filename
      );
      console.log(
        "Successfully uploaded high-quality PNG image to Cloudinary:",
        imageUrl
      );
      return imageUrl;
    } else {
      console.error("Invalid response structure from Nebius:", data);
      throw new Error("No image generated from Nebius");
    }
  } catch (error) {
    console.error("Error generating image with Nebius:", error);
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

    // Generate image using the existing prompt (skip OpenAI)
    const imageUrl = await generateImage(prompt.trim());

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
