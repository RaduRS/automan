"use client";

import { useCalendar } from "@/contexts/CalendarContext";
import { Platform } from "@/lib/posting-schedule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, Music, Youtube } from "lucide-react";

const platforms: Platform[] = ["Instagram", "TikTok", "YouTubeShorts"];

const platformIcons = {
  "Instagram": Instagram,
  "TikTok": Music,
  "YouTubeShorts": Youtube,
};

const platformColors = {
  "Instagram": "#E4405F", // Instagram pink/red
  "TikTok": "#000000", // TikTok black
  "YouTubeShorts": "#FF0000", // YouTube red
};

export function PlatformSelector() {
  const { selectedPlatform, setSelectedPlatform } = useCalendar();

  return (
    <Card className="border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {platforms.map((platform) => {
            const Icon = platformIcons[platform];
            return (
              <Button
                key={platform}
                variant={selectedPlatform === platform ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlatform(platform)}
                className="h-12 w-12 p-0 flex items-center justify-center"
              >
                <Icon 
                  className="h-6 w-6" 
                  style={{ color: platformColors[platform as keyof typeof platformColors] }}
                />
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}