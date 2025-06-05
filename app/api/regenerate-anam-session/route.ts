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

    const anamApiKey = process.env.ANAM_API_KEY;
    const anamApiId = process.env.ANAM_API_ID;

    if (!anamApiKey || !anamApiId) {
      return NextResponse.json(
        { success: false, error: "Anam API credentials not configured" },
        { status: 500 }
      );
    }

    console.log(`🔄 Regenerating Anam session for job: ${jobId}`);

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

    // Create new Anam session with correct Bella persona
    console.log("🎬 Creating new Anam session with Bella persona...");

    const sessionResponse = await fetch(
      `https://api.anam.ai/v1/auth/session-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anamApiKey}`,
        },
        body: JSON.stringify({
          personaConfig: {
            id: anamApiId, // Use your Bella persona ID
          },
        }),
      }
    );

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error("❌ Anam session creation failed:", errorText);
      return NextResponse.json(
        { success: false, error: `Anam session creation failed: ${errorText}` },
        { status: 500 }
      );
    }

    const sessionData = await sessionResponse.json();
    const sessionToken = sessionData.sessionToken;

    console.log("✅ New Anam session created successfully with Bella!");

    // Update job with new session token
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        anam_session_token: sessionToken,
        anam_session_id: sessionData.sessionId || sessionToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to update job: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Anam session regenerated successfully with Bella persona",
      sessionToken,
      jobTitle: job.job_title,
      script: job.openai_script,
    });
  } catch (error) {
    console.error("Regenerate Anam session API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
