import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function enhancePromptWithOpenAI(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `You are an expert at creating detailed, vivid prompts for AI image generation. Take this simple prompt and enhance it into a detailed, descriptive prompt that will generate a powerful black and white photograph.

Original prompt: "${prompt}"

Transform this into a detailed prompt that includes:
- Specific visual details and composition
- Emotional atmosphere and body language
- Technical camera details (focal length, depth of field, etc.)
- Clear, balanced lighting (avoid making scenes overly dark since we're already doing black and white)

Keep it concise - 1-2 sentences maximum. Focus on composition, emotion, and technical photography details rather than adding unnecessary darkness.

CRITICAL: Return ONLY the enhanced prompt text, no quotes, no explanation, no additional text. Just the improved prompt ready to use.`,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const enhancedPrompt = completion.choices[0]?.message?.content?.trim();
  if (!enhancedPrompt) {
    throw new Error("No response from OpenAI");
  }
  return enhancedPrompt;
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

    // Use OpenAI GPT-4o-mini directly
    const enhancedPrompt = await enhancePromptWithOpenAI(prompt);

    return NextResponse.json({
      success: true,
      originalPrompt: prompt.trim(),
      enhancedPrompt: enhancedPrompt,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
