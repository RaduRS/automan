import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface LatestScript {
  id: string;
  title: string;
  script: string;
  description: string;
  created_at: string;
}

export async function GET() {
  try {
    console.log("Fetching latest 5 scripts from database...");

    // Fetch the latest 5 jobs that have generated scripts
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id, job_title, openai_script, job_description, created_at")
      .not("openai_script", "is", null)
      .not("job_title", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Database error fetching latest scripts:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch scripts" },
        { status: 500 }
      );
    }

    // Transform the data to match our interface
    const latestScripts: LatestScript[] = jobs.map((job) => ({
      id: job.id,
      title: job.job_title || "Untitled Script",
      script: job.openai_script || "",
      description: job.job_description || "",
      created_at: job.created_at,
    }));

    console.log(`✅ Found ${latestScripts.length} latest scripts`);

    return NextResponse.json({
      success: true,
      scripts: latestScripts,
    });
  } catch (error) {
    console.error("Latest scripts API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
