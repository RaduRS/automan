import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

interface ImageGenerationResult {
  prompts: string[];
  images: Array<{
    url: string;
    prompt: string;
  }>;
}

async function generateImagePrompts(
  script: string,
  title: string
): Promise<string[]> {
  try {
    // Use Perplexity to generate creative image prompts
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
            content: `Based on this script and title, generate 4-5 detailed, creative image prompts for high-quality visual content that would complement this video script. Each prompt should be specific, visually compelling, and suitable for AI image generation.

TITLE: ${title}

SCRIPT: ${script}

Create prompts that:
- Capture the essence and mood of the content
- Are visually striking and engaging
- Would work well as background images or complementary visuals
- Include specific details about style, composition, lighting
- Are suitable for social media content
- Focus on landscapes, objects, abstract concepts, or people from a distance
- AVOID any hands, fingers, or close-up human gestures that show hand details
- AVOID any text, writing, letters, numbers, or written content
- AVOID any scenes requiring fine details like handwriting, typing, pointing, holding objects, or hand interactions
- PREFER: Wide shots, environmental scenes, architectural elements, natural phenomena, or symbolic objects

Return only the prompts, one per line, without numbering or extra text.`,
          },
        ],
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const promptText = data.choices?.[0]?.message?.content;

    if (!promptText) {
      throw new Error("No prompts generated from Perplexity");
    }

    // Split into individual prompts and clean them
    const prompts = promptText
      .split("\n")
      .filter((line: string) => line.trim().length > 10)
      .map((line: string) => line.trim().replace(/^\d+\.?\s*/, ""))
      .slice(0, 5); // Limit to 5 prompts

    return prompts;
  } catch (error) {
    console.error("Error generating prompts with Perplexity:", error);
    // Fallback: generate simple prompts based on script content
    return [
      `Abstract digital art representing: ${title}`,
      `Modern minimalist illustration of social media content creation`,
      `Vibrant gradient background with floating geometric shapes`,
      `Professional content creator workspace with modern technology`,
      `Dynamic social media engagement visualization with colorful elements`,
    ];
  }
}

async function generateImages(
  prompts: string[]
): Promise<Array<{ url: string; prompt: string }>> {
  const images = [];

  for (const prompt of prompts) {
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
            prompt: `${prompt}. High quality, professional, suitable for social media content.`,
            width: 768,
            height: 1344,
            num_inference_steps: 4,
            negative_prompt:
              "blurry, low quality, pixelated, distorted, ugly, hands, fingers, human hands, finger details, hand gestures, pointing, holding objects with hands, close-up hands, detailed fingers, hand anatomy, malformed hands, extra fingers, missing fingers, weird hands, hand movements, grasping",
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
      console.log(
        "Nebius API response received with base64 data for prompt:",
        prompt.substring(0, 50) + "..."
      );

      if (data.data && data.data[0] && data.data[0].b64_json) {
        // Create unique filename (without extension, Cloudinary will add it)
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const filename = `batch-image-${timestamp}-${random}`;

        // Upload to Cloudinary (consistent with your existing setup)
        const imageUrl = await uploadImageToCloudinary(
          data.data[0].b64_json,
          filename
        );
        console.log(
          "Successfully uploaded high-quality PNG image to Cloudinary:",
          imageUrl
        );

        images.push({
          url: imageUrl,
          prompt: prompt,
        });
      }
    } catch (error) {
      console.error(`Error generating image for prompt "${prompt}":`, error);
      // Continue with other prompts even if one fails
    }
  }

  return images;
}

export async function POST(request: NextRequest) {
  let jobId: string | undefined;

  try {
    const requestBody = await request.json();
    jobId = requestBody.jobId;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job ID is required" },
        { status: 400 }
      );
    }

    console.log(`Starting image generation for job: ${jobId}`);

    // Get job details
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // Check if script is generated
    if (!job.openai_script || !job.job_title) {
      return NextResponse.json(
        { success: false, error: "Script and title must be generated first" },
        { status: 400 }
      );
    }

    console.log("Generating image prompts with Perplexity...");
    const prompts = await generateImagePrompts(
      job.openai_script,
      job.job_title
    );

    console.log("Generated prompts:", prompts);
    console.log("Generating images with Nebius...");
    const images = await generateImages(prompts);

    console.log(`Generated ${images.length} images successfully`);

    const result: ImageGenerationResult = {
      prompts,
      images,
    };

    return NextResponse.json({
      success: true,
      message: "Images generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Generate images API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
