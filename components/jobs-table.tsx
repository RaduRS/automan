"use client";

import { useState, useEffect } from "react";
import { supabase, type Job } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  Instagram,
  Youtube,
  Twitter,
  FileText,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";

// Platform icons mapping
const platformIcons = {
  instagram: Instagram,
  facebook: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  tiktok: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  youtube: Youtube,
  x: Twitter,
};

interface StatusFilterProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}

function StatusFilter({ currentFilter, onFilterChange }: StatusFilterProps) {
  const filters = [
    { key: "all", label: "All" },
    { key: "scheduled_to_socialbee", label: "Scheduled" },
    { key: "error", label: "Failed" },
    { key: "in_progress", label: "In Progress" },
  ];

  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={currentFilter === filter.key ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

interface PlatformStatusProps {
  platform: keyof typeof platformIcons;
  posted: boolean;
  scheduled?: boolean;
}

function PlatformStatus({
  platform,
  posted,
  scheduled = false,
}: PlatformStatusProps) {
  const Icon = platformIcons[platform];

  let statusIcon;
  let statusColor;

  if (posted) {
    statusIcon = <CheckCircle className="w-3 h-3" />;
    statusColor = "text-green-500";
  } else if (scheduled) {
    statusIcon = <Clock className="w-3 h-3" />;
    statusColor = "text-yellow-500";
  } else {
    statusIcon = <XCircle className="w-3 h-3" />;
    statusColor = "text-red-500";
  }

  return (
    <div className="flex items-center gap-2">
      <Icon />
      <span className={cn("text-xs", statusColor)}>{statusIcon}</span>
    </div>
  );
}

function getStatusBadge(status: Job["status"]) {
  const statusConfig: Record<
    Job["status"],
    {
      variant: VariantProps<typeof badgeVariants>["variant"];
      label: string;
    }
  > = {
    submitted: { variant: "secondary", label: "Submitted" },
    downloading: { variant: "secondary", label: "Downloading" },
    transcribing: { variant: "secondary", label: "Transcribing" },
    transcription_complete: { variant: "secondary", label: "Transcribed" },
    generating_script: { variant: "secondary", label: "Generating Script" },
    script_generated: { variant: "default", label: "Script Ready" },
    generating_video: { variant: "secondary", label: "Creating Video" },
    combining_video: { variant: "secondary", label: "Combining Video" },
    video_complete: { variant: "default", label: "Video Complete" },
    video_ready: { variant: "secondary", label: "Video Ready" },
    scheduled_to_socialbee: { variant: "default", label: "Scheduled" },
    error: { variant: "destructive", label: "Failed" },
  };

  const config = statusConfig[status] || {
    variant: "secondary" as const,
    label: status,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface ScriptViewerProps {
  job: Job;
}

function ScriptViewer({ job }: ScriptViewerProps) {
  const hasScript = job.openai_script && job.openai_script.trim() !== "";
  const canGenerateScript =
    job.status === "transcription_complete" && !hasScript;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (response.ok) {
        // Refresh the page to show the updated job
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to generate script: ${error.error}`);
      }
    } catch (error) {
      alert(`Failed to generate script: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (canGenerateScript) {
    return (
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateScript}
          disabled={isGenerating}
          className="h-auto p-2"
        >
          <div className="flex flex-col items-center gap-1">
            <FileText className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-500">
              {isGenerating ? "Generating..." : "Generate Script"}
            </span>
          </div>
        </Button>
      </div>
    );
  }

  if (!hasScript) {
    return (
      <div className="text-center">
        <FileText className="w-4 h-4 text-muted-foreground mx-auto" />
        <div className="text-xs text-muted-foreground mt-1">No script</div>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-2">
          <div className="flex flex-col items-center gap-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-blue-500">View Script</span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generated Content</DialogTitle>
          <DialogDescription>
            AI-generated script and content for job: {job.id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {job.job_title && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Title:</h3>
              <p className="text-sm bg-muted p-3 rounded">{job.job_title}</p>
            </div>
          )}

          {job.job_description && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Description:</h3>
              <p className="text-sm bg-blue-50 border border-blue-200 p-3 rounded">
                {job.job_description}
              </p>
            </div>
          )}

          {job.job_hashtags && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Hashtags:</h3>
              <div className="text-sm bg-purple-50 border border-purple-200 p-3 rounded">
                <span className="font-mono text-purple-700">
                  {job.job_hashtags}
                </span>
              </div>
            </div>
          )}

          {job.openai_script && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Generated Script:</h3>
              <div className="text-sm bg-muted p-4 rounded max-h-60 overflow-y-auto whitespace-pre-wrap">
                {job.openai_script}
              </div>

              {job.script_scenes && (
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2">
                    Scenes ({JSON.parse(job.script_scenes).length}):
                  </h4>
                  <div className="space-y-2">
                    {JSON.parse(job.script_scenes).map(
                      (scene: string, index: number) => (
                        <div
                          key={index}
                          className="text-sm bg-blue-50 border border-blue-200 p-2 rounded"
                        >
                          <span className="font-mono text-xs text-blue-600 mr-2">
                            Scene {index + 1}:
                          </span>
                          <span className="text-blue-900">{scene}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {(job.transcript_1 || job.transcript_2 || job.transcript_3) && (
            <div>
              <h3 className="font-semibold text-sm mb-2">
                Original Transcripts:
              </h3>
              <div className="space-y-2">
                {job.transcript_1 && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Video 1:</h4>
                    <div className="text-xs bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
                      {job.transcript_1}
                    </div>
                  </div>
                )}
                {job.transcript_2 && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Video 2:</h4>
                    <div className="text-xs bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
                      {job.transcript_2}
                    </div>
                  </div>
                )}
                {job.transcript_3 && (
                  <div>
                    <h4 className="text-xs font-medium mb-1">Video 3:</h4>
                    <div className="text-xs bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
                      {job.transcript_3}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "scheduled_to_socialbee")
      return job.status === "scheduled_to_socialbee";
    if (statusFilter === "error") return job.status === "error";
    if (statusFilter === "in_progress") {
      return !["scheduled_to_socialbee", "error"].includes(job.status);
    }
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            Loading jobs...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Jobs ({filteredJobs.length})</CardTitle>
          <StatusFilter
            currentFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredJobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No jobs found. <br />
            <Button variant="link" onClick={() => (window.location.href = "/")}>
              Create your first job
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Title / Job ID</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Script</th>
                  <th className="text-center p-3 font-medium">Instagram</th>
                  <th className="text-center p-3 font-medium">Facebook</th>
                  <th className="text-center p-3 font-medium">TikTok</th>
                  <th className="text-center p-3 font-medium">YouTube</th>
                  <th className="text-center p-3 font-medium">X</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-3">
                      {job.job_title && job.job_title.trim() && (
                        <div className="font-medium text-sm mb-1">
                          {job.job_title}
                        </div>
                      )}
                      <div className="font-mono text-xs text-muted-foreground">
                        {job.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="p-3">
                      {getStatusBadge(job.status)}
                      {job.error_message && (
                        <div className="text-xs text-red-500 mt-1">
                          {job.error_message.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <ScriptViewer job={job} />
                    </td>
                    <td className="p-3 text-center">
                      <PlatformStatus
                        platform="instagram"
                        posted={job.instagram_posted}
                        scheduled={job.status === "scheduled_to_socialbee"}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <PlatformStatus
                        platform="facebook"
                        posted={job.facebook_posted}
                        scheduled={job.status === "scheduled_to_socialbee"}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <PlatformStatus
                        platform="tiktok"
                        posted={job.tiktok_posted}
                        scheduled={job.status === "scheduled_to_socialbee"}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <PlatformStatus
                        platform="youtube"
                        posted={job.youtube_posted}
                        scheduled={job.status === "scheduled_to_socialbee"}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <PlatformStatus
                        platform="x"
                        posted={job.x_posted}
                        scheduled={job.status === "scheduled_to_socialbee"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
