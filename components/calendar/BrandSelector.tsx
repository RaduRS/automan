"use client";

import { useCalendar } from "@/contexts/CalendarContext";
import { Button } from "@/components/ui/button";
import { BrandName } from "@/lib/posting-schedule";
import { Cloud, Heart, Sparkles, Zap } from "lucide-react";

const brands: BrandName[] = [
  "PeakShifts",
  "DreamFloat",
  "LoreSpark",
  "HeartBeats",
];

const brandIcons = {
  PeakShifts: Zap,
  DreamFloat: Cloud,
  LoreSpark: Sparkles,
  HeartBeats: Heart,
};

const brandColors = {
  PeakShifts: "#6B7280", // Gray
  DreamFloat: "#8B5CF6", // Purple
  LoreSpark: "#3B82F6", // Blue
  HeartBeats: "#EC4899", // Pink
};

export function BrandSelector() {
  const { selectedBrand, setSelectedBrand } = useCalendar();

  return (
    <div className="flex gap-2">
      {brands.map((brand) => {
        const Icon = brandIcons[brand];
        const isSelected = selectedBrand === brand;
        return (
          <Button
            key={brand}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedBrand(brand)}
            className={`h-12 w-12 p-0 flex items-center justify-center relative hover:bg-gray-800 cursor-pointer ${
              isSelected ? "border-b-2" : ""
            }`}
            style={{
              borderBottomColor: isSelected ? "#ffffff" : "transparent",
              borderRadius: isSelected ? "4px 4px 0 0" : "4px",
            }}
          >
            <Icon
              style={{
                color: brandColors[brand as keyof typeof brandColors],
                height: 20,
                width: 20,
              }}
            />
          </Button>
        );
      })}
    </div>
  );
}
