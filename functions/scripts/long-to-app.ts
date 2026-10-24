/**
 * Puts a full-length video on the Moolai Illa Machan channel's queue in the app
 * and books it for a time (India time), with the title, description and tags
 * from its .txt. The app's publish sweep uploads it then, straight to Public.
 *
 *   npm run long-to-app -- <folder number, e.g. 01> <YYYY-MM-DD> <HH:mm>          shows what it would do
 *   npm run long-to-app -- <folder number> <YYYY-MM-DD> <HH:mm> --go             does it
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, storagePaths } from "@shortflow/shared";

const PROJECT = "fir-4b5dc";
const VIDEOS = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Videos");

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const [folderArg, day, time] = args.filter((a) => !a.startsWith("--"));
  if (!folderArg || !day || !time) throw new Error('Usage: long-to-app "<folder>" <YYYY-MM-DD> <HH:mm> [--go]');
  // By its number, e.g. "01": folder names have spaces that npm on Windows mangles.
  const name = readdirSync(VIDEOS).find((f) => f === folderArg || f.startsWith(`${folderArg} `));
  if (!name) throw new Error(`No video folder ${folderArg} in ${VIDEOS}`);
  const folder = join(VIDEOS, name);
  const mp4 = readdirSync(folder).find((f) => f.endsWith(".mp4"));
  const txt = readdirSync(folder).find((f) => f.endsWith(".txt"));
  if (!mp4 || !txt) throw new Error(`No .mp4 and .txt in ${folder}`);
  const details = readFileSync(join(folder, txt), "utf8").replace(/\r/g, "");
  const title = /TITLE\n(.+)\n/.exec(details)![1].trim();
  const description = /DESCRIPTION\n([\s\S]+?)\n\nTAGS\n/.exec(details)![1].trim();
  const tags = /TAGS\n(.+)/.exec(details)![1].split(",").map((t) => t.trim()).filter(Boolean);
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const publishAt = Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 3600 * 1000;
  if (publishAt < Date.now() + 10 * 60 * 1000) throw new Error("That time is too soon or already past.");
  const probe = spawnSync(ffmpegPath as unknown as string, ["-hide_banner", "-i", join(folder, mp4)], { encoding: "utf8" }).stderr;
  const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe);
  const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 0;
  console.log(`"${title}" (${title.length}) · description ${description.length} · ${tags.length} tags · ${durationSec.toFixed(0)} s · ${day} ${time} IST${go ? "" : " · DRY RUN"}`);

  const cli = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const credDir = mkdtempSync(join(tmpdir(), "mim-cred-"));
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

  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("channelHandle", "in", ["@moolaiillamachan", "moolaiillamachan"]).get();
  const channel = connections.docs.find((c) => c.get("status") === "connected");
  if (!channel) throw new Error("The Moolai Illa Machan channel isn't connected in the app.");
  const userId = String(channel.get("userId"));
  const videoId = `mim_${channel.id}`;
  const shortId = `${videoId}_long-${folderArg.split(" ")[0]}`;
  const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
  const existing = await shortRef.get();
  if (existing.exists && existing.get("status") !== "ready") throw new Error(`Already ${existing.get("status")} in the app.`);
  if (!go) return;

  const bucket = getStorage().bucket();
  const videoPath = storagePaths.shortVideo(userId, shortId);
  const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
  // In 2 MB pieces with retries: this connection drops large uploads.
  for (let attempt = 1; ; attempt++) {
    try {
      // A request that hangs on a dead connection gives up after a minute, so the retry can start.
      await bucket.upload(join(folder, mp4), { destination: videoPath, resumable: true, chunkSize: 4 * 1024 * 1024, timeout: 60_000, metadata: { contentType: "video/mp4" } });
      break;
    } catch (error) {
      if (attempt >= 8) throw error;
      console.log(`upload failed (${String(error).slice(0, 60)}), trying again`);
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
  await bucket.upload(join(folder, "thumbnail.jpg"), { destination: thumbnailPath, resumable: false, metadata: { contentType: "image/jpeg" } });
  console.log("uploaded");

  const at = Timestamp.fromMillis(publishAt);
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(shortRef, {
    userId,
    videoId,
    segmentIndex: 9000 + Number(folderArg.split(" ")[0]),
    startSec: 0,
    endSec: durationSec,
    durationSec,
    storagePath: videoPath,
    thumbnailPath,
    cropMode: "fit",
    status: "scheduled",
    createdAt: now,
    title: title.slice(0, 100),
    description: description.slice(0, 5000),
    tags: tags.slice(0, 30),
    privacy: "public",
    categoryId: "23", // Comedy
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
