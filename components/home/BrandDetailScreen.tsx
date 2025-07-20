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
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{
                background: selectedBrand === 'dreamfloat' 
                  ? 'linear-gradient(135deg, #667EEA, #764BA2, #A8E6CF, #88D8C0)'
                  : selectedBrand === 'peakshifts'
                  ? 'linear-gradient(135deg, #FF6B35, #F7931E, #FFD23F, #FF8C42)'
                  : selectedBrand === 'lorespark'
                  ? 'linear-gradient(135deg, #8B5CF6, #A855F7, #C084FC, #DDD6FE)'
                  : selectedBrand === 'heartbeats'
                  ? 'linear-gradient(135deg, #FF6B9D, #F093FB, #F5576C, #FF8A80)'
                  : '#ffffff',
              }}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
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