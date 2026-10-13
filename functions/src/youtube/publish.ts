import { onSchedule } from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import { FieldValue, Timestamp, getFirestore, type DocumentReference, type DocumentSnapshot, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, type ScheduleDoc, type SettingsDoc, type ShortDoc, type YoutubeCheckState } from "@shortflow/shared";
import { STORAGE_REGION, TOKEN_ENCRYPTION_KEY, YOUTUBE_CLIENT_SECRET } from "../config";
import { logActivity, notify } from "../lib/activity";
import { getAccessToken } from "./connections";
import { MANAGE_SCOPE, TokenRevokedError } from "./oauth";
import { fetchVideoStatus, setVideoPrivacy } from "./status";
import { YouTubeUploadError, uploadToYouTube, type UploadSource } from "./upload";

const PAGE_SIZE = 50;
const MAX_UPLOADS_PER_RUN = 10;
const MAX_ATTEMPTS = 3;
/** Stop starting uploads this far into a run, so the one in flight finishes before the timeout. */
const RUN_BUDGET_MS = 6 * 60 * 1000;
/** Longer than a run can live: a schedule still `uploading` after this was orphaned by a crash. */
const STUCK_AFTER_MS = 30 * 60 * 1000;

type NotificationPrefs = SettingsDoc["notifications"];
type ConnectionState = "connected" | "paused" | "missing";

interface Claimed {
  ref: DocumentReference;
  schedule: ScheduleDoc;
  short: ShortDoc;
}

type Settlement =
  | { status: "published"; youtubeVideoId: string; held: boolean }
  | { status: "failed" | "quota_exceeded"; message: string }
  /** Back in line for the next sweep. */
  | { status: "scheduled"; countAttempt: boolean };

/** What the sweep should do after one schedule: carry on, skip this channel, or stop uploading altogether. */
type Outcome = "published" | "skipped" | "pause_connection" | "stop_run";

interface Run {
  connectionState: (connectionId: string) => Promise<ConnectionState>;
  prefs: (userId: string) => Promise<NotificationPrefs>;
  /** Whether this connection may change a video's visibility — only ones made since that permission was asked for. */
  canManage: (connectionId: string) => Promise<boolean>;
}

function memo<T>(load: (key: string) => Promise<T>) {
  const cache = new Map<string, Promise<T>>();
  return (key: string) => {
    let value = cache.get(key);
    if (!value) cache.set(key, (value = load(key)));
    return value;
  };
}

function startRun(): Run {
  const db = getFirestore();
  return {
    connectionState: memo(async (connectionId) => {
      const snap = await db.collection(COLLECTIONS.youtubeConnections).doc(connectionId).get();
      if (!snap.exists) return "missing";
      return snap.get("status") === "connected" ? "connected" : "paused";
    }),
    prefs: memo(async (userId) => {
      const snap = await db.collection(COLLECTIONS.settings).doc(userId).get();
      return (snap.get("notifications") as NotificationPrefs | undefined) ?? { processing: true, uploads: true, failures: true };
    }),
    canManage: memo(async (connectionId) => {
      const scopes = (await db.collection(COLLECTIONS.youtubeCredentials).doc(connectionId).get()).get("scopes") as string[] | undefined;
      return scopes?.includes(MANAGE_SCOPE) ?? false;
    }),
  };
}

/** YouTube API quotas reset at midnight Pacific Time. */
function lastQuotaResetMs(now: number): number {
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
 * Moves the schedule and its Short to `uploading` in one transaction, so two
 * overlapping runs can never upload the same Short. Null if there's nothing to upload.
 */
async function claim(ref: DocumentReference): Promise<Claimed | null> {
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
      // Already on YouTube — never upload it twice.
      tx.update(ref, { status: "published", youtubeVideoId: short.youtubeVideoId, errorMessage: null, updatedAt: now });
      return null;
    }
    tx.update(ref, { status: "uploading", lastAttemptAt: now, updatedAt: now });
    tx.update(shortRef, { status: "uploading", errorMessage: null });
    return { ref, schedule, short };
  });
}

/** "Check for copyright first": upload as Unlisted — off the channel page, but viewable enough for a block to show — and go public only once it plays. Only matters for a Short meant to be public. */
function heldForCheck(schedule: ScheduleDoc, short: ShortDoc, canManage: boolean): boolean {
  // Without permission to switch it to public afterwards, holding it back would strand it Unlisted — so it goes out public.
  return schedule.safePublish === true && short.privacy === "public" && canManage;
}

/** Writes the result of an attempt to the schedule and its Short together. */
async function settle({ ref, schedule, short }: Claimed, result: Settlement, prefs: NotificationPrefs) {
  const db = getFirestore();
  const shortRef = db.collection(COLLECTIONS.shorts).doc(ref.id);
  const { userId } = schedule;
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  if (result.status === "published") {
    const { youtubeVideoId, held } = result;
    batch.update(ref, { status: "published", youtubeVideoId, errorMessage: null, updatedAt: now });
    // Held back: it went up Unlisted and is released by releaseCheckedShorts once it is confirmed playable.
    // It lives on YouTube now, so the copy in Storage only costs space. The thumbnail stays for the Shorts page.
    const fileDeleted = await getStorage()
      .bucket()
      .file(short.storagePath)
      .delete({ ignoreNotFound: true })
      .then(() => true, (error) => (logger.warn("Couldn't delete uploaded Short's file", { shortId: ref.id, error: String(error) }), false));
    batch.update(shortRef, {
      status: "published",
      youtubeVideoId,
      publishedAt: now,
      errorMessage: null,
      pendingPrivacy: held ? short.privacy : null,
      youtubeCheck: null,
      ...(fileDeleted ? { fileDeletedAt: now } : {}),
    });
    logActivity(batch, userId, {
      type: "YOUTUBE_UPLOAD_COMPLETED",
      message: held ? `Uploaded “${short.title}” as Unlisted — checking it for copyright blocks` : `Published “${short.title}” to YouTube`,
      refType: "short",
      refId: ref.id,
      connectionId: schedule.connectionId,
    });
    if (prefs.uploads && !held) {
      notify(batch, userId, { kind: "success", title: "Short published", body: `“${short.title}” is now on YouTube.`, link: "/shorts" });
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
        link: "/shorts",
      });
    }
  }
  await batch.commit();
}

/**
 * "Upload now": publishes these schedules straight away instead of waiting for
 * the next sweep. Stops early when out of time or when YouTube says no more;
 * whatever is left is still due, so the sweep picks it up. Returns how many went up.
 */
export async function publishNow(shortIds: string[], deadline: number): Promise<number> {
  const db = getFirestore();
  const run = startRun();
  let published = 0;
  for (const shortId of shortIds) {
    if (Date.now() > deadline) break;
    const doc = await db.collection(COLLECTIONS.schedules).doc(shortId).get();
    if (!doc.exists) continue;
    const outcome = await publishOne(doc, run);
    if (outcome === "published") published++;
    if (outcome === "stop_run" || outcome === "pause_connection") break;
  }
  return published;
}

async function publishOne(doc: DocumentSnapshot, run: Run): Promise<Outcome> {
  const connectionId = doc.get("connectionId") as string;
  const connection = await run.connectionState(connectionId);
  // Expired or revoked: the user has been asked to reconnect, and the Short goes out once they do.
  if (connection === "paused") return "pause_connection";

  const claimed = await claim(doc.ref);
  if (!claimed) return "skipped";
  const { schedule, short } = claimed;
  const prefs = await run.prefs(schedule.userId);
  const fail = (message: string) => settle(claimed, { status: "failed", message }, prefs);

  if (connection === "missing") {
    await fail("The YouTube channel for this Short was disconnected. Connect it again, then schedule this Short again.");
    return "skipped";
  }

  const held = heldForCheck(schedule, short, await run.canManage(connectionId));
  let youtubeVideoId: string;
  try {
    const accessToken = await getAccessToken(connectionId);
    const source = await storageSource(short.storagePath);
    if (!source) {
      await fail("This Short's video file is missing. Generate it again from the original video.");
      return "skipped";
    }
    // The Short's own metadata, as last edited — it stays editable until this moment.
    youtubeVideoId = await uploadToYouTube(
      accessToken,
      { title: short.title, description: short.description, tags: short.tags, categoryId: short.categoryId, privacy: held ? "unlisted" : short.privacy },
      source,
    );
  } catch (error) {
    logger.warn("YouTube upload failed", { shortId: doc.id, connectionId, error: String(error), reason: error instanceof YouTubeUploadError ? error.reason : null });

    if (error instanceof TokenRevokedError) {
      // getAccessToken already marked the connection expired and asked the user to reconnect.
      await settle(claimed, { status: "scheduled", countAttempt: false }, prefs);
      return "pause_connection";
    }
    if (error instanceof YouTubeUploadError && error.kind !== "transient") {
      switch (error.kind) {
        case "quota":
          await settle(claimed, { status: "quota_exceeded", message: "ShortFlow reached YouTube's daily upload limit. This Short will upload automatically once the limit resets." }, prefs);
          return "stop_run";
        case "upload_limit":
          await settle(claimed, { status: "quota_exceeded", message: "Your channel reached YouTube's daily upload limit. This Short will upload automatically once the limit resets." }, prefs);
          return "pause_connection";
        case "auth":
          await fail("YouTube refused access to this channel. Reconnect it on the YouTube page, then schedule this Short again.");
          return "pause_connection";
        case "rejected":
          await fail(`YouTube rejected this Short: ${error.message.slice(0, 300)}`);
          return "skipped";
      }
    }
    // Network, Storage or YouTube server trouble — worth another go on a later sweep.
    if (schedule.retryCount + 1 >= MAX_ATTEMPTS) {
      await fail("YouTube couldn't be reached after several tries. Schedule this Short again to retry.");
    } else {
      await settle(claimed, { status: "scheduled", countAttempt: true }, prefs);
    }
    return "skipped";
  }

  // Outside the try on purpose: if this write fails the schedule stays `uploading`
  // and is flagged as interrupted, rather than being retried into a duplicate video.
  logger.info("Uploaded to YouTube", { shortId: doc.id, connectionId, youtubeVideoId });
  await settle(claimed, { status: "published", youtubeVideoId, held }, prefs);
  return "published";
}

/** A run that died mid-upload may or may not have created the video, so these are never retried automatically. */
async function failStuckUploads(run: Run) {
  const db = getFirestore();
  const cutoff = Date.now() - STUCK_AFTER_MS;
  // Filtered on publishAt so the (status, publishAt) index serves it; a claimed schedule was already due.
  const stuck = await db
    .collection(COLLECTIONS.schedules)
    .where("status", "==", "uploading")
    .where("publishAt", "<=", Timestamp.fromMillis(cutoff))
    .limit(PAGE_SIZE)
    .get();

  for (const doc of stuck.docs) {
    const schedule = doc.data() as ScheduleDoc;
    if ((schedule.lastAttemptAt?.toMillis() ?? 0) > cutoff) continue;

    const short = (await db.collection(COLLECTIONS.shorts).doc(doc.id).get()).data() as ShortDoc | undefined;
    if (!short) {
      await doc.ref.update({ status: "failed", errorMessage: "This Short no longer exists.", updatedAt: FieldValue.serverTimestamp() });
      continue;
    }
    await settle(
      { ref: doc.ref, schedule, short },
      { status: "failed", message: "The upload was interrupted. Check your channel first — if the Short isn't there, schedule it again." },
      await run.prefs(schedule.userId),
    );
    logger.warn("Flagged interrupted upload", { shortId: doc.id });
  }
}

/** YouTube needs a few minutes after an upload before a copyright match shows. */
const CHECK_AFTER_MS = 10 * 60 * 1000;
/** Still "processing" after this long: stop waiting and leave it Private for the user to look at. */
const CHECK_GIVE_UP_MS = 3 * 60 * 60 * 1000;

/**
 * Second half of "check for copyright first". For each Short that went up
 * Private and is waiting: ask YouTube how it is doing, then either switch it to
 * the visibility the user wanted, or leave it Private and say why.
 */
async function releaseCheckedShorts(run: Run) {
  const db = getFirestore();
  const waiting = await db.collection(COLLECTIONS.shorts).where("pendingPrivacy", "==", "public").limit(PAGE_SIZE).get();

  if (waiting.size > 0) logger.info("Shorts waiting for their copyright check", { count: waiting.size });
  for (const doc of waiting.docs) {
    const short = doc.data() as ShortDoc;
    const age = Date.now() - (short.publishedAt?.toMillis() ?? Date.now());
    if (age < CHECK_AFTER_MS || !short.youtubeVideoId || !short.pendingPrivacy) continue;

    const connectionId = (await db.collection(COLLECTIONS.schedules).doc(doc.id).get()).get("connectionId") as string | undefined;
    if (!connectionId || (await run.connectionState(connectionId)) !== "connected") continue;

    const prefs = await run.prefs(short.userId);
    const finish = async (state: YoutubeCheckState, detail: string, notice: { kind: "success" | "error" | "warning"; title: string } | null) => {
      const batch = db.batch();
      batch.update(doc.ref, { pendingPrivacy: null, youtubeCheck: { state, detail, checkedAt: FieldValue.serverTimestamp() } });
      if (notice && (notice.kind === "success" ? prefs.uploads : prefs.failures)) {
        notify(batch, short.userId, { kind: notice.kind, title: notice.title, body: `“${short.title}”: ${detail}`, link: "/shorts" });
      }
      await batch.commit();
    };

    try {
      const accessToken = await getAccessToken(connectionId);
      const status = await fetchVideoStatus(accessToken, short.youtubeVideoId);
      if (status.state === "processing") {
        if (age > CHECK_GIVE_UP_MS) await finish("processing", "YouTube never finished processing it, so it was left Unlisted. Check it in YouTube Studio.", { kind: "warning", title: "Short left Unlisted" });
        continue;
      }
      if (status.state !== "live") {
        await finish(status.state, `${status.detail} It was kept off your channel page (Unlisted).`, { kind: "error", title: "Short blocked on YouTube" });
        logger.info("Held Short kept private", { shortId: doc.id, state: status.state });
        continue;
      }

      // YouTube's own report (not blocked, not rejected) decides. The viewer's-eye check only adds detail when it
      // works: from a data centre the watch page often can't be read, and waiting on it stranded clear Shorts Unlisted.
      const released = await setVideoPrivacy(accessToken, short.youtubeVideoId, short.pendingPrivacy);
      if (released) {
        await finish("live", `No blocks reported, so it was made ${short.pendingPrivacy}.`, { kind: "success", title: "Short published" });
        logger.info("Held Short released", { shortId: doc.id, privacy: short.pendingPrivacy });
      } else {
        await finish("live", "No blocks reported, but ShortFlow isn't allowed to change its visibility. Reconnect your channel on the YouTube page, or make it public in YouTube Studio.", {
          kind: "warning",
          title: "Short is clear but still Unlisted",
        });
      }
    } catch (error) {
      // Token or network trouble: leave it waiting and try again on the next sweep.
      logger.warn("Copyright check postponed", { shortId: doc.id, error: String(error) });
    }
  }
}

/**
 * Uploads every Short whose schedule is due. Runs in the bucket's region because
 * it streams the video bytes from Storage to YouTube.
 */
export const publishDueShorts = onSchedule(
  {
    // Twice an hour, a minute after the :00 and :30 that publishing slots fall on, to keep the bill at next to nothing.
    // Only from 5 AM to 8:31 PM India time: nothing runs overnight, so a Short due then goes out at 5:01 AM.
    schedule: "1,31 5-20 * * *",
    timeZone: "Asia/Kolkata",
    region: STORAGE_REGION,
    secrets: [YOUTUBE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY],
    memory: "512MiB",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    const db = getFirestore();
    const startedAt = Date.now();
    const run = startRun();
    await failStuckUploads(run);
    await releaseCheckedShorts(run).catch((error) => logger.error("Releasing checked Shorts failed", { error: String(error) }));

    const quotaResetMs = lastQuotaResetMs(startedAt);
    const paused = new Set<string>();
    let published = 0;
    let cursor: QueryDocumentSnapshot | undefined;

    sweep: while (true) {
      let query = db
        .collection(COLLECTIONS.schedules)
        .where("status", "in", ["scheduled", "quota_exceeded"])
        .where("publishAt", "<=", Timestamp.fromMillis(startedAt))
        .orderBy("publishAt")
        .limit(PAGE_SIZE);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();

      // A channel that hit a limit since the last quota reset waits for the next one.
      for (const doc of page.docs) {
        const schedule = doc.data() as ScheduleDoc;
        if (schedule.status === "quota_exceeded" && (schedule.lastAttemptAt?.toMillis() ?? 0) >= quotaResetMs) {
          paused.add(schedule.connectionId);
        }
      }

      for (const doc of page.docs) {
        if (published >= MAX_UPLOADS_PER_RUN || Date.now() - startedAt > RUN_BUDGET_MS) break sweep;
        const connectionId = doc.get("connectionId") as string;
        if (paused.has(connectionId)) continue;

        const outcome = await publishOne(doc, run);
        if (outcome === "stop_run") break sweep;
        if (outcome === "pause_connection") paused.add(connectionId);
        if (outcome === "published") published++;
      }

      if (page.size < PAGE_SIZE) break;
      cursor = page.docs[page.docs.length - 1];
    }

    logger.info("Publish sweep", { published, pausedConnections: paused.size });
  },
);
