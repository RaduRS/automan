import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Cloudinary (same as your existing setup)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload base64 image data to Cloudinary
 * @param base64Data - The base64 encoded image data
 * @param filename - The filename to use for the image (without extension)
 * @returns Promise<string> - The public URL of the uploaded image
 */
export async function uploadImageToCloudinary(
  base64Data: string,
  filename: string
): Promise<string> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Upload to Cloudinary using the same pattern as your other uploads
    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "image",
              folder: "generated-images", // Keep images organized
              public_id: filename,
              format: "png", // Force PNG format
              transformation: [
                { quality: "auto", fetch_format: "auto" }, // Auto optimization
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as { secure_url: string });
            }
          )
          .end(buffer);
      }
    );

    console.log(
      "Successfully uploaded to Cloudinary:",
      uploadResult.secure_url
    );
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
}

export interface Job {
  id: string;
  tiktok_url_1: string;
  tiktok_url_2?: string | null;
  tiktok_url_3?: string | null;
  status:
    | "submitted"
    | "downloading"
    | "transcribing"
    | "transcription_complete"
    | "generating_script"
    | "script_generated"
    | "combining_video"
    | "video_complete"
    | "generating_video"
    | "video_ready"
    | "scheduled_to_socialbee"
    | "error";
  transcript_1?: string | null;
  transcript_2?: string | null;
  transcript_3?: string | null;
  openai_script?: string | null;
  script_scenes?: string | null;
  job_description?: string | null;
  job_hashtags?: string | null;
  final_video_url?: string | null;
  video_duration?: number | null;
  video_size_mb?: number | null;
  socialbee_post_id?: string | null;
  error_message?: string | null;
  retry_count: number;
  job_title?: string | null;
  instagram_posted: boolean;
  facebook_posted: boolean;
  tiktok_posted: boolean;
  youtube_posted: boolean;
  x_posted: boolean;
  created_at: string;
  updated_at: string;
}
