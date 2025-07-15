"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TikTokForm } from "@/components/tiktok-form";
import { BRAND_CONFIGS, type BrandName } from "@/lib/brand-config";
import { Zap, Cloud, Sparkles, Heart, ArrowLeft } from "lucide-react";

const brandIcons = {
  peakshifts: Zap,
  dreamfloat: Cloud,
  lorespark: Sparkles,
  heartbeats: Heart,
};

const brandColors = {
  peakshifts: "border-orange-500 bg-orange-50 hover:bg-orange-100",
  dreamfloat: "border-blue-300 bg-blue-50 hover:bg-blue-100",
  lorespark: "border-purple-500 bg-purple-50 hover:bg-purple-100",
  heartbeats: "border-pink-500 bg-pink-50 hover:bg-pink-100",
};

export default function Home() {
  const [selectedBrand, setSelectedBrand] = useState<BrandName | null>(null);

  if (selectedBrand) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => setSelectedBrand(null)}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Brand Selection
          </Button>

          {/* Selected Brand Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              {(() => {
                const Icon = brandIcons[selectedBrand];
                return <Icon className="h-8 w-8 text-muted-foreground" />;
              })()}
              <h1 className="text-4xl font-bold tracking-tight">
                {BRAND_CONFIGS[selectedBrand].name}
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              {BRAND_CONFIGS[selectedBrand].description}
            </p>
          </div>

          <TikTokForm selectedBrand={selectedBrand} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Welcome to AutoMan
          </h1>
          <p className="text-muted-foreground text-lg">
            Select a brand to create content for
          </p>
        </div>

        {/* Brand Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(BRAND_CONFIGS).map(([key, config]) => {
            const brandKey = key as BrandName;
            const Icon = brandIcons[brandKey];
            const isEnabled = config.enabled;

            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all duration-200 ${
                  isEnabled
                    ? `${brandColors[brandKey]} border-2 hover:shadow-lg`
                    : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                }`}
                onClick={() => isEnabled && setSelectedBrand(brandKey)}
              >
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Icon
                      className={`h-12 w-12 ${
                        isEnabled ? "text-current" : "text-gray-400"
                      }`}
                    />
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
                <CardContent>
                  <p
                    className={`text-center ${
                      isEnabled ? "text-muted-foreground" : "text-gray-400"
                    }`}
                  >
                    {config.description}
                  </p>
                  {isEnabled && (
                    <div className="mt-4 text-center">
                      <Button className="w-full">Create Content</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
