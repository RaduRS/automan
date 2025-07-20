"use client";

import { useState, useEffect } from "react";
import { supabase, type Job } from "@/lib/supabase";
import { getBrandConfig, type BrandName } from "@/lib/brand-config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Zap,
  Cloud,
  Sparkles,
  Heart,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { type VariantProps } from "class-variance-authority";

// Brand icons mapping
const brandIcons = {
  peakshifts: Zap,
  dreamfloat: Cloud,
  lorespark: Sparkles,
  heartbeats: Heart,
};

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

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-600">
      <td className="p-3">
        <Skeleton className="h-6 w-40" style={{ backgroundColor: '#282A2B' }} />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" style={{ backgroundColor: '#282A2B' }} />
          <Skeleton className="h-5 w-24" style={{ backgroundColor: '#282A2B' }} />
        </div>
      </td>
      <td className="p-3">
        <Skeleton className="h-5 w-20" style={{ backgroundColor: '#282A2B' }} />
      </td>
      <td className="p-3">
        <Skeleton className="h-7 w-20 rounded-full" style={{ backgroundColor: '#282A2B' }} />
      </td>
      <td className="p-3 text-center">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-5 w-5 rounded" style={{ backgroundColor: '#282A2B' }} />
          <Skeleton className="h-4 w-20" style={{ backgroundColor: '#282A2B' }} />
        </div>
      </td>
      <td className="p-3 text-center">
        <Skeleton className="h-5 w-5 rounded" style={{ backgroundColor: '#282A2B' }} />
      </td>
    </tr>
  );
}

interface JobsResponse {
  success: boolean;
  jobs: Job[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function JobsTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalJobs: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [currentPage]);

  async function fetchJobs() {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs?page=${currentPage}&limit=10`);

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data: JobsResponse = await response.json();

      if (data.success) {
        setJobs(data.jobs || []);
        setPagination(data.pagination);
      } else {
        throw new Error("Failed to fetch jobs");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
      // Fallback to direct Supabase query if API doesn't exist yet
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * 10, currentPage * 10 - 1);

        if (error) throw error;

        // Get total count for pagination
        const { count } = await supabase
          .from("jobs")
          .select("*", { count: "exact", head: true });

        const totalPages = Math.ceil((count || 0) / 10);

        setJobs(data || []);
        setPagination({
          currentPage,
          totalPages,
          totalJobs: count || 0,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        });
        setError(null);
      } catch (fallbackErr) {
        setError(
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "Failed to fetch jobs"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteJob(jobId: string) {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/delete-job", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      if (response.ok) {
        // Close delete modal and refresh jobs
        setDeleteJobId(null);
        fetchJobs();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete job");
      }
    } catch (error) {
      setError(`Failed to delete job: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Card className="border text-white" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
        <CardHeader>
          <CardTitle className="text-white">Jobs ({pagination.totalJobs})</CardTitle>
        </CardHeader>
        <CardContent>
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 font-medium text-gray-300">Title</th>
                    <th className="text-left p-3 font-medium text-gray-300">Brand</th>
                    <th className="text-left p-3 font-medium text-gray-300">Created</th>
                    <th className="text-left p-3 font-medium text-gray-300">Status</th>
                    <th className="text-center p-3 font-medium text-gray-300">Script</th>
                    <th className="text-center p-3 font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Show skeleton rows only when loading or when we have fewer jobs than expected */}
                  {Array.from({ length: 10 }, (_, index) => {
                    const job = jobs[index];
                    
                    // Show skeleton if loading OR if we're on the last page and this index doesn't have a job
                    if (loading || (!job && (pagination.hasNextPage || currentPage === 1))) {
                      return <SkeletonRow key={`skeleton-${index}`} />;
                    }

                    // Don't show anything if we're on the last page and there's no job for this index
                    if (!job) {
                      return null;
                    }

                    return (
                      <tr
                        key={job.id}
                        className="border-b border-gray-600 hover:bg-gray-700 transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-medium text-sm">
                            {job.job_title && job.job_title.trim() 
                              ? job.job_title 
                              : "Untitled Job"}
                          </div>
                        </td>
                        <td className="p-3">
                          {(() => {
                            const brand = (job.brand as BrandName) || "peakshifts";
                            const brandConfig = getBrandConfig(brand);
                            const Icon = brandIcons[brand];
                            return (
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span className="text-sm">{brandConfig.name}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3 text-sm text-gray-400">
                          {formatDate(job.created_at)}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(job.status)}
                          {job.error_message && (
                            <div className="text-xs text-red-400 mt-1">
                              {job.error_message.substring(0, 50)}...
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <ScriptViewer job={job} />
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteJobId(job.id)}
                            className="h-auto p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Show error message if there's an error */}
            {error && (
              <div className="text-center py-4 text-red-400">
                Error: {error}
              </div>
            )}

            {/* Show "no jobs" message only when not loading and no jobs exist */}
            {!loading && !error && pagination.totalJobs === 0 && (
              <div className="text-center py-8 text-gray-400">
                No jobs found. <br />
                <Button variant="link" onClick={() => (window.location.href = "/")} className="text-blue-400 hover:text-blue-300">
                  Create your first job
                </Button>
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="text-white border-gray-600 hover:bg-gray-700"
                  style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-400">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="text-white border-gray-600 hover:bg-gray-700"
                  style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteJobId} onOpenChange={() => setDeleteJobId(null)}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#161819', borderColor: '#282A2B' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Delete Job</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete this job? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteJobId(null)}
              disabled={isDeleting}
              className="text-white border-gray-600 hover:bg-gray-700"
              style={{ backgroundColor: '#212223', borderColor: '#282A2B' }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteJobId && handleDeleteJob(deleteJobId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
