import type { SettingsDoc } from "./models";

/** Product branding — change here to rename the product everywhere. */
export const BRAND = {
  name: "ShortFlow",
  tagline: "Turn Long Videos Into Scheduled Shorts.",
} as const;

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** The one account that may open the Usage page (every user's channels and storage). The server checks it too. */
export const ADMIN_EMAIL = "gowthamraje1221@gmail.com";

/** Storage the Firebase free plan includes, shared by every user of the app. */
export const FREE_STORAGE_BYTES = 5 * 1024 ** 3;

/** One user on the owner's Usage page. */
export interface UsageRow {
  uid: string;
  /** Null when files are left over from an account that no longer exists. */
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** Channels connected and working right now. */
  channels: number;
  storageBytes: number;
  /** Of `storageBytes`: the original long videos, and the cut Shorts. The rest is thumbnails and banners. */
  videoBytes: number;
  shortBytes: number;
  files: number;
  /** UTC ms. */
  lastSignInAt: number | null;
}

/** What the `adminUsage` function returns: users with the biggest storage first. */
export interface UsageReport {
  users: UsageRow[];
  /** Everything in the bucket, including files that belong to no user. */
  totalBytes: number;
  generatedAt: number;
}

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
