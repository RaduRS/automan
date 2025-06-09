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

async function generateImagePrompt(sentence: string): Promise<string> {
  try {
    // Use Perplexity to generate a creative image prompt based on the sentence
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "user",
            content: `Create a visual image description inspired by this concept: "${sentence}"

CRITICAL REQUIREMENTS:
- Black and white photography with MODERATE contrast (avoid pure black areas)
- Soft shadows with visible details throughout the frame
- Balanced lighting (dramatic but not harsh)
- ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS anywhere in the image
- DO NOT include the original sentence or any text in the image
- Male subject (men aged 20-40 demographic)
- Simple, clean composition

SUBJECT SELECTION - Choose from these categories what BEST MATCHES the sentence meaning:
- Discipline/routine: Early morning workout, gym scene, meal prep, daily planning
- Honesty/truth: Person in reflection, journaling, mirror moment, contemplative pose
- Goals/achievement: Person celebrating, team success, victory moment, progress tracking
- Gratitude/performance: Person in meditation, appreciating nature, quiet moment of thanks
- Consistency: Daily habits, routine activities, steady progress, commitment in action
- Transformation: Before/after moment, person making choices, life-changing decision
- Focus: Person concentrated on task, deep work, studying, strategic thinking
- Strength/power: Physical training, overcoming challenges, leadership moment, confident stance
- Community/togetherness: Group of people celebrating, team working together, crowd cheering
- Happiness/joy: People laughing, celebrating success, moments of pure joy, friends gathering
- Leadership: Person speaking to crowd, guiding others, confident presentation
- Success/achievement: Celebration scenes, victory moments, accomplishment recognition

CREATIVE DIRECTION:
Be creative and interpretive within your chosen category. Don't match keywords literally - focus on capturing the EMOTION and deeper MEANING of the sentence. Create powerful, symbolic imagery that resonates with ambitious individuals seeking motivation and transformation.

LIGHTING: Soft but defined shadows - ensure ALL areas of image have visible detail, no pure black zones.

Return ONLY a clean, simple sentence describing the visual scene. No formatting, no asterisks, no dashes, no bullet points, no markdown. Just a clear descriptive sentence.`,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const prompt = data.choices?.[0]?.message?.content?.trim();

    if (!prompt) {
      throw new Error("No prompt generated from Perplexity");
    }

    return prompt;
  } catch (error) {
    console.error("Error generating prompt with Perplexity:", error);
    // Fallback: generate a basic prompt based on the sentence
    return `Strong silhouette of a person against bright clouds with visible details in both foreground and background, representing determination and discipline`;
  }
}

async function generateImage(prompt: string): Promise<string> {
  try {
    const input = {
      prompt: `${prompt}. Black and white photography with SOFT contrast, gentle shadows with visible details, balanced lighting that avoids harsh darkness, professional quality. Male subject aged 20-40. CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO WRITING, NO CAPTIONS, NO TYPOGRAPHY anywhere in the image. This is a pure visual image with NO TEXT ELEMENTS AT ALL. Ensure ALL areas have visible detail - no pure black or pure white zones`,
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
    const { sentence } = requestBody;

    if (!sentence || typeof sentence !== "string" || !sentence.trim()) {
      return NextResponse.json(
        { error: "Sentence is required" },
        { status: 400 }
      );
    }

    console.log(`Generating image for sentence: "${sentence}"`);

    // Step 1: Generate image prompt using Perplexity
    console.log("Generating image prompt with Perplexity...");
    const imagePrompt = await generateImagePrompt(sentence.trim());
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
