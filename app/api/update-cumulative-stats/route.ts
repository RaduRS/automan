import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { cost, increment = 1 } = await request.json();

    // First, try to get current cumulative stats
    const { data: currentStats, error: fetchError } = await supabase
      .from("cumulative_image_stats")
      .select("*")
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching cumulative stats:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch current stats" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    if (!currentStats) {
      // Initialize cumulative stats table with first entry
      const { error: insertError } = await supabase
        .from("cumulative_image_stats")
        .insert({
          total_generations: increment,
          total_cost: cost || 0.003,
          last_generation: now,
          updated_at: now,
        });

      if (insertError) {
        console.error("Error initializing cumulative stats:", insertError);
        return NextResponse.json(
          { error: "Failed to initialize stats" },
          { status: 500 }
        );
      }
    } else {
      // Update cumulative stats (increment, never decrease)
      const { error: updateError } = await supabase
        .from("cumulative_image_stats")
        .update({
          total_generations: currentStats.total_generations + increment,
          total_cost: parseFloat(currentStats.total_cost) + (cost || 0.003),
          last_generation: now,
          updated_at: now,
        })
        .eq("id", currentStats.id);

      if (updateError) {
        console.error("Error updating cumulative stats:", updateError);
        return NextResponse.json(
          { error: "Failed to update stats" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cumulative stats updated successfully",
    });
  } catch (error) {
    console.error("Update cumulative stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
