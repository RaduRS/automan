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
                className={`h-full flex flex-col cursor-pointer transition-all duration-100 ${
                  isEnabled
                    ? `${
                        brandColors[brandKey]
                      } border-2 hover:shadow-2xl hover:shadow-${
                        brandKey === "peakshifts"
                          ? "orange"
                          : brandKey === "dreamfloat"
                          ? "blue"
                          : brandKey === "lorespark"
                          ? "purple"
                          : "pink"
                      }-500/20 hover:scale-[1.02] hover:-translate-y-1 group`
                    : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                }`}
                onClick={() => isEnabled && setSelectedBrand(brandKey)}
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
          })}
        </div>
      </div>
    </div>
  );
}
