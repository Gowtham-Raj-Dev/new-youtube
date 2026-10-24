/**
 * Trims the saved keywords of the Moolai Illa Machan Shorts that aren't on
 * YouTube yet, so none goes over YouTube's 500 characters as YouTube counts
 * them (quotes around multi-word tags included). See docs/youtube-metadata-rules.md.
 *
 *   node .local/fix-tags.js          shows each Short's count
 *   node .local/fix-tags.js --go     saves the trimmed tags
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, YOUTUBE_TAG_CHARS_SAFE, fitYoutubeTags, youtubeTagChars } from "@shortflow/shared";

const PROJECT = "fir-4b5dc";

async function main() {
  const go = process.argv.includes("--go");

  // Signed in as the person logged in to the Firebase CLI on this PC, as add-to-app does.
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

  const shorts = await db.collection(COLLECTIONS.shorts).get();
  let fixed = 0;
  for (const doc of shorts.docs) {
    if (!doc.id.startsWith("mim_") || doc.get("youtubeVideoId")) continue;
    const tags = (doc.get("tags") as string[] | undefined) ?? [];
    const before = youtubeTagChars(tags);
    const after = fitYoutubeTags(tags, YOUTUBE_TAG_CHARS_SAFE);
    const changed = after.length !== tags.length || after.some((t, i) => t !== tags[i]);
    console.log(`${doc.get("status")}\t${tags.length} tags ${before} → ${after.length} tags ${youtubeTagChars(after)}\t${String(doc.get("title")).slice(0, 50)}${changed ? (go ? " · saved" : " · needs trimming") : ""}`);
    if (changed) {
      fixed++;
      if (go) await doc.ref.update({ tags: after });
    }
  }
  console.log(`${fixed} Short(s) ${go ? "trimmed" : "to trim"}${go ? "" : " · DRY RUN, add --go to save"}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
