"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  includeTextOverlays: boolean; // New prop to control text overlay visibility
  continuousAudio?: {
    audioUrl: string;
    sceneTimings: Array<{
      sceneIndex: number;
      startTime: number;
      endTime: number;
      text: string;
    }>;
    totalDuration: number;
  } | null;
}> = ({ scenes, sceneDurations, includeTextOverlays, continuousAudio }) => {
  const frame = useCurrentFrame();

  // Use AI-detected timings if continuous audio is available, otherwise use individual durations
  let actualSceneDurations: number[];
  let sceneStartTimes: number[];

  if (
    continuousAudio &&
    continuousAudio.sceneTimings.length === scenes.length
  ) {
    // Use precise AI-detected scene timings
    actualSceneDurations = continuousAudio.sceneTimings.map((timing) => {
      const sceneDuration = timing.endTime - timing.startTime;
      return Math.ceil(sceneDuration * 30); // Convert to frames (30fps)
    });

    sceneStartTimes = continuousAudio.sceneTimings.map((timing) => {
      return Math.ceil(timing.startTime * 30); // Convert to frames
    });
  } else {
    // Fallback to individual scene durations
    actualSceneDurations = sceneDurations;
    sceneStartTimes = sceneDurations.reduce((acc, duration, index) => {
      if (index === 0) {
        acc.push(0);
      } else {
        acc.push(acc[index - 1] + sceneDurations[index - 1]);
      }
      return acc;
    }, [] as number[]);
  }

  // Find which scene should be currently playing
  const currentTimeInSeconds = frame / 30; // Convert frame to seconds
  let currentSceneIndex = 0;

  if (
    continuousAudio &&
    continuousAudio.sceneTimings.length === scenes.length
  ) {
    // Use continuous audio timing data for perfect sync
    // Find the correct scene based on current time
    let foundScene = false;
    for (let i = 0; i < continuousAudio.sceneTimings.length; i++) {
      const timing = continuousAudio.sceneTimings[i];
      if (
        currentTimeInSeconds >= timing.startTime &&
        currentTimeInSeconds < timing.endTime
      ) {
        currentSceneIndex = i;
        foundScene = true;
        break;
      }
    }

    // If no exact match found (can happen at boundaries), find the closest scene
    if (!foundScene) {
      // Find the scene we should be in based on the closest timing
      for (let i = continuousAudio.sceneTimings.length - 1; i >= 0; i--) {
        if (currentTimeInSeconds >= continuousAudio.sceneTimings[i].startTime) {
          currentSceneIndex = i;
          break;
        }
      }
    }

    // Ensure we don't go out of bounds
    currentSceneIndex = Math.min(
      Math.max(currentSceneIndex, 0),
      scenes.length - 1
    );
  } else {
    // Fallback to frame-based calculation
    for (let i = 0; i < sceneStartTimes.length; i++) {
      if (frame >= sceneStartTimes[i]) {
        currentSceneIndex = i;
      } else {
        break;
      }
    }
  }

  const currentScene = scenes[currentSceneIndex];
  if (!currentScene) return null;

  // Calculate scene progress for text highlighting
  let sceneProgress = 0;

  if (
    continuousAudio &&
    continuousAudio.sceneTimings.length === scenes.length
  ) {
    const timing = continuousAudio.sceneTimings[currentSceneIndex];
    const timeInScene = currentTimeInSeconds - timing.startTime;
    const sceneDuration = timing.endTime - timing.startTime;
    sceneProgress = Math.min(Math.max(timeInScene / sceneDuration, 0), 1);
  } else {
    // Fallback to frame-based calculation
    const sceneStartFrame = sceneStartTimes[currentSceneIndex] || 0;
    const sceneDurationFrames = actualSceneDurations[currentSceneIndex] || 150;
    const frameInScene = frame - sceneStartFrame;
    sceneProgress = Math.min(
      Math.max(frameInScene / sceneDurationFrames, 0),
      1
    );
  }

  // NEW: Calculate current visible text batch and word-by-word highlighting
  const words = currentScene.text.split(" ");
  const wordsPerBatch = 6; // Show 6 words per batch
  const totalWords = words.length;

  // Add a small time offset to make text highlighting slightly ahead of audio for better sync
  const syncOffset = 0.1; // 100ms ahead - adjust this value to fine-tune sync
  let adjustedSceneProgress = sceneProgress;

  if (
    continuousAudio &&
    continuousAudio.sceneTimings.length === scenes.length
  ) {
    const timing = continuousAudio.sceneTimings[currentSceneIndex];
    const sceneDuration = timing.endTime - timing.startTime;
    const timeInScene = currentTimeInSeconds - timing.startTime;
    const adjustedTimeInScene = timeInScene + syncOffset;
    adjustedSceneProgress = Math.min(
      Math.max(adjustedTimeInScene / sceneDuration, 0),
      1
    );
  } else {
    // For frame-based calculation, add equivalent frames (30fps * 0.1s = 3 frames)
    const sceneStartFrame = sceneStartTimes[currentSceneIndex] || 0;
    const sceneDurationFrames = actualSceneDurations[currentSceneIndex] || 150;
    const frameInScene = frame - sceneStartFrame + 3; // Add 3 frames (0.1s at 30fps)
    adjustedSceneProgress = Math.min(
      Math.max(frameInScene / sceneDurationFrames, 0),
      1
    );
  }

  // Calculate which word we're currently on based on adjusted scene progress
  const currentWordIndex = Math.floor(adjustedSceneProgress * totalWords);

  // Calculate which batch we're in and the words for that batch
  const currentBatchIndex = Math.floor(currentWordIndex / wordsPerBatch);
  const batchStart = currentBatchIndex * wordsPerBatch;
  const batchEnd = Math.min(batchStart + wordsPerBatch, totalWords);
  const visibleWords = words.slice(batchStart, batchEnd);

  // Calculate which words in the current batch should be highlighted
  const wordsHighlightedInBatch = Math.max(0, currentWordIndex - batchStart);

  // We'll use global progress instead of individual scene progress for smooth movement

  // Smooth continuous pan that flows between scenes
  // Calculate global progress across all scenes for fluid movement
  let globalProgress = 0;
  if (
    continuousAudio &&
    continuousAudio.sceneTimings.length === scenes.length
  ) {
    globalProgress = currentTimeInSeconds / continuousAudio.totalDuration;
  } else {
    // Fallback for individual audio
    const totalFrames = actualSceneDurations.reduce((sum, dur) => sum + dur, 0);
    globalProgress = frame / totalFrames;
  }

  // Create a continuous sine wave movement that flows smoothly across scenes
  // This ensures no static moments and smooth transitions between scenes
  const waveProgress = globalProgress * scenes.length; // Scale to number of scenes
  const yOffset = Math.sin(waveProgress * Math.PI) * 150; // Smooth wave motion ±150px

  // Calculate fade transition between scenes (simplified to avoid flashing)
  let currentSceneOpacity = 1;
  let previousScene = null;
  let previousSceneOpacity = 0;

  if (
    continuousAudio &&
    continuousAudio.sceneTimings.length === scenes.length
  ) {
    const timing = continuousAudio.sceneTimings[currentSceneIndex];
    const sceneStartTime = timing.startTime;
    const timeInScene = currentTimeInSeconds - sceneStartTime;

    const fadeInDuration = 0.3; // 0.3 second fade in only

    // Only fade in at scene start (no fade out to avoid flashing)
    if (timeInScene < fadeInDuration && currentSceneIndex > 0) {
      currentSceneOpacity = timeInScene / fadeInDuration;
      previousScene = scenes[currentSceneIndex - 1];
      previousSceneOpacity = 1 - currentSceneOpacity;
    }
  }

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
      {/* Previous scene (for fade transitions) */}
      {previousScene && (
        <img
          src={previousScene.imageUrl}
          style={{
            width: "130%",
            height: "130%",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, calc(-50% + ${yOffset}px))`,
            objectFit: "cover",
            objectPosition: "center",
            opacity: previousSceneOpacity,
            zIndex: 1,
          }}
          alt="Previous Scene"
        />
      )}
      {/* Current scene */}
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
          opacity: currentSceneOpacity,
          zIndex: 2,
        }}
        alt="Scene"
      />
      {/* Text Overlay - Centered */}
      {includeTextOverlays && (
        <div
          style={{
            position: "absolute",
            top: "60%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: "85%", // Reduced width to prevent cutoff
            zIndex: 10,
            textAlign: "center",
            lineHeight: "1.3",
            // Soft pink shadow for entire sentence container
            filter:
              "drop-shadow(0 4px 12px rgba(0,0,0,0.6)) drop-shadow(0 0 20px rgba(252,119,239,0.3))",
          }}
        >
          {(() => {
            // Convert to uppercase and break into lines (max 2 lines)
            const upperCaseWords = visibleWords.map((word) =>
              word.toUpperCase()
            );

            // HARD CLAMP to exactly 2 lines maximum
            const lines: string[][] = [];

            // Always force exactly 2 lines or less
            if (upperCaseWords.length <= 3) {
              // 3 or fewer words stay on one line
              lines.push(upperCaseWords);
            } else {
              // Split into exactly 2 lines
              const half = Math.ceil(upperCaseWords.length / 2);
              lines.push(upperCaseWords.slice(0, half));
              lines.push(upperCaseWords.slice(half));
            }

            // HARD LIMIT: Never allow more than 2 lines
            lines.splice(2); // Remove any lines beyond index 1 (keeping only 0 and 1)

            let wordsDrawnSoFar = 0;

            return lines.map((lineWords, lineIndex) => (
              <div
                key={lineIndex}
                style={{
                  marginBottom: lineIndex < lines.length - 1 ? "16px" : "0", // More space between lines
                }}
              >
                {lineWords.map((word, wordIndex) => {
                  const globalWordIndex = wordsDrawnSoFar + wordIndex;

                  // Determine if this word should be highlighted
                  // Keep last word highlighted when audio finishes
                  const currentWordBeingSpoken = Math.floor(
                    wordsHighlightedInBatch
                  );
                  const isLastWordWhenFinished =
                    adjustedSceneProgress >= 0.95 &&
                    globalWordIndex === totalWords - 1;
                  const isCurrentWord =
                    globalWordIndex === currentWordBeingSpoken ||
                    isLastWordWhenFinished;

                  // Update counter after processing
                  if (wordIndex === lineWords.length - 1) {
                    wordsDrawnSoFar += lineWords.length;
                  }

                  return (
                    <span
                      key={`${batchStart + globalWordIndex}-${word}`}
                      style={{
                        fontSize: "68px", // Reduced font size to fit better in frame
                        fontWeight: "950", // Maximum bold weight
                        color: isCurrentWord ? "#FE78EE" : "#FFFFFF", // New pink color for current word, white for others
                        display: "inline-block",
                        margin: "0 18px 0 0", // Much more space between words for better readability
                        transition: "transform 0.025s ease-out", // Lightning fast 25ms animation
                        transform: isCurrentWord ? "scale(0.93)" : "scale(1)", // Very subtle shrink to 0.93 when highlighted
                        fontFamily:
                          "'Impact', 'Arial Black', 'Franklin Gothic Medium', sans-serif", // Even bolder font
                        textTransform: "uppercase",
                        WebkitTextStroke: "4px #000000", // Even thicker black outline
                        letterSpacing: "0px", // Reset letter spacing for better readability
                        transformOrigin: "center",
                        // Additional properties for maximum boldness
                        textShadow:
                          "2px 2px 0px #000000, -2px -2px 0px #000000, 2px -2px 0px #000000, -2px 2px 0px #000000",
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}{" "}
      {/* End of includeTextOverlays condition */}
      {/* Audio - use continuous audio with precise timings if available */}
      {continuousAudio &&
      continuousAudio.sceneTimings.length === scenes.length ? (
        // Single continuous audio track
        <Audio src={continuousAudio.audioUrl} />
      ) : (
        // Fallback to individual scene audio using Sequence
        scenes
          .filter((scene) => scene.voiceUrl)
          .map((scene, index) => (
            <Sequence
              key={scene.id}
              from={sceneStartTimes[index]}
              durationInFrames={actualSceneDurations[index]}
            >
              <Audio src={scene.voiceUrl} />
            </Sequence>
          ))
      )}
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
  jobId: string;
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

  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageScene, setSelectedImageScene] = useState<number | null>(
    null
  );
  const [sceneDurations, setSceneDurations] = useState<number[]>([]);

  // State for editing scenes
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [staleAudioAlert, setStaleAudioAlert] = useState(false);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState<number | null>(
    null
  );

  // Text overlay toggle state
  const [includeTextOverlays, setIncludeTextOverlays] = useState(true);

  // Continuous audio with precise timing
  const [continuousAudio, setContinuousAudio] = useState<{
    audioUrl: string;
    sceneTimings: Array<{
      sceneIndex: number;
      startTime: number;
      endTime: number;
      text: string;
    }>;
    totalDuration: number;
  } | null>(null);
  const [isGeneratingContinuousAudio, setIsGeneratingContinuousAudio] =
    useState(false);

  // Audio player state management
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRefs = useRef<{ [key: number]: ReactPlayer | null }>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea when editing starts
  useEffect(() => {
    if (editingSceneId && textareaRef.current) {
      const textarea = textareaRef.current;
      setTimeout(() => {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }, 0);
    }
  }, [editingSceneId, editText]);

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate scene durations when scenes with audio are updated
  useEffect(() => {
    const calculateDurations = async () => {
      // If continuous audio is available, use those timings
      if (
        continuousAudio &&
        continuousAudio.sceneTimings.length === scenes.length
      ) {
        const durations = continuousAudio.sceneTimings.map((timing) => {
          const sceneDuration = timing.endTime - timing.startTime;
          return Math.ceil(sceneDuration * 30); // Convert to frames (30fps)
        });
        setSceneDurations(durations);
        return;
      }

      // Fallback to individual scene audio durations
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
  }, [scenes, continuousAudio]);

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

  // Functions to manage stale audio state persistence
  const getStaleAudioStorageKey = (scriptHash: string) => {
    return `automan_stale_audio_${scriptHash}`;
  };

  const saveStaleAudioState = (scriptHash: string, isStale: boolean) => {
    try {
      localStorage.setItem(
        getStaleAudioStorageKey(scriptHash),
        JSON.stringify(isStale)
      );
    } catch (error) {
      console.error("Failed to save stale audio state:", error);
    }
  };

  const loadStaleAudioState = (scriptHash: string): boolean => {
    try {
      const stored = localStorage.getItem(getStaleAudioStorageKey(scriptHash));
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      console.error("Failed to load stale audio state:", error);
      return false;
    }
  };

  const clearStaleAudioState = (scriptHash: string) => {
    try {
      localStorage.removeItem(getStaleAudioStorageKey(scriptHash));
    } catch (error) {
      console.error("Failed to clear stale audio state:", error);
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

      // Check if this is a completely new script (different jobId, not just script content)
      // Only consider it a new script if we already had script data and the jobId is different
      // Don't reset if this is the first time loading (scriptData is null)
      const isNewScript = scriptData && scriptData.jobId && scriptData.jobId !== data.jobId;

      // Only reset if we have a completely new jobId (new generation from TikTok form)
      if (isNewScript) {
        console.log(
          "🔄 New script jobId detected, resetting all scene manager state"
        );

        // Clear all localStorage for all scripts (since we have a new generation)
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("automan_scenes_") ||
            key.startsWith("automan_stale_audio_")
          ) {
            localStorage.removeItem(key);
          }
        });

        // Clear continuous audio
        setContinuousAudio(null);
        localStorage.removeItem("continuousAudioData");

        // Reset UI state
        setStaleAudioAlert(false);
        setCurrentlyPlaying(null);
        setIsPlaying(false);
        setEditingSceneId(null);
        setEditText("");
        setSelectedImageUrl(null);
        setSelectedImageScene(null);
        setRegeneratingSceneId(null);

        // Stop any currently playing audio
        Object.values(audioRefs.current).forEach((player) => {
          if (player) {
            player.getInternalPlayer()?.pause?.();
          }
        });
        audioRefs.current = {};
      }

      setScriptData({
        jobId: data.jobId,
        title: data.title || "Generated Script",
        script: data.script,
        scenes: scenes,
        description: data.description || "Generated script",
        hashtags: data.hashtags || "#Motivation",
      });

      // Create hash for this script to use as storage key
      const scriptHash = hashScript(data.script);

      // Try to load existing scene data from localStorage (unless it's a brand new script)
      const storedScenes = !isNewScript
        ? loadScenesFromStorage(scriptHash)
        : null;

      // Initialize scenes with IDs and generation states
      const scenesWithIds = scenes.map((text: string, index: number) => {
        const baseScene = {
          id: index + 1,
          text,
          isGeneratingVoice: false,
          isGeneratingImage: false,
        };

        // If we have stored data for this scene and it's not a new script, restore it
        if (!isNewScript) {
          const storedScene = storedScenes?.find((s) => s.id === index + 1);
          if (storedScene) {
            return {
              ...baseScene,
              voiceUrl: storedScene.voiceUrl,
              imageUrl: storedScene.imageUrl,
            };
          }
        }

        return baseScene;
      });

      setScenes(scenesWithIds);

      // Only load continuous audio data if not a new script
      if (!isNewScript) {
        try {
          // Remove old continuous audio timing data (was storing base64)
          localStorage.removeItem("continuousAudioTimings");

          const storedAudioData = localStorage.getItem("continuousAudioData");
          if (storedAudioData) {
            const audioData = JSON.parse(storedAudioData);
            // Verify the audio URL is a Cloudinary URL and has required data
            if (
              audioData.audioUrl &&
              audioData.audioUrl.includes("cloudinary.com") &&
              audioData.sceneTimings &&
              audioData.totalDuration
            ) {
              setContinuousAudio(audioData);
            } else {
              // Clean up invalid data
              localStorage.removeItem("continuousAudioData");
            }
          }
        } catch (error) {
          console.error(
            "Failed to load continuous audio from localStorage:",
            error
          );
          // Clean up on error
          localStorage.removeItem("continuousAudioData");
        }

        // Restore stale audio state (only if not a new script)
        const storedStaleAudioState = loadStaleAudioState(scriptHash);
        setStaleAudioAlert(storedStaleAudioState);

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load script");
    } finally {
      setLoading(false);
    }
  };

  const generateAllImages = async () => {
    setIsGeneratingAllImages(true);

    try {
      // Mark all scenes as generating images
      setScenes((prev) =>
        prev.map((scene) => ({ ...scene, isGeneratingImage: true }))
      );

      console.log("🚀 Starting concurrent image generation for all scenes...");

      // Create concurrent image generation promises with staggered delays
      const imagePromises = scenes.map(async (scene, index) => {
        // Stagger requests by 800ms to avoid overwhelming the API
        const delay = index * 800;

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        console.log(`🎨 Starting image generation for scene ${index + 1}...`);

        try {
          const response = await fetch("/api/generate-sentence-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sentence: scene.text,
              scriptContext: scriptData?.script,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Scene ${index + 1} image generated successfully`);

            // Update this specific scene immediately as it completes
            setScenes((prev) => {
              const updatedScenes = prev.map((s, i) =>
                i === index
                  ? {
                      ...s,
                      isGeneratingImage: false,
                      imageUrl: data.image.url,
                    }
                  : s
              );

              // Save to localStorage after each successful generation
              if (scriptData) {
                const scriptHash = hashScript(scriptData.script);
                saveScenesToStorage(scriptHash, updatedScenes);
              }

              return updatedScenes;
            });

            return { success: true, index, imageUrl: data.image.url };
          } else {
            throw new Error(`Failed to generate image for scene ${index + 1}`);
          }
        } catch (sceneError) {
          console.error(
            `❌ Error generating image for scene ${index + 1}:`,
            sceneError
          );

          // Mark this scene as failed immediately
          setScenes((prev) =>
            prev.map((s, i) =>
              i === index ? { ...s, isGeneratingImage: false } : s
            )
          );

          return { success: false, index, error: sceneError };
        }
      });

      // Wait for all images to complete (successful or failed)
      const results = await Promise.allSettled(imagePromises);

      // Count results
      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const failed = results.filter(
        (r) =>
          r.status === "rejected" ||
          (r.status === "fulfilled" && !r.value.success)
      ).length;

      console.log(
        `🎯 Image generation complete: ${successful} successful, ${failed} failed`
      );

      if (failed > 0) {
        setError(
          `${failed} image(s) failed to generate. Check console for details.`
        );
      }
    } catch (error) {
      console.error("Error in concurrent image generation:", error);
      setError("Failed to generate images");
      setScenes((prev) =>
        prev.map((scene) => ({ ...scene, isGeneratingImage: false }))
      );
    } finally {
      setIsGeneratingAllImages(false);
    }
  };

  const generateContinuousAudio = async () => {
    if (!scriptData) return;

    setIsGeneratingContinuousAudio(true);
    try {
      const fullScript = scenes.map((scene) => scene.text).join(" ");
      const sceneTexts = scenes.map((scene) => scene.text);

      const response = await fetch("/api/generate-full-script-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullScript,
          scenes: sceneTexts,
          title: scriptData.title,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const continuousAudioData = {
          audioUrl: data.audioUrl,
          sceneTimings: data.sceneTimings,
          totalDuration: data.totalDuration,
        };
        setContinuousAudio(continuousAudioData);

        // Save all data to localStorage including Cloudinary URL (now it's just a URL string, not base64)
        const audioData = {
          audioUrl: data.audioUrl, // Cloudinary URL - small string
          sceneTimings: data.sceneTimings,
          totalDuration: data.totalDuration,
        };
        localStorage.setItem("continuousAudioData", JSON.stringify(audioData));

        // Clear stale audio alert since we have fresh audio
        setStaleAudioAlert(false);
        const scriptHash = hashScript(scriptData.script);
        clearStaleAudioState(scriptHash);
      } else {
        console.error("Failed to generate continuous audio");
        setError("Failed to generate continuous audio with scene timings");
      }
    } catch (error) {
      console.error("Error generating continuous audio:", error);
      setError("Failed to generate continuous audio");
    } finally {
      setIsGeneratingContinuousAudio(false);
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

    // Clear continuous audio
    setContinuousAudio(null);
    localStorage.removeItem("continuousAudioData");
  };

  // Functions for editing scene text
  const startEditingScene = (sceneId: number, currentText: string) => {
    setEditingSceneId(sceneId);
    setEditText(currentText);
  };

  const cancelEditing = () => {
    setEditingSceneId(null);
    setEditText("");
  };

  const saveSceneText = async (sceneId: number) => {
    try {
      const response = await fetch("/api/update-scene", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sceneId: sceneId,
          text: editText,
          jobId: scriptData?.jobId,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update local state
        setScenes((prev) =>
          prev.map((scene) =>
            scene.id === sceneId ? { ...scene, text: editText } : scene
          )
        );

        // Update scriptData with new full script if returned
        if (data.updatedFullScript && scriptData) {
          setScriptData((prev) =>
            prev
              ? {
                  ...prev,
                  script: data.updatedFullScript,
                }
              : null
          );
        }

        // Show stale audio alert and save to localStorage with correct hash
        setStaleAudioAlert(true);
        if (scriptData) {
          const newScriptHash = data.updatedFullScript
            ? hashScript(data.updatedFullScript)
            : hashScript(scriptData.script);
          console.log(`💾 Saving stale audio state for hash: ${newScriptHash}`);
          saveStaleAudioState(newScriptHash, true);
        }

        // Cancel editing
        setEditingSceneId(null);
        setEditText("");
      } else {
        setError("Failed to save scene text");
      }
    } catch (error) {
      console.error("Error saving scene text:", error);
      setError("Failed to save scene text");
    }
  };

  const regenerateSceneText = async (sceneId: number) => {
    if (!scriptData) return;

    console.log(`🔄 Starting regeneration for scene ${sceneId}`);
    setRegeneratingSceneId(sceneId);

    try {
      const currentScene = scenes.find((scene) => scene.id === sceneId);
      if (!currentScene) {
        console.error(`❌ Scene ${sceneId} not found`);
        setError("Scene not found");
        return;
      }

      console.log(
        `📝 Regenerating text: "${currentScene.text.substring(0, 50)}..."`
      );

      const requestBody = {
        sceneId: sceneId,
        currentText: currentScene.text,
        fullScript: scriptData.script,
        jobId: scriptData.jobId,
      };

      console.log(`🚀 Sending request:`, requestBody);

      const response = await fetch("/api/regenerate-scene-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Regeneration successful:`, data);

        // Update local scene state with regenerated text
        setScenes((prev) =>
          prev.map((scene) =>
            scene.id === sceneId
              ? { ...scene, text: data.regeneratedText }
              : scene
          )
        );

        // Update scriptData with new full script
        setScriptData((prev) =>
          prev
            ? {
                ...prev,
                script: data.updatedFullScript,
              }
            : null
        );

        // Show stale audio alert since text changed and save to localStorage
        setStaleAudioAlert(true);
        if (scriptData) {
          const newScriptHash = hashScript(data.updatedFullScript);
          saveStaleAudioState(newScriptHash, true);
        }

        // Clear any previous errors
        setError(null);
      } else {
        const errorText = await response.text();
        console.error(`❌ API error response:`, errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText}` };
        }

        setError(
          errorData.error ||
            `Failed to regenerate scene text (${response.status})`
        );
      }
    } catch (error) {
      console.error("❌ Error regenerating scene text:", error);
      setError("Failed to regenerate scene text. Please try again.");
    } finally {
      console.log(`🏁 Regeneration finished for scene ${sceneId}`);
      setRegeneratingSceneId(null);
    }
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
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Master Controls - {scenes.length} scenes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 mb-3">
                  <Button
                    onClick={generateAllImages}
                    disabled={isGeneratingAllImages || allImagesGenerated}
                    variant="outline"
                    className="flex-1"
                  >
                    {isGeneratingAllImages && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="mr-2 h-4 w-4" />
                    {allImagesGenerated
                      ? "All Images Generated"
                      : "Generate All Images"}
                  </Button>
                  <Button
                    onClick={generateContinuousAudio}
                    disabled={isGeneratingContinuousAudio || !!continuousAudio}
                    variant="outline"
                    className="flex-1"
                  >
                    {isGeneratingContinuousAudio && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Play className="mr-2 h-4 w-4" />
                    {continuousAudio
                      ? "Voice Generated"
                      : isGeneratingContinuousAudio
                      ? "Generating Voice..."
                      : "Generate Voice"}
                  </Button>
                  <Button
                    onClick={resetAllImages}
                    disabled={
                      isGeneratingAllImages || !scenes.some((s) => s.imageUrl)
                    }
                    size="sm"
                    className="flex-1"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear Images
                  </Button>
                  <Button
                    onClick={resetAllContent}
                    disabled={
                      isGeneratingAllImages ||
                      (!scenes.some((s) => s.voiceUrl || s.imageUrl) &&
                        !continuousAudio)
                    }
                    size="sm"
                    className="flex-1"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Reset All
                  </Button>
                </div>

                {/* Continuous Audio Generation */}
                <div className="mb-3"></div>

                {/* Continuous Audio Player */}
                {continuousAudio && (
                  <div className="mb-3">
                    <div className="flex items-center gap-3">
                      <CustomAudioPlayer
                        sceneId={-1} // Special ID for continuous audio
                        audioUrl={continuousAudio.audioUrl}
                      />
                      <Button
                        onClick={generateContinuousAudio}
                        disabled={isGeneratingContinuousAudio}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                      >
                        {isGeneratingContinuousAudio ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stale Audio Alert - positioned under audio player, only show if audio exists */}
                {staleAudioAlert &&
                  (continuousAudio ||
                    scenes.some((scene) => scene.voiceUrl)) && (
                    <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-3 mb-3 rounded">
                      <div className="flex justify-between items-center">
                        <div className="flex">
                          <div>
                            <p className="text-sm">
                              <strong>Audio may be out of sync!</strong> You
                              have edited scene text. The audio was generated
                              from the original text and may no longer match.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setStaleAudioAlert(false);
                            if (scriptData) {
                              const scriptHash = hashScript(scriptData.script);
                              saveStaleAudioState(scriptHash, false);
                            }
                          }}
                          className="text-orange-500 hover:text-orange-700 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Individual Scenes - 3 Column Grid */}
            <div className="grid grid-cols-3 gap-3">
              {scenes.map((scene, index) => (
                <Card key={scene.id}>
                  <CardContent>
                    {/* Scene header */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-base text-muted-foreground font-bold">
                        Scene {scene.id}
                      </h3>
                    </div>

                    {/* Image and Text - 60/40 split */}
                    <div className="flex gap-3 mb-3">
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
                        {editingSceneId === scene.id ? (
                          <div className="space-y-2">
                            <textarea
                              ref={textareaRef}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full text-sm bg-muted/30 py-2 px-2 rounded-lg leading-relaxed resize-none border border-gray-300 focus:border-blue-500 focus:outline-none"
                              placeholder="Edit scene text..."
                              style={{
                                minHeight: "80px",
                                height: "auto",
                                overflowY: "hidden",
                              }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height =
                                  target.scrollHeight + "px";
                              }}
                            />
                            <div className="flex gap-1">
                              <Button
                                onClick={() => saveSceneText(scene.id)}
                                size="sm"
                                className="h-6 px-2 text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p
                              className="text-sm bg-muted/30 py-2 px-2 rounded-lg leading-relaxed cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                startEditingScene(scene.id, scene.text)
                              }
                              title="Click to edit"
                            >
                              {scene.text}
                            </p>

                            {/* Regenerate button */}
                            <Button
                              onClick={() => regenerateSceneText(scene.id)}
                              disabled={regeneratingSceneId === scene.id}
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs"
                            >
                              {regeneratingSceneId === scene.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Regenerating...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Regenerate
                                </>
                              )}
                            </Button>
                          </div>
                        )}
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
            {(allVoicesGenerated || continuousAudio) &&
            allImagesGenerated &&
            scenes.length > 1 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    {scriptData.title}
                  </CardTitle>

                  {/* Text overlay toggle */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="include-text-overlays"
                      checked={includeTextOverlays}
                      onCheckedChange={(checked) =>
                        setIncludeTextOverlays(checked === true)
                      }
                    />
                    <label
                      htmlFor="include-text-overlays"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include text overlays in video
                    </label>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-black aspect-[9/16] rounded-lg overflow-hidden mb-4">
                    <Player
                      component={MasterVideoComposition}
                      inputProps={{
                        scenes: (() => {
                          const filteredScenes = scenes
                            .filter(
                              (scene) =>
                                scene.imageUrl &&
                                (scene.voiceUrl || continuousAudio)
                            )
                            .map((scene) => ({
                              id: scene.id,
                              text: scene.text,
                              imageUrl: scene.imageUrl!,
                              voiceUrl: scene.voiceUrl || "", // Empty string when using continuous audio
                            }));

                          return filteredScenes;
                        })(),
                        sceneDurations: (() => {
                          const durations =
                            sceneDurations.length > 0
                              ? sceneDurations
                              : scenes
                                  .filter(
                                    (scene) =>
                                      scene.imageUrl &&
                                      (scene.voiceUrl || continuousAudio)
                                  )
                                  .map(() => 150);

                          return durations;
                        })(),
                        continuousAudio: continuousAudio,
                        includeTextOverlays: includeTextOverlays,
                      }}
                      durationInFrames={
                        (continuousAudio &&
                        continuousAudio.sceneTimings.length === scenes.length
                          ? Math.ceil(continuousAudio.totalDuration * 30) // Use continuous audio total duration
                          : sceneDurations.length > 0
                          ? sceneDurations.reduce(
                              (sum, duration) => sum + duration,
                              0
                            )
                          : scenes.filter(
                              (scene) =>
                                scene.imageUrl &&
                                (scene.voiceUrl || continuousAudio)
                            ).length * 150) + 30 // Add 1 second (30 frames) to show last image longer
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
                    scenes={(() => {
                      const filteredScenes = scenes
                        .filter(
                          (scene) =>
                            scene.imageUrl &&
                            (scene.voiceUrl || continuousAudio)
                        )
                        .map((scene) => ({
                          id: scene.id,
                          text: scene.text,
                          imageUrl: scene.imageUrl!,
                          voiceUrl: scene.voiceUrl || "", // Empty string when using continuous audio
                        }));

                      return filteredScenes;
                    })()}
                    onVideoCreated={handleVideoCreated}
                    includeTextOverlays={includeTextOverlays}
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
                    Complete all scenes and audio to create your video
                  </p>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Audio:</span>
                      <span
                        className={
                          continuousAudio || scenes.every((s) => s.voiceUrl)
                            ? "text-green-600"
                            : "text-orange-500"
                        }
                      >
                        {continuousAudio ? "✅ Done" : " ❌ Missing"}
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

                    {!(continuousAudio || allVoicesGenerated) ||
                    !allImagesGenerated ? (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-orange-700">
                        <p className="text-xs font-medium mb-1">
                          Missing content detected
                        </p>
                        <p className="text-xs">
                          {!continuousAudio &&
                          !allVoicesGenerated &&
                          !allImagesGenerated
                            ? "Generate continuous audio and images to create video"
                            : !allImagesGenerated
                            ? "Generate missing images to create video"
                            : "Generate continuous audio or individual voices to create video"}
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
                className="w-full h-auto rounded max-h-[65vh] object-contain mb-3"
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
