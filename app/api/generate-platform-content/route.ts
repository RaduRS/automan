import { NextRequest, NextResponse } from "next/server";
import { getBrandConfig, type BrandName } from "@/lib/brand-config";
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
  brand: BrandName,
  originalTitle?: string,
  originalDescription?: string
): Promise<PlatformOptimizedContent> {
  const brandConfig = getBrandConfig(brand);

  const prompt = `Based on this ${
    brandConfig.name
  } script, create platform-optimized content for each social media platform.

BRAND: ${brandConfig.name} - ${brandConfig.description}

SCRIPT:
${script}

${originalTitle ? `ORIGINAL TITLE: ${originalTitle}` : ""}
${originalDescription ? `ORIGINAL DESCRIPTION: ${originalDescription}` : ""}

PLATFORM OPTIMIZATION REQUIREMENTS:

**YOUTUBE SHORTS:**
- Title: Compelling, keyword-rich (60 chars max) - NO EMOJIS (emojis hurt YouTube Shorts algorithm)
- Description: Brief, engaging (2-3 sentences max) - focus on value proposition
- Hashtags: Only #shorts (additional hashtags handled in UI)

**INSTAGRAM REELS:**
- Description: 1-2 sentences with relevant emojis (NO TITLE NEEDED)
- Hashtags: Generate exactly 7-9 highly targeted hashtags for maximum reach. Mix 3-4 niche-specific hashtags (10K-100K posts) with 3-4 broader hashtags (100K-1M posts) and 1-2 trending hashtags. This is the optimal number for Instagram's 2024 algorithm.

**FACEBOOK REELS:**
- Description: Relatable, shareable content with emojis (NO TITLE NEEDED)
- Hashtags: Generate the optimal number of relevant hashtags for Facebook's algorithm and this specific content. Focus on hashtags that Facebook users actually search for.

**TIKTOK:**
- Description: Catchy, trend-relevant with emojis (NO TITLE NEEDED)
- Hashtags: Generate 5-8 hashtags mixing trending tags with niche-specific ones. Include 1-2 viral hashtags, 2-3 niche hashtags, and 2-3 content-specific hashtags. This maximizes For You page visibility while maintaining relevance.

**X (TWITTER):**
- Description: Question or bold statement to encourage engagement (NO TITLE NEEDED)
- Hashtags: Generate the optimal number of hashtags for Twitter's algorithm and this content. Focus on hashtags that encourage conversation and discoverability.

CRITICAL REQUIREMENTS:
- Generate hashtags dynamically based on the actual content themes and current social media trends
- Prioritize hashtags that maximize discoverability and For You page potential
- Each platform's hashtags should be optimized for that platform's algorithm
- No forced brand-specific hashtags - focus on what users actually search for
- Keep authentic tone and energy from the original script
- Each platform's content should feel native to that platform
- All content should drive engagement specific to each platform's algorithm

Respond with ONLY valid JSON in this exact format:

{
  "youtube": {
    "title": "Title optimized for YouTube Shorts (no emojis)...",
    "description": "Brief value-focused description for YouTube...",
    "hashtags": "#shorts"
  },
  "instagram": {
    "title": "",
    "description": "Description with emojis for Instagram...",
    "hashtags": "exactly 7-9 targeted hashtags mixing niche and broader reach"
  },
  "facebook": {
    "title": "",
    "description": "Shareable description for Facebook...",
    "hashtags": "#facebookreels + relevant content hashtags"
  },
  "tiktok": {
    "title": "",
    "description": "Trend-aware description for TikTok...",
    "hashtags": "content-specific trending hashtags"
  },
  "twitter": {
    "title": "",
    "description": "Engaging statement for Twitter...",
    "hashtags": "relevant hashtags based on script content"
  }
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
    const { script, title, description, brand = "peakshifts" } = requestBody;

    if (!script || typeof script !== "string" || !script.trim()) {
      return NextResponse.json(
        { error: "Script is required" },
        { status: 400 }
      );
    }

    // Generate platform-specific content
    const platformContent = await generatePlatformContent(
      script.trim(),
      brand as BrandName,
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
