// Builds the downloadable PC helper for Windows: one program (Node with the helper
// inside it) plus ffmpeg and ffprobe, zipped into the web app's public folder so
// the deployed site can offer it. Run with `npm run pack-helper`, then deploy hosting.
//
// Extra addresses the app is served from (a custom domain) go in SHORTFLOW_EXTRA_ORIGINS, comma-separated.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

if (process.platform !== "win32") throw new Error("The helper is packed for Windows, so this must run on Windows.");

const require = createRequire(import.meta.url);
const functionsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(functionsDir, "..");
const work = join(functionsDir, ".local", "pack");
const folder = join(work, "ShortFlow Helper");
const zip = join(root, "web", "public", "downloads", "ShortFlowHelper-win.zip");

const project = JSON.parse(readFileSync(join(root, ".firebaserc"), "utf8")).projects.default;
const extra = (process.env.SHORTFLOW_EXTRA_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
const origins = [`https://${project}.web.app`, `https://${project}.firebaseapp.com`, ...extra];

rmSync(work, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });
mkdirSync(dirname(zip), { recursive: true });

const stand = (name) => join(functionsDir, "src", "local", "pack", name);
await build({
  entryPoints: [join(functionsDir, "src", "local", "split-server.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: join(work, "helper.cjs"),
  logLevel: "warning",
  define: { "process.env.SHORTFLOW_ORIGINS": JSON.stringify(origins.join(",")) },
  alias: {
    "@shortflow/shared": join(root, "packages", "shared", "src", "index.ts"),
    "ffmpeg-static": stand("ffmpeg-static.ts"),
    "@ffprobe-installer/ffprobe": stand("ffprobe.ts"),
    "firebase-functions/logger": stand("logger.ts"),
    "firebase-admin/storage": stand("storage.ts"),
  },
});

// Node's "single executable application": a copy of node.exe with the helper stored inside it.
const exe = join(folder, "ShortFlowHelper.exe");
writeFileSync(join(work, "sea.json"), JSON.stringify({ main: join(work, "helper.cjs"), output: join(work, "helper.blob"), disableExperimentalSEAWarning: true }));
execFileSync(process.execPath, ["--experimental-sea-config", join(work, "sea.json")], { stdio: "inherit" });
copyFileSync(process.execPath, exe);
execFileSync(
  process.execPath,
  [require.resolve("postject/dist/cli.js"), exe, "NODE_SEA_BLOB", join(work, "helper.blob"), "--sentinel-fuse", "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2", "--overwrite"],
  { stdio: "inherit" },
);

copyFileSync(require("ffmpeg-static"), join(folder, "ffmpeg.exe"));
copyFileSync(require("@ffprobe-installer/ffprobe").path, join(folder, "ffprobe.exe"));
writeFileSync(
  join(folder, "READ ME.txt"),
  [
    "ShortFlow PC helper",
    "",
    "1. Keep the three files in this folder together.",
    "2. Double-click ShortFlowHelper.exe. A black window opens and says the helper is ready.",
    "   If Windows shows \"Windows protected your PC\", press More info, then Run anyway.",
    "3. Leave that window open, go back to ShortFlow in your browser and try again.",
    "   If the browser asks whether the site may reach apps on this device, press Allow.",
    "",
    "The helper cuts your videos and puts banners on them on this PC. Close the window to stop it.",
    "",
  ].join("\r\n"),
);

rmSync(zip, { force: true });
execFileSync("powershell.exe", ["-NoProfile", "-Command", `Compress-Archive -Path '${folder}' -DestinationPath '${zip}'`], { stdio: "inherit" });
console.log(`Packed for ${origins.join(", ")}\n→ ${zip}`);
