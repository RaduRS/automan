import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId = "NNl6r8mD7vthiJatiJt1" } = await request.json(); // Adam - confident male voice

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!process.env.ELEVEN_LABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    console.log(`Generating voice for text: "${text}"`);

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 1.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get the audio data as buffer
    const audioBuffer = await response.arrayBuffer();

    // Convert to base64 for easier handling (you might want to upload to cloud storage instead)
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log(
      `Voice generated successfully for: "${text.substring(0, 50)}..."`
    );

    return NextResponse.json({
      success: true,
      message: "Voice generated successfully",
      audioUrl: audioDataUrl, // In production, you'd upload to cloud storage and return URL
      text: text.trim(),
    });
  } catch (error) {
    console.error("Generate voice API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate voice",
      },
      { status: 500 }
    );
  }
}
