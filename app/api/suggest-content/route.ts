import { NextRequest, NextResponse } from "next/server";
import { getBrandConfig, type BrandName } from "@/lib/brand-config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { brand } = await request.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const brandConfig = getBrandConfig(brand as BrandName);

    // Create a content suggestion prompt based on the brand
    const suggestionPrompt = `You are an expert content creator for ${
      brandConfig.name
    }. 

BRAND: ${brandConfig.name}
DESCRIPTION: ${brandConfig.description}

Generate a compelling piece of source content that would be perfect for creating a ${
      brandConfig.name
    } script. This should be raw material that can later be transformed into a script - think of it as the "input text" that someone might use.

REQUIREMENTS:
- Should be 80-120 words (short and focused)
- Should align with the ${brandConfig.name} brand theme and audience
- Should be engaging but concise - one clear concept or insight
- Should feel like authentic source material (not already a polished script)
- Should provide one strong idea that can be expanded into a compelling video script

For ${brandConfig.name} specifically:
${getBrandThemeGuidance(brand as BrandName)}

Return ONLY the raw content text, no additional formatting or explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: suggestionPrompt,
        },
      ],
      temperature: 0.8, // Higher creativity for varied suggestions
      max_tokens: 500,
    });

    const suggestedContent = completion.choices[0]?.message?.content?.trim();

    if (!suggestedContent) {
      throw new Error("No content generated");
    }

    return NextResponse.json({
      success: true,
      content: suggestedContent,
    });
  } catch (error) {
    console.error("Error generating content suggestion:", error);
    return NextResponse.json(
      { error: "Failed to generate content suggestion" },
      { status: 500 }
    );
  }
}

function getBrandThemeGuidance(brand: BrandName): string {
  const guidance = {
    peakshifts: `Create content about discipline, self-improvement, mental strength, productivity, or personal growth. Think about challenges men face and practical solutions. Could be about morning routines, mindset shifts, overcoming procrastination, building confidence, or developing mental toughness.`,

    dreamfloat: `Create content about mindfulness, relaxation, sleep, dreams, peaceful moments, or gentle wisdom. Think about late-night reflections, calming thoughts, peaceful imagery, or gentle life insights that would help someone unwind and drift into tranquility.`,

    lorespark: `Create content about ONE fascinating "what if" scenario, sci-fi concept, or fantasy idea. Keep it simple and focused - like a single mysterious phenomenon, one futuristic technology concept, or one alternate reality scenario. Think bite-sized wonder, not complex world-building.`,

    heartbeats: `Create content about love, relationships, emotional growth, life transitions, meaningful connections, or personal reflection. Think about heartfelt moments, emotional insights, relationship wisdom, or poetic observations about the human experience.`,
  };

  return guidance[brand] || guidance.peakshifts;
}
