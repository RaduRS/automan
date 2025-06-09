"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ArrowLeft,
  Download,
  ImageIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function ImageGeneratorPage() {
  const [sentence, setSentence] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch stats and gallery on page load
  useEffect(() => {
    fetchStats();
    fetchGallery(1);
  }, []);

  // Fetch gallery when page changes
  useEffect(() => {
    fetchGallery(currentPage);
  }, [currentPage]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/image-stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchGallery = async (page: number) => {
    try {
      const response = await fetch(`/api/image-gallery?page=${page}`);
      if (response.ok) {
        const data = await response.json();
        setGalleryData(data);
      }
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    }
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{
    url: string;
    prompt: string;
    id?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalGenerations: number;
    totalCost: number;
    lastGeneration: string | null;
  } | null>(null);
  const [galleryData, setGalleryData] = useState<{
    images: Array<{
      id: string;
      sentence: string;
      image_url: string;
      downloaded: boolean;
      created_at: string;
      prompt_generated: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalImages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentence.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/generate-sentence-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sentence: sentence.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImage(data.image);
        // Refresh stats and gallery after successful generation
        fetchStats();
        fetchGallery(currentPage);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate image");
      }
    } catch {
      setError("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `motivational-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Mark as downloaded in database if we have the ID
      if (generatedImage.id) {
        await fetch("/api/mark-downloaded", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageId: generatedImage.id }),
        });

        // Refresh gallery to show downloaded status
        fetchGallery(currentPage);
      }
    } catch {
      setError("Failed to download image");
    }
  };

  const handleReset = () => {
    setSentence("");
    setGeneratedImage(null);
    setError(null);
  };

  const downloadGalleryImage = async (imageUrl: string, imageId: string) => {
    try {
      // Download the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `motivational-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Mark as downloaded in database
      await fetch("/api/mark-downloaded", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      });

      // Refresh gallery to show downloaded status
      fetchGallery(currentPage);
    } catch {
      setError("Failed to download image");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Sentence Image Generator</h1>
        <p className="text-muted-foreground">
          Generate powerful black & white vertical images for your motivational
          sentences
        </p>

        {/* Stats Display */}
        {stats && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Total Generations
                </p>
                <p className="text-xl font-bold text-blue-900">
                  {stats.totalGenerations}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Cost</p>
                <p className="text-xl font-bold text-blue-900">
                  ${(0.06 + stats.totalCost).toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Current Session
                </p>
                <p className="text-xl font-bold text-blue-900">
                  ${stats.totalCost.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Generate Custom Image
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sentence">Motivational Sentence</Label>
              <Input
                id="sentence"
                type="text"
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="e.g., Stop waiting for motivation – it's time to dominate your discipline!"
                disabled={isGenerating}
                required
                className="min-h-[60px] text-base"
              />
              <p className="text-sm text-muted-foreground">
                Enter a powerful sentence from your script to generate a custom
                black & white vertical image
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isGenerating || !sentence.trim()}
                className="flex-1"
              >
                {isGenerating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isGenerating ? "Generating..." : "Generate Image"}
              </Button>

              {generatedImage && (
                <Button type="button" variant="outline" onClick={handleReset}>
                  New Image
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Generated Image Display */}
      {generatedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-green-500" />
              Generated Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image */}
              <div className="flex-1">
                <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden max-w-sm mx-auto">
                  <img
                    src={generatedImage.url}
                    alt="Generated motivational image"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Details & Actions */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    Original Sentence:
                  </h3>
                  <p className="text-sm bg-blue-50 border border-blue-200 p-3 rounded">
                    {sentence}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    Generated Prompt:
                  </h3>
                  <p className="text-sm bg-purple-50 border border-purple-200 p-3 rounded">
                    {generatedImage.prompt}
                  </p>
                </div>

                <Button onClick={downloadImage} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Gallery */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            Previously Generated Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          {galleryData && galleryData.images.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {galleryData.images.map((image) => (
                  <div key={image.id} className="space-y-2">
                    <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden">
                      <img
                        src={image.image_url}
                        alt={`Generated for: ${image.sentence}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {image.prompt_generated}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadGalleryImage(image.image_url, image.id)
                        }
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                        {image.downloaded && (
                          <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {galleryData.pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!galleryData.pagination.hasPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {galleryData.pagination.currentPage} of{" "}
                    {galleryData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!galleryData.pagination.hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No images generated yet. Create your first image above!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
