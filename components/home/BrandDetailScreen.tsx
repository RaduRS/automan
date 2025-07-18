"use client";

import { Button } from "@/components/ui/button";
import { TikTokForm } from "@/components/tiktok-form";
import { BRAND_CONFIGS, type BrandName } from "@/lib/brand-config";
import { ArrowLeft } from "lucide-react";
import { BRAND_ICONS } from "./BrandCard";

interface BrandDetailScreenProps {
  selectedBrand: BrandName;
  onBack: () => void;
}

export function BrandDetailScreen({ selectedBrand, onBack }: BrandDetailScreenProps) {
  const Icon = BRAND_ICONS[selectedBrand];
  const brandConfig = BRAND_CONFIGS[selectedBrand];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Brand Selection
        </Button>

        {/* Selected Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-4xl font-bold tracking-tight">
              {brandConfig.name}
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {brandConfig.description}
          </p>
        </div>

        <TikTokForm selectedBrand={selectedBrand} />
      </div>
    </div>
  );
}