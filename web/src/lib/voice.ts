import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { COLLECTIONS, VOICE_PITCH_MAX, VOICE_PITCH_MIN, storagePaths, type ShortDoc, type ShortVoice } from "@shortflow/shared";
import type { WithId } from "./firebase/hooks";
import { firebase } from "./firebase/client";
import { HELPER, HelperOfflineError } from "./local-splitter";
import { cutVideo } from "./trim";

/** Its voice can be changed while its file is still in ShortFlow and it isn't going up right now. */
export function canChangeVoice(short: ShortDoc): boolean {
  return !short.fileDeletedAt && ["ready", "scheduled", "failed", "quota_exceeded"].includes(short.status);
}

/** The Short's file with its voice pitched by the PC helper (1 = an untouched copy). */
async function pitched(url: string, pitch: number): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`${HELPER}/voice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, pitch }) });
  } catch {
    throw new HelperOfflineError();
  }
  // A helper started before voice changes existed doesn't know this address.
  if (res.status === 404) throw new Error("The PC helper that's running is an older version. Close it and start it again (stop and re-run “npm run dev”), then try again.");
  if (!res.ok) throw new Error("The PC helper couldn't change the voice. Check its window for details.");
  return res.blob();
}

/**
 * Gives one Short a new voice, or (`voice` null) its own voice back.
 * The first change keeps the untouched file as original.mp4; every later change
 * starts from that file, so changes never pile up on each other.
 */
export async function setShortVoice(short: WithId<ShortDoc>, voice: ShortVoice | null): Promise<void> {
  const { storage, db } = firebase();
  const uid = short.userId;
  const originalPath = storagePaths.shortOriginal(uid, short.id);
  const mp4 = { contentType: "video/mp4" };

  // A trimmed Short keeps its whole self as untrimmed.mp4: the voice is changed on that, then the trim is cut again.
  const untrimmedPath = storagePaths.shortUntrimmed(uid, short.id);
  if (!short.voice) {
    if (!voice) return; // already its own voice
    // Keep the untouched Short before anything changes it — the whole of it, if it was trimmed.
    const untouched = await pitched(await getDownloadURL(storageRef(storage, short.trim ? untrimmedPath : short.storagePath)), 1);
    await uploadBytes(storageRef(storage, originalPath), untouched, mp4);
  }
  const originalUrl = await getDownloadURL(storageRef(storage, originalPath));
  const pitch = voice ? Math.min(VOICE_PITCH_MAX, Math.max(VOICE_PITCH_MIN, Math.round(voice.pitch * 100) / 100)) : 1;
  const video = await pitched(originalUrl, pitch);
  if (short.trim) {
    await uploadBytes(storageRef(storage, untrimmedPath), video, { ...mp4, cacheControl: "private, max-age=0, no-cache" });
    const cut = await cutVideo(untrimmedPath, short.trim.startSec, short.trim.endSec);
    await uploadBytes(storageRef(storage, short.storagePath), cut, { ...mp4, cacheControl: "private, max-age=0, no-cache" });
  } else {
    await uploadBytes(storageRef(storage, short.storagePath), video, mp4);
  }
  await updateDoc(doc(db, COLLECTIONS.shorts, short.id), { voice: voice && pitch !== 1 ? { preset: voice.preset, pitch } : null });
}

export interface VoiceProgress {
  index: number;
  total: number;
}

/** Changes the voice of each Short in turn. Returns how many failed (the first error is thrown only if all of them did). */
export async function setVoices(shorts: WithId<ShortDoc>[], voice: ShortVoice | null, onProgress: (p: VoiceProgress) => void): Promise<{ done: number; failed: number; firstError: unknown }> {
  let done = 0;
  let failed = 0;
  let firstError: unknown = null;
  for (const [index, short] of shorts.entries()) {
    onProgress({ index, total: shorts.length });
    try {
      await setShortVoice(short, voice);
      done++;
    } catch (error) {
      // No helper means none of the rest can work either.
      if (error instanceof HelperOfflineError) throw error;
      failed++;
      firstError ??= error;
    }
  }
  return { done, failed, firstError };
}
