import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { fullScript, scenes, title } = await request.json();

    if (!fullScript || !scenes) {
      return NextResponse.json(
        { error: "Full script and scenes are required" },
        { status: 400 }
      );
    }

    const ELEVENLABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
    }

    console.log("🎙️ Generating full script voice...");

    // Step 1: Generate voice for the entire script
    const voiceResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: fullScript,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!voiceResponse.ok) {
      const errorText = await voiceResponse.text();
      console.error("ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${voiceResponse.status}` },
        { status: voiceResponse.status }
      );
    }

    const audioBuffer = await voiceResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log(
      "✅ Full script voice generated, now transcribing with Deepgram..."
    );

    // Step 2: Send audio to Deepgram for transcription with timestamps
    const transcriptResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=false&utterances=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/mpeg",
        },
        body: audioBuffer,
      }
    );

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error("Deepgram API error:", errorText);
      return NextResponse.json(
        { error: `Deepgram API error: ${transcriptResponse.status}` },
        { status: transcriptResponse.status }
      );
    }

    const transcriptData = await transcriptResponse.json();
    console.log("✅ Deepgram transcription complete");

    // Step 3: Extract words with timestamps
    const words =
      transcriptData.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    // Step 4: Match scene texts to transcript segments
    const sceneTimings = matchScenesWithTimestamps(scenes, words);

    console.log("✅ Scene timings calculated:", sceneTimings);

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      sceneTimings: sceneTimings,
      totalDuration: transcriptData.results?.channels?.[0]?.alternatives?.[0]
        ?.transcript
        ? words[words.length - 1]?.end || 0
        : 0,
      transcript:
        transcriptData.results?.channels?.[0]?.alternatives?.[0]?.transcript,
      title: title || "Generated Full Script",
    });
  } catch (error) {
    console.error("Error generating full script voice:", error);
    return NextResponse.json(
      { error: "Failed to generate full script voice" },
      { status: 500 }
    );
  }
}

// Helper function to match scene texts with transcript timestamps
function matchScenesWithTimestamps(
  scenes: string[],
  words: Array<{
    word: string;
    punctuated_word?: string;
    start: number;
    end: number;
  }>
): Array<{
  sceneIndex: number;
  startTime: number;
  endTime: number;
  text: string;
}> {
  const sceneTimings: Array<{
    sceneIndex: number;
    startTime: number;
    endTime: number;
    text: string;
  }> = [];

  if (!words || words.length === 0) {
    // Fallback: equal distribution if transcription fails
    const totalDuration = 30; // Default fallback
    const durationPerScene = totalDuration / scenes.length;

    return scenes.map((scene, index) => ({
      sceneIndex: index,
      startTime: index * durationPerScene,
      endTime: (index + 1) * durationPerScene,
      text: scene,
    }));
  }

  // Use Deepgram's ACTUAL word timestamps - EXACTLY as provided
  const totalDuration = words[words.length - 1]?.end || 0;
  console.log(
    `📊 Total audio: ${totalDuration.toFixed(2)}s, analyzing ${
      words.length
    } words for ${scenes.length} scenes`
  );

  // Find natural break points in the transcript using punctuation and pauses
  const wordsPerScene = Math.floor(words.length / scenes.length);
  const breakPoints: number[] = [0]; // Start with first word

  for (let i = 1; i < scenes.length; i++) {
    const targetWordIndex = i * wordsPerScene;
    const searchStart = Math.max(1, targetWordIndex - 8);
    const searchEnd = Math.min(words.length - 1, targetWordIndex + 8);

    let bestBreakIndex = targetWordIndex;
    let bestScore = 0;

    for (let wordIdx = searchStart; wordIdx <= searchEnd; wordIdx++) {
      let score = 0;
      const word = words[wordIdx];
      const punctuatedWord = word.punctuated_word || word.word;

      // Higher score for sentence-ending punctuation
      if (punctuatedWord.match(/[.!?]$/)) {
        score += 10;
      }

      // Higher score for comma (phrase boundary)
      if (punctuatedWord.includes(",")) {
        score += 5;
      }

      // Higher score for longer pauses after this word
      if (wordIdx + 1 < words.length) {
        const pause = words[wordIdx + 1].start - word.end;
        score += pause * 2;
      }

      // Prefer positions closer to the target
      const distanceFromTarget = Math.abs(wordIdx - targetWordIndex);
      score -= distanceFromTarget * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestBreakIndex = wordIdx;
      }
    }

    breakPoints.push(bestBreakIndex + 1);
  }

  console.log(
    `🎯 Break points found at word indices: [${breakPoints.join(", ")}]`
  );

  // Use EXACT Deepgram timestamps - no modifications
  for (let i = 0; i < scenes.length; i++) {
    const startWordIndex = breakPoints[i];
    const endWordIndex =
      i === scenes.length - 1 ? words.length - 1 : breakPoints[i + 1] - 1;

    // Use EXACT timestamps from Deepgram - no hardcoded minimums or corrections
    const startTime = words[startWordIndex]?.start || 0;
    const endTime = words[endWordIndex]?.end || totalDuration;

    sceneTimings.push({
      sceneIndex: i,
      startTime: startTime,
      endTime: endTime,
      text: scenes[i],
    });

    console.log(
      `✅ Scene ${i + 1}: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s (${(
        endTime - startTime
      ).toFixed(3)}s) - EXACT Deepgram timestamps`
    );
  }

  return sceneTimings;
}
