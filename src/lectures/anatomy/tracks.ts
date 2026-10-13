import type { ChannelOpts } from "../../audio/mixer";
import type { Loop, Note, VoiceName } from "../../music/model";
import { hits, humanize, repeat } from "../../music/patterns";

export type Role = "drums" | "bass" | "harmony" | "melody";

export const ROLES: { id: Role; name: string; job: string }[] = [
  { id: "drums", name: "Drums", job: "keep time" },
  { id: "bass", name: "Bass", job: "the floor" },
  { id: "harmony", name: "Harmony", job: "the colour" },
  { id: "melody", name: "Melody", job: "the voice" },
];

export interface Stem {
  id: string;
  name: string;
  instrument: string;
  role: Role;
  register: "low" | "mid" | "high";
}

export interface Track {
  id: string;
  world: string;
  genre: string;
  loop: Loop;
  stems: Stem[];
  channels: Record<string, ChannelOpts>;
}

const lane = (id: string, voice: VoiceName, notes: Note[]) => ({ id, voice, notes });

/** notes given as [step, pitch, len] per bar, repeated per bar index */
const seq = (bars: [number, number, number][][], vel = 0.85): Note[] =>
  bars.flatMap((bar, b) => bar.map(([s, pitch, len]) => ({ step: b * 16 + s, pitch, len, vel })));

const chords = (bars: { at: number[]; chord: number[]; len: number[] }[], vel = 0.8, extra: Partial<Note> = {}): Note[] =>
  bars.flatMap((bar, b) => bar.at.map((s, i) => ({ step: b * 16 + s, chord: bar.chord, len: bar.len[i] ?? bar.len[0], vel, ...extra })));

// ---------- synth world: house, 124 BPM, A minor ----------

const AM = [57, 60, 64];
const F = [57, 60, 65];
const C = [55, 60, 64];
const G = [55, 59, 62];

export const house: Track = {
  id: "house",
  world: "Synth",
  genre: "House",
  loop: {
    bpm: 124,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    bars: 4,
    lanes: [
      lane("kick", "kickMachine", repeat(hits("x...x...x...x..."), 4, 16)),
      lane("clap", "clap", repeat(hits("....x.......x..."), 4, 16)),
      lane(
        "hats",
        "hatClosed",
        Array.from({ length: 16 }, (_, b): Note[] => [
          { step: b * 4, vel: 0.32 },
          { step: b * 4 + 1, vel: 0.2 },
          { step: b * 4 + 2, vel: 0.7, voice: "hatOpen" },
        ]).flat(),
      ),
      lane("bass", "synthBass", seq([
        [[2, 33, 1.5], [6, 33, 1.5], [10, 33, 1.5], [14, 45, 1.5]],
        [[2, 29, 1.5], [6, 29, 1.5], [10, 29, 1.5], [14, 41, 1.5]],
        [[2, 36, 1.5], [6, 36, 1.5], [10, 36, 1.5], [14, 48, 1.5]],
        [[2, 31, 1.5], [6, 31, 1.5], [10, 31, 1.5], [14, 43, 1.5]],
      ])),
      lane("chords", "organ", chords([
        { at: [0, 3, 10], chord: AM, len: [2, 2, 3] },
        { at: [0, 3, 10], chord: F, len: [2, 2, 3] },
        { at: [0, 3, 10], chord: C, len: [2, 2, 3] },
        { at: [0, 3, 10], chord: G, len: [2, 2, 3] },
      ])),
      lane("lead", "lead", seq([
        [[0, 76, 2], [3, 74, 2], [6, 72, 2], [8, 69, 3], [12, 72, 2]],
        [[0, 74, 2], [3, 72, 2], [6, 69, 2], [10, 67, 4]],
        [[0, 76, 2], [3, 74, 2], [6, 72, 2], [8, 69, 3], [12, 72, 2]],
        [[0, 76, 2], [3, 79, 2], [6, 76, 2], [8, 74, 6]],
      ], 0.8)),
    ],
  },
  stems: [
    { id: "kick", name: "Kick", instrument: "Drum machine kick", role: "drums", register: "low" },
    { id: "clap", name: "Clap", instrument: "Drum machine clap", role: "drums", register: "mid" },
    { id: "hats", name: "Hi-hats", instrument: "Drum machine hats", role: "drums", register: "high" },
    { id: "bass", name: "Bass", instrument: "Synth bass", role: "bass", register: "low" },
    { id: "chords", name: "Chords", instrument: "House organ", role: "harmony", register: "mid" },
    { id: "lead", name: "Lead", instrument: "Synth lead", role: "melody", register: "high" },
  ],
  channels: { chords: { reverb: 0.18 }, lead: { echo: true, reverb: 0.2 }, hats: { gain: 3.4 } },
};

// ---------- sample world: boom bap, 90 BPM, D minor ----------

const DM7 = [53, 57, 60, 64];
const BBMAJ7 = [53, 57, 58, 62];

export const boombap: Track = {
  id: "boombap",
  world: "Sample",
  genre: "Boom bap",
  loop: {
    bpm: 90,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    bars: 4,
    swing: 0.58,
    lanes: [
      lane("kick", "kickLofi", repeat(hits("x......x..x.....|x.........x...x."), 2, 32)),
      lane("snare", "snareLofi", repeat(hits("....x.......x..g|....x.......x..."), 2, 32)),
      lane("hats", "hatLofi", repeat(hits("x.o.x.o.x.o.xgo."), 4, 16)),
      lane("bass", "subBass", seq([
        [[0, 38, 6], [7, 38, 2], [10, 41, 4]],
        [[0, 38, 6], [10, 36, 4], [14, 33, 2]],
        [[0, 34, 6], [7, 34, 2], [10, 38, 4]],
        [[0, 34, 6], [10, 36, 6]],
      ], 0.9)),
      lane("chords", "wurli", chords([
        { at: [0, 10], chord: DM7, len: [10, 6] },
        { at: [0, 10], chord: DM7, len: [10, 6] },
        { at: [0, 10], chord: BBMAJ7, len: [10, 6] },
        { at: [0, 10], chord: BBMAJ7, len: [10, 6] },
      ], 0.75)),
      lane("melody", "vibes", seq([
        [[4, 69, 4], [8, 72, 2], [10, 74, 6]],
        [[4, 72, 3], [7, 69, 9]],
        [[4, 74, 4], [8, 72, 2], [10, 69, 6]],
        [[4, 67, 3], [7, 69, 9]],
      ], 0.75)),
    ],
  },
  stems: [
    { id: "kick", name: "Kick", instrument: "Kick drum, old microphone", role: "drums", register: "low" },
    { id: "snare", name: "Snare", instrument: "Snare, old microphone", role: "drums", register: "mid" },
    { id: "hats", name: "Hi-hats", instrument: "Hi-hats, old microphone", role: "drums", register: "high" },
    { id: "bass", name: "Bass", instrument: "Sub bass", role: "bass", register: "low" },
    { id: "chords", name: "Chords", instrument: "Wurlitzer electric piano, dusty", role: "harmony", register: "mid" },
    { id: "melody", name: "Vibraphone", instrument: "Vibraphone", role: "melody", register: "high" },
  ],
  channels: { chords: { dusty: true, reverb: 0.12 }, melody: { reverb: 0.25 } },
};

// ---------- band world: indie, 112 BPM, G major ----------

const G_OPEN = [43, 47, 50, 55, 59, 67];
const D_OPEN = [50, 57, 62, 66];
const EM_OPEN = [40, 47, 52, 55, 59, 64];
const C_OPEN = [48, 52, 55, 60, 64];

const strumBar = (chord: number[]) => [
  { step: 0, chord, len: 6, vel: 0.85 },
  { step: 6, chord, len: 4, vel: 0.55, up: true },
  { step: 10, chord, len: 4, vel: 0.75 },
  { step: 14, chord, len: 2, vel: 0.5, up: true },
];

export const indie: Track = {
  id: "indie",
  world: "Band",
  genre: "Indie rock",
  loop: {
    bpm: 112,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    bars: 4,
    lanes: [
      lane("kick", "kick", humanize(repeat(hits("x.......x.x....."), 4, 16), 0.12, 11)),
      lane("snare", "snare", humanize(repeat(hits("....x..g....x.g."), 4, 16), 0.12, 12)),
      lane("hats", "hatClosed", humanize([...repeat(hits("x.o.x.o.x.o.x.o."), 3, 16), ...hits("x.o.x.o.x.o.x...").map((n) => ({ ...n, step: n.step + 48 })), { step: 62, vel: 0.6, voice: "hatOpen" }], 0.14, 13)),
      lane("bass", "eBass", humanize(seq([
        [[0, 43, 2], [2, 43, 2], [4, 43, 2], [6, 43, 2], [8, 43, 2], [10, 43, 2], [12, 43, 2], [14, 47, 2]],
        [[0, 38, 2], [2, 38, 2], [4, 38, 2], [6, 38, 2], [8, 38, 2], [10, 38, 2], [12, 38, 2], [14, 42, 2]],
        [[0, 40, 2], [2, 40, 2], [4, 40, 2], [6, 40, 2], [8, 40, 2], [10, 40, 2], [12, 40, 2], [14, 38, 2]],
        [[0, 36, 2], [2, 36, 2], [4, 36, 2], [6, 36, 2], [8, 36, 2], [10, 36, 2], [12, 38, 2], [14, 40, 2]],
      ], 0.85), 0.1, 14)),
      lane("chords", "strum", humanize([...strumBar(G_OPEN), ...strumBar(D_OPEN).map((n) => ({ ...n, step: n.step + 16 })), ...strumBar(EM_OPEN).map((n) => ({ ...n, step: n.step + 32 })), ...strumBar(C_OPEN).map((n) => ({ ...n, step: n.step + 48 }))], 0.08, 15)),
      lane("melody", "guitar", humanize(seq([
        [[0, 71, 3], [3, 69, 3], [6, 67, 4], [10, 74, 6]],
        [[0, 69, 3], [3, 71, 3], [6, 69, 4], [10, 66, 6]],
        [[0, 67, 3], [3, 71, 3], [6, 76, 4], [10, 74, 6]],
        [[0, 76, 3], [3, 74, 3], [6, 72, 4], [10, 71, 6]],
      ], 0.8), 0.1, 16)),
    ],
  },
  stems: [
    { id: "kick", name: "Kick", instrument: "Kick drum, played", role: "drums", register: "low" },
    { id: "snare", name: "Snare", instrument: "Snare drum, played", role: "drums", register: "mid" },
    { id: "hats", name: "Hi-hats", instrument: "Hi-hat, played", role: "drums", register: "high" },
    { id: "bass", name: "Bass", instrument: "Electric bass", role: "bass", register: "low" },
    { id: "chords", name: "Rhythm guitar", instrument: "Rhythm guitar", role: "harmony", register: "mid" },
    { id: "melody", name: "Lead guitar", instrument: "Lead guitar", role: "melody", register: "high" },
  ],
  channels: { chords: { reverb: 0.15 }, melody: { reverb: 0.22 } },
};

export const TRACKS = { house, boombap, indie };

/** Fixed shuffles so the letters do not give the answer away. */
export function lettered(track: Track, order: number[]) {
  return order.map((i, k) => ({ letter: "ABCDEF"[k], stem: track.stems[i] }));
}
