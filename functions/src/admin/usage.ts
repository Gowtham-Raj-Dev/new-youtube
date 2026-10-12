import { HttpsError, onCall } from "firebase-functions/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { ADMIN_EMAIL, COLLECTIONS, type UsageReport, type UsageRow, type YoutubeConnectionDoc } from "@shortflow/shared";

/**
 * Who uses the app, how many channels each has connected and how much Storage
 * each takes. Sizes are read from the bucket itself, so they are what counts
 * towards the plan's limit. Only the owner's account may call it.
 */
export const adminUsage = onCall<void, Promise<UsageReport>>({ timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  const token = request.auth?.token;
  // An unverified address proves nothing: anyone can sign up with a password under any email.
  if (!token || token.email !== ADMIN_EMAIL || token.email_verified !== true) {
    throw new HttpsError("permission-denied", "This page is only for the owner of the app.");
  }

  const rows = new Map<string, UsageRow>();
  const row = (uid: string) => {
    let existing = rows.get(uid);
    if (!existing) {
      existing = { uid, email: null, displayName: null, photoURL: null, channels: 0, storageBytes: 0, videoBytes: 0, shortBytes: 0, files: 0, lastSignInAt: null };
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
  const [files] = await getStorage().bucket().getFiles({ autoPaginate: true });
  for (const file of files) {
    const bytes = Number(file.metadata.size ?? 0);
    totalBytes += bytes;
    const [root, uid, kind, sub] = file.name.split("/");
    if (root !== "users" || !uid) continue;
    const owner = row(uid);
    owner.storageBytes += bytes;
    owner.files++;
    if (kind === "videos" && sub === "original") owner.videoBytes += bytes;
    else if (kind === "shorts" && file.name.endsWith("/video.mp4")) owner.shortBytes += bytes;
  }

  return { users: [...rows.values()].sort((a, b) => b.storageBytes - a.storageBytes), totalBytes, generatedAt: Date.now() };
});
