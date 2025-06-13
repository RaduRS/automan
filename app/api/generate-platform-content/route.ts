import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

async function generatePlatformContent(
  script: string,
  originalTitle?: string,
  originalDescription?: string
): Promise<PlatformOptimizedContent> {
  const prompt = `Based on this motivational/discipline script, create platform-optimized content for each social media platform.

SCRIPT:
${script}

${originalTitle ? `ORIGINAL TITLE: ${originalTitle}` : ""}
${originalDescription ? `ORIGINAL DESCRIPTION: ${originalDescription}` : ""}

PLATFORM OPTIMIZATION REQUIREMENTS:

**YOUTUBE SHORTS:**
- Title: Compelling, keyword-rich (60 chars max) - REQUIRED for YouTube
- Description: Brief, engaging (2-3 sentences max)
- Hashtags: ONLY #shorts (this is proven to work best)

**INSTAGRAM REELS:**
- Description: 1-2 sentences with relevant emojis (NO TITLE NEEDED)
- Hashtags: 5-15 mix of broad format tags (#reels, #reelsinstagram) and niche tags (#disciplinedaily, #selfimprovement, #peakperformance)

**FACEBOOK REELS:**
- Description: Relatable, shareable content with emojis (NO TITLE NEEDED)
- Hashtags: 3-5 highly relevant tags (#facebookreels, #motivation, #discipline)

**TIKTOK:**
- Description: Catchy, trend-relevant with emojis (NO TITLE NEEDED)
- Hashtags: Current successful mix (#disciplinedaily, #stayfocused, #selfimprovement, #lifehacks, #peakperformance)

**X (TWITTER):**
- Description: Question or bold statement to encourage engagement (NO TITLE NEEDED)
- Hashtags: 1-3 topical hashtags only (#discipline, #stayfocused)

CRITICAL REQUIREMENTS:
- Keep authentic tone and energy from the original script
- Each platform's content should feel native to that platform
- Hashtags must follow the proven strategies for each platform
- No generic corporate speak
- All content should drive engagement specific to each platform's algorithm

Respond with ONLY valid JSON in this exact format:

{
  "youtube": {
    "title": "Title optimized for YouTube Shorts...",
    "description": "Brief description for YouTube...",
    "hashtags": "#shorts"
  },
  "instagram": {
    "title": "",
    "description": "Description with emojis for Instagram...",
    "hashtags": "#reels #reelsinstagram #selfimprovement #discipline #mensmotivation"
  },
  "facebook": {
    "title": "",
    "description": "Shareable description for Facebook...",
    "hashtags": "#facebookreels #motivation #discipline"
  },
  "tiktok": {
    "title": "",
    "description": "Trend-aware description for TikTok...",
    "hashtags": "#disciplinedaily #stayfocused #selfimprovement #lifehacks"
  },
  "twitter": {
    "title": "",
    "description": "Engaging statement for Twitter...",
    "hashtags": "#discipline #stayfocused"
  }
}`;

  const completion = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [
      {
        role: "user",
        content: `You are a social media optimization expert specializing in platform-specific content strategies. You understand the unique algorithms, user behaviors, and hashtag strategies for each major social media platform.

Your expertise includes:
- YouTube Shorts algorithm optimization (proven #shorts strategy)
- Instagram Reels discovery mechanics (format + niche hashtag mixing)
- Facebook Reels engagement patterns (simplified hashtag approach)
- TikTok viral content strategies (proven hashtag combinations)
- X/Twitter conversation-driving tactics (minimal, topical hashtags)

Create platform-optimized content that maintains authenticity while maximizing each platform's specific discovery and engagement mechanisms.

${prompt}`,
      },
    ],
  });

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error("No response from OpenAI");
  }

  try {
    // Handle potential markdown code blocks from OpenAI
    let jsonString = response.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsedContent = JSON.parse(jsonString);

    return parsedContent;
  } catch (parseError) {
    console.error(
      "❌ Failed to parse OpenAI platform content response:",
      response
    );
    console.error("❌ Parse error:", parseError);
    throw new Error("Invalid JSON response from OpenAI");
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { script, title, description } = requestBody;

    if (!script || typeof script !== "string" || !script.trim()) {
      return NextResponse.json(
        { error: "Script is required" },
        { status: 400 }
      );
    }

    // Generate platform-specific content
    const platformContent = await generatePlatformContent(
      script.trim(),
      title?.trim(),
      description?.trim()
    );

    return NextResponse.json({
      success: true,
      message: "Platform-optimized content generated successfully",
      platforms: platformContent,
    });
  } catch (error) {
    console.error("Generate platform content API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
