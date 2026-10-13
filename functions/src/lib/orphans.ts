import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS } from "@shortflow/shared";

export interface BucketFile {
  name: string;
  bytes: number;
  /** Owner, for a file under `users/{uid}/`; null for anything else. */
  uid: string | null;
  kind: "video" | "short" | "other";
  /**
   * A Short's, a video's or a banner's file whose Firestore doc is gone, so the app no longer
   * shows it or can delete it. Happens when a Short's file was saved but
   * registering it failed or the tab was closed before it could be.
   */
  orphan: boolean;
  /** When the file was saved, UTC ms; 0 if unknown. */
  createdMs: number;
}

/** Every file in the bucket, marked with who owns it and whether the app still knows about it. Read-only. */
export async function scanBucket(): Promise<BucketFile[]> {
  const db = getFirestore();
  const [[files], shorts, videos, banners] = await Promise.all([
    getStorage().bucket().getFiles({ autoPaginate: true }),
    db.collection(COLLECTIONS.shorts).select().get(),
    db.collection(COLLECTIONS.videos).select().get(),
    db.collection(COLLECTIONS.banners).select("storagePath").get(),
  ]);
  const shortIds = new Set(shorts.docs.map((d) => d.id));
  const videoIds = new Set(videos.docs.map((d) => d.id));
  const bannerPaths = new Set(banners.docs.map((d) => d.get("storagePath") as string));

  return files.map((file) => {
    const [root, uid, area, a, b] = file.name.split("/");
    const owned = root === "users" && Boolean(uid);
    let kind: BucketFile["kind"] = "other";
    let orphan = false;
    if (owned && area === "shorts") {
      // users/{uid}/shorts/{shortId}/video.mp4 | thumbnail.jpg
      kind = b === "video.mp4" ? "short" : "other";
      orphan = !shortIds.has(a);
    } else if (owned && area === "videos" && a === "original") {
      // users/{uid}/videos/original/{videoId}/source.ext
      kind = "video";
      orphan = !videoIds.has(b);
    } else if (owned && area === "videos" && a === "thumbnails") {
      // users/{uid}/videos/thumbnails/{videoId}.jpg
      orphan = !videoIds.has((b ?? "").replace(/\.jpg$/, ""));
    } else if (owned && area === "banners") {
      // users/{uid}/banners/{bannerId}.ext
      orphan = !bannerPaths.has(file.name);
    }
    return { name: file.name, bytes: Number(file.metadata.size ?? 0), uid: owned ? uid : null, kind, orphan, createdMs: Date.parse(String(file.metadata.timeCreated ?? "")) || 0 };
  });
}

/**
 * Removes the leftover files (see `orphan`) that are older than `minAgeMs`, and
 * nothing else. The age keeps a Short that is being saved right now safe: its
 * file lands a moment before its doc does.
 */
export async function removeLeftovers(minAgeMs: number): Promise<{ files: number; bytes: number }> {
  const cutoff = Date.now() - minAgeMs;
  const leftovers = (await scanBucket()).filter((f) => f.orphan && f.createdMs > 0 && f.createdMs < cutoff);
  const bucket = getStorage().bucket();
  let bytes = 0;
  for (const leftover of leftovers) {
    await bucket.file(leftover.name).delete({ ignoreNotFound: true });
    bytes += leftover.bytes;
  }
  return { files: leftovers.length, bytes };
}
