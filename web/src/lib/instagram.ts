import { MAX_SHORT_SECONDS } from "@shortflow/shared";
import { HELPER } from "./local-splitter";

/** One video on an Instagram profile, as the PC helper lists it. */
export interface InstagramVideo {
  id: string;
  /** The post's short code, as in instagram.com/reel/<code>. */
  code: string;
  caption: string;
  durationSec: number;
  width: number;
  height: number;
  videoUrl: string;
  thumbnailUrl: string | null;
  /** Milliseconds. */
  takenAt: number;
  /** Already added as a Short from this PC. Left out by a helper from before this was remembered. */
  added?: boolean;
}

export interface InstagramPage {
  username: string;
  fullName: string;
  videos: InstagramVideo[];
  /** Hand back to get the next page; null on the last one. */
  next: string | null;
}

/**
 * What went wrong, in words for the user. `kind` says what to offer next: the
 * helper download ("offline"), a restart ("outdated") or the session box ("session").
 */
export class InstagramError extends Error {
  constructor(
    message: string,
    readonly kind: "offline" | "outdated" | "session" | "other" = "other",
  ) {
    super(message);
  }
}

/** Instagram is only reachable through the PC helper: a browser isn't allowed to ask it, and it turns cloud servers away. */
async function ask<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${HELPER}${path}`, init);
  } catch {
    throw new InstagramError("The PC helper isn't running. Open ShortFlowHelper.exe, leave its window open, and try again.", "offline");
  }
  if (res.ok) return (await res.json()) as T;
  const { error } = (await res.json().catch(() => ({}))) as { error?: string };
  // A helper started before the Instagram downloader existed doesn't know these addresses at all.
  if (res.status === 404 && error === "Not found.") throw new InstagramError("The PC helper that's running is an older version. Close it and start it again (stop and re-run “npm run dev”, or open the newest ShortFlowHelper.exe).", "outdated");
  throw new InstagramError(error ?? "The PC helper couldn't do that. Check its window for details.", res.status === 401 ? "session" : "other");
}

const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Whether the helper has an Instagram session saved on this PC. */
export async function instagramSessionSaved() {
  return (await ask<{ saved: boolean }>("/instagram/session")).saved;
}

/** Hands the `sessionid` cookie to the helper, which keeps it on this PC. It is never stored by the app or sent to the cloud. */
export async function saveInstagramSession(sessionId: string) {
  await ask("/instagram/session", json({ sessionId }));
}

export interface InstagramLogin {
  status: "idle" | "waiting" | "done" | "failed";
  error: string | null;
}

/** Has the helper open Instagram's own sign-in page in a browser window on this PC. Ask how it went with `instagramLoginState`. */
export function startInstagramLogin() {
  return ask<InstagramLogin>("/instagram/login", { method: "POST" });
}

export function instagramLoginState() {
  return ask<InstagramLogin>("/instagram/login");
}

export async function forgetInstagramSession() {
  await ask("/instagram/session", { method: "DELETE" });
}

/** A page of a profile's videos, newest first. `cursor` is the `next` of the page before. */
export function listInstagramVideos(profile: string, cursor?: string | null) {
  return ask<InstagramPage>("/instagram/profile", json({ profile, cursor: cursor ?? null }));
}

/** Has the helper remember these videos as added to Shorts, so they are left out the next time their profile is looked at. */
export async function markInstagramAdded(ids: string[]) {
  await ask("/instagram/added", json({ ids }));
}

/** Instagram's files can't be loaded from another site, so pictures and videos come through the helper. */
export function instagramFileUrl(url: string) {
  return `${HELPER}/instagram/file?url=${encodeURIComponent(url)}`;
}

/** Why this video can't become a Short, or null if it can. The same limits as for Shorts added from files. */
export function unfitForShorts(video: Pick<InstagramVideo, "durationSec" | "width" | "height">) {
  if (video.durationSec > MAX_SHORT_SECONDS) return "Over 3 min";
  if (video.width > video.height) return "Wide video";
  return null;
}

/** The first line of the caption — what the Short is titled until the user changes it. */
export function instagramTitle(video: Pick<InstagramVideo, "caption" | "code">, username: string) {
  const line = video.caption.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.replace(/[<>/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 90).trim() || `@${username} ${video.code}`;
}

/** Downloads a video through the helper as an MP4 file named after its caption, ready to be added like a file from disk. */
export async function fetchInstagramVideo(video: InstagramVideo, username: string): Promise<File> {
  let res: Response;
  try {
    res = await fetch(instagramFileUrl(video.videoUrl));
  } catch {
    throw new InstagramError("The PC helper isn't running. Open ShortFlowHelper.exe, leave its window open, and try again.", "offline");
  }
  if (!res.ok) throw new InstagramError("Instagram didn't hand over the file. Show the profile's videos again and retry.");
  return new File([await res.blob()], `${instagramTitle(video, username)}.mp4`, { type: "video/mp4" });
}
