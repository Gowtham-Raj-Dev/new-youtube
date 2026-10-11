import { HttpsError, onCall } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, type PrivacyStatus, type ShortDoc, type YoutubeCheckState } from "@shortflow/shared";
import { TOKEN_ENCRYPTION_KEY, YOUTUBE_CLIENT_SECRET } from "../config";
import { requireUid } from "../lib/auth";
import { getAccessToken } from "./connections";
import { TokenRevokedError } from "./oauth";

interface VideosResponse {
  items?: Array<{
    status?: { uploadStatus?: string; rejectionReason?: string; failureReason?: string; privacyStatus?: string };
    contentDetails?: { regionRestriction?: { blocked?: string[]; allowed?: string[] } };
  }>;
  error?: { message: string };
}

const REJECTIONS: Record<string, string> = {
  copyright: "YouTube rejected it for copyright.",
  claim: "YouTube rejected it because of a copyright claim.",
  duplicate: "YouTube rejected it as a duplicate of a video already on the channel.",
  inappropriate: "YouTube rejected it as inappropriate content.",
  legal: "YouTube rejected it for a legal reason.",
  length: "YouTube rejected it for its length.",
  termsOfUse: "YouTube rejected it for breaking its terms of use.",
  trademark: "YouTube rejected it for a trademark complaint.",
  uploaderAccountClosed: "The YouTube account that uploaded it was closed.",
  uploaderAccountSuspended: "The YouTube account that uploaded it is suspended.",
};

/** Turns what videos.list reports into a state and one sentence for the user. */
export function readVideoStatus(video: NonNullable<VideosResponse["items"]>[number] | undefined): { state: YoutubeCheckState; detail: string } {
  if (!video) return { state: "removed", detail: "This video is no longer on the channel. It was deleted or taken down." };

  const { uploadStatus, rejectionReason } = video.status ?? {};
  if (uploadStatus === "rejected") return { state: "rejected", detail: REJECTIONS[rejectionReason ?? ""] ?? "YouTube rejected this video." };
  if (uploadStatus === "deleted") return { state: "removed", detail: "This video was deleted from the channel." };
  if (uploadStatus === "failed") return { state: "rejected", detail: "YouTube couldn't process this video." };
  if (uploadStatus === "uploaded") return { state: "processing", detail: "YouTube is still processing it. Check again in a few minutes." };

  const { blocked, allowed } = video.contentDetails?.regionRestriction ?? {};
  if (allowed) {
    return { state: "blocked", detail: allowed.length === 0 ? "Blocked in every country — almost always a copyright claim." : `Viewable in only ${allowed.length} countries; blocked everywhere else.` };
  }
  if (blocked && blocked.length > 0) {
    return { state: "blocked", detail: `Blocked in ${blocked.length} ${blocked.length === 1 ? "country" : "countries"} — usually a copyright claim. Open YouTube Studio to see who claimed it.` };
  }
  return { state: "live", detail: "No blocks reported. Claims that only take the ad money don't show here — YouTube Studio lists those." };
}

/**
 * What a viewer sees on the video's watch page. The Data API doesn't report
 * Content ID blocks, but the player does: a claimed video comes back unplayable
 * with "blocked due to the claimed content by …". Works for public and unlisted
 * videos; a private one can't be seen this way, so the answer is `null`.
 */
export async function fetchViewerPlayability(videoId: string): Promise<{ playable: boolean; reason: string } | null> {
  const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&hl=en`, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      // Skips the cookie-consent page some regions get instead of the video.
      Cookie: "CONSENT=YES+1; SOCS=CAI",
    },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res?.ok) return null;

  const html = await res.text();
  const status = /"playabilityStatus":\{"status":"([A-Z_]+)"/.exec(html)?.[1];
  if (!status || status === "LOGIN_REQUIRED") return null; // private, age-gated, or a page we can't read
  if (status === "OK") return { playable: true, reason: "" };

  // Prefer the long explanation ("It was blocked due to the claimed content by Toho Co., Ltd..") over the bare "Video unavailable".
  const start = html.indexOf('"playabilityStatus"');
  const block = html.slice(start, start + 2500);
  const texts = [...block.matchAll(/"(?:content|simpleText|reason)":"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`) as string);
  const reason = texts.find((t) => /claim|copyright|blocked/i.test(t)) ?? texts.sort((a, b) => b.length - a.length)[0] ?? "Video unavailable";
  return { playable: false, reason: reason.replace(/\.{2,}$/, ".") };
}

export interface VideoStatus {
  state: YoutubeCheckState;
  detail: string;
  /** True when a viewer's-eye check confirmed it plays — the only way to rule out a copyright block. */
  confirmedPlayable: boolean;
}

/**
 * How a video is doing: videos.list (1 quota unit) for processing, rejection
 * and removal, then the watch page for copyright blocks. Throws if the API
 * doesn't answer.
 */
export async function fetchVideoStatus(accessToken: string, videoId: string): Promise<VideoStatus> {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as VideosResponse;
  if (!res.ok) throw new Error(`YouTube videos.list: ${json.error?.message ?? res.status}`);

  const video = json.items?.[0];
  const reported = readVideoStatus(video);
  if (reported.state !== "live") return { ...reported, confirmedPlayable: false };

  const viewer = await fetchViewerPlayability(videoId);
  if (viewer && !viewer.playable) return { state: "blocked", detail: viewer.reason, confirmedPlayable: false };
  if (viewer) return { state: "live", detail: "It plays for viewers — no copyright block. Claims that only take the ad money show in YouTube Studio, not here.", confirmedPlayable: true };
  return {
    state: "live",
    detail:
      video?.status?.privacyStatus === "private"
        ? "It's Private, so a copyright block can't be seen from outside. Make it Unlisted or check YouTube Studio."
        : "YouTube reports no problem, but we couldn't open its watch page to confirm. Try again in a moment.",
    confirmedPlayable: false,
  };
}

/**
 * Changes a video's visibility (videos.update, 50 quota units). False when the
 * connection lacks the manage-videos permission — it was made before that was asked for.
 */
export async function setVideoPrivacy(accessToken: string, videoId: string, privacy: PrivacyStatus): Promise<boolean> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/videos?part=status", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: videoId, status: { privacyStatus: privacy, selfDeclaredMadeForKids: false } }),
  });
  if (res.ok) return true;
  const json = (await res.json().catch(() => ({}))) as VideosResponse;
  if (res.status === 403) {
    logger.warn("Not allowed to change visibility", { videoId, error: json.error?.message });
    return false;
  }
  throw new Error(`YouTube videos.update: ${json.error?.message ?? res.status}`);
}

/**
 * Asks YouTube how an uploaded Short is doing — live, still processing, blocked
 * or rejected — and saves the answer on the Short. Costs 1 quota unit.
 */
export const checkYouTubeStatus = onCall<{ shortId?: string }>({ secrets: [YOUTUBE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY] }, async (request) => {
  const userId = requireUid(request.auth);
  const shortId = request.data?.shortId;
  if (typeof shortId !== "string" || !shortId) throw new HttpsError("invalid-argument", "Choose a Short.");

  const db = getFirestore();
  const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
  const [shortSnap, scheduleSnap] = await db.getAll(shortRef, db.collection(COLLECTIONS.schedules).doc(shortId));
  const short = shortSnap.data() as ShortDoc | undefined;
  if (!short || short.userId !== userId) throw new HttpsError("not-found", "That Short no longer exists.");
  if (!short.youtubeVideoId) throw new HttpsError("failed-precondition", "This Short hasn't been uploaded to YouTube yet.");
  const connectionId = scheduleSnap.get("connectionId") as string | undefined;
  if (!connectionId) throw new HttpsError("failed-precondition", "We no longer know which channel this Short went to.");

  let accessToken: string;
  try {
    accessToken = await getAccessToken(connectionId);
  } catch (error) {
    if (error instanceof TokenRevokedError) throw new HttpsError("failed-precondition", "YouTube access expired. Reconnect your channel, then check again.");
    throw new HttpsError("unavailable", "Couldn't reach YouTube. Try again in a moment.");
  }

  const status = await fetchVideoStatus(accessToken, short.youtubeVideoId).catch((error) => {
    logger.error("videos.list failed", { shortId, error: String(error) });
    throw new HttpsError("unavailable", "YouTube didn't answer. Try again in a moment.");
  });
  logger.info("YouTube status", { shortId, ...status });
  const result = { state: status.state, detail: status.detail };
  await shortRef.update({ youtubeCheck: { ...result, checkedAt: FieldValue.serverTimestamp() } });
  return result;
});
