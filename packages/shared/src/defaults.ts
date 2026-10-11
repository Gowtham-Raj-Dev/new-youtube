import type { SettingsDoc } from "./models";

/** Product branding — change here to rename the product everywhere. */
export const BRAND = {
  name: "ShortFlow",
  tagline: "Turn Long Videos Into Scheduled Shorts.",
} as const;

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** Values a new user starts with. Placeholders until the setup questionnaire is answered. */
export const DEFAULT_SETTINGS: Omit<SettingsDoc, "userId" | "updatedAt"> = {
  processing: {
    shortDuration: 60,
    cropMode: "blur",
    outputQuality: "high",
    clippingStrategy: "fixed",
  },
  publishing: {
    timezone: DEFAULT_TIMEZONE,
    defaultPrivacy: "public",
    defaultUploadTime: "18:00",
    titleTemplate: "{videoTitle} — Part {part}",
    defaultDescription: "Watch till the end!",
    defaultTags: ["shorts"],
    categoryId: "22",
  },
  automation: {
    autoProcess: false,
    autoGenerate: false,
    autoSchedule: false,
    autoUpload: false,
    intervalMinutes: 240,
    publishDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    maxPerDay: 6,
  },
  storage: {
    deleteSourceAfterProcessing: false,
  },
  notifications: {
    processing: true,
    uploads: true,
    failures: true,
  },
};
