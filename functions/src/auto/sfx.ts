/**
 * Comedy sound effects for the AI Shorts, synthesised from scratch so they are
 * ours: a "ba-dum-tss" drum sting after the punch line.
 */

const SR = 48_000;

export type SfxKind = "rimshot" | "whistle" | "doorbell" | "ring" | "ding" | "thud" | "whoosh" | "tick" | "pop";

export interface SfxEvent {
  /** Seconds from the start of the Short. */
  at: number;
  kind: SfxKind;
}

/** A tom hit: a sine dropping in pitch, with a click of noise at the front. */
function tom(out: Float32Array, at: number, from: number, to: number, gain: number, rnd: () => number) {
  const i0 = Math.round(at * SR);
  const len = Math.round(0.35 * SR);
  let phase = 0;
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR;
    const freq = to + (from - to) * Math.exp(-t * 18);
    phase += (2 * Math.PI * freq) / SR;
    const body = Math.sin(phase) * Math.exp(-t * 9);
    const click = (rnd() * 2 - 1) * Math.exp(-t * 120) * 0.6;
    out[i0 + i] += (body + click) * gain;
  }
}

/** A crash/hi-hat: bright noise that rings out. */
function cymbal(out: Float32Array, at: number, decay: number, gain: number, rnd: () => number) {
  const i0 = Math.round(at * SR);
  const len = Math.round(decay * 1.6 * SR);
  let last = 0;
  for (let i = 0; i < len && i0 + i < out.length; i++) {
    const t = i / SR;
    const noise = rnd() * 2 - 1;
    // A first difference keeps only the hiss: a cymbal, not a rumble.
    const bright = noise - last;
    last = noise;
    out[i0 + i] += bright * Math.exp(-t / (decay / 4)) * gain;
  }
}

/** A tone of `seconds` whose pitch follows `freq(t)`, shaped by `env(t)`. */
function tone(out: Float32Array, at: number, seconds: number, freq: (t: number) => number, env: (t: number) => number, gain: number) {
  const i0 = Math.round(at * SR);
  let phase = 0;
  for (let i = 0; i < seconds * SR && i0 + i < out.length; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * freq(t)) / SR;
    // A touch of the second harmonic makes it less of a pure beep.
    out[i0 + i] += (Math.sin(phase) + 0.25 * Math.sin(2 * phase)) * env(t) * gain;
  }
}

/** A mono 16-bit WAV, `seconds` long, with each effect at its time. */
export function sfxTrack(seconds: number, events: SfxEvent[]): Buffer {
  const n = Math.max(1, Math.round(seconds * SR));
  const out = new Float32Array(n);
  let state = 12345;
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647;

  for (const { at, kind } of events) {
    switch (kind) {
      case "whistle": {
        // A pressure-cooker whistle: a shrill, wavering hiss-tone that swells and dies.
        tone(out, at, 1.1, (t) => 1900 + Math.sin(t * 40) * 60, (t) => Math.min(1, t * 8) * Math.max(0, 1 - t / 1.1), 0.18);
        cymbal(out, at, 1.0, 0.08, rnd);
        break;
      }
      case "doorbell":
        tone(out, at, 0.7, () => 988, (t) => Math.exp(-t * 4), 0.3);
        tone(out, at + 0.45, 1.0, () => 784, (t) => Math.exp(-t * 3), 0.3);
        break;
      case "ring":
        // A phone ringing: two quick trills.
        for (const start of [0, 0.5]) tone(out, at + start, 0.35, (t) => (Math.floor(t * 40) % 2 ? 1300 : 1000), () => 1, 0.12);
        break;
      case "ding":
        tone(out, at, 1.4, () => 1568, (t) => Math.exp(-t * 3), 0.25);
        break;
      case "thud":
        tom(out, at, 140, 50, 0.9, rnd);
        break;
      case "whoosh": {
        // Noise sweeping up and away.
        const i0 = Math.round(at * SR);
        let low = 0;
        for (let i = 0; i < 0.5 * SR && i0 + i < n; i++) {
          const t = i / SR;
          const k = 0.02 + 0.3 * (t / 0.5);
          low += (rnd() * 2 - 1 - low) * k;
          out[i0 + i] += low * Math.sin((Math.PI * t) / 0.5) * 0.5;
        }
        break;
      }
      case "tick":
        tone(out, at, 0.04, () => 2400, (t) => Math.exp(-t * 120), 0.25);
        break;
      case "pop":
        tone(out, at, 0.12, (t) => 400 + t * 4000, (t) => Math.exp(-t * 30), 0.3);
        break;
      default:
        // Ba… dum… tss.
        tom(out, at, 260, 170, 0.55, rnd);
        tom(out, at + 0.17, 190, 115, 0.6, rnd);
        tom(out, at + 0.36, 120, 70, 0.35, rnd);
        cymbal(out, at + 0.36, 0.9, 0.22, rnd);
    }
  }

  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i])) * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
