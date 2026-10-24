/**
 * Schedules Moolai Illa Machan Shorts that are "ready" in the app at fixed
 * India times, in the order given, as the app's queue would: a schedule per
 * Short, going straight to Public (no copyright-check delay; --safe=on|off changes queued ones).
 *
 *   npm run schedule-shorts -- <first day YYYY-MM-DD> <HH:mm,HH:mm,…> <id,id,…>          shows the plan
 *   npm run schedule-shorts -- <first day YYYY-MM-DD> <HH:mm,HH:mm,…> <id,id,…> --go     books it
 *
 * Slots already past are skipped. Unqueue any of them from the app to undo.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@shortflow/shared";

const PROJECT = "fir-4b5dc";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const [firstDay, timesArg, idsArg] = args.filter((a) => !a.startsWith("--"));
  if (!firstDay || !timesArg || !idsArg) throw new Error("Usage: schedule-shorts <YYYY-MM-DD> <HH:mm,…> <id,…> [--go]");
  const times = timesArg.split(",");
  const ids = idsArg.split(",");

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
  initializeApp({ credential: applicationDefault(), projectId: PROJECT });
  const db = getFirestore();

  // Every slot from the first day on, in India time, skipping ones too close to now.
  const [y, m, d] = firstDay.split("-").map(Number);
  const slots: number[] = [];
  for (let day = 0; slots.length < ids.length; day++) {
    for (const time of times) {
      const [hh, mm] = time.split(":").map(Number);
      const at = Date.UTC(y, m - 1, d + day, hh, mm) - IST_OFFSET_MS;
      if (at > Date.now() + 10 * 60 * 1000 && slots.length < ids.length) slots.push(at);
    }
  }

  // The Shorts were added by add-to-app as mim_<channel>_<joke id>.
  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("channelHandle", "in", ["@moolaiillamachan", "moolaiillamachan"]).get();
  const channel = connections.docs.find((c) => c.get("status") === "connected");
  if (!channel) throw new Error("The Moolai Illa Machan channel isn't connected in the app.");

  // --safe=on|off: switches the copyright check before going public, on Shorts already queued.
  const safeArg = args.find((a) => a.startsWith("--safe="))?.slice(7);
  if (safeArg) {
    for (const episodeId of ids) {
      const ref = db.collection(COLLECTIONS.schedules).doc(`mim_${channel.id}_${episodeId}`);
      const schedule = await ref.get();
      if (!schedule.exists || schedule.get("status") !== "scheduled") {
        console.log(`${episodeId}: not queued, left alone`);
        continue;
      }
      if (go) await ref.update({ safePublish: safeArg === "on", updatedAt: FieldValue.serverTimestamp() });
      console.log(`${episodeId}: safe publish ${safeArg}${go ? "" : " (dry run)"}`);
    }
    return;
  }

  // --unqueue: takes them back off the schedule (as the app's Unqueue does), and
  // saves their title, description and tags to --backup=<file> first.
  if (args.includes("--unqueue")) {
    const backup: Record<string, unknown> = {};
    for (const episodeId of ids) {
      const ref = db.collection(COLLECTIONS.shorts).doc(`mim_${channel.id}_${episodeId}`);
      const short = await ref.get();
      if (!short.exists) continue;
      backup[episodeId] = { title: short.get("title"), description: short.get("description"), tags: short.get("tags"), privacy: short.get("privacy"), publishAt: (short.get("publishAt") as Timestamp | null)?.toDate().toISOString() ?? null };
      if (short.get("status") !== "scheduled") {
        console.log(`${episodeId}: ${short.get("status")}, not unqueued`);
        continue;
      }
      console.log(`${episodeId}: unqueue${go ? "d" : ""}`);
      if (!go) continue;
      const batch = db.batch();
      batch.delete(db.collection(COLLECTIONS.schedules).doc(ref.id));
      batch.update(ref, { status: "ready", publishAt: null });
      await batch.commit();
    }
    const file = args.find((a) => a.startsWith("--backup="))?.slice(9);
    if (file) writeFileSync(file, JSON.stringify(backup, null, 2));
    return;
  }

  for (const [i, episodeId] of ids.entries()) {
    const id = `mim_${channel.id}_${episodeId}`;
    const shortRef = db.collection(COLLECTIONS.shorts).doc(id);
    const short = await shortRef.get();
    const when = new Date(slots[i] + IST_OFFSET_MS).toISOString().replace("T", " ").slice(0, 16);
    if (!short.exists || short.get("status") !== "ready") {
      console.log(`${id}: ${short.exists ? short.get("status") : "missing"}, skipped`);
      continue;
    }
    console.log(`${when} IST · ${short.get("title")}${go ? " · booked" : ""}`);
    if (!go) continue;
    const publishAt = Timestamp.fromMillis(slots[i]);
    const stamp = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(db.collection(COLLECTIONS.schedules).doc(id), {
      userId: short.get("userId"),
      shortId: id,
      connectionId: short.get("connectionId"),
      publishAt,
      timezone: "Asia/Kolkata",
      privacy: short.get("privacy"),
      // Straight to Public at the booked time (the user turned the copyright check off: it delays going public).
      safePublish: false,
      status: "scheduled",
      createdAt: stamp,
      updatedAt: stamp,
      retryCount: 0,
      lastAttemptAt: null,
      errorMessage: null,
      youtubeVideoId: null,
    });
    batch.update(shortRef, { status: "scheduled", publishAt, errorMessage: null });
    await batch.commit();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
