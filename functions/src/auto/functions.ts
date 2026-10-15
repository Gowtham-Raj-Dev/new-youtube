import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  ADMIN_EMAILS,
  COLLECTIONS,
  PRIVACY_STATUSES,
  SHORT_HEIGHT,
  SHORT_WIDTH,
  autoVideoId,
  storagePaths,
  type AutoShortsDoc,
  type PrivacyStatus,
} from "@shortflow/shared";
import { ANTHROPIC_API_KEY } from "../config";
import { requireUid } from "../lib/auth";
import { logActivity, notify } from "../lib/activity";
import { PALETTES } from "./palettes";
import { renderShort } from "./render";
import { writeScript } from "./script";
import { narrate } from "./voice";

const ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;
/** A run older than this crashed; the next one may start. */
const RUN_LOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_DAY = 3;
/** Each run of the daily job makes at most this many, so it finishes inside the timeout. */
const PER_RUN = 2;
/** Rendering a minute of 1080×1920 frames wants the CPU. */
const HEAVY = { memory: "4GiB", cpu: 2, timeoutSeconds: 540, secrets: [ANTHROPIC_API_KEY] } as const;

/** "YYYY-MM-DD" in India. */
const istDate = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(ms);

/** Today's `HH:mm` (India) as a UTC instant; a time already past means a couple of minutes from now. */
function publishInstant(time: string, now: number): number {
  const [y, m, d] = istDate(now).split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const at = Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS;
  return at > now + 5 * 60 * 1000 ? at : now + 2 * 60 * 1000;
}

/** Only the owners use AI Shorts for now: each one costs a Claude call. */
function requireOwner(request: CallableRequest): string {
  const userId = requireUid(request.auth);
  const token = request.auth?.token;
  if (!token?.email || !token.email_verified || !ADMIN_EMAILS.includes(token.email)) {
    throw new HttpsError("permission-denied", "AI Shorts aren't available on this account yet.");
  }
  return userId;
}

async function ownedConnection(userId: string, connectionId: unknown) {
  if (typeof connectionId !== "string" || !connectionId) throw new HttpsError("invalid-argument", "Choose a channel.");
  const snap = await getFirestore().collection(COLLECTIONS.youtubeConnections).doc(connectionId).get();
  if (!snap.exists || snap.get("userId") !== userId) throw new HttpsError("not-found", "That channel isn't connected any more.");
  return snap;
}

/**
 * Writes, voices, renders and queues one AI Short for a channel. Returns the
 * new Short's id. It publishes at the channel's daily time, or straight away
 * if that has passed — the regular publish sweep does the upload.
 */
async function makeAutoShort(config: AutoShortsDoc): Promise<string> {
  const db = getFirestore();
  const { userId, connectionId } = config;
  const connection = await db.collection(COLLECTIONS.youtubeConnections).doc(connectionId).get();
  if (!connection.exists) throw new Error("The channel was disconnected.");
  const videoId = autoVideoId(connectionId);
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);

  const earlier = await db.collection(COLLECTIONS.shorts).where("videoId", "==", videoId).select("title", "createdAt").get();
  const recentTitles = earlier.docs
    .sort((a, b) => (b.get("createdAt")?.toMillis() ?? 0) - (a.get("createdAt")?.toMillis() ?? 0))
    .slice(0, 40)
    .map((d) => String(d.get("title")));

  const script = await writeScript(ANTHROPIC_API_KEY.value(), recentTitles);
  const lines = [...script.lines, script.outro];
  const narration = await narrate(lines.map((line) => line.voice));

  const workDir = await mkdtemp(join(tmpdir(), "ai-short-"));
  try {
    const handle = (connection.get("channelHandle") as string | null) ?? null;
    const rendered = await renderShort(
      {
        scenes: lines.map((line, i) => ({ screen: line.screen, highlight: line.highlight, ...narration.spans[i] })),
        narration,
        palette: PALETTES[script.palette],
        label: "Daily Motivation",
        handle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : (connection.get("channelTitle") as string),
        seed: Date.now() % 100_000,
      },
      workDir,
    );

    // Parts are numbered per channel; the transaction keeps two runs from taking the same number.
    const part = await db.runTransaction(async (tx) => {
      const video = await tx.get(videoRef);
      const next = ((video.get("shortsCount") as number | undefined) ?? 0) + 1;
      tx.set(videoRef, { userId, shortsCount: next }, { merge: true });
      return next;
    });
    const shortId = `${videoId}_${part}`;
    const videoPath = storagePaths.shortVideo(userId, shortId);
    const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
    const bucket = getStorage().bucket();
    await bucket.file(videoPath).save(rendered.video, { contentType: "video/mp4", resumable: false });
    await bucket.file(thumbnailPath).save(rendered.thumbnail, { contentType: "image/jpeg", resumable: false });

    const now = FieldValue.serverTimestamp();
    const publishAt = Timestamp.fromMillis(publishInstant(config.publishTime, Date.now()));
    const description = `${script.description}\n\nMade with ShortFlow.`;
    const batch = db.batch();
    // The channel's "video" that every AI Short is filed under. There is no original to cut again.
    batch.set(
      videoRef,
      {
        userId,
        title: "AI Motivation Shorts",
        fileName: "ai-shorts",
        storagePath: "",
        contentType: "video/mp4",
        fileSize: 0,
        status: "completed",
        uploadedAt: now,
        durationSec: null,
        width: SHORT_WIDTH,
        height: SHORT_HEIGHT,
        thumbnailPath,
        processingStartedAt: null,
        processingCompletedAt: now,
        activeJobId: null,
        errorMessage: null,
        sourceDeletedAt: now,
        connectionId,
        ...(earlier.empty ? { createdAt: now } : {}),
      },
      { merge: true },
    );
    batch.set(db.collection(COLLECTIONS.shorts).doc(shortId), {
      userId,
      videoId,
      segmentIndex: part,
      startSec: 0,
      endSec: rendered.durationSec,
      durationSec: rendered.durationSec,
      storagePath: videoPath,
      thumbnailPath,
      cropMode: "fit",
      status: "scheduled",
      createdAt: now,
      title: script.title.slice(0, 100),
      description: description.slice(0, 5000),
      tags: script.tags.slice(0, 15),
      privacy: config.privacy,
      categoryId: "22",
      publishAt,
      youtubeVideoId: null,
      publishedAt: null,
      errorMessage: null,
      connectionId,
    });
    batch.set(db.collection(COLLECTIONS.schedules).doc(shortId), {
      userId,
      shortId,
      connectionId,
      publishAt,
      timezone: ZONE,
      privacy: config.privacy,
      safePublish: false,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      lastAttemptAt: null,
      errorMessage: null,
      youtubeVideoId: null,
    });
    logActivity(batch, userId, { type: "SHORT_GENERATED", message: `Made today's AI Short “${script.title}”`, refType: "short", refId: shortId, connectionId });
    notify(batch, userId, { kind: "success", title: "AI Short ready", body: `“${script.title}” is queued for YouTube.`, link: "/ai-shorts" });
    await batch.commit();
    logger.info("AI Short made", { userId, connectionId, shortId, seconds: rendered.durationSec });
    return shortId;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Runs `makeAutoShort` under the channel's lock and records the outcome on its
 * settings. False when another run holds the lock, or today's tries are spent.
 */
async function runLocked(connectionId: string, { force }: { force: boolean }): Promise<string | null> {
  const db = getFirestore();
  const ref = db.collection(COLLECTIONS.autoShorts).doc(connectionId);
  const today = istDate(Date.now());

  const config = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const doc = snap.data() as AutoShortsDoc | undefined;
    if (!doc) return null;
    const running = doc.runningSince instanceof Timestamp && Date.now() - doc.runningSince.toMillis() < RUN_LOCK_MS;
    const attempts = doc.attemptDate === today ? doc.attempts : 0;
    if (running) return null;
    if (!force && (doc.lastRunDate === today || attempts >= MAX_ATTEMPTS_PER_DAY)) return null;
    tx.update(ref, { runningSince: FieldValue.serverTimestamp(), attemptDate: today, attempts: attempts + 1 });
    return doc;
  });
  if (!config) return null;

  try {
    const shortId = await makeAutoShort(config);
    await ref.update({ runningSince: null, lastRunDate: today, lastShortId: shortId, lastError: null, attempts: 0, updatedAt: FieldValue.serverTimestamp() });
    return shortId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("AI Short failed", { connectionId, error: message });
    await ref.update({ runningSince: null, lastError: message.slice(0, 500), updatedAt: FieldValue.serverTimestamp() });
    throw error;
  }
}

/** Turns a channel's daily AI Short on or off, and sets when it goes out. */
export const saveAutoShorts = onCall<{ connectionId?: string; enabled?: boolean; publishTime?: string; privacy?: PrivacyStatus }>(async (request) => {
  const userId = requireOwner(request);
  const { connectionId, enabled, publishTime, privacy } = request.data ?? {};
  await ownedConnection(userId, connectionId);
  if (typeof enabled !== "boolean") throw new HttpsError("invalid-argument", "Say whether AI Shorts are on.");
  if (typeof publishTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(publishTime)) throw new HttpsError("invalid-argument", "Choose a time like 18:00.");
  if (!privacy || !PRIVACY_STATUSES.includes(privacy)) throw new HttpsError("invalid-argument", "Choose who can watch.");

  const ref = getFirestore().collection(COLLECTIONS.autoShorts).doc(connectionId as string);
  const existing = await ref.get();
  await ref.set(
    {
      userId,
      connectionId,
      enabled,
      publishTime,
      privacy,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { lastRunDate: null, lastShortId: null, lastError: null, runningSince: null, attemptDate: null, attempts: 0 }),
    },
    { merge: true },
  );
  return { ok: true };
});

/** "Make one now": an extra AI Short for the channel, straight away. Takes a couple of minutes. */
export const makeAutoShortNow = onCall<{ connectionId?: string }>(HEAVY, async (request) => {
  const userId = requireOwner(request);
  const { connectionId } = request.data ?? {};
  await ownedConnection(userId, connectionId);
  const ref = getFirestore().collection(COLLECTIONS.autoShorts).doc(connectionId as string);
  if (!(await ref.get()).exists) throw new HttpsError("failed-precondition", "Save the AI Shorts settings for this channel first.");
  try {
    const shortId = await runLocked(connectionId as string, { force: true });
    if (!shortId) throw new HttpsError("failed-precondition", "An AI Short is already being made for this channel. Wait a few minutes.");
    return { shortId };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error instanceof Error ? error.message.slice(0, 300) : "The AI Short couldn't be made.");
  }
});

/**
 * Every hour from 5 AM to 7 PM India time: makes today's AI Short for each
 * channel that has them on and doesn't have one yet. A failed one is tried
 * again on the next run, up to three times a day.
 */
export const autoShortsDaily = onSchedule({ ...HEAVY, schedule: "10 5-19 * * *", timeZone: ZONE, maxInstances: 1, retryCount: 0 }, async () => {
  const today = istDate(Date.now());
  const configs = await getFirestore().collection(COLLECTIONS.autoShorts).where("enabled", "==", true).get();
  const due = configs.docs.filter((d) => d.get("lastRunDate") !== today);
  let made = 0;
  for (const doc of due) {
    if (made >= PER_RUN) break;
    try {
      if (await runLocked(doc.id, { force: false })) made++;
    } catch {
      // Recorded on the channel's settings; the next run tries again.
    }
  }
  logger.info("AI Shorts run", { due: due.length, made });
});
