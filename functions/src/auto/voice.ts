import { applicationDefault } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";

/** Tried after the voice asked for, in order; the first the project can use wins. */
const FALLBACK_VOICES = ["ta-IN-Chirp3-HD-Charon", "ta-IN-Wavenet-D", "ta-IN-Standard-D"];
const SAMPLE_RATE = 24_000;
const BYTES_PER_SECOND = SAMPLE_RATE * 2; // 16-bit mono

/** Silence before the first line, between lines, and after the last. Seconds. */
const LEAD_IN = 0.4;
const GAP = 0.45;
/** Room after the punch line for the drum sting to ring out. */
const TAIL = 1.9;

/** A touch faster than normal: comedy wants pace. */
const SPEAKING_RATE = 1.1;

export interface Spoken {
  text: string;
  /** Who says it, when not the narrator — e.g. Amma's voice. */
  voice?: string;
  /** The speaker's name in the dialogue, e.g. "Machan" — for Gemini, which voices a whole dialogue at once. */
  speaker?: string;
  /** Extra silence before this line, e.g. for comic timing before a punch line. Seconds. */
  pauseBefore?: number;
}

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
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SAMPLE_RATE, speakingRate: SPEAKING_RATE },
    }),
  });
  const json = (await res.json()) as { audioContent?: string; error?: { message?: string } };
  if (!res.ok || !json.audioContent) throw new Error(`Text-to-Speech ${res.status}: ${json.error?.message ?? "no audio"}`);
  return pcmOf(Buffer.from(json.audioContent, "base64"));
}

/** Lays the spoken lines end to end with the gaps between them, and reports when each is heard. */
function stitch(lines: Spoken[], pcms: Buffer[]): Narration {
  const parts: Buffer[] = [silence(LEAD_IN)];
  const spans: Narration["spans"] = [];
  let at = LEAD_IN;
  pcms.forEach((pcm, i) => {
    const length = pcm.length / BYTES_PER_SECOND;
    spans.push({ start: at, end: at + length });
    const after = i === pcms.length - 1 ? TAIL : GAP + (lines[i + 1].pauseBefore ?? 0);
    parts.push(pcm, silence(after));
    at += length + after;
  });
  const pcm = Buffer.concat(parts);
  return { wav: wavOf(pcm), spans, durationSec: pcm.length / BYTES_PER_SECOND };
}

/**
 * Speaks each line with a Tamil Google voice, one after another: the line's own
 * voice when it has one (a character talking), the narrator's otherwise.
 */
export async function narrate(lines: Spoken[], narratorVoice: string): Promise<Narration> {
  return stitch(lines, await speakEach(lines, narratorVoice));
}

/** Each line spoken on its own by Cloud Text-to-Speech, as 24 kHz mono PCM, in order. */
export async function speakEach(lines: Spoken[], narratorVoice: string): Promise<Buffer[]> {
  const { access_token: token } = await applicationDefault().getAccessToken();

  // The narrator's voice, or the first fallback the project can use.
  let narrator: string | null = null;
  const firstNarrated = lines.findIndex((l) => !l.voice);
  const probe = lines[Math.max(0, firstNarrated)].text;
  let probed: Buffer | null = null;
  for (const candidate of [narratorVoice, ...FALLBACK_VOICES.filter((v) => v !== narratorVoice)]) {
    try {
      probed = await synthesize(token, candidate, probe);
      narrator = candidate;
      break;
    } catch (error) {
      logger.warn("Tamil voice unavailable, trying the next", { voice: candidate, error: String(error) });
    }
  }
  if (!narrator || !probed) throw new Error("No Tamil Text-to-Speech voice is available. Is the Cloud Text-to-Speech API enabled?");

  const pcms: Buffer[] = [];
  for (const [i, line] of lines.entries()) {
    if (i === Math.max(0, firstNarrated) && !line.voice) {
      pcms.push(probed);
      continue;
    }
    if (line.voice && line.voice !== narrator) {
      try {
        pcms.push(await synthesize(token, line.voice, line.text));
        continue;
      } catch (error) {
        // A character's voice that won't speak falls back to the narrator rather than failing the Short.
        logger.warn("Character voice unavailable, using the narrator", { voice: line.voice, error: String(error) });
      }
    }
    pcms.push(await synthesize(token, narrator, line.text));
  }
  return pcms;
}

/** A silent narration with the given line lengths — for previews without Text-to-Speech. */
export function silentNarration(lines: Spoken[], lengths: number[]): Narration {
  return stitch(lines, lengths.map((seconds) => silence(seconds)));
}

/** A narration from voice lines already spoken elsewhere, as 24 kHz mono 16-bit PCM — for previews. */
export function narrationFromPcm(lines: Spoken[], pcms: Buffer[]): Narration {
  return stitch(lines, pcms);
}

// ─── Gemini: the whole dialogue in one request ────────────────────────────────

/** Gemini's free speech model. One request voices a whole Short, so a day's Shorts fit in its daily limit. */
const GEMINI_TTS_MODEL = "gemini-3.8-flash-tts";

/**
 * Cuts one recording of the whole dialogue into its lines at the longest
 * silences — the pauses between lines are longer than those inside a line.
 * Null when it can't be done with confidence.
 */
export function splitAtPauses(pcm: Buffer, weights: number[]): Buffer[] | null {
  const count = weights.length;
  const WINDOW = Math.round(SAMPLE_RATE * 0.02); // 20 ms
  const windows = Math.floor(pcm.length / 2 / WINDOW);
  const quiet: boolean[] = [];
  for (let w = 0; w < windows; w++) {
    let sum = 0;
    for (let i = 0; i < WINDOW; i++) {
      const s = pcm.readInt16LE((w * WINDOW + i) * 2) / 32768;
      sum += s * s;
    }
    // About -38 dB.
    quiet.push(Math.sqrt(sum / WINDOW) < 0.0126);
  }
  // Speech starts at the first loud window and ends at the last one.
  const firstLoud = quiet.findIndex((q) => !q);
  let lastLoud = quiet.length - 1;
  while (lastLoud > 0 && quiet[lastLoud]) lastLoud--;
  if (firstLoud < 0) return null;

  // Runs of quiet of at least 0.2 s inside the speech: the places a cut can go.
  const runs: Array<{ from: number; to: number }> = [];
  for (let w = firstLoud; w <= lastLoud; ) {
    if (!quiet[w]) {
      w++;
      continue;
    }
    const from = w;
    while (w <= lastLoud && quiet[w]) w++;
    if ((w - from) * 0.02 >= 0.2) runs.push({ from, to: w });
  }
  if (runs.length < count - 1) return null;

  // Where each cut is expected: the lines take time in proportion to their length.
  const total = weights.reduce((s, x) => s + x, 0);
  const span = lastLoud + 1 - firstLoud;
  const expected: number[] = [];
  let acc = 0;
  for (let i = 0; i < count - 1; i++) expected.push(firstLoud + ((acc += weights[i]) / total) * span);
  const longest = Math.max(...runs.map((r) => r.to - r.from));
  // Prefer long pauses near where a cut is expected; choose them in order (a small dynamic programme).
  const cost = (i: number, j: number) => Math.abs((runs[j].from + runs[j].to) / 2 - expected[i]) / span - 0.35 * ((runs[j].to - runs[j].from) / longest);
  const best: number[][] = expected.map(() => runs.map(() => Infinity));
  const prev: number[][] = expected.map(() => runs.map(() => -1));
  for (let j = 0; j < runs.length; j++) best[0][j] = cost(0, j);
  for (let i = 1; i < expected.length; i++) {
    for (let j = i; j < runs.length; j++) {
      for (let k = i - 1; k < j; k++) {
        const c = best[i - 1][k] + cost(i, j);
        if (c < best[i][j]) {
          best[i][j] = c;
          prev[i][j] = k;
        }
      }
    }
  }
  let j = -1;
  let lowest = Infinity;
  for (let c = 0; c < runs.length; c++) if (best[expected.length - 1][c] < lowest) [lowest, j] = [best[expected.length - 1][c], c];
  const chosen: number[] = [];
  for (let i = expected.length - 1; i >= 0 && j >= 0; i--) {
    chosen.unshift(j);
    j = prev[i][j];
  }
  if (chosen.length !== count - 1) return null;
  const cuts = chosen.map((c) => runs[c]);
  const bounds = [firstLoud, ...cuts.flatMap((c) => [c.from, c.to]), lastLoud + 1];
  const parts: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    const from = bounds[i * 2] * WINDOW * 2;
    const to = bounds[i * 2 + 1] * WINDOW * 2;
    if (to - from < BYTES_PER_SECOND * 0.25) return null;
    parts.push(pcm.subarray(from, to));
  }
  return parts;
}

/**
 * Voices a dialogue with Gemini in a single request — two speakers talking to
 * each other, with more life than line-by-line speech — and cuts it back into
 * its lines, as 24 kHz mono PCM. `voices` maps each speaker to a Gemini voice
 * name ("Puck", "Kore"…); Gemini takes at most two speakers. Works best when
 * the speakers take turns: Gemini pauses between turns, not always within one.
 */
export async function geminiLines(apiKey: string, lines: Array<Spoken & { speaker: string }>, voices: Record<string, string>): Promise<Buffer[]> {
  return splitDialogue(await geminiSpeech(apiKey, lines, voices), lines);
}

/** Gemini's one recording of the whole dialogue, as 24 kHz mono PCM. */
export async function geminiSpeech(apiKey: string, lines: Array<Spoken & { speaker: string }>, voices: Record<string, string>): Promise<Buffer> {
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  if (speakers.length < 1 || speakers.length > 2) throw new Error(`Gemini voices one or two speakers, not ${speakers.length}.`);
  const speechConfig =
    speakers.length === 1
      ? { voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[speakers[0]] } } }
      : { multiSpeakerVoiceConfig: { speakerVoiceConfigs: speakers.map((speaker) => ({ speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[speaker] } } })) } };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: lines.map((l) => (speakers.length === 1 ? { text: l.text } : { text: l.text, speechMetadata: { speaker: l.speaker } })) }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig },
    }),
  });
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }>;
    error?: { status?: string; message?: string };
  };
  if (!res.ok) throw new Error(`Gemini speech ${res.status} ${json.error?.status ?? ""}: ${json.error?.message ?? "failed"}`);
  const inline = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!inline) throw new Error("Gemini returned no audio.");
  const data = Buffer.from(inline.data, "base64");
  const rate = Number(/rate=(\d+)/.exec(inline.mimeType)?.[1] ?? (data.toString("ascii", 0, 4) === "RIFF" ? data.readUInt32LE(24) : SAMPLE_RATE));
  if (rate !== SAMPLE_RATE) throw new Error(`Gemini audio is ${rate} Hz, not ${SAMPLE_RATE}.`);
  return data.toString("ascii", 0, 4) === "RIFF" ? pcmOf(data) : data;
}

/**
 * Cuts at the longest pauses, in time order: the turns between speakers are
 * usually the longest silences. Null unless those pauses stand clearly apart
 * from the next longest, which would be a pause inside a line.
 */
export function splitAtLongestPauses(pcm: Buffer, count: number): Buffer[] | null {
  const WINDOW = Math.round(SAMPLE_RATE * 0.02);
  const windows = Math.floor(pcm.length / 2 / WINDOW);
  const quiet: boolean[] = [];
  for (let w = 0; w < windows; w++) {
    let sum = 0;
    for (let i = 0; i < WINDOW; i++) sum += (pcm.readInt16LE((w * WINDOW + i) * 2) / 32768) ** 2;
    quiet.push(Math.sqrt(sum / WINDOW) < 0.0126);
  }
  const firstLoud = quiet.findIndex((q) => !q);
  let lastLoud = quiet.length - 1;
  while (lastLoud > 0 && quiet[lastLoud]) lastLoud--;
  if (firstLoud < 0) return null;
  const runs: Array<{ from: number; to: number }> = [];
  for (let w = firstLoud; w <= lastLoud; ) {
    if (!quiet[w]) {
      w++;
      continue;
    }
    const from = w;
    while (w <= lastLoud && quiet[w]) w++;
    runs.push({ from, to: w });
  }
  const byLength = [...runs].sort((a, b) => b.to - b.from - (a.to - a.from));
  const cuts = byLength.slice(0, count - 1);
  const next = byLength[count - 1];
  if (cuts.length !== count - 1) return null;
  const shortestCut = Math.min(...cuts.map((c) => c.to - c.from));
  if (next && shortestCut < (next.to - next.from) * 1.3) return null;
  cuts.sort((a, b) => a.from - b.from);
  const bounds = [firstLoud, ...cuts.flatMap((c) => [c.from, c.to]), lastLoud + 1];
  const parts: Buffer[] = [];
  for (let i = 0; i < count; i++) parts.push(pcm.subarray(bounds[i * 2] * WINDOW * 2, bounds[i * 2 + 1] * WINDOW * 2));
  return parts;
}

/** Cuts a recording of the whole dialogue back into its lines; throws when it can't be done with confidence. */
export function splitDialogue(pcm: Buffer, lines: Spoken[]): Buffer[] {
  const letters = lines.map((l) => l.text.length);
  // Each piece should be about as long as its line is wordy; if not, a cut landed mid-line.
  const even = (parts: Buffer[] | null): parts is Buffer[] => {
    if (!parts) return false;
    const perLetter = parts.reduce((s, p) => s + p.length, 0) / letters.reduce((s, n) => s + n, 0);
    return parts.every((p, i) => p.length >= BYTES_PER_SECOND * 0.2 && p.length / (letters[i] * perLetter) >= 0.4 && p.length / (letters[i] * perLetter) <= 2.5);
  };
  const parts = splitAtPauses(pcm, letters);
  if (even(parts)) return parts;
  // A pause inside a line can fool the first way; the turns are usually the longest pauses.
  const byTurns = splitAtLongestPauses(pcm, lines.length);
  if (even(byTurns)) return byTurns;
  throw new Error(parts ? "Gemini's recording split unevenly; a pause fell inside a line." : "Couldn't split Gemini's recording into its lines.");
}
