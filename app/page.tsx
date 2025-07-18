"use client";

import { useState } from "react";
import { type BrandName } from "@/lib/brand-config";
import { BrandSelectionScreen } from "@/components/home/BrandSelectionScreen";
import { BrandDetailScreen } from "@/components/home/BrandDetailScreen";

// Main component
export default function Home() {
  const [selectedBrand, setSelectedBrand] = useState<BrandName | null>(null);

  return selectedBrand ? (
    <BrandDetailScreen 
      selectedBrand={selectedBrand} 
      onBack={() => setSelectedBrand(null)} 
    />
  ) : (
    <BrandSelectionScreen onSelectBrand={setSelectedBrand} />
  );
}
