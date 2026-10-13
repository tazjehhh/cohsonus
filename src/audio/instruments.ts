import { audio, noiseBuffer } from "./engine";
import { ksBuffer } from "./ks";
import { DEFAULT_VEL, midiToHz, type Note, type VoiceName } from "../music/model";

export type Instrument = (t: number, n: Note, dest: AudioNode, stepDur: number) => void;

const Z = 0.0001;

function gain(c: AudioContext, v = 1) {
  const g = c.createGain();
  g.gain.value = v;
  return g;
}

function decayEnv(p: AudioParam, t: number, peak: number, decay: number, attack = 0.002) {
  p.setValueAtTime(Z, t);
  p.exponentialRampToValueAtTime(Math.max(Z * 2, peak), t + attack);
  p.exponentialRampToValueAtTime(Z, t + attack + decay);
}

/** attack → sustain until `hold` → release */
function holdEnv(p: AudioParam, t: number, peak: number, attack: number, hold: number, release: number) {
  p.setValueAtTime(Z, t);
  p.exponentialRampToValueAtTime(Math.max(Z * 2, peak), t + attack);
  p.setValueAtTime(Math.max(Z * 2, peak), t + Math.max(attack, hold));
  p.exponentialRampToValueAtTime(Z, t + Math.max(attack, hold) + release);
}

function noise(c: AudioContext, t: number, dur: number) {
  const s = c.createBufferSource();
  s.buffer = noiseBuffer();
  s.start(t, Math.random() * 1.5, dur + 0.05);
  return s;
}

function filter(c: AudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

let softCurve: Float32Array<ArrayBuffer> | null = null;
function shaper(c: AudioContext) {
  if (!softCurve) {
    softCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      softCurve[i] = Math.tanh(2.2 * x);
    }
  }
  const w = c.createWaveShaper();
  w.curve = softCurve;
  return w;
}

const v = (n: Note) => n.vel ?? DEFAULT_VEL;

function kickBody(t: number, n: Note, dest: AudioNode, o: { start: number; end: number; decay: number; click: number; level: number }) {
  const c = audio();
  const vel = v(n);
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(o.start, t);
  osc.frequency.exponentialRampToValueAtTime(o.end, t + 0.11);
  const g = gain(c, 0);
  decayEnv(g.gain, t, vel * o.level, o.decay, 0.003);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + o.decay + 0.05);

  const ns = noise(c, t, 0.02);
  const hp = filter(c, "highpass", 1800);
  const ng = gain(c, 0);
  decayEnv(ng.gain, t, vel * o.click * 0.35, 0.012, 0.001);
  ns.connect(hp).connect(ng).connect(dest);
}

const kick: Instrument = (t, n, dest) => kickBody(t, n, dest, { start: 160, end: 48, decay: 0.42, click: 0.6, level: 1 });
const kickDeep: Instrument = (t, n, dest) => kickBody(t, n, dest, { start: 120, end: 46, decay: 0.55, click: 0.35, level: 1 });
const kickLive: Instrument = (t, n, dest) => {
  kickBody(t, n, dest, { start: 115, end: 58, decay: 0.28, click: 1, level: 0.9 });
  const c = audio();
  const ns = noise(c, t, 0.05);
  const bp = filter(c, "bandpass", 2600, 1.5);
  const g = gain(c, 0);
  decayEnv(g.gain, t, v(n) * 0.25, 0.04, 0.001);
  ns.connect(bp).connect(g).connect(dest);
};

function snareBody(t: number, n: Note, dest: AudioNode, o: { tone: number; noiseDecay: number; bright: number }) {
  const c = audio();
  const vel = v(n);
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(o.tone * 1.25, t);
  osc.frequency.exponentialRampToValueAtTime(o.tone, t + 0.03);
  const og = gain(c, 0);
  decayEnv(og.gain, t, vel * 0.55, 0.11);
  osc.connect(og).connect(dest);
  osc.start(t);
  osc.stop(t + 0.16);

  const ns = noise(c, t, o.noiseDecay);
  const hp = filter(c, "highpass", 1100);
  const lp = filter(c, "lowpass", o.bright);
  const ng = gain(c, 0);
  decayEnv(ng.gain, t, vel * 0.75, o.noiseDecay);
  ns.connect(hp).connect(lp).connect(ng).connect(dest);
}

const snare: Instrument = (t, n, dest) => snareBody(t, n, dest, { tone: 185, noiseDecay: 0.17, bright: 11000 });
const snareLive: Instrument = (t, n, dest) => snareBody(t, n, dest, { tone: 175, noiseDecay: 0.24, bright: 7000 });

const clap: Instrument = (t, n, dest) => {
  const c = audio();
  const vel = v(n);
  const bp = filter(c, "bandpass", 1150, 1.1);
  const g = gain(c, 0);
  const p = g.gain;
  p.setValueAtTime(Z, t);
  for (const off of [0, 0.011, 0.023]) {
    p.setValueAtTime(vel * 0.9, t + off);
    p.exponentialRampToValueAtTime(vel * 0.12, t + off + 0.009);
  }
  p.setValueAtTime(vel * 0.7, t + 0.034);
  p.exponentialRampToValueAtTime(Z, t + 0.24);
  noise(c, t, 0.26).connect(bp).connect(g).connect(dest);
};

const openHats = new WeakMap<AudioNode, GainNode>();
const HAT_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];

function hat(t: number, n: Note, dest: AudioNode, open: boolean) {
  const c = audio();
  const vel = v(n);
  const prev = openHats.get(dest);
  if (prev) {
    prev.gain.cancelScheduledValues(t);
    prev.gain.setTargetAtTime(Z, t, 0.01);
    openHats.delete(dest);
  }
  const bp = filter(c, "bandpass", 10000, 0.8);
  const hp = filter(c, "highpass", 7000);
  const g = gain(c, 0);
  const decay = open ? 0.38 : 0.05;
  decayEnv(g.gain, t, vel * (open ? 0.5 : 0.7), decay, 0.001);
  bp.connect(hp).connect(g).connect(dest);
  for (const r of HAT_RATIOS) {
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = 40 * r;
    o.connect(bp);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
  if (open) openHats.set(dest, g);
}

const hatClosed: Instrument = (t, n, dest) => hat(t, n, dest, false);
const hatOpen: Instrument = (t, n, dest) => hat(t, n, dest, true);

function tom(t: number, n: Note, dest: AudioNode, f: number) {
  const c = audio();
  const vel = v(n);
  const o = c.createOscillator();
  o.frequency.setValueAtTime(f * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  const g = gain(c, 0);
  decayEnv(g.gain, t, vel * 0.8, 0.38, 0.002);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.45);
  const ns = noise(c, t, 0.06);
  const lp = filter(c, "lowpass", 2500);
  const ng = gain(c, 0);
  decayEnv(ng.gain, t, vel * 0.2, 0.05);
  ns.connect(lp).connect(ng).connect(dest);
}

const crash: Instrument = (t, n, dest) => {
  const c = audio();
  const vel = v(n);
  const hp = filter(c, "highpass", 4200);
  const g = gain(c, 0);
  decayEnv(g.gain, t, vel * 0.32, 1.8, 0.002);
  noise(c, t, 1.9).connect(hp).connect(g).connect(dest);
  for (const r of HAT_RATIOS) {
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = 57 * r;
    const og = gain(c, 0);
    decayEnv(og.gain, t, vel * 0.012, 1.2);
    o.connect(og).connect(hp);
    o.start(t);
    o.stop(t + 1.3);
  }
};

const bass808: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const f = midiToHz(n.pitch ?? 33);
  const dur = Math.min(2.2, Math.max(0.45, (n.len ?? 8) * sd));
  const o = c.createOscillator();
  o.frequency.setValueAtTime(f * 2.4, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
  const g = gain(c, 0);
  g.gain.setValueAtTime(Z, t);
  g.gain.exponentialRampToValueAtTime(vel * 0.95, t + 0.004);
  g.gain.exponentialRampToValueAtTime(vel * 0.55, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(Z, t + dur);
  const sh = shaper(c);
  const lp = filter(c, "lowpass", 1400);
  const out = gain(c, 0.7);
  o.connect(g).connect(sh).connect(lp).connect(out).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
};

const synthBass: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const f = midiToHz(n.pitch ?? 33);
  const dur = Math.max(0.08, (n.len ?? 2) * sd);
  const lp = filter(c, "lowpass", 1400, 7);
  lp.frequency.setValueAtTime(1600, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + 0.16);
  const g = gain(c, 0);
  holdEnv(g.gain, t, vel * 0.38, 0.004, dur, 0.06);
  lp.connect(g).connect(dest);
  for (const det of [-7, 7]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.detune.value = det;
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
  const sub = c.createOscillator();
  sub.frequency.value = f;
  const sg = gain(c, 0);
  holdEnv(sg.gain, t, vel * 0.35, 0.004, dur, 0.06);
  sub.connect(sg).connect(dest);
  sub.start(t);
  sub.stop(t + dur + 0.1);
};

const subBass: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const f = midiToHz(n.pitch ?? 38);
  const dur = Math.max(0.1, (n.len ?? 4) * sd);
  const g = gain(c, 0);
  holdEnv(g.gain, t, vel * 0.7, 0.012, dur, 0.09);
  g.connect(dest);
  const o = c.createOscillator();
  o.frequency.value = f;
  o.connect(g);
  const tri = c.createOscillator();
  tri.type = "triangle";
  tri.frequency.value = f * 2;
  const tg = gain(c, 0.12);
  tri.connect(tg).connect(g);
  for (const x of [o, tri]) {
    x.start(t);
    x.stop(t + dur + 0.15);
  }
};

function playBuffer(c: AudioContext, buf: AudioBuffer, t: number, dest: AudioNode, level: number, dur: number, release = 0.08) {
  const s = c.createBufferSource();
  s.buffer = buf;
  const g = gain(c, 0);
  g.gain.setValueAtTime(level, t);
  g.gain.setValueAtTime(level, t + dur);
  g.gain.exponentialRampToValueAtTime(Z, t + dur + release);
  s.connect(g).connect(dest);
  s.start(t);
  s.stop(t + Math.min(buf.duration, dur + release + 0.02));
}

const pluckBass: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const f = midiToHz(n.pitch ?? 31);
  const dur = Math.max(0.12, (n.len ?? 2) * sd);
  const lp = filter(c, "lowpass", 1300);
  lp.connect(dest);
  playBuffer(c, ksBuffer(c, f, 2, 2.2, 0.35), t, lp, v(n) * 1.1, dur, 0.06);
};

const stab: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const dur = Math.max(0.1, (n.len ?? 2) * sd);
  const lp = filter(c, "lowpass", 3000, 3);
  lp.frequency.setValueAtTime(3400, t);
  lp.frequency.exponentialRampToValueAtTime(700, t + 0.22);
  const g = gain(c, 0);
  holdEnv(g.gain, t, vel * 0.11, 0.004, dur, 0.12);
  lp.connect(g).connect(dest);
  for (const m of n.chord ?? [n.pitch ?? 57]) {
    for (const det of [-11, 0, 11]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = midiToHz(m);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
  }
};

const ep: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const dur = Math.max(0.2, (n.len ?? 4) * sd);
  const out = gain(c, 0);
  out.gain.setValueAtTime(Z, t);
  out.gain.exponentialRampToValueAtTime(vel * 0.16, t + 0.005);
  out.gain.exponentialRampToValueAtTime(vel * 0.06, t + Math.max(0.05, dur));
  out.gain.exponentialRampToValueAtTime(Z, t + dur + 0.5);
  out.connect(dest);
  for (const m of n.chord ?? [n.pitch ?? 60]) {
    const f = midiToHz(m);
    const car = c.createOscillator();
    car.frequency.value = f;
    const mod = c.createOscillator();
    mod.frequency.value = f;
    const idx = gain(c, 0);
    idx.gain.setValueAtTime(f * 2, t);
    idx.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.9);
    mod.connect(idx).connect(car.frequency);
    const tine = c.createOscillator();
    tine.frequency.value = f * 7;
    const tg = gain(c, 0);
    decayEnv(tg.gain, t, f * 0.5, 0.12);
    tine.connect(tg).connect(car.frequency);
    car.connect(out);
    for (const x of [car, mod, tine]) {
      x.start(t);
      x.stop(t + dur + 0.6);
    }
  }
};

const pad: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const dur = Math.max(0.5, (n.len ?? 16) * sd);
  const lp = filter(c, "lowpass", 1300, 0.5);
  const g = gain(c, 0);
  holdEnv(g.gain, t, vel * 0.07, 0.45, dur, 0.9);
  lp.connect(g).connect(dest);
  for (const m of n.chord ?? [n.pitch ?? 57]) {
    for (const det of [-8, 8]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = midiToHz(m);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1);
    }
  }
};

const lead: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const dur = Math.max(0.08, (n.len ?? 2) * sd);
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.value = midiToHz(n.pitch ?? 72);
  const lp = filter(c, "lowpass", 2400, 2);
  lp.frequency.setValueAtTime(4200, t);
  lp.frequency.exponentialRampToValueAtTime(1400, t + 0.2);
  const g = gain(c, 0);
  g.gain.setValueAtTime(Z, t);
  g.gain.exponentialRampToValueAtTime(vel * 0.12, t + 0.004);
  g.gain.exponentialRampToValueAtTime(vel * 0.06, t + 0.15);
  g.gain.setValueAtTime(vel * 0.06, t + Math.max(0.15, dur));
  g.gain.exponentialRampToValueAtTime(Z, t + Math.max(0.15, dur) + 0.12);
  o.connect(lp).connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.4);
};

const flute: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const vel = v(n);
  const f = midiToHz(n.pitch ?? 72);
  const dur = Math.max(0.12, (n.len ?? 4) * sd);
  const g = gain(c, 0);
  holdEnv(g.gain, t, vel * 0.16, 0.07, dur, 0.16);
  g.connect(dest);
  const vib = c.createOscillator();
  vib.frequency.value = 5.2;
  const vg = gain(c, 0);
  vg.gain.setValueAtTime(0, t);
  vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.35);
  vib.connect(vg);
  for (const [mult, lvl] of [
    [1, 1],
    [2, 0.12],
    [3, 0.04],
  ] as const) {
    const o = c.createOscillator();
    o.frequency.value = f * mult;
    vg.connect(o.frequency);
    const og = gain(c, lvl);
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + dur + 0.3);
  }
  vib.start(t);
  vib.stop(t + dur + 0.3);
  const ns = noise(c, t, dur + 0.2);
  const bp = filter(c, "bandpass", f * 2, 6);
  const ng = gain(c, 0);
  holdEnv(ng.gain, t, vel * 0.05, 0.05, dur, 0.1);
  ns.connect(bp).connect(ng).connect(dest);
};

const strum: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const notes = n.chord ?? [n.pitch ?? 55];
  const order = n.up ? [...notes].reverse() : notes;
  const dur = Math.max(0.12, (n.len ?? 4) * sd);
  const lp = filter(c, "lowpass", 4200);
  lp.connect(dest);
  order.forEach((m, i) => {
    const at = t + i * (n.up ? 0.008 : 0.013);
    playBuffer(c, ksBuffer(c, midiToHz(m), 2.5, 2.4, 0.6), at, lp, v(n) * 0.2, dur - i * 0.01, 0.07);
  });
};

const pluck: Instrument = (t, n, dest, sd) => {
  const c = audio();
  const dur = Math.max(0.12, (n.len ?? 2) * sd);
  const sh = shaper(c);
  const lp = filter(c, "lowpass", 5200);
  const g = gain(c, 0.55);
  sh.connect(lp).connect(g).connect(dest);
  playBuffer(c, ksBuffer(c, midiToHz(n.pitch ?? 67), 2, 1.7, 0.75), t, sh, v(n) * 0.7, dur, 0.15);
};

const click: Instrument = (t, n, dest) => {
  const c = audio();
  const o = c.createOscillator();
  o.frequency.value = (n.vel ?? 0.5) > 0.8 ? 1700 : 1150;
  const g = gain(c, 0);
  decayEnv(g.gain, t, 0.35, 0.03, 0.001);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.05);
};

export const VOICES: Record<VoiceName, Instrument> = {
  kick,
  kickDeep,
  kickLive,
  snare,
  snareLive,
  clap,
  hatClosed,
  hatOpen,
  tomHigh: (t, n, d) => tom(t, n, d, 210),
  tomLow: (t, n, d) => tom(t, n, d, 125),
  crash,
  bass808,
  synthBass,
  subBass,
  pluckBass,
  stab,
  ep,
  pad,
  lead,
  flute,
  strum,
  pluck,
  click,
};

/** Builds the string buffers a loop will need before it starts, so the first bar does not stutter. */
export function prewarm(notes: { voice: VoiceName; note: Note }[]) {
  const c = audio();
  for (const { voice, note } of notes) {
    if (voice === "strum") for (const m of note.chord ?? []) ksBuffer(c, midiToHz(m), 2.5, 2.4, 0.6);
    if (voice === "pluck") ksBuffer(c, midiToHz(note.pitch ?? 67), 2, 1.7, 0.75);
    if (voice === "pluckBass") ksBuffer(c, midiToHz(note.pitch ?? 31), 2, 2.2, 0.35);
  }
}
