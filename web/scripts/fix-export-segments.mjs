// Workaround for Next 16 `output: "export"` with nested segment paths (e.g. route groups):
// the client requests `<route>/__next.<a>.<b>.__PAGE__.txt` (convertSegmentPathToStaticExportFilename
// joins with dots) but the exporter writes `<route>/__next.<a>/<b>/__PAGE__.txt`.
// Copy each nested file to the flat name the router actually fetches.
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../out", import.meta.url));
let copied = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (name.startsWith("__next.")) flatten(full, dir);
    else walk(full);
  }
}

function flatten(segmentDir, routeDir) {
  const stack = [segmentDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        stack.push(full);
      } else if (name.endsWith(".txt")) {
        const flat = relative(routeDir, full).split(sep).join(".");
        copyFileSync(full, join(routeDir, flat));
        copied++;
      }
    }
  }
}

walk(outDir);
console.log(`fix-export-segments: wrote ${copied} flattened segment file(s)`);
