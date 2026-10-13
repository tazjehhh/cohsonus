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
  hatClosed: { inst: "kit.hat", gain: 1.2 },
  hatOpen: { inst: "kit.open", gain: 0.6 },
  hatLofi: { inst: "lofi.hat", gain: 0.32 },
  tomHigh: { inst: "kit.tomHigh" },
  tomLow: { inst: "kit.tomLow" },
  crash: { inst: "kit.crash" },
  bass808: { inst: "synth.sub", pitch: 33, gain: 0.75, extra: { glide: 7, mono: true } },
  synthBass: { inst: "synth.bass", pitch: 33, gain: 0.38 },
  subBass: { inst: "synth.sub", pitch: 38, gain: 0.28 },
  eBass: { inst: "bass.electric", pitch: 40 },
  organ: { inst: "synth.organ", pitch: 60, gain: 0.78 },
  wurli: { inst: "keys.wurli", pitch: 60, gain: 0.23 },
  pad: { inst: "synth.pad", pitch: 57, gain: 0.22 },
  lead: { inst: "synth.lead", pitch: 72, gain: 0.6 },
  vibes: { inst: "keys.vibes", pitch: 72, gain: 0.42 },
  strum: { inst: "guitar.electric", pitch: 55, strum: 0.014, gain: 0.42 },
  guitar: { inst: "guitar.electric", pitch: 67, gain: 1.9 },
  click: { inst: "perc.click" },
};

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
      order.forEach((pitch, i) => {
        const at = t + (d.strum ? i * (n.up ? d.strum * 0.6 : d.strum) : 0);
        const decay = name === "bass808" ? Math.min(2.2, Math.max(0.45, len ?? 1.2)) : undefined;
        play(d.inst, at, dest, { vel, pitch, len, gain: d.gain, decay, ...d.extra });
      });
    };
    return [name, voice];
  }),
) as Record<VoiceName, Voice>;
