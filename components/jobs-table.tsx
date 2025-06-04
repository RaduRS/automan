"use client";

import { useState, useEffect } from "react";
import { supabase, type Job } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Instagram,
  Youtube,
  Twitter,
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
    generating_video: { variant: "secondary", label: "Creating Video" },
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
                    className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      // TODO: Navigate to job details page
                      console.log("Navigate to job:", job.id);
                    }}
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
