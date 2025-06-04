import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tiktok_url_1, tiktok_url_2, tiktok_url_3 } = body;

    // Validate required fields
    if (!tiktok_url_1 || typeof tiktok_url_1 !== "string") {
      return NextResponse.json(
        { success: false, error: "Primary TikTok URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)/;
    if (!urlPattern.test(tiktok_url_1)) {
      return NextResponse.json(
        { success: false, error: "Invalid TikTok URL format" },
        { status: 400 }
      );
    }

    // Validate optional URLs if provided
    if (tiktok_url_2 && !urlPattern.test(tiktok_url_2)) {
      return NextResponse.json(
        { success: false, error: "Invalid second TikTok URL format" },
        { status: 400 }
      );
    }

    if (tiktok_url_3 && !urlPattern.test(tiktok_url_3)) {
      return NextResponse.json(
        { success: false, error: "Invalid third TikTok URL format" },
        { status: 400 }
      );
    }

    // Insert new job into database
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        tiktok_url_1,
        tiktok_url_2: tiktok_url_2 || null,
        tiktok_url_3: tiktok_url_3 || null,
        status: "submitted",
        retry_count: 0,
        instagram_posted: false,
        facebook_posted: false,
        tiktok_posted: false,
        youtube_posted: false,
        x_posted: false,
        linkedin_posted: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create job" },
        { status: 500 }
      );
    }

    const jobId = data.id;

    // Trigger transcription process
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/transcribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        }
      );
    } catch (triggerError) {
      console.error("Failed to trigger transcription:", triggerError);
      // Update job status to error
      await supabase
        .from("jobs")
        .update({
          status: "error",
          error_message: "Failed to start transcription process",
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: "Job submitted successfully",
    });
  } catch (error) {
    console.error("Submit API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
