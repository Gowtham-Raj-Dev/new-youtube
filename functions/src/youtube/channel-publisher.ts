import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore, type DocumentReference, type DocumentSnapshot, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { ADMIN_EMAILS, COLLECTIONS, type ScheduleDoc, type SettingsDoc, type ShortDoc, type YoutubeConnectionDoc } from "@shortflow/shared";
import { DAILY_UPLOADS_PER_USER } from "../config";
import { logActivity, notify } from "../lib/activity";
import { getAccessToken } from "./connections";
import { MANAGE_SCOPE, TokenRevokedError } from "./oauth";
import { YouTubeUploadError, uploadToYouTube, type UploadSource } from "./upload";

/** Maximum Shorts each independent channel model may upload in one 30-minute sweep. */
export const MAX_UPLOADS_PER_CHANNEL_PER_RUN = 3;
const CHANNEL_QUEUE_SCAN_LIMIT = MAX_UPLOADS_PER_CHANNEL_PER_RUN * 3;
const MAX_ATTEMPTS = 3;
const DEFAULT_PREFS: SettingsDoc["notifications"] = { processing: true, uploads: true, failures: true };

export type NotificationPrefs = SettingsDoc["notifications"];
export type ConnectionState = "connected" | "paused" | "missing";

/** What a channel publish step returns: continue this channel, pause only this channel, or stop on project-wide API quota. */
export type PublishOutcome = "published" | "skipped" | "pause_connection" | "stop_run";

export interface ChannelTarget {
  connectionId: string;
  userId: string;
  channelId: string;
  channelTitle: string;
}

export interface ClaimedSchedule {
  ref: DocumentReference;
  schedule: ScheduleDoc;
  short: ShortDoc;
}

export type Settlement =
  | { status: "published"; youtubeVideoId: string; held: boolean; youtubeAt?: number }
  | { status: "failed" | "quota_exceeded"; message: string }
  | { status: "scheduled"; countAttempt: boolean };

export interface Allowance {
  used: number;
  limit: number;
}

export interface ChannelPublishResult {
  connectionId: string;
  channelId: string;
  channelTitle: string;
  dueFound: number;
  published: number;
  pausedByQuota: boolean;
  stoppedProjectQuota: boolean;
}

export interface PublishContext {
  connectionState: (connectionId: string) => Promise<ConnectionState>;
  prefs: (userId: string, connectionId?: string) => Promise<NotificationPrefs>;
  channelLink: (connectionId?: string) => Promise<string>;
  canManage: (connectionId: string) => Promise<boolean>;
  allowance: (userId: string, connectionId: string) => Promise<Allowance>;
}

function memo<T>(load: (key: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>();
  return (key: string) => {
    let value = cache.get(key);
    if (!value) cache.set(key, (value = load(key)));
    return value;
  };
}

/** YouTube API quotas reset at midnight Pacific Time. */
export function lastQuotaResetMs(now: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return now - (part("hour") * 3600 + part("minute") * 60 + part("second")) * 1000;
}

/** Shared read-memoized lookups parameterized per user and per channel (`connectionId`). */
export function createPublishContext(): PublishContext {
  const db = getFirestore();
  const isAdmin = memo(async (userId) => {
    const user = await getAuth().getUser(userId).catch(() => null);
    return Boolean(user?.email && user.emailVerified && ADMIN_EMAILS.includes(user.email));
  });
  const connectionDocs = memo(async (connectionId) => {
    const snap = await db.collection(COLLECTIONS.youtubeConnections).doc(connectionId).get();
    return snap.exists ? (snap.data() as YoutubeConnectionDoc) : null;
  });
  const settingsDocs = memo(async (docId) => {
    const snap = await db.collection(COLLECTIONS.settings).doc(docId).get();
    return snap.exists ? (snap.data() as Partial<SettingsDoc>) : null;
  });
  const allowances = new Map<string, Promise<Allowance>>();

  return {
    connectionState: memo(async (connectionId) => {
      const conn = await connectionDocs(connectionId);
      if (!conn) return "missing";
      return conn.status === "connected" ? "connected" : "paused";
    }),
    prefs: async (userId, connectionId) => {
      if (connectionId) {
        const channelSettings = await settingsDocs(connectionId);
        if (channelSettings?.notifications) return channelSettings.notifications;
      }
      const userSettings = await settingsDocs(userId);
      return userSettings?.notifications ?? DEFAULT_PREFS;
    },
    channelLink: async (connectionId) => {
      if (!connectionId) return "/shorts";
      const conn = await connectionDocs(connectionId);
      return conn?.channelId ? `/shorts?channel=${encodeURIComponent(conn.channelId)}` : "/shorts";
    },
    canManage: memo(async (connectionId) => {
      const scopes = (await db.collection(COLLECTIONS.youtubeCredentials).doc(connectionId).get()).get("scopes") as string[] | undefined;
      return scopes?.includes(MANAGE_SCOPE) ?? false;
    }),
    allowance: (userId, connectionId) => {
      let entry = allowances.get(connectionId);
      if (!entry) {
        entry = (async () => {
          if (await isAdmin(userId)) return { used: 0, limit: Infinity };
          const since = Timestamp.fromMillis(lastQuotaResetMs(Date.now()));
          const published = await db
            .collection(COLLECTIONS.shorts)
            .where("userId", "==", userId)
            .where("publishedAt", ">=", since)
            .select("connectionId")
            .get();
          let count = published.docs.filter((d) => d.get("connectionId") === connectionId).length;
          // Legacy Shorts published without connectionId still carry their channel on schedules/{shortId}.
          const missingConn = published.docs.filter((d) => !d.get("connectionId"));
          if (missingConn.length > 0) {
            const schedSnaps = await db.getAll(...missingConn.map((d) => db.collection(COLLECTIONS.schedules).doc(d.id)));
            count += schedSnaps.filter((s) => s.get("connectionId") === connectionId).length;
          }
          return { used: count, limit: DAILY_UPLOADS_PER_USER.value() };
        })();
        allowances.set(connectionId, entry);
      }
      return entry;
    },
  };
}

async function storageSource(path: string): Promise<UploadSource | null> {
  const file = getStorage().bucket().file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [metadata] = await file.getMetadata();
  return {
    size: Number(metadata.size),
    contentType: metadata.contentType ?? "video/mp4",
    read: async (start, end) => (await file.download({ start, end, validation: false }))[0],
  };
}

/**
 * Moves the schedule and its Short to `uploading` in one transaction so overlapping
 * runs can never upload the same Short twice.
 */
async function claimSchedule(ref: DocumentReference): Promise<ClaimedSchedule | null> {
  const db = getFirestore();
  const shortRef = db.collection(COLLECTIONS.shorts).doc(ref.id);
  return db.runTransaction(async (tx) => {
    const [scheduleSnap, shortSnap] = await tx.getAll(ref, shortRef);
    const schedule = scheduleSnap.data() as ScheduleDoc | undefined;
    const short = shortSnap.data() as ShortDoc | undefined;
    if (!schedule || (schedule.status !== "scheduled" && schedule.status !== "quota_exceeded")) return null;

    const now = FieldValue.serverTimestamp();
    if (!short || short.userId !== schedule.userId) {
      tx.update(ref, { status: "failed", errorMessage: "This Short no longer exists.", updatedAt: now });
      return null;
    }
    if (short.youtubeVideoId) {
      tx.update(ref, { status: "published", youtubeVideoId: short.youtubeVideoId, errorMessage: null, updatedAt: now });
      return null;
    }
    tx.update(ref, { status: "uploading", lastAttemptAt: now, updatedAt: now });
    tx.update(shortRef, { status: "uploading", errorMessage: null });
    return { ref, schedule, short };
  });
}

function heldForCheck(schedule: ScheduleDoc, short: ShortDoc, canManage: boolean): boolean {
  return schedule.safePublish === true && short.privacy === "public" && canManage;
}

/** Writes the outcome of an upload or crash recovery attempt onto both schedule and Short together. */
export async function settleSchedule(
  { ref, schedule, short }: ClaimedSchedule,
  result: Settlement,
  prefs: NotificationPrefs,
  channelShortsLink = "/shorts",
) {
  const db = getFirestore();
  const shortRef = db.collection(COLLECTIONS.shorts).doc(ref.id);
  const { userId } = schedule;
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  if (result.status === "published") {
    const { youtubeVideoId, held, youtubeAt } = result;
    batch.update(ref, { status: "published", youtubeVideoId, errorMessage: null, updatedAt: now, ...(youtubeAt ? { youtubeScheduled: true } : {}) });
    const fileDeleted = await getStorage()
      .bucket()
      .file(short.storagePath)
      .delete({ ignoreNotFound: true })
      .then(() => true, (error) => (logger.warn("Couldn't delete uploaded Short's file", { shortId: ref.id, error: String(error) }), false));
    // A Short whose voice was changed also kept its untouched file; it isn't needed any more either.
    if (short.voice) {
      await getStorage()
        .bucket()
        .file(short.storagePath.replace(/video\.mp4$/, "original.mp4"))
        .delete({ ignoreNotFound: true })
        .catch((error) => logger.warn("Couldn't delete uploaded Short's original file", { shortId: ref.id, error: String(error) }));
    }
    batch.update(shortRef, {
      status: "published",
      youtubeVideoId,
      connectionId: schedule.connectionId,
      publishedAt: now,
      errorMessage: null,
      pendingPrivacy: held ? short.privacy : null,
      youtubeCheck: null,
      ...(fileDeleted ? { fileDeletedAt: now } : {}),
    });
    logActivity(batch, userId, {
      type: "YOUTUBE_UPLOAD_COMPLETED",
      message: youtubeAt
        ? `Uploaded “${short.title}” to YouTube — YouTube makes it public at its scheduled time`
        : held
          ? `Uploaded “${short.title}” as Unlisted — checking it for copyright blocks`
          : `Published “${short.title}” to YouTube`,
      refType: "short",
      refId: ref.id,
      connectionId: schedule.connectionId,
    });
    if (prefs.uploads && !held) {
      notify(batch, userId, {
        kind: "success",
        title: youtubeAt ? "Short scheduled on YouTube" : "Short published",
        body: youtubeAt ? `“${short.title}” is on YouTube as Private and goes public at its scheduled time.` : `“${short.title}” is now on YouTube.`,
        link: channelShortsLink,
      });
    }
  } else if (result.status === "scheduled") {
    batch.update(ref, { status: "scheduled", updatedAt: now, ...(result.countAttempt ? { retryCount: FieldValue.increment(1) } : {}) });
    batch.update(shortRef, { status: "scheduled" });
  } else {
    const { status, message } = result;
    batch.update(ref, { status, errorMessage: message, updatedAt: now });
    batch.update(shortRef, { status, errorMessage: message });
    if (status === "failed") {
      logActivity(batch, userId, {
        type: "YOUTUBE_UPLOAD_FAILED",
        message: `Couldn't publish “${short.title}” to YouTube`,
        refType: "short",
        refId: ref.id,
        connectionId: schedule.connectionId,
      });
    }
    if (prefs.failures) {
      notify(batch, userId, {
        kind: status === "failed" ? "error" : "warning",
        title: status === "failed" ? "Short upload failed" : "YouTube upload limit reached",
        body: message,
        link: channelShortsLink,
      });
    }
  }
  await batch.commit();
}

/**
 * Publishes one scheduled Short within an isolated channel context.
 * `youtubeAt`: upload it now as Private and let YouTube make it public at that time.
 */
export async function publishOneForModel(doc: DocumentSnapshot, context: PublishContext, youtubeAt?: number): Promise<PublishOutcome> {
  const connectionId = doc.get("connectionId") as string;
  const connection = await context.connectionState(connectionId);
  if (connection === "paused") return "pause_connection";

  const claimed = await claimSchedule(doc.ref);
  if (!claimed) return "skipped";
  const { schedule, short } = claimed;
  const [prefs, link, allowance] = await Promise.all([
    context.prefs(schedule.userId, connectionId),
    context.channelLink(connectionId),
    context.allowance(schedule.userId, connectionId),
  ]);

  if (allowance.used >= allowance.limit) {
    const message = `This channel has published ${allowance.limit} Shorts today, the daily limit per channel. This Short will upload automatically once the limit resets.`;
    await settleSchedule(claimed, { status: "quota_exceeded", message }, prefs, link);
    return "pause_connection";
  }
  const fail = (message: string) => settleSchedule(claimed, { status: "failed", message }, prefs, link);

  if (connection === "missing") {
    await fail("The YouTube channel for this Short was disconnected. Connect it again, then schedule this Short again.");
    return "skipped";
  }

  // One YouTube schedules itself isn't held back for a copyright check: YouTube publishes it as it is.
  const held = !youtubeAt && heldForCheck(schedule, short, await context.canManage(connectionId));
  let youtubeVideoId: string;
  try {
    const accessToken = await getAccessToken(connectionId);
    const source = await storageSource(short.storagePath);
    if (!source) {
      await fail("This Short's video file is missing. Generate it again from the original video.");
      return "skipped";
    }
    youtubeVideoId = await uploadToYouTube(
      accessToken,
      {
        title: short.title,
        description: short.description,
        tags: short.tags,
        categoryId: short.categoryId,
        privacy: held ? "unlisted" : short.privacy,
        ...(youtubeAt ? { publishAt: new Date(youtubeAt).toISOString() } : {}),
      },
      source,
    );
  } catch (error) {
    logger.warn("YouTube upload failed", { shortId: doc.id, connectionId, error: String(error), reason: error instanceof YouTubeUploadError ? error.reason : null });

    if (error instanceof TokenRevokedError) {
      await settleSchedule(claimed, { status: "scheduled", countAttempt: false }, prefs, link);
      return "pause_connection";
    }
    if (error instanceof YouTubeUploadError && error.kind !== "transient") {
      switch (error.kind) {
        case "quota":
          await settleSchedule(claimed, { status: "quota_exceeded", message: "ShortFlow reached YouTube's daily upload limit. This Short will upload automatically once the limit resets." }, prefs, link);
          return "stop_run";
        case "upload_limit":
          await settleSchedule(claimed, { status: "quota_exceeded", message: "Your channel reached YouTube's daily upload limit. This Short will upload automatically once the limit resets." }, prefs, link);
          return "pause_connection";
        case "auth":
          await fail("YouTube refused access to this channel. Reconnect it on the YouTube page, then schedule this Short again.");
          return "pause_connection";
        case "rejected":
          await fail(`YouTube rejected this Short: ${error.message.slice(0, 300)}`);
          return "skipped";
      }
    }
    if (schedule.retryCount + 1 >= MAX_ATTEMPTS) {
      await fail("YouTube couldn't be reached after several tries. Schedule this Short again to retry.");
    } else {
      await settleSchedule(claimed, { status: "scheduled", countAttempt: true }, prefs, link);
    }
    return "skipped";
  }

  logger.info("Uploaded to YouTube", { shortId: doc.id, connectionId, youtubeVideoId });
  await settleSchedule(claimed, { status: "published", youtubeVideoId, held, youtubeAt }, prefs, link);
  allowance.used++;
  return "published";
}

async function isChannelQuotaPaused(db: Firestore, connectionId: string, quotaResetMs: number): Promise<boolean> {
  const pausedDocs = await db
    .collection(COLLECTIONS.schedules)
    .where("connectionId", "==", connectionId)
    .where("status", "==", "quota_exceeded")
    .limit(10)
    .get();
  return pausedDocs.docs.some((doc) => ((doc.get("lastAttemptAt") as Timestamp | null)?.toMillis() ?? 0) >= quotaResetMs);
}

/**
 * Self-contained publish model for a single connected YouTube channel.
 * Queries, quota checks, credentials, notification settings and upload budgets are
 * strictly scoped to `channel.connectionId` so channels never share a queue or stall each other.
 */
export async function runChannelPublishModel(
  channel: ChannelTarget,
  context: PublishContext,
  startedAt: number,
  deadline: number,
  shouldStopAll: () => boolean,
  onProjectQuotaExhausted: () => void,
): Promise<ChannelPublishResult> {
  const db = getFirestore();
  const { connectionId, userId, channelId, channelTitle } = channel;
  const quotaResetMs = lastQuotaResetMs(startedAt);

  if (await isChannelQuotaPaused(db, connectionId, quotaResetMs)) {
    logger.info("Channel publish model paused until quota reset", { connectionId, channelId, channelTitle });
    return { connectionId, channelId, channelTitle, dueFound: 0, published: 0, pausedByQuota: true, stoppedProjectQuota: false };
  }

  const dueSnap = await db
    .collection(COLLECTIONS.schedules)
    .where("connectionId", "==", connectionId)
    .where("status", "in", ["scheduled", "quota_exceeded"])
    .where("publishAt", "<=", Timestamp.fromMillis(startedAt))
    .orderBy("publishAt")
    .limit(CHANNEL_QUEUE_SCAN_LIMIT)
    .get();

  let published = 0;
  let paused = false;
  let stoppedProjectQuota = false;

  for (const doc of dueSnap.docs as QueryDocumentSnapshot[]) {
    if (shouldStopAll() || Date.now() > deadline) break;
    if (published >= MAX_UPLOADS_PER_CHANNEL_PER_RUN) break;

    const outcome = await publishOneForModel(doc, context);
    if (outcome === "stop_run") {
      stoppedProjectQuota = true;
      onProjectQuotaExhausted();
      break;
    }
    if (outcome === "pause_connection") {
      paused = true;
      break;
    }
    if (outcome === "published") {
      published++;
    }
  }

  if (dueSnap.size > 0 || published > 0 || paused) {
    logger.info("Channel publish model finished", {
      connectionId,
      userId,
      channelId,
      channelTitle,
      dueFound: dueSnap.size,
      published,
      pausedByQuota: paused,
      stoppedProjectQuota,
    });
  }

  return {
    connectionId,
    channelId,
    channelTitle,
    dueFound: dueSnap.size,
    published,
    pausedByQuota: paused,
    stoppedProjectQuota,
  };
}
