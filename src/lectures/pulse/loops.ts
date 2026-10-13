import type { Loop, Note } from "../../music/model";
import { drums, hits, humanize, repeat } from "../../music/patterns";
import type { GridLane } from "../../ui/StepGrid";

export const L = {
  kick: { id: "kick", label: "Kick" },
  snare: { id: "snare", label: "Snare" },
  clap: { id: "clap", label: "Clap" },
  hat: { id: "hat", label: "Hi-hat" },
  open: { id: "open", label: "Open hat" },
  tomHigh: { id: "tomHigh", label: "High tom" },
  tomLow: { id: "tomLow", label: "Low tom" },
} satisfies Record<string, GridLane>;

export const fixed = (l: GridLane): GridLane => ({ ...l, editable: false });

const bassLane = (notes: Note[]) => ({ id: "bass", voice: "synthBass" as const, notes });

// ---------- part 1 ----------

export const house124: Loop = {
  ...drums({ bpm: 124 }, { kick: "x...x...x...x...", clap: "....x.......x...", hat: "g...g...g...g...", open: "..x...x...x...x." }),
};
house124.lanes.push(bassLane(hits("..x...x...x...x.").map((n) => ({ ...n, pitch: 33, len: 1.5 }))));

export const TEMPO_LOOPS: { id: string; genre: string; loop: Loop }[] = [
  {
    id: "boombap",
    genre: "Boom bap",
    loop: drums(
      { bpm: 88, swing: 0.56, voices: { kick: "kickDeep" } },
      { kick: "x......x..x.....", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." },
    ),
  },
  {
    id: "indie",
    genre: "Indie rock",
    loop: (() => {
      const l = drums({ bpm: 112, voices: { kick: "kickLive", snare: "snareLive" } }, { kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." });
      return { ...l, lanes: l.lanes.map((x, i) => ({ ...x, notes: humanize(x.notes, 0.12, 30 + i) })) };
    })(),
  },
  { id: "house", genre: "House", loop: drums({ bpm: 124 }, { kick: "x...x...x...x...", clap: "....x.......x...", open: "..x...x...x...x." }) },
  { id: "techno", genre: "Techno", loop: drums({ bpm: 136 }, { kick: "x...x...x...x...", hat: "gxgggxgggxgggxgg", open: "..o...o...o...o." }) },
];

export const findOne: Loop = (() => {
  const l = drums({ bpm: 100, bars: 2 }, { kick: "x.......x.......|x.......x.....x.", snare: "....x.......x...|....x.......x...", hat: "x.o.x.o.x.o.x.o.|x.o.x.o.x.o.x.o." });
  l.lanes.push({ id: "chords", voice: "pad", notes: [{ step: 0, chord: [57, 60, 64], len: 15, vel: 0.9 }, { step: 16, chord: [57, 60, 65], len: 15, vel: 0.9 }] });
  l.lanes.push(bassLane([{ step: 0, pitch: 33, len: 3 }, { step: 6, pitch: 33, len: 1 }, { step: 16, pitch: 29, len: 3 }, { step: 22, pitch: 29, len: 1 }]));
  return l;
})();

export const fourFloorStart: Loop = drums({ bpm: 120, stepsPerBeat: 1 }, { kick: "...." });

// ---------- part 2 ----------

export const kickSnareEmpty: Loop = drums({ bpm: 96, stepsPerBeat: 2 }, { kick: "........", snare: "........", hat: "xoxoxoxo" });

export const backbeatA: Loop = drums({ bpm: 96, stepsPerBeat: 2 }, { kick: "..x...x.", snare: "x...x...", hat: "xoxoxoxo" });
export const backbeatB: Loop = drums({ bpm: 96, stepsPerBeat: 2 }, { kick: "x...x...", snare: "..x...x.", hat: "xoxoxoxo" });

export const rebuildTarget: Loop = drums({ bpm: 92, stepsPerBeat: 2 }, { kick: "x..x.x..", snare: "..x...x.", hat: "xoxoxoxo" });
export const rebuildStart: Loop = drums({ bpm: 92, stepsPerBeat: 2 }, { kick: "........", snare: "........", hat: "xoxoxoxo" });

// ---------- part 3 ----------

const ks = { kick: "x.......x.x.....", snare: "....x.......x..." };
export const densityA: Loop = drums({ bpm: 96 }, { ...ks });
export const densityB: Loop = drums({ bpm: 96 }, { ...ks, hat: "x.o.x.o.x.o.x.o." });
export const densityC: Loop = drums({ bpm: 96 }, { ...ks, hat: "xgogxgogxgogxgog" });

export const hats8: Loop = drums({ bpm: 96, stepsPerBeat: 2 }, { kick: "x...x.x.", snare: "..x...x.", hat: "xoxoxoxo" });
export const hats16: Loop = drums({ bpm: 96, stepsPerBeat: 4 }, { kick: "x.......x...x...", snare: "....x.......x...", hat: "xgogxgogxgogxgog" });

export const openTarget: Loop = drums({ bpm: 124 }, { kick: "x...x...x...x...", clap: "....x.......x...", open: "..x...x...x...x." });
export const openStart: Loop = drums({ bpm: 124 }, { kick: "x...x...x...x...", clap: "....x.......x...", open: "................" });

/** One hat lands a sixteenth late on beat 3. */
export const errorLoop: Loop = drums({ bpm: 100 }, { kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x..xx.x." });

export const syncStraight: Loop = drums({ bpm: 96 }, { kick: "x.......x.......", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." });
export const syncPushed: Loop = drums({ bpm: 96 }, { kick: "x.....x.........", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." });
export const syncQuiz: Loop = drums({ bpm: 96 }, { kick: "x.......x..x....", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." });

// ---------- part 4 ----------

const grooveKS = { kick: "x......x..x.....", snare: "....x.......x..." };
const accented = hits("xgogxgogxgogxgog");
export const machine: Loop = drums({ bpm: 90, voices: { kick: "kickDeep" } }, { ...grooveKS, hat: "xxxxxxxxxxxxxxxx" });
export const swung: Loop = { ...drums({ bpm: 90, swing: 0.6, voices: { kick: "kickDeep" } }, grooveKS), lanes: [...drums({ bpm: 90 }, grooveKS).lanes.map((l) => ({ ...l, voice: l.id === "kick" ? ("kickDeep" as const) : l.voice })), { id: "hat", voice: "hatClosed", notes: accented }] };
export const human: Loop = (() => {
  const base = drums({ bpm: 90, voices: { kick: "kickDeep" } }, grooveKS);
  return {
    ...base,
    lanes: [...base.lanes.map((l, i) => ({ ...l, notes: humanize(l.notes, 0.16, 40 + i) })), { id: "hat", voice: "hatClosed" as const, notes: humanize(accented, 0.2, 49) }],
  };
})();

export const swingTarget: Loop = { ...drums({ bpm: 92, swing: 0.62, voices: { kick: "kickDeep" } }, { kick: "x.....x...x.....", snare: "....x.......x...", hat: "xgogxgogxgogxgog" }) };
export const swingStart: Loop = { ...swingTarget, swing: 0.5 };

export const flatHats: Loop = drums({ bpm: 96 }, { kick: "x.......x.x.....", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx" });
export const accentHats: Loop = drums({ bpm: 96 }, { kick: "x.......x.x.....", snare: "....x.......x...", hat: "Xgogxgogxgogxgog" });

export const ghostOn: Loop = (() => {
  const l = drums({ bpm: 100, voices: { kick: "kickLive", snare: "snareLive" } }, { kick: "x.......x.x.....", snare: "....x..g.g..x..g", hat: "x.o.x.o.x.o.x.o." });
  return { ...l, lanes: l.lanes.map((x, i) => ({ ...x, notes: humanize(x.notes, 0.1, 60 + i) })) };
})();
export const ghostOff: Loop = { ...ghostOn, lanes: ghostOn.lanes.map((l) => (l.id === "snare" ? { ...l, notes: l.notes.filter((n) => (n.vel ?? 1) > 0.4) } : l)) };

export const metronome: Loop = drums({ bpm: 90, bars: 2 }, { hat: "x.o.x.o.x.o.x.o.|x.o.x.o.x.o.x.o." });
metronome.lanes.push(
  { id: "click", voice: "click", notes: repeat([{ step: 0, vel: 1 }, { step: 4, vel: 0.5 }, { step: 8, vel: 0.5 }, { step: 12, vel: 0.5 }], 2, 16) },
  { id: "kick", voice: "kickDeep", notes: [] },
  { id: "snare", voice: "snare", notes: [] },
);

export const trap140: Loop = (() => {
  const l = drums({ bpm: 140 }, { kick: "x.........x.....", snare: "........x.......", hat: "x.x.x.x.x.x.xxxx" });
  l.lanes.push({ id: "808", voice: "bass808", notes: [{ step: 0, pitch: 33, len: 9 }, { step: 10, pitch: 33, len: 6 }] });
  return l;
})();

// ---------- part 5 ----------

export const eightBars: Loop = (() => {
  const groove = { kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." };
  const bar = (k: string) => (groove as Record<string, string>)[k];
  const l = drums(
    { bpm: 104, bars: 8 },
    {
      kick: Array(7).fill(bar("kick")).join("") + "x.......x.......",
      snare: Array(7).fill(bar("snare")).join("") + "....x...xxxx....",
      hat: Array(7).fill(bar("hat")).join("") + "x.o.x.o.........",
      tomHigh: "................".repeat(7) + "............xx..",
      tomLow: "................".repeat(7) + "..............xx",
      crash: "x..............." + "................".repeat(7),
    },
  );
  return l;
})();

export const fillStart: Loop = (() => {
  const b = { kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." };
  return drums(
    { bpm: 104, bars: 4 },
    {
      kick: b.kick.repeat(4),
      snare: b.snare.repeat(4),
      hat: b.hat.repeat(4),
      tomHigh: "................".repeat(4),
      tomLow: "................".repeat(4),
      crash: "x..............." + "................".repeat(3),
    },
  );
})();

export const trapPad: Loop = (() => {
  const l = drums({ bpm: 140, bars: 2 }, { kick: "x.........x.....|x.........x.....", snare: "........x.......|........x.......", hat: "x.x.x.x.x.x.xxxx|x.x.x.x.x.x.x.x." });
  l.lanes.push({ id: "pad", voice: "pad", notes: [{ step: 0, chord: [57, 60, 64], len: 32, vel: 0.9 }] });
  return l;
})();

export const with808 = (pitch: number): Loop => ({
  ...trapPad,
  lanes: [...trapPad.lanes, { id: "808", voice: "bass808", notes: [0, 10, 16, 26].map((s, i) => ({ step: s, pitch, len: i % 2 ? 6 : 9 })) }],
});

// ---------- final ----------

export const finalStart: Loop = drums(
  { bpm: 92, bars: 4 },
  { kick: "................".repeat(4), snare: "................".repeat(4), hat: "................".repeat(4), open: "................".repeat(4), tomHigh: "................".repeat(4), tomLow: "................".repeat(4) },
);

export const earTarget: Loop = drums({ bpm: 96 }, { kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.xx" });
export const earStart: Loop = drums({ bpm: 96 }, { kick: "................", snare: "................", hat: "................" });

// ---------- refresher ----------

export const refreshTap: Loop = drums({ bpm: 108, voices: { kick: "kickLive", snare: "snareLive" } }, { kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.o." });
export const refreshTarget: Loop = drums({ bpm: 98 }, { kick: "x..x..x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." });
export const refreshStart: Loop = drums({ bpm: 98 }, { kick: "................", snare: "................", hat: "x.x.x.x.x.x.x.x." });
export const refreshStraight: Loop = drums({ bpm: 94, voices: { kick: "kickDeep" } }, { kick: "x......x..x.....", snare: "....x.......x...", hat: "xgogxgogxgogxgog" });
export const refreshSwung: Loop = { ...refreshStraight, swing: 0.62 };
