import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@deepgram/sdk";
import { Downloader } from "@tobyg74/tiktok-api-dl";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Deepgram
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");

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
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

async function downloadTikTokMedia(url: string): Promise<TikTokMedia[]> {
  return exponentialBackoff(async () => {
    console.log(`⬇️ Downloading TikTok: ${url}`);

    const result = await Downloader(url, {
      version: "v1",
    });

    if (result.status !== "success" || !result.result) {
      throw new Error(
        `TikTok download failed: ${result.message || "Unknown error"}`
      );
    }

    const data = result.result;
    const medias: TikTokMedia[] = [];

    if (data.type === "video" && data.video) {
      // Try to get audio URL first from music
      if (data.music && data.music.playUrl && data.music.playUrl.length > 0) {
        medias.push({
          url: data.music.playUrl[0],
          type: "audio",
        });
        console.log(`🎵 Found audio track: ${data.music.title}`);
      }

      // Add video URLs as fallback
      if (data.video.downloadAddr && data.video.downloadAddr.length > 0) {
        medias.push({
          url: data.video.downloadAddr[0],
          type: "video",
        });
        console.log(
          `🎥 Found video (${data.video.duration}ms, ${data.video.ratio})`
        );
      } else if (data.video.playAddr && data.video.playAddr.length > 0) {
        medias.push({
          url: data.video.playAddr[0],
          type: "video",
        });
        console.log(
          `🎥 Found video (${data.video.duration}ms, ${data.video.ratio})`
        );
      }
    } else if (data.type === "image" && data.images && data.images.length > 0) {
      // For image posts, we can only get audio from music
      if (data.music && data.music.playUrl && data.music.playUrl.length > 0) {
        medias.push({
          url: data.music.playUrl[0],
          type: "audio",
        });
        console.log(`🖼️ Image post with audio track: ${data.music.title}`);
      } else {
        throw new Error("Image post found but no audio track available");
      }
    }

    if (medias.length === 0) {
      throw new Error("No usable media streams found in TikTok response");
    }

    console.log(`✅ Extracted ${medias.length} media stream(s)`);
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

    console.log(`☁️ Uploading ${type} to Cloudinary`);

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
      console.log(`🎵 Extracted audio from video`);
      return audioUrl;
    }

    console.log(`✅ Upload complete`);
    return uploadResult.secure_url;
  });
}

async function transcribeAudio(audioUrl: string): Promise<string> {
  return exponentialBackoff(async () => {
    console.log(`🎤 Starting transcription...`);

    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      {
        model: "nova-2",
        language: "en",
        smart_format: true,
        punctuate: true,
        diarize: false,
      }
    );

    if (error) {
      throw new Error(`Deepgram transcription error: ${error.message}`);
    }

    if (!result?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
      throw new Error("No transcript returned from Deepgram");
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;
    console.log(`✅ Transcription complete (${transcript.length} characters)`);

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

        // Download TikTok media
        const medias = await downloadTikTokMedia(url);

        // Prefer audio, fallback to video
        const media = medias.find((m) => m.type === "audio") || medias[0];

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

    // TODO: In the next phase, trigger the script generation process
    // For now, we just complete the transcription

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
