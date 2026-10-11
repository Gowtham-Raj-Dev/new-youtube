import { HttpsError, onCall } from "firebase-functions/https";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, DEFAULT_SETTINGS, nextSlots, slotRulesFrom, type SettingsDoc, type ShortDoc } from "@shortflow/shared";
import { requireUid } from "../lib/auth";
import { logActivity } from "../lib/activity";

const MAX_PER_CALL = 50;
/** Never hand out a slot the publishing sweep may already be past. */
const LEAD_MS = 2 * 60 * 1000;

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
export const queueShorts = onCall<{ shortIds?: string[]; connectionId?: string }>(async (request) => {
  const userId = requireUid(request.auth);
  const requested = request.data?.shortIds;
  if (!Array.isArray(requested) || requested.length === 0 || requested.length > MAX_PER_CALL || !requested.every((id) => typeof id === "string" && id)) {
    throw new HttpsError("invalid-argument", `Choose between 1 and ${MAX_PER_CALL} Shorts to queue.`);
  }
  const shortIds = [...new Set(requested)];

  const db = getFirestore();
  const connectionId = await pickConnection(userId, request.data?.connectionId);
  const settings = ((await db.collection(COLLECTIONS.settings).doc(userId).get()).data() as SettingsDoc | undefined) ?? DEFAULT_SETTINGS;
  const rules = slotRulesFrom(settings);
  if (rules.publishDays.length === 0) throw new HttpsError("failed-precondition", "Pick at least one publishing day on the Schedule page first.");

  const slots = await db.runTransaction(async (tx) => {
    const snaps = await tx.getAll(...shortIds.map((id) => db.collection(COLLECTIONS.shorts).doc(id)));
    for (const snap of snaps) {
      const short = snap.data() as ShortDoc | undefined;
      if (!short || short.userId !== userId) throw new HttpsError("not-found", "One of those Shorts no longer exists.");
      if (short.status !== "ready" && short.status !== "failed") {
        throw new HttpsError("failed-precondition", `“${short.title}” is already queued or published.`);
      }
    }

    const now = Date.now();
    const upcoming = await tx.get(db.collection(COLLECTIONS.schedules).where("userId", "==", userId).where("publishAt", ">=", Timestamp.fromMillis(now)));
    const taken = upcoming.docs.filter((d) => !shortIds.includes(d.id)).map((d) => (d.get("publishAt") as Timestamp).toMillis());
    const slots = nextSlots(rules, shortIds.length, now + LEAD_MS, taken);
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
        status: "scheduled",
        createdAt: stamp,
        updatedAt: stamp,
        retryCount: 0,
        lastAttemptAt: null,
        errorMessage: null,
        youtubeVideoId: null,
      });
      tx.update(snap.ref, { status: "scheduled", publishAt, errorMessage: null });
    });
    return slots;
  });

  const batch = db.batch();
  logActivity(batch, userId, {
    type: "SHORT_SCHEDULED",
    message: `Queued ${slots.length} Short${slots.length === 1 ? "" : "s"} for YouTube`,
    refType: "schedule",
    refId: shortIds[0],
  });
  await batch.commit();

  return { queued: slots.length, firstAt: slots[0], lastAt: slots[slots.length - 1] };
});

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
