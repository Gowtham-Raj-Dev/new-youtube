/**
 * Firebase Storage layout. `storage.rules` matches these exact paths.
 *
 * users/{uid}/videos/original/{videoId}/source.{ext}
 * users/{uid}/videos/thumbnails/{videoId}.jpg
 * users/{uid}/shorts/{shortId}/video.mp4
 * users/{uid}/shorts/{shortId}/thumbnail.jpg
 * users/{uid}/banners/{bannerId}.{png|jpg|webp}
 */

export const ACCEPTED_VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/webm": "webm",
} as const;

export type AcceptedVideoType = keyof typeof ACCEPTED_VIDEO_TYPES;

/** Must match the size limit in storage.rules. */
export const MAX_SOURCE_VIDEO_BYTES = 10 * 1024 ** 3;

export function isAcceptedVideoType(contentType: string): contentType is AcceptedVideoType {
  return contentType in ACCEPTED_VIDEO_TYPES;
}

/** Browsers often report an empty type for .mkv (and sometimes .mov); fall back to the extension. */
export function videoTypeForFile(fileName: string, reportedType: string): AcceptedVideoType | null {
  if (isAcceptedVideoType(reportedType)) return reportedType;
  const ext = fileName.split(".").pop()?.toLowerCase();
  const match = Object.entries(ACCEPTED_VIDEO_TYPES).find(([, e]) => e === ext);
  return (match?.[0] as AcceptedVideoType | undefined) ?? null;
}

/** Matches source uploads; groups: uid, videoId, extension. */
export const SOURCE_VIDEO_PATH_RE = /^users\/([^/]+)\/videos\/original\/([^/]+)\/source\.(mp4|mov|mkv|webm)$/;

export const storagePaths = {
  sourceVideo: (uid: string, videoId: string, contentType: AcceptedVideoType) =>
    `users/${uid}/videos/original/${videoId}/source.${ACCEPTED_VIDEO_TYPES[contentType]}`,
  videoThumbnail: (uid: string, videoId: string) => `users/${uid}/videos/thumbnails/${videoId}.jpg`,
  shortVideo: (uid: string, shortId: string) => `users/${uid}/shorts/${shortId}/video.mp4`,
  shortThumbnail: (uid: string, shortId: string) => `users/${uid}/shorts/${shortId}/thumbnail.jpg`,
  banner: (uid: string, bannerId: string, extension: string) => `users/${uid}/banners/${bannerId}.${extension}`,
} as const;
