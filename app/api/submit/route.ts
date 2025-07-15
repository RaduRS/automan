import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      input_mode,
      brand = "peakshifts",
      tiktok_url_1,
      tiktok_url_2,
      tiktok_url_3,
      text_input,
    } = body;

    // Validate input mode
    if (!input_mode || !["tiktok", "text"].includes(input_mode)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid input mode is required (tiktok or text)",
        },
        { status: 400 }
      );
    }

    // Validate based on input mode
    if (input_mode === "tiktok") {
      // Validate TikTok URLs
      if (!tiktok_url_1 || typeof tiktok_url_1 !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Primary TikTok URL is required for TikTok mode",
          },
          { status: 400 }
        );
      }

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
    } else if (input_mode === "text") {
      // Validate text input
      if (!text_input || typeof text_input !== "string" || !text_input.trim()) {
        return NextResponse.json(
          { success: false, error: "Text input is required for text mode" },
          { status: 400 }
        );
      }
    }

    // Insert new job into database
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        input_mode,
        brand,
        tiktok_url_1: input_mode === "tiktok" ? tiktok_url_1 : null,
        tiktok_url_2: input_mode === "tiktok" ? tiktok_url_2 || null : null,
        tiktok_url_3: input_mode === "tiktok" ? tiktok_url_3 || null : null,
        text_input: input_mode === "text" ? text_input.trim() : null,
        status: "submitted",
        retry_count: 0,
        instagram_posted: false,
        facebook_posted: false,
        tiktok_posted: false,
        youtube_posted: false,
        x_posted: false,
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

    // Route to appropriate next step based on input mode
    const nextApiEndpoint =
      input_mode === "tiktok" ? "/api/transcribe" : "/api/generate";

    console.log(
      `Triggering ${input_mode} processing for job ${jobId} via ${nextApiEndpoint}`
    );

    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }${nextApiEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error(`${nextApiEndpoint} failed:`, response.status, errorData);
        throw new Error(
          `${nextApiEndpoint} failed: ${response.status} ${
            errorData.error || "Unknown error"
          }`
        );
      }

      const responseData = await response.json();
      console.log(`${nextApiEndpoint} response:`, responseData);
    } catch (triggerError) {
      console.error(
        `Failed to trigger ${input_mode} processing:`,
        triggerError
      );
      // Update job status to error
      await supabase
        .from("jobs")
        .update({
          status: "error",
          error_message: `Failed to start ${input_mode} processing: ${
            triggerError instanceof Error
              ? triggerError.message
              : "Unknown error"
          }`,
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
