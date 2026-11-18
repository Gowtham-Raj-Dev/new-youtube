import { HttpsError, onCall } from "firebase-functions/https";
import { FieldValue, Timestamp, getFirestore, type Firestore, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { COLLECTIONS, DEFAULT_SETTINGS, hasAnySlot, nextSlots, slotRulesFrom, type SettingsDoc, type ShortDoc } from "@shortflow/shared";
import { TOKEN_ENCRYPTION_KEY, YOUTUBE_CLIENT_SECRET } from "../config";
import { requireUid } from "../lib/auth";
import { logActivity } from "../lib/activity";
import { publishNow } from "../youtube/publish";
import { createPublishContext, publishOneForModel } from "../youtube/channel-publisher";

const MAX_PER_CALL = 50;
/** Leaves a minute of the call's 9 for the upload in flight to finish; the sweep takes whatever is left. */
const UPLOAD_NOW_BUDGET_MS = 8 * 60 * 1000;
/** Never hand out a slot the publishing sweep may already be past. */
const LEAD_MS = 2 * 60 * 1000;

/** Reads per-channel settings (`settings/{connectionId}`), falling back to account defaults (`settings/{userId}`). */
async function channelSettings(db: Firestore, userId: string, connectionId?: string): Promise<Pick<SettingsDoc, "publishing" | "automation">> {
  if (connectionId) {
    const channelSnap = await db.collection(COLLECTIONS.settings).doc(connectionId).get();
    if (channelSnap.exists) return channelSnap.data() as SettingsDoc;
  }
  const userSnap = await db.collection(COLLECTIONS.settings).doc(userId).get();
  return (userSnap.data() as SettingsDoc | undefined) ?? DEFAULT_SETTINGS;
}

/** The channel to publish to: the one asked for, or the user's only connected one. */
async function pickConnection(userId: string, requested: unknown): Promise<string> {
  const snap = await getFirestore().collection(COLLECTIONS.youtubeConnections).where("userId", "==", userId).get();
  const connected = snap.docs.filter((d) => d.get("status") === "connected");

  if (typeof requested === "string" && requested) {
    if (!connected.some((d) => d.id === requested)) throw new HttpsError("failed-precondition", "That YouTube channel isn't connected any more.");
    return requested;
  }
  if (connected.length === 0) throw new HttpsError("failed-precondition", "Connect your YouTube channel first, then queue your Shorts.");
  if (connected.length > 1) throw new HttpsError("invalid-argument", "Choose which channel to publish to.");
  return connected[0].id;
}

/**
 * "Submit to queue": gives each Short the next free slot of the user's
 * publishing schedule, in the order given. Slots are worked out here, not in
 * the browser, so two tabs can never book the same one.
 */
export const queueShorts = onCall<{ shortIds?: string[]; connectionId?: string; now?: boolean; safe?: boolean }>(
  // Long timeout, memory and the YouTube secrets are for "Upload now", which uploads inside the call.
  { secrets: [YOUTUBE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY], timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
  // "Upload now": skip the schedule and upload straight away.
  const uploadNow = request.data?.now === true;
  const userId = requireUid(request.auth);
  const requested = request.data?.shortIds;
  if (!Array.isArray(requested) || requested.length === 0 || requested.length > MAX_PER_CALL || !requested.every((id) => typeof id === "string" && id)) {
    throw new HttpsError("invalid-argument", `Choose between 1 and ${MAX_PER_CALL} Shorts to queue.`);
  }
  const shortIds = [...new Set(requested)];

  const db = getFirestore();
  const connectionId = await pickConnection(userId, request.data?.connectionId);
  const settings = await channelSettings(db, userId, connectionId);
  const rules = slotRulesFrom(settings);
  if (!uploadNow && !hasAnySlot(rules)) throw new HttpsError("failed-precondition", "Pick at least one publishing day on the Schedule page first.");

  const slots = await db.runTransaction(async (tx) => {
    const snaps = await tx.getAll(...shortIds.map((id) => db.collection(COLLECTIONS.shorts).doc(id)));
    for (const snap of snaps) {
      const short = snap.data() as ShortDoc | undefined;
      if (!short || short.userId !== userId) throw new HttpsError("not-found", "One of those Shorts no longer exists.");
      if (short.connectionId && short.connectionId !== connectionId) {
        throw new HttpsError("failed-precondition", `“${short.title}” belongs to a different channel.`);
      }
      if (short.status !== "ready" && short.status !== "failed") {
        throw new HttpsError("failed-precondition", `“${short.title}” is already queued or published.`);
      }
    }

    const now = Date.now();
    // Query only this channel's upcoming queue so another channel's schedules are neither read nor locked.
    const upcoming = await tx.get(
      db.collection(COLLECTIONS.schedules).where("connectionId", "==", connectionId).where("publishAt", ">=", Timestamp.fromMillis(now)),
    );
    const taken = upcoming.docs
      .filter((d) => !shortIds.includes(d.id))
      .map((d) => (d.get("publishAt") as Timestamp).toMillis());
    // A millisecond apart so the sweep, which goes by publishAt, keeps the order given.
    const slots = uploadNow ? shortIds.map((_, i) => now + i) : nextSlots(rules, shortIds.length, now + LEAD_MS, taken);
    if (slots.length < shortIds.length) throw new HttpsError("failed-precondition", "Your schedule has no free slots. Check the Schedule page.");

    const stamp = FieldValue.serverTimestamp();
    snaps.forEach((snap, i) => {
      const publishAt = Timestamp.fromMillis(slots[i]);
      tx.set(db.collection(COLLECTIONS.schedules).doc(snap.id), {
        userId,
        shortId: snap.id,
        connectionId,
        publishAt,
        timezone: rules.timezone,
        privacy: snap.get("privacy"),
        safePublish: request.data?.safe === true,
        status: "scheduled",
        createdAt: stamp,
        updatedAt: stamp,
        retryCount: 0,
        lastAttemptAt: null,
        errorMessage: null,
        youtubeVideoId: null,
      });
      tx.update(snap.ref, { status: "scheduled", publishAt, errorMessage: null, ...(snap.get("connectionId") ? {} : { connectionId }) });
    });
    return slots;
  });

  const batch = db.batch();
  // Uploading now writes its own "published" entries; a "queued" one on top would be noise.
  if (!uploadNow) {
    logActivity(batch, userId, {
      type: "SHORT_SCHEDULED",
      message: `Queued ${slots.length} Short${slots.length === 1 ? "" : "s"} for YouTube`,
      refType: "schedule",
      refId: shortIds[0],
      connectionId,
    });
    await batch.commit();
  }

  // "Upload now" really is now: send them to YouTube inside this call rather than waiting for the sweep.
  const uploaded = uploadNow ? await publishNow(shortIds, Date.now() + UPLOAD_NOW_BUDGET_MS) : 0;
  return { queued: slots.length, firstAt: slots[0], lastAt: slots[slots.length - 1], uploaded };
  },
);

/** Applies `rules` independently to one channel's waiting schedules inside a transaction. */
function rescheduleChannelDocs(
  tx: Transaction,
  db: Firestore,
  channelDocs: QueryDocumentSnapshot[],
  rules: ReturnType<typeof slotRulesFrom>,
  now: number,
): number[] {
  const waiting = channelDocs.filter((d) => d.get("status") === "scheduled");
  if (waiting.length === 0) return [];
  if (!hasAnySlot(rules)) throw new HttpsError("failed-precondition", "Pick at least one publishing day first.");
  // Ones mid-upload or parked on a quota error keep their time and still count towards that channel's day.
  const fixed = channelDocs.filter((d) => d.get("status") !== "scheduled").map((d) => (d.get("publishAt") as Timestamp).toMillis());
  const slots = nextSlots(rules, waiting.length, now + LEAD_MS, fixed);
  if (slots.length < waiting.length) throw new HttpsError("failed-precondition", "Your schedule has no free slots. Check the publishing days.");

  const stamp = FieldValue.serverTimestamp();
  waiting.forEach((doc, i) => {
    const publishAt = Timestamp.fromMillis(slots[i]);
    tx.update(doc.ref, { publishAt, timezone: rules.timezone, updatedAt: stamp });
    tx.update(db.collection(COLLECTIONS.shorts).doc(doc.id), { publishAt });
  });
  return slots;
}

/**
 * Re-times everything still waiting in a channel's queue (or every channel's queue
 * independently when `connectionId` is omitted), keeping each channel's order.
 */
export const rescheduleQueue = onCall<{ connectionId?: string } | undefined>(async (request) => {
  const userId = requireUid(request.auth);
  const requestedConnectionId = typeof request.data?.connectionId === "string" && request.data.connectionId ? request.data.connectionId : undefined;
  const db = getFirestore();

  let preloadedRules: ReturnType<typeof slotRulesFrom> | null = null;
  if (requestedConnectionId) {
    const connSnap = await db.collection(COLLECTIONS.youtubeConnections).doc(requestedConnectionId).get();
    if (!connSnap.exists || connSnap.get("userId") !== userId) {
      throw new HttpsError("failed-precondition", "That YouTube channel isn't connected any more.");
    }
    preloadedRules = slotRulesFrom(await channelSettings(db, userId, requestedConnectionId));
    if (!hasAnySlot(preloadedRules)) throw new HttpsError("failed-precondition", "Pick at least one publishing day first.");
  }

  const moved = await db.runTransaction(async (tx) => {
    const now = Date.now();
    if (requestedConnectionId && preloadedRules) {
      const channelSnap = await tx.get(
        db
          .collection(COLLECTIONS.schedules)
          .where("connectionId", "==", requestedConnectionId)
          .where("status", "in", ["scheduled", "uploading", "quota_exceeded"])
          .orderBy("publishAt"),
      );
      return rescheduleChannelDocs(tx, db, channelSnap.docs, preloadedRules, now);
    }

    const mine = await tx.get(
      db.collection(COLLECTIONS.schedules).where("userId", "==", userId).where("status", "in", ["scheduled", "uploading", "quota_exceeded"]).orderBy("publishAt"),
    );

    const byConnection = new Map<string, QueryDocumentSnapshot[]>();
    for (const doc of mine.docs) {
      const connId = (doc.get("connectionId") as string | undefined) || "";
      const list = byConnection.get(connId) ?? [];
      list.push(doc);
      byConnection.set(connId, list);
    }

    const connectionIds = [...byConnection.keys()].filter((connId) => byConnection.get(connId)?.some((d) => d.get("status") === "scheduled"));
    if (connectionIds.length === 0) return [];

    const settingsIds = [...new Set([userId, ...connectionIds.filter(Boolean)])];
    const settingsSnaps = await tx.getAll(...settingsIds.map((id) => db.collection(COLLECTIONS.settings).doc(id)));
    const settingsMap = new Map(settingsSnaps.map((snap) => [snap.id, snap.data() as SettingsDoc | undefined]));
    const fallbackSettings = settingsMap.get(userId) ?? DEFAULT_SETTINGS;

    const allSlots: number[] = [];
    for (const connId of connectionIds) {
      const rules = slotRulesFrom(settingsMap.get(connId) ?? fallbackSettings);
      allSlots.push(...rescheduleChannelDocs(tx, db, byConnection.get(connId) ?? [], rules, now));
    }

    allSlots.sort((a, b) => a - b);
    return allSlots;
  });

  return { moved: moved.length, firstAt: moved[0] ?? null, lastAt: moved[moved.length - 1] ?? null };
});

/** YouTube wants a scheduled time comfortably in the future. */
const YOUTUBE_SCHEDULE_LEAD_MS = 15 * 60 * 1000;

/**
 * For one Short already in a channel's queue:
 * - `now`: upload it straight away with its own visibility (normally Public), its slot dropped.
 * - `youtube`: upload it now as Private with its slot as YouTube's publish time, so YouTube
 *   itself makes it public then (it shows as scheduled in YouTube Studio).
 */
export const publishQueued = onCall<{ shortId?: string; mode?: "now" | "youtube" }>(
  { secrets: [YOUTUBE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY], timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    const userId = requireUid(request.auth);
    const shortId = request.data?.shortId;
    const mode = request.data?.mode;
    if (typeof shortId !== "string" || !shortId || (mode !== "now" && mode !== "youtube")) throw new HttpsError("invalid-argument", "Choose a Short and how to upload it.");

    const db = getFirestore();
    const ref = db.collection(COLLECTIONS.schedules).doc(shortId);
    const youtubeAt = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.get("userId") !== userId) throw new HttpsError("not-found", "That Short isn't in the queue any more.");
      const status = snap.get("status") as string;
      if (status === "uploading") throw new HttpsError("failed-precondition", "This Short is uploading to YouTube right now.");
      if (status === "published") throw new HttpsError("failed-precondition", "This Short is already on YouTube.");
      const at = (snap.get("publishAt") as Timestamp).toMillis();
      if (mode === "youtube") {
        if (at < Date.now() + YOUTUBE_SCHEDULE_LEAD_MS) throw new HttpsError("failed-precondition", "Its slot is less than 15 minutes away. Use Upload now instead.");
        // A failed one goes back in line so the upload can claim it.
        if (status === "failed") tx.update(ref, { status: "scheduled", errorMessage: null, updatedAt: FieldValue.serverTimestamp() });
        return at;
      }
      const publishAt = Timestamp.now();
      tx.update(ref, { status: "scheduled", publishAt, errorMessage: null, updatedAt: FieldValue.serverTimestamp() });
      tx.update(db.collection(COLLECTIONS.shorts).doc(shortId), { publishAt });
      return undefined;
    });

    const outcome = await publishOneForModel(await ref.get(), createPublishContext(), youtubeAt);
    const after = await ref.get();
    if (after.get("status") !== "published") {
      throw new HttpsError("aborted", (after.get("errorMessage") as string | null) ?? (outcome === "pause_connection" ? "This channel is paused. Check the YouTube page." : "It didn't upload this time. Try again in a minute."));
    }
    return { youtubeVideoId: after.get("youtubeVideoId") as string, youtubeAt: youtubeAt ?? null };
  },
);

/** "Remove from queue": the Short goes back to ready. Not possible mid-upload or once published. */
export const unqueueShort = onCall<{ shortId?: string }>(async (request) => {
  const userId = requireUid(request.auth);
  const shortId = request.data?.shortId;
  if (typeof shortId !== "string" || !shortId) throw new HttpsError("invalid-argument", "Choose a Short.");

  const db = getFirestore();
  const scheduleRef = db.collection(COLLECTIONS.schedules).doc(shortId);
  const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);

  await db.runTransaction(async (tx) => {
    const [schedule, short] = await tx.getAll(scheduleRef, shortRef);
    if (!schedule.exists || schedule.get("userId") !== userId) throw new HttpsError("not-found", "That Short isn't in the queue any more.");
    if (schedule.get("status") === "uploading") throw new HttpsError("failed-precondition", "This Short is uploading to YouTube right now.");
    if (schedule.get("status") === "published") throw new HttpsError("failed-precondition", "This Short is already on YouTube.");

    tx.delete(scheduleRef);
    if (short.exists) tx.update(shortRef, { status: "ready", publishAt: null, errorMessage: null });
  });
  return { ok: true };
});
