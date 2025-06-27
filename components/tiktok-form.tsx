"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  FileText,
  Images,
  Download,
} from "lucide-react";

interface JobStatus {
  id: string;
  status:
    | "submitted"
    | "downloading"
    | "transcribing"
    | "transcription_complete"
    | "generating_script"
    | "script_generated"
    | "generating_video"
    | "video_ready"
    | "scheduled_to_socialbee"
    | "error";
  error_message?: string;
  openai_script?: string | null;
  job_title?: string | null;
  job_description?: string | null;
  job_hashtags?: string | null;
  created_at: string;
}

const STATUS_STEPS = [
  { key: "submitted", label: "Submitted", progress: 10 },
  { key: "downloading", label: "Downloading TikToks", progress: 20 },
  { key: "transcribing", label: "Transcribing Audio", progress: 40 },
  {
    key: "transcription_complete",
    label: "Transcription Complete",
    progress: 50,
  },
  { key: "generating_script", label: "Generating Script", progress: 60 },
  { key: "script_generated", label: "Script Ready", progress: 70 },
  { key: "generating_video", label: "Creating Video", progress: 80 },
  { key: "video_ready", label: "Video Ready", progress: 90 },
  {
    key: "scheduled_to_socialbee",
    label: "Scheduled to SocialBee",
    progress: 100,
  },
];

export function TikTokForm() {
  const [urls, setUrls] = useState({
    url1: "",
    url2: "",
    url3: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ url: string; prompt: string }>
  >([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urls.url1.trim()) {
      setError("Primary TikTok URL is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setJobStatus(null);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tiktok_url_1: urls.url1.trim(),
          tiktok_url_2: urls.url2.trim() || null,
          tiktok_url_3: urls.url3.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setJobStatus({
          id: data.jobId,
          status: "submitted",
          created_at: new Date().toISOString(),
        });
        // Start polling for status updates
        startStatusPolling(data.jobId);
      } else {
        throw new Error(data.error || "Failed to submit job");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startStatusPolling = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/job-status/${jobId}`);
        if (response.ok) {
          const status = await response.json();
          setJobStatus(status);

          // Stop polling if job is complete or failed
          if (
            status.status === "scheduled_to_socialbee" ||
            status.status === "error" ||
            status.status === "video_ready" ||
            status.status === "script_generated"
          ) {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("Failed to fetch job status:", err);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup interval after 5 minutes to prevent infinite polling
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const getCurrentStep = () => {
    if (!jobStatus) return null;
    return (
      STATUS_STEPS.find((step) => step.key === jobStatus.status) ||
      STATUS_STEPS[0]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled_to_socialbee":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleReset = () => {
    setUrls({ url1: "", url2: "", url3: "" });
    setJobStatus(null);
    setError(null);
    setIsSubmitting(false);
    setGeneratedImages([]);
    setIsCopied(false);
  };

  const generateImages = async () => {
    if (!jobStatus?.id) return;

    setIsGeneratingImages(true);
    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId: jobStatus.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedImages(data.data.images);
      } else {
        const errorData = await response.json();
        setError(`Image generation failed: ${errorData.error}`);
      }
    } catch {
      setError("Failed to generate images");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `generated-image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download image");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
      } catch {
        // Silent failure
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="py-4">Submit TikTok URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url1">Primary TikTok URL *</Label>
              <Input
                id="url1"
                type="url"
                value={urls.url1}
                onChange={(e) =>
                  setUrls((prev) => ({ ...prev, url1: e.target.value }))
                }
                placeholder="https://www.tiktok.com/@username/video/..."
                disabled={isSubmitting || !!jobStatus}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url2">Additional TikTok URL (Optional)</Label>
              <Input
                id="url2"
                type="url"
                value={urls.url2}
                onChange={(e) =>
                  setUrls((prev) => ({ ...prev, url2: e.target.value }))
                }
                placeholder="https://www.tiktok.com/@username/video/..."
                disabled={isSubmitting || !!jobStatus}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url3">Additional TikTok URL (Optional)</Label>
              <Input
                id="url3"
                type="url"
                value={urls.url3}
                onChange={(e) =>
                  setUrls((prev) => ({ ...prev, url3: e.target.value }))
                }
                placeholder="https://www.tiktok.com/@username/video/..."
                disabled={isSubmitting || !!jobStatus}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting || !!jobStatus}
                className="flex-1"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>

              {jobStatus && (
                <Button type="button" variant="outline" onClick={handleReset}>
                  New Job
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Job Status Display */}
      {jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(jobStatus.status)}
              Job Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Job ID: {jobStatus.id}
              </span>
              <span className="text-sm text-muted-foreground">
                Status: {jobStatus.status.replace("_", " ").toUpperCase()}
              </span>
            </div>

            {getCurrentStep() && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{getCurrentStep()!.label}</span>
                  <span className="text-sm">{getCurrentStep()!.progress}%</span>
                </div>
                <Progress
                  value={getCurrentStep()!.progress}
                  className="w-full"
                />
              </div>
            )}

            {/* AI Script Display */}
            {jobStatus.openai_script && jobStatus.openai_script.trim() && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      Generated Content
                    </span>
                  </div>
                  <Button
                    variant={isCopied ? "default" : "outline"}
                    size="sm"
                    onClick={() => copyToClipboard(jobStatus.openai_script!)}
                    className="h-8"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {isCopied ? "Copied!" : "Copy Script"}
                  </Button>
                </div>

                {/* Title Display */}
                {jobStatus.job_title && jobStatus.job_title.trim() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="text-xs text-blue-600 font-medium mb-1">
                      TITLE
                    </div>
                    <div className="text-sm font-semibold text-blue-900">
                      {jobStatus.job_title}
                    </div>
                  </div>
                )}

                {/* Description Display */}
                {jobStatus.job_description &&
                  jobStatus.job_description.trim() && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="text-xs text-green-600 font-medium mb-1">
                        DESCRIPTION
                      </div>
                      <div className="text-sm text-green-900">
                        {jobStatus.job_description}
                      </div>
                    </div>
                  )}

                {/* Hashtags Display */}
                {jobStatus.job_hashtags && jobStatus.job_hashtags.trim() && (
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                    <div className="text-xs text-purple-600 font-medium mb-1">
                      HASHTAGS
                    </div>
                    <div className="text-sm font-mono text-purple-900">
                      {jobStatus.job_hashtags}
                    </div>
                  </div>
                )}

                {/* Script Display */}
                <div className="bg-muted/50 rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="text-xs text-muted-foreground font-medium mb-2">
                    SCRIPT
                  </div>
                  <pre className="text-sm whitespace-pre-wrap text-foreground">
                    {jobStatus.openai_script}
                  </pre>
                </div>
              </div>
            )}

            {/* Image Generation Section */}
            {jobStatus.openai_script && jobStatus.openai_script.trim() && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Images className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">
                      AI Generated Images
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateImages}
                    disabled={isGeneratingImages}
                    className="h-8"
                  >
                    {isGeneratingImages && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {isGeneratingImages ? "Generating..." : "Generate Images"}
                  </Button>
                </div>

                {generatedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {generatedImages.map((image, index) => (
                      <div key={index} className="space-y-2">
                        <div className="relative aspect-[9/16] bg-muted rounded-md overflow-hidden">
                          <img
                            src={image.url}
                            alt={`Generated image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {image.prompt}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadImage(image.url, index)}
                          className="w-full"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {jobStatus.status === "error" && jobStatus.error_message && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{jobStatus.error_message}</AlertDescription>
              </Alert>
            )}

            {jobStatus.status === "scheduled_to_socialbee" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your content has been processed and scheduled! The
                  AI-generated script and video are ready for multi-platform
                  posting.
                </AlertDescription>
              </Alert>
            )}

            {jobStatus.status === "script_generated" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  AI script generated successfully! Your content is ready for
                  video creation. Check the dashboard to view the generated
                  script.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
