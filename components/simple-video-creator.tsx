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

      // Try MP4 first for better TikTok compatibility
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/mp4; codecs="avc1.42E01E"', // H.264 baseline
        videoBitsPerSecond: 2500000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      setCurrentStep("Loading images and audio...");
      setProgress(10);

      // Load all images, audio, and get durations
      const sceneData: Array<{
        image: HTMLImageElement;
        duration: number;
        audioBuffer?: AudioBuffer;
      }> = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        try {
          const [image, duration] = await Promise.all([
            loadImage(scene.imageUrl),
            getAudioDuration(scene.voiceUrl),
          ]);

          // Load audio buffer for Web Audio API
          let audioBuffer: AudioBuffer | undefined;
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

        const totalDuration = sceneData.reduce(
          (sum, scene) => sum + scene.duration,
          0
        );
        let currentFrame = 0;
        let sceneIndex = 0;
        let sceneStartFrame = 0;
        let currentAudioSource: AudioBufferSourceNode | null = null;

        // Calculate scene durations in frames for precise timing
        const sceneDurationsInFrames = sceneData.map((scene) =>
          Math.ceil(scene.duration * 30)
        );

        // Play audio for the current scene
        const playSceneAudio = (scene: (typeof sceneData)[0]) => {
          if (scene.audioBuffer) {
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
              audioContext.close();
              mediaRecorder.stop();
              return;
            }

            const scene = sceneData[sceneIndex];
            if (!scene) {
              throw new Error(`Scene ${sceneIndex} is undefined`);
            }

            const sceneFrameDuration = sceneDurationsInFrames[sceneIndex];
            const frameInScene = currentFrame - sceneStartFrame;
            const sceneProgress = Math.min(
              frameInScene / sceneFrameDuration,
              1
            );

            // Start audio for new scene
            if (frameInScene === 0 && scene.audioBuffer) {
              currentAudioSource = playSceneAudio(scene);
            }

            // Clear canvas with black background
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Fixed zoom at 1.2x
            const zoom = 1.2;

            // Alternating pan directions: odd scenes (0,2,4...) bottom→top, even scenes (1,3,5...) top→bottom
            const isBottomToTop = sceneIndex % 2 === 0;
            const yOffset = isBottomToTop
              ? 100 - sceneProgress * 200 // Bottom to top: start at +200, end at -200
              : -100 + sceneProgress * 200; // Top to bottom: start at -200, end at +200

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

            // Draw image with effects
            ctx.drawImage(scene.image, x, y, drawWidth, drawHeight);

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

            // Check if scene is complete
            if (frameInScene >= sceneFrameDuration) {
              // Stop current audio
              if (currentAudioSource) {
                currentAudioSource.stop();
                currentAudioSource = null;
              }
              sceneIndex++;
              sceneStartFrame = currentFrame;
            }

            if (sceneIndex < sceneData.length) {
              setTimeout(animate, 1000 / 30); // 30 FPS
            } else {
              setTimeout(() => {
                setCurrentStep("Finalizing video...");
                setProgress(95);
                if (currentAudioSource) {
                  currentAudioSource.stop();
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
