"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Play,
  Image,
  Loader2,
  Maximize2,
  Trash2,
  RefreshCw,
  Video,
  Pause,
} from "lucide-react";
import ReactPlayer from "react-player";
import Link from "next/link";
import { Player } from "@remotion/player";
import { useCurrentFrame, Audio, Sequence } from "remotion";
import { SimpleVideoCreator } from "@/components/simple-video-creator";
// import { SimpleVideoCreator } from "@/components/simple-video-creator";

// Utility function to get audio duration from URL
const getAudioDuration = (audioUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.addEventListener("loadedmetadata", () => {
      resolve(audio.duration || 5); // Default to 5 seconds if can't determine
    });
    audio.addEventListener("error", () => {
      resolve(5); // Default to 5 seconds on error
    });
    audio.src = audioUrl;
  });
};

// Master composition that stitches all scenes together with dynamic audio durations
const MasterVideoComposition: React.FC<{
  scenes: Array<{
    id: number;
    text: string;
    imageUrl: string;
    voiceUrl: string;
  }>;
  sceneDurations: number[]; // Duration in frames for each scene
}> = ({ scenes, sceneDurations }) => {
  const frame = useCurrentFrame();

  // Calculate cumulative start times for each scene
  const sceneStartTimes = sceneDurations.reduce((acc, duration, index) => {
    if (index === 0) {
      acc.push(0);
    } else {
      acc.push(acc[index - 1] + sceneDurations[index - 1]);
    }
    return acc;
  }, [] as number[]);

  // Find which scene should be currently playing
  let currentSceneIndex = 0;
  for (let i = 0; i < sceneStartTimes.length; i++) {
    if (frame >= sceneStartTimes[i]) {
      currentSceneIndex = i;
    } else {
      break;
    }
  }

  const currentScene = scenes[currentSceneIndex];
  if (!currentScene) return null;

  // Calculate progress within the current scene
  const sceneStartFrame = sceneStartTimes[currentSceneIndex];
  const sceneDuration = sceneDurations[currentSceneIndex];
  const frameInScene = frame - sceneStartFrame;
  const progress = Math.min(frameInScene / sceneDuration, 1);

  // Alternating pan directions: odd scenes (0,2,4...) bottom→top, even scenes (1,3,5...) top→bottom
  const isBottomToTop = currentSceneIndex % 2 === 0;
  const yOffset = isBottomToTop
    ? 100 - progress * 200 // Bottom to top: start at +100, end at -100
    : -100 + progress * 200; // Top to bottom: start at -100, end at +100

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img
        src={currentScene.imageUrl}
        style={{
          width: "130%",
          height: "130%",
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, calc(-50% + ${yOffset}px))`,
          objectFit: "cover",
          objectPosition: "center",
        }}
        alt="Scene"
      />

      {/* Sequential Audio using Sequence for proper timing */}
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={sceneStartTimes[index]}
          durationInFrames={sceneDurations[index]}
        >
          <Audio src={scene.voiceUrl} />
        </Sequence>
      ))}
    </div>
  );
};

interface SceneData {
  id: number;
  text: string;
  voiceUrl?: string;
  imageUrl?: string;
  isGeneratingVoice: boolean;
  isGeneratingImage: boolean;
}

interface ScriptData {
  title: string;
  script: string;
  scenes: string[];
  description: string;
  hashtags: string;
}

export default function SceneManagerPage() {
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingAllVoices, setIsGeneratingAllVoices] = useState(false);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageScene, setSelectedImageScene] = useState<number | null>(
    null
  );
  const [sceneDurations, setSceneDurations] = useState<number[]>([]);

  // Audio player state management
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRefs = useRef<{ [key: number]: ReactPlayer | null }>({});

  // Function to handle audio playback - stops all others and plays the selected one
  const handleAudioPlay = (sceneId: number) => {
    // Stop all currently playing audio
    Object.values(audioRefs.current).forEach((player) => {
      if (player) {
        // ReactPlayer doesn't have a direct stop method, so we pause and seek to 0
        player.getInternalPlayer()?.pause?.();
      }
    });

    // If clicking the same audio that's playing, pause it
    if (currentlyPlaying === sceneId && isPlaying) {
      setIsPlaying(false);
      setCurrentlyPlaying(null);
      return;
    }

    // Play the selected audio
    const targetPlayer = audioRefs.current[sceneId];
    if (targetPlayer) {
      targetPlayer.getInternalPlayer()?.play?.();
      setCurrentlyPlaying(sceneId);
      setIsPlaying(true);
    }
  };

  // Handle when audio ends
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentlyPlaying(null);
  };

  // Custom Audio Player Component
  const CustomAudioPlayer = ({
    sceneId,
    audioUrl,
  }: {
    sceneId: number;
    audioUrl: string;
  }) => {
    const isCurrentlyPlaying = currentlyPlaying === sceneId && isPlaying;
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    return (
      <div className="flex items-center gap-2 flex-1">
        <Button
          onClick={() => handleAudioPlay(sceneId)}
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-gray-100"
        >
          {isCurrentlyPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <span className="text-sm text-gray-600 min-w-[30px]">
          {duration > 0
            ? `${Math.floor((duration - currentTime) / 60)}:${String(
                Math.floor((duration - currentTime) % 60)
              ).padStart(2, "0")}`
            : "0:00"}
        </span>

        {/* Custom Audio Progress Bar */}
        <div className="flex-1 flex items-center bg-transparent px-2 py-2">
          <div className="w-full relative">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all duration-200 ease-out"
                style={{
                  width:
                    duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => {
                const newTime = parseFloat(e.target.value);
                const player = audioRefs.current[sceneId];
                if (player) {
                  player.seekTo(newTime, "seconds");
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Hidden ReactPlayer - no controls, no visual */}
        <div className="hidden">
          <ReactPlayer
            ref={(player) => {
              audioRefs.current[sceneId] = player;
            }}
            url={audioUrl}
            width="0"
            height="0"
            controls={false}
            playing={isCurrentlyPlaying}
            onDuration={setDuration}
            onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
            onEnded={handleAudioEnded}
            onPause={() => {
              if (currentlyPlaying === sceneId) {
                setIsPlaying(false);
              }
            }}
            onPlay={() => {
              // Stop all other players when this one starts
              Object.entries(audioRefs.current).forEach(([id, player]) => {
                if (parseInt(id) !== sceneId && player) {
                  player.getInternalPlayer()?.pause?.();
                }
              });
              setCurrentlyPlaying(sceneId);
              setIsPlaying(true);
            }}
          />
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchLatestScript();
  }, []);

  // Calculate scene durations when scenes with audio are updated
  useEffect(() => {
    const calculateDurations = async () => {
      const scenesWithAudio = scenes.filter(
        (scene) => scene.voiceUrl && scene.imageUrl
      );
      if (scenesWithAudio.length === 0) return;

      const durations = await Promise.all(
        scenesWithAudio.map(async (scene) => {
          try {
            const duration = await getAudioDuration(scene.voiceUrl!);
            return Math.ceil(duration * 30); // Convert to frames (30fps)
          } catch {
            return 150; // Default 5 seconds = 150 frames
          }
        })
      );

      setSceneDurations(durations);
    };

    calculateDurations();
  }, [scenes]);

  // Handle video creation completion
  const handleVideoCreated = (videoUrl: string) => {
    // Automatically trigger download with script title
    const a = document.createElement("a");
    a.href = videoUrl;
    const safeTitle =
      scriptData?.title?.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-") ||
      "master-video";
    a.download = `${safeTitle}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper functions for localStorage persistence
  const getSceneStorageKey = (scriptHash: string) => {
    return `automan_scenes_${scriptHash}`;
  };

  const hashScript = (script: string): string => {
    // Simple hash function to create unique key for each script
    let hash = 0;
    for (let i = 0; i < script.length; i++) {
      const char = script.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  };

  const saveScenesToStorage = (scriptHash: string, scenes: SceneData[]) => {
    try {
      const sceneData = scenes.map((scene) => ({
        id: scene.id,
        text: scene.text,
        voiceUrl: scene.voiceUrl,
        imageUrl: scene.imageUrl,
      }));
      localStorage.setItem(
        getSceneStorageKey(scriptHash),
        JSON.stringify(sceneData)
      );
      console.log(`💾 Saved ${scenes.length} scenes to localStorage`);
    } catch (error) {
      console.error("Failed to save scenes to localStorage:", error);
    }
  };

  const loadScenesFromStorage = (
    scriptHash: string
  ): Partial<SceneData>[] | null => {
    try {
      const stored = localStorage.getItem(getSceneStorageKey(scriptHash));
      if (stored) {
        const sceneData = JSON.parse(stored);
        console.log(`🔄 Loaded ${sceneData.length} scenes from localStorage`);
        return sceneData;
      }
    } catch (error) {
      console.error("Failed to load scenes from localStorage:", error);
    }
    return null;
  };

  const fetchLatestScript = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/latest-script");

      if (!response.ok) {
        throw new Error("Failed to fetch latest script");
      }

      const data = await response.json();

      if (!data.script) {
        setError("No scripts found. Please generate a script first.");
        return;
      }

      const scenes = data.scenes || [];

      if (scenes.length === 0) {
        setError(
          "No scenes found. Please generate a script with scenes first."
        );
        return;
      }

      setScriptData({
        title: data.title || "Generated Script",
        script: data.script,
        scenes: scenes,
        description: data.description || "Generated script",
        hashtags: data.hashtags || "#Motivation",
      });

      // Create hash for this script to use as storage key
      const scriptHash = hashScript(data.script);

      // Try to load existing scene data from localStorage
      const storedScenes = loadScenesFromStorage(scriptHash);

      // Initialize scenes with IDs and generation states
      const scenesWithIds = scenes.map((text: string, index: number) => {
        const baseScene = {
          id: index + 1,
          text,
          isGeneratingVoice: false,
          isGeneratingImage: false,
        };

        // If we have stored data for this scene, restore it
        const storedScene = storedScenes?.find((s) => s.id === index + 1);
        if (storedScene) {
          return {
            ...baseScene,
            voiceUrl: storedScene.voiceUrl,
            imageUrl: storedScene.imageUrl,
          };
        }

        return baseScene;
      });

      setScenes(scenesWithIds);

      // Show restoration message if we loaded existing content
      const restoredVoices = scenesWithIds.filter(
        (s: SceneData) => s.voiceUrl
      ).length;
      const restoredImages = scenesWithIds.filter(
        (s: SceneData) => s.imageUrl
      ).length;
      if (restoredVoices > 0 || restoredImages > 0) {
        console.log(
          `✅ Restored ${restoredVoices} voices and ${restoredImages} images from previous session`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load script");
    } finally {
      setLoading(false);
    }
  };

  const generateAllVoices = async () => {
    setIsGeneratingAllVoices(true);

    try {
      // Mark all scenes as generating voice
      setScenes((prev) =>
        prev.map((scene) => ({ ...scene, isGeneratingVoice: true }))
      );

      // Generate voices using ElevenLabs API
      for (let i = 0; i < scenes.length; i++) {
        try {
          const response = await fetch("/api/generate-voice", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: scenes[i].text,
            }),
          });

          if (response.ok) {
            const data = await response.json();

            // Update the specific scene with the generated voice
            setScenes((prev) => {
              const updatedScenes = prev.map((scene, index) =>
                index === i
                  ? {
                      ...scene,
                      isGeneratingVoice: false,
                      voiceUrl: data.audioUrl,
                    }
                  : scene
              );

              // Save to localStorage after each successful generation
              if (scriptData) {
                const scriptHash = hashScript(scriptData.script);
                saveScenesToStorage(scriptHash, updatedScenes);
              }

              return updatedScenes;
            });
          } else {
            throw new Error(`Failed to generate voice for scene ${i + 1}`);
          }
        } catch (sceneError) {
          console.error(
            `Error generating voice for scene ${i + 1}:`,
            sceneError
          );

          // Mark this scene as failed
          setScenes((prev) =>
            prev.map((scene, index) =>
              index === i ? { ...scene, isGeneratingVoice: false } : scene
            )
          );
        }
      }
    } catch (error) {
      console.error("Error generating voices:", error);
      setError("Failed to generate voices");
      setScenes((prev) =>
        prev.map((scene) => ({ ...scene, isGeneratingVoice: false }))
      );
    } finally {
      setIsGeneratingAllVoices(false);
    }
  };

  const generateAllImages = async () => {
    setIsGeneratingAllImages(true);

    try {
      // Mark all scenes as generating images
      setScenes((prev) =>
        prev.map((scene) => ({ ...scene, isGeneratingImage: true }))
      );

      // Generate images using existing sentence-to-image API
      for (let i = 0; i < scenes.length; i++) {
        try {
          const response = await fetch("/api/generate-sentence-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sentence: scenes[i].text,
              scriptContext: scriptData?.script,
            }),
          });

          if (response.ok) {
            const data = await response.json();

            // Update the specific scene with the generated image
            setScenes((prev) => {
              const updatedScenes = prev.map((scene, index) =>
                index === i
                  ? {
                      ...scene,
                      isGeneratingImage: false,
                      imageUrl: data.image.url,
                    }
                  : scene
              );

              // Save to localStorage after each successful generation
              if (scriptData) {
                const scriptHash = hashScript(scriptData.script);
                saveScenesToStorage(scriptHash, updatedScenes);
              }

              return updatedScenes;
            });
          } else {
            throw new Error(`Failed to generate image for scene ${i + 1}`);
          }
        } catch (sceneError) {
          console.error(
            `Error generating image for scene ${i + 1}:`,
            sceneError
          );

          // Mark this scene as failed
          setScenes((prev) =>
            prev.map((scene, index) =>
              index === i ? { ...scene, isGeneratingImage: false } : scene
            )
          );
        }
      }
    } catch (error) {
      console.error("Error generating images:", error);
      setError("Failed to generate images");
      setScenes((prev) =>
        prev.map((scene) => ({ ...scene, isGeneratingImage: false }))
      );
    } finally {
      setIsGeneratingAllImages(false);
    }
  };

  const regenerateSceneVoice = async (sceneIndex: number) => {
    setScenes((prev) =>
      prev.map((scene, index) =>
        index === sceneIndex ? { ...scene, isGeneratingVoice: true } : scene
      )
    );

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: scenes[sceneIndex].text,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setScenes((prev) => {
          const updatedScenes = prev.map((scene, index) =>
            index === sceneIndex
              ? { ...scene, isGeneratingVoice: false, voiceUrl: data.audioUrl }
              : scene
          );

          // Save to localStorage after regeneration
          if (scriptData) {
            const scriptHash = hashScript(scriptData.script);
            saveScenesToStorage(scriptHash, updatedScenes);
          }

          return updatedScenes;
        });
      } else {
        throw new Error("Failed to regenerate voice");
      }
    } catch (error) {
      console.error("Error regenerating voice:", error);
      setError("Failed to regenerate voice");
      setScenes((prev) =>
        prev.map((scene, index) =>
          index === sceneIndex ? { ...scene, isGeneratingVoice: false } : scene
        )
      );
    }
  };

  const regenerateSceneImage = async (sceneIndex: number) => {
    setScenes((prev) =>
      prev.map((scene, index) =>
        index === sceneIndex ? { ...scene, isGeneratingImage: true } : scene
      )
    );

    try {
      const response = await fetch("/api/generate-sentence-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sentence: scenes[sceneIndex].text,
          scriptContext: scriptData?.script,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        setScenes((prev) => {
          const updatedScenes = prev.map((scene, index) =>
            index === sceneIndex
              ? { ...scene, isGeneratingImage: false, imageUrl: data.image.url }
              : scene
          );

          // Save to localStorage after regeneration
          if (scriptData) {
            const scriptHash = hashScript(scriptData.script);
            saveScenesToStorage(scriptHash, updatedScenes);
          }

          return updatedScenes;
        });
      } else {
        throw new Error("Failed to regenerate image");
      }
    } catch (error) {
      console.error("Error regenerating image:", error);
      setError("Failed to regenerate image");
      setScenes((prev) =>
        prev.map((scene, index) =>
          index === sceneIndex ? { ...scene, isGeneratingImage: false } : scene
        )
      );
    }
  };

  // Reset functions
  const resetAllVoices = () => {
    setScenes((prev) => {
      const updatedScenes = prev.map((scene) => ({
        ...scene,
        voiceUrl: undefined,
      }));

      // Update localStorage
      if (scriptData) {
        const scriptHash = hashScript(scriptData.script);
        saveScenesToStorage(scriptHash, updatedScenes);
      }

      return updatedScenes;
    });
    console.log("🗑️ Cleared all voices");
  };

  const resetAllImages = () => {
    setScenes((prev) => {
      const updatedScenes = prev.map((scene) => ({
        ...scene,
        imageUrl: undefined,
      }));

      // Update localStorage
      if (scriptData) {
        const scriptHash = hashScript(scriptData.script);
        saveScenesToStorage(scriptHash, updatedScenes);
      }

      return updatedScenes;
    });
    console.log("🗑️ Cleared all images");
  };

  const resetAllContent = () => {
    setScenes((prev) => {
      const updatedScenes = prev.map((scene) => ({
        ...scene,
        voiceUrl: undefined,
        imageUrl: undefined,
      }));

      // Update localStorage
      if (scriptData) {
        const scriptHash = hashScript(scriptData.script);
        saveScenesToStorage(scriptHash, updatedScenes);
      }

      return updatedScenes;
    });
    console.log("🗑️ Cleared all voices and images");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-muted-foreground">Loading latest script...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-500">
              <p className="text-lg font-semibold mb-2">Error</p>
              <p>{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!scriptData) {
    return null;
  }

  const allVoicesGenerated = scenes.every((scene) => scene.voiceUrl);
  const allImagesGenerated = scenes.every((scene) => scene.imageUrl);

  return (
    <div className="bg-background">
      {/* Two Column Layout */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Side: Scrollable Scenes */}
        <div className="flex-1 overflow-y-auto p-6 border-r">
          <div className="max-w-6xl m-auto">
            {/* Master Controls */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Master Controls - {scenes.length} scenes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={generateAllVoices}
                    disabled={isGeneratingAllVoices || allVoicesGenerated}
                    className="flex-1"
                  >
                    {isGeneratingAllVoices && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Play className="mr-2 h-4 w-4" />
                    {allVoicesGenerated
                      ? "All Voices Generated"
                      : "Generate All Voices"}
                  </Button>

                  <Button
                    onClick={generateAllImages}
                    disabled={isGeneratingAllImages || allImagesGenerated}
                    variant="outline"
                    className="flex-1"
                  >
                    {isGeneratingAllImages && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Image className="mr-2 h-4 w-4" />
                    {allImagesGenerated
                      ? "All Images Generated"
                      : "Generate All Images"}
                  </Button>
                </div>

                {/* Reset Controls */}
                <div className="flex gap-2 text-sm">
                  <Button
                    onClick={resetAllVoices}
                    disabled={
                      isGeneratingAllVoices ||
                      isGeneratingAllImages ||
                      !scenes.some((s) => s.voiceUrl)
                    }
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear Voices
                  </Button>
                  <Button
                    onClick={resetAllImages}
                    disabled={
                      isGeneratingAllVoices ||
                      isGeneratingAllImages ||
                      !scenes.some((s) => s.imageUrl)
                    }
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear Images
                  </Button>
                  <Button
                    onClick={resetAllContent}
                    disabled={
                      isGeneratingAllVoices ||
                      isGeneratingAllImages ||
                      !scenes.some((s) => s.voiceUrl || s.imageUrl)
                    }
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Reset All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Individual Scenes - 2 Column Grid */}
            <div className="grid grid-cols-3 gap-4">
              {scenes.map((scene, index) => (
                <Card key={scene.id}>
                  <CardContent>
                    {/* Scene header */}
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="font-medium text-base">
                        Scene {scene.id}
                      </h3>
                      <Badge
                        variant={
                          scene.voiceUrl && scene.imageUrl
                            ? "default"
                            : scene.voiceUrl || scene.imageUrl
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-sm px-2 py-1"
                      >
                        {scene.voiceUrl && scene.imageUrl
                          ? "Complete"
                          : scene.voiceUrl || scene.imageUrl
                          ? "Incomplete"
                          : "Pending"}
                      </Badge>
                    </div>

                    {/* Image and Text - 60/40 split */}
                    <div className="flex gap-4 mb-4">
                      {/* Left: Image - 40% */}
                      <div className="w-2/5">
                        {scene.imageUrl ? (
                          <div
                            className="aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer relative group"
                            onClick={() => {
                              setSelectedImageUrl(scene.imageUrl!);
                              setSelectedImageScene(scene.id);
                            }}
                          >
                            <img
                              src={scene.imageUrl}
                              alt={`Scene ${scene.id}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Green bullet - top left */}
                            <div className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full z-20"></div>

                            {/* Regenerate button - top right */}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent image modal from opening
                                regenerateSceneImage(index);
                              }}
                              disabled={scene.isGeneratingImage}
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white z-20"
                            >
                              {scene.isGeneratingImage ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                            </Button>

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>

                            {/* Expand icon */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Maximize2 className="h-8 w-8 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[9/16] border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center text-muted-foreground relative">
                            {scene.isGeneratingImage ? (
                              <div className="text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                <span className="text-sm">Generating...</span>
                              </div>
                            ) : (
                              <span className="text-sm">No image</span>
                            )}

                            {/* Regenerate button for no image state */}
                            <Button
                              onClick={() => regenerateSceneImage(index)}
                              disabled={scene.isGeneratingImage}
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white"
                            >
                              {scene.isGeneratingImage ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Image className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Right: Text - 60% */}
                      <div className="w-3/5">
                        <h4 className="text-sm font-medium mb-2">Scene Text</h4>
                        <p className="text-sm bg-muted/30 py-3 rounded-lg leading-relaxed h-full">
                          {scene.text}
                        </p>
                      </div>
                    </div>

                    {/* Voice Section - Full width spanning both columns */}
                    <div className="w-full">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          {scene.voiceUrl && (
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                          )}
                        </div>

                        {scene.voiceUrl ? (
                          <CustomAudioPlayer
                            sceneId={scene.id}
                            audioUrl={scene.voiceUrl}
                          />
                        ) : (
                          <div className="flex-1 flex items-center justify-center h-12 bg-transparent text-sm text-gray-600">
                            {scene.isGeneratingVoice ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                Generating...
                              </>
                            ) : (
                              "No voice"
                            )}
                          </div>
                        )}

                        <Button
                          onClick={() => regenerateSceneVoice(index)}
                          disabled={scene.isGeneratingVoice}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          {scene.isGeneratingVoice ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : scene.voiceUrl ? (
                            <RefreshCw className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Fixed Master Preview */}
        <div className="w-96 p-6 bg-muted/30">
          <div className="sticky top-6">
            {allVoicesGenerated && allImagesGenerated && scenes.length > 1 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    {scriptData.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black aspect-[9/16] rounded-lg overflow-hidden mb-4">
                    <Player
                      component={MasterVideoComposition}
                      inputProps={{
                        scenes: scenes
                          .filter((scene) => scene.voiceUrl && scene.imageUrl)
                          .map((scene) => ({
                            id: scene.id,
                            text: scene.text,
                            imageUrl: scene.imageUrl!,
                            voiceUrl: scene.voiceUrl!,
                          })),
                        sceneDurations:
                          sceneDurations.length > 0
                            ? sceneDurations
                            : scenes
                                .filter(
                                  (scene) => scene.voiceUrl && scene.imageUrl
                                )
                                .map(() => 150),
                      }}
                      durationInFrames={
                        sceneDurations.length > 0
                          ? sceneDurations.reduce(
                              (sum, duration) => sum + duration,
                              0
                            )
                          : scenes.filter(
                              (scene) => scene.voiceUrl && scene.imageUrl
                            ).length * 150
                      }
                      compositionWidth={1080}
                      compositionHeight={1920}
                      fps={30}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      controls
                      numberOfSharedAudioTags={10}
                    />
                  </div>

                  <SimpleVideoCreator
                    scenes={scenes
                      .filter((scene) => scene.voiceUrl && scene.imageUrl)
                      .map((scene) => ({
                        id: scene.id,
                        text: scene.text,
                        imageUrl: scene.imageUrl!,
                        voiceUrl: scene.voiceUrl!,
                      }))}
                    onVideoCreated={handleVideoCreated}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    Master Video Preview
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete all scenes to create your video
                  </p>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Voices:</span>
                      <span
                        className={
                          scenes.every((s) => s.voiceUrl)
                            ? "text-green-600"
                            : "text-orange-500"
                        }
                      >
                        {scenes.filter((s) => s.voiceUrl).length} /{" "}
                        {scenes.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Images:</span>
                      <span
                        className={
                          scenes.every((s) => s.imageUrl)
                            ? "text-green-600"
                            : "text-orange-500"
                        }
                      >
                        {scenes.filter((s) => s.imageUrl).length} /{" "}
                        {scenes.length}
                      </span>
                    </div>

                    {!allVoicesGenerated || !allImagesGenerated ? (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-orange-700">
                        <p className="text-xs font-medium mb-1">
                          Missing content detected
                        </p>
                        <p className="text-xs">
                          Use the ▶️ buttons next to individual scenes to
                          generate missing voices or images manually
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Image Dialog */}
      <Dialog
        open={selectedImageUrl !== null}
        onOpenChange={() => setSelectedImageUrl(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <DialogTitle>Scene {selectedImageScene}</DialogTitle>
              <Button
                onClick={() => {
                  const sceneIndex = scenes.findIndex(
                    (s) => s.id === selectedImageScene
                  );
                  if (sceneIndex !== -1) {
                    regenerateSceneImage(sceneIndex);
                  }
                }}
                disabled={
                  selectedImageScene
                    ? scenes.find((s) => s.id === selectedImageScene)
                        ?.isGeneratingImage
                    : false
                }
                variant="outline"
                size="sm"
              >
                {selectedImageScene &&
                scenes.find((s) => s.id === selectedImageScene)
                  ?.isGeneratingImage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </DialogHeader>
          {selectedImageScene && (
            <div className="px-4 pb-4">
              <img
                src={
                  scenes.find((s) => s.id === selectedImageScene)?.imageUrl ||
                  selectedImageUrl ||
                  ""
                }
                alt={`Scene ${selectedImageScene}`}
                className="w-full h-auto rounded max-h-[65vh] object-cover mb-3"
              />
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                {scenes.find((s) => s.id === selectedImageScene)?.text}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
