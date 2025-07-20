import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ContentCalendarEntry } from "@/types/content-calendar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const platform = searchParams.get("platform");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!brand || !platform || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: brand, platform, startDate, endDate" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_calendar")
      .select("*")
      .eq("brand", brand)
      .eq("platform", platform)
      .gte("scheduled_date", startDate)
      .lte("scheduled_date", endDate)
      .order("scheduled_date", { ascending: true })
      .order("time_slot", { ascending: true });

    if (error) {
      console.error("Error fetching calendar entries:", error);
      return NextResponse.json(
        { error: "Failed to fetch calendar entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries: data });
  } catch (error) {
    console.error("Error in calendar GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, platform, scheduled_date, time_slot, video_title, notes, is_downloaded, is_posted } = body;

    if (!brand || !platform || !scheduled_date || !time_slot) {
      return NextResponse.json(
        { error: "Missing required fields: brand, platform, scheduled_date, time_slot" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_calendar")
      .insert({
        brand,
        platform,
        scheduled_date,
        time_slot,
        video_title,
        notes,
        is_downloaded: is_downloaded || false,
        is_posted: is_posted || false
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating calendar entry:", error);
      return NextResponse.json(
        { error: "Failed to create calendar entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entry: data });
  } catch (error) {
    console.error("Error in calendar POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_downloaded, is_posted, video_title, video_url, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const updateData: Partial<ContentCalendarEntry> = {};
    if (typeof is_downloaded === "boolean") updateData.is_downloaded = is_downloaded;
    if (typeof is_posted === "boolean") updateData.is_posted = is_posted;
    if (video_title !== undefined) updateData.video_title = video_title;
    if (video_url !== undefined) updateData.video_url = video_url;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from("content_calendar")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating calendar entry:", error);
      return NextResponse.json(
        { error: "Failed to update calendar entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entry: data });
  } catch (error) {
    console.error("Error in calendar PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("content_calendar")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting calendar entry:", error);
      return NextResponse.json(
        { error: "Failed to delete calendar entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in calendar DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}