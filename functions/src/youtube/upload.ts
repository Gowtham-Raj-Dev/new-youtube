// YouTube resumable upload (videos.insert). Plain fetch — no SDK needed.
import type { PrivacyStatus } from "@shortflow/shared";

const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

/** Must be a multiple of 256 KiB. Only one chunk is held in memory at a time. */
const CHUNK_BYTES = 8 * 1024 * 1024;
const CHUNK_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 120_000;

export interface UploadMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacy: PrivacyStatus;
}

/** Any byte source that supports ranged reads (a Storage object, a Buffer in tests). */
export interface UploadSource {
  size: number;
  contentType: string;
  /** Bytes `start`..`end`, both inclusive. */
  read: (start: number, end: number) => Promise<Buffer>;
}

/**
 * - `quota`: the API project's daily upload quota is used up — nothing else will upload until it resets.
 * - `upload_limit`: this channel hit YouTube's own daily upload cap.
 * - `auth`: YouTube refused the token for this channel.
 * - `rejected`: YouTube refused this video or its metadata; retrying won't help.
 * - `transient`: network or server trouble; safe to retry later.
 */
export type UploadFailure = "quota" | "upload_limit" | "auth" | "rejected" | "transient";

export class YouTubeUploadError extends Error {
  constructor(
    readonly kind: UploadFailure,
    /** YouTube's machine-readable reason, e.g. `quotaExceeded`. */
    readonly reason: string,
    message: string,
  ) {
    super(message);
  }
}

interface ApiErrorBody {
  error?: { message?: string; errors?: Array<{ reason?: string }> };
}

const QUOTA_REASONS = ["quotaExceeded", "dailyLimitExceeded"];
const THROTTLE_REASONS = ["rateLimitExceeded", "userRateLimitExceeded"];

async function toUploadError(res: Response): Promise<YouTubeUploadError> {
  const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
  const reason = body.error?.errors?.[0]?.reason ?? `http_${res.status}`;
  const message = body.error?.message ?? `YouTube responded ${res.status}`;

  let kind: UploadFailure = "rejected";
  if (reason === "uploadLimitExceeded") kind = "upload_limit";
  // The message check covers quota buckets that report a reason we don't know yet.
  else if (QUOTA_REASONS.includes(reason) || (res.status === 403 && /quota/i.test(message))) kind = "quota";
  else if (res.status >= 500 || res.status === 429 || THROTTLE_REASONS.includes(reason)) kind = "transient";
  else if (res.status === 401 || res.status === 403) kind = "auth";
  return new YouTubeUploadError(kind, reason, message);
}

function request(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

/** Opens a resumable session and returns its upload URL. Charged to the upload quota. */
async function startSession(accessToken: string, metadata: UploadMetadata, source: UploadSource): Promise<string> {
  const res = await request(`${UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": source.contentType,
      "X-Upload-Content-Length": String(source.size),
    },
    body: JSON.stringify({
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
      },
      status: { privacyStatus: metadata.privacy, selfDeclaredMadeForKids: false },
    }),
  });
  if (!res.ok) throw await toUploadError(res);

  const sessionUrl = res.headers.get("location");
  if (!sessionUrl) throw new YouTubeUploadError("transient", "no_session", "YouTube didn't return an upload session.");
  return sessionUrl;
}

/** `308 Resume Incomplete` carries `Range: bytes=0-N`; no header means nothing was stored yet. */
function nextOffset(res: Response): number {
  const match = /bytes=0-(\d+)/.exec(res.headers.get("range") ?? "");
  return match ? Number(match[1]) + 1 : 0;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Uploads `source` to the channel behind `accessToken` and returns the new video id.
 * Chunked so a dropped connection resumes from the last byte YouTube stored.
 * Throws YouTubeUploadError.
 */
export async function uploadToYouTube(accessToken: string, metadata: UploadMetadata, source: UploadSource): Promise<string> {
  if (source.size <= 0) throw new YouTubeUploadError("rejected", "empty_file", "The video file is empty.");

  const sessionUrl = await startSession(accessToken, metadata, source);
  const auth = { Authorization: `Bearer ${accessToken}` };
  let offset = 0;
  /** Failures in a row without YouTube storing anything new. */
  let stalls = 0;
  /** After a failure, ask where YouTube got to before sending anything again. */
  let resync = false;

  while (true) {
    let res: Response;
    try {
      if (resync) {
        res = await request(sessionUrl, { method: "PUT", headers: { ...auth, "Content-Range": `bytes */${source.size}` } });
      } else {
        const end = Math.min(offset + CHUNK_BYTES, source.size) - 1;
        const chunk = await source.read(offset, end);
        res = await request(sessionUrl, {
          method: "PUT",
          headers: { ...auth, "Content-Type": source.contentType, "Content-Range": `bytes ${offset}-${end}/${source.size}` },
          body: new Uint8Array(chunk),
        });
      }
    } catch (error) {
      if (++stalls >= CHUNK_ATTEMPTS) throw new YouTubeUploadError("transient", "network", `Upload interrupted: ${String(error)}`);
      resync = true;
      await pause(1000 * 2 ** stalls);
      continue;
    }

    if (res.status === 308) {
      const stored = nextOffset(res);
      if (stored > offset) stalls = 0;
      offset = stored;
      resync = false;
      continue;
    }
    if (res.ok) {
      const video = (await res.json()) as { id?: string };
      if (!video.id) throw new YouTubeUploadError("transient", "no_video_id", "YouTube accepted the upload but returned no video id.");
      return video.id;
    }

    const error = await toUploadError(res);
    if (error.kind !== "transient" || ++stalls >= CHUNK_ATTEMPTS) throw error;
    resync = true;
    await pause(1000 * 2 ** stalls);
  }
}
