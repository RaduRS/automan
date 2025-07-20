import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface LatestScript {
  id: string;
  title: string;
  script: string;
  description: string;
  brand: string;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "5");

    console.log(`Fetching ${limit} scripts from database with offset ${offset}...`);

    // Fetch jobs with pagination
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select(
        "id, job_title, openai_script, job_description, brand, created_at"
      )
      .not("openai_script", "is", null)
      .not("job_title", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

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
      brand: job.brand || "peakshifts",
      created_at: job.created_at,
    }));

    // Check if there are more scripts available
    const { count: totalCount } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .not("openai_script", "is", null)
      .not("job_title", "is", null);

    const hasMore = totalCount ? (offset + limit) < totalCount : false;

    console.log(`✅ Found ${latestScripts.length} scripts, hasMore: ${hasMore}`);

    return NextResponse.json({
      success: true,
      scripts: latestScripts,
      hasMore,
      total: totalCount || 0,
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
