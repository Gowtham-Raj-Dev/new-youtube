import { applicationDefault } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";

/** Google Cloud Text-to-Speech, Tamil. Tried in order; the first the project can use wins. */
const VOICES = ["ta-IN-Chirp3-HD-Charon", "ta-IN-Chirp3-HD-Puck", "ta-IN-Wavenet-D", "ta-IN-Standard-D"];
const SAMPLE_RATE = 24_000;
const BYTES_PER_SECOND = SAMPLE_RATE * 2; // 16-bit mono

/** Silence before the first line, between lines, and after the last. Seconds. */
const LEAD_IN = 0.4;
const GAP = 0.35;
const TAIL = 1.2;

export interface Narration {
  /** 16-bit mono PCM WAV of the whole voice-over. */
  wav: Buffer;
  /** When each line is spoken, in seconds from the start, in the order given. */
  spans: Array<{ start: number; end: number }>;
  durationSec: number;
}

/** The PCM samples inside a WAV file. */
function pcmOf(wav: Buffer): Buffer {
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === "data") return wav.subarray(offset + 8, Math.min(wav.length, offset + 8 + size));
    offset += 8 + size + (size % 2);
  }
  throw new Error("Text-to-Speech returned audio without samples.");
}

function wavOf(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(BYTES_PER_SECOND, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const silence = (seconds: number) => Buffer.alloc(Math.round(seconds * SAMPLE_RATE) * 2);

async function synthesize(token: string, voice: string, text: string): Promise<Buffer> {
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "ta-IN", name: voice },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SAMPLE_RATE },
    }),
  });
  const json = (await res.json()) as { audioContent?: string; error?: { message?: string } };
  if (!res.ok || !json.audioContent) throw new Error(`Text-to-Speech ${res.status}: ${json.error?.message ?? "no audio"}`);
  return pcmOf(Buffer.from(json.audioContent, "base64"));
}

/** Speaks each line with a Tamil voice, one after another, and reports when each is heard. */
export async function narrate(lines: string[]): Promise<Narration> {
  const { access_token: token } = await applicationDefault().getAccessToken();

  let voice: string | null = null;
  let first: Buffer | null = null;
  for (const candidate of VOICES) {
    try {
      first = await synthesize(token, candidate, lines[0]);
      voice = candidate;
      break;
    } catch (error) {
      logger.warn("Tamil voice unavailable, trying the next", { voice: candidate, error: String(error) });
    }
  }
  if (!voice || !first) throw new Error("No Tamil Text-to-Speech voice is available. Is the Cloud Text-to-Speech API enabled?");

  const parts: Buffer[] = [silence(LEAD_IN)];
  const spans: Narration["spans"] = [];
  let at = LEAD_IN;
  for (let i = 0; i < lines.length; i++) {
    const pcm = i === 0 ? first : await synthesize(token, voice, lines[i]);
    const length = pcm.length / BYTES_PER_SECOND;
    spans.push({ start: at, end: at + length });
    parts.push(pcm, silence(i === lines.length - 1 ? TAIL : GAP));
    at += length + (i === lines.length - 1 ? TAIL : GAP);
  }

  const pcm = Buffer.concat(parts);
  return { wav: wavOf(pcm), spans, durationSec: pcm.length / BYTES_PER_SECOND };
}

/** A silent narration with the given line lengths — for previews without Text-to-Speech. */
export function silentNarration(lengths: number[]): Narration {
  const spans: Narration["spans"] = [];
  let at = LEAD_IN;
  lengths.forEach((length, i) => {
    spans.push({ start: at, end: at + length });
    at += length + (i === lengths.length - 1 ? TAIL : GAP);
  });
  return { wav: wavOf(silence(at)), spans, durationSec: at };
}
