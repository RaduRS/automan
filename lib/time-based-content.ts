import { type BrandName } from "@/lib/brand-config";

export type TimeOfDay = "morning" | "midday" | "evening";

export interface BrandTimeStrategy {
  morning: {
    time: string;
    description: string;
    contentFocus: string;
  };
  midday: {
    time: string;
    description: string;
    contentFocus: string;
  };
  evening: {
    time: string;
    description: string;
    contentFocus: string;
  };
}

export const BRAND_TIME_STRATEGIES: Record<BrandName, BrandTimeStrategy> = {
  peakshifts: {
    morning: {
      time: "07:30",
      description: "This is the perfect time to catch your audience as they start their workday.",
      contentFocus: "Content should focus on setting intentions, morning routines, and productivity frameworks that help them tackle their day with purpose and energy."
    },
    midday: {
      time: "13:00", 
      description: "This slot targets the midday slump when professionals need a boost.",
      contentFocus: "Share quick productivity hacks, time management tips, or motivational content that helps them power through the second half of their workday."
    },
    evening: {
      time: "18:00",
      description: "This slot is for the transition from the primary workday to personal time.",
      contentFocus: "It's aimed at motivating your audience for their 'second shift'—be it a workout at the gym, working on a personal project, or setting goals for the next day. This post helps them finish their day strong and on their own terms."
    }
  },
  dreamfloat: {
    morning: {
      time: "07:00",
      description: "This early morning slot is perfect for setting a peaceful, mindful tone for the day.",
      contentFocus: "Content should focus on morning meditation practices, breathing exercises, and gentle affirmations that help your audience start their day with clarity and calm intention."
    },
    midday: {
      time: "12:30",
      description: "This midday moment captures people during their lunch break when they need a mental reset.",
      contentFocus: "Share quick mindfulness techniques, stress-relief practices, or gentle reminders to pause and breathe amidst their busy day."
    },
    evening: {
      time: "21:00",
      description: "This evening slot is designed for winding down and preparing for restful sleep.",
      contentFocus: "Focus on evening meditation, gratitude practices, and calming content that helps your audience transition from the day's stress into peaceful relaxation."
    }
  },
  lorespark: {
    morning: {
      time: "08:00",
      description: "This morning slot targets creators as they begin their creative work.",
      contentFocus: "Content should spark inspiration for the day ahead, sharing creative challenges, artistic techniques, or motivational stories that fuel their creative fire and help them approach their craft with fresh perspective."
    },
    midday: {
      time: "13:00",
      description: "This midday post catches creators during their creative flow or when they need a creative boost.",
      contentFocus: "Share quick creative exercises, artistic tips, or inspiring examples that can reignite their passion and help them push through creative blocks."
    },
    evening: {
      time: "19:00",
      description: "This evening slot is for creators who work on personal projects after their day job or those reflecting on their creative journey.",
      contentFocus: "Focus on creative reflection, artistic growth, and inspiration for evening creative sessions or planning tomorrow's creative endeavors."
    }
  },
  heartbeats: {
    morning: {
      time: "08:00",
      description: "This morning slot helps people start their day with intention toward their relationships.",
      contentFocus: "Content should focus on daily relationship practices, communication tips, or ways to show love and appreciation that can be implemented throughout the day."
    },
    midday: {
      time: "14:00",
      description: "This afternoon post targets people during their workday when they might be thinking about their loved ones.",
      contentFocus: "Share quick relationship tips, thoughtful gestures, or reminders about the importance of connection that they can apply when they get home."
    },
    evening: {
      time: "21:00",
      description: "This evening slot is perfect for couples and individuals reflecting on their relationships at the end of the day.",
      contentFocus: "Focus on evening connection practices, relationship reflection, and content that helps strengthen bonds during quality time together."
    }
  }
};

/**
 * Determines the current time period based on the current time and brand's posting schedule
 */
export function getCurrentTimeOfDay(brand: BrandName): TimeOfDay {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinutes;

  const strategy = BRAND_TIME_STRATEGIES[brand];
  
  // Convert time strings to minutes for comparison
  const morningTime = timeStringToMinutes(strategy.morning.time);
  const middayTime = timeStringToMinutes(strategy.midday.time);
  const eveningTime = timeStringToMinutes(strategy.evening.time);

  // Calculate distances to each posting time
  const morningDistance = Math.abs(currentTimeInMinutes - morningTime);
  const middayDistance = Math.abs(currentTimeInMinutes - middayTime);
  const eveningDistance = Math.abs(currentTimeInMinutes - eveningTime);

  // Find the closest time period
  const minDistance = Math.min(morningDistance, middayDistance, eveningDistance);
  
  if (minDistance === morningDistance) return "morning";
  if (minDistance === middayDistance) return "midday";
  return "evening";
}

/**
 * Gets the time-specific content strategy for a brand and time period
 */
export function getTimeBasedStrategy(brand: BrandName, timeOfDay?: TimeOfDay) {
  const currentTimeOfDay = timeOfDay || getCurrentTimeOfDay(brand);
  return BRAND_TIME_STRATEGIES[brand][currentTimeOfDay];
}

/**
 * Converts time string (HH:MM) to minutes since midnight
 */
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}