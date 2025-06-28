import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase, uploadImageToCloudinary } from "@/lib/supabase";

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
      ? `Full script context: "${scriptContext}"\n\nSpecific sentence: "${sentence}"`
      : `Sentence: "${sentence}"`;

    // Use OpenAI o3-mini to generate a creative image prompt based on the sentence
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "user",
          content: `${contextPrompt}

Create a powerful black and white photograph that visually represents the core emotion and meaning of this specific sentence.

ANALYZE THE SENTENCE:
- What is the main emotion? (peace, strength, freedom, growth, struggle, breakthrough, etc.)
- What visual metaphor would best represent this concept?
- Should this be about people, nature, objects, architecture, or abstract forms?

VISUAL APPROACH OPTIONS - Choose the MOST impactful for this sentence:
1. NATURE: landscapes, weather, trees, water, sky, mountains, storms, sunrise/sunset
2. HUMAN MOMENTS: genuine emotions, gestures, solitude, reflection, action (NO business suits)
3. SYMBOLIC OBJECTS: chains, keys, doors, bridges, paths, mirrors, tools, books
4. ARCHITECTURE: stairs, windows, buildings, ruins, structures that tell a story
5. ABSTRACT FORMS: shadows, light patterns, textures, geometric shapes

REQUIREMENTS:
- Black and white photography
- NO text, words, or writing anywhere
- Choose the most emotionally resonant visual approach
- Be specific about composition, lighting, and mood
- Create something a real photographer could capture

For "${sentence}", choose ONE approach and describe a single, powerful scene in 1-2 sentences.

AVOID: Generic business imagery, men in suits, corporate settings, repetitive concepts.
FOCUS: The unique emotional core of this specific sentence.`,
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
    return `A serene natural landscape with dramatic lighting, representing inner peace and personal growth`;
  }
}

async function generateImage(prompt: string): Promise<string> {
  try {
    console.log(
      "Calling Nebius API with prompt:",
      prompt.substring(0, 100) + "..."
    );

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
          prompt: `${prompt}. Black and white photography, high quality, emotionally powerful, no text or writing, professional composition for social media`,
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
    console.log("Nebius API response received with base64 data");

    if (data.data && data.data[0] && data.data[0].b64_json) {
      // Create unique filename (without extension, Cloudinary will add it)
      const timestamp = Date.now();
      const filename = `generated-image-${timestamp}`;

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

    // Step 1: Generate image prompt using OpenAI o3-mini
    console.log("Generating image prompt with OpenAI o3-mini...");
    const imagePrompt = await generateImagePrompt(
      sentence.trim(),
      scriptContext?.trim()
    );
    console.log("Generated prompt:", imagePrompt);

    // Step 2: Generate image using Nebius
    console.log("Generating image with Nebius...");
    const imageUrl = await generateImage(imagePrompt);
    console.log("Generated image URL:", imageUrl);

    // Store the generated image in database (without cost tracking)
    const { data: dbData, error: dbError } = await supabase
      .from("image_generations")
      .insert({
        sentence: sentence.trim(),
        prompt_generated: imagePrompt,
        image_url: imageUrl,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Failed to store image in database:", dbError);
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
