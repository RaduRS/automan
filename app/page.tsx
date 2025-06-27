import { TikTokForm } from "@/components/tiktok-form";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Welcome to AutoMan
          </h1>
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
