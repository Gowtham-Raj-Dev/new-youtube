import { collection, deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, ref as storageRef, uploadBytes } from "firebase/storage";
import { BANNER_IMAGE_TYPES, BANNER_MAX_BYTES, COLLECTIONS, SHORT_HEIGHT, SHORT_WIDTH, storagePaths, type BannerDoc, type BannerImageType, type BannerPosition } from "@shortflow/shared";
import { firebase } from "./firebase/client";

function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => (URL.revokeObjectURL(url), resolve({ width: image.naturalWidth, height: image.naturalHeight }));
    image.onerror = () => (URL.revokeObjectURL(url), reject(new Error("That file isn't an image we can read.")));
    image.src = url;
  });
}

/** Saves an image as a banner. Throws an Error with a message fit to show the user. */
export async function addBanner(uid: string, image: Blob, position: BannerPosition, name: string) {
  if (!(image.type in BANNER_IMAGE_TYPES)) throw new Error("Use a PNG, JPG or WebP image.");
  if (image.size > BANNER_MAX_BYTES) throw new Error("That image is over 5 MB. Use a smaller one.");
  const { width, height } = await imageSize(image);

  const { db, storage } = firebase();
  const ref = doc(collection(db, COLLECTIONS.banners));
  const storagePath = storagePaths.banner(uid, ref.id, BANNER_IMAGE_TYPES[image.type as BannerImageType]);
  await uploadBytes(storageRef(storage, storagePath), image, { contentType: image.type, cacheControl: "private, max-age=86400" });
  // Field set must match firestore.rules.
  await setDoc(ref, { userId: uid, name: name.trim().slice(0, 80) || "Banner", position, storagePath, width, height, createdAt: serverTimestamp() });
}

/**
 * Splits a full-frame template — artwork at the top and bottom, an empty window
 * in the middle for the video — into its top and bottom banners. The window is
 * found by growing outwards from the centre row while rows stay blank (the same
 * flat colour as the centre, or transparent). Throws if there is no such window.
 */
export async function splitFrameTemplate(image: Blob): Promise<Record<BannerPosition, Blob>> {
  const url = URL.createObjectURL(image);
  const picture = new Image();
  await new Promise<void>((resolve, reject) => {
    picture.onload = () => resolve();
    picture.onerror = () => reject(new Error("That file isn't an image we can read."));
    picture.src = url;
  }).finally(() => URL.revokeObjectURL(url));

  const { naturalWidth: width, naturalHeight: height } = picture;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Couldn't read the image.");
  ctx.drawImage(picture, 0, 0);

  const SAMPLES = 48;
  const row = (y: number) => ctx.getImageData(0, y, width, 1).data;
  const centre = row(Math.floor(height / 2));
  const mid = Math.floor(width / 2) * 4;
  const reference = [centre[mid], centre[mid + 1], centre[mid + 2], centre[mid + 3]];
  const isBlank = (y: number) => {
    const data = row(y);
    let matches = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const p = Math.floor(((i + 0.5) * width) / SAMPLES) * 4;
      const transparent = data[p + 3] < 16;
      const sameColour = Math.abs(data[p] - reference[0]) + Math.abs(data[p + 1] - reference[1]) + Math.abs(data[p + 2] - reference[2]) < 30 && data[p + 3] > 240;
      if (reference[3] < 16 ? transparent : sameColour) matches++;
    }
    return matches >= SAMPLES * 0.96;
  };

  let top = Math.floor(height / 2);
  let bottom = top;
  if (!isBlank(top)) throw new Error("This image has no empty space in the middle for the video. Upload it as a top or bottom banner instead.");
  while (top > 0 && isBlank(top - 1)) top--;
  while (bottom < height - 1 && isBlank(bottom + 1)) bottom++;
  if (bottom - top < height * 0.15 || top < 8 || height - 1 - bottom < 8) {
    throw new Error("Couldn't find a top banner, an empty middle and a bottom banner in this image. Upload it as a top or bottom banner instead.");
  }

  const crop = (y: number, h: number) => {
    const part = document.createElement("canvas");
    part.width = width;
    part.height = h;
    part.getContext("2d")?.drawImage(canvas, 0, y, width, h, 0, 0, width, h);
    return new Promise<Blob>((resolve, reject) => part.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't cut the image."))), "image/png"));
  };
  return { top: await crop(0, top), bottom: await crop(bottom + 1, height - 1 - bottom) };
}

export async function deleteBanner(banner: BannerDoc & { id: string }) {
  const { db, storage } = firebase();
  await deleteDoc(doc(db, COLLECTIONS.banners, banner.id));
  await deleteObject(storageRef(storage, banner.storagePath)).catch(() => undefined);
}

/** How much of the Short's height a designed banner may take, in percent. */
export const BANNER_PERCENT_MIN = 5;
export const BANNER_PERCENT_MAX = 40;
/** With a top and a bottom banner together, each may take at most this much, so the video keeps 40%. */
export const BANNER_PERCENT_MAX_PAIRED = 30;

/** Canvas height (even, as video needs) of a banner covering `percent` of the Short. */
export function bannerHeightForPercent(percent: number): number {
  const clamped = Math.min(BANNER_PERCENT_MAX, Math.max(BANNER_PERCENT_MIN, percent || BANNER_PERCENT_MIN));
  return 2 * Math.round((SHORT_HEIGHT * clamped) / 200);
}

export const BANNER_PATTERNS = ["none", "stripes", "dots", "rays", "bubbles"] as const;
export const BANNER_LAYOUTS = ["title", "button", "comic"] as const;

/** Everything about a designed banner except how tall it is. */
export interface BannerStyle {
  /** Main line. */
  text: string;
  /** Smaller second line; empty for none. */
  sub: string;
  /** Background runs from `background` (outer edge) to `background2`; make them equal for a flat colour. */
  background: string;
  background2: string;
  pattern: (typeof BANNER_PATTERNS)[number];
  /** The line along the edge that touches the video, and the button in the `button` layout. */
  accent: string;
  /** Text colour. */
  color: string;
  /** `title`: big text. `button`: the text sits in a pill, like a call-to-action. `comic`: tilted cartoon lettering with a thick outline. */
  layout: (typeof BANNER_LAYOUTS)[number];
}

export interface BannerDesign extends BannerStyle {
  /** Canvas pixels, on the 1080-wide Short. */
  height: number;
}

/** An image of the user's own, placed on a designed banner. */
export interface BannerPicture {
  image: HTMLImageElement;
  side: "left" | "right";
}

/** Reads an image file the user picked, ready to draw. */
export function loadPicture(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That file isn't an image we can read."));
    image.src = URL.createObjectURL(file);
  });
}

const DISPLAY_FONT = '"Arial Black", "Segoe UI Black", Impact, system-ui, sans-serif';

/** Black or white, whichever reads better on `hex`. */
function contrastOn(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const luminance = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luminance > 150 ? "#111114" : "#ffffff";
}

/** Sets the largest font up to `size` at which `text` fits in `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number, weight = 900) {
  do {
    ctx.font = `${weight} ${size}px ${DISPLAY_FONT}`;
    size -= 3;
  } while (ctx.measureText(text).width > maxWidth && size > 20);
}

/**
 * Draws a designed banner onto `canvas`. `position` decides which edge gets the
 * accent line — always the one next to the video.
 */
export function drawBanner(canvas: HTMLCanvasElement, design: BannerDesign, position: BannerPosition, picture?: BannerPicture | null) {
  const width = (canvas.width = SHORT_WIDTH);
  const height = (canvas.height = design.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background: gradient from the outer edge towards the video.
  const gradient = ctx.createLinearGradient(0, position === "top" ? 0 : height, 0, position === "top" ? height : 0);
  gradient.addColorStop(0, design.background);
  gradient.addColorStop(1, design.background2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = ctx.strokeStyle = contrastOn(design.background);
  if (design.pattern === "stripes") {
    ctx.lineWidth = 26;
    for (let x = -height; x < width + height; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }
  } else if (design.pattern === "dots") {
    for (let y = 22; y < height; y += 44) {
      for (let x = (Math.round(y / 44) % 2) * 22 + 22; x < width; x += 44) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (design.pattern === "rays") {
    // A cartoon sunburst fanning out from behind the text.
    ctx.globalAlpha = 0.1;
    const reach = width + height;
    for (let i = 0; i < 28; i += 2) {
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2);
      ctx.arc(width / 2, height / 2, reach, (i * Math.PI) / 14, ((i + 1) * Math.PI) / 14);
      ctx.fill();
    }
  } else if (design.pattern === "bubbles") {
    ctx.globalAlpha = 0.1;
    // Fixed positions (not random) so the saved banner matches the preview exactly.
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(((i * 197) % width) + 30, ((i * 89) % height) + 10, 18 + ((i * 37) % 46), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  const line = Math.max(8, Math.round(height * 0.035));
  ctx.fillStyle = design.accent;
  ctx.fillRect(0, position === "top" ? height - line : 0, width, line);

  // The user's own picture (a logo, a character they have the rights to) sits at one side; the text takes the rest.
  let span = width;
  let cx = width / 2;
  if (picture) {
    const inner = height - line;
    const size = Math.round(inner * 0.86);
    const drawn = Math.min(size * (picture.image.naturalWidth / picture.image.naturalHeight), width * 0.4);
    const drawnHeight = drawn * (picture.image.naturalHeight / picture.image.naturalWidth);
    const x = picture.side === "left" ? 36 : width - 36 - drawn;
    ctx.drawImage(picture.image, x, (position === "top" ? 0 : line) + (inner - drawnHeight) / 2, drawn, drawnHeight);
    span = width - drawn - 36;
    cx = picture.side === "left" ? width - span / 2 : span / 2;
  }
  // Text block, centred in what's left beside the accent line.
  const text = design.text.trim();
  const sub = design.sub.trim();
  if (!text && !sub) return;
  const area = height - line;
  const centre = (position === "top" ? 0 : line) + area / 2;
  const subSize = sub ? Math.min(46, Math.round(area * 0.17)) : 0;
  const gap = sub && text ? Math.round(area * 0.07) : 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (design.layout === "button" && text) {
    const pillHeight = Math.min(150, Math.round(area * (sub ? 0.42 : 0.56)));
    fitFont(ctx, text.toUpperCase(), Math.round(pillHeight * 0.52), span - 260);
    const pillWidth = Math.min(span - 120, ctx.measureText(text.toUpperCase()).width + pillHeight * 1.3);
    const top = centre - (pillHeight + gap + subSize) / 2;
    // A darker lip under the pill gives it the pressed-button look.
    ctx.fillStyle = "rgb(0 0 0 / 0.35)";
    ctx.beginPath();
    ctx.roundRect(cx - pillWidth / 2, top + 10, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = design.accent;
    ctx.beginPath();
    ctx.roundRect(cx - pillWidth / 2, top, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = contrastOn(design.accent);
    ctx.fillText(text.toUpperCase(), cx, top + pillHeight / 2 + 3);
    if (sub) {
      ctx.fillStyle = design.color;
      fitFont(ctx, sub, subSize, span - 120, 700);
      ctx.fillText(sub, cx, top + pillHeight + gap + subSize / 2 + 6);
    }
    return;
  }

  const titleSize = Math.round(area * (sub ? 0.4 : 0.5));
  const top = centre - (titleSize + gap + subSize) / 2;
  if (design.layout === "comic") {
    const outline = "#16161d";
    const draw = (line: string, y: number, size: number, fill: string, tilt: number) => {
      ctx.save();
      ctx.translate(cx, y);
      ctx.rotate(tilt);
      ctx.lineJoin = "round";
      ctx.strokeStyle = outline;
      // Offset copy first: the hard drop shadow of cartoon title cards.
      ctx.fillStyle = outline;
      ctx.lineWidth = size * 0.26;
      ctx.strokeText(line, size * 0.07, size * 0.09);
      ctx.strokeText(line, 0, 0);
      ctx.fillStyle = fill;
      ctx.fillText(line, 0, 0);
      ctx.restore();
    };
    if (text) {
      fitFont(ctx, text.toUpperCase(), Math.round(titleSize * 1.08), span - 170);
      draw(text.toUpperCase(), top + titleSize / 2, Number.parseInt(ctx.font.split(" ")[1], 10), design.color, -0.035);
    }
    if (sub) {
      fitFont(ctx, sub, subSize, span - 160, 900);
      draw(sub, top + (text ? titleSize + gap : 0) + subSize / 2 + 4, subSize, design.accent, 0);
    }
    return;
  }
  if (text) {
    fitFont(ctx, text, titleSize, span - 110);
    // A soft drop shadow lifts the title off busy backgrounds.
    ctx.fillStyle = "rgb(0 0 0 / 0.35)";
    ctx.fillText(text, cx + 4, top + titleSize / 2 + 6);
    ctx.fillStyle = design.color;
    ctx.fillText(text, cx, top + titleSize / 2);
  }
  if (sub) {
    ctx.fillStyle = design.accent;
    fitFont(ctx, sub, subSize, span - 120, 700);
    ctx.fillText(sub, cx, top + (text ? titleSize + gap : 0) + subSize / 2);
  }
}

export function bannerDesignToPng(design: BannerDesign, position: BannerPosition, picture?: BannerPicture | null): Promise<Blob> {
  const canvas = document.createElement("canvas");
  drawBanner(canvas, design, position, picture);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't draw the banner."))), "image/png"));
}

export interface BannerPreset {
  name: string;
  position: BannerPosition;
  /** Height as a share of the Short, in percent. */
  percent: number;
  style: BannerStyle;
}

const preset = (name: string, position: BannerPosition, percent: number, style: BannerStyle): BannerPreset => ({ name, position, percent, style });

/** Ready-made starting points. Picking one loads it into the designer, where every part can be changed. */
export const BANNER_PRESETS: BannerPreset[] = [
  preset("Arcade title", "top", 20, { text: "SKATE RUSH", sub: "FREE 3D GAME", background: "#0f1b3d", background2: "#1c3a70", pattern: "stripes", accent: "#f59e0b", color: "#ffffff", layout: "title" }),
  preset("Arcade play button", "bottom", 20, { text: "Play now", sub: "Dodge the traffic • Grab every coin", background: "#0f1b3d", background2: "#1c3a70", pattern: "stripes", accent: "#f59e0b", color: "#ffffff", layout: "button" }),
  preset("Subscribe", "bottom", 16, { text: "Subscribe", sub: "New Shorts every day", background: "#16060a", background2: "#3b0d16", pattern: "none", accent: "#ff2d3d", color: "#ffffff", layout: "button" }),
  preset("Follow for more", "bottom", 12, { text: "Follow for more", sub: "", background: "#5b3df5", background2: "#8b6cff", pattern: "dots", accent: "#ffffff", color: "#ffffff", layout: "title" }),
  preset("Watch till the end", "top", 13, { text: "WATCH TILL THE END", sub: "", background: "#050507", background2: "#12121a", pattern: "none", accent: "#22d3ee", color: "#22d3ee", layout: "title" }),
  preset("Movie clip", "top", 16, { text: "MOVIE CLIPS", sub: "Best scenes • Every day", background: "#0a0a0a", background2: "#1f1a0d", pattern: "none", accent: "#facc15", color: "#facc15", layout: "title" }),
  preset("Full video on channel", "bottom", 14, { text: "Full video on my channel", sub: "", background: "#0a0a0a", background2: "#1f1a0d", pattern: "none", accent: "#facc15", color: "#ffffff", layout: "title" }),
  preset("Sunset title", "top", 16, { text: "MUST WATCH", sub: "You won't believe this", background: "#ff7a18", background2: "#e0245e", pattern: "stripes", accent: "#ffffff", color: "#ffffff", layout: "title" }),
  preset("Link in bio", "bottom", 16, { text: "Link in bio", sub: "Tap the profile to get it", background: "#e0245e", background2: "#ff7a18", pattern: "stripes", accent: "#ffffff", color: "#ffffff", layout: "button" }),
  preset("Clean white", "top", 12, { text: "Part of a series", sub: "", background: "#ffffff", background2: "#eef0f5", pattern: "none", accent: "#111114", color: "#111114", layout: "title" }),
  preset("Like share subscribe", "bottom", 13, { text: "LIKE • SHARE • SUBSCRIBE", sub: "", background: "#052e1a", background2: "#0b5d33", pattern: "dots", accent: "#3ddc97", color: "#ffffff", layout: "title" }),
  preset("Download now", "bottom", 18, { text: "Download now", sub: "Free on Android and iPhone", background: "#071a33", background2: "#0d3b7a", pattern: "dots", accent: "#38bdf8", color: "#ffffff", layout: "button" }),
  preset("Breaking news", "top", 14, { text: "BREAKING", sub: "Latest update", background: "#7f0d16", background2: "#c8102e", pattern: "none", accent: "#ffffff", color: "#ffffff", layout: "title" }),
  // Cartoon looks: colours and lettering in the spirit of each show — no characters or logos, which belong to their studios.
  preset("Cat & mouse — title", "top", 20, { text: "Tom & Jerry", sub: "Funniest chase moments", background: "#2f5fa8", background2: "#6ea4dd", pattern: "rays", accent: "#f59e0b", color: "#ffd23f", layout: "comic" }),
  preset("Cat & mouse — bottom", "bottom", 18, { text: "Watch more", sub: "Cat vs Mouse • New clip every day", background: "#8a4b17", background2: "#d98a3a", pattern: "bubbles", accent: "#ffd23f", color: "#ffffff", layout: "button" }),
  preset("Blue cat — title", "top", 20, { text: "Oggy", sub: "and the Cockroaches", background: "#0b7fd6", background2: "#4fc3f7", pattern: "bubbles", accent: "#ff5fa2", color: "#ffffff", layout: "comic" }),
  preset("Blue cat — bottom", "bottom", 18, { text: "Follow for laughs", sub: "Crazy cat comedy • Daily", background: "#7a2a8f", background2: "#c04bd3", pattern: "rays", accent: "#ffe14d", color: "#ffffff", layout: "comic" }),
  preset("Alien hero — title", "top", 20, { text: "Ben 10", sub: "It's hero time!", background: "#050805", background2: "#12300f", pattern: "rays", accent: "#7ee01f", color: "#7ee01f", layout: "comic" }),
  preset("Alien hero — bottom", "bottom", 18, { text: "Subscribe", sub: "A new alien every day", background: "#12300f", background2: "#050805", pattern: "stripes", accent: "#7ee01f", color: "#ffffff", layout: "button" }),
  preset("Robot cat — title", "top", 20, { text: "Doraemon", sub: "Gadget of the day", background: "#0a84d6", background2: "#59c2ff", pattern: "bubbles", accent: "#e11d48", color: "#ffffff", layout: "comic" }),
  preset("Naughty kid — title", "top", 20, { text: "Shinchan", sub: "Non-stop masti", background: "#e11d2e", background2: "#ff7043", pattern: "rays", accent: "#ffe14d", color: "#ffe14d", layout: "comic" }),
  preset("Village hero — title", "top", 20, { text: "Chhota Bheem", sub: "Dholakpur adventures", background: "#e8590c", background2: "#ffb347", pattern: "rays", accent: "#7c2d12", color: "#ffffff", layout: "comic" }),
  preset("Funny duo — title", "top", 20, { text: "Motu Patlu", sub: "Samosa time!", background: "#0f766e", background2: "#34d399", pattern: "bubbles", accent: "#fde047", color: "#fde047", layout: "comic" }),
  preset("Silent comedy — title", "top", 20, { text: "Mr Bean", sub: "Funniest moments", background: "#14532d", background2: "#3f8f4f", pattern: "stripes", accent: "#fde047", color: "#ffffff", layout: "comic" }),
  preset("Pocket monsters — title", "top", 20, { text: "Pokémon", sub: "Gotta watch 'em all", background: "#1d4ed8", background2: "#3b82f6", pattern: "rays", accent: "#facc15", color: "#facc15", layout: "comic" }),
  preset("Sea sponge — title", "top", 20, { text: "SpongeBob", sub: "Bikini Bottom laughs", background: "#0891b2", background2: "#67e8f9", pattern: "bubbles", accent: "#fde047", color: "#fde047", layout: "comic" }),
  preset("Ninja boy — title", "top", 20, { text: "Ninja Hattori", sub: "Ding ding ding!", background: "#1e3a8a", background2: "#2563eb", pattern: "stripes", accent: "#f97316", color: "#ffffff", layout: "comic" }),
  preset("Jungle boy — title", "top", 20, { text: "Mowgli", sub: "Jungle Book stories", background: "#3f6212", background2: "#84cc16", pattern: "bubbles", accent: "#f59e0b", color: "#ffffff", layout: "comic" }),
  preset("Super cops — title", "top", 20, { text: "Little Singham", sub: "Police ka sher", background: "#7c2d12", background2: "#f59e0b", pattern: "rays", accent: "#1e3a8a", color: "#ffffff", layout: "comic" }),
  preset("More episodes — bottom", "bottom", 16, { text: "More episodes", sub: "Follow • New clip every day", background: "#1e1b4b", background2: "#4338ca", pattern: "bubbles", accent: "#fde047", color: "#ffffff", layout: "button" }),
  preset("Next part — bottom", "bottom", 14, { text: "Next part on my channel", sub: "", background: "#111827", background2: "#374151", pattern: "stripes", accent: "#f97316", color: "#ffffff", layout: "comic" }),
  preset("Cartoon time — title", "top", 18, { text: "Cartoon time", sub: "Best funny scenes", background: "#e11d48", background2: "#fb923c", pattern: "rays", accent: "#fde047", color: "#fde047", layout: "comic" }),
  preset("Cartoon time — bottom", "bottom", 16, { text: "Like & subscribe", sub: "More cartoons every day", background: "#fb923c", background2: "#e11d48", pattern: "bubbles", accent: "#fde047", color: "#ffffff", layout: "button" }),
  preset("Kids fun — title", "top", 18, { text: "Kids fun", sub: "Laugh out loud", background: "#16a34a", background2: "#a3e635", pattern: "bubbles", accent: "#f43f5e", color: "#ffffff", layout: "comic" }),
  preset("Kids fun — bottom", "bottom", 14, { text: "Part of a series • Follow", sub: "", background: "#0ea5e9", background2: "#6366f1", pattern: "dots", accent: "#fde047", color: "#ffffff", layout: "comic" }),
  preset("Gaming neon", "top", 16, { text: "EPIC GAMEPLAY", sub: "Wait for the ending", background: "#12052b", background2: "#3a0d6b", pattern: "stripes", accent: "#ff3df2", color: "#ffffff", layout: "title" }),
];

