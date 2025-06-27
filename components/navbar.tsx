"use client";

import { Button } from "@/components/ui/button";
import { ImageIcon, Settings, BarChart3, Home, Film } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      description: "TikTok to multi-platform content",
    },
    {
      name: "Scene Manager",
      href: "/scene-manager",
      icon: Film,
      description: "Manage scenes and create videos",
    },
    {
      name: "Platform Optimizer",
      href: "/platform-optimizer",
      icon: Settings,
      description: "Optimize content for each platform",
    },
    {
      name: "Image Generator",
      href: "/image-generator",
      icon: ImageIcon,
      description: "Generate images for content",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      description: "View jobs and analytics",
    },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="font-bold text-xl">AutoMan</div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <div className="flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="px-2"
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
