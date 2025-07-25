export type Platform = "TikTok" | "Instagram" | "YouTubeShorts";
export type BrandName = "DreamFloat" | "LoreSpark" | "HeartBeats" | "PeakShifts";
export type DayType = "weekday" | "weekend";

export interface PostingSchedule {
  max_posts_per_day: number;
  best_times: {
    weekday: string[];
    weekend: string[];
  };
}

export interface PlatformSchedule {
  [key: string]: PostingSchedule;
}

export interface ScheduleConfig {
  [platform: string]: PlatformSchedule;
}

export const POSTING_SCHEDULE: ScheduleConfig = {
  "TikTok": {
    "DreamFloat": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "07:00",  // Middle of 6:00 AM–8:00 AM
          "13:00",  // Middle of 12:00 PM–2:00 PM
          "22:00"   // Middle of 9:00 PM–11:00 PM
        ],
        "weekend": [
          "08:00",  // Middle of 7:00 AM–9:00 AM
          "14:00",  // Middle of 1:00 PM–3:00 PM
          "22:30"   // Middle of 9:00 PM–12:00 AM
        ]
      }
    },
    "LoreSpark": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "08:00",  // Middle of 7:00 AM–9:00 AM
          "13:00",  // Middle of 12:00 PM–2:00 PM
          "19:00"   // Middle of 6:00 PM–8:00 PM
        ],
        "weekend": [
          "12:00",  // Middle of 11:00 AM–1:00 PM
          "16:00",  // Middle of 3:00 PM–5:00 PM
          "20:00"   // Middle of 7:00 PM–9:00 PM
        ]
      }
    },
    "HeartBeats": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "08:00",  // Middle of 7:00 AM–9:00 AM
          "14:00",  // Middle of 1:00 PM–3:00 PM
          "21:00"   // Middle of 8:00 PM–10:00 PM
        ],
        "weekend": [
          "10:00",  // Middle of 9:00 AM–11:00 AM
          "15:00",  // Middle of 2:00 PM–4:00 PM
          "21:00"   // Middle of 8:00 PM–10:00 PM
        ]
      }
    },
    "PeakShifts": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "07:30",  // Middle of 6:00 AM–9:00 AM
          "13:00",  // Middle of 12:00 PM–2:00 PM
          "18:00"   // Middle of 5:00 PM–7:00 PM
        ],
        "weekend": [
          "10:30",  // Middle of 9:00 AM–12:00 PM
          "17:00",  // Middle of 4:00 PM–6:00 PM
          "19:30"   // Middle of 7:00 PM–8:00 PM
        ]
      }
    }
  },
  "Instagram": {
    "DreamFloat": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "07:00",  // Middle of 6:00 AM–8:00 AM
          "12:30",  // Middle of 12:00 PM–1:00 PM
          "21:00"   // Middle of 8:00 PM–10:00 PM
        ],
        "weekend": [
          "08:00",  // Middle of 7:00 AM–9:00 AM
          "14:00",  // Middle of 1:00 PM–3:00 PM
          "22:00"   // Middle of 9:00 PM–11:00 PM
        ]
      }
    },
    "LoreSpark": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "09:00",  // Middle of 8:00 AM–10:00 AM
          "13:30",  // Middle of 12:00 PM–3:00 PM
          "16:30"   // Middle of 4:00 PM–5:00 PM
        ],
        "weekend": [
          "12:30",  // Middle of 11:00 AM–2:00 PM
          "17:00",  // Middle of 4:00 PM–6:00 PM
          "20:30"   // Middle of 8:00 PM–9:00 PM
        ]
      }
    },
    "HeartBeats": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "09:30",  // Middle of 8:00 AM–11:00 AM
          "15:00",  // Middle of 2:00 PM–4:00 PM
          "18:30"   // Middle of 6:00 PM–7:00 PM
        ],
        "weekend": [
          "11:30",  // Middle of 10:00 AM–1:00 PM
          "16:00",  // Middle of 3:00 PM–5:00 PM
          "20:00"   // Middle of 7:00 PM–9:00 PM
        ]
      }
    },
    "PeakShifts": {
      "max_posts_per_day": 3,
      "best_times": {
        "weekday": [
          "08:30",  // Middle of 7:00 AM–10:00 AM
          "13:00",  // Middle of 12:00 PM–2:00 PM
          "17:00"   // Middle of 4:00 PM–6:00 PM
        ],
        "weekend": [
          "10:30",  // Middle of 9:00 AM–12:00 PM
          "18:00",  // Middle of 5:00 PM–7:00 PM
          "20:30"   // Middle of 8:00 PM–9:00 PM
        ]
      }
    }
  },
  "YouTubeShorts": {
    "DreamFloat": {
      "max_posts_per_day": 2,
      "best_times": {
        "weekday": [
          "08:00",  // Middle of 7:00 AM–9:00 AM
          "23:30"   // Middle of 10:00 PM–1:00 AM
        ],
        "weekend": [
          "09:00",  // Middle of 8:00 AM–10:00 AM
          "23:30"   // Middle of 10:00 PM–1:00 AM
        ]
      }
    },
    "LoreSpark": {
      "max_posts_per_day": 2,
      "best_times": {
        "weekday": [
          "13:00",  // Middle of 12:00 PM–2:00 PM
          "20:30"   // Middle of 7:00 PM–10:00 PM
        ],
        "weekend": [
          "13:30",  // Middle of 12:00 PM–3:00 PM
          "20:30"   // Middle of 7:00 PM–10:00 PM
        ]
      }
    },
    "HeartBeats": {
      "max_posts_per_day": 2,
      "best_times": {
        "weekday": [
          "08:00",  // Middle of 7:00 AM–9:00 AM
          "21:00"   // Middle of 8:00 PM–10:00 PM
        ],
        "weekend": [
          "11:00",  // Middle of 10:00 AM–12:00 PM
          "21:00"   // Middle of 8:00 PM–10:00 PM
        ]
      }
    },
    "PeakShifts": {
      "max_posts_per_day": 2,
      "best_times": {
        "weekday": [
          "08:00",  // Middle of 7:00 AM–9:00 AM
          "19:00"   // Middle of 6:00 PM–8:00 PM
        ],
        "weekend": [
          "10:00",  // Middle of 9:00 AM–11:00 AM
          "19:00"   // Middle of 6:00 PM–8:00 PM
        ]
      }
    }
  }
};

export const BRAND_ICONS = {
  "DreamFloat": "/images/dream.png",
  "LoreSpark": "/images/lore.png", 
  "HeartBeats": "/images/heart.png",
  "PeakShifts": "/images/peak.png"
};

export const BRAND_COLORS = {
  "DreamFloat": "bg-purple-100 border-purple-300 text-purple-800",
  "LoreSpark": "bg-blue-100 border-blue-300 text-blue-800",
  "HeartBeats": "bg-pink-100 border-pink-300 text-pink-800",
  "PeakShifts": "bg-gray-100 border-gray-300 text-gray-800"
};

// Helper function to get posting times for a specific brand, platform, and day type
export function getPostingTimes(brand: BrandName, platform: Platform, dayType: DayType): string[] {
  return POSTING_SCHEDULE[platform]?.[brand]?.best_times[dayType] || [];
}

// Helper function to get max posts per day for a specific brand and platform
export function getMaxPostsPerDay(brand: BrandName, platform: Platform): number {
  return POSTING_SCHEDULE[platform]?.[brand]?.max_posts_per_day || 0;
}

// Helper function to determine if a date is weekend
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// Helper function to get day type
export function getDayType(date: Date): DayType {
  return isWeekend(date) ? "weekend" : "weekday";
}