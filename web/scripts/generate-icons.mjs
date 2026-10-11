// Rebuilds every raster icon from src/app/icon.svg, the single source of the logo mark.
// Run after changing the mark: `npm run icons -w web`.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const path = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const rounded = readFileSync(path("../src/app/icon.svg"), "utf8");
// Home-screen icons get their corners from the OS, so those are drawn edge to edge.
const square = rounded.replace(' rx="18"', "");

const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 * (size / 64) * 4 }).resize(size, size).png().toBuffer();

/** An .ico is a small directory followed by the images themselves; PNG entries are valid as-is. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size, at);
    header.writeUInt8(size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const favicon = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(rounded, size) })));
writeFileSync(path("../src/app/favicon.ico"), ico(favicon));
writeFileSync(path("../src/app/apple-icon.png"), await png(square, 180));

mkdirSync(path("../public/icons"), { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(path(`../public/icons/icon-${size}.png`), await png(rounded, size));
  writeFileSync(path(`../public/icons/maskable-${size}.png`), await png(square, size));
}
console.log("generate-icons: wrote favicon.ico, apple-icon.png and public/icons/*");
