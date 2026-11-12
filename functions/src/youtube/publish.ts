import { onSchedule } from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, type ScheduleDoc, type ShortDoc, type YoutubeCheckState, type YoutubeConnectionDoc } from "@shortflow/shared";
import { STORAGE_REGION, TOKEN_ENCRYPTION_KEY, YOUTUBE_CLIENT_SECRET } from "../config";
import { notify } from "../lib/activity";
import {
  createPublishContext,
  publishOneForModel,
  runChannelPublishModel,
  settleSchedule,
  type ChannelPublishResult,
  type ChannelTarget,
  type PublishContext,
} from "./channel-publisher";
import { getAccessToken } from "./connections";
import { fetchVideoStatus, setVideoPrivacy } from "./status";

const PAGE_SIZE = 100;
/** Publish this many independent channel models concurrently in a single sweep. */
const MAX_CHANNEL_CONCURRENCY = 4;
/** Stop starting new uploads this far into a run so the one in flight finishes before the timeout. */
const RUN_BUDGET_MS = 6 * 60 * 1000;
/** Longer than a run can live: a schedule still `uploading` after this was orphaned by a crash. */
const STUCK_AFTER_MS = 30 * 60 * 1000;

/**
 * "Upload now": publishes these schedules straight away instead of waiting for
 * the next sweep. Stops early when out of time or when YouTube says no more;
 * whatever is left is still due, so that channel's publish model picks it up.
 */
export async function publishNow(shortIds: string[], deadline: number): Promise<number> {
  const db = getFirestore();
  const context = createPublishContext();
  let published = 0;
  for (const shortId of shortIds) {
    if (Date.now() > deadline) break;
    const doc = await db.collection(COLLECTIONS.schedules).doc(shortId).get();
    if (!doc.exists) continue;
    const outcome = await publishOneForModel(doc, context);
    if (outcome === "published") published++;
    if (outcome === "stop_run" || outcome === "pause_connection") break;
  }
  return published;
}

/** A run that died mid-upload may or may not have created the video, so these are never retried automatically. */
async function failStuckUploads(context: PublishContext) {
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
    const [prefs, link] = await Promise.all([context.prefs(schedule.userId, schedule.connectionId), context.channelLink(schedule.connectionId)]);
    await settleSchedule(
      { ref: doc.ref, schedule, short },
      { status: "failed", message: "The upload was interrupted. Check your channel first — if the Short isn't there, schedule it again." },
      prefs,
      link,
    );
    logger.warn("Flagged interrupted upload", { shortId: doc.id, connectionId: schedule.connectionId });
  }
}

/** YouTube needs a few minutes after an upload before a copyright match shows. */
const CHECK_AFTER_MS = 10 * 60 * 1000;
/** Still "processing" after this long: stop waiting and leave it Private for the user to look at. */
const CHECK_GIVE_UP_MS = 3 * 60 * 60 * 1000;

/**
 * Second half of "check for copyright first". For each Short that went up
 * Unlisted and is waiting: ask YouTube how it is doing, then either switch it to
 * the visibility the user wanted, or leave it Unlisted and say why.
 */
async function releaseCheckedShorts(context: PublishContext) {
  const db = getFirestore();
  const waiting = await db.collection(COLLECTIONS.shorts).where("pendingPrivacy", "==", "public").limit(PAGE_SIZE).get();

  if (waiting.size > 0) logger.info("Shorts waiting for their copyright check", { count: waiting.size });
  for (const doc of waiting.docs) {
    const short = doc.data() as ShortDoc;
    const age = Date.now() - (short.publishedAt?.toMillis() ?? Date.now());
    if (age < CHECK_AFTER_MS || !short.youtubeVideoId || !short.pendingPrivacy) continue;

    const connectionId = short.connectionId ?? ((await db.collection(COLLECTIONS.schedules).doc(doc.id).get()).get("connectionId") as string | undefined);
    if (!connectionId || (await context.connectionState(connectionId)) !== "connected") continue;

    const [prefs, link] = await Promise.all([context.prefs(short.userId, connectionId), context.channelLink(connectionId)]);
    const finish = async (state: YoutubeCheckState, detail: string, notice: { kind: "success" | "error" | "warning"; title: string } | null) => {
      const batch = db.batch();
      batch.update(doc.ref, { pendingPrivacy: null, youtubeCheck: { state, detail, checkedAt: FieldValue.serverTimestamp() } });
      if (notice && (notice.kind === "success" ? prefs.uploads : prefs.failures)) {
        notify(batch, short.userId, { kind: notice.kind, title: notice.title, body: `“${short.title}”: ${detail}`, link });
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
        logger.info("Held Short kept private", { shortId: doc.id, connectionId, state: status.state });
        continue;
      }

      const released = await setVideoPrivacy(accessToken, short.youtubeVideoId, short.pendingPrivacy);
      if (released) {
        await finish("live", `No blocks reported, so it was made ${short.pendingPrivacy}.`, { kind: "success", title: "Short published" });
        logger.info("Held Short released", { shortId: doc.id, connectionId, privacy: short.pendingPrivacy });
      } else {
        await finish("live", "No blocks reported, but ShortFlow isn't allowed to change its visibility. Reconnect your channel on the YouTube page, or make it public in YouTube Studio.", {
          kind: "warning",
          title: "Short is clear but still Unlisted",
        });
      }
    } catch (error) {
      logger.warn("Copyright check postponed", { shortId: doc.id, connectionId, error: String(error) });
    }
  }
}

/**
 * Triggers each connected YouTube channel's own independent publish model.
 * Runs in the Storage bucket's region because uploads stream video bytes directly to YouTube.
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
    const deadline = startedAt + RUN_BUDGET_MS;
    const context = createPublishContext();

    await failStuckUploads(context);
    await releaseCheckedShorts(context).catch((error) => logger.error("Releasing checked Shorts failed", { error: String(error) }));

    // Enumerate active channels so every channel runs its own isolated query, budget and publish model.
    const connectionsSnap = await db.collection(COLLECTIONS.youtubeConnections).where("status", "==", "connected").get();
    const channels: ChannelTarget[] = connectionsSnap.docs.map((doc) => {
      const data = doc.data() as YoutubeConnectionDoc;
      return {
        connectionId: doc.id,
        userId: data.userId,
        channelId: data.channelId,
        channelTitle: data.channelTitle,
      };
    });

    let stopAll = false;
    let nextIndex = 0;
    const results: ChannelPublishResult[] = [];
    const workerCount = Math.min(MAX_CHANNEL_CONCURRENCY, channels.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < channels.length) {
          if (stopAll || Date.now() > deadline) break;
          const channel = channels[nextIndex++];
          const result = await runChannelPublishModel(
            channel,
            context,
            startedAt,
            deadline,
            () => stopAll,
            () => {
              stopAll = true;
            },
          );
          results.push(result);
        }
      }),
    );

    const published = results.reduce((sum, r) => sum + r.published, 0);
    const pausedConnections = results.filter((r) => r.pausedByQuota).length;
    logger.info("Publish sweep", {
      published,
      channelsProcessed: results.length,
      pausedConnections,
      stoppedEarly: stopAll,
    });
  },
);
