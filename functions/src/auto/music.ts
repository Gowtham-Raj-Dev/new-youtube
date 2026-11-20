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

  return stereoWav(room(left, 0), room(right, 23));
}

/** A small Schroeder room for one channel, then a soft low-pass. */
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

/**
 * A light, steady beat for the pulse-look explainers, also synthesised from
 * scratch: a soft kick and clap, ticking hats, a plucked arpeggio and a pad over
 * Am → F → C → G at 96 BPM. Two bars of just the pad to start; every eighth bar
 * drops the kick so it breathes. Kept simple so it sits under a voice.
 */
export function pulseMusic(seconds: number, seed: number): Buffer {
  const BPM = 96;
  const beat = 60 / BPM;
  const bar = beat * 4;
  const n = Math.round(SR * seconds);
  const wetL = new Float32Array(n);
  const wetR = new Float32Array(n);
  const dry = new Float32Array(n);
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const chords = [
    { notes: [57, 60, 64, 69], root: 45 },
    { notes: [53, 57, 60, 65], root: 41 },
    { notes: [52, 55, 60, 64], root: 48 },
    { notes: [50, 55, 59, 62], root: 43 },
  ];

  const each = (start: number, len: number, f: (t: number, i: number) => void) => {
    const i0 = Math.round(start * SR);
    const count = Math.min(n - i0, Math.round(len * SR));
    for (let i = 0; i < count; i++) f(i / SR, i0 + i);
  };
  const kick = (at: number) =>
    each(at, 0.35, (t, i) => {
      const phase = 2 * Math.PI * (45 * t + (75 / 18) * (1 - Math.exp(-t * 18)));
      dry[i] += Math.sin(phase) * Math.exp(-t * 9) * 0.55;
    });
  const clap = (at: number) => {
    let last = 0;
    each(at, 0.25, (t, i) => {
      const noise = rnd() * 2 - 1;
      const hp = noise - last;
      last = noise;
      dry[i] += hp * Math.exp(-t * 20) * 0.1 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 35) * 0.06;
    });
  };
  const hat = (at: number, vel: number) => {
    let last = 0;
    each(at, 0.06, (t, i) => {
      const noise = rnd() * 2 - 1;
      dry[i] += (noise - last) * Math.exp(-t * 70) * vel;
      last = noise;
    });
  };
  const pluck = (at: number, freq: number, vel: number, pan: number) =>
    each(at, 0.9, (t, i) => {
      const w = 2 * Math.PI * freq * t;
      const x = Math.sin(w + 1.2 * Math.exp(-t * 9) * Math.sin(2 * w)) * Math.min(1, t / 0.004) * Math.exp(-t * 6) * vel;
      wetL[i] += x * (1 - pan);
      wetR[i] += x * pan;
    });
  const pad = (at: number, freq: number, len: number) =>
    each(at, len, (t, i) => {
      const env = Math.sin(Math.PI * Math.min(1, t / len)) ** 1.5 * 0.03;
      wetL[i] += Math.sin(2 * Math.PI * freq * 0.997 * t) * env;
      wetR[i] += Math.sin(2 * Math.PI * freq * 1.003 * t) * env;
    });
  const bass = (at: number, freq: number, len: number) =>
    each(at, len, (t, i) => {
      const env = Math.min(1, t / 0.01) * Math.exp(-t * 2.2) * (t > len - 0.05 ? (len - t) / 0.05 : 1);
      dry[i] += Math.tanh(1.6 * Math.sin(2 * Math.PI * freq * t)) * env * 0.15;
    });

  const offset = Math.abs(Math.floor(seed)) % chords.length;
  for (let b = 0; b * bar < seconds; b++) {
    const at = b * bar;
    const chord = chords[(b + offset) % chords.length];
    chord.notes.forEach((m) => pad(at, midi(m), bar));
    if (b < 2) continue;
    const breathe = b % 8 === 7;
    for (let k = 0; k < 4; k++) {
      if (!breathe && (k === 0 || k === 2)) kick(at + k * beat);
      if (k === 1 || k === 3) clap(at + k * beat);
    }
    for (let k = 0; k < 8; k++) hat(at + k * beat * 0.5 + (k % 2 ? 0.012 : 0), k % 2 ? 0.05 : 0.025);
    const arp = [0, 2, 1, 3, 2, 1, 3, 2].map((j) => chord.notes[j] + 12);
    arp.forEach((m, k) => {
      if (rnd() < 0.15) return;
      pluck(at + k * beat * 0.5, midi(m), 0.045 + rnd() * 0.01, 0.3 + rnd() * 0.4);
    });
    bass(at, midi(chord.root), beat * 0.9);
    bass(at + beat * 1.5, midi(chord.root), beat * 0.45);
    bass(at + beat * 2.5, midi(chord.root + 7), beat * 0.9);
  }
  const roomL = room(wetL, 0);
  const roomR = room(wetR, 23);
  for (let s = 0; s < n; s++) {
    roomL[s] += dry[s];
    roomR[s] += dry[s];
  }
  return stereoWav(roomL, roomR);
}

/**
 * A slow lo-fi bed for the feed-look explainers, synthesised from scratch: warm
 * electric-piano chords (Fmaj7 → Fmaj7(#11)-ish → Em7 → Am(add9)) at 76 BPM, a soft
 * swung beat, a round bass and a faint vinyl crackle. First two bars keys only;
 * every eighth bar drops the drums.
 */
export function lofiMusic(seconds: number, seed: number): Buffer {
  const BPM = 76;
  const beat = 60 / BPM;
  const bar = beat * 4;
  const swing = beat * 0.5 * 0.18;
  const n = Math.round(SR * seconds);
  const wetL = new Float32Array(n);
  const wetR = new Float32Array(n);
  const dry = new Float32Array(n);
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const chords = [
    { notes: [53, 57, 60, 64], root: 41 },
    { notes: [53, 57, 59, 64], root: 43 },
    { notes: [52, 55, 59, 62], root: 40 },
    { notes: [55, 59, 60, 64], root: 45 },
  ];
  const each = (start: number, len: number, f: (t: number, i: number) => void) => {
    const i0 = Math.round(start * SR);
    const count = Math.min(n - i0, Math.round(len * SR));
    for (let i = 0; i < count; i++) f(i / SR, i0 + i);
  };
  // Electric piano: a sine with a bell-like overtone that dies fast, a gentle tremolo.
  const keys = (at: number, freq: number, len: number, vel: number, pan: number) =>
    each(at, len + 0.6, (t, i) => {
      const env = Math.min(1, t / 0.006) * Math.exp(-t * 1.1) * (t > len ? Math.exp(-(t - len) * 8) : 1);
      const trem = 1 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t);
      const w = 2 * Math.PI * freq * t;
      const x = (Math.sin(w + 0.6 * Math.exp(-t * 6) * Math.sin(w)) + 0.25 * Math.exp(-t * 9) * Math.sin(4 * w)) * env * trem * vel;
      wetL[i] += x * (1 - pan);
      wetR[i] += x * pan;
    });
  const kick = (at: number) =>
    each(at, 0.3, (t, i) => {
      dry[i] += Math.sin(2 * Math.PI * (48 * t + (60 / 22) * (1 - Math.exp(-t * 22)))) * Math.exp(-t * 11) * 0.45;
    });
  const snare = (at: number) => {
    let lp = 0;
    each(at, 0.22, (t, i) => {
      lp += ((rnd() * 2 - 1) - lp) * 0.35;
      dry[i] += lp * Math.exp(-t * 18) * 0.16 + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 30) * 0.05;
    });
  };
  const hat = (at: number, vel: number) => {
    let last = 0;
    each(at, 0.05, (t, i) => {
      const noise = rnd() * 2 - 1;
      dry[i] += (noise - last) * Math.exp(-t * 80) * vel;
      last = noise;
    });
  };
  const bass = (at: number, freq: number, len: number) =>
    each(at, len, (t, i) => {
      const env = Math.min(1, t / 0.015) * Math.exp(-t * 1.6) * (t > len - 0.06 ? (len - t) / 0.06 : 1);
      dry[i] += Math.sin(2 * Math.PI * freq * t) * env * 0.2;
    });

  const offset = Math.abs(Math.floor(seed)) % chords.length;
  for (let b = 0; b * bar < seconds; b++) {
    const at = b * bar;
    const chord = chords[(b + offset) % chords.length];
    // The chord on the one, a softer stab on the "and" of three.
    chord.notes.forEach((m, k) => keys(at + k * 0.012, midi(m), bar * 0.55, 0.05, 0.35 + 0.1 * k));
    chord.notes.slice(1).forEach((m, k) => keys(at + beat * 2.5 + swing, midi(m + 12), beat * 0.6, 0.022, 0.6 - 0.1 * k));
    if (b < 2) continue;
    if (b % 8 !== 7) {
      kick(at);
      kick(at + beat * 1.5 + swing);
      kick(at + beat * 2.5 + swing);
      snare(at + beat);
      snare(at + beat * 3);
      for (let k = 0; k < 8; k++) hat(at + k * beat * 0.5 + (k % 2 ? swing : 0), k % 2 ? 0.035 : 0.022);
    }
    bass(at, midi(chord.root), beat * 1.6);
    bass(at + beat * 2.5 + swing, midi(chord.root + 7), beat * 1.2);
  }
  // Vinyl: a soft hiss and the odd crackle.
  let hiss = 0;
  for (let s = 0; s < n; s++) {
    hiss += ((rnd() * 2 - 1) - hiss) * 0.05;
    dry[s] += hiss * 0.012 + (rnd() < 0.00025 ? (rnd() * 2 - 1) * 0.12 : 0);
  }
  const roomL = room(wetL, 0);
  const roomR = room(wetR, 23);
  // The drums a little dull, like an old record.
  let lp = 0;
  for (let s = 0; s < n; s++) {
    lp += (dry[s] - lp) * 0.45;
    roomL[s] += lp;
    roomR[s] += lp;
  }
  return stereoWav(roomL, roomR);
}

/**
 * A night bed for the night-look explainers, synthesised from scratch: a music
 * box picking a slow arpeggio over soft pads (Am9 → Fmaj7 → Cmaj7 → G6) at 72 BPM,
 * a deep sub, and a quiet clock — tick, tock — on every beat. From bar 5 a soft
 * brushed pulse joins, so it moves along without putting anyone to sleep; every
 * eighth bar it rests.
 */
export function nightMusic(seconds: number, seed: number): Buffer {
  const BPM = 72;
  const beat = 60 / BPM;
  const bar = beat * 4;
  const n = Math.round(SR * seconds);
  const wetL = new Float32Array(n);
  const wetR = new Float32Array(n);
  const dry = new Float32Array(n);
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const chords = [
    { notes: [57, 60, 64, 67, 71], root: 45 },
    { notes: [53, 57, 60, 64, 67], root: 41 },
    { notes: [48, 52, 55, 59, 64], root: 36 },
    { notes: [55, 59, 62, 64, 67], root: 43 },
  ];
  const each = (start: number, len: number, f: (t: number, i: number) => void) => {
    const i0 = Math.round(start * SR);
    const count = Math.min(n - i0, Math.round(len * SR));
    for (let i = 0; i < count; i++) f(i / SR, i0 + i);
  };
  // Music box: a bright tine — the note and an inharmonic partial that dies fast.
  const tine = (at: number, freq: number, vel: number, pan: number) =>
    each(at, 2.4, (t, i) => {
      const env = Math.min(1, t / 0.002) * Math.exp(-t * 2.2);
      const x = (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.exp(-t * 7) * Math.sin(2 * Math.PI * freq * 5.4 * t) + 0.15 * Math.sin(4 * Math.PI * freq * t) * Math.exp(-t * 4)) * env * vel;
      wetL[i] += x * (1 - pan);
      wetR[i] += x * pan;
    });
  const pad = (at: number, freq: number, len: number) =>
    each(at, len, (t, i) => {
      const env = Math.sin(Math.PI * Math.min(1, t / len)) ** 1.4 * 0.028;
      const w = 2 * Math.PI * freq * t;
      wetL[i] += (Math.sin(w * 0.996) + 0.3 * Math.sin(w * 2.002)) * env;
      wetR[i] += (Math.sin(w * 1.004) + 0.3 * Math.sin(w * 1.998)) * env;
    });
  const sub = (at: number, freq: number, len: number) =>
    each(at, len, (t, i) => {
      const env = Math.min(1, t / 0.04) * Math.exp(-t * 0.8) * (t > len - 0.1 ? (len - t) / 0.1 : 1);
      dry[i] += Math.sin(2 * Math.PI * freq * t) * env * 0.17;
    });
  // The clock: a short woody click, higher for "tick", lower for "tock".
  const tick = (at: number, freq: number, vel: number) =>
    each(at, 0.05, (t, i) => {
      dry[i] += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 160) * vel;
    });
  const kick = (at: number) =>
    each(at, 0.3, (t, i) => {
      dry[i] += Math.sin(2 * Math.PI * (44 * t + (50 / 20) * (1 - Math.exp(-t * 20)))) * Math.exp(-t * 10) * 0.32;
    });
  const brush = (at: number, vel: number) => {
    let lp = 0;
    each(at, 0.18, (t, i) => {
      lp += ((rnd() * 2 - 1) - lp) * 0.5;
      dry[i] += lp * Math.min(1, t / 0.01) * Math.exp(-t * 16) * vel;
    });
  };

  const offset = Math.abs(Math.floor(seed)) % chords.length;
  for (let b = 0; b * bar < seconds; b++) {
    const at = b * bar;
    const chord = chords[(b + offset) % chords.length];
    chord.notes.slice(0, 4).forEach((m) => pad(at, midi(m), bar));
    // The music box: up the chord and back, an octave up, now and then a note left out.
    const arp = [0, 2, 4, 2, 1, 3, 4, 3].map((j) => chord.notes[j] + 12);
    arp.forEach((m, k) => {
      if (k > 0 && rnd() < 0.18) return;
      tine(at + k * beat * 0.5 + (rnd() - 0.5) * 0.01, midi(m), 0.05 + rnd() * 0.012, 0.3 + rnd() * 0.4);
    });
    sub(at, midi(chord.root), bar * 0.9);
    for (let k = 0; k < 4; k++) tick(at + k * beat, k % 2 ? 1500 : 2100, 0.05);
    if (b < 4 || b % 8 === 7) continue;
    kick(at);
    kick(at + beat * 2.5);
    brush(at + beat, 0.06);
    brush(at + beat * 3, 0.06);
  }
  const roomL = room(wetL, 0);
  const roomR = room(wetR, 23);
  for (let s = 0; s < n; s++) {
    roomL[s] += dry[s];
    roomR[s] += dry[s];
  }
  return stereoWav(roomL, roomR);
}

/**
 * A light, curious bed for the paper-look explainers, synthesised from scratch:
 * a marimba bouncing through C → G → Am → F at 104 BPM, a plucked upright-ish bass,
 * a soft shaker on the sixteenths, a gentle kick and finger snap. First two bars
 * marimba only; every eighth bar drops the drums so it breathes. Major key, so it
 * feels like discovering something, and quiet enough to sit under a voice.
 */
export function brightMusic(seconds: number, seed: number): Buffer {
  const BPM = 104;
  const beat = 60 / BPM;
  const bar = beat * 4;
  const n = Math.round(SR * seconds);
  const wetL = new Float32Array(n);
  const wetR = new Float32Array(n);
  const dry = new Float32Array(n);
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const chords = [
    { notes: [60, 64, 67, 72], root: 36 },
    { notes: [59, 62, 67, 71], root: 43 },
    { notes: [60, 64, 69, 72], root: 45 },
    { notes: [60, 65, 69, 72], root: 41 },
  ];
  const each = (start: number, len: number, f: (t: number, i: number) => void) => {
    const i0 = Math.round(start * SR);
    const count = Math.min(n - i0, Math.round(len * SR));
    for (let i = 0; i < count; i++) f(i / SR, i0 + i);
  };
  // Marimba: the note with its woody 4th partial that dies almost at once.
  const marimba = (at: number, freq: number, vel: number, pan: number) =>
    each(at, 1.1, (t, i) => {
      const env = Math.min(1, t / 0.002) * Math.exp(-t * 4.5);
      const x = (Math.sin(2 * Math.PI * freq * t) + 0.5 * Math.exp(-t * 30) * Math.sin(2 * Math.PI * freq * 4 * t) + 0.12 * Math.exp(-t * 12) * Math.sin(2 * Math.PI * freq * 10 * t)) * env * vel;
      wetL[i] += x * (1 - pan);
      wetR[i] += x * pan;
    });
  const pad = (at: number, freq: number, len: number) =>
    each(at, len, (t, i) => {
      const env = Math.sin(Math.PI * Math.min(1, t / len)) ** 1.5 * 0.014;
      wetL[i] += Math.sin(2 * Math.PI * freq * 0.997 * t) * env;
      wetR[i] += Math.sin(2 * Math.PI * freq * 1.003 * t) * env;
    });
  const bass = (at: number, freq: number, len: number) =>
    each(at, len, (t, i) => {
      const env = Math.min(1, t / 0.006) * Math.exp(-t * 5) * (t > len - 0.04 ? (len - t) / 0.04 : 1);
      const w = 2 * Math.PI * freq * t;
      dry[i] += (Math.sin(w) + 0.3 * Math.exp(-t * 14) * Math.sin(2 * w)) * env * 0.2;
    });
  const kick = (at: number) =>
    each(at, 0.28, (t, i) => {
      dry[i] += Math.sin(2 * Math.PI * (50 * t + (60 / 22) * (1 - Math.exp(-t * 22)))) * Math.exp(-t * 12) * 0.34;
    });
  const snap = (at: number) => {
    let last = 0;
    each(at, 0.12, (t, i) => {
      const noise = rnd() * 2 - 1;
      dry[i] += (noise - last) * Math.exp(-t * 45) * 0.07 + Math.sin(2 * Math.PI * 1300 * t) * Math.exp(-t * 90) * 0.03;
      last = noise;
    });
  };
  const shaker = (at: number, vel: number) => {
    let last = 0;
    each(at, 0.07, (t, i) => {
      const noise = rnd() * 2 - 1;
      dry[i] += (noise - last) * Math.min(1, t / 0.012) * Math.exp(-t * 55) * vel;
      last = noise;
    });
  };

  const offset = Math.abs(Math.floor(seed)) % chords.length;
  for (let b = 0; b * bar < seconds; b++) {
    const at = b * bar;
    const chord = chords[(b + offset) % chords.length];
    chord.notes.slice(0, 3).forEach((m) => pad(at, midi(m), bar));
    // A bouncy pattern on the eighths, now and then a note left out, a little pickup at the end of the bar.
    const pattern = [0, 2, 1, 3, 2, 0, 3, 1].map((j) => chord.notes[j] + 12);
    pattern.forEach((m, k) => {
      if (k > 0 && k !== 7 && rnd() < 0.2) return;
      marimba(at + k * beat * 0.5 + (rnd() - 0.5) * 0.008, midi(m), (k % 2 ? 0.035 : 0.05) + rnd() * 0.01, 0.25 + rnd() * 0.5);
    });
    bass(at, midi(chord.root), beat * 0.9);
    bass(at + beat * 1.5, midi(chord.root + 12), beat * 0.4);
    bass(at + beat * 2, midi(chord.root + 7), beat * 0.9);
    bass(at + beat * 3.5, midi(chord.root + 9), beat * 0.4);
    if (b < 2 || b % 8 === 7) continue;
    kick(at);
    kick(at + beat * 2);
    snap(at + beat);
    snap(at + beat * 3);
    for (let k = 0; k < 16; k++) shaker(at + k * beat * 0.25, k % 4 === 2 ? 0.045 : k % 2 ? 0.018 : 0.028);
  }
  const roomL = room(wetL, 0);
  const roomR = room(wetR, 23);
  for (let s = 0; s < n; s++) {
    roomL[s] += dry[s];
    roomR[s] += dry[s];
  }
  return stereoWav(roomL, roomR);
}

/** 16-bit stereo WAV of the two channels, brought to a peak of 0.7, faded in and out. */
function stereoWav(wetL: Float32Array, wetR: Float32Array): Buffer {
  const n = wetL.length;
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
