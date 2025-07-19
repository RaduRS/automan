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
    card: "bg-gradient-to-br from-orange-900/40 to-orange-800/30 hover:from-orange-800/50 hover:to-orange-700/40",
    shadow: "orange",
  },
  dreamfloat: {
    card: "bg-gradient-to-br from-blue-900/40 to-blue-800/30 hover:from-blue-800/50 hover:to-blue-700/40",
    shadow: "blue",
  },
  lorespark: {
    card: "bg-gradient-to-br from-purple-900/40 to-purple-800/30 hover:from-purple-800/50 hover:to-purple-700/40",
    shadow: "purple",
  },
  heartbeats: {
    card: "bg-gradient-to-br from-pink-900/40 to-pink-800/30 hover:from-pink-800/50 hover:to-pink-700/40",
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
  const cardClassName = `h-full flex flex-col cursor-pointer transition-all duration-200 rounded-2xl border-2 border-white/20 shadow-lg shadow-black/10 backdrop-blur-sm ${
    isEnabled
      ? `${colorInfo.card} hover:shadow-2xl hover:shadow-white/30 hover:border-white/40 hover:scale-[1.02] hover:-translate-y-1 group`
      : "bg-gray-800/30 border-gray-600/30 opacity-60 cursor-not-allowed"
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
                  ? "text-white group-hover:scale-105 group-hover:rotate-2"
                  : "text-gray-500"
              }`}
            />
            {isEnabled && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-full blur-sm" />
            )}
          </div>
        </div>
        <CardTitle className="text-xl flex items-center justify-center gap-2 text-white">
          {config.name}
          {!isEnabled && (
            <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
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
                ? "text-gray-300 group-hover:text-white"
                : "text-gray-500"
            }`}
          >
            {config.description}
          </p>
        </div>
        {isEnabled && (
          <div className="mt-6 text-center flex-1 flex items-end">
            <Button
              className="w-full transition-all duration-150 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 hover:shadow-lg hover:shadow-white/20 group-hover:scale-102 backdrop-blur-sm"
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