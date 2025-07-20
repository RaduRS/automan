"use client";

import { useCalendar } from "@/contexts/CalendarContext";
import { Platform } from "@/lib/posting-schedule";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const platforms: Platform[] = ["TikTok", "Instagram", "YouTubeShorts"];

const platformImages = {
  "Instagram": "/images/instagram.png",
  "TikTok": "/images/tik.webp",
  "YouTubeShorts": "/images/youtube.png",
};

export function PlatformSelector() {
  const { selectedPlatform, setSelectedPlatform } = useCalendar();

  return (
    <div className="flex gap-2">
      {platforms.map((platform) => {
        const isSelected = selectedPlatform === platform;
        return (
          <Button
            key={platform}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPlatform(platform)}
            className={`h-12 w-12 p-0 flex items-center justify-center relative hover:bg-gray-800 cursor-pointer ${
              isSelected ? 'border-b-2' : ''
            }`}
            style={{
              borderBottomColor: isSelected ? '#ffffff' : 'transparent',
              borderRadius: isSelected ? '4px 4px 0 0' : '4px'
            }}
          >
            <Image
              src={platformImages[platform as keyof typeof platformImages]}
              alt={platform}
              width={20}
              height={20}
              className="object-contain"
            />
          </Button>
        );
      })}
    </div>
  );
}