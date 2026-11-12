/**
 * Puts an Ulagam Ippo video on its channel's queue in the app and books it for
 * a time (India time), with the title, description and tags from its .txt and
 * its thumbnail. The app's publish sweep uploads it then, straight to Public.
 *
 *   npm run ex-to-app                                          lists the connected channels
 *   npm run ex-to-app -- <channel id> <folder no.> <YYYY-MM-DD> <HH:mm>          shows what it would do
 *   npm run ex-to-app -- <channel id> <folder no.> <YYYY-MM-DD> <HH:mm> --go     does it
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, storagePaths } from "@shortflow/shared";
import { CHANNEL_DIR } from "../src/explainer/explainer";

const PROJECT = "fir-4b5dc";
const VIDEOS = join(CHANNEL_DIR, "Videos");

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const [connectionId, folderArg, day, time] = args.filter((a) => !a.startsWith("--"));

  const cli = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const credDir = mkdtempSync(join(tmpdir(), "ui-cred-"));
  const credFile = join(credDir, "adc.json");
  writeFileSync(credFile, JSON.stringify({
    type: "authorized_user",
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    refresh_token: cli.tokens.refresh_token,
    quota_project_id: PROJECT,
  }));
  process.on("exit", () => rmSync(credDir, { recursive: true, force: true }));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credFile;
  process.env.GOOGLE_CLOUD_PROJECT = PROJECT;
  initializeApp({ credential: applicationDefault(), projectId: PROJECT, storageBucket: `${PROJECT}.firebasestorage.app` });
  const db = getFirestore();

  if (!connectionId) {
    // Which channel is which: newest first.
    const all = await db.collection(COLLECTIONS.youtubeConnections).get();
    const rows = all.docs.map((c) => ({ id: c.id, ...c.data() }) as Record<string, any>);
    rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    for (const r of rows) console.log(`${r.id} · ${r.status} · ${r.channelTitle ?? "?"} · ${r.channelHandle ?? "?"} · created ${r.createdAt?.toDate?.().toISOString?.() ?? "?"}`);
    return;
  }
  if (!folderArg || !day || !time) throw new Error("Usage: ex-to-app <channel id> <folder no.> <YYYY-MM-DD> <HH:mm> [--go]");

  const name = readdirSync(VIDEOS).find((f) => f === folderArg || f.startsWith(`${folderArg} `));
  if (!name) throw new Error(`No video folder ${folderArg} in ${VIDEOS}`);
  // --short=N: that part from the video's Shorts folder instead of the full video.
  const shortNo = args.find((a) => a.startsWith("--short="))?.slice(8);
  const prefix = shortNo ? `${shortNo.padStart(2, "0")} ` : "";
  const folder = shortNo ? join(VIDEOS, name, "Shorts") : join(VIDEOS, name);
  // The finished video, not a sample or test render; its smaller "(upload)" copy when there is one (slow uplink).
  const mp4s = readdirSync(folder).filter((f) => f.endsWith(".mp4") && f.startsWith(prefix) && !/^sample|\(test\)/.test(f));
  const mp4 = mp4s.find((f) => f.endsWith(" (upload).mp4")) ?? mp4s[0];
  const txt = readdirSync(folder).find((f) => f.endsWith(".txt") && f.startsWith(prefix));
  if (!mp4 || !txt) throw new Error(`No .mp4 and .txt in ${folder}`);
  const details = readFileSync(join(folder, txt), "utf8").replace(/\r/g, "");
  const title = /TITLE:?\n(.+)\n/.exec(details)![1].trim();
  const description = /DESCRIPTION:?\n([\s\S]+?)\n\nTAGS:?\n/.exec(details)![1].trim();
  const tags = /TAGS:?\n(.+)/.exec(details)![1].split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30);
  const hashtags = (title + " " + description).match(/#[^\s#]+/g) ?? [];
  // day "ready": only puts it on the app's page, unscheduled, for picking a time there.
  const ready = day === "ready";
  const [y, m, d] = ready ? [0, 0, 0] : day.split("-").map(Number);
  const [hh, mm] = ready ? [0, 0] : time.split(":").map(Number);
  const publishAt = ready ? 0 : Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 3600 * 1000;
  if (!ready && publishAt < Date.now() + 10 * 60 * 1000) throw new Error("That time is too soon or already past.");
  const probe = spawnSync(ffmpegPath as unknown as string, ["-hide_banner", "-i", join(folder, mp4)], { encoding: "utf8" }).stderr;
  const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe);
  const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 0;
  const tagChars = tags.join(",").length;
  console.log(`${mp4} · "${title}" (${title.length}/100) · description ${description.length}/5000 · ${tags.length} tags (${tagChars}/500 chars) · ${hashtags.length} hashtags · ${durationSec.toFixed(0)} s · ${day} ${time} IST${go ? "" : " · DRY RUN"}`);
  if (title.length > 100 || description.length > 5000 || tagChars > 500 || hashtags.length > 15) throw new Error("Metadata over YouTube's limits.");

  const channel = await db.collection(COLLECTIONS.youtubeConnections).doc(connectionId).get();
  if (!channel.exists || channel.get("status") !== "connected") throw new Error(`Channel ${connectionId} isn't connected in the app.`);
  console.log(`channel: ${channel.get("channelTitle")} ${channel.get("channelHandle") ?? ""}`);
  const userId = String(channel.get("userId"));
  const videoId = `ui_${channel.id}`;
  const shortId = `${videoId}_long-${folderArg.split(" ")[0]}${shortNo ? `-s${shortNo}` : ""}`;
  const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
  const existing = await shortRef.get();
  if (existing.exists && ready) throw new Error(`Already in the app (${existing.get("status")}).`);
  if (existing.exists && existing.get("status") !== "ready" && existing.get("status") !== "scheduled") throw new Error(`Already ${existing.get("status")} in the app.`);
  if (!go) return;

  const bucket = getStorage().bucket();
  const videoPath = storagePaths.shortVideo(userId, shortId);
  const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
  // In pieces with retries: this connection drops large uploads.
  for (let attempt = 1; ; attempt++) {
    try {
      // 1 MB pieces with a long wait: the uplink here can be as slow as 0.04 MB/s.
      const started = Date.now();
      const timer = setInterval(() => console.log(`uploading… ${((Date.now() - started) / 60000).toFixed(0)} min`), 5 * 60_000);
      try {
        await bucket.upload(join(folder, mp4), { destination: videoPath, resumable: true, chunkSize: 1024 * 1024, timeout: 180_000, metadata: { contentType: "video/mp4" } });
      } finally {
        clearInterval(timer);
      }
      break;
    } catch (error) {
      if (attempt >= 8) throw error;
      console.log(`upload failed (${String(error).slice(0, 60)}), trying again`);
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
  // A Short's thumbnail is a frame of it, saved next to it as "<NN> ….jpg".
  const thumb = shortNo ? readdirSync(folder).find((f) => f.endsWith(".jpg") && f.startsWith(prefix))! : "thumbnail.jpg";
  await bucket.upload(join(folder, thumb), { destination: thumbnailPath, resumable: false, metadata: { contentType: "image/jpeg" } });
  console.log("uploaded");

  const at = ready ? null : Timestamp.fromMillis(publishAt);
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  if (ready) {
    batch.set(shortRef, {
      userId, videoId, segmentIndex: 9000 + Number(folderArg.split(" ")[0]) * 10 + Number(shortNo ?? 0),
      startSec: 0, endSec: durationSec, durationSec, storagePath: videoPath, thumbnailPath, cropMode: "fit",
      status: "ready", createdAt: now, title, description, tags, privacy: "public", categoryId: "27",
      publishAt: null, youtubeVideoId: null, publishedAt: null, errorMessage: null, connectionId: channel.id,
    });
    await batch.commit();
    console.log(`on the app's Shorts page, ready to schedule → ${shortId}`);
    return;
  }
  batch.set(shortRef, {
    userId,
    videoId,
    segmentIndex: 9000 + Number(folderArg.split(" ")[0]) * 10 + Number(shortNo ?? 0),
    startSec: 0,
    endSec: durationSec,
    durationSec,
    storagePath: videoPath,
    thumbnailPath,
    cropMode: "fit",
    status: "scheduled",
    createdAt: now,
    title,
    description,
    tags,
    privacy: "public",
    categoryId: "27", // Education
    publishAt: at,
    youtubeVideoId: null,
    publishedAt: null,
    errorMessage: null,
    connectionId: channel.id,
  });
  batch.set(db.collection(COLLECTIONS.schedules).doc(shortId), {
    userId,
    shortId,
    connectionId: channel.id,
    publishAt: at,
    timezone: "Asia/Kolkata",
    privacy: "public",
    safePublish: false,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    lastAttemptAt: null,
    errorMessage: null,
    youtubeVideoId: null,
  });
  await batch.commit();
  console.log(`booked for ${day} ${time} IST → ${shortId}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
