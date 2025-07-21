import { NextRequest, NextResponse } from "next/server";
import { getBrandConfig, type BrandName } from "@/lib/brand-config";
import { getTimeBasedStrategy, type TimeOfDay } from "@/lib/time-based-content";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { brand, timePeriod } = await request.json();

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    if (!timePeriod || !["morning", "midday", "evening"].includes(timePeriod)) {
      return NextResponse.json(
        { error: "Valid time period is required (morning, midday, evening)" },
        { status: 400 }
      );
    }

    const brandConfig = getBrandConfig(brand as BrandName);
    const timeStrategy = getTimeBasedStrategy(brand as BrandName, timePeriod as TimeOfDay);

    // Create a time-aware content suggestion prompt based on the brand and current time
    const suggestionPrompt = `You are an expert content creator for ${brandConfig.name}. 

BRAND: ${brandConfig.name}
DESCRIPTION: ${brandConfig.description}

CURRENT TIME CONTEXT:
- Time Period: ${timePeriod.toUpperCase()}
- Posting Time: ${timeStrategy.time}
- Context: ${timeStrategy.description}
- Content Focus: ${timeStrategy.contentFocus}

Generate a compelling piece of source content that would be perfect for creating a ${brandConfig.name} script specifically for ${timePeriod} posting. This should be raw material that can later be transformed into a script - think of it as the "input text" that someone might use.

REQUIREMENTS:
- Should be 80-120 words (short and focused)
- Should align with the ${brandConfig.name} brand theme and audience
- Should be specifically tailored for ${timePeriod} content (${timeStrategy.time} posting time)
- Should incorporate the time-specific content focus: ${timeStrategy.contentFocus}
- Should be engaging but concise - one clear concept or insight
- Should feel like authentic source material (not already a polished script)
- Should provide one strong idea that can be expanded into a compelling video script

For ${brandConfig.name} specifically during ${timePeriod}:
${getBrandThemeGuidance(brand as BrandName, timePeriod as TimeOfDay, timeStrategy)}

Return ONLY the raw content text, no additional formatting or explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: suggestionPrompt,
        },
      ],
      temperature: 0.8, // Higher creativity for varied suggestions
      max_tokens: 500,
    });

    const suggestedContent = completion.choices[0]?.message?.content?.trim();

    if (!suggestedContent) {
      throw new Error("No content generated");
    }

    return NextResponse.json({
      success: true,
      content: suggestedContent,
      timeContext: {
        timeOfDay: timePeriod,
        postingTime: timeStrategy.time,
        description: timeStrategy.description,
        contentFocus: timeStrategy.contentFocus
      }
    });
  } catch (error) {
    console.error("Error generating content suggestion:", error);
    return NextResponse.json(
      { error: "Failed to generate content suggestion" },
      { status: 500 }
    );
  }
}

function getBrandThemeGuidance(brand: BrandName, timeOfDay: TimeOfDay, timeStrategy: { time: string; description: string; contentFocus: string }): string {
  const baseGuidance = {
    peakshifts: `Create content about discipline, self-improvement, mental strength, productivity, or personal growth. Think about challenges professionals face and practical solutions.`,
    dreamfloat: `Create content about mindfulness, relaxation, sleep, dreams, peaceful moments, or gentle wisdom. Think about calming thoughts, peaceful imagery, or gentle life insights.`,
    lorespark: `Create content about ONE fascinating "what if" scenario, sci-fi concept, or fantasy idea. Keep it simple and focused - like a single mysterious phenomenon, one futuristic technology concept, or one alternate reality scenario.`,
    heartbeats: `Create content about love, relationships, emotional growth, life transitions, meaningful connections, or personal reflection. Think about heartfelt moments, emotional insights, relationship wisdom.`,
  };

  const timeSpecificGuidance = {
    peakshifts: {
      morning: `Focus on morning routines, setting daily intentions, productivity frameworks, or mindset preparation. Could be about starting the day with purpose, morning habits of successful people, or energy-boosting practices that aren't just about work - think gym motivation, personal projects, or life goals.`,
      midday: `Focus on productivity hacks, time management tips, overcoming the midday slump, or motivational content. Think about quick wins, energy boosters, or strategies to power through challenges.`,
      evening: `Focus on transitioning from work to personal time, "second shift" motivation (gym, personal projects, goal setting), or finishing the day strong. Think about evening routines, personal development, or preparing for tomorrow.`
    },
    dreamfloat: {
      morning: `Focus on morning meditation, breathing exercises, gentle affirmations, or setting peaceful intentions. Think about starting the day with clarity, calm morning practices, or mindful awakening.`,
      midday: `Focus on quick mindfulness techniques, stress-relief practices, mental reset strategies, or gentle reminders to pause and breathe during busy moments.`,
      evening: `Focus on evening meditation, gratitude practices, winding down techniques, or preparing for restful sleep. Think about transitioning from stress to peace, bedtime rituals, or calming reflections.`
    },
    lorespark: {
      morning: `Focus on creative challenges, artistic techniques, or inspirational stories that fuel creative fire. Think about sparking imagination for the day ahead, creative morning rituals, or fresh perspectives on artistic work.`,
      midday: `Focus on quick creative exercises, artistic tips, or inspiring examples that reignite passion. Think about overcoming creative blocks, mid-day inspiration, or creative problem-solving.`,
      evening: `Focus on creative reflection, artistic growth, or inspiration for evening creative sessions. Think about personal creative projects, artistic journey reflections, or planning creative endeavors.`
    },
    heartbeats: {
      morning: `Focus on daily relationship practices, communication tips, or ways to show love throughout the day. Think about starting the day with relationship intentions, morning connection rituals, or thoughtful gestures.`,
      midday: `Focus on quick relationship tips, thoughtful gestures, or connection reminders for busy people. Think about maintaining bonds during work hours, small acts of love, or relationship mindfulness.`,
      evening: `Focus on evening connection practices, relationship reflection, or strengthening bonds during quality time. Think about end-of-day relationship rituals, intimate conversations, or couple activities.`
    }
  };

  const base = baseGuidance[brand] || baseGuidance.peakshifts;
  const timeSpecific = timeSpecificGuidance[brand]?.[timeOfDay] || timeSpecificGuidance.peakshifts[timeOfDay];
  
  return `${base} 

TIME-SPECIFIC FOCUS FOR ${timeOfDay.toUpperCase()}: ${timeSpecific}

POSTING CONTEXT: ${timeStrategy.description} ${timeStrategy.contentFocus}`;
}
