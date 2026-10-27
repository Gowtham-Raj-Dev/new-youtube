/**
 * Puts a mixed batch of finished Shorts (Day 3 cartoons, Rico English, Real Comedy) on the
 * Moolai Illa Machan channel's Shorts page as "ready", in one alternating order. Each is
 * filed as mim_<channel>_qNN-<id>: the page lists a channel's Shorts by id, and queueing hands
 * out slots in that order, so qNN is the order they go out in. Title, description and tags
 * come from the video's .txt. Ones already in the app are left alone.
 *
 *   npm run add-mix-to-app            shows the plan
 *   npm run add-mix-to-app -- --go    does it
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, SHORT_HEIGHT, SHORT_WIDTH, YOUTUBE_TAG_CHARS_SAFE, fitYoutubeTags, storagePaths, youtubeTagChars } from "@shortflow/shared";

const SHORTS = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Shorts");
const PROJECT = "fir-4b5dc";
const CHANNEL = "moolaiillamachan";

const day3 = ["01-F25-trip-confirm", "02-A2-kadai-list", "03-F10-interview", "04-A20-ai-ponnu", "05-F17-daily-5km", "06-A26-pocket-money", "07-F22-coffee-night", "08-A17-haircut", "09-F28-just-pass", "10-A27-remote"]
  .map((n) => join(SHORTS, "Day 3", `${n}.mp4`));
const rico = ["01-seafood-diet", "02-dishes-waiting", "03-dog-homework", "04-go-slow", "05-ten-alarms", "06-titles-only", "07-lights-off", "08-password-incorrect", "09-gym-money", "10-ice-cream", "11-favourite-student"]
  .map((n) => join(SHORTS, "Rico", "Day 1", `${n}.mp4`));
const real = ["patta-idathulaye", "area-mechanic"].map((n) => join(SHORTS, "Real Comedy", "Video", `${n}.mp4`));

/** Day 3 and Rico one after the other, a Real Comedy clip after every eighth or so. */
function mixed(): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(day3.length, rico.length); i++) {
    if (day3[i]) out.push(day3[i]);
    if (rico[i]) out.push(rico[i]);
    if (i === 2) out.push(real[0]);
    if (i === 6) out.push(real[1]);
  }
  return out;
}

function ffmpeg(args: string[]) {
  return spawnSync(ffmpegPath as unknown as string, ["-hide_banner", ...args], { encoding: "utf8" }).stderr;
}

function readMeta(file: string) {
  const text = readFileSync(file.replace(/\.mp4$/, ".txt"), "utf8").replace(/\r/g, "");
  const title = /TITLE\n([^\n]+)/.exec(text)?.[1].trim() ?? "";
  const description = /DESCRIPTION\n([\s\S]*?)\n\nTAGS\n/.exec(text)?.[1].trim() ?? "";
  const raw = (/TAGS\n([^\n]+)/.exec(text)?.[1] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  // Kept under YouTube's 500 characters as YouTube counts them, or the upload is refused.
  return { title, description, tags: fitYoutubeTags(raw, YOUTUBE_TAG_CHARS_SAFE) };
}

async function main() {
  const go = process.argv.includes("--go");
  const order = mixed();
  for (const file of order) if (!existsSync(file) || !existsSync(file.replace(/\.mp4$/, ".txt"))) throw new Error(`Missing ${file} or its .txt`);

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

  const videoId = `mim_${connectionId}`;
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);
  let videoExists = (await videoRef.get()).exists;

  for (const [i, file] of order.entries()) {
    const id = basename(file, ".mp4").replace(/^\d\d-/, "");
    const place = `q${String(i + 1).padStart(2, "0")}`;
    const shortId = `${videoId}_${place}-${id}`;
    const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
    // Also under add-to-app's plain id, so a Day 3 Short added that way isn't added twice.
    const [existing, plain] = await Promise.all([shortRef.get(), db.collection(COLLECTIONS.shorts).doc(`${videoId}_${id}`).get()]);
    if (existing.exists || plain.exists) {
      console.log(`${place} ${id}: already in the app (${(existing.exists ? existing : plain).get("status")}), left alone`);
      continue;
    }
    const { title, description, tags } = readMeta(file);
    const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpeg(["-i", file]));
    const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 0;
    const hashtags = `${title} ${description}`.match(/#\w+/g)?.length ?? 0;
    console.log(`${place} ${id} · ${durationSec.toFixed(1)} s · title ${title.length} · desc ${description.length} · #${hashtags} · tags ${youtubeTagChars(tags)}`);
    if (!go) continue;

    const work = mkdtempSync(join(tmpdir(), "mim-thumb-"));
    const thumb = join(work, "thumb.jpg");
    ffmpeg(["-y", "-ss", "1.6", "-i", file, "-frames:v", "1", "-vf", "scale=1080:-2", "-q:v", "3", thumb]);
    const videoPath = storagePaths.shortVideo(userId, shortId);
    const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
    for (let attempt = 1; ; attempt++) {
      try {
        await bucket.upload(file, { destination: videoPath, resumable: true, chunkSize: 2 * 1024 * 1024, metadata: { contentType: "video/mp4" } });
        break;
      } catch (error) {
        if (attempt >= 4) throw error;
        console.log(`${place}: upload failed (${String(error).slice(0, 60)}), trying again`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
    await bucket.file(thumbnailPath).save(readFileSync(thumb), { contentType: "image/jpeg", resumable: false });
    rmSync(work, { recursive: true, force: true });

    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(
      videoRef,
      {
        userId, title: "Moolai Illa Machan — Cartoon Shorts", fileName: "moolai-illa-machan", storagePath: "", contentType: "video/mp4", fileSize: 0,
        status: "completed", uploadedAt: now, durationSec: null, width: SHORT_WIDTH, height: SHORT_HEIGHT, thumbnailPath, processingStartedAt: null,
        processingCompletedAt: now, activeJobId: null, errorMessage: null, sourceDeletedAt: now, connectionId, shortsCount: FieldValue.increment(1),
        ...(videoExists ? {} : { createdAt: now }),
      },
      { merge: true },
    );
    batch.set(shortRef, {
      userId, videoId, segmentIndex: 900 + i + 1, startSec: 0, endSec: durationSec, durationSec, storagePath: videoPath, thumbnailPath, cropMode: "fit",
      status: "ready", createdAt: now, title, description: description.slice(0, 5000), tags: tags.slice(0, 30), privacy, categoryId: "23",
      publishAt: null, youtubeVideoId: null, publishedAt: null, errorMessage: null, connectionId,
    });
    await batch.commit();
    videoExists = true;
    console.log(`${place} ${id}: added`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
