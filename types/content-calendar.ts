// Database types for content calendar
export interface ContentCalendarEntry {
  id: string;
  brand: "DreamFloat" | "LoreSpark" | "HeartBeats" | "PeakShifts";
  platform: "TikTok" | "Instagram" | "YouTubeShorts";
  scheduled_date: string; // ISO date string
  time_slot: string; // e.g., "9:00 PM–11:00 PM"
  is_downloaded: boolean;
  is_posted: boolean;
  video_title?: string | null;
  video_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
