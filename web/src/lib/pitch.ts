/**
 * Voice pitch change that keeps the length — the browser's version of what the
 * PC helper does with FFmpeg (`asetrate` + `atempo`). The sound is first
 * stretched `pitch` times longer without changing its pitch (WSOLA: overlapping
 * windows, each placed where it lines up best with the last), then played back
 * `pitch` times faster, which brings the length back and moves the pitch.
 */

/** Stretches every channel `stretch` times longer, keeping the pitch. Channels move together, so they stay in step. */
function wsola(channels: Float32Array[], rate: number, stretch: number): Float32Array[] {
  const length = channels[0]?.length ?? 0;
  const frame = 2 * Math.round(rate * 0.02); // 40 ms windows
  const hop = frame / 2; // output step
  const tolerance = Math.round(rate * 0.008); // how far a window may move to line up
  const window = new Float32Array(frame);
  for (let i = 0; i < frame; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1));

  const outLength = Math.ceil(length * stretch) + frame;
  const out = channels.map(() => new Float32Array(outLength));
  const weight = new Float32Array(outLength);
  // Lining up is judged on a mono mix.
  const mono = new Float32Array(length);
  for (const channel of channels) for (let i = 0; i < length; i++) mono[i] += channel[i] / channels.length;

  let previous = 0;
  for (let k = 0; ; k++) {
    const outAt = k * hop;
    const nominal = Math.round((k * hop) / stretch);
    if (nominal + frame + tolerance >= length || outAt + frame >= outLength) break;
    let from = nominal;
    if (k > 0) {
      // Where the last window would naturally carry on; the best-matching spot near `nominal` is used.
      const follow = previous + hop;
      let best = -Infinity;
      const lo = Math.max(0, nominal - tolerance);
      const hi = Math.min(length - frame, nominal + tolerance);
      for (let start = lo; start <= hi; start += 2) {
        let score = 0;
        for (let i = 0; i < hop; i += 4) {
          const a = follow + i < length ? mono[follow + i] : 0;
          score += a * mono[start + i];
        }
        if (score > best) {
          best = score;
          from = start;
        }
      }
    }
    for (let c = 0; c < channels.length; c++) {
      const src = channels[c];
      const dst = out[c];
      for (let i = 0; i < frame; i++) dst[outAt + i] += src[from + i] * window[i];
    }
    for (let i = 0; i < frame; i++) weight[outAt + i] += window[i];
    previous = from;
  }
  const kept = Math.round(length * stretch);
  return out.map((channel) => {
    const result = new Float32Array(kept);
    for (let i = 0; i < kept; i++) result[i] = weight[i] > 1e-3 ? channel[i] / weight[i] : 0;
    return result;
  });
}

/** The same sound with its pitch multiplied by `pitch` (1.2 = higher, 0.85 = deeper) and its length unchanged. */
export function pitchShift(channels: Float32Array[], rate: number, pitch: number): Float32Array[] {
  if (Math.abs(pitch - 1) < 0.005 || channels.length === 0) return channels;
  const length = channels[0].length;
  const stretched = wsola(channels, rate, pitch);
  return stretched.map((channel) => {
    const result = new Float32Array(length);
    const last = channel.length - 1;
    for (let i = 0; i < length; i++) {
      const at = i * pitch;
      const j = Math.floor(at);
      if (j >= last) {
        result[i] = channel[last] ?? 0;
        continue;
      }
      const f = at - j;
      result[i] = channel[j] * (1 - f) + channel[j + 1] * f;
    }
    return result;
  });
}

export interface DecodedSound {
  channels: Float32Array[];
  rate: number;
  /** Time in the source, in seconds, of `channels[*][0]`. */
  startSec: number;
}

/** Decodes `fromSec`…`toSec` of a video's sound. Null when it has none (or it can't be decoded here). */
export async function decodeSound(source: Blob | string, fromSec: number, toSec: number): Promise<DecodedSound | null> {
  const { ALL_FORMATS, AudioBufferSink, BlobSource, Input, UrlSource } = await import("mediabunny");
  const input = new Input({ source: typeof source === "string" ? new UrlSource(source) : new BlobSource(source), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) return null;
    const parts: AudioBuffer[] = [];
    let startSec: number | null = null;
    for await (const { buffer, timestamp } of new AudioBufferSink(track).buffers(fromSec, toSec)) {
      startSec ??= timestamp;
      parts.push(buffer);
    }
    if (parts.length === 0 || startSec === null) return null;
    const rate = parts[0].sampleRate;
    const count = Math.max(...parts.map((p) => p.numberOfChannels));
    const length = parts.reduce((sum, p) => sum + p.length, 0);
    const channels = Array.from({ length: count }, () => new Float32Array(length));
    let at = 0;
    for (const part of parts) {
      for (let c = 0; c < count; c++) channels[c].set(part.getChannelData(Math.min(c, part.numberOfChannels - 1)), at);
      at += part.length;
    }
    return { channels, rate, startSec };
  } finally {
    input.dispose();
  }
}
