import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Try to get cumulative stats from dedicated table first
    const { data: cumulativeData, error: cumulativeError } = await supabase
      .from("cumulative_image_stats")
      .select("*")
      .single();

    if (!cumulativeError && cumulativeData) {
      // We have cumulative stats - use them (they never decrease)
      return NextResponse.json({
        success: true,
        stats: {
          totalGenerations: cumulativeData.total_generations || 0,
          totalCost: parseFloat(cumulativeData.total_cost) || 0,
          lastGeneration: cumulativeData.last_generation,
        },
      });
    }

    // Fallback to current table stats (for existing users)
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
