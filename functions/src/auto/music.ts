/**
 * A calm lo-fi bed for the AI Shorts, synthesised from scratch so it is ours,
 * with nothing for Content ID to claim: soft electric-piano chords and a lazy
 * arpeggio over a warm pad and a sub bass, in a small room, at 70 BPM.
 * `seed` changes the progression's starting chord and the arpeggio's feel.
 */

const SR = 48_000;
const BEAT = 60 / 70;
const BAR = BEAT * 4;
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** Fmaj7 → Em7 → Dm7 → Cmaj7, voiced in the middle, with their roots. */
const CHORDS = [
  { notes: [53, 57, 60, 64], root: 41 },
  { notes: [52, 55, 59, 62], root: 40 },
  { notes: [50, 53, 57, 60], root: 38 },
  { notes: [48, 52, 55, 59], root: 36 },
];

/** 16-bit stereo WAV, `seconds` long, faded in and out. */
export function calmMusic(seconds: number, seed: number): Buffer {
  const n = Math.round(SR * seconds);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647;

  /** Electric piano: FM with a decaying index and a slow decay, panned a little. */
  function ep(start: number, freq: number, vel: number, len: number, pan: number) {
    const i0 = Math.round(start * SR);
    const count = Math.min(n - i0, Math.round(len * SR));
    for (let i = 0; i < count; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.006) * Math.exp(-t * 1.6) * (t > len - 0.3 ? (len - t) / 0.3 : 1);
      const index = 1.4 * Math.exp(-t * 6) + 0.25;
      const w = 2 * Math.PI * freq * t;
      const x = (Math.sin(w + index * Math.sin(w)) + 0.12 * Math.sin(2 * w) * Math.exp(-t * 3)) * env * vel;
      left[i0 + i] += x * (1 - pan);
      right[i0 + i] += x * pan;
    }
  }

  /** Detuned sines swelling over the bar. */
  function pad(start: number, freq: number, len: number) {
    const i0 = Math.round(start * SR);
    const count = Math.min(n - i0, Math.round(len * SR));
    for (let i = 0; i < count; i++) {
      const t = i / SR;
      const env = Math.sin(Math.PI * Math.min(1, t / len)) ** 1.5 * 0.035;
      left[i0 + i] += Math.sin(2 * Math.PI * freq * 0.998 * t) * env;
      right[i0 + i] += Math.sin(2 * Math.PI * freq * 1.002 * t) * env;
    }
  }

  function bass(start: number, freq: number, len: number) {
    const i0 = Math.round(start * SR);
    const count = Math.min(n - i0, Math.round(len * SR));
    for (let i = 0; i < count; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.02) * Math.exp(-t * 0.9) * (t > len - 0.2 ? (len - t) / 0.2 : 1);
      const x = (Math.sin(2 * Math.PI * freq * t) + 0.2 * Math.sin(4 * Math.PI * freq * t)) * env * 0.16;
      left[i0 + i] += x;
      right[i0 + i] += x;
    }
  }

  const offset = Math.abs(Math.floor(seed)) % CHORDS.length;
  for (let bar = 0; bar * BAR < seconds; bar++) {
    const at = bar * BAR;
    const chord = CHORDS[(bar + offset) % CHORDS.length];
    chord.notes.forEach((m, k) => ep(at + k * 0.025 + rnd() * 0.01, midi(m), 0.07, BAR, 0.35 + k * 0.1));
    const arp = [chord.notes[1], chord.notes[2], chord.notes[3], chord.notes[2], chord.notes[0]].map((m) => m + 12);
    [1, 1.5, 2.5, 3, 3.5].forEach((beat, k) => {
      if (rnd() < 0.2) return;
      ep(at + beat * BEAT + (rnd() - 0.5) * 0.02, midi(arp[k]), 0.035 + rnd() * 0.015, BEAT * 1.6, 0.25 + rnd() * 0.5);
    });
    chord.notes.forEach((m) => pad(at, midi(m + 12), BAR));
    bass(at, midi(chord.root), BEAT * 2.2);
    bass(at + BEAT * 2.5, midi(chord.root + 7), BEAT * 1.4);
  }

  // A small Schroeder room per channel, then a soft low-pass.
  function room(x: Float32Array, spread: number) {
    const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + spread), i: 0, f: 0 }));
    const passes = [225, 556].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
    const out = new Float32Array(x.length);
    let low = 0;
    for (let s = 0; s < x.length; s++) {
      let y = 0;
      for (const c of combs) {
        const o = c.buf[c.i];
        c.f = o * 0.7 + c.f * 0.3;
        c.buf[c.i] = x[s] + c.f * 0.82;
        c.i = (c.i + 1) % c.buf.length;
        y += o;
      }
      for (const a of passes) {
        const o = a.buf[a.i];
        a.buf[a.i] = y + o * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        y = o - y * 0.5;
      }
      low += (x[s] * 0.75 + y * 0.12 - low) * 0.35;
      out[s] = low;
    }
    return out;
  }
  const wetL = room(left, 0);
  const wetR = room(right, 23);

  let peak = 1e-6;
  for (let s = 0; s < n; s++) peak = Math.max(peak, Math.abs(wetL[s]), Math.abs(wetR[s]));
  const gain = 0.7 / peak;
  const pcm = Buffer.alloc(n * 4);
  for (let s = 0; s < n; s++) {
    const fade = Math.min(1, s / (SR * 0.8), (n - s) / (SR * 1.2));
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, wetL[s] * gain * fade)) * 32767), s * 4);
    pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, wetR[s] * gain * fade)) * 32767), s * 4 + 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
