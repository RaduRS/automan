import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Get stats from the view we created
    const { data, error } = await supabase
      .from("image_generation_stats")
      .select("*")
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: 500 }
      );
    }

    // If no data, return zero stats
    const stats = data || {
      total_generations: 0,
      total_cost: 0,
      last_generation: null,
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalGenerations: stats.total_generations || 0,
        totalCost: parseFloat(stats.total_cost) || 0,
        lastGeneration: stats.last_generation,
      },
    });
  } catch (error) {
    console.error("Image stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
