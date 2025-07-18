"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BRAND_CONFIGS, type BrandName } from "@/lib/brand-config";
import { Cloud, Heart, Sparkles, Zap } from "lucide-react";

// Brand configuration maps - could be moved to a separate constants file
export const BRAND_ICONS = {
  peakshifts: Zap,
  dreamfloat: Cloud,
  lorespark: Sparkles,
  heartbeats: Heart,
};

export const BRAND_COLORS = {
  peakshifts: {
    card: "border-orange-500 bg-orange-50 hover:bg-orange-100",
    shadow: "orange",
  },
  dreamfloat: {
    card: "border-blue-300 bg-blue-50 hover:bg-blue-100",
    shadow: "blue",
  },
  lorespark: {
    card: "border-purple-500 bg-purple-50 hover:bg-purple-100",
    shadow: "purple",
  },
  heartbeats: {
    card: "border-pink-500 bg-pink-50 hover:bg-pink-100",
    shadow: "pink",
  },
};

interface BrandCardProps {
  brandKey: BrandName;
  config: typeof BRAND_CONFIGS[BrandName];
  icon: typeof Zap;
  colorInfo: typeof BRAND_COLORS[BrandName];
  isEnabled: boolean;
  onSelect: (brand: BrandName) => void;
}

export function BrandCard({ 
  brandKey, 
  config, 
  icon: Icon, 
  colorInfo, 
  isEnabled, 
  onSelect 
}: BrandCardProps) {
  const cardClassName = `h-full flex flex-col cursor-pointer transition-all duration-100 ${
    isEnabled
      ? `${colorInfo.card} border-2 hover:shadow-2xl hover:shadow-${colorInfo.shadow}-500/20 hover:scale-[1.02] hover:-translate-y-1 group`
      : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
  }`;

  return (
    <Card
      className={cardClassName}
      onClick={() => isEnabled && onSelect(brandKey)}
    >
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-3">
          <div className="relative">
            <Icon
              className={`h-12 w-12 transition-all duration-150 ${
                isEnabled
                  ? "text-current group-hover:scale-105 group-hover:rotate-2"
                  : "text-gray-400"
              }`}
            />
            {isEnabled && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-full blur-sm" />
            )}
          </div>
        </div>
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          {config.name}
          {!isEnabled && (
            <Badge variant="secondary" className="text-xs">
              Coming Soon
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 justify-between">
        <div>
          <p
            className={`text-center transition-all duration-150 ${
              isEnabled
                ? "text-muted-foreground group-hover:text-foreground"
                : "text-gray-400"
            }`}
          >
            {config.description}
          </p>
        </div>
        {isEnabled && (
          <div className="mt-6 text-center flex-1 flex items-end">
            <Button
              className="w-full transition-all duration-150 hover:shadow-lg hover:shadow-current/20 group-hover:scale-102"
              size="lg"
            >
              Create Content
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}