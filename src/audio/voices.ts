import { DEFAULT_VEL, type Note, type VoiceName } from "../music/model";
import { play, type PlayOpts } from "./sampler";

export type Voice = (t: number, n: Note, dest: AudioNode, stepDur: number) => void;

interface VoiceDef {
  inst: string;
  /** Pitch used when a note has none. */
  pitch?: number;
  gain?: number;
  extra?: Partial<PlayOpts>;
  /** Seconds between the strings of a strummed chord. */
  strum?: number;
}

const DEFS: Record<VoiceName, VoiceDef> = {
  kick: { inst: "kit.kick", gain: 2.0 },
  kickLofi: { inst: "lofi.kick", gain: 2.4 },
  kickMachine: { inst: "machine.kick" },
  snare: { inst: "kit.snare", gain: 2.1 },
  snareLofi: { inst: "lofi.snare", gain: 1.9 },
  clap: { inst: "perc.clap" },
  clapMachine: { inst: "machine.clap" },
  hatClosed: { inst: "kit.hat", gain: 1.8 },
  hatOpen: { inst: "kit.open", gain: 0.6 },
  hatLofi: { inst: "lofi.hat", gain: 0.32 },
  hatMachine: { inst: "machine.hat", gain: 0.8 },
  openMachine: { inst: "machine.open", gain: 0.6 },
  tomHigh: { inst: "kit.tomHigh" },
  tomLow: { inst: "kit.tomLow" },
  crash: { inst: "kit.crash" },
  bass808: { inst: "synth.sub", pitch: 33, gain: 0.75, extra: { glide: 7, mono: true } },
  synthBass: { inst: "synth.bass", pitch: 33, gain: 0.38 },
  subBass: { inst: "synth.sub", pitch: 38, gain: 0.22 },
  eBass: { inst: "bass.electric", pitch: 40, gain: 1.15 },
  organ: { inst: "synth.organ", pitch: 60, gain: 1.0 },
  wurli: { inst: "keys.wurli", pitch: 60, gain: 0.25 },
  pad: { inst: "synth.pad", pitch: 57, gain: 0.38 },
  lead: { inst: "synth.lead", pitch: 72, gain: 0.6 },
  vibes: { inst: "keys.vibes", pitch: 72, gain: 0.65 },
  strum: { inst: "guitar.electric", pitch: 55, strum: 0.014, gain: 0.42 },
  guitar: { inst: "guitar.electric", pitch: 67, gain: 1.9 },
  click: { inst: "perc.click" },
};

/** 0..1 from two numbers, the same every time: strings of a strum vary, but never at random. */
function hash01(a: number, b: number) {
  let h = Math.imul(Math.round(a * 1000) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function instrumentOf(voice: VoiceName) {
  return DEFS[voice].inst;
}

export const VOICES: Record<VoiceName, Voice> = Object.fromEntries(
  (Object.keys(DEFS) as VoiceName[]).map((name) => {
    const d = DEFS[name];
    const voice: Voice = (t, n, dest, sd) => {
      const vel = n.vel ?? DEFAULT_VEL;
      const len = n.len !== undefined ? n.len * sd : undefined;
      const notes = n.chord ?? [n.pitch ?? d.pitch];
      const order = n.up ? [...notes].reverse() : notes;
      let at = t;
      order.forEach((pitch, i) => {
        let v = vel;
        if (d.strum) {
          // the pick reaches each string a little unevenly and loses a little force on the way across
          if (i > 0) at += (n.up ? d.strum * 0.6 : d.strum) * (0.6 + 0.8 * hash01(n.step, i));
          const across = order.length > 1 ? i / (order.length - 1) : 0;
          v = Math.max(0.05, Math.min(1, vel * (1 - 0.18 * across) + (hash01(n.step, i + 50) - 0.5) * 0.16));
        }
        const decay = name === "bass808" ? Math.min(2.2, Math.max(0.45, len ?? 1.2)) : undefined;
        play(d.inst, at, dest, { vel: v, pitch, len, gain: d.gain, decay, ...d.extra });
      });
    };
    return [name, voice];
  }),
) as Record<VoiceName, Voice>;
