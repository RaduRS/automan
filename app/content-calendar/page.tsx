"use client";

import { CalendarProvider } from "@/contexts/CalendarContext";
import { BrandSelector } from "@/components/calendar/BrandSelector";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";

export default function ContentCalendarPage() {
  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <CalendarProvider>
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl pt-16 font-bold tracking-tight text-white">
                Content Calendar
              </h1>
              <p className="text-gray-300 mt-2 pb-8">
                Plan and track your content across all platforms and brands
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-8">
              <BrandSelector />
            </div>

            {/* Calendar */}
            <WeeklyCalendar />
          </div>
        </CalendarProvider>
      </div>
    </div>
  );
}
