/**
 * Puts the 26 Crypt Knight gameplay Shorts (games.codelove.in/scripts/build-crypt-gameplay-shorts.mjs) on the
 * CodeLove channel's Shorts page in the app as "ready", each with its own title, description and tags.
 * They are not booked: the user queues them in the app. Ids run ep01…ep26, so the page lists them in order.
 *
 *   npm run crypt-shorts                 shows what it would do
 *   npm run crypt-shorts -- --go         uploads them and adds them
 *   npm run crypt-shorts -- --go --update   also rewrites the title/description/tags of ones still "ready"
 *   npm run crypt-shorts -- --preview=3  metadata only (sizes of all, EP 3 in full), no app
 *
 * Metadata follows the channel rules in Moolai Illa Machan/README.md: title 90–99 characters, description over
 * 1000, tags about 490 (at most 30), and exactly 15 hashtags across title and description.
 */import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, SHORT_HEIGHT, SHORT_WIDTH, fitYoutubeTags, storagePaths } from "@shortflow/shared";

const PROJECT = "fir-4b5dc";
const SHORTS = resolve(__dirname, "..", "..", "..", "z-video-files", "games.codelove.in", "crypt-knight", "shorts");
const GAME_URL = "https://games.codelove.in/crypt-knight";
const FULL_VIDEO = "https://youtu.be/Ufbmnny4iGs";
const COUNT = 26;

const WORLDS = [
  { name: "The Crypt", hero: "Knight", boss: "The Bone King", first: 1, about: "Mudhal world – pazhaiya kalla crypt, skeletons kootam" },
  { name: "Frozen Crypt", hero: "Barbarian", boss: "The Frost King", first: 5, about: "Ice dungeon, Barbarian-oda heavy attacks" },
  { name: "Poison Catacombs", hero: "Rogue", boss: "The Plague King", first: 11, about: "Green poison dungeon, semma fast Rogue" },
  { name: "Lava Depths", hero: "Mage", boss: "The Ember King", first: 16, about: "Lava dungeon, Mage-oda magic attacks" },
  { name: "Gold Vault", hero: "Hooded Rogue", boss: "The Gold King", first: 22, about: "Thangam niraindha kadaisi world" },
];
type Kind = "open" | "stages" | "king" | "won";
/** Each EP: the hook its title opens with, and what it shows (same order as the build script's pieces). */
const EPISODES: Record<number, [string, Kind]> = {
  1: ["⚔️ Crypt Knight Start! Skeletons-a Adichu Thookalaam 💥", "open"],
  2: ["🗡️ Knight vs Skeleton Army! 2x Speed Dungeon Fight", "stages"],
  3: ["💀 The Bone King Vandhaachu! First Boss Fight 😱", "king"],
  4: ["🏆 Bone King Defeated! World 1 Clear ⭐⭐⭐", "won"],
  5: ["❄️ Frozen Crypt! Pudhu Hero Barbarian Entry 💪", "open"],
  6: ["🪓 Barbarian Smash! Ice Dungeon Full Fight", "stages"],
  7: ["🥶 Frost King Boss Fight! Barbarian Thaangumaa", "king"],
  8: ["😱 Frost King Romba Strong! Fight Continues", "king"],
  9: ["⚡ Boss Fight Tension! Health Low Aagudhu 😬", "king"],
  10: ["🏆 Frost King Defeated! World 2 Clear 🎉", "won"],
  11: ["☠️ Poison Catacombs! Rogue Entry Semma Speed", "open"],
  12: ["🗡️ Rogue Fast Attack! Poison Dungeon Clear", "stages"],
  13: ["🤢 Plague King Vandhaachu! Poison Boss Fight", "king"],
  14: ["😨 Plague King vs Rogue - Yaaru Jeyippaanga", "king"],
  15: ["🏆 Plague King Defeated! World 3 Clear 🎉", "won"],
  16: ["🔥 Lava Depths! Mage Magic Power Entry ✨", "open"],
  17: ["✨ Mage Magic Attack! Lava Dungeon Fight", "stages"],
  18: ["🌋 Ember King Fire Boss! Mage Thaangumaa 😱", "king"],
  19: ["🔥 Fire vs Magic! Ember King Fight Continues", "king"],
  20: ["😬 Last Hit Varaikkum Tension! Ember King Fight", "king"],
  21: ["🏆 Ember King Defeated! World 4 Clear 🎉", "won"],
  22: ["💰 Gold Vault! Final World Hooded Rogue Entry", "open"],
  23: ["🗡️ Gold Vault Fight! Treasure Dungeon 2x Speed", "stages"],
  24: ["👑 Final Boss Gold King! Last Fight 😱", "king"],
  25: ["💥 Gold King vs Hooded Rogue! Final Battle", "king"],
  26: ["🏆 Full Game Complete! All 5 Kings Defeated 🎉", "won"],
};
const SHOWS: Record<Kind, string> = {
  open: "Pudhu world start! Pudhu hero-oda mudhal stages – skeletons-a eppadi adichu clear pannurom-nu paarunga.",
  stages: "Dungeon stage fight – skeletons, archers ellaarum varuvaanga. Parry, roll, combo ellaam use panni stage clear!",
  king: "Boss King fight! Romba health, strong attacks – dodge panni, parry panni, kadaisi varaikkum fight pannanum!",
  won: "King-a jeyichaachu – world clear! Victory screen varaikkum paarunga.",
};
const TAILS = (n: number) => [` • Crypt Knight Tamil Gameplay EP ${n} #shorts #tamilgaming`, ` • Crypt Knight Tamil EP ${n} #shorts #tamilgaming`, ` • Crypt Knight Tamil Gameplay EP ${n} #shorts`, ` • Crypt Knight Tamil EP ${n} #shorts`];
const HASHTAGS = ["#CryptKnight", "#TamilGaming", "#tamilgameplay", "#gaming", "#actiongames", "#freegames", "#bossfight", "#dungeon", "#tamilshorts", "#gamingshorts", "#youtubeshorts", "#shortsfeed", "#trending", "#viral", "#tamil", "#mobilegames"];
const TAGS_COMMON = [
  "crypt knight", "crypt knight gameplay", "dungeon game", "3d action game", "tamil gameplay", "tamil gaming",
  "தமிழ் கேமிங்", "boss fight", "free games", "free online games", "browser games", "mobile games", "3d games",
  "action games", "tamil shorts", "gaming shorts", "codelove games", "games codelove", "tamil games", "knight game", "rpg game", "shorts",
];
const TAGS_KIND: Record<Kind, string[]> = {
  open: ["new game tamil", "game start"],
  stages: ["dungeon fight", "skeleton army"],
  king: ["boss fight tamil", "king boss"],
  won: ["world clear", "boss defeated"],
};
function ffmpeg(args: string[]) {
  return spawnSync(ffmpegPath as unknown as string, ["-hide_banner", ...args], { encoding: "utf8" }).stderr;
}

function metadata(n: number) {
  const [hook, kind] = EPISODES[n];
  const w = [...WORLDS].reverse().find((x) => n >= x.first)!;
  const worldNo = WORLDS.indexOf(w) + 1;
  const parts = (WORLDS[worldNo]?.first ?? COUNT + 1) - w.first;
  const part = n - w.first + 1;
  const title = TAILS(n).map((tail) => hook + tail).find((t) => t.length <= 99) ?? (hook + TAILS(n).at(-1)).slice(0, 100);
  const inTitle = title.match(/#\w+/g)?.map((h) => h.toLowerCase()) ?? [];
  const tags = HASHTAGS.filter((h) => !inTitle.includes(h.toLowerCase())).slice(0, 15 - inTitle.length);
  const description = [
    `${hook} 👇`,
    `Crypt Knight EP ${n} of ${COUNT} – World ${worldNo}/5 ${w.name} (hero: ${w.hero}), part ${part}/${parts}. ${SHOWS[kind]}`,
    "",
    `🎮 Indha game-ah FREE-ah vilayaadunga (download venaam): ${GAME_URL}`,
    `▶️ Full gameplay – 50 stages, 5 Kings: ${FULL_VIDEO}`,
    "",
    "⚔️ Crypt Knight pathi:",
    "Crypt Knight oru free 3D dungeon action game. 5 worlds, 50 stages, 5 boss Kings – ovvoru world-kkum oru pudhu hero (Knight, Barbarian, Rogue, Mage, Hooded Rogue). Skeletons, archers, casters ellaarum varuvaanga – parry, roll, potions use panni ovvoru stage-um clear pannanum. Mobile, PC – browser-laye direct-ah vilayaadalaam.",
    `${w.name}: ${w.about}, boss ${w.boss}.`,
    "",
    "✅ Full game 2x speed-la – 5 worlds, 50 stages, 5 Kings",
    "✅ Tamil commentary-oda ovvoru fight-um",
    `✅ EP 1 to EP ${COUNT} – best fights ellaam Shorts-aa, channel-la ellaa EP-um irukku`,
    "",
    "😍 Video pidichaa LIKE pannunga, friends kitta SHARE pannunga!",
    "🔔 Dhinamum pudhu Tamil gameplay – SUBSCRIBE pannunga, bell icon-ah on pannunga.",
    "💬 Comment-la sollunga: unga favourite hero yaaru? Knight-aa, Mage-aa, Rogue-aa?",
    "",
    "🎮 Innum neraya free games: https://games.codelove.in",
    "",
    "🔎 crypt knight tamil, dungeon game tamil, boss fight tamil, free 3d action game, tamil gaming shorts, mobile action game, browser games tamil",
    "",
    tags.join(" "),
  ].join("\n");
  const keywords = fitYoutubeTags([`crypt knight ep ${n}`, `crypt knight ${w.name.toLowerCase()}`, ...TAGS_KIND[kind], ...TAGS_COMMON], 490);
  return { title, description, tags: keywords };
}
async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const update = args.includes("--update");
  const files = readdirSync(SHORTS).filter((f) => /^\d\d - .*\.mp4$/.test(f)).sort();
  // Shorts are built a day at a time (Gemini voice quota): whatever is there now goes in, the rest on a later run.
  if (!files.length || files.length > COUNT) throw new Error(`Expected 1–${COUNT} shorts in ${SHORTS}, found ${files.length}`);
  console.log(`${files.length} of ${COUNT} shorts built`);
  // --preview[=n]: only the metadata (all EPs' sizes, and EP n in full), without the app.
  const preview = args.find((a) => a.startsWith("--preview"));
  if (preview) {
    for (let n = 1; n <= COUNT; n++) {
      const meta = metadata(n);
      const tagChars = meta.tags.reduce((s, t, i) => s + t.length + (/\s/.test(t) ? 2 : 0) + (i ? 1 : 0), 0);
      console.log(`EP ${String(n).padStart(2)} title ${meta.title.length} · desc ${meta.description.length} · ${meta.tags.length} tags/${tagChars} ch · ${(meta.title + meta.description).match(/#\w+/g)?.length ?? 0} hashtags · ${meta.title}`);
    }
    const n = Number(preview.split("=")[1] ?? 2);
    const meta = metadata(n);
    console.log(`\n--- EP ${n} ---\n${meta.title}\n\n${meta.description}\n\nTAGS: ${meta.tags.join(", ")}`);
    return;
  }

  const cli = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const credDir = mkdtempSync(join(tmpdir(), "ck-cred-"));
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
  const videoId = `crypt_${channel.id}`;
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);
  console.log(`Channel: ${channel.get("channelTitle")} (${channel.get("channelHandle")}) · status ${channel.get("status")}${go ? "" : " · DRY RUN"}`);

  const bucket = getStorage().bucket();
  let added = 0;
  for (const file of files) {
    const n = Number(file.slice(0, 2));
    const meta = metadata(n);
    const shortId = `${videoId}_ep${String(n).padStart(2, "0")}`;
    const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
    const existing = await shortRef.get();
    const hashtags = (meta.title + meta.description).match(/#\w+/g)?.length ?? 0;
    const tagChars = meta.tags.reduce((s, t, i) => s + t.length + (/\s/.test(t) ? 2 : 0) + (i ? 1 : 0), 0);
    console.log(`\nEP ${n}: "${meta.title}" (${meta.title.length}) · desc ${meta.description.length} · ${meta.tags.length} tags/${tagChars} ch · ${hashtags} hashtags`);
    if (existing.exists) {
      if (existing.get("status") === "ready" && update && go) {
        await shortRef.update({ title: meta.title, description: meta.description, tags: meta.tags });
        console.log("  already ready — metadata updated");
      } else console.log(`  already ${existing.get("status")} in the app, left alone`);
      continue;
    }
    if (!go) continue;

    const path = join(SHORTS, file);
    const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpeg(["-i", path]));
    const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 30;
    const videoPath = storagePaths.shortVideo(userId, shortId);
    const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
    const work = mkdtempSync(join(tmpdir(), "ck-thumb-"));
    const thumb = join(work, "thumb.jpg");
    ffmpeg(["-y", "-ss", "6", "-i", path, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", thumb]);
    // In pieces with retries: this connection drops large uploads.
    for (let attempt = 1; ; attempt++) {
      try {
        await bucket.upload(path, { destination: videoPath, resumable: true, chunkSize: 4 * 1024 * 1024, timeout: 60_000, metadata: { contentType: "video/mp4" } });
        break;
      } catch (error) {
        if (attempt >= 8) throw error;
        console.log(`  upload failed (${String(error).slice(0, 60)}), trying again`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
    const hasThumb = existsSync(thumb);
    if (hasThumb) await bucket.file(thumbnailPath).save(readFileSync(thumb), { contentType: "image/jpeg", resumable: false });
    rmSync(work, { recursive: true, force: true });

    const now = FieldValue.serverTimestamp();
    const videoExists = (await videoRef.get()).exists;
    const batch = db.batch();
    batch.set(
      videoRef,
      {
        userId,
        title: "Crypt Knight — Tamil gameplay Shorts",
        fileName: "crypt-knight-gameplay",
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
        shortsCount: FieldValue.increment(1),
        ...(videoExists ? {} : { createdAt: now }),
      },
      { merge: true },
    );
    batch.set(shortRef, {
      userId,
      videoId,
      segmentIndex: n - 1,
      startSec: 0,
      endSec: durationSec,
      durationSec,
      storagePath: videoPath,
      thumbnailPath: hasThumb ? thumbnailPath : null,
      cropMode: "fit",
      status: "ready",
      createdAt: now,
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      privacy: "public",
      categoryId: "20", // Gaming
      publishAt: null,
      youtubeVideoId: null,
      publishedAt: null,
      errorMessage: null,
      connectionId: channel.id,
    });
    await batch.commit();
    added++;
    console.log(`  uploaded → ${shortId} (ready)`);
  }
  console.log(`\n${go ? `${added} added` : "Dry run — add --go to upload"}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
