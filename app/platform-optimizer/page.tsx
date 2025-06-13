"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, CheckCircle, Loader2, History } from "lucide-react";

interface PlatformContent {
  title: string;
  description: string;
  hashtags: string;
}

interface PlatformOptimizedContent {
  youtube: PlatformContent;
  instagram: PlatformContent;
  facebook: PlatformContent;
  tiktok: PlatformContent;
  twitter: PlatformContent;
}

interface LatestScript {
  id: string;
  title: string;
  script: string;
  description: string;
  created_at: string;
}

export default function PlatformOptimizer() {
  const [script, setScript] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [platformContent, setPlatformContent] =
    useState<PlatformOptimizedContent | null>(null);
  const [copiedItems, setCopiedItems] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [latestScripts, setLatestScripts] = useState<LatestScript[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);

  // Fetch latest scripts on component mount
  useEffect(() => {
    fetchLatestScripts();
  }, []);

  const fetchLatestScripts = async () => {
    setIsLoadingScripts(true);
    try {
      const response = await fetch("/api/latest-scripts");
      const data = await response.json();

      if (data.success) {
        setLatestScripts(data.scripts);
      } else {
        console.error("Failed to fetch latest scripts:", data.error);
      }
    } catch (error) {
      console.error("Error fetching latest scripts:", error);
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const handleScriptSelect = (scriptId: string) => {
    const selectedScript = latestScripts.find((s) => s.id === scriptId);
    if (selectedScript) {
      setScript(selectedScript.script);
      setTitle(selectedScript.title);
      setDescription(selectedScript.description);
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-platform-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: script.trim(),
          title: title.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlatformContent(data.platforms);
      } else {
        alert("Failed to generate platform content: " + data.error);
      }
    } catch (error) {
      console.error("Error generating platform content:", error);
      alert("Failed to generate platform content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems({ ...copiedItems, [key]: true });
      setTimeout(() => {
        setCopiedItems((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const platformConfigs = {
    youtube: {
      name: "YouTube Shorts",
      color: "bg-red-500",
      strategy: "Only #shorts (proven winner!)",
      format: "YouTube Short",
    },
    instagram: {
      name: "Instagram Reels",
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      strategy: "5-15 hashtags: format + niche mix",
      format: "Instagram Reel",
    },
    facebook: {
      name: "Facebook Reels",
      color: "bg-blue-600",
      strategy: "3-5 highly relevant hashtags",
      format: "Facebook Reel",
    },
    tiktok: {
      name: "TikTok",
      color: "bg-black",
      strategy: "Your current successful mix",
      format: "TikTok Video",
    },
    twitter: {
      name: "X (Twitter)",
      color: "bg-black",
      strategy: "1-3 topical hashtags only",
      format: "Video Post",
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Platform Content Optimizer
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Generate platform-specific titles, descriptions, and hashtags
            optimized for each social media platform
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Input Your Content</CardTitle>
            <CardDescription>
              Enter your script to generate optimized content for all platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Load from Database Dropdown */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Load from Database (Optional)
              </Label>
              <Select onValueChange={handleScriptSelect}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue
                    placeholder={
                      isLoadingScripts
                        ? "Loading scripts..."
                        : "Select a previous script to auto-fill"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {latestScripts.map((script) => (
                    <SelectItem key={script.id} value={script.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{script.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(script.created_at).toLocaleDateString()} •{" "}
                          {script.script.substring(0, 60)}...
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {latestScripts.length === 0 && !isLoadingScripts && (
                    <SelectItem value="no-scripts" disabled>
                      No scripts found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="script" className="text-base font-medium">
                Script * (Required)
              </Label>
              <textarea
                id="script"
                placeholder="Paste your motivational/discipline script here..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full min-h-[120px] mt-2 px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input resize-vertical"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  Original Title (Optional)
                </Label>
                <input
                  id="title"
                  type="text"
                  placeholder="Your original title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  Original Description (Optional)
                </Label>
                <input
                  id="description"
                  type="text"
                  placeholder="Your original description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!script.trim() || isGenerating}
              className="w-full md:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Platform Content...
                </>
              ) : (
                "Generate Platform Content"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {platformContent && (
          <Card>
            <CardHeader>
              <CardTitle>Platform-Optimized Content</CardTitle>
              <CardDescription>
                Copy the content optimized for each platform. Click any text to
                copy it to your clipboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="youtube" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  {Object.entries(platformConfigs).map(([key, config]) => (
                    <TabsTrigger key={key} value={key} className="text-xs">
                      {config.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(platformContent).map(([platform, content]) => {
                  const config =
                    platformConfigs[platform as keyof typeof platformConfigs];

                  return (
                    <TabsContent
                      key={platform}
                      value={platform}
                      className="mt-6"
                    >
                      <div className="space-y-4">
                        {/* Platform Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div
                            className={`w-4 h-4 rounded-full ${config.color}`}
                          ></div>
                          <div>
                            <h3 className="text-lg font-semibold">
                              {config.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Format: {config.format} • Strategy:{" "}
                              {config.strategy}
                            </p>
                          </div>
                        </div>

                        {/* Content Cards */}
                        <div className="space-y-4">
                          {/* Title - Only for YouTube */}
                          {platform === "youtube" && (
                            <Card
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                copyToClipboard(
                                  content.title,
                                  `${platform}-title`
                                )
                              }
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">
                                    TITLE
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {content.title.length} chars
                                    </Badge>
                                    {copiedItems[`${platform}-title`] ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-base font-medium">
                                  {content.title}
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          {/* Description and Hashtags - Side by Side */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Description */}
                            <Card
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                copyToClipboard(
                                  content.description,
                                  `${platform}-description`
                                )
                              }
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">
                                    DESCRIPTION
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {content.description.length} chars
                                    </Badge>
                                    {copiedItems[`${platform}-description`] ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-base">
                                  {content.description}
                                </p>
                              </CardContent>
                            </Card>

                            {/* Hashtags */}
                            <Card
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                copyToClipboard(
                                  content.hashtags,
                                  `${platform}-hashtags`
                                )
                              }
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">
                                    HASHTAGS
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {content.hashtags.split(" ").length} tags
                                    </Badge>
                                    {copiedItems[`${platform}-hashtags`] ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-base font-mono text-blue-600">
                                  {content.hashtags}
                                </p>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Complete Post - YouTube (with title) */}
                          {platform === "youtube" && (
                            <Card
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                copyToClipboard(
                                  `${content.title}\n\n${content.description}\n\n${content.hashtags}`,
                                  `${platform}-complete`
                                )
                              }
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">
                                    COMPLETE POST
                                  </CardTitle>
                                  {copiedItems[`${platform}-complete`] ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2 p-4 bg-muted rounded-md">
                                  <p className="font-medium">{content.title}</p>
                                  <p className="text-muted-foreground">
                                    {content.description}
                                  </p>
                                  <p className="font-mono text-blue-600 text-sm">
                                    {content.hashtags}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Complete Post - Other platforms (description + hashtags only) */}
                          {platform !== "youtube" && (
                            <Card
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                copyToClipboard(
                                  `${content.description}\n\n${content.hashtags}`,
                                  `${platform}-complete`
                                )
                              }
                            >
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-medium text-muted-foreground">
                                    COMPLETE POST
                                  </CardTitle>
                                  {copiedItems[`${platform}-complete`] ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2 p-4 bg-muted rounded-md">
                                  <p className="text-muted-foreground">
                                    {content.description}
                                  </p>
                                  <p className="font-mono text-blue-600 text-sm">
                                    {content.hashtags}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
