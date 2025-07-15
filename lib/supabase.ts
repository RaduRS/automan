import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Job {
  id: string;
  tiktok_url_1?: string | null;
  tiktok_url_2?: string | null;
  tiktok_url_3?: string | null;
  text_input?: string | null;
  input_mode: 'tiktok' | 'text';
  brand: 'peakshifts' | 'dreamfloat' | 'lorespark' | 'heartbeats';
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
