import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    // Update the downloaded status
    const { error } = await supabase
      .from("image_generations")
      .update({ downloaded: true })
      .eq("id", imageId);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to mark as downloaded" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Marked as downloaded",
    });
  } catch (error) {
    console.error("Mark downloaded API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
