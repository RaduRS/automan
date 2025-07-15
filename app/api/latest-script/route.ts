import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Fetch the latest job with a generated script
    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id, brand, openai_script, script_scenes, job_title, job_description, job_hashtags, created_at"
      )
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
      jobId: data.id,
      brand: data.brand,
      script: data.openai_script,
      scenes: data.script_scenes ? JSON.parse(data.script_scenes) : [],
      title: data.job_title,
      description: data.job_description,
      hashtags: data.job_hashtags,
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
