import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

interface ImageResult {
  url: string;
  prompt: string;
  id?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateImagePrompt(
  sentence: string,
  scriptContext?: string
): Promise<string> {
  try {
    const contextPrompt = scriptContext
      ? `Full script context: "${scriptContext}"\n\nSpecific sentence for this image: "${sentence}"`
      : `Sentence: "${sentence}"`;

    const completion = await openai.chat.completions.create({
      // Consider upgrading to "gpt-4o-mini" for even better results if repetition continues.
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are an expert art director. Your task is to generate a creative prompt for a black and white photograph based on a sentence from a motivational script.

CONTEXT:
${contextPrompt}

**YOUR THOUGHT PROCESS (Chain-of-Thought):**
1.  **Analyze the Sentence's Core Concept:** What is the central idea? (e.g., overcoming a struggle, the power of connection, a new beginning).
2.  **Brainstorm Multiple Visual Metaphors:** Based on the core concept, list 3-4 COMPLETELY DIFFERENT visual metaphors. You MUST use a mix of approaches: Nature, Symbolic Objects, Solitary Figures, and Architecture. For example, for "connection," you could brainstorm: a) a bridge, b) intertwining roots of a tree, c) two hands almost touching, d) light beams converging.
3.  **Select the Most Creative & Unique Option:** Review your brainstormed list. Choose the metaphor that is the most emotionally powerful and visually interesting. AVOID common or repetitive ideas like bridges or simple staircases if other options are available.
4.  **Describe the Final Scene:** Write a detailed, 1-2 sentence description of your chosen metaphor.

**CRITICAL REQUIREMENTS:**
-   The final output must be ONLY the 1-2 sentence description for the image generator. DO NOT output your thought process or brainstorming list.
-   The image MUST be black and white.
-   The image MUST NOT contain any text, words, letters, or numbers.
-   Strive for visual diversity across a full script. If the script mentions "connection" multiple times, use a different metaphor each time.

Now, apply this process for the sentence: "${sentence}".`,
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
    return `A dramatic black and white abstract scene with high contrast lighting, symbolizing an internal struggle and breakthrough, moody atmosphere, no text.`;
  }
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

    if (scriptContext) {
      console.log(
        `Using script context: "${scriptContext.substring(0, 100)}..."`
      );
    }

    // Step 1: Generate image prompt using OpenAI gpt-4o-mini
    const imagePrompt = await generateImagePrompt(
      sentence.trim(),
      scriptContext?.trim()
    );
    const imageUrl = await generateImage(imagePrompt);

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
