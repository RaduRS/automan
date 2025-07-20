"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ContentCalendarEntry } from "@/types/content-calendar";
import { BrandName, Platform } from "@/lib/posting-schedule";

interface CalendarContextType {
  selectedBrand: BrandName;
  selectedPlatform: Platform;
  currentWeekStart: Date;
  entries: ContentCalendarEntry[];
  loading: boolean;
  setSelectedBrand: (brand: BrandName) => void;
  setSelectedPlatform: (platform: Platform) => void;
  setCurrentWeekStart: (date: Date) => void;
  fetchEntries: () => Promise<void>;
  updateEntry: (id: string, updates: Partial<ContentCalendarEntry>) => Promise<void>;
  createEntry: (entry: Partial<ContentCalendarEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}

interface CalendarProviderProps {
  children: React.ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [selectedBrand, setSelectedBrand] = useState<BrandName>("DreamFloat");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("TikTok");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Get current date and find the Monday of this week
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, otherwise go back (dayOfWeek - 1) days
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToSubtract);
    monday.setHours(0, 0, 0, 0); // Reset time to start of day
    return monday;
  });
  const [entries, setEntries] = useState<ContentCalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      const startDate = currentWeekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      const response = await fetch(
        `/api/content-calendar?brand=${selectedBrand}&platform=${selectedPlatform}&startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error("Error fetching calendar entries:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (id: string, updates: Partial<ContentCalendarEntry>) => {
    // Optimistic update - update UI immediately
    setEntries(prev => 
      prev.map(entry => entry.id === id ? { ...entry, ...updates } : entry)
    );

    try {
      const response = await fetch("/api/content-calendar", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        throw new Error("Failed to update entry");
        // Revert optimistic update on error
        await fetchEntries();
      }

      const data = await response.json();
      // Update with server response to ensure consistency
      setEntries(prev => 
        prev.map(entry => entry.id === id ? data.entry : entry)
      );
    } catch (error) {
      console.error("Error updating calendar entry:", error);
      // Revert optimistic update on error
      await fetchEntries();
      throw error;
    }
  };

  const createEntry = async (entry: Partial<ContentCalendarEntry>) => {
    // Create temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempEntry = {
      id: tempId,
      brand: entry.brand || selectedBrand,
      platform: entry.platform || selectedPlatform,
      scheduled_date: entry.scheduled_date || '',
      time_slot: entry.time_slot || '',
      is_downloaded: entry.is_downloaded || false,
      is_posted: entry.is_posted || false,
      video_title: entry.video_title || null,
      notes: entry.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ContentCalendarEntry;

    // Optimistic update - add to UI immediately
    setEntries(prev => [...prev, tempEntry]);

    try {
      const response = await fetch("/api/content-calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error("Failed to create entry");
      }

      const data = await response.json();
      // Replace temp entry with real entry
      setEntries(prev => 
        prev.map(e => e.id === tempId ? data.entry : e)
      );
    } catch (error) {
      console.error("Error creating calendar entry:", error);
      // Remove temp entry on error
      setEntries(prev => prev.filter(e => e.id !== tempId));
      throw error;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/content-calendar?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete entry");
      }

      setEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error("Error deleting calendar entry:", error);
      throw error;
    }
  };

  // Fetch entries when brand, platform, or week changes
  useEffect(() => {
    fetchEntries();
  }, [selectedBrand, selectedPlatform, currentWeekStart]);

  const value: CalendarContextType = {
    selectedBrand,
    selectedPlatform,
    currentWeekStart,
    entries,
    loading,
    setSelectedBrand,
    setSelectedPlatform,
    setCurrentWeekStart,
    fetchEntries,
    updateEntry,
    createEntry,
    deleteEntry,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}