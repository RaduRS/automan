"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSceneReset } from "@/contexts/SceneResetContext";
import { type BrandName } from "@/lib/brand-config";
import {
  Loader2,
  XCircle,
  FileText,
  Link,
  Type,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    label: "Processing Complete",
    progress: 50,
  },
  { key: "generating_script", label: "Generating Script", progress: 80 },
  { key: "script_generated", label: "Script Ready", progress: 100 },
];

interface TikTokFormProps {
  selectedBrand: BrandName;
}

export function TikTokForm({ selectedBrand }: TikTokFormProps) {
  const { resetSceneData } = useSceneReset();

  const [inputMode, setInputMode] = useState<"tiktok" | "text">("tiktok");
  const [urls, setUrls] = useState({
    url1: "",
    url2: "",
    url3: "",
  });
  const [textInput, setTextInput] = useState("");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<"morning" | "midday" | "evening">("morning");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestingContent, setIsSuggestingContent] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on input mode
    if (inputMode === "tiktok" && !urls.url1.trim()) {
      setError("Primary TikTok URL is required");
      return;
    }

    if (inputMode === "text" && !textInput.trim()) {
      setError("Text input is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setJobStatus(null);

    // Reset all scene manager data when submitting a new job
    resetSceneData();

    try {
      const requestBody = {
        input_mode: inputMode,
        brand: selectedBrand,
        ...(inputMode === "tiktok" && {
          tiktok_url_1: urls.url1.trim(),
          tiktok_url_2: urls.url2.trim() || null,
          tiktok_url_3: urls.url3.trim() || null,
        }),
        ...(inputMode === "text" && {
          text_input: textInput.trim(),
        }),
      };

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

    // For text input mode, skip downloading and transcribing steps
    if (
      inputMode === "text" &&
      (jobStatus.status === "downloading" ||
        jobStatus.status === "transcribing")
    ) {
      return {
        key: "transcription_complete",
        label: "Processing Text",
        progress: 50,
      };
    }

    return (
      STATUS_STEPS.find((step) => step.key === jobStatus.status) ||
      STATUS_STEPS[0]
    );
  };

  const handleSuggestContent = async () => {
    setIsSuggestingContent(true);
    setError(null);

    try {
      const response = await fetch("/api/suggest-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand: selectedBrand,
          timePeriod: selectedTimePeriod
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setTextInput(data.content);
      } else {
        throw new Error(data.error || "Failed to generate content suggestion");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate content suggestion"
      );
    } finally {
      setIsSuggestingContent(false);
    }
  };

  const handleReset = () => {
    setUrls({ url1: "", url2: "", url3: "" });
    setTextInput("");
    setJobStatus(null);
    setError(null);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto px-4 py-8">
      {/* Input Form */}
      <Card className="border shadow-lg text-white w-full" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
        <CardContent className="pt-6">
          <Tabs
            value={inputMode}
            onValueChange={(value) => setInputMode(value as "tiktok" | "text")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-lg gap-2" style={{ backgroundColor: '#212223' }}>
              <TabsTrigger
                value="tiktok"
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium data-[state=active]:text-white text-gray-500 whitespace-nowrap overflow-hidden rounded-md transition-all duration-200"
                style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
              >
                <Link className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">TikTok URLs</span>
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium data-[state=active]:text-white text-gray-500 whitespace-nowrap overflow-hidden rounded-md transition-all duration-200"
                style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
              >
                <Type className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Text Input</span>
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <TabsContent value="tiktok" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="url1"
                      className="text-sm font-medium flex items-center gap-2 text-white"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Primary TikTok URL *
                    </Label>
                    <Input
                      id="url1"
                      type="url"
                      value={urls.url1}
                      onChange={(e) =>
                        setUrls((prev) => ({ ...prev, url1: e.target.value }))
                      }
                      placeholder="https://www.tiktok.com/@username/video/..."
                      disabled={isSubmitting || !!jobStatus}
                      required={inputMode === "tiktok"}
                      className="h-11 text-white placeholder-gray-400 focus:border-blue-500"
                      style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="url2"
                      className="text-sm font-medium flex items-center gap-2 text-gray-300"
                    >
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      Additional TikTok URL (Optional)
                    </Label>
                    <Input
                      id="url2"
                      type="url"
                      value={urls.url2}
                      onChange={(e) =>
                        setUrls((prev) => ({ ...prev, url2: e.target.value }))
                      }
                      placeholder="https://www.tiktok.com/@username/video/..."
                      disabled={isSubmitting || !!jobStatus}
                      className="h-11 text-white placeholder-gray-400 focus:border-blue-500"
                      style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="url3"
                      className="text-sm font-medium flex items-center gap-2 text-gray-300"
                    >
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      Additional TikTok URL (Optional)
                    </Label>
                    <Input
                      id="url3"
                      type="url"
                      value={urls.url3}
                      onChange={(e) =>
                        setUrls((prev) => ({ ...prev, url3: e.target.value }))
                      }
                      placeholder="https://www.tiktok.com/@username/video/..."
                      disabled={isSubmitting || !!jobStatus}
                      className="h-11 text-white placeholder-gray-400 focus:border-blue-500"
                      style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="textInput"
                      className="text-sm font-medium flex items-center gap-2 text-white"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Text Content *
                    </Label>
                    <div className="flex items-center gap-2">
                      <Select value={selectedTimePeriod} onValueChange={(value) => setSelectedTimePeriod(value as "morning" | "midday" | "evening")}>
                        <SelectTrigger className="w-32 h-9 text-xs text-white focus:ring-0 focus:ring-offset-0 focus:outline-none" style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}>
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-600" style={{ backgroundColor: '#212223' }}>
                          <SelectItem value="morning" className="text-white hover:bg-gray-700 focus:bg-gray-700">Morning</SelectItem>
                          <SelectItem value="midday" className="text-white hover:bg-gray-700 focus:bg-gray-700">Midday</SelectItem>
                          <SelectItem value="evening" className="text-white hover:bg-gray-700 focus:bg-gray-700">Evening</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSuggestContent}
                        disabled={isSuggestingContent || isSubmitting || !!jobStatus}
                        className="h-9 px-3 text-xs text-white hover:bg-gray-600"
                        style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                      >
                        {isSuggestingContent ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="h-3 w-3 mr-1" />
                            Suggest
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="textInput"
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                    }}
                    placeholder="Enter your text content here to generate a script, or click 'Suggest' for AI-generated ideas..."
                    disabled={isSubmitting || !!jobStatus}
                    required={inputMode === "text"}
                    className="min-h-[140px] w-full rounded-lg text-white placeholder-gray-400 focus:border-blue-500"
                    style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}
                  />
                </div>
              </TabsContent>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !!jobStatus}
                  className="flex-1 h-11 text-base text-white"
                  style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                  size="lg"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting
                    ? "Processing..."
                    : `Generate from ${
                        inputMode === "tiktok" ? "TikTok" : "Text"
                      }`}
                </Button>

                {jobStatus && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="h-11 text-white hover:bg-gray-600"
                    style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                  >
                    New Job
                  </Button>
                )}
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="border-l-4 border-red-500 w-full">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Job Status Display */}
      {jobStatus && (
        <Card className="border text-white w-full" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
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
                  className="w-full h-2 bg-gray-700"
                />
              </div>
            )}

            {/* Content Display - Only show when script is generated */}
            {jobStatus.openai_script && jobStatus.openai_script.trim() && (
              <div className="space-y-4 mt-6">
                {/* Title Display */}
                {jobStatus.job_title && jobStatus.job_title.trim() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
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
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-xs text-green-600 font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3" />
                        DESCRIPTION
                      </div>
                      <div className="text-sm text-green-900">
                        {jobStatus.job_description}
                      </div>
                    </div>
                  )}

                {/* Script Display */}
                <div className="bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto" style={{ borderColor: '#282A2B' }}>
                  <div className="text-xs text-gray-300 font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    SCRIPT
                  </div>
                  <pre className="text-sm whitespace-pre-wrap text-white leading-relaxed">
                    {jobStatus.openai_script}
                  </pre>
                </div>

                {/* Go to Scene Manager Button - Show when script is complete */}
                {jobStatus.status === "script_generated" && (
                  <div className="pt-4">
                    <Button
                      onClick={() => (window.location.href = "/scene-manager")}
                      className="w-full h-11 text-base text-white"
                      style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
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
              <Alert
                variant="destructive"
                className="mt-4 border-l-4 border-red-500"
              >
                <XCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {jobStatus.error_message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
