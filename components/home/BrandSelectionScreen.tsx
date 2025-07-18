"use client";

import { BRAND_CONFIGS, type BrandName } from "@/lib/brand-config";
import { BrandCard, BRAND_ICONS, BRAND_COLORS } from "./BrandCard";

interface BrandSelectionScreenProps {
  onSelectBrand: (brand: BrandName) => void;
}

export function BrandSelectionScreen({ onSelectBrand }: BrandSelectionScreenProps) {
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
            const Icon = BRAND_ICONS[brandKey];
            const brandColor = BRAND_COLORS[brandKey];
            const isEnabled = config.enabled;

            return (
              <BrandCard
                key={key}
                brandKey={brandKey}
                config={config}
                icon={Icon}
                colorInfo={brandColor}
                isEnabled={isEnabled}
                onSelect={onSelectBrand}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}