import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { getBrandConfig, type BrandName } from "@/lib/brand-config";

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
  brand: BrandName,
  scriptContext?: string
): Promise<string> {
  try {
    const contextPrompt = scriptContext
      ? `Full script context: "${scriptContext}"\n\nSpecific sentence for this image: "${sentence}"`
      : `Sentence: "${sentence}"`;

    const brandConfig = getBrandConfig(brand);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are an expert art director specializing in ${brandConfig.name} visuals. Create a diverse, unique image prompt based on this sentence from a ${brandConfig.name} script.

CONTEXT:
${contextPrompt}

BRAND STYLE: ${brandConfig.description}
COLOR SCHEME: ${brandConfig.imageStyle.colorScheme}
MOOD: ${brandConfig.imageStyle.mood}

**VISUAL DIVERSITY REQUIREMENTS (CRITICAL):**
- AVOID repetitive imagery, clichés, and overused concepts
- CREATE VARIETY in compositions, subjects, and visual metaphors
- FOCUS ON fresh, unique visual interpretations that match the brand style
- Think creatively and avoid defaulting to common imagery patterns
- Generate something visually distinctive and unexpected

**YOUR THOUGHT PROCESS (Chain-of-Thought):**
1.  **Analyze the Sentence's Core Concept:** What is the central idea that aligns with ${brandConfig.name}'s theme?
2.  **Brainstorm DIVERSE Visual Metaphors:** Based on the core concept, list 3-4 UNIQUE visual metaphors that match the ${brandConfig.imageStyle.mood} mood and ${brandConfig.imageStyle.colorScheme} aesthetic. AVOID clichés and overused imagery.
3.  **Select the Most UNIQUE Option:** Choose the most creative, fresh metaphor that represents the sentence while matching the brand's visual style.
4.  **Describe the Final Scene:** Write a detailed, 1-2 sentence description that creates something visually distinctive.

**CRITICAL REQUIREMENTS:**
-   The final output must be ONLY the 1-2 sentence description for the image generator. DO NOT output your thought process or brainstorming list.
-   The image should use ${brandConfig.imageStyle.colorScheme} color scheme
-   The mood should be ${brandConfig.imageStyle.mood}
-   The image MUST NOT contain any text, words, letters, or numbers.
-   Style: ${brandConfig.imageStyle.visualStyle}
-   CREATE VISUAL DIVERSITY - avoid repetitive concepts

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
    console.error("❌ OpenAI prompt generation failed:", {
      error: error instanceof Error ? error.message : error,
      brand,
      sentence: sentence.substring(0, 100),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return brand-appropriate fallback using brand config
    const brandConfig = getBrandConfig(brand);
    return `Abstract scene with ${brandConfig.imageStyle.colorScheme} color scheme, ${brandConfig.imageStyle.mood} mood, ${brandConfig.imageStyle.visualStyle}, no text.`;
  }
}

async function generateImage(
  prompt: string,
  brand: BrandName
): Promise<string> {
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
          prompt: `${prompt}. ${
            getBrandConfig(brand).imageStyle.visualStyle
          }. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS, NO TYPOGRAPHY anywhere in the image.`,
          width: 768,
          height: 1344,
          num_inference_steps: 4,
          negative_prompt: getBrandConfig(brand).imageStyle.negativePrompt,
          response_extension: "png",
          response_format: "b64_json",
          seed: -1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Nebius API error:", {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        brand,
        promptLength: prompt.length,
      });
      throw new Error(
        `Nebius API error: ${response.status} ${response.statusText} - ${errorText}`
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
    const { sentence, scriptContext, brand = "peakshifts" } = requestBody;

    console.log("🎨 Starting image generation:", {
      brand,
      sentence: sentence?.substring(0, 100),
      hasContext: !!scriptContext,
    });

    if (!sentence || typeof sentence !== "string" || !sentence.trim()) {
      console.error("❌ Invalid sentence provided");
      return NextResponse.json(
        { error: "Sentence is required" },
        { status: 400 }
      );
    }

    if (scriptContext) {
      console.log(
        `📝 Using script context: "${scriptContext.substring(0, 100)}..."`
      );
    }

    // Step 1: Generate image prompt using OpenAI gpt-4o-mini
    console.log("🤖 Generating prompt with OpenAI...");
    const imagePrompt = await generateImagePrompt(
      sentence.trim(),
      brand as BrandName,
      scriptContext?.trim()
    );
    console.log("✅ Prompt generated:", imagePrompt.substring(0, 150) + "...");

    console.log("🖼️ Generating image with Nebius...");
    const imageUrl = await generateImage(imagePrompt, brand as BrandName);
    console.log("✅ Image generated successfully:", imageUrl);

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
    console.error("❌ Generate sentence image API error:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
