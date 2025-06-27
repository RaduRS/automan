"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  Download,
  ImageIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Trash2,
  Wand2,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export default function ImageGeneratorPage() {
  const [sentence, setSentence] = useState("");
  const [scriptContext, setScriptContext] = useState("");
  const [scriptLoadedFromDB, setScriptLoadedFromDB] = useState(false);
  const [directPrompt, setDirectPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Scene replacement functionality
  const [scenes, setScenes] = useState<
    Array<{
      id: number;
      text: string;
      imageUrl?: string;
      voiceUrl?: string;
    }>
  >([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [isReplacingImage, setIsReplacingImage] = useState(false);

  // Fetch gallery and latest script on page load
  useEffect(() => {
    fetchGallery(1);
    fetchLatestScript();
  }, []);

  // Fetch gallery when page changes
  useEffect(() => {
    fetchGallery(currentPage);
  }, [currentPage]);

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

  const fetchLatestScript = async () => {
    try {
      const response = await fetch("/api/latest-script");
      if (response.ok) {
        const data = await response.json();
        if (data.script) {
          setScriptContext(data.script);
          setScriptLoadedFromDB(true);

          // Parse scenes from the script and get their stored data
          if (data.scenes && Array.isArray(data.scenes)) {
            const scenesWithText = data.scenes.map(
              (sceneText: string, index: number) => ({
                id: index + 1,
                text: sceneText,
                imageUrl: undefined,
                voiceUrl: undefined,
              })
            );

            // Load scene data from localStorage if available
            const scriptHash = hashScript(data.script);
            const storedScenes = loadScenesFromStorage(scriptHash);
            if (storedScenes) {
              storedScenes.forEach((stored, index) => {
                if (scenesWithText[index]) {
                  scenesWithText[index].imageUrl = stored.imageUrl;
                  scenesWithText[index].voiceUrl = stored.voiceUrl;
                }
              });
            }

            setScenes(scenesWithText);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch latest script:", err);
    }
  };

  // Helper functions for localStorage (same as in scene-manager)
  const hashScript = (script: string): string => {
    let hash = 0;
    for (let i = 0; i < script.length; i++) {
      const char = script.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  };

  const loadScenesFromStorage = (
    scriptHash: string
  ):
    | Partial<{
        imageUrl?: string;
        voiceUrl?: string;
      }>[]
    | null => {
    try {
      const stored = localStorage.getItem(`automan_scenes_${scriptHash}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load scenes from localStorage:", error);
    }
    return null;
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{
    url: string;
    prompt: string;
    id?: string;
    generationType?: "ai-generated" | "direct-prompt";
  } | null>(null);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({
          sentence: sentence.trim(),
          scriptContext: scriptContext.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImage({
          ...data.image,
          generationType: "ai-generated",
        });
        // Refresh gallery after successful generation
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
    setScriptContext("");
    setScriptLoadedFromDB(false);
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

  const handleRegenerateImage = async () => {
    if (!generatedImage?.prompt) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: generatedImage.prompt,
          sentence: sentence.trim() || "Regenerated image",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImage({
          ...data.image,
          generationType: generatedImage.generationType || "ai-generated",
        });
        fetchGallery(currentPage);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to regenerate image");
      }
    } catch {
      setError("Failed to regenerate image. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const response = await fetch("/api/delete-image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      });

      if (response.ok) {
        // Close delete menu and refresh gallery after successful deletion
        setDeleteMenuOpen(null);
        fetchGallery(currentPage);
        // Note: We don't refresh stats because they should preserve historical data
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete image");
      }
    } catch {
      setError("Failed to delete image. Please try again.");
    }
  };

  const toggleDeleteMenu = (imageId: string) => {
    setDeleteMenuOpen(deleteMenuOpen === imageId ? null : imageId);
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPrompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/generate-direct-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: directPrompt.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImage({
          ...data.image,
          generationType: "direct-prompt",
        });
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

  const handleEnhancePrompt = async () => {
    if (!directPrompt.trim()) return;

    // Store original prompt if not already stored
    if (!originalPrompt) {
      setOriginalPrompt(directPrompt.trim());
    }

    setIsEnhancing(true);
    setError(null);

    try {
      // Always enhance from the original prompt, not the current enhanced version
      const promptToEnhance = originalPrompt || directPrompt.trim();

      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptToEnhance,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDirectPrompt(data.enhancedPrompt);
        // Store original if not already stored
        if (!originalPrompt) {
          setOriginalPrompt(promptToEnhance);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to enhance prompt");
      }
    } catch {
      setError("Failed to enhance prompt. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRevertToOriginal = () => {
    if (originalPrompt) {
      setDirectPrompt(originalPrompt);
      setOriginalPrompt(""); // Clear the stored original
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    setDirectPrompt(newPrompt);
    // If user manually changes the prompt, clear the original
    if (originalPrompt && newPrompt !== originalPrompt) {
      // Only clear if they've changed it significantly (not just minor edits)
      if (Math.abs(newPrompt.length - originalPrompt.length) > 10) {
        setOriginalPrompt("");
      }
    }
  };

  const handleReplaceSceneImage = async () => {
    if (!generatedImage || !selectedSceneId || !scriptContext) return;

    setIsReplacingImage(true);
    try {
      const sceneIndex = parseInt(selectedSceneId) - 1;
      const updatedScenes = [...scenes];
      updatedScenes[sceneIndex].imageUrl = generatedImage.url;
      setScenes(updatedScenes);

      // Save to localStorage
      const scriptHash = hashScript(scriptContext);
      const sceneData = updatedScenes.map((scene) => ({
        id: scene.id,
        text: scene.text,
        voiceUrl: scene.voiceUrl,
        imageUrl: scene.imageUrl,
      }));
      localStorage.setItem(
        `automan_scenes_${scriptHash}`,
        JSON.stringify(sceneData)
      );

      // Show success message
      setError(`✅ Successfully replaced Scene ${selectedSceneId} image!`);
      setTimeout(() => setError(null), 3000);
    } catch {
      setError("Failed to replace scene image");
    } finally {
      setIsReplacingImage(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
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
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Input and Generation */}
        <div className="space-y-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Generate Custom Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="ai-generated" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ai-generated">AI Generated</TabsTrigger>
                  <TabsTrigger value="direct-prompt">Direct Prompt</TabsTrigger>
                </TabsList>

                {/* AI Generated Tab */}
                <TabsContent value="ai-generated" className="space-y-4 mt-4">
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
                        Enter a powerful sentence from your script to generate a
                        custom black & white vertical image
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="scriptContext">
                          Script Context (Optional)
                        </Label>
                        {scriptLoadedFromDB && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              ✓ Latest script loaded
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={fetchLatestScript}
                              disabled={isGenerating}
                              className="text-xs px-2 py-1 h-6"
                            >
                              Refresh
                            </Button>
                          </div>
                        )}
                      </div>
                      <textarea
                        id="scriptContext"
                        value={scriptContext}
                        onChange={(e) => {
                          setScriptContext(e.target.value);
                          setScriptLoadedFromDB(false);
                        }}
                        placeholder="Paste your full OpenAI script here to provide context. This helps generate more relevant images that align with your overall message..."
                        disabled={isGenerating}
                        className="min-h-[120px] w-full px-3 py-2 text-sm border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-vertical"
                        rows={5}
                      />
                      <p className="text-sm text-muted-foreground">
                        {scriptLoadedFromDB
                          ? "✓ Auto-loaded with your latest OpenAI script. Edit as needed or refresh to get the most recent version."
                          : "Optional: Paste your full script to help generate more relevant and contextual images for your specific sentence"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={
                          isGenerating || isRegenerating || !sentence.trim()
                        }
                        className="flex-1"
                      >
                        {isGenerating && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isGenerating ? "Generating..." : "Generate Image"}
                      </Button>

                      {generatedImage && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleReset}
                        >
                          New Image
                        </Button>
                      )}
                    </div>
                  </form>
                </TabsContent>

                {/* Direct Prompt Tab */}
                <TabsContent value="direct-prompt" className="space-y-4 mt-4">
                  <form onSubmit={handleDirectSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="directPrompt">Image Prompt</Label>
                        <div className="flex gap-2">
                          {originalPrompt && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRevertToOriginal}
                              className="h-7 px-2 text-xs"
                            >
                              Revert
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleEnhancePrompt}
                            disabled={isEnhancing || !directPrompt.trim()}
                            className="h-7 px-2"
                          >
                            {isEnhancing && (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            )}
                            <Wand2 className="h-3 w-3 mr-1" />
                            {isEnhancing
                              ? "Enhancing..."
                              : originalPrompt
                              ? "Re-enhance"
                              : "Enhance"}
                          </Button>
                        </div>
                      </div>
                      <textarea
                        id="directPrompt"
                        value={directPrompt}
                        onChange={(e) => handlePromptChange(e.target.value)}
                        placeholder="e.g., A person standing at the edge of a cliff looking at the horizon, dramatic lighting, black and white photography"
                        disabled={isGenerating || isEnhancing}
                        required
                        className="min-h-[120px] w-full px-3 py-2 text-sm border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-vertical"
                        rows={5}
                      />
                      {originalPrompt && (
                        <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 p-2 rounded">
                          <strong>Original:</strong> {originalPrompt}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Enter a direct prompt for the image generator. Click
                        &ldquo;Enhance&rdquo; to improve your prompt with AI.
                        Describe the scene, mood, and visual elements you want.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={
                          isGenerating || isRegenerating || !directPrompt.trim()
                        }
                        className="flex-1"
                      >
                        {isGenerating && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isGenerating ? "Generating..." : "Generate Image"}
                      </Button>

                      {generatedImage && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDirectPrompt("")}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generated Content Details */}
          {generatedImage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Generated Content Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedImage.generationType === "ai-generated" &&
                  scriptContext && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">
                        Script Context Used:
                      </h3>
                      <p className="text-sm bg-green-50 border border-green-200 p-3 rounded max-h-24 overflow-y-auto">
                        {scriptContext.length > 200
                          ? `${scriptContext.substring(0, 200)}...`
                          : scriptContext}
                      </p>
                    </div>
                  )}
                <div>
                  <h3 className="font-semibold text-sm mb-2">
                    {generatedImage.generationType === "direct-prompt"
                      ? "Your Prompt:"
                      : "Generated Prompt:"}
                  </h3>
                  <p className="text-sm bg-purple-50 border border-purple-200 p-3 rounded">
                    {generatedImage.prompt}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Generated Image Display */}
        <div>
          {generatedImage ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-green-500" />
                    Generated Image
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRegenerateImage}
                      size="sm"
                      variant="outline"
                      disabled={isRegenerating}
                    >
                      {isRegenerating && (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      )}
                      {isRegenerating ? "Regenerating..." : "Regenerate"}
                    </Button>
                    <Button onClick={downloadImage} size="sm">
                      <Download className="h-3 w-3 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image */}
                <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden max-w-sm mx-auto">
                  <img
                    src={generatedImage.url}
                    alt="Generated motivational image"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Scene Replacement Section */}
                {scenes.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Replace Scene Image
                    </h3>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor="scene-select" className="text-xs">
                          Select Scene
                        </Label>
                        <Select
                          value={selectedSceneId}
                          onValueChange={setSelectedSceneId}
                        >
                          <SelectTrigger id="scene-select" className="h-9">
                            <SelectValue placeholder="Choose scene..." />
                          </SelectTrigger>
                          <SelectContent>
                            {scenes.map((scene) => (
                              <SelectItem
                                key={scene.id}
                                value={scene.id.toString()}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    Scene {scene.id}
                                  </span>
                                  {scene.imageUrl && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleReplaceSceneImage}
                        disabled={!selectedSceneId || isReplacingImage}
                        size="sm"
                        className="h-9"
                      >
                        {isReplacingImage ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1" />
                        )}
                        {isReplacingImage ? "Replacing..." : "Replace"}
                      </Button>
                    </div>
                    {selectedSceneId && (
                      <div className="mt-2 text-xs text-muted-foreground bg-blue-50 border border-blue-200 p-2 rounded">
                        <strong>Scene {selectedSceneId}:</strong>{" "}
                        {scenes
                          .find((s) => s.id.toString() === selectedSceneId)
                          ?.text.substring(0, 100)}
                        ...
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  Your generated image will appear here
                </p>

                {/* Scene dropdown for empty state */}
                {scenes.length > 0 && (
                  <div className="mt-6 max-w-xs mx-auto">
                    <Label
                      htmlFor="scene-select-empty"
                      className="text-sm text-muted-foreground"
                    >
                      Select scene to replace when image is generated
                    </Label>
                    <Select
                      value={selectedSceneId}
                      onValueChange={setSelectedSceneId}
                    >
                      <SelectTrigger id="scene-select-empty" className="mt-2">
                        <SelectValue placeholder="Choose scene..." />
                      </SelectTrigger>
                      <SelectContent>
                        {scenes.map((scene) => (
                          <SelectItem
                            key={scene.id}
                            value={scene.id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Scene {scene.id}
                              </span>
                              {scene.imageUrl && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3 mb-6">
                {galleryData.images.map((image) => (
                  <div key={image.id} className="space-y-1.5">
                    <div className="relative aspect-[9/16] bg-muted rounded-md overflow-hidden group">
                      <img
                        src={image.image_url}
                        alt={`Generated for: ${image.sentence}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Delete button overlay */}
                      <button
                        onClick={() => toggleDeleteMenu(image.id)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Delete image"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      {/* Delete confirmation dropdown */}
                      {deleteMenuOpen === image.id && (
                        <div className="absolute top-8 right-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-20">
                          <div className="p-2 space-y-1">
                            <button
                              onClick={() => handleDeleteImage(image.id)}
                              className="w-full px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteMenuOpen(null)}
                              className="w-full px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 text-center">
                      {image.prompt_generated}
                    </p>
                    <div className="flex items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadGalleryImage(image.image_url, image.id)
                        }
                        className="px-2 py-1 text-xs h-7"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {image.downloaded ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          "Get"
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
