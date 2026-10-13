import { HttpsError, onCall, type CallableRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { removeLeftovers, scanBucket } from "../lib/orphans";
import { ADMIN_EMAILS, COLLECTIONS, type UsageReport, type UsageRow, type YoutubeConnectionDoc } from "@shortflow/shared";

/** A Short's file lands seconds before its doc; anything this old without one was never registered. */
const LEFTOVER_MIN_AGE_MS = 10 * 60 * 1000;

function requireOwner(request: CallableRequest<unknown>) {
  const token = request.auth?.token;
  // An unverified address proves nothing: anyone can sign up with a password under any email.
  if (!token?.email || !ADMIN_EMAILS.includes(token.email) || token.email_verified !== true) {
    throw new HttpsError("permission-denied", "This page is only for the owners of the app.");
  }
}

/**
 * Who uses the app, how many channels each has connected and how much Storage
 * each takes. Sizes are read from the bucket itself, so they are what counts
 * towards the plan's limit. Only the owner's account may call it.
 */
export const adminUsage = onCall<void, Promise<UsageReport>>({ timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  requireOwner(request);

  const rows = new Map<string, UsageRow>();
  const row = (uid: string) => {
    let existing = rows.get(uid);
    if (!existing) {
      existing = { uid, email: null, displayName: null, photoURL: null, channels: 0, storageBytes: 0, videoBytes: 0, shortBytes: 0, files: 0, orphanBytes: 0, orphanFiles: 0, lastSignInAt: null };
      rows.set(uid, existing);
    }
    return existing;
  };

  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const user of page.users) {
      const lastSignIn = Date.parse(user.metadata.lastSignInTime ?? "");
      Object.assign(row(user.uid), {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        lastSignInAt: Number.isNaN(lastSignIn) ? null : lastSignIn,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const connections = await getFirestore().collection(COLLECTIONS.youtubeConnections).select("userId", "status").get();
  for (const snap of connections.docs) {
    const connection = snap.data() as Pick<YoutubeConnectionDoc, "userId" | "status">;
    if (connection.status === "connected") row(connection.userId).channels++;
  }

  let totalBytes = 0;
  for (const file of await scanBucket()) {
    totalBytes += file.bytes;
    if (!file.uid) continue;
    const owner = row(file.uid);
    owner.storageBytes += file.bytes;
    owner.files++;
    if (file.kind === "video") owner.videoBytes += file.bytes;
    else if (file.kind === "short") owner.shortBytes += file.bytes;
    if (file.orphan) {
      owner.orphanBytes += file.bytes;
      owner.orphanFiles++;
    }
  }

  return { users: [...rows.values()].sort((a, b) => b.storageBytes - a.storageBytes), totalBytes, generatedAt: Date.now() };
});

/**
 * The owner's "Delete leftover files": removes the files of Shorts and videos that
 * are no longer in the app — the ones `adminUsage` counts as leftover — and returns how much was freed.
 */
export const adminRemoveLeftovers = onCall<void, Promise<{ files: number; bytes: number }>>({ timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  requireOwner(request);
  const freed = await removeLeftovers(LEFTOVER_MIN_AGE_MS);
  logger.info("Leftover files removed", freed);
  return freed;
});
