"use client";

import { useCalendar } from "@/contexts/CalendarContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function WeekNavigator() {
  const { currentWeekStart, setCurrentWeekStart } = useCalendar();

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const formatWeekRange = (date: Date) => {
    // Since currentWeekStart is already set to Monday, we can use it directly
    const startOfWeek = new Date(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formatDate = (d: Date) => {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  return (
    <div className="flex items-center justify-between pt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPreviousWeek}
        className="cursor-pointer text-white border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600/50"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous Week
      </Button>

      <div className="text-lg font-semibold text-white">
        {formatWeekRange(currentWeekStart)}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={goToNextWeek}
        className="cursor-pointer text-white border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-600/50"
      >
        Next Week
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
