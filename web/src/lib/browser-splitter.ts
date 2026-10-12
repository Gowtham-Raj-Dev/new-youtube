import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  BANNER_POSITIONS,
  COLLECTIONS,
  bannerHeight,
  newRunId,
  planSegments,
  reactionHeight,
  shortFileName,
  shortIdFor,
  shortTitle,
  storagePaths,
  type BannerDoc,
  type BannerPosition,
  type ReactionLook,
  type SettingsDoc,
  type TailMode,
  type VideoDoc,
} from "@shortflow/shared";
import { BrowserRenderError, loadBitmap, renderInBrowser, type BrowserRenderJob, type BrowserRenderResult } from "./browser-render";
import { firebase } from "./firebase/client";
import type { SplitProgress } from "./local-splitter";

/**
 * The same jobs the PC helper does — banners on a ready-made Short, and cutting
 * a video into Shorts — done in this browser instead, for when the helper isn't
 * running. Slower than the helper, but nothing has to be installed.
 */

type ChosenBanners = Partial<Record<BannerPosition, BannerDoc>>;
type ChosenReaction = (ReactionLook & { file: Blob }) | null;

/** The chosen banners as images ready to draw, loaded once for a whole batch of Shorts. */
export async function bannerBitmaps(chosen: ChosenBanners): Promise<BrowserRenderJob["banners"]> {
  const banners: BrowserRenderJob["banners"] = {};
  for (const position of BANNER_POSITIONS) {
    const banner = chosen[position];
    if (!banner) continue;
    const url = await getDownloadURL(storageRef(firebase().storage, banner.storagePath));
    banners[position] = { image: await loadBitmap(url), height: bannerHeight(banner.width, banner.height) };
  }
  return banners;
}

const reactionJob = (reaction: ChosenReaction): BrowserRenderJob["reaction"] =>
  reaction && { file: reaction.file, height: reactionHeight(reaction.percent), position: reaction.position, fit: reaction.fit, focus: reaction.focus, sound: reaction.sound };

/** Puts banners and a reaction video on a ready-made Short. `onProgress` gets the share done, 0–1. */
export function wrapInBrowser(
  file: Blob,
  banners: BrowserRenderJob["banners"],
  { cropMode, outputQuality }: SettingsDoc["processing"],
  reaction: ChosenReaction,
  onProgress?: (share: number) => void,
): Promise<BrowserRenderResult> {
  return renderInBrowser({ source: file, trim: null, cropMode, quality: outputQuality, banners, reaction: reactionJob(reaction), label: null }, onProgress);
}

/**
 * Cuts `video` into Shorts in this browser, saving each one to Storage and
 * registering it as soon as it is made. The video is read from Storage piece
 * by piece, never downloaded whole. Returns how many Shorts were made.
 */
export async function splitInBrowser(
  video: VideoDoc & { id: string },
  shortDuration: number,
  settings: Pick<SettingsDoc, "processing" | "publishing">,
  onProgress: (progress: SplitProgress) => void,
  chosenBanners: ChosenBanners,
  label: { template: string; x: number; y: number } | null,
  tail: TailMode,
  reaction: ChosenReaction,
): Promise<number> {
  const { db, storage } = firebase();
  const { cropMode, outputQuality } = settings.processing;
  const segments = planSegments(video.durationSec ?? 0, shortDuration, tail);
  if (segments.length === 0) throw new BrowserRenderError("This video's length isn't known yet, so it can't be cut in the browser. Refresh the page and try again.");

  const source = await getDownloadURL(storageRef(storage, video.storagePath));
  const banners = await bannerBitmaps(chosenBanners);
  const run = newRunId();
  const total = segments.length;

  for (const segment of segments) {
    const number = segment.index + 1;
    const stage = `Cutting Short ${number} / ${total} in your browser`;
    onProgress({ stage, percent: (segment.index / total) * 100 });

    const rendered = await renderInBrowser(
      {
        source,
        trim: { startSec: segment.startSec, endSec: segment.endSec },
        cropMode,
        quality: outputQuality,
        banners,
        reaction: reactionJob(reaction),
        label: label && { text: label.template.replaceAll("{n}", String(number)).replaceAll("{total}", String(total)), x: label.x, y: label.y },
      },
      // Rendering is nearly all of the work; the last sliver of each part is its upload.
      (share) => onProgress({ stage, percent: ((segment.index + share * 0.9) / total) * 100 }),
    );

    const shortId = shortIdFor(video.id, run, segment.index);
    const title = shortTitle(settings.publishing.titleTemplate, video.title, number, total);
    const storagePath = storagePaths.shortVideo(video.userId, shortId);
    // `attachment` makes the browser save the file when its URL is opened; <video> still plays it.
    await uploadBytes(storageRef(storage, storagePath), rendered.video, {
      contentType: "video/mp4",
      cacheControl: "private, max-age=86400",
      contentDisposition: `attachment; filename="${shortFileName(title)}"`,
    });

    let thumbnailPath: string | null = null;
    if (rendered.thumbnail) {
      thumbnailPath = storagePaths.shortThumbnail(video.userId, shortId);
      await uploadBytes(storageRef(storage, thumbnailPath), rendered.thumbnail, { contentType: "image/jpeg", cacheControl: "private, max-age=86400" });
    }

    // Field set must match firestore.rules.
    await setDoc(doc(db, COLLECTIONS.shorts, shortId), {
      userId: video.userId,
      videoId: video.id,
      segmentIndex: segment.index,
      startSec: segment.startSec,
      endSec: segment.endSec,
      durationSec: rendered.durationSec,
      storagePath,
      thumbnailPath,
      cropMode,
      status: "ready",
      createdAt: serverTimestamp(),
      title,
      description: settings.publishing.defaultDescription,
      tags: settings.publishing.defaultTags,
      privacy: settings.publishing.defaultPrivacy,
      categoryId: settings.publishing.categoryId,
      publishAt: null,
      youtubeVideoId: null,
      publishedAt: null,
      errorMessage: null,
    });
  }
  onProgress({ stage: "Done", percent: 100 });
  return total;
}
