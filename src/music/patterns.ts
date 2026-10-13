import type { Lane, Loop, Note, VoiceName } from "./model";

const VEL: Record<string, number> = { X: 1, x: 0.85, o: 0.55, g: 0.22 };

/** "x...x...|o.g." → notes. `|` and spaces are ignored; X x o g are loud → ghost. */
export function hits(pattern: string, voice?: VoiceName): Note[] {
  const out: Note[] = [];
  [...pattern.replace(/[|\s]/g, "")].forEach((ch, i) => {
    const vel = VEL[ch];
    if (vel !== undefined) out.push(voice ? { step: i, vel, voice } : { step: i, vel });
  });
  return out;
}

export function repeat(notes: Note[], times: number, every: number): Note[] {
  const out: Note[] = [];
  for (let t = 0; t < times; t++) for (const n of notes) out.push({ ...n, step: n.step + t * every });
  return out;
}

export const DRUM_VOICE: Record<string, VoiceName> = {
  kick: "kick",
  snare: "snare",
  clap: "clap",
  hat: "hatClosed",
  open: "hatOpen",
  tomHigh: "tomHigh",
  tomLow: "tomLow",
  crash: "crash",
};

export interface LoopOpts {
  bpm: number;
  stepsPerBeat?: number;
  bars?: number;
  swing?: number;
  voices?: Partial<Record<string, VoiceName>>;
}

/** Drum loop from pattern strings keyed by lane id (kick, snare, clap, hat, open, tomHigh, tomLow). */
export function drums(opts: LoopOpts, lanes: Record<string, string>): Loop {
  return {
    bpm: opts.bpm,
    stepsPerBeat: opts.stepsPerBeat ?? 4,
    beatsPerBar: 4,
    bars: opts.bars ?? 1,
    swing: opts.swing ?? 0.5,
    lanes: Object.entries(lanes).map(([id, p]) => {
      const voice = opts.voices?.[id] ?? DRUM_VOICE[id] ?? "click";
      return { id, voice, notes: hits(p) } satisfies Lane;
    }),
  };
}

/** Tiny seeded PRNG so "human" timing is the same every time it plays. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Pushes notes slightly off the grid and varies their loudness. */
export function humanize(notes: Note[], amount: number, seed = 7): Note[] {
  const rnd = seeded(seed);
  return notes.map((n) => ({
    ...n,
    step: n.step + (rnd() - 0.5) * amount,
    vel: Math.max(0.1, Math.min(1, (n.vel ?? 0.85) + (rnd() - 0.5) * 0.25)),
  }));
}
