import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { sceneId, text, jobId } = await request.json();

    if (!sceneId || !text || !jobId) {
      return NextResponse.json(
        { error: "Scene ID, text, and job ID are required" },
        { status: 400 }
      );
    }

    // First, fetch the current job with script_scenes
    const { data: jobData, error: fetchError } = await supabase
      .from("jobs")
      .select("script_scenes")
      .eq("id", jobId)
      .single();

    if (fetchError) {
      console.error("Error fetching job:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch job" },
        { status: 500 }
      );
    }

    if (!jobData?.script_scenes) {
      return NextResponse.json(
        { error: "No scenes found for this job" },
        { status: 404 }
      );
    }

    // Parse the scenes JSON and update the specific scene
    const scenes = JSON.parse(jobData.script_scenes) as string[];
    const sceneIndex = sceneId - 1; // sceneId is 1-based, array is 0-based

    if (sceneIndex < 0 || sceneIndex >= scenes.length) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    // Update the scene text
    scenes[sceneIndex] = text;

    // Regenerate the full script from all scenes
    const updatedFullScript = scenes.join(" ");

    // Save both the updated scenes AND the regenerated full script to the database
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        script_scenes: JSON.stringify(scenes),
        openai_script: updatedFullScript,
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error updating job scenes:", updateError);
      return NextResponse.json(
        { error: "Failed to update scene" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedFullScript,
    });
  } catch (error) {
    console.error("Error in update-scene API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
