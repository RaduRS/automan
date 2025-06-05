import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get job with Anam session data
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

    if (!job.anam_session_token) {
      return NextResponse.json(
        { success: false, error: "No Anam session found for this job" },
        { status: 400 }
      );
    }

    // Return the session data and script for video recording
    return NextResponse.json({
      success: true,
      data: {
        sessionToken: job.anam_session_token,
        sessionId: job.anam_session_id,
        personaId: process.env.ANAM_API_ID, // Include persona ID for client initialization
        script: job.openai_script,
        title: job.job_title,
        recordingInstructions: {
          message:
            "Use this session token with Anam's JavaScript SDK to record video",
          steps: [
            "Initialize Anam client with session token",
            "Start streaming to video element",
            "Trigger the script delivery",
            "Record the output",
            "Upload to Cloudinary",
          ],
        },
      },
    });
  } catch (error) {
    console.error("Anam video record API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
