import { httpsCallable } from "firebase/functions";
import { deleteObject, getDownloadURL, listAll, ref as storageRef, uploadBytes } from "firebase/storage";
import { AUTO_SHORTS_ENDING_MAX_BYTES, storagePaths, type PrivacyStatus } from "@shortflow/shared";
import { firebase } from "./firebase/client";

export interface AutoShortsSettings {
  connectionId: string;
  enabled: boolean;
  publishTimes: string[];
  privacy: PrivacyStatus;
}

export async function saveAutoShorts(settings: AutoShortsSettings) {
  await httpsCallable<AutoShortsSettings, { ok: boolean }>(firebase().functions, "saveAutoShorts")(settings);
}

/** Makes one extra Short straight away; it goes out a couple of minutes after. Takes a minute or two. */
export async function makeAutoShortNow(connectionId: string) {
  const { data } = await httpsCallable<{ connectionId: string }, { shortId: string }>(firebase().functions, "makeAutoShortNow", { timeout: 540_000 })({ connectionId });
  return data.shortId;
}

export interface EndingClip {
  path: string;
  name: string;
  url: string;
}

/** The channel's ending clips, in the order they take turns. */
export async function listEndings(uid: string, connectionId: string): Promise<EndingClip[]> {
  const { storage } = firebase();
  const { items } = await listAll(storageRef(storage, storagePaths.autoShortsEndings(uid, connectionId)));
  const clips = items.filter((item) => /^ending-[^/]+\.mp4$/.test(item.name)).sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(clips.map(async (item) => ({ path: item.fullPath, name: item.name, url: await getDownloadURL(item) })));
}

/** Adds an ending clip. Throws an Error with a message fit to show the user. */
export async function addEnding(uid: string, connectionId: string, file: File) {
  if (file.type !== "video/mp4") throw new Error("Use an MP4 video.");
  if (file.size > AUTO_SHORTS_ENDING_MAX_BYTES) throw new Error("That clip is over 30 MB. Trim it to a few seconds first.");
  const id = Date.now().toString(36);
  await uploadBytes(storageRef(firebase().storage, storagePaths.autoShortsEnding(uid, connectionId, id)), file, { contentType: "video/mp4", cacheControl: "private, max-age=86400" });
}

export async function deleteEnding(path: string) {
  await deleteObject(storageRef(firebase().storage, path));
}
