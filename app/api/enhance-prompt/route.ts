import { NextRequest, NextResponse } from "next/server";

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

    console.log(`Enhancing prompt with DeepSeek: "${prompt}"`);

    // Call DeepSeek API to enhance the prompt
    const response = await fetch(process.env.DEEPSEEK_API_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
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
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      throw new Error("No enhanced prompt received from DeepSeek");
    }

    console.log("Enhanced prompt:", enhancedPrompt);

    return NextResponse.json({
      success: true,
      originalPrompt: prompt.trim(),
      enhancedPrompt: enhancedPrompt,
    });
  } catch (error) {
    console.error("Enhance prompt API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
