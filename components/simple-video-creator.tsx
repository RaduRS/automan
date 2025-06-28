"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface SceneData {
  id: number;
  text: string;
  imageUrl: string;
  voiceUrl: string;
}

interface SimpleVideoCreatorProps {
  scenes: SceneData[];
  onVideoCreated: (videoUrl: string) => void;
}

export function SimpleVideoCreator({
  scenes,
  onVideoCreated,
}: SimpleVideoCreatorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getAudioDuration = (audioUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = document.createElement("audio");
      audio.addEventListener("loadedmetadata", () => {
        resolve(audio.duration || 5);
      });
      audio.addEventListener("error", () => {
        resolve(5); // Default fallback
      });
      audio.src = audioUrl;
    });
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        // If CORS fails, try without crossOrigin
        const img2 = new Image();
        img2.onload = () => resolve(img2);
        img2.onerror = reject;
        img2.src = src;
      };
      img.src = src;
    });
  };

  const createVideo = useCallback(async () => {
    if (!scenes || scenes.length === 0 || !canvasRef.current) return;

    setIsCreating(true);
    setProgress(0);
    setCurrentStep("Preparing canvas...");

    // Check for continuous audio data in localStorage
    let continuousAudio: {
      audioUrl: string;
      sceneTimings: Array<{
        sceneIndex: number;
        startTime: number;
        endTime: number;
        text: string;
      }>;
      totalDuration: number;
    } | null = null;

    try {
      const storedContinuousAudio = localStorage.getItem("continuousAudioData");
      if (storedContinuousAudio) {
        continuousAudio = JSON.parse(storedContinuousAudio);

        setCurrentStep("Using continuous audio with AI-powered timings...");
      }
    } catch {
      console.log("No continuous audio found, using individual scene audio");
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Set TikTok dimensions
      canvas.width = 1080;
      canvas.height = 1920;

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("video/webm")) {
        throw new Error("Video recording not supported in this browser");
      }

      // Create audio context for mixing all scene audio
      const audioContext = new AudioContext();

      // Resume audio context if it's suspended (required in some browsers)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const audioDestination = audioContext.createMediaStreamDestination();

      // Prepare MediaRecorder with both video and audio
      const videoStream = canvas.captureStream(30); // 30 FPS
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);

      // Try MP4 first for better TikTok compatibility with high-quality audio
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/mp4; codecs="avc1.42E01E"', // H.264 baseline
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 320000, // High-quality audio: 320kbps (CD quality)
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      setCurrentStep("Loading images and audio...");
      setProgress(10);

      // Load continuous audio buffer if available
      let continuousAudioBuffer: AudioBuffer | null = null;
      if (
        continuousAudio &&
        continuousAudio.sceneTimings.length === scenes.length
      ) {
        try {
          const audioResponse = await fetch(continuousAudio.audioUrl);
          const arrayBuffer = await audioResponse.arrayBuffer();
          continuousAudioBuffer = await audioContext.decodeAudioData(
            arrayBuffer
          );
        } catch (error) {
          console.error("Failed to load continuous audio:", error);
        }
      }

      // Load all images, audio, and get durations
      const sceneData: Array<{
        image: HTMLImageElement;
        duration: number;
        audioBuffer?: AudioBuffer;
      }> = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        try {
          // Only load individual audio if not using continuous audio
          const shouldLoadIndividualAudio =
            !continuousAudioBuffer && scene.voiceUrl;

          const [image, duration] = await Promise.all([
            loadImage(scene.imageUrl),
            shouldLoadIndividualAudio
              ? getAudioDuration(scene.voiceUrl)
              : Promise.resolve(5), // Default 5s when using continuous
          ]);

          // Load audio buffer for Web Audio API (only if not using continuous audio)
          let audioBuffer: AudioBuffer | undefined;
          if (shouldLoadIndividualAudio) {
            try {
              const audioResponse = await fetch(scene.voiceUrl);
              const arrayBuffer = await audioResponse.arrayBuffer();
              audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            } catch (audioError) {
              console.error(
                `Failed to load audio for scene ${i + 1}:`,
                audioError
              );
            }
          }

          sceneData.push({ image, duration, audioBuffer });
          setProgress(10 + (i / scenes.length) * 30);
        } catch (error) {
          console.error(`Failed to load scene ${i + 1}:`, error);
          // Create a fallback colored rectangle
          const fallbackCanvas = document.createElement("canvas");
          fallbackCanvas.width = 1080;
          fallbackCanvas.height = 1920;
          const fallbackCtx = fallbackCanvas.getContext("2d");
          if (fallbackCtx) {
            fallbackCtx.fillStyle = "#333";
            fallbackCtx.fillRect(0, 0, 1080, 1920);
            fallbackCtx.fillStyle = "#fff";
            fallbackCtx.font = "48px Arial";
            fallbackCtx.textAlign = "center";
            fallbackCtx.fillText(`Scene ${i + 1}`, 540, 960);
          }
          const fallbackImg = new Image();
          fallbackImg.src = fallbackCanvas.toDataURL();
          sceneData.push({ image: fallbackImg, duration: 5 });
        }
      }

      setCurrentStep("Recording video...");
      setProgress(50);

      return new Promise<void>((resolve, reject) => {
        mediaRecorder.onstop = () => {
          clearTimeout(safetyTimeout);
          setCurrentStep("Processing video data...");
          setProgress(98);

          if (chunks.length === 0) {
            setCurrentStep("Error: No video data recorded");
            return;
          }

          const blob = new Blob(chunks, { type: "video/webm" });

          if (blob.size === 0) {
            setCurrentStep("Error: Video file is empty");
            return;
          }

          const videoUrl = URL.createObjectURL(blob);

          setCurrentStep("Video ready! Download starting...");
          setProgress(100);

          // Complete the process
          setTimeout(() => {
            onVideoCreated(videoUrl);
            resolve();

            // Reset progress bar after successful completion
            setTimeout(() => {
              setIsCreating(false);
              setProgress(0);
              setCurrentStep("");
            }, 1000);
          }, 1000);
        };

        mediaRecorder.onerror = () => {
          setCurrentStep("Recording failed");
          reject(new Error("Recording failed"));
        };

        // Add a safety timeout for long videos
        const safetyTimeout = setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }, 300000); // 5 minutes safety timeout

        // Start recording
        try {
          mediaRecorder.start(100); // Record in 100ms chunks
        } catch (error) {
          setCurrentStep("Failed to start recording");
          clearTimeout(safetyTimeout);
          reject(error);
          return;
        }

        // Calculate scene durations - use continuous audio timings if available
        let sceneDurationsInFrames: number[];
        let totalDuration: number;

        if (
          continuousAudio &&
          continuousAudio.sceneTimings.length === scenes.length
        ) {
          // Use precise timings from Deepgram transcription
          sceneDurationsInFrames = continuousAudio.sceneTimings.map(
            (timing) => {
              const sceneDuration = timing.endTime - timing.startTime;
              return Math.ceil(sceneDuration * 30); // Convert to frames (30fps)
            }
          );

          // Use exact total duration from continuous audio
          totalDuration = continuousAudio.totalDuration;
        } else {
          // Fallback to individual scene durations
          sceneDurationsInFrames = sceneData.map((scene) => {
            return Math.ceil(scene.duration * 30); // Convert to frames (30fps)
          });

          const totalFrames = sceneDurationsInFrames.reduce(
            (sum, frames) => sum + frames,
            0
          );
          totalDuration = totalFrames / 30; // Convert frames back to seconds
        }

        let currentFrame = 0;
        let sceneIndex = 0;
        let sceneStartFrame = 0;
        let currentAudioSource: AudioBufferSourceNode | null = null;
        let continuousAudioSource: AudioBufferSourceNode | null = null;

        // Use high-precision timing to prevent drift
        const animationStartTime = audioContext.currentTime;

        // Start continuous audio if available
        if (continuousAudioBuffer) {
          continuousAudioSource = audioContext.createBufferSource();
          continuousAudioSource.buffer = continuousAudioBuffer;
          continuousAudioSource.connect(audioDestination);
          continuousAudioSource.start(audioContext.currentTime);
        }

        // Play audio for the current scene (fallback for individual scene audio)
        const playSceneAudio = (scene: (typeof sceneData)[0]) => {
          if (!continuousAudioSource && scene.audioBuffer) {
            const source = audioContext.createBufferSource();
            source.buffer = scene.audioBuffer;
            source.connect(audioDestination);
            source.start(audioContext.currentTime);
            return source;
          }
          return null;
        };

        const animate = () => {
          try {
            // Check MediaRecorder state periodically
            if (currentFrame % 90 === 0) {
              // Every 3 seconds (90 frames at 30fps)
              if (mediaRecorder.state !== "recording") {
                throw new Error("MediaRecorder stopped recording unexpectedly");
              }
            }

            if (sceneIndex >= sceneData.length) {
              setCurrentStep("Finalizing video...");
              setProgress(95);
              // Stop any remaining audio
              if (currentAudioSource) {
                currentAudioSource.stop();
              }
              if (continuousAudioSource) {
                continuousAudioSource.stop();
              }
              audioContext.close();
              mediaRecorder.stop();
              return;
            }

            const scene = sceneData[sceneIndex];
            if (!scene) {
              throw new Error(`Scene ${sceneIndex} is undefined`);
            }

            // Use EXACT same logic as Remotion for perfect sync
            // Use precise audio context time instead of frame-based calculation to prevent drift
            const currentTimeInSeconds = continuousAudio
              ? audioContext.currentTime - animationStartTime
              : currentFrame / 30;
            let currentSceneIndex = 0;
            let sceneProgress: number;

            if (
              continuousAudio &&
              continuousAudio.sceneTimings.length === scenes.length
            ) {
              // Use continuous audio timing data for perfect sync (SAME AS REMOTION)
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
                for (
                  let i = continuousAudio.sceneTimings.length - 1;
                  i >= 0;
                  i--
                ) {
                  if (
                    currentTimeInSeconds >=
                    continuousAudio.sceneTimings[i].startTime
                  ) {
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

              // Calculate progress within the current scene (SAME AS REMOTION)
              const timing = continuousAudio.sceneTimings[currentSceneIndex];
              const sceneStartTime = timing.startTime;
              const sceneDuration = timing.endTime - timing.startTime;
              const timeInScene = currentTimeInSeconds - sceneStartTime;
              sceneProgress = Math.min(
                Math.max(timeInScene / sceneDuration, 0),
                1
              );
            } else {
              // Fallback to frame-based calculations (original logic)
              const sceneFrameDuration = sceneDurationsInFrames[sceneIndex];
              const frameInScene = currentFrame - sceneStartFrame;
              sceneProgress = Math.min(frameInScene / sceneFrameDuration, 1);
              currentSceneIndex = sceneIndex; // Keep existing scene index logic for fallback
            }

            // Update sceneIndex to match the detected scene
            if (currentSceneIndex !== sceneIndex) {
              sceneIndex = currentSceneIndex;
              sceneStartFrame = currentFrame; // Reset for any remaining frame-based logic
            }

            // Start audio for new scene (only for individual scene audio, not continuous)
            if (!continuousAudioSource && scene.audioBuffer) {
              const frameInScene = currentFrame - sceneStartFrame;
              if (frameInScene === 0) {
                currentAudioSource = playSceneAudio(scene);
              }
            }

            // Clear canvas with black background
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Fixed zoom at 1.2x
            const zoom = 1.2;

            // Smooth continuous pan that flows between scenes (SAME AS REMOTION)
            // Calculate global progress across all scenes for fluid movement
            let globalProgress = 0;
            if (
              continuousAudio &&
              continuousAudio.sceneTimings.length === scenes.length
            ) {
              globalProgress =
                currentTimeInSeconds / continuousAudio.totalDuration;
            } else {
              // Fallback for individual audio
              const totalFrames = sceneDurationsInFrames.reduce(
                (sum, dur) => sum + dur,
                0
              );
              globalProgress = currentFrame / totalFrames;
            }

            // Create a continuous sine wave movement that flows smoothly across scenes
            // This ensures no static moments and smooth transitions between scenes
            const waveProgress = globalProgress * scenes.length; // Scale to number of scenes
            const yOffset = Math.sin(waveProgress * Math.PI) * 150; // Smooth wave motion ±150px

            // Calculate fade transition between scenes (simplified to avoid flashing)
            let currentSceneOpacity = 1;
            let previousSceneData = null;
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
                previousSceneData = sceneData[currentSceneIndex - 1];
                previousSceneOpacity = 1 - currentSceneOpacity;
              }
            }

            // Calculate image dimensions to fit canvas while maintaining aspect ratio
            const imgAspect = scene.image.width / scene.image.height;
            const canvasAspect = canvas.width / canvas.height;

            let drawWidth, drawHeight;
            if (imgAspect > canvasAspect) {
              // Image is wider than canvas
              drawHeight = canvas.height * zoom;
              drawWidth = drawHeight * imgAspect;
            } else {
              // Image is taller than canvas
              drawWidth = canvas.width * zoom;
              drawHeight = drawWidth / imgAspect;
            }

            const x = (canvas.width - drawWidth) / 2;
            const y = (canvas.height - drawHeight) / 2 + yOffset;

            // Draw previous scene for fade transition
            if (previousSceneData && previousSceneOpacity > 0) {
              ctx.globalAlpha = previousSceneOpacity;
              ctx.drawImage(
                previousSceneData.image,
                x,
                y,
                drawWidth,
                drawHeight
              );
            }

            // Draw current scene with fade
            ctx.globalAlpha = currentSceneOpacity;
            ctx.drawImage(scene.image, x, y, drawWidth, drawHeight);

            // Reset alpha for other drawing operations
            ctx.globalAlpha = 1;

            // Update progress with more granular tracking
            const currentTime = currentFrame / 30; // Convert frame to time for progress
            const recordingProgress = 50 + (currentTime / totalDuration) * 40; // 50-90%
            setProgress(Math.min(recordingProgress, 90));

            // Always show detailed progress for current scene
            const scenePercentage = Math.round(sceneProgress * 100);
            setCurrentStep(
              `Recording scene ${sceneIndex + 1} of ${
                sceneData.length
              } (${scenePercentage}%)...`
            );

            currentFrame++; // Increment frame counter

            // Check if we've reached the end of the video based on time, not scene index
            const videoComplete = continuousAudio
              ? currentTimeInSeconds >= continuousAudio.totalDuration
              : sceneIndex >= sceneData.length;

            if (!videoComplete) {
              setTimeout(animate, 1000 / 30); // 30 FPS
            } else {
              setTimeout(() => {
                setCurrentStep("Finalizing video...");
                setProgress(95);
                if (currentAudioSource) {
                  currentAudioSource.stop();
                }
                if (continuousAudioSource) {
                  continuousAudioSource.stop();
                }
                audioContext.close();
                mediaRecorder.stop();
              }, 500); // Give a bit of buffer
            }
          } catch (animationError) {
            setCurrentStep(
              `Animation error: ${
                animationError instanceof Error
                  ? animationError.message
                  : "Unknown animation error"
              }`
            );
          }
        };

        // Start animation
        try {
          animate();
        } catch (error) {
          setCurrentStep("Animation failed");
          reject(error);
        }
      });
    } catch (error) {
      setCurrentStep(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      // Progress bar stays visible until the video is successfully created
    }
  }, [scenes, onVideoCreated]);

  return (
    <div className="space-y-4">
      <Button
        onClick={createVideo}
        disabled={isCreating || !scenes || scenes.length === 0}
        className="w-full"
      >
        {isCreating ? "Creating Video..." : "Create Video"}
      </Button>

      {isCreating && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600 text-center">{currentStep}</p>
        </div>
      )}

      {/* Hidden canvas for video creation */}
      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
        width={1080}
        height={1920}
      />
    </div>
  );
}
