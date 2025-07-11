"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSceneReset } from "@/contexts/SceneResetContext";
import { Loader2, XCircle, FileText } from "lucide-react";

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
  { key: "generating_script", label: "Generating Script", progress: 80 },
  { key: "script_generated", label: "Script Ready", progress: 100 },
];

export function TikTokForm() {
  const { resetSceneData } = useSceneReset();

  const [urls, setUrls] = useState({
    url1: "",
    url2: "",
    url3: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urls.url1.trim()) {
      setError("Primary TikTok URL is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setJobStatus(null);

    // Reset all scene manager data when submitting a new job
    resetSceneData();

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
            status.status === "script_generated" ||
            status.status === "error"
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

  const handleReset = () => {
    setUrls({ url1: "", url2: "", url3: "" });
    setJobStatus(null);
    setError(null);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit TikTok URLs</CardTitle>
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
          <CardContent className="pt-6">
            {getCurrentStep() && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {getCurrentStep()!.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getCurrentStep()!.progress}%
                  </span>
                </div>
                <Progress
                  value={getCurrentStep()!.progress}
                  className="w-full"
                />
              </div>
            )}

            {/* Content Display - Only show when script is generated */}
            {jobStatus.openai_script && jobStatus.openai_script.trim() && (
              <div className="space-y-4 mt-6">
                {/* Title Display */}
                {jobStatus.job_title && jobStatus.job_title.trim() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="text-xs text-blue-600 font-medium mb-2">
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
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="text-xs text-green-600 font-medium mb-2">
                        DESCRIPTION
                      </div>
                      <div className="text-sm text-green-900">
                        {jobStatus.job_description}
                      </div>
                    </div>
                  )}

                {/* Script Display */}
                <div className="bg-muted/50 rounded-md p-4 max-h-48 overflow-y-auto">
                  <div className="text-xs text-muted-foreground font-medium mb-2">
                    SCRIPT
                  </div>
                  <pre className="text-sm whitespace-pre-wrap text-foreground">
                    {jobStatus.openai_script}
                  </pre>
                </div>

                {/* Go to Scene Manager Button - Show when script is complete */}
                {jobStatus.status === "script_generated" && (
                  <div className="pt-4">
                    <Button
                      onClick={() => (window.location.href = "/scene-manager")}
                      className="w-full"
                      size="lg"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Go to Scene Manager
                    </Button>
                  </div>
                )}
              </div>
            )}

            {jobStatus.status === "error" && jobStatus.error_message && (
              <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{jobStatus.error_message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
