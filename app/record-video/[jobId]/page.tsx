"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Download, Upload } from "lucide-react";
import { createClient } from "@anam-ai/js-sdk";

interface JobData {
  id: string;
  job_title: string;
  openai_script: string;
  anam_session_token: string;
  anam_persona_id: string;
  status: string;
}

export default function RecordVideoPage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [anamClient, setAnamClient] = useState<unknown>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  // Define fetchJobData outside useEffect to avoid dependency issues
  // eslint-disable-next-line react-hooks/exhaustive-deps

  async function fetchJobData() {
    try {
      const response = await fetch(`/api/anam-video-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const result = await response.json();
      if (result.success) {
        setJob({
          id: jobId,
          job_title: result.data.title,
          openai_script: result.data.script,
          anam_session_token: result.data.sessionToken,
          anam_persona_id: result.data.personaId,
          status: "video_generated",
        });
        initializeAnamClient(result.data.sessionToken, result.data.personaId);
      }
    } catch (error) {
      console.error("Failed to fetch job data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function initializeAnamClient(sessionToken: string, personaId: string) {
    try {
      const client = createClient(sessionToken, {
        personaId: personaId,
      });
      setAnamClient(client);
    } catch (error) {
      console.error("Failed to initialize Anam client:", error);
    }
  }

  async function requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  }

  async function startAvatarStream() {
    if (!anamClient || !videoRef.current) return;

    try {
      // Request microphone permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        alert(
          "Microphone access is required for the avatar to work. Please grant permission and try again."
        );
        return;
      }

      // Create audio element for Anam BEFORE streaming
      let audioElement = document.getElementById(
        "avatar-audio"
      ) as HTMLAudioElement;
      if (!audioElement) {
        audioElement = document.createElement("audio");
        audioElement.id = "avatar-audio";
        audioElement.autoplay = true;
        audioElement.style.display = "none"; // Hide the audio element
        document.body.appendChild(audioElement);
      }

      // Now start streaming to both video and audio elements
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (anamClient as any).streamToVideoAndAudioElements(
        videoRef.current.id,
        "avatar-audio"
      );

      console.log("✅ Avatar stream started successfully");
    } catch (error) {
      console.error("Failed to start avatar stream:", error);
      if (
        error instanceof Error &&
        error.message.includes("Permission denied")
      ) {
        alert(
          "Please grant microphone permission to use the avatar. Check your browser's address bar for permission requests."
        );
      }
    }
  }

  async function startRecording() {
    if (!videoRef.current) return;

    try {
      // Get the video stream from the avatar
      const stream = videoRef.current.srcObject as MediaStream;
      if (!stream) {
        // If no stream, we need to capture the video element itself
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;

        // This is a fallback - ideally we'd capture the stream directly
        alert("Please start the avatar stream first, then try recording");
        return;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setVideoBlob(blob);

        // Show recorded video
        if (recordedVideoRef.current) {
          recordedVideoRef.current.src = URL.createObjectURL(blob);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);

      // Trigger the avatar to speak the script using talk command
      if (anamClient && job?.openai_script) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (anamClient as any).talk(job.openai_script);
          console.log("✅ Script sent to avatar via talk command");
        } catch (error) {
          console.error("❌ Failed to send script to avatar:", error);
        }
      }
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }

  function stopRecording() {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  }

  function deliverScript() {
    if (!anamClient || !job?.openai_script) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (anamClient as any).talk(job.openai_script);
      console.log("✅ Script delivered to avatar");
      alert("Script sent to avatar! The avatar should start speaking now.");
    } catch (error) {
      console.error("❌ Failed to deliver script:", error);
      alert("Failed to deliver script. Check console for details.");
    }
  }

  async function uploadToCloudinary() {
    if (!videoBlob) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", videoBlob, "avatar-video.webm");
      formData.append("upload_preset", "your_upload_preset"); // You'll need to set this in Cloudinary
      formData.append("folder", "avatar_videos");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();
      if (result.secure_url) {
        setUploadedUrl(result.secure_url);

        // Update job with video URL
        await fetch(`/api/update-video-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            videoUrl: result.secure_url,
          }),
        });
      }
    } catch (error) {
      console.error("Failed to upload video:", error);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            Loading job data...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center text-red-500">
            Job not found or no Anam session available
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Job Info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{job.job_title}</CardTitle>
              <Badge variant="default">Ready for Recording</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Generated Script:</h3>
                <div className="bg-muted p-4 rounded text-sm">
                  {job.openai_script}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Video */}
        <Card>
          <CardHeader>
            <CardTitle>Live Avatar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <video
                ref={videoRef}
                id="avatar-video"
                className="w-full max-w-lg mx-auto bg-black rounded"
                autoPlay
                muted
                playsInline
              />
              <div className="flex gap-2 justify-center flex-wrap">
                <Button onClick={startAvatarStream} disabled={!anamClient}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Avatar
                </Button>
                <Button
                  onClick={deliverScript}
                  disabled={!anamClient}
                  variant="outline"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Deliver Script
                </Button>
                <Button
                  onClick={recording ? stopRecording : startRecording}
                  variant={recording ? "destructive" : "default"}
                  disabled={!anamClient}
                >
                  {recording ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recorded Video */}
        {videoBlob && (
          <Card>
            <CardHeader>
              <CardTitle>Recorded Video</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <video
                  ref={recordedVideoRef}
                  className="w-full max-w-lg mx-auto bg-black rounded"
                  controls
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={uploadToCloudinary}
                    disabled={uploading || !!uploadedUrl}
                  >
                    {uploading ? (
                      "Uploading..."
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload to Cloudinary
                      </>
                    )}
                  </Button>
                  {uploadedUrl && (
                    <Button variant="outline" asChild>
                      <a
                        href={uploadedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View Uploaded Video
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {uploadedUrl && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-green-600 font-semibold">
                ✅ Video uploaded successfully!
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                URL: {uploadedUrl}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
