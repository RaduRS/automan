import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Get total count of jobs
    const { count: totalJobs, error: countError } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error counting jobs:", countError);
      return NextResponse.json(
        { error: "Failed to count jobs" },
        { status: 500 }
      );
    }

    // Get paginated jobs
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      return NextResponse.json(
        { error: "Failed to fetch jobs" },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((totalJobs || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      jobs: jobs || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalJobs: totalJobs || 0,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Unexpected error in jobs API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}