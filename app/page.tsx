import { TikTokForm } from "@/components/tiktok-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Automan</h1>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">View Dashboard</Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <p className="text-muted-foreground text-lg">
            Transform TikTok videos into multi-platform content automatically
          </p>
        </div>

        <TikTokForm />
      </div>
    </div>
  );
}
