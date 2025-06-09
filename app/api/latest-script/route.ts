import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Fetch the latest job with a generated script
    const { data, error } = await supabase
      .from("jobs")
      .select("openai_script, job_title, created_at")
      .not("openai_script", "is", null)
      .not("openai_script", "eq", "")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch latest script" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { script: null, message: "No scripts found" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      script: data.openai_script,
      title: data.job_title,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error("Latest script API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
