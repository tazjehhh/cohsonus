// Karplus–Strong: a burst of noise fed through a short delay line becomes a plucked string.
const cache = new Map<string, AudioBuffer>();

export function ksBuffer(c: BaseAudioContext, freq: number, seconds: number, t60: number, bright: number) {
  const key = `${freq.toFixed(2)}|${seconds}|${t60}|${bright}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const sr = c.sampleRate;
  const len = Math.floor(sr * seconds);
  const period = Math.max(2, Math.round(sr / freq - 0.5));
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);

  const a = 0.12 + 0.85 * bright;
  let prev = 0;
  for (let i = 0; i < period && i < len; i++) {
    prev += a * (Math.random() * 2 - 1 - prev);
    d[i] = prev;
  }
  const g = Math.pow(0.001, 1 / (freq * t60));
  for (let i = period; i < len; i++) {
    const y2 = i - period - 1 >= 0 ? d[i - period - 1] : 0;
    d[i] = g * 0.5 * (d[i - period] + y2);
  }

  let mean = 0;
  for (let i = 0; i < len; i++) mean += d[i];
  mean /= len;
  let peak = 0;
  for (let i = 0; i < len; i++) {
    d[i] -= mean;
    peak = Math.max(peak, Math.abs(d[i]));
  }
  if (peak > 0) for (let i = 0; i < len; i++) d[i] *= 0.9 / peak;
  const fade = Math.min(len, Math.floor(sr * 0.02));
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;

  cache.set(key, buf);
  return buf;
}
