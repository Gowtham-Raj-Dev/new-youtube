/**
 * Puts a day's finished videos on the Moolai Illa Machan channel's Shorts page
 * in the app, with their YouTube title, description and tags. They go in as
 * "ready" — not scheduled; scheduling stays the owner's choice in the app.
 * A Short already there is left alone, so running it twice adds nothing twice.
 *
 *   npm run add-to-app -- <day>          shows what it would do
 *   npm run add-to-app -- <day> --go     does it
 *   add --update to also refresh the title, description and tags of ones already there but not yet scheduled
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, SHORT_HEIGHT, SHORT_WIDTH, storagePaths, youtubeTagChars } from "@shortflow/shared";
import { planScript } from "../src/auto/bank";
import { EPISODES } from "../src/auto/episodes";

const ROOT = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Shorts");
const PROJECT = "fir-4b5dc";
const CHANNEL = "moolaiillamachan";

function ffmpeg(args: string[]) {
  return spawnSync(ffmpegPath as unknown as string, ["-hide_banner", ...args], { encoding: "utf8" }).stderr;
}

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const update = args.includes("--update");
  const replaceVideo = args.includes("--replace-video");
  const day = Number(args.find((a) => !a.startsWith("--")));
  if (!day) throw new Error("Which day? e.g. npm run add-to-app -- 1");
  const folder = join(ROOT, `Day ${day}`);

  // Signed in as the person logged in to the Firebase CLI on this PC, handed to
  // the SDK as application default credentials in a file that's removed on exit.
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
  const bucket = getStorage().bucket();

  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("status", "==", "connected").get();
  const channel = connections.docs.find((d) => {
    const handle = String(d.get("channelHandle") ?? "").toLowerCase().replace(/^@/, "");
    const title = String(d.get("channelTitle") ?? "").toLowerCase().replace(/\s+/g, "");
    return handle === CHANNEL || title === CHANNEL;
  });
  if (!channel) throw new Error("The Moolai Illa Machan channel isn't connected in the app.");
  const connectionId = channel.id;
  const userId = String(channel.get("userId"));
  const settings = await db.collection(COLLECTIONS.settings).doc(userId).get();
  const privacy = (settings.get("publishing.defaultPrivacy") as string | undefined) ?? "public";
  console.log(`Channel: ${channel.get("channelTitle")} (${channel.get("channelHandle")}) · privacy ${privacy}${go ? "" : " · DRY RUN"}`);

  // Every Short of the channel is filed under one "video", as the AI Shorts are.
  const videoId = `mim_${connectionId}`;
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);
  let videoExists = (await videoRef.get()).exists;

  const episodes = EPISODES.filter((e) => e.day === day);
  for (const [i, episode] of episodes.entries()) {
    const name = `${String(i + 1).padStart(2, "0")}-${episode.id}`;
    const file = join(folder, `${name}.mp4`);
    if (!existsSync(file)) {
      console.log(`${name}: no video yet, skipped`);
      continue;
    }
    const shortId = `${videoId}_${episode.id}`;
    const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
    const plan = planScript(episode.script);
    if (go) writeFileSync(join(folder, `${name}.txt`), `TITLE\n${plan.title}\n\nDESCRIPTION\n${plan.description}\n\nTAGS\n${plan.tags.join(", ")}\n`);
    const existing = await shortRef.get();
    // With --replace-video, a Short not yet scheduled gets the file in the folder (e.g. a 4K re-render); its words stay.
    if (existing.exists && replaceVideo && existing.get("status") === "ready") {
      const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpeg(["-i", file]));
      const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 0;
      console.log(`${name}: video ${(readFileSync(file).length / 1e6).toFixed(1)} MB · ${durationSec.toFixed(1)} s${go ? " · replaced" : ""}`);
      if (!go) continue;
      const work = mkdtempSync(join(tmpdir(), "mim-thumb-"));
      const thumb = join(work, "thumb.jpg");
      ffmpeg(["-y", "-ss", "1.6", "-i", file, "-frames:v", "1", "-vf", "scale=1080:-2", "-q:v", "3", thumb]);
      // In 2 MB pieces, so a dropped connection costs one piece, not the whole 4K file; and another go or two after that.
      for (let attempt = 1; ; attempt++) {
        try {
          await bucket.upload(file, { destination: existing.get("storagePath"), resumable: true, chunkSize: 2 * 1024 * 1024, metadata: { contentType: "video/mp4" } });
          break;
        } catch (error) {
          if (attempt >= 4) throw error;
          console.log(`${name}: upload failed (${String(error).slice(0, 60)}), trying again`);
          await new Promise((r) => setTimeout(r, 5000 * attempt));
        }
      }
      await bucket.file(existing.get("thumbnailPath")).save(readFileSync(thumb), { contentType: "image/jpeg", resumable: false });
      rmSync(work, { recursive: true, force: true });
      await shortRef.update({ durationSec, endSec: durationSec });
      continue;
    }
    if (existing.exists) {
      // With --update, a Short still waiting to be scheduled gets the latest title, description and tags.
      if (update && existing.get("status") === "ready") {
        console.log(`${name}: title ${plan.title.length} · description ${plan.description.length} · tags ${plan.tags.length} (${youtubeTagChars(plan.tags)} chars as YouTube counts)${go ? " · updated" : ""}`);
        if (go) await shortRef.update({ title: plan.title, description: plan.description.slice(0, 5000), tags: plan.tags.slice(0, 30) });
      } else console.log(`${name}: already in the app (${existing.get("status")}), left alone`);
      continue;
    }
    const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpeg(["-i", file]));
    const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 0;
    console.log(`${name}: "${plan.title}" · ${durationSec.toFixed(1)} s · ${plan.tags.length} tags`);
    if (!go) continue;

    // The thumbnail is a frame from the first line, after the fade-in.
    const work = mkdtempSync(join(tmpdir(), "mim-thumb-"));
    const thumb = join(work, "thumb.jpg");
    ffmpeg(["-y", "-ss", "1.6", "-i", file, "-frames:v", "1", "-q:v", "3", thumb]);
    const videoPath = storagePaths.shortVideo(userId, shortId);
    const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
    await bucket.file(videoPath).save(readFileSync(file), { contentType: "video/mp4", resumable: false });
    await bucket.file(thumbnailPath).save(readFileSync(thumb), { contentType: "image/jpeg", resumable: false });
    rmSync(work, { recursive: true, force: true });

    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(
      videoRef,
      {
        userId,
        title: "Moolai Illa Machan — Cartoon Shorts",
        fileName: "moolai-illa-machan",
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
        connectionId,
        shortsCount: FieldValue.increment(1),
        ...(videoExists ? {} : { createdAt: now }),
      },
      { merge: true },
    );
    batch.set(shortRef, {
      userId,
      videoId,
      segmentIndex: day * 100 + i + 1,
      startSec: 0,
      endSec: durationSec,
      durationSec,
      storagePath: videoPath,
      thumbnailPath,
      cropMode: "fit",
      status: "ready",
      createdAt: now,
      title: plan.title,
      description: plan.description.slice(0, 5000),
      tags: plan.tags.slice(0, 30),
      privacy,
      categoryId: "23", // Comedy
      publishAt: null,
      youtubeVideoId: null,
      publishedAt: null,
      errorMessage: null,
      connectionId,
    });
    await batch.commit();
    videoExists = true;
    console.log(`${name}: added`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
