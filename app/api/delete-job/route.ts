import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { jobId } = requestBody;

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    console.log(`Deleting job with ID: ${jobId}`);

    // Delete the job record from the database
    const { error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId);

    if (deleteError) {
      console.error("Error deleting job:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete job" },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted job: ${jobId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in delete job API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}