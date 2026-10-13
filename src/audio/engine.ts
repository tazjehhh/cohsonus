let ctx: AudioContext | null = null;
let master: GainNode;
let fxIn: GainNode;

/**
 * A room made offline from noise: a short gap before the tail, an exponential decay,
 * and highs that die sooner than lows (the noise runs through a lowpass that closes as it fades).
 */
function buildReverb(c: AudioContext, seconds: number, rt60: number, preDelay: number) {
  const sr = c.sampleRate;
  const gap = Math.floor(sr * preDelay);
  const len = gap + Math.floor(sr * seconds);
  const buf = c.createBuffer(2, len, sr);
  // seeded, so the room (and every level measured through it) is the same on every load
  let seed = 0x2f6b1d3;
  const noise = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return (((r ^ (r >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let y = 0;
    for (let i = gap; i < len; i++) {
      const t = (i - gap) / sr;
      const cutoff = 1200 + 7800 * Math.exp(-t / 0.35);
      const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sr);
      y += a * (noise() - y);
      d[i] = y * Math.exp((-6.9 * t) / rt60);
    }
  }
  const conv = c.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Soft ceiling: straight up to the knee, then bends into CEILING; the input is halved first so ±2 fits the curve. */
const KNEE = 0.9;
const CEILING = 0.98;
function ceilingCurve() {
  const n = 4096;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = ((i / (n - 1)) * 2 - 1) * 2;
    const a = Math.abs(x);
    const y = a <= KNEE ? a : KNEE + (CEILING - KNEE) * Math.tanh((a - KNEE) / (CEILING - KNEE));
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

/** Level of the reverb return into the master. */
const REVERB_RETURN = 1.6;

export function audio(): AudioContext {
  if (ctx) return ctx;
  ctx = new AudioContext({ latencyHint: "interactive" });
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  const half = ctx.createGain();
  half.gain.value = 0.5;
  const shaper = ctx.createWaveShaper();
  shaper.curve = ceilingCurve();
  shaper.oversample = "4x";
  master = ctx.createGain();
  master.gain.value = 0.45;
  master.connect(limiter).connect(half).connect(shaper).connect(ctx.destination);
  if (import.meta.env.DEV) {
    const probe = ctx.createAnalyser();
    probe.fftSize = 2048;
    shaper.connect(probe);
    (window as unknown as { __probe: AnalyserNode }).__probe = probe;
  }

  const lowCut = ctx.createBiquadFilter();
  lowCut.type = "highpass";
  lowCut.frequency.value = 220;
  const reverb = buildReverb(ctx, 2.2, 1.8, 0.015);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = REVERB_RETURN;
  fxIn = ctx.createGain();
  fxIn.connect(lowCut).connect(reverb).connect(reverbOut).connect(master);

  return ctx;
}

export async function unlock() {
  const c = audio();
  if (c.state !== "running") await c.resume();
}

export const masterIn = () => (audio(), master);
export const reverbIn = () => (audio(), fxIn);

/** Seconds between the clock and the speaker, used to line taps up with what was heard. */
export function heardOffset() {
  const c = audio();
  return (c.outputLatency || 0) + (c.baseLatency || 0);
}
