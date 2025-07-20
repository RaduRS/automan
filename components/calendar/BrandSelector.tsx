"use client";

import { useCalendar } from "@/contexts/CalendarContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandName } from "@/lib/posting-schedule";
import { Cloud, Heart, Sparkles, Zap } from "lucide-react";

const brands: BrandName[] = ["PeakShifts", "DreamFloat", "LoreSpark", "HeartBeats"];

const brandIcons = {
  PeakShifts: Zap,
  DreamFloat: Cloud,
  LoreSpark: Sparkles,
  HeartBeats: Heart,
};

const brandColors = {
  "PeakShifts": "#6B7280", // Gray
  "DreamFloat": "#8B5CF6", // Purple  
  "LoreSpark": "#3B82F6", // Blue
  "HeartBeats": "#EC4899", // Pink
};

export function BrandSelector() {
  const { selectedBrand, setSelectedBrand } = useCalendar();

  return (
    <Card className="border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Brand</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {brands.map((brand) => {
            const Icon = brandIcons[brand];
            return (
              <Button
                key={brand}
                variant={selectedBrand === brand ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBrand(brand)}
                className="h-12 w-12 p-0 flex items-center justify-center"
              >
                <Icon 
                  className="h-6 w-6" 
                  style={{ color: brandColors[brand as keyof typeof brandColors] }}
                />
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}