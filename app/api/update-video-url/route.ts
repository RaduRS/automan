import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { jobId, videoUrl } = await request.json();

    if (!jobId || !videoUrl) {
      return NextResponse.json(
        { success: false, error: "Job ID and video URL are required" },
        { status: 400 }
      );
    }

    // Update job with final video URL
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        final_video_url: videoUrl,
        status: "video_ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Failed to update job with video URL:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update job" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Video URL updated successfully",
      videoUrl,
    });
  } catch (error) {
    console.error("Update video URL API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
