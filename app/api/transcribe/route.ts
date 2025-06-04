import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@deepgram/sdk";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Deepgram
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");

interface TikTokVideoData {
  play?: string; // Video URL without watermark
  wmplay?: string; // Video URL with watermark
  hdplay?: string; // HD video URL
  music?: string; // Direct audio URL
  music_info?: {
    play?: string; // Audio URL from music info
    duration?: number;
    title?: string;
  };
  title: string;
  duration: number;
  images?: string[]; // For image posts
}

interface TikTokMedia {
  url: string;
  type: "audio" | "video";
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries) break;

      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError!;
}

async function downloadTikTokMedia(url: string): Promise<TikTokMedia[]> {
  return exponentialBackoff(async () => {
    console.log(`Downloading TikTok: ${url}`);

    const apiUrl = `https://tiktok-scraper7.p.rapidapi.com/`;
    const queryParams = new URLSearchParams({
      url: url,
      hd: "1",
    });

    const response = await fetch(`${apiUrl}?${queryParams}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "",
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `RapidAPI request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.code !== 0 || !data.data) {
      throw new Error(`TikTok download failed: ${data.msg || "Unknown error"}`);
    }

    const videoData: TikTokVideoData = data.data;
    const medias: TikTokMedia[] = [];

    // Priority 1: HD video for audio extraction (best quality, contains speech)
    if (videoData.hdplay && videoData.hdplay.trim() !== "") {
      medias.push({
        url: videoData.hdplay,
        type: "video",
      });
    }

    // Priority 2: Regular video for audio extraction (contains speech)
    if (videoData.play && videoData.play.trim() !== "") {
      medias.push({
        url: videoData.play,
        type: "video",
      });
    }

    // Priority 3: Watermarked video as fallback (still contains speech)
    if (videoData.wmplay && videoData.wmplay.trim() !== "") {
      medias.push({
        url: videoData.wmplay,
        type: "video",
      });
    }

    // Priority 4: Direct audio URL (might be background music, less ideal for transcription)
    if (
      videoData.music &&
      videoData.music.trim() !== "" &&
      medias.length === 0
    ) {
      medias.push({
        url: videoData.music,
        type: "audio",
      });
    }

    // Priority 5: Audio from music_info (likely background music, last resort)
    if (
      videoData.music_info?.play &&
      videoData.music_info.play.trim() !== "" &&
      medias.length === 0
    ) {
      medias.push({
        url: videoData.music_info.play,
        type: "audio",
      });
    }

    // Handle image posts (no video content to transcribe)
    if (
      videoData.images &&
      videoData.images.length > 0 &&
      medias.length === 0
    ) {
      throw new Error(
        "This is an image post with no audio content to transcribe"
      );
    }

    if (medias.length === 0) {
      throw new Error("No usable media streams found in TikTok response");
    }

    return medias;
  });
}

async function uploadToCloudinary(
  mediaUrl: string,
  type: "audio" | "video",
  jobId: string
): Promise<string> {
  return exponentialBackoff(async () => {
    const folder =
      type === "audio" ? "tiktok_audios" : "tiktok_videos_for_audio_extraction";
    const publicId = `${jobId}_${Date.now()}`;

    const uploadResult = await cloudinary.uploader.upload(mediaUrl, {
      resource_type: type === "audio" ? "auto" : "video",
      folder: folder,
      public_id: publicId,
    });

    if (type === "video") {
      // Extract audio from video using Cloudinary transformation
      const audioUrl = cloudinary.url(uploadResult.public_id, {
        resource_type: "video",
        format: "mp3",
        flags: "attachment",
      });
      return audioUrl;
    }

    return uploadResult.secure_url;
  });
}

async function transcribeAudio(audioUrl: string): Promise<string> {
  return exponentialBackoff(async () => {
    console.log(`Starting transcription...`);

    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      {
        model: "nova-2",
        language: "en",
        smart_format: true,
        punctuate: true,
        diarize: false,
        detect_language: true,
        filler_words: false,
      }
    );

    if (error) {
      console.error(`Deepgram error:`, error);
      throw new Error(`Deepgram transcription error: ${error.message}`);
    }

    if (!result?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      throw new Error(
        `No transcript returned from Deepgram. Audio might be too short, silent, or in an unsupported format.`
      );
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;

    if (transcript.trim().length === 0) {
      throw new Error(
        "Transcript is empty - audio might be silent or too quiet"
      );
    }

    console.log(`Transcription complete (${transcript.length} characters)`);
    return transcript;
  });
}

async function updateJobStatus(
  jobId: string,
  status: string,
  updates: Record<string, string | number | boolean | null> = {}
) {
  const { error } = await supabase
    .from("jobs")
    .update({ status, ...updates })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job ID is required" },
        { status: 400 }
      );
    }

    console.log(`Starting transcription for job: ${jobId}`);

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

    // Update status to downloading
    await updateJobStatus(jobId, "downloading");

    const urls = [job.tiktok_url_1, job.tiktok_url_2, job.tiktok_url_3].filter(
      Boolean
    );
    const transcripts: Record<string, string> = {};

    // Process URLs sequentially to avoid timeout issues
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const transcriptKey = `transcript_${i + 1}`;

      try {
        console.log(`Processing URL ${i + 1}/${urls.length}: ${url}`);

        // Download TikTok media via RapidAPI
        const medias = await downloadTikTokMedia(url);

        // Prefer video for speech content, fallback to audio
        const media = medias.find((m) => m.type === "video") || medias[0];

        if (!media) {
          throw new Error("No media found to process");
        }

        // Upload to Cloudinary
        const audioUrl = await uploadToCloudinary(media.url, media.type, jobId);

        // Update status to transcribing on first URL
        if (i === 0) {
          await updateJobStatus(jobId, "transcribing");
        }

        // Transcribe audio
        const transcript = await transcribeAudio(audioUrl);
        transcripts[transcriptKey] = transcript;

        console.log(`Completed processing URL ${i + 1}`);
      } catch (error) {
        console.error(`Failed to process URL ${i + 1}:`, error);
        const errorMessage = `Failed to process TikTok URL ${i + 1}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;

        await updateJobStatus(jobId, "error", {
          error_message: errorMessage,
          retry_count: job.retry_count + 1,
        });

        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 500 }
        );
      }
    }

    // Store all transcripts and update status to transcription_complete
    await updateJobStatus(jobId, "transcription_complete", transcripts);

    console.log(`Transcription completed for job: ${jobId}`);

    // Trigger script generation automatically
    try {
      console.log(`Triggering script generation for job: ${jobId}`);

      const generateResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        }
      );

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        console.error(`Script generation failed:`, errorData);
      } else {
        console.log(
          `Script generation triggered successfully for job: ${jobId}`
        );
      }
    } catch (error) {
      console.error(`Failed to trigger script generation:`, error);
      // Don't fail the whole request if script generation fails
    }

    return NextResponse.json({
      success: true,
      message: "Transcription completed successfully",
      transcripts: Object.keys(transcripts).length,
    });
  } catch (error) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
