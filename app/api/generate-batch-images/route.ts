import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { getBrandConfig, type BrandName } from "@/lib/brand-config";

interface Scene {
  id: number;
  text: string;
}

interface BatchImageResult {
  sceneId: number;
  url: string;
  prompt: string;
  chunkIndex: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateChunkPrompts(
  scenes: Scene[],
  brand: BrandName,
  scriptContext: string,
  chunkIndex: number,
  previousPrompts: string[] = []
): Promise<string[]> {
  try {
    const brandConfig = getBrandConfig(brand);

    const contextSection =
      previousPrompts.length > 0
        ? `AVOID REPEATING these visual concepts from previous scenes:
${previousPrompts
  .slice(-6)
  .map((p) => `- ${p.substring(0, 120)}...`)
  .join("\n")}

`
        : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `You are an expert art director for ${
            brandConfig.name
          }. Generate ${
            scenes.length
          } unique, diverse image prompts for these scenes.

BRAND STYLE: ${brandConfig.description}
COLOR SCHEME: ${brandConfig.imageStyle.colorScheme}
MOOD: ${brandConfig.imageStyle.mood}
VISUAL STYLE: ${brandConfig.imageStyle.visualStyle}

SCRIPT CONTEXT: "${scriptContext.substring(0, 300)}..."

SCENES TO PROCESS (Chunk ${chunkIndex + 1}):
${scenes.map((scene) => `Scene ${scene.id}: "${scene.text}"`).join("\n")}

${contextSection}**CRITICAL DIVERSITY REQUIREMENTS:**
- Each prompt must be visually UNIQUE and DIFFERENT from others in this batch
- Avoid repetitive concepts like "person with arms spread" or overused metaphors
- Create fresh, distinctive visual interpretations for each scene
- Use varied compositions, subjects, lighting, and visual elements
- Focus on ${brandConfig.imageStyle.mood} mood with ${
            brandConfig.imageStyle.colorScheme
          } colors
- NO TEXT, words, letters, or typography in any image

**YOUR PROCESS:**
1. Analyze each scene's unique concept
2. Brainstorm diverse visual metaphors that avoid repetition
3. Create detailed, distinctive prompts that match brand style
4. Ensure each prompt feels fresh and unique

Return ONLY valid JSON in this format:
{
  "prompts": [
    "Detailed prompt for scene ${scenes[0]?.id}...",
    "Detailed prompt for scene ${scenes[1]?.id}...",
    "Detailed prompt for scene ${scenes[2]?.id}..."
  ]
}`,
        },
      ],
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const parsedResponse = JSON.parse(response);

    if (!parsedResponse.prompts || !Array.isArray(parsedResponse.prompts)) {
      throw new Error("Invalid response format from OpenAI");
    }

    console.log(
      `✅ Generated ${parsedResponse.prompts.length} prompts for chunk ${
        chunkIndex + 1
      }`
    );
    return parsedResponse.prompts;
  } catch (error) {
    console.error(
      `❌ Error generating prompts for chunk ${chunkIndex + 1}:`,
      error
    );

    // Fallback prompts using brand config
    const brandConfig = getBrandConfig(brand);
    return scenes.map(
      (scene, i) =>
        `Abstract scene representing "${scene.text.substring(0, 50)}" with ${
          brandConfig.imageStyle.colorScheme
        } color scheme, ${
          brandConfig.imageStyle.mood
        } mood, unique composition ${i + 1}, no text.`
    );
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
      });
      throw new Error(
        `Nebius API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    if (data.data && data.data[0] && data.data[0].b64_json) {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `batch-generated-image-${timestamp}-${randomSuffix}`;

      const imageUrl = await uploadImageToCloudinary(
        data.data[0].b64_json,
        filename
      );

      return imageUrl;
    } else {
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
    const { scenes, brand = "peakshifts", scriptContext = "" } = requestBody;

    console.log("🎨 Starting batch image generation:", {
      brand,
      totalScenes: scenes?.length,
      hasContext: !!scriptContext,
    });

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: "Scenes array is required" },
        { status: 400 }
      );
    }

    // Dynamic chunk sizing: Math.ceil(totalScenes / 2)
    const chunkSize = Math.ceil(scenes.length / 2);
    console.log(
      `📊 Processing ${scenes.length} scenes in chunks of ${chunkSize}`
    );

    // Split scenes into chunks
    const chunks: Scene[][] = [];
    for (let i = 0; i < scenes.length; i += chunkSize) {
      chunks.push(scenes.slice(i, i + chunkSize));
    }

    const allResults: BatchImageResult[] = [];
    // eslint-disable-next-line prefer-const
    let previousPrompts: string[] = [];

    // Process chunks sequentially for prompt generation, but parallel for image generation
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      console.log(
        `🤖 Generating prompts for chunk ${chunkIndex + 1}/${chunks.length} (${
          chunk.length
        } scenes)...`
      );

      // Generate prompts for this chunk with context from previous chunks
      const chunkPrompts = await generateChunkPrompts(
        chunk,
        brand as BrandName,
        scriptContext,
        chunkIndex,
        previousPrompts
      );

      console.log(
        `🖼️ Starting parallel image generation for chunk ${chunkIndex + 1}...`
      );

      // Generate images for this chunk in parallel
      const chunkImagePromises = chunk.map(async (scene, sceneIndex) => {
        const prompt = chunkPrompts[sceneIndex];
        if (!prompt) {
          throw new Error(`No prompt generated for scene ${scene.id}`);
        }

        try {
          const imageUrl = await generateImage(prompt, brand as BrandName);

          // Store in database
          const { data: dbData, error: dbError } = await supabase
            .from("image_generations")
            .insert({
              sentence: scene.text,
              prompt_generated: prompt,
              image_url: imageUrl,
            })
            .select("id")
            .single();

          if (dbError) {
            console.error("Failed to store image in database:", dbError);
          }

          return {
            sceneId: scene.id,
            url: imageUrl,
            prompt: prompt,
            chunkIndex: chunkIndex,
            dbId: dbData?.id,
          };
        } catch (error) {
          console.error(
            `❌ Failed to generate image for scene ${scene.id}:`,
            error
          );
          throw error;
        }
      });

      // Wait for all images in this chunk to complete
      const chunkResults = await Promise.all(chunkImagePromises);
      allResults.push(...chunkResults);

      // Add prompts to context for next chunk
      previousPrompts.push(...chunkPrompts);

      console.log(
        `✅ Completed chunk ${chunkIndex + 1}/${chunks.length}: ${
          chunkResults.length
        } images generated`
      );
    }

    console.log(
      `🎉 Batch generation complete: ${allResults.length} images generated successfully`
    );

    return NextResponse.json({
      success: true,
      message: `Generated ${allResults.length} images successfully`,
      results: allResults,
      chunksProcessed: chunks.length,
      totalScenes: scenes.length,
    });
  } catch (error) {
    console.error("❌ Batch image generation error:", {
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
