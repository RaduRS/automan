"use client";

import React, { useState } from "react";
import { useCalendar } from "@/contexts/CalendarContext";
import { ContentCalendarEntry } from "@/types/content-calendar";
import { getPostingTimes, getDayType } from "@/lib/posting-schedule";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeekNavigator } from "./WeekNavigator";

interface TimeSlotCardProps {
  date: Date;
  timeSlot: string;
  entry?: ContentCalendarEntry;
}

function TimeSlotCard({ date, timeSlot, entry }: TimeSlotCardProps) {
  const { selectedBrand, selectedPlatform, updateEntry, createEntry } =
    useCalendar();
  const [isEditing, setIsEditing] = useState(false);
  const [videoTitle, setVideoTitle] = useState(entry?.video_title || "");
  const [notes, setNotes] = useState(entry?.notes || "");

  const handleDownloadedChange = (checked: boolean) => {
    if (entry) {
      updateEntry(entry.id, { is_downloaded: checked });
    } else {
      createEntry({
        brand: selectedBrand,
        platform: selectedPlatform,
        scheduled_date: date.toISOString().split("T")[0],
        time_slot: timeSlot,
        is_downloaded: checked,
        is_posted: false,
      });
    }
  };

  const handlePostedChange = (checked: boolean) => {
    if (entry) {
      updateEntry(entry.id, { is_posted: checked });
    } else if (checked) {
      createEntry({
        brand: selectedBrand,
        platform: selectedPlatform,
        scheduled_date: date.toISOString().split("T")[0],
        time_slot: timeSlot,
        is_downloaded: false,
        is_posted: checked,
      });
    }
  };

  const handleSaveDetails = async () => {
    if (entry) {
      await updateEntry(entry.id, {
        video_title: videoTitle || null,
        notes: notes || null,
      });
    } else {
      await createEntry({
        brand: selectedBrand,
        platform: selectedPlatform,
        scheduled_date: date.toISOString().split("T")[0],
        time_slot: timeSlot,
        video_title: videoTitle || null,
        notes: notes || null,
        is_downloaded: false,
        is_posted: false,
      });
    }
    setIsEditing(false);
  };

  const getStatusColor = () => {
    if (entry?.is_posted) return "bg-green-900/30 border-green-600";
    if (entry?.is_downloaded) return "bg-yellow-900/30 border-yellow-600";
    return "border-gray-600 bg-gray-700/50";
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md text-white",
        getStatusColor()
      )}
    >
      <div className="text-sm font-medium text-white mb-2">{timeSlot}</div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`downloaded-${date.toISOString()}-${timeSlot}`}
            checked={entry?.is_downloaded || false}
            onCheckedChange={handleDownloadedChange}
            className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <label
            htmlFor={`downloaded-${date.toISOString()}-${timeSlot}`}
            className="text-sm text-gray-300 cursor-pointer"
          >
            Downloaded
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`posted-${date.toISOString()}-${timeSlot}`}
            checked={entry?.is_posted || false}
            onCheckedChange={handlePostedChange}
            className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <label
            htmlFor={`posted-${date.toISOString()}-${timeSlot}`}
            className="text-sm text-gray-300 cursor-pointer"
          >
            Posted
          </label>
        </div>

        {entry?.video_title && (
          <div
            className="text-xs text-gray-400 truncate"
            title={entry.video_title}
          >
            {entry.video_title}
          </div>
        )}

        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-1 text-gray-300 hover:text-white hover:bg-gray-600/50"
            >
              {entry?.video_title || entry?.notes ? (
                <Edit3 size={14} />
              ) : (
                <Plus size={14} />
              )}
              <span className="ml-1 text-xs">
                {entry?.video_title || entry?.notes ? "Edit" : "Add"} Details
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {timeSlot} - {date.toLocaleDateString()}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white">
                  Video Title
                </label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title..."
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveDetails}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export function WeeklyCalendar() {
  const {
    selectedBrand,
    selectedPlatform,
    currentWeekStart,
    entries,
    loading,
  } = useCalendar();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    return date;
  });

  const dayNames = [
    "Monday",
    "Tuesday", 
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Get today's date for comparison
  const today = new Date();
  const todayDateString = today.toDateString();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <Card
      className="border text-white"
      style={{ backgroundColor: "#161819", borderColor: "#282A2B" }}
    >
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const dayType = getDayType(date);
            const timeSlots = getPostingTimes(
              selectedBrand,
              selectedPlatform,
              dayType
            );
            const dayEntries = entries.filter(
              (entry) =>
                entry.scheduled_date === date.toISOString().split("T")[0]
            );
            const isToday = date.toDateString() === todayDateString;

            return (
              <div key={date.toISOString()} className="space-y-3">
                <div className="text-center">
                  <div className="font-semibold text-white">
                    {dayNames[index]}
                  </div>
                  <div className={`text-sm text-gray-300 ${isToday ? 'font-bold' : ''}`}>
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {timeSlots.map((timeSlot) => {
                    const entry = dayEntries.find(
                      (e) => e.time_slot === timeSlot
                    );
                    return (
                      <TimeSlotCard
                        key={`${date.toISOString()}-${timeSlot}`}
                        date={date}
                        timeSlot={timeSlot}
                        entry={entry}
                      />
                    );
                  })}

                  {timeSlots.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No posting times
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <WeekNavigator />
      </CardContent>
    </Card>
  );
}
