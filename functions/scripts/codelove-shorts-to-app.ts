/**
 * Puts the UTubeFlow promo Shorts (English + Tamil) on the CodeLove channel's
 * queue in the app and books them, with the title, description and tags from
 * each folder's *-YouTube-details.txt. The app's publish sweep (:01 and :31,
 * 5 AM – 8:31 PM IST) uploads them then, straight to Public.
 *
 *   npm run codelove-shorts                              shows what it would do (booked ~11 min from now)
 *   npm run codelove-shorts -- <YYYY-MM-DD> <HH:mm>      a set India time instead
 *   add --go to do it
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, SHORT_HEIGHT, SHORT_WIDTH, storagePaths } from "@shortflow/shared";

const PROJECT = "fir-4b5dc";
const SHORTS = resolve(__dirname, "..", "..", "..", "z-video-files", "youtube-for-all", "shorts");
const LANGS = ["english", "tamil"];

function ffmpeg(args: string[]) {
  return spawnSync(ffmpegPath as unknown as string, ["-hide_banner", ...args], { encoding: "utf8" }).stderr;
}

function readDetails(folder: string) {
  const mp4 = readdirSync(folder).find((f) => f.endsWith(".mp4"));
  const txt = readdirSync(folder).find((f) => f.endsWith("-YouTube-details.txt"));
  if (!mp4 || !txt) throw new Error(`No .mp4 and *-YouTube-details.txt in ${folder}`);
  const details = readFileSync(join(folder, txt), "utf8").replace(/\r/g, "");
  const title = /TITLE\n(.+)\n/.exec(details)![1].trim();
  // Lines still holding a "<paste … link>" placeholder are dropped: YouTube rejects < and > in a description.
  const description = /DESCRIPTION\n([\s\S]+?)\n\nTAGS\n/.exec(details)![1]
    .split("\n")
    .filter((line) => !/[<>]/.test(line))
    .join("\n")
    .trim();
  const tags = /TAGS\n(.+)/.exec(details)![1].split(",").map((t) => t.trim()).filter(Boolean);
  return { file: join(folder, mp4), title, description, tags };
}

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const [day, time] = args.filter((a) => !a.startsWith("--"));
  let publishAt = Date.now() + 11 * 60 * 1000;
  if (day && time) {
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    publishAt = Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 3600 * 1000;
    if (publishAt < Date.now() + 10 * 60 * 1000) throw new Error("That time is too soon or already past.");
  }
  // --only=english|tamil books just that one, so each can go at its own time.
  const only = args.find((a) => a.startsWith("--only="))?.slice(7);
  const shorts = LANGS.filter((lang) => !only || lang === only).map((lang) => ({ lang, ...readDetails(join(SHORTS, lang)) }));

  const cli = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const credDir = mkdtempSync(join(tmpdir(), "cl-cred-"));
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

  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("status", "==", "connected").get();
  const channel = connections.docs.find((c) => /codelove/i.test(`${c.get("channelHandle") ?? ""} ${String(c.get("channelTitle") ?? "").replace(/\s+/g, "")}`));
  if (!channel) {
    console.log("Connected channels:", connections.docs.map((c) => `${c.get("channelTitle")} (${c.get("channelHandle")})`).join(", "));
    throw new Error("The CodeLove channel isn't connected in the app.");
  }
  const userId = String(channel.get("userId"));
  const videoId = `cl_${channel.id}`;
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);
  const when = new Date(publishAt + 5.5 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 16);
  console.log(`Channel: ${channel.get("channelTitle")} (${channel.get("channelHandle")}) · ${when} IST${go ? "" : " · DRY RUN"}`);

  // --unqueue: takes them back off the schedule (as the app's Unqueue does); the file stays, ready to book again.
  if (args.includes("--unqueue")) {
    for (const short of shorts) {
      const shortRef = db.collection(COLLECTIONS.shorts).doc(`${videoId}_utubeflow-short-${short.lang}`);
      const existing = await shortRef.get();
      if (!existing.exists || existing.get("status") !== "scheduled") {
        console.log(`[${short.lang}] ${existing.exists ? existing.get("status") : "missing"}, not unqueued`);
        continue;
      }
      console.log(`[${short.lang}] unqueue${go ? "d" : " (dry run)"}`);
      if (!go) continue;
      const batch = db.batch();
      batch.delete(db.collection(COLLECTIONS.schedules).doc(shortRef.id));
      batch.update(shortRef, { status: "ready", publishAt: null });
      await batch.commit();
    }
    return;
  }

  const bucket = getStorage().bucket();
  for (const [i, short] of shorts.entries()) {
    if (!existsSync(short.file)) throw new Error(`Missing ${short.file}`);
    const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpeg(["-i", short.file]));
    const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 0;
    const shortId = `${videoId}_utubeflow-short-${short.lang}`;
    const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
    const existing = await shortRef.get();
    console.log(`\n[${short.lang}] "${short.title}" (${short.title.length}) · ${durationSec.toFixed(1)} s · ${short.tags.length} tags`);
    console.log(short.description.replace(/^/gm, "    "));
    if (existing.exists && existing.get("status") !== "ready") {
      console.log(`  already ${existing.get("status")} in the app, left alone`);
      continue;
    }
    if (!go) continue;

    const videoPath = storagePaths.shortVideo(userId, shortId);
    const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
    const work = mkdtempSync(join(tmpdir(), "cl-thumb-"));
    const thumb = join(work, "thumb.jpg");
    ffmpeg(["-y", "-ss", "1.6", "-i", short.file, "-frames:v", "1", "-vf", "scale=1080:-2", "-q:v", "3", thumb]);
    // In pieces with retries: this connection drops large uploads.
    for (let attempt = 1; ; attempt++) {
      try {
        await bucket.upload(short.file, { destination: videoPath, resumable: true, chunkSize: 4 * 1024 * 1024, timeout: 60_000, metadata: { contentType: "video/mp4" } });
        break;
      } catch (error) {
        if (attempt >= 8) throw error;
        console.log(`  upload failed (${String(error).slice(0, 60)}), trying again`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
    await bucket.file(thumbnailPath).save(readFileSync(thumb), { contentType: "image/jpeg", resumable: false });
    rmSync(work, { recursive: true, force: true });

    const at = Timestamp.fromMillis(publishAt);
    const now = FieldValue.serverTimestamp();
    const videoExists = (await videoRef.get()).exists;
    const batch = db.batch();
    batch.set(
      videoRef,
      {
        userId,
        title: "CodeLove — UTubeFlow Shorts",
        fileName: "codelove-utubeflow",
        storagePath: "",
        contentType: "video/mp4",
        fileSize: 0,
        status: "completed",
        uploadedAt: now,
        durationSec: null,
        width: SHORT_WIDTH,
        height: SHORT_HEIGHT,
        thumbnailPath,
        processingStartedAt: null,
        processingCompletedAt: now,
        activeJobId: null,
        errorMessage: null,
        sourceDeletedAt: now,
        connectionId: channel.id,
        ...(existing.exists ? {} : { shortsCount: FieldValue.increment(1) }),
        ...(videoExists ? {} : { createdAt: now }),
      },
      { merge: true },
    );
    batch.set(shortRef, {
      userId,
      videoId,
      segmentIndex: i + 1,
      startSec: 0,
      endSec: durationSec,
      durationSec,
      storagePath: videoPath,
      thumbnailPath,
      cropMode: "fit",
      status: "scheduled",
      createdAt: now,
      title: short.title.slice(0, 100),
      description: short.description.slice(0, 5000),
      tags: short.tags.slice(0, 30),
      privacy: "public",
      categoryId: "28", // Science & Technology
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
    console.log(`  uploaded and booked → ${shortId}`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
