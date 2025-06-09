import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { imageId } = requestBody;

    if (!imageId || typeof imageId !== "string") {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      );
    }

    console.log(`Deleting image with ID: ${imageId}`);

    // Delete the image record from the database
    const { error: deleteError } = await supabase
      .from("image_generations")
      .delete()
      .eq("id", imageId);

    if (deleteError) {
      console.error("Failed to delete image:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted image: ${imageId}`);

    return NextResponse.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete image API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
