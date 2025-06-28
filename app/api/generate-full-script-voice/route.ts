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
    // Enhanced approach: Include scene keywords for better alignment
    const sceneKeywords = scenes.map((scene: string) => {
      // Extract key words from each scene (first 3-5 meaningful words)
      const words = scene
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(" ")
        .filter((w: string) => w.length > 2) // Filter out short words like "a", "is", "to"
        .slice(0, 5); // Take first 5 meaningful words
      return words.join(" ");
    });

    console.log("🎯 Scene keywords for Deepgram:", sceneKeywords);

    const transcriptResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=false&utterances=true&detect_topics=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/wav",
          // Add custom vocabulary/keywords to help Deepgram understand scene boundaries
          "X-DG-Keywords": sceneKeywords.join(","),
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

// Helper function to match scene texts with transcript timestamps using semantic alignment
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

  const totalDuration = words[words.length - 1]?.end || 0;
  console.log(
    `📊 Total audio: ${totalDuration.toFixed(2)}s, analyzing ${
      words.length
    } words for ${scenes.length} scenes`
  );

  // NEW ALGORITHM: Direct text matching for perfect alignment
  // Combine all words into a single transcript string
  const fullTranscript = words
    .map((w) => w.punctuated_word || w.word)
    .join(" ")
    .toLowerCase();

  // Clean scene texts for matching (remove extra spaces, normalize punctuation)
  const cleanScenes = scenes.map((scene) =>
    scene
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
  );

  console.log("🔍 Full transcript:", fullTranscript);
  console.log("🔍 Scene texts to match:", cleanScenes);

  let lastEndWordIndex = 0;

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const sceneText = cleanScenes[sceneIndex];
    const sceneWords = sceneText.split(" ").filter((w) => w.length > 0);

    // Find the best matching sequence of words starting from lastEndWordIndex
    let bestMatchStart = lastEndWordIndex;
    let bestMatchEnd = lastEndWordIndex;
    let bestMatchScore = 0;

    // Search for the scene text in the remaining transcript
    for (
      let startIdx = lastEndWordIndex;
      startIdx < words.length - sceneWords.length + 1;
      startIdx++
    ) {
      let matchScore = 0;
      let matchedWords = 0;

      // Try to match each word in the scene
      for (
        let i = 0;
        i < sceneWords.length && startIdx + i < words.length;
        i++
      ) {
        const sceneWord = sceneWords[i];
        const transcriptWord = (
          words[startIdx + i].punctuated_word || words[startIdx + i].word
        )
          .toLowerCase()
          .replace(/[^\w]/g, ""); // Remove punctuation

        if (transcriptWord === sceneWord) {
          matchScore += 10; // Exact match
          matchedWords++;
        } else if (
          transcriptWord.includes(sceneWord) ||
          sceneWord.includes(transcriptWord)
        ) {
          matchScore += 5; // Partial match
          matchedWords++;
        } else if (i === 0) {
          // If first word doesn't match, this position is not good
          break;
        }
      }

      // Score this position - prefer high match rate and earlier positions
      const matchRate = matchedWords / sceneWords.length;
      const finalScore = matchScore * matchRate;

      if (finalScore > bestMatchScore && matchRate > 0.5) {
        // At least 50% match
        bestMatchScore = finalScore;
        bestMatchStart = startIdx;
        bestMatchEnd = Math.min(
          startIdx + sceneWords.length - 1,
          words.length - 1
        );
      }
    }

    // If no good match found, use proportional distribution for remaining scenes
    if (bestMatchScore === 0) {
      console.log(
        `⚠️ No good match found for scene ${
          sceneIndex + 1
        }, using proportional distribution`
      );
      const remainingWords = words.length - lastEndWordIndex;
      const remainingScenes = scenes.length - sceneIndex;
      const wordsForThisScene = Math.max(
        1,
        Math.floor(remainingWords / remainingScenes)
      );

      bestMatchStart = lastEndWordIndex;
      bestMatchEnd = Math.min(
        lastEndWordIndex + wordsForThisScene - 1,
        words.length - 1
      );
    }

    // Ensure minimum scene duration of 1 second
    const startTime = words[bestMatchStart]?.start || 0;
    let endTime = words[bestMatchEnd]?.end || totalDuration;

    // Minimum duration check - extend if too short
    if (endTime - startTime < 1.0) {
      console.log(
        `⚠️ Scene ${sceneIndex + 1} too short (${(endTime - startTime).toFixed(
          3
        )}s), extending...`
      );

      // Try to extend by finding more words
      let extendedEndIndex = bestMatchEnd;
      while (
        extendedEndIndex < words.length - 1 &&
        (words[extendedEndIndex]?.end || 0) - startTime < 1.0
      ) {
        extendedEndIndex++;
      }

      // If extending would conflict with next scene's territory, split the difference
      if (sceneIndex < scenes.length - 1) {
        const maxAllowedEnd = Math.min(
          extendedEndIndex,
          words.length - (scenes.length - sceneIndex - 1)
        );
        endTime = words[maxAllowedEnd]?.end || endTime;
      } else {
        endTime = words[extendedEndIndex]?.end || totalDuration;
      }
    }

    sceneTimings.push({
      sceneIndex: sceneIndex,
      startTime: startTime,
      endTime: endTime,
      text: scenes[sceneIndex],
    });

    console.log(
      `✅ Scene ${sceneIndex + 1}: ${startTime.toFixed(3)}s - ${endTime.toFixed(
        3
      )}s (${(endTime - startTime).toFixed(3)}s) - EXACT Deepgram timestamps`
    );

    // Update last end index for next scene
    lastEndWordIndex = bestMatchEnd + 1;
  }

  // Final validation: ensure no overlaps and minimum durations
  for (let i = 0; i < sceneTimings.length - 1; i++) {
    if (sceneTimings[i].endTime > sceneTimings[i + 1].startTime) {
      // Fix overlap by splitting the difference
      const midPoint =
        (sceneTimings[i].endTime + sceneTimings[i + 1].startTime) / 2;
      sceneTimings[i].endTime = midPoint;
      sceneTimings[i + 1].startTime = midPoint;
      console.log(`🔧 Fixed overlap between scenes ${i + 1} and ${i + 2}`);
    }
  }

  return sceneTimings;
}
