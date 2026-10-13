import manifest from "./samples.json";
import { audio } from "./engine";

export interface Zone {
  file: string;
  vlo: number;
  vhi: number;
  rr: number;
  root?: number;
}

export interface Instrument {
  source: string;
  pitched: boolean;
  release?: number;
  choke?: string;
  chokedBy?: boolean;
  zones: Zone[];
}

const INSTRUMENTS = (manifest as unknown as { instruments: Record<string, Instrument> }).instruments;

export type InstrumentId = keyof typeof INSTRUMENTS & string;

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<void>>();

function url(file: string) {
  return `${import.meta.env.BASE_URL}${file}`;
}

export function instrument(id: string): Instrument {
  const inst = INSTRUMENTS[id];
  if (!inst) throw new Error(`unknown instrument ${id}`);
  return inst;
}

/** Fetches and decodes every sample of the given instruments; resolves when all are ready. */
export function load(ids: Iterable<string>): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const id of ids) {
    let job = loading.get(id);
    if (!job) {
      job = Promise.all(
        instrument(id).zones.map(async (z) => {
          if (buffers.has(z.file)) return;
          const res = await fetch(url(z.file));
          const data = await res.arrayBuffer();
          buffers.set(z.file, await audio().decodeAudioData(data));
        }),
      ).then(() => undefined);
      loading.set(id, job);
      job.catch(() => loading.delete(id));
    }
    jobs.push(job);
  }
  return Promise.all(jobs).then(() => undefined);
}

export function isLoaded(id: string) {
  return instrument(id).zones.every((z) => buffers.has(z.file));
}

const rrCounter = new Map<string, number>();

/** The zone to play for a velocity (0..1) and, for tonal instruments, a MIDI pitch. */
export function pickZone(inst: Instrument, id: string, vel: number, pitch?: number): Zone {
  const v = Math.max(0, Math.min(1, vel));
  let layer = inst.zones.filter((z) => v >= z.vlo && (v < z.vhi || (z.vhi >= 1 && v >= 1)));
  if (!layer.length) layer = inst.zones;
  if (inst.pitched && pitch !== undefined) {
    let best = Infinity;
    for (const z of layer) best = Math.min(best, Math.abs((z.root ?? 60) - pitch));
    layer = layer.filter((z) => Math.abs((z.root ?? 60) - pitch) <= best + 0.5);
  }
  const key = `${id}|${layer[0].file}`;
  const n = (rrCounter.get(key) ?? 0) + 1;
  rrCounter.set(key, n);
  return layer[n % layer.length];
}

interface Voice {
  gain: GainNode;
  src: AudioBufferSourceNode;
}

const chokeGroups = new WeakMap<AudioNode, Map<string, Voice[]>>();
const monoVoices = new WeakMap<AudioNode, Map<string, Voice>>();

function fadeOut(v: Voice, t: number, time = 0.02) {
  v.gain.gain.cancelScheduledValues(t);
  v.gain.gain.setTargetAtTime(0, t, time / 3);
  try {
    v.src.stop(t + time * 3);
  } catch {
    /* already stopped */
  }
}

export interface PlayOpts {
  vel: number;
  pitch?: number;
  /** Seconds to hold before the release; one-shots ignore it. */
  len?: number;
  gain?: number;
  /** Semitones the pitch falls from at the start (808 style). */
  glide?: number;
  /** Seconds for an exponential fade over the note (808 style). */
  decay?: number;
  /** Only one note of this instrument per channel. */
  mono?: boolean;
}

export function play(id: string, t: number, dest: AudioNode, o: PlayOpts) {
  const inst = instrument(id);
  const zone = pickZone(inst, id, o.vel, o.pitch);
  const buf = buffers.get(zone.file);
  if (!buf) return;
  const c = audio();
  const src = c.createBufferSource();
  src.buffer = buf;
  const rate = inst.pitched && o.pitch !== undefined ? Math.pow(2, (o.pitch - (zone.root ?? o.pitch)) / 12) : 1;
  if (o.glide) {
    src.playbackRate.setValueAtTime(rate * Math.pow(2, o.glide / 12), t);
    src.playbackRate.exponentialRampToValueAtTime(rate, t + 0.045);
  } else src.playbackRate.value = rate;

  const span = Math.max(0.0001, zone.vhi - zone.vlo);
  const within = Math.max(0, Math.min(1, (o.vel - zone.vlo) / span));
  const level = (0.6 + 0.4 * within) * (o.gain ?? 1);
  const g = c.createGain();
  g.gain.setValueAtTime(level, t);
  src.connect(g).connect(dest);

  const voice = { gain: g, src };
  const dur = buf.duration / rate;
  let end = t + dur;
  if (o.decay) {
    g.gain.exponentialRampToValueAtTime(level * 0.001, t + o.decay);
    end = Math.min(end, t + o.decay + 0.02);
  } else if (inst.release !== undefined && o.len !== undefined) {
    const off = t + Math.max(0.03, o.len);
    if (off < end) {
      g.gain.setValueAtTime(level, off);
      g.gain.setTargetAtTime(0, off, inst.release / 3);
      end = Math.min(end, off + inst.release * 1.5);
    }
  }
  src.start(t);
  src.stop(end + 0.02);

  if (inst.choke) {
    let groups = chokeGroups.get(dest);
    if (!groups) chokeGroups.set(dest, (groups = new Map()));
    const prev = groups.get(inst.choke) ?? [];
    for (const v of prev) fadeOut(v, t);
    groups.set(inst.choke, inst.chokedBy ? [voice] : []);
  }
  if (o.mono) {
    let voices = monoVoices.get(dest);
    if (!voices) monoVoices.set(dest, (voices = new Map()));
    const prev = voices.get(id);
    if (prev) fadeOut(prev, t, 0.03);
    voices.set(id, voice);
  }
}
