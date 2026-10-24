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
  AUTO_SHORTS_MAX_ATTEMPTS,
  AUTO_SHORTS_MAX_SLOTS,
  AUTO_SHORTS_TIME_RE,
  COLLECTIONS,
  PRIVACY_STATUSES,
  SHORT_HEIGHT,
  SHORT_WIDTH,
  autoVideoId,
  storagePaths,
  type AutoShortsDoc,
  type PrivacyStatus,
} from "@shortflow/shared";
import { GEMINI_API_KEY } from "../config";
import { requireUid } from "../lib/auth";
import { logActivity, notify } from "../lib/activity";
import { planShort, type PlannedShort } from "./bank";
import { renderShort } from "./render";
import { geminiLines, narrationFromPcm, speakEach, type Narration } from "./voice";

const ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;
/** A run older than this crashed; the next one may start. */
const RUN_LOCK_MS = 15 * 60 * 1000;
/** Each run of the job makes at most this many, so it finishes inside the timeout. */
const PER_RUN = 2;
/** A slot's Short is made from this long before it goes out… */
const MAKE_AHEAD_MS = 2 * 60 * 60 * 1000;
/** …until this long after; a slot missed by more is skipped for the day. */
const MAKE_LATE_MS = 60 * 60 * 1000;
/** A moment of silence before the punch line, for comic timing. */
const PUNCH_PAUSE_SEC = 0.6;
/** Rendering a half-minute of 1080×1920 frames wants the CPU. */
const HEAVY = { memory: "4GiB" as const, cpu: 2, timeoutSeconds: 540, secrets: [GEMINI_API_KEY] };

/**
 * The Short's voice-over: Gemini voices the whole dialogue in one request when
 * a key is set — livelier, and a day's Shorts fit its free daily limit — and
 * Cloud Text-to-Speech, line by line, when there's no key or Gemini fails.
 */
async function voiceOver(plan: PlannedShort): Promise<Narration> {
  const lines = plan.lines.map(({ spoken, voice, speaker, kind }) => ({ text: spoken, voice, speaker, pauseBefore: kind === "punch" ? PUNCH_PAUSE_SEC : 0 }));
  const key = GEMINI_API_KEY.value();
  let spoken: Buffer[] | null = null;
  if (key && Object.keys(plan.geminiVoices).length <= 2) {
    try {
      spoken = await geminiLines(key, lines, plan.geminiVoices);
    } catch (error) {
      logger.warn("Gemini voice failed; using Cloud Text-to-Speech", { error: String(error) });
    }
  }
  return narrationFromPcm(lines, spoken ?? (await speakEach(lines, plan.voice)));
}

/** "YYYY-MM-DD" in India. */
const istDate = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(ms);

/** Today's `HH:mm` (India) as a UTC instant. */
function slotInstant(time: string, now: number): number {
  const [y, m, d] = istDate(now).split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS;
}

/** Today's slots still waiting for their Short, soonest first. */
function dueSlots(doc: AutoShortsDoc, now: number): string[] {
  const done = doc.slotDate === istDate(now) ? doc.doneSlots ?? [] : [];
  return [...(doc.publishTimes ?? [])]
    .sort()
    .filter((time) => !done.includes(time))
    .filter((time) => {
      const at = slotInstant(time, now);
      return now >= at - MAKE_AHEAD_MS && now <= at + MAKE_LATE_MS;
    });
}

/** Only the owners use AI Shorts for now: they share the project's render time and YouTube quota. */
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

/** Downloads one of the channel's ending clips, taking turns by `n`. Null when it has none. */
async function endingClip(userId: string, connectionId: string, n: number, workDir: string): Promise<string | null> {
  const [files] = await getStorage().bucket().getFiles({ prefix: storagePaths.autoShortsEndings(userId, connectionId) });
  const clips = files.filter((f) => /\/ending-[^/]+\.mp4$/.test(f.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (!clips.length) return null;
  const path = join(workDir, "ending.mp4");
  await clips[n % clips.length].download({ destination: path });
  return path;
}

/**
 * Voices, renders and queues the Short for script `n` of the content bank.
 * It publishes at `publishAt` — the regular publish sweep does the upload.
 */
async function makeAutoShort(config: AutoShortsDoc, n: number, publishAt: number): Promise<{ shortId: string; title: string }> {
  const db = getFirestore();
  const { userId, connectionId } = config;
  const connection = await db.collection(COLLECTIONS.youtubeConnections).doc(connectionId).get();
  if (!connection.exists) throw new Error("The channel was disconnected.");
  const videoId = autoVideoId(connectionId);
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);
  const plan = planShort(n);

  const narration = await voiceOver(plan);

  const workDir = await mkdtemp(join(tmpdir(), "ai-short-"));
  try {
    const handle = (connection.get("channelHandle") as string | null) ?? null;
    const rendered = await renderShort(
      {
        lines: plan.lines.map(({ say, kind }) => ({ screen: say[1], highlight: say[2], kind })),
        narration,
        label: plan.label,
        emoji: plan.emoji,
        handle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : (connection.get("channelTitle") as string),
        seed: n,
        endingPath: await endingClip(userId, connectionId, n, workDir),
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
    const at = Timestamp.fromMillis(Math.max(publishAt, Date.now() + 2 * 60 * 1000));
    const batch = db.batch();
    // The channel's "video" that every AI Short is filed under. There is no original to cut again.
    batch.set(
      videoRef,
      {
        userId,
        title: "AI Comedy Shorts",
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
        ...(part === 1 ? { createdAt: now } : {}),
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
      title: plan.title,
      description: plan.description.slice(0, 5000),
      tags: plan.tags.slice(0, 15),
      privacy: config.privacy,
      categoryId: "23", // Comedy
      publishAt: at,
      youtubeVideoId: null,
      publishedAt: null,
      errorMessage: null,
      connectionId,
    });
    batch.set(db.collection(COLLECTIONS.schedules).doc(shortId), {
      userId,
      shortId,
      connectionId,
      publishAt: at,
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
    logActivity(batch, userId, { type: "SHORT_GENERATED", message: `Made the AI Short “${plan.title}”`, refType: "short", refId: shortId, connectionId });
    notify(batch, userId, { kind: "success", title: "AI Short ready", body: `“${plan.title}” is queued for YouTube.`, link: "/ai-shorts" });
    await batch.commit();
    logger.info("AI Short made", { userId, connectionId, shortId, script: n, seconds: rendered.durationSec });
    return { shortId, title: plan.title };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * Makes one Short for a channel under its lock, and records the outcome on its
 * settings. `slot` is the publishing time it is for; null means "one extra, now".
 * Null when another run holds the lock, the slot is already done, or today's tries are spent.
 */
async function runLocked(connectionId: string, slot: string | null): Promise<string | null> {
  const db = getFirestore();
  const ref = db.collection(COLLECTIONS.autoShorts).doc(connectionId);
  const now = Date.now();
  const today = istDate(now);

  const claimed = await db.runTransaction(async (tx) => {
    const doc = (await tx.get(ref)).data() as AutoShortsDoc | undefined;
    if (!doc) return null;
    const running = doc.runningSince instanceof Timestamp && now - doc.runningSince.toMillis() < RUN_LOCK_MS;
    const attempts = doc.attemptDate === today ? doc.attempts : 0;
    if (running) return null;
    if (slot !== null && (!doc.enabled || attempts >= AUTO_SHORTS_MAX_ATTEMPTS || !dueSlots(doc, now).includes(slot))) return null;
    tx.update(ref, { runningSince: FieldValue.serverTimestamp(), attemptDate: today, attempts: attempts + 1 });
    return doc;
  });
  if (!claimed) return null;

  const n = claimed.nextScript ?? 0;
  try {
    const { shortId } = await makeAutoShort(claimed, n, slot ? slotInstant(slot, now) : now);
    await db.runTransaction(async (tx) => {
      const doc = (await tx.get(ref)).data() as AutoShortsDoc;
      const done = doc.slotDate === today ? doc.doneSlots ?? [] : [];
      tx.update(ref, {
        runningSince: null,
        nextScript: n + 1,
        slotDate: today,
        doneSlots: slot ? [...new Set([...done, slot])] : done,
        lastShortId: shortId,
        lastError: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return shortId;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("AI Short failed", { connectionId, slot, error: message });
    await ref.update({ runningSince: null, lastError: message.slice(0, 500), updatedAt: FieldValue.serverTimestamp() });
    throw error;
  }
}

/** Turns a channel's daily AI Shorts on or off, and sets when they go out. */
export const saveAutoShorts = onCall<{ connectionId?: string; enabled?: boolean; publishTimes?: string[]; privacy?: PrivacyStatus }>(async (request) => {
  const userId = requireOwner(request);
  const { connectionId, enabled, publishTimes, privacy } = request.data ?? {};
  await ownedConnection(userId, connectionId);
  if (typeof enabled !== "boolean") throw new HttpsError("invalid-argument", "Say whether AI Shorts are on.");
  if (!Array.isArray(publishTimes) || publishTimes.length < 1 || publishTimes.length > AUTO_SHORTS_MAX_SLOTS) {
    throw new HttpsError("invalid-argument", `Choose 1 to ${AUTO_SHORTS_MAX_SLOTS} publishing times.`);
  }
  if (!publishTimes.every((t) => typeof t === "string" && AUTO_SHORTS_TIME_RE.test(t))) {
    throw new HttpsError("invalid-argument", "Times must be on the hour or half hour, between 5:00 AM and 8:30 PM.");
  }
  if (!privacy || !PRIVACY_STATUSES.includes(privacy)) throw new HttpsError("invalid-argument", "Choose who can watch.");

  const ref = getFirestore().collection(COLLECTIONS.autoShorts).doc(connectionId as string);
  const existing = await ref.get();
  await ref.set(
    {
      userId,
      connectionId,
      enabled,
      publishTimes: [...new Set(publishTimes)].sort(),
      privacy,
      // Switching it on again is the owner's answer to the budget guard.
      ...(enabled ? { pausedReason: null } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : { nextScript: 0, slotDate: null, doneSlots: [], lastShortId: null, lastError: null, runningSince: null, attemptDate: null, attempts: 0, pausedReason: null }),
    },
    { merge: true },
  );
  return { ok: true };
});

/** "Make one now": an extra AI Short for the channel, published in a couple of minutes. */
export const makeAutoShortNow = onCall<{ connectionId?: string }>(HEAVY, async (request) => {
  const userId = requireOwner(request);
  const { connectionId } = request.data ?? {};
  await ownedConnection(userId, connectionId);
  const ref = getFirestore().collection(COLLECTIONS.autoShorts).doc(connectionId as string);
  if (!(await ref.get()).exists) throw new HttpsError("failed-precondition", "Save the AI Shorts settings for this channel first.");
  try {
    const shortId = await runLocked(connectionId as string, null);
    if (!shortId) throw new HttpsError("failed-precondition", "An AI Short is already being made for this channel. Wait a few minutes.");
    return { shortId };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error instanceof Error ? error.message.slice(0, 300) : "The AI Short couldn't be made.");
  }
});

/**
 * Every hour from 5 AM to 8 PM India time: makes the Short for each publishing
 * slot due in the next two hours, on every channel that has AI Shorts on.
 * A failed one is tried again on the next run.
 */
export const autoShortsDaily = onSchedule({ ...HEAVY, schedule: "10 5-20 * * *", timeZone: ZONE, maxInstances: 1, retryCount: 0 }, async () => {
  const now = Date.now();
  const configs = await getFirestore().collection(COLLECTIONS.autoShorts).where("enabled", "==", true).get();
  const work = configs.docs.flatMap((d) => dueSlots(d.data() as AutoShortsDoc, now).map((slot) => ({ connectionId: d.id, slot })));
  let made = 0;
  for (const { connectionId, slot } of work) {
    if (made >= PER_RUN) break;
    try {
      if (await runLocked(connectionId, slot)) made++;
    } catch {
      // Recorded on the channel's settings; the next run tries again.
    }
  }
  logger.info("AI Shorts run", { due: work.length, made });
});
