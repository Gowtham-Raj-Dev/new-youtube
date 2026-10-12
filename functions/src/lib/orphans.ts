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
   * A Short's or a video's file whose Firestore doc is gone, so the app no longer
   * shows it or can delete it. Happens when a Short's file was saved but
   * registering it failed or the tab was closed before it could be.
   */
  orphan: boolean;
}

/** Every file in the bucket, marked with who owns it and whether the app still knows about it. Read-only. */
export async function scanBucket(): Promise<BucketFile[]> {
  const db = getFirestore();
  const [[files], shorts, videos] = await Promise.all([
    getStorage().bucket().getFiles({ autoPaginate: true }),
    db.collection(COLLECTIONS.shorts).select().get(),
    db.collection(COLLECTIONS.videos).select().get(),
  ]);
  const shortIds = new Set(shorts.docs.map((d) => d.id));
  const videoIds = new Set(videos.docs.map((d) => d.id));

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
    }
    return { name: file.name, bytes: Number(file.metadata.size ?? 0), uid: owned ? uid : null, kind, orphan };
  });
}
