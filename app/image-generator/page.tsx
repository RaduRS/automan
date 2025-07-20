"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
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
  Maximize2,
} from "lucide-react";

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
  const [expandedImage, setExpandedImage] = useState<{
    url: string;
    prompt: string;
    sentence: string;
    id: string;
  } | null>(null);
  const [assigningImageId, setAssigningImageId] = useState<string>("");

  // Fetch gallery and latest script on page load
  useEffect(() => {
    fetchGallery(1);
    fetchLatestScript();
  }, []);

  // Fetch gallery when page changes
  useEffect(() => {
    fetchGallery(currentPage);
  }, [currentPage]);

  // Close assignment dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assigningImageId &&
        !(event.target as Element).closest(".assignment-dropdown")
      ) {
        setAssigningImageId("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [assigningImageId]);

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
          brand: "peakshifts", // Default for image generator page - could be enhanced later
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

      // Always convert to PNG to ensure proper metadata and previews
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Set canvas dimensions to match the image
          canvas.width = img.width;
          canvas.height = img.height;

          // Fill with white background to ensure opaque PNG
          if (ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }

          // Convert to PNG blob with maximum quality
          canvas.toBlob(
            (pngBlob) => {
              if (pngBlob) {
                // Create a proper PNG file with metadata
                const fileName = `motivational-image-${Date.now()}.png`;

                // Use the File constructor to create a proper file with metadata
                const file = new File([pngBlob], fileName, {
                  type: "image/png",
                  lastModified: Date.now(),
                });

                // Create download link
                const url = window.URL.createObjectURL(file);
                const link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                link.style.display = "none";

                // Add to DOM, click, then remove
                document.body.appendChild(link);
                link.click();

                // Clean up after a short delay to ensure download starts
                setTimeout(() => {
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                }, 100);

                resolve(undefined);
              } else {
                reject(new Error("Failed to create PNG"));
              }
            },
            "image/png",
            1.0
          ); // Maximum quality
        };

        img.onerror = reject;
        img.crossOrigin = "anonymous"; // Handle CORS if needed
        img.src = window.URL.createObjectURL(blob);
      });

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
    } catch (error) {
      console.error("Download error:", error);
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
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Always convert to PNG to ensure proper metadata and previews
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Set canvas dimensions to match the image
          canvas.width = img.width;
          canvas.height = img.height;

          // Fill with white background to ensure opaque PNG
          if (ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }

          // Convert to PNG blob with maximum quality
          canvas.toBlob(
            (pngBlob) => {
              if (pngBlob) {
                // Create a proper PNG file with metadata
                const fileName = `motivational-image-${Date.now()}.png`;

                // Use the File constructor to create a proper file with metadata
                const file = new File([pngBlob], fileName, {
                  type: "image/png",
                  lastModified: Date.now(),
                });

                // Create download link
                const url = window.URL.createObjectURL(file);
                const link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                link.style.display = "none";

                // Add to DOM, click, then remove
                document.body.appendChild(link);
                link.click();

                // Clean up after a short delay to ensure download starts
                setTimeout(() => {
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                }, 100);

                resolve(undefined);
              } else {
                reject(new Error("Failed to create PNG"));
              }
            },
            "image/png",
            1.0
          ); // Maximum quality
        };

        img.onerror = reject;
        img.crossOrigin = "anonymous"; // Handle CORS if needed
        img.src = window.URL.createObjectURL(blob);
      });

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
    } catch (error) {
      console.error("Gallery download error:", error);
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
          brand: "peakshifts", // Default for image generator page - could be enhanced later
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
          brand: "peakshifts", // Default for image generator page - could be enhanced later
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

  const handleAssignGalleryImageToScene = async (
    imageUrl: string,
    sceneId: string
  ) => {
    try {
      const sceneIndex = parseInt(sceneId) - 1;
      const updatedScenes = [...scenes];
      updatedScenes[sceneIndex].imageUrl = imageUrl;
      setScenes(updatedScenes);

      // Save to localStorage if we have script context
      if (scriptContext) {
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
      }

      // Show success message
      setError(`✅ Successfully assigned image to Scene ${sceneId}!`);
      setTimeout(() => setError(null), 3000);

      // Close expanded image modal
      setExpandedImage(null);
      setAssigningImageId("");
    } catch {
      setError("Failed to assign image to scene");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl pt-16 font-bold mb-2 text-white">Sentence Image Generator</h1>
        <p className="text-gray-300">
          Generate powerful black & white vertical images for your motivational
          sentences
        </p>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 py-8">
        {/* Left Column - Input and Generation */}
        <div className="space-y-6">
          {/* Input Form */}
          <Card className="border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Generate Custom Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="ai-generated" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-lg gap-2" style={{ backgroundColor: '#212223' }}>
                  <TabsTrigger 
                    value="ai-generated" 
                    className="data-[state=active]:text-white text-gray-500 rounded-md transition-all duration-200"
                    style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                  >
                    AI Generated
                  </TabsTrigger>
                  <TabsTrigger 
                    value="direct-prompt"
                    className="data-[state=active]:text-white text-gray-500 rounded-md transition-all duration-200"
                    style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                  >
                    Direct Prompt
                  </TabsTrigger>
                </TabsList>

                {/* AI Generated Tab */}
                <TabsContent value="ai-generated" className="space-y-4 mt-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sentence" className="text-white">Motivational Sentence</Label>
                      <Input
                        id="sentence"
                        type="text"
                        value={sentence}
                        onChange={(e) => setSentence(e.target.value)}
                        placeholder="e.g., Stop waiting for motivation – it's time to dominate your discipline!"
                        disabled={isGenerating}
                        required
                        className="min-h-[60px] text-base text-white placeholder-gray-400 focus:border-blue-500"
                        style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                      />
                      <p className="text-sm text-gray-300">
                        Enter a powerful sentence from your script to generate a
                        custom black & white vertical image
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="scriptContext" className="text-white">
                          Script Context (Optional)
                        </Label>
                        {scriptLoadedFromDB && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-400 px-2 py-1 rounded" style={{ backgroundColor: '#161819' }}>
                              ✓ Latest script loaded
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={fetchLatestScript}
                              disabled={isGenerating}
                              className="text-xs px-2 py-1 h-6 text-white hover:bg-gray-600"
                              style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
                        className="min-h-[120px] w-full px-3 py-2 text-sm border rounded-md resize-vertical text-white placeholder-gray-400 focus:border-blue-500"
                        style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                        rows={5}
                      />
                      <p className="text-sm text-gray-300">
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
                        className="flex-1 text-white"
                        style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
                          className="text-white hover:bg-gray-700"
                          style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
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
                        <Label htmlFor="directPrompt" className="text-white">Image Prompt</Label>
                        <div className="flex gap-2">
                          {originalPrompt && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRevertToOriginal}
                              className="h-9 px-3 text-xs text-white hover:bg-gray-600"
                              style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
                            className="h-9 px-3 text-white hover:bg-gray-600"
                            style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
                        className="min-h-[120px] w-full px-3 py-2 text-sm border rounded-md resize-vertical text-white placeholder-gray-400 focus:border-blue-500"
                        style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                        rows={5}
                      />
                      {originalPrompt && (
                        <div className="text-xs text-gray-300 p-2 rounded" style={{ backgroundColor: '#161819', borderColor: '#282A2B', border: '1px solid' }}>
                          <strong>Original:</strong> {originalPrompt}
                        </div>
                      )}
                      <p className="text-sm text-gray-300">
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
                        className="flex-1 h-11 text-base text-white"
                        style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
                          className="h-11 text-white hover:bg-gray-600"
                          style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
            <Alert variant="destructive" className="text-white" style={{ backgroundColor: '#161819', borderColor: '#dc2626' }}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generated Content Details */}
          {generatedImage && (
            <Card className="border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Generated Content Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedImage.generationType === "ai-generated" &&
                  scriptContext && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 text-white">
                        Script Context Used:
                      </h3>
                      <p className="text-sm p-3 rounded max-h-24 overflow-y-auto text-gray-300" style={{ backgroundColor: '#212223', borderColor: '#282A2B', border: '1px solid' }}>
                        {scriptContext.length > 200
                          ? `${scriptContext.substring(0, 200)}...`
                          : scriptContext}
                      </p>
                    </div>
                  )}
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-white">
                    {generatedImage.generationType === "direct-prompt"
                      ? "Your Prompt:"
                      : "Generated Prompt:"}
                  </h3>
                  <p className="text-sm p-3 rounded text-gray-300" style={{ backgroundColor: '#212223', borderColor: '#282A2B', border: '1px solid' }}>
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
            <Card className="border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ImageIcon className="h-5 w-5 text-green-400" />
                    Generated Image
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRegenerateImage}
                      size="sm"
                      variant="outline"
                      disabled={isRegenerating}
                      className="h-11 text-white hover:bg-gray-600"
                      style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                    >
                      {isRegenerating && (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      )}
                      {isRegenerating ? "Regenerating..." : "Regenerate"}
                    </Button>
                    <Button 
                      onClick={downloadImage} 
                      size="sm"
                      className="h-11 text-white"
                      style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image */}
                <div className="relative aspect-[9/16] rounded-lg overflow-hidden max-w-sm mx-auto" style={{ backgroundColor: '#212223' }}>
                  <img
                    src={generatedImage.url}
                    alt="Generated motivational image"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Scene Replacement Section */}
                {scenes.length > 0 && (
                  <div className="border-t pt-4" style={{ borderColor: '#282A2B' }}>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-white">
                      <RefreshCw className="h-4 w-4" />
                      Replace Scene Image
                    </h3>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor="scene-select" className="text-xs text-white">
                          Select Scene
                        </Label>
                        <Select
                          value={selectedSceneId}
                          onValueChange={setSelectedSceneId}
                        >
                          <SelectTrigger 
                            id="scene-select" 
                            className="h-9 text-white"
                            style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                          >
                            <SelectValue placeholder="Choose scene..." />
                          </SelectTrigger>
                          <SelectContent side="top" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
                            {scenes.map((scene) => (
                              <SelectItem
                                key={scene.id}
                                value={scene.id.toString()}
                                className="text-white hover:bg-gray-700"
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
                        className="h-11 text-white"
                        style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
                      <div className="mt-2 text-xs text-gray-300 p-2 rounded" style={{ backgroundColor: '#161819', borderColor: '#282A2B', border: '1px solid' }}>
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
            <Card className="h-full flex items-center justify-center border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
              <CardContent className="text-center py-12">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-300 mb-4">
                  Your generated image will appear here
                </p>

                {/* Scene dropdown for empty state */}
                {scenes.length > 0 && (
                  <div className="mt-6 max-w-xs mx-auto">
                    <Label
                      htmlFor="scene-select-empty"
                      className="text-sm text-gray-300"
                    >
                      Select scene to replace when image is generated
                    </Label>
                    <Select
                      value={selectedSceneId}
                      onValueChange={setSelectedSceneId}
                    >
                      <SelectTrigger 
                        id="scene-select-empty" 
                        className="mt-2 text-white"
                        style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                      >
                        <SelectValue placeholder="Choose scene..." />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
                        {scenes.map((scene) => (
                          <SelectItem
                            key={scene.id}
                            value={scene.id.toString()}
                            className="text-white hover:bg-gray-700"
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
      <Card className="mt-8 border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ImageIcon className="h-5 w-5 text-blue-400" />
            Previously Generated Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          {galleryData && galleryData.images.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3 mb-6">
                {galleryData.images.map((image) => (
                  <div key={image.id} className="space-y-1.5 relative">
                    <div
                      className="relative aspect-[9/16] rounded-md overflow-hidden group cursor-pointer"
                      style={{ backgroundColor: '#212223' }}
                      onClick={() =>
                        setExpandedImage({
                          url: image.image_url,
                          prompt: image.prompt_generated,
                          sentence: image.sentence,
                          id: image.id,
                        })
                      }
                    >
                      <img
                        src={image.image_url}
                        alt={`Generated for: ${image.sentence}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      {/* Expand icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="h-8 w-8 text-white drop-shadow-lg" />
                      </div>

                      {/* Action buttons overlay */}
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDeleteMenu(image.id);
                          }}
                          className="p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                          title="Delete image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Delete confirmation dropdown */}
                      {deleteMenuOpen === image.id && (
                        <div className="absolute top-8 right-1 rounded-md shadow-lg z-10 min-w-20" style={{ backgroundColor: '#161819', borderColor: '#282A2B', border: '1px solid' }}>
                          <div className="p-2 space-y-1">
                            <button
                              onClick={() => handleDeleteImage(image.id)}
                              className="w-full px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteMenuOpen(null)}
                              className="w-full px-3 py-1 text-xs text-gray-300 rounded hover:bg-gray-700 transition-colors"
                              style={{ backgroundColor: '#212223' }}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-1 text-center">
                      {image.prompt_generated}
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadGalleryImage(image.image_url, image.id)
                        }
                        className="px-2 py-1 text-xs h-7 text-white hover:bg-gray-600"
                        style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {image.downloaded ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          "Get"
                        )}
                      </Button>
                      {scenes.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssigningImageId(image.id)}
                          className="px-2 py-1 text-xs h-7 text-white hover:bg-gray-600"
                          style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                          title="Assign to scene"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Scene assignment dropdown */}
                    {assigningImageId === image.id && (
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 rounded-md shadow-lg min-w-32" style={{ backgroundColor: '#161819', borderColor: '#282A2B', border: '1px solid' }}>
                        <div className="p-2">
                          <p className="text-xs font-medium mb-2 text-white">
                            Assign to Scene:
                          </p>
                          <div className="space-y-1">
                            {scenes.map((scene) => (
                              <button
                                key={scene.id}
                                onClick={() =>
                                  handleAssignGalleryImageToScene(
                                    image.image_url,
                                    scene.id.toString()
                                  )
                                }
                                className="w-full px-2 py-1 text-xs text-left hover:bg-gray-700 rounded flex items-center justify-between text-white"
                              >
                                <span>Scene {scene.id}</span>
                                {scene.imageUrl && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                )}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setAssigningImageId("")}
                            className="w-full px-2 py-1 text-xs text-gray-400 hover:bg-gray-700 rounded mt-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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
                    className="text-white hover:bg-gray-600"
                    style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-300">
                    Page {galleryData.pagination.currentPage} of{" "}
                    {galleryData.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!galleryData.pagination.hasNextPage}
                    className="text-white hover:bg-gray-600"
                    style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-300">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-500" />
              <p>No images generated yet. Create your first image above!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expanded Image Modal */}
      <Dialog
        open={expandedImage !== null}
        onOpenChange={() => setExpandedImage(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
          <DialogHeader className="p-4 pb-2 flex-shrink-0">
            <DialogTitle className="text-white">Image Details</DialogTitle>
          </DialogHeader>
          {expandedImage && (
            <div className="px-4 pb-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Large Image */}
                <div className="relative aspect-[9/16] rounded-lg overflow-hidden max-w-sm mx-auto" style={{ backgroundColor: '#212223' }}>
                  <img
                    src={expandedImage.url}
                    alt={`Generated for: ${expandedImage.sentence}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Image Info */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-white">
                      Original Sentence:
                    </h4>
                    <p className="text-sm p-2 rounded text-gray-300" style={{ backgroundColor: '#212223' }}>
                      {expandedImage.sentence}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-white">
                      Generated Prompt:
                    </h4>
                    <p className="text-sm p-2 rounded text-gray-300" style={{ backgroundColor: '#212223' }}>
                      {expandedImage.prompt}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#282A2B' }}>
                  <Button
                    onClick={() =>
                      downloadGalleryImage(expandedImage.url, expandedImage.id)
                    }
                    className="flex-1 h-11 text-white"
                    style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>

                  {scenes.length > 0 && (
                    <div className="flex-1">
                      <Select
                        value=""
                        onValueChange={(sceneId) =>
                          handleAssignGalleryImageToScene(
                            expandedImage.url,
                            sceneId
                          )
                        }
                      >
                        <SelectTrigger className="h-11 text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
                          <SelectValue placeholder="Assign to Scene" />
                        </SelectTrigger>
                        <SelectContent side="top" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
                          {scenes.map((scene) => (
                            <SelectItem
                              key={scene.id}
                              value={scene.id.toString()}
                              className="text-white hover:bg-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                <span>Scene {scene.id}</span>
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
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
