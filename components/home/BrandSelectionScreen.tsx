"use client";

import { type BrandName } from "@/lib/brand-config";
import Image from "next/image";
import "./trapezoid-card.css";

interface BrandSelectionScreenProps {
  onSelectBrand: (brand: BrandName) => void;
}

interface StyleCardProps {
  brandKey: BrandName;
  title: string;
  description: string;
  features: string[];
  imageSrc: string;
  onSelect: (brand: BrandName) => void;
  className?: string;
}

function StyleCard({ brandKey, title, features, imageSrc, onSelect, className = "" }: StyleCardProps) {
  return (
    <div 
      className={`trapezoid-card cursor-pointer ${className}`}
      onClick={() => onSelect(brandKey)}
    >
      {/* Trapezoid border */}
      <div className="trapezoid-border"></div>
      
      {/* Trapezoid content */}
      <div className="trapezoid-content">
        {/* Background Image */}
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="trapezoid-image"
        />
        
        {/* Content overlay */}
        <div className="trapezoid-overlay">
          {/* Top Badge */}
          <div className="trapezoid-badge">
            <span>{title}</span>
          </div>
          
          {/* Bottom Features */}
          <div className="trapezoid-features">
            {features.map((feature, index) => (
              <div key={index} className="trapezoid-feature">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandSelectionScreen({ onSelectBrand }: BrandSelectionScreenProps) {
  const styles = [
    {
      brandKey: "peakshifts" as BrandName,
      title: "Black & White",
      description: "Powerful monochrome aesthetics for motivation",
      features: ["Self-improvement content", "Discipline & mindset", "Motivational quotes", "High contrast visuals"],
      imageSrc: "/images/peak.png",
      className: "transform rotate-1 -translate-y-6"
    },
    {
      brandKey: "dreamfloat" as BrandName,
      title: "Dreamy Pastels",
      description: "Soft, ethereal visuals for relaxation",
      features: ["Sleep & dream content", "Calming aesthetics", "Late-night audience", "Hypnotic visuals"],
      imageSrc: "/images/dream.png",
      className: "transform -rotate-1"
    },
    {
      brandKey: "lorespark" as BrandName,
      title: "Sci-Fi Adventure",
      description: "Futuristic worlds and epic storytelling",
      features: ["Fantasy & sci-fi lore", "World-building stories", "Adventure content", "Cinematic visuals"],
      imageSrc: "/images/lore.png",
      className: "transform rotate-2 -translate-y-6"
    },
    {
      brandKey: "heartbeats" as BrandName,
      title: "Warm Emotional",
      description: "Heartfelt stories that touch the soul",
      features: ["Emotional narratives", "Poetic affirmations", "Human connection", "Warm color palette"],
      imageSrc: "/images/heart.png",
      className: "transform -rotate-2"
    }
  ];

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-32">
          <h1 className="text-6xl font-bold tracking-tight mb-8 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            AutoMan
          </h1>
          
          <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed">
            Collaborate with Intelligence to Build Stunning Visual Content
          </p>
        </div>

        {/* Style Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
          {styles.map((style) => (
            <StyleCard
              key={style.brandKey}
              brandKey={style.brandKey}
              title={style.title}
              description={style.description}
              features={style.features}
              imageSrc={style.imageSrc}
              onSelect={onSelectBrand}
              className={style.className}
            />
          ))}
        </div>
      </div>
    </div>
  );
}