import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { fullScript, scenes, title } = await request.json();

    if (!fullScript || !scenes) {
      return NextResponse.json(
        { error: "Full script and scenes are required" },
        { status: 400 }
      );
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    const VOICE_NAME = process.env.GOOGLE_TTS_VOICE_NAME || "en-US-Neural2-D";

    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
    }

    console.log("🎙️ Generating full script voice with Google TTS...");

    // Step 1: Generate voice for the entire script using Google TTS
    const voiceResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text: fullScript },
          voice: {
            languageCode: "en-US",
            name: VOICE_NAME,
            ssmlGender: "NEUTRAL",
          },
          audioConfig: {
            audioEncoding: "LINEAR16",
            speakingRate: 1,
            pitch: 0,
            volumeGainDb: 0,
            sampleRateHertz: 24000,
            effectsProfileId: [],
          },
        }),
      }
    );

    if (!voiceResponse.ok) {
      const errorText = await voiceResponse.text();
      console.error("Google TTS API error:", errorText);
      return NextResponse.json(
        { error: `Google TTS API error: ${voiceResponse.status}` },
        { status: voiceResponse.status }
      );
    }

    const voiceData = await voiceResponse.json();

    if (!voiceData.audioContent) {
      return NextResponse.json(
        { error: "No audio content received from Google TTS" },
        { status: 500 }
      );
    }

    // Convert base64 audio content to buffer for Deepgram and Cloudinary
    const audioBuffer = Buffer.from(voiceData.audioContent, "base64");

    console.log(
      "✅ Full script voice generated with Google TTS, uploading to Cloudinary..."
    );

    // Step 1.5: Upload audio to Cloudinary
    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
              folder: "continuous_audio",
              public_id: `full_script_${Date.now()}`,
              format: "wav",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as { secure_url: string });
            }
          )
          .end(audioBuffer);
      }
    );

    const cloudinaryAudioUrl = uploadResult.secure_url;
    console.log("✅ Audio uploaded to Cloudinary:", cloudinaryAudioUrl);

    console.log("🎯 Now transcribing with Deepgram for scene timing...");

    // Step 2: Send audio to Deepgram for transcription with timestamps
    const transcriptResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=false&utterances=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/wav",
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

    return NextResponse.json({
      success: true,
      audioUrl: cloudinaryAudioUrl, // Return Cloudinary URL instead of data URL
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

    // FIXED: Ensure break points are unique and ascending
    const proposedBreakPoint = bestBreakIndex + 1;
    const lastBreakPoint = breakPoints[breakPoints.length - 1];

    if (proposedBreakPoint <= lastBreakPoint) {
      // If proposed break point is not advancing, force it to be at least 1 word ahead
      const minBreakPoint = lastBreakPoint + 1;
      if (minBreakPoint < words.length) {
        breakPoints.push(minBreakPoint);
      } else {
        // Not enough words left, use equal distribution for remaining scenes
        const remainingWords = words.length - lastBreakPoint;
        const remainingScenes = scenes.length - i;
        const wordsPerRemainingScene = Math.max(
          1,
          Math.floor(remainingWords / remainingScenes)
        );
        breakPoints.push(lastBreakPoint + wordsPerRemainingScene);
      }
    } else {
      breakPoints.push(proposedBreakPoint);
    }
  }

  console.log(
    `🎯 Break points found at word indices: [${breakPoints.join(", ")}]`
  );

  // Use EXACT Deepgram timestamps - no modifications
  for (let i = 0; i < scenes.length; i++) {
    const startWordIndex = breakPoints[i];
    let endWordIndex =
      i === scenes.length - 1 ? words.length - 1 : breakPoints[i + 1] - 1;

    // FIXED: Additional safety check to ensure endWordIndex > startWordIndex
    if (endWordIndex <= startWordIndex) {
      endWordIndex = Math.min(startWordIndex + 1, words.length - 1);
    }

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
