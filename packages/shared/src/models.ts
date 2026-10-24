/**
 * ShortFlow Firestore data model.
 *
 * Single source of truth for document shapes used by the web app, Cloud Functions
 * and the FFmpeg worker. `firestore.rules` enforces the same field contracts —
 * keep both in sync when a field is added or renamed.
 *
 * Timestamps are always stored as Firestore Timestamps (UTC). The user's
 * timezone is only applied when displaying.
 */

/** Firestore `Timestamp` without importing a specific SDK (client and admin SDKs both satisfy it). */
export interface TimestampLike {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export const VIDEO_STATUSES = ["uploading", "uploaded", "queued", "processing", "completed", "failed"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const SHORT_STATUSES = ["ready", "scheduled", "uploading", "published", "failed", "quota_exceeded"] as const;
export type ShortStatus = (typeof SHORT_STATUSES)[number];

export const SCHEDULE_STATUSES = ["scheduled", "uploading", "published", "failed", "quota_exceeded"] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const JOB_TYPES = ["video_processing", "short_generation", "youtube_upload", "thumbnail_generation"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["queued", "processing", "completed", "failed", "quota_exceeded"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const PRIVACY_STATUSES = ["public", "unlisted", "private"] as const;
export type PrivacyStatus = (typeof PRIVACY_STATUSES)[number];

export const SHORT_DURATIONS = [30, 45, 60] as const;
export type ShortDuration = (typeof SHORT_DURATIONS)[number];

export const CROP_MODES = ["center", "smart", "blur", "fit"] as const;
export type CropMode = (typeof CROP_MODES)[number];

export const OUTPUT_QUALITIES = ["standard", "high", "max"] as const;
export type OutputQuality = (typeof OUTPUT_QUALITIES)[number];

/** Pluggable clipping strategies. Only `fixed` ships in v1; the rest are reserved for smart clipping. */
export const CLIPPING_STRATEGIES = ["fixed", "silence", "scene", "speech", "highlight"] as const;
export type ClippingStrategy = (typeof CLIPPING_STRATEGIES)[number];

export const SCHEDULE_INTERVALS_MINUTES = [30, 60, 120, 240, 360, 720, 1440] as const;
export type ScheduleIntervalMinutes = (typeof SCHEDULE_INTERVALS_MINUTES)[number];

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const ACTIVITY_TYPES = [
  "VIDEO_UPLOADED",
  "VIDEO_UPLOAD_FAILED",
  "VIDEO_DELETED",
  "VIDEO_PROCESSING_STARTED",
  "VIDEO_PROCESSING_COMPLETED",
  "VIDEO_PROCESSING_FAILED",
  "SHORT_GENERATED",
  "SHORT_SCHEDULED",
  "YOUTUBE_CONNECTED",
  "YOUTUBE_DISCONNECTED",
  "YOUTUBE_UPLOAD_STARTED",
  "YOUTUBE_UPLOAD_COMPLETED",
  "YOUTUBE_UPLOAD_FAILED",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// ─── Collections ──────────────────────────────────────────────────────────────

export const COLLECTIONS = {
  users: "users",
  settings: "settings",
  videos: "videos",
  shorts: "shorts",
  schedules: "schedules",
  jobs: "jobs",
  youtubeConnections: "youtubeConnections",
  /** Server-only. Holds encrypted OAuth refresh tokens; clients can never read it. */
  youtubeCredentials: "youtubeCredentials",
  /** Server-only. One-time OAuth `state` nonces (CSRF protection), auto-deleted by TTL. */
  oauthStates: "oauthStates",
  /** Images the user overlays on the top or bottom of their Shorts. */
  banners: "banners",
  activityLogs: "activityLogs",
  notifications: "notifications",
  /** Server-written. One per channel: the daily AI Short settings and how the last run went. */
  autoShorts: "autoShorts",
} as const;

// ─── Documents ────────────────────────────────────────────────────────────────

/** users/{uid} */
export interface UserDoc {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  timezone: string;
  createdAt: TimestampLike;
  lastLoginAt: TimestampLike;
  /** Server-controlled. */
  plan: "free" | "pro";
  /** Server-controlled. */
  youtubeConnected: boolean;
}

/** settings/{uid} */
export interface SettingsDoc {
  userId: string;
  processing: {
    shortDuration: ShortDuration;
    cropMode: CropMode;
    outputQuality: OutputQuality;
    clippingStrategy: ClippingStrategy;
  };
  publishing: {
    timezone: string;
    defaultPrivacy: PrivacyStatus;
    /** "HH:mm" in the user's timezone. */
    defaultUploadTime: string;
    titleTemplate: string;
    defaultDescription: string;
    defaultTags: string[];
    categoryId: string;
  };
  automation: {
    autoProcess: boolean;
    autoGenerate: boolean;
    autoSchedule: boolean;
    autoUpload: boolean;
    intervalMinutes: ScheduleIntervalMinutes;
    publishDays: Weekday[];
    maxPerDay: number;
    /** The user's own "HH:mm" times for each weekday. When present it replaces the start-time-and-gap pattern. */
    daySlots?: Partial<Record<Weekday, string[]>>;
  };
  storage: {
    deleteSourceAfterProcessing: boolean;
  };
  notifications: {
    processing: boolean;
    uploads: boolean;
    failures: boolean;
  };
  updatedAt: TimestampLike;
}

/** videos/{videoId} */
export interface VideoDoc {
  userId: string;
  title: string;
  fileName: string;
  storagePath: string;
  contentType: string;
  fileSize: number;
  status: VideoStatus;
  createdAt: TimestampLike;
  // Server-controlled ↓
  uploadedAt: TimestampLike | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  thumbnailPath: string | null;
  processingStartedAt: TimestampLike | null;
  processingCompletedAt: TimestampLike | null;
  shortsCount: number;
  activeJobId: string | null;
  errorMessage: string | null;
  /** Set when the user deleted the original but kept the Shorts. */
  sourceDeletedAt?: TimestampLike | null;
  /** The channel it was uploaded on, so it shows only there. Absent on ones made before channels were kept apart. */
  connectionId?: string | null;
}

/** shorts/{shortId} */
export interface ShortDoc {
  userId: string;
  videoId: string;
  segmentIndex: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  storagePath: string;
  thumbnailPath: string | null;
  cropMode: CropMode;
  status: ShortStatus;
  createdAt: TimestampLike;
  // User-editable metadata ↓
  title: string;
  description: string;
  tags: string[];
  privacy: PrivacyStatus;
  categoryId: string;
  // Server-controlled publishing state ↓
  publishAt: TimestampLike | null;
  youtubeVideoId: string | null;
  publishedAt: TimestampLike | null;
  errorMessage: string | null;
  /** What YouTube last reported about the uploaded video. Written by checkYouTubeStatus. */
  youtubeCheck?: YoutubeCheck | null;
  /**
   * Set while a Short is up as Unlisted waiting for its copyright check: the
   * visibility it switches to once it is confirmed to play. Null otherwise.
   */
  pendingPrivacy?: PrivacyStatus | null;
  /** Set once the video file was removed from Storage after its upload to YouTube. The thumbnail is kept. */
  fileDeletedAt?: TimestampLike | null;
  /** The channel it was made on (its video's channel), so it shows only there. Absent on ones made before channels were kept apart. */
  connectionId?: string | null;
}

/**
 * - `live`: playable, nothing restricting it.
 * - `processing`: YouTube hasn't finished with it yet.
 * - `blocked`: up, but hidden in some or all countries (usually a copyright claim).
 * - `rejected`: YouTube refused it (copyright, duplicate, terms…).
 * - `removed`: no longer on the channel.
 */
export type YoutubeCheckState = "live" | "processing" | "blocked" | "rejected" | "removed";

export interface YoutubeCheck {
  state: YoutubeCheckState;
  /** One sentence for the user. */
  detail: string;
  checkedAt: TimestampLike;
}

/** schedules/{shortId} — one schedule per Short, keyed by shortId, so a Short can never be double-scheduled. */
export interface ScheduleDoc {
  userId: string;
  shortId: string;
  connectionId: string;
  /** UTC instant. */
  publishAt: TimestampLike;
  /** IANA zone the user picked, kept for display/editing only. */
  timezone: string;
  privacy: PrivacyStatus;
  /** Upload as Unlisted and only go public once it is confirmed to play (no copyright block). */
  safePublish?: boolean;
  status: ScheduleStatus;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
  // Server-controlled ↓
  retryCount: number;
  lastAttemptAt: TimestampLike | null;
  errorMessage: string | null;
  youtubeVideoId: string | null;
}

/** jobs/{jobId} — written only by the backend. */
export interface JobDoc {
  userId: string;
  type: JobType;
  status: JobStatus;
  /** videoId for processing jobs, shortId for upload jobs. */
  sourceId: string;
  /** 0–100, reported by the worker. */
  progress: number;
  /** e.g. "Generating Short 14 / 30". */
  stage: string | null;
  completedSteps: number | null;
  totalSteps: number | null;
  attempt: number;
  createdAt: TimestampLike;
  startedAt: TimestampLike | null;
  completedAt: TimestampLike | null;
  error: string | null;
}

/** youtubeConnections/{connectionId} — public channel info, readable by the owner. Tokens live in youtubeCredentials. */
export interface YoutubeConnectionDoc {
  userId: string;
  channelId: string;
  channelTitle: string;
  channelHandle: string | null;
  channelThumbnailUrl: string | null;
  subscriberCount: number | null;
  status: "connected" | "expired" | "revoked";
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

/** youtubeCredentials/{connectionId} — server-only, same id as the connection. */
export interface YoutubeCredentialDoc {
  userId: string;
  channelId: string;
  /** AES-256-GCM, bound to the connection id. */
  encryptedRefreshToken: string;
  scopes: string[];
  updatedAt: TimestampLike;
}

/** oauthStates/{nonce} — server-only. */
export interface OAuthStateDoc {
  userId: string;
  returnOrigin: string;
  createdAt: TimestampLike;
  /** TTL field: Firestore deletes the doc after this time. */
  expiresAt: TimestampLike;
}

/** banners/{bannerId} — created and deleted by the owner; the image lives in Storage. */
export interface BannerDoc {
  userId: string;
  name: string;
  position: "top" | "bottom";
  storagePath: string;
  /** Pixel size of the image as uploaded. */
  width: number;
  height: number;
  createdAt: TimestampLike;
  /** The channel it was made on, so it shows only there. Absent on ones made before channels were kept apart. */
  connectionId?: string | null;
}

/** autoShorts/{connectionId} — written only by the backend; the owner reads it. */
export interface AutoShortsDoc {
  userId: string;
  connectionId: string;
  enabled: boolean;
  /** "HH:mm", India time: one Short is published at each, every day. */
  publishTimes: string[];
  privacy: PrivacyStatus;
  /** The next script to use from the content bank; it wraps round at the end. */
  nextScript: number;
  /** "YYYY-MM-DD" (India) that `doneSlots` is about. */
  slotDate: string | null;
  /** The publish times on `slotDate` that already have their Short. */
  doneSlots: string[];
  lastShortId: string | null;
  lastError: string | null;
  /** Set while a Short is being made, so two runs never make one at the same time. */
  runningSince: TimestampLike | null;
  /** Failed tries on `attemptDate`; it stops for the day after `AUTO_SHORTS_MAX_ATTEMPTS`. */
  attemptDate: string | null;
  attempts: number;
  /** Why the budget guard switched it off, until it is switched on again. */
  pausedReason: string | null;
  updatedAt: TimestampLike;
}

/**
 * Publishing slots must fall on :00 or :30 between 5 AM and 8:30 PM India time,
 * the hours the publish sweep runs (see publishDueShorts).
 */
export const AUTO_SHORTS_TIME_RE = /^(0[5-9]|1\d|20):(00|30)$/;
export const AUTO_SHORTS_DEFAULT_TIMES = ["08:00", "12:30", "17:30", "20:30"];
export const AUTO_SHORTS_MAX_SLOTS = 4;
export const AUTO_SHORTS_MAX_ATTEMPTS = 6;

/** Short clips that may close every AI Short, e.g. a laughing reaction. users/{uid}/autoShorts/{connectionId}/ending-{n}.mp4 */
export const AUTO_SHORTS_ENDING_MAX_BYTES = 30 * 1024 * 1024;
/** Only this much of an ending clip is used. */
export const AUTO_SHORTS_ENDING_MAX_SEC = 6;

/** The video every AI Short of a channel is filed under on the Videos and Shorts pages. */
export const autoVideoId = (connectionId: string) => `ai_${connectionId}`;

/** activityLogs/{logId} — written only by the backend. */
export interface ActivityLogDoc {
  userId: string;
  type: ActivityType;
  message: string;
  refType: "video" | "short" | "schedule" | "youtube" | null;
  refId: string | null;
  /** The channel it happened on, when it is about one. */
  connectionId?: string | null;
  createdAt: TimestampLike;
}

/** notifications/{notificationId} — written by the backend; the client may only mark as read. */
export interface NotificationDoc {
  userId: string;
  kind: "success" | "info" | "warning" | "error";
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: TimestampLike;
}
