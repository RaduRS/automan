"use client";

import { TikTokForm } from "@/components/tiktok-form";
import { BRAND_CONFIGS, type BrandName } from "@/lib/brand-config";
import { BRAND_ICONS } from "./BrandCard";

interface BrandDetailScreenProps {
  selectedBrand: BrandName;
  onBack: () => void;
}

export function BrandDetailScreen({ selectedBrand }: BrandDetailScreenProps) {
  const Icon = BRAND_ICONS[selectedBrand];
  const brandConfig = BRAND_CONFIGS[selectedBrand];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Selected Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Icon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-white">
              {brandConfig.name}
            </h1>
          </div>
          <p className="text-gray-300 text-lg font-medium">
            {brandConfig.description}
          </p>
        </div>

        <TikTokForm selectedBrand={selectedBrand} />
      </div>
    </div>
  );
}