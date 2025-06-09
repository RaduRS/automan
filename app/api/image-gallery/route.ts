import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from("image_generations")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Database count error:", countError);
      return NextResponse.json(
        { error: "Failed to fetch image count" },
        { status: 500 }
      );
    }

    // Get paginated images
    const { data: images, error } = await supabase
      .from("image_generations")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch images" },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      images: images || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalImages: count || 0,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Image gallery API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
