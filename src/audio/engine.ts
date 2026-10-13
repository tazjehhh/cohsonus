let ctx: AudioContext | null = null;
let master: GainNode;
let fxIn: GainNode;
let noise: AudioBuffer;

function buildReverb(c: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = c.createConvolver();
  conv.buffer = buf;
  return conv;
}

export function audio(): AudioContext {
  if (ctx) return ctx;
  ctx = new AudioContext({ latencyHint: "interactive" });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(comp).connect(limiter).connect(ctx.destination);
  if (import.meta.env.DEV) {
    const probe = ctx.createAnalyser();
    probe.fftSize = 2048;
    limiter.connect(probe);
    (window as unknown as { __probe: AnalyserNode }).__probe = probe;
  }

  const reverb = buildReverb(ctx, 2.4, 3);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.5;
  fxIn = ctx.createGain();
  fxIn.connect(reverb).connect(reverbOut).connect(master);

  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const n = noise.getChannelData(0);
  for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  return ctx;
}

export async function unlock() {
  const c = audio();
  if (c.state !== "running") await c.resume();
}

export const masterIn = () => (audio(), master);
export const reverbIn = () => (audio(), fxIn);
export const noiseBuffer = () => (audio(), noise);

/** Seconds between the clock and the speaker, used to line taps up with what was heard. */
export function heardOffset() {
  const c = audio();
  return (c.outputLatency || 0) + (c.baseLatency || 0);
}
