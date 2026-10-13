import { describe, expect, it } from "vitest";
import { drums, hits, humanize } from "../src/music/patterns";
import { gridDiff, hasBackbeat, hasDynamics, hasFill, hasOffbeatKick, hasSteadyHats, snareBeats } from "../src/music/checks";
import { cycleDistance, drawingsPerBeat, indexLoop, meanPhase, noteOffset, quantize, swingOffset, tapTempo, tempoRelation } from "../src/music/timing";
import { layoutBar } from "../src/music/notation";

describe("patterns", () => {
  it("reads pattern strings", () => {
    expect(hits("x..o|g...").map((n) => [n.step, n.vel])).toEqual([
      [0, 0.85],
      [3, 0.55],
      [4, 0.22],
    ]);
  });

  it("humanizes deterministically", () => {
    const a = humanize(hits("x.x.x.x."), 0.3, 3);
    const b = humanize(hits("x.x.x.x."), 0.3, 3);
    expect(a).toEqual(b);
    expect(a.some((n) => !Number.isInteger(n.step))).toBe(true);
  });
});

describe("timing", () => {
  it("draws at most 12 times a second, with every beat on a drawing", () => {
    for (const bpm of [60, 90, 96, 124, 140, 174]) {
      const n = drawingsPerBeat(bpm);
      expect(Number.isInteger(n)).toBe(true);
      expect(n / (60 / bpm)).toBeLessThanOrEqual(12);
      expect((n + 1) / (60 / bpm)).toBeGreaterThan(12);
    }
    expect(drawingsPerBeat(90)).toBe(8);
    expect(drawingsPerBeat(124)).toBe(5);
  });

  it("swings only every second step", () => {
    expect(swingOffset(0, 0.6, 0.1)).toBe(0);
    expect(swingOffset(1, 0.6, 0.1)).toBeCloseTo(0.02);
    expect(swingOffset(3, 0.5, 0.1)).toBe(0);
  });

  it("does not swing notes that were played off the grid", () => {
    expect(noteOffset({ step: 1.25 }, 1, 0.66, 0.1)).toBeCloseTo(0.025);
    expect(noteOffset({ step: 1 }, 1, 0.66, 0.1)).toBeCloseTo(0.032);
  });

  it("wraps notes before the loop start to its end", () => {
    const loop = drums({ bpm: 100 }, { kick: "x..............." });
    loop.lanes[0].notes[0].step = -0.2;
    const idx = indexLoop(loop, (i) => i);
    expect([...idx.keys()]).toEqual([15]);
    expect(idx.get(15)![0].note.step).toBeCloseTo(15.8);
  });

  it("finds tap tempo and tolerates one stray tap", () => {
    const beat = 60 / 124;
    const taps = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => i * beat);
    taps.splice(4, 0, 2.2 * beat);
    expect(tapTempo(taps)).toBeCloseTo(124, 0);
    expect(tapTempo([0, 0.5])).toBeNull();
  });

  it("treats half and double tempo as the same pulse", () => {
    expect(tempoRelation(123, 124)).toBe("same");
    expect(tempoRelation(62, 124)).toBe("half");
    expect(tempoRelation(141, 70)).toBe("double");
    expect(tempoRelation(100, 124)).toBe("off");
  });

  it("averages phases around the cycle", () => {
    expect(cycleDistance(meanPhase([15.8, 0.1, 0.3], 16), 0, 16)).toBeLessThan(0.3);
  });

  it("quantizes toward the grid", () => {
    const n = quantize([{ step: 2.4 }, { step: 15.6 }], 1, 16);
    expect(n.map((x) => x.step)).toEqual([2, 0]);
    expect(quantize([{ step: 2.4 }], 0.5, 16)[0].step).toBeCloseTo(2.2);
  });
});

describe("checks", () => {
  const groove = drums(
    { bpm: 96, bars: 2 },
    {
      kick: "x.....x...x.....|x.....x...x.....",
      snare: "....x.......x...|....x.......x.xx",
      hat: "x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x...",
    },
  );

  it("recognises a backbeat", () => {
    expect(hasBackbeat(groove)).toBe(true);
    expect(snareBeats(groove)).toEqual([2, 4]);
    const flipped = drums({ bpm: 96 }, { snare: "x.......x......." });
    expect(hasBackbeat(flipped)).toBe(false);
    expect(snareBeats(flipped)).toEqual([1, 3]);
  });

  it("reads eighth-note grids in sixteenths", () => {
    const eighths = drums({ bpm: 96, stepsPerBeat: 2 }, { snare: "..x...x." });
    expect(hasBackbeat(eighths)).toBe(true);
  });

  it("checks hats, offbeat kicks and fills", () => {
    expect(hasSteadyHats(groove)).toBe(true);
    expect(hasOffbeatKick(groove)).toBe(true);
    expect(hasOffbeatKick(drums({ bpm: 96 }, { kick: "x...x...x...x..." }))).toBe(false);
    expect(hasFill(groove)).toBe(true);
    const plain = drums({ bpm: 96, bars: 2 }, { snare: "....x.......x...|....x.......x..." });
    expect(hasFill(plain)).toBe(false);
  });

  it("checks dynamics", () => {
    expect(hasDynamics(drums({ bpm: 90 }, { hat: "x.x.x.x." }))).toBe(false);
    expect(hasDynamics(drums({ bpm: 90 }, { hat: "x.g.x.g." }))).toBe(true);
  });

  it("lists differing cells", () => {
    const a = drums({ bpm: 90, stepsPerBeat: 2 }, { kick: "x..x.x..", snare: "..x...x." });
    const b = drums({ bpm: 90, stepsPerBeat: 2 }, { kick: "x...xx..", snare: "..x...x." });
    expect(gridDiff(a, b, ["kick", "snare"])).toEqual([
      { lane: "kick", step: 3 },
      { lane: "kick", step: 4 },
    ]);
  });
});

describe("notation", () => {
  const bar = (m: Record<number, string[]>) => new Map(Object.entries(m).map(([k, v]) => [Number(k), v]));

  it("writes quarters and quarter rests", () => {
    const b = layoutBar(bar({ 0: ["kick"], 8: ["kick"] }));
    expect(b[0].notes[0].dur).toBe(4);
    expect(b[1].events[0]).toMatchObject({ kind: "rest", dur: 4 });
  });

  it("beams eighths and sixteenths", () => {
    const b = layoutBar(bar({ 0: ["hat"], 2: ["hat"], 4: ["hat"], 5: ["hat"], 6: ["hat"], 7: ["hat"] }));
    expect(b[0].beams).toEqual([{ from: 0, to: 1, level: 1 }]);
    expect(b[1].beams).toContainEqual({ from: 0, to: 3, level: 2 });
  });

  it("gives a dotted eighth plus sixteenth a stub", () => {
    const b = layoutBar(bar({ 0: ["kick"], 3: ["snare"] }));
    expect(b[0].notes.map((n) => n.dur)).toEqual([3, 1]);
    expect(b[0].stubs).toEqual([{ note: 1, dir: -1 }]);
  });

  it("starts a late beat with rests", () => {
    const b = layoutBar(bar({ 3: ["kick"] }));
    expect(b[0].events.map((e) => [e.kind, e.dur])).toEqual([
      ["rest", 2],
      ["rest", 1],
      ["note", 1],
    ]);
    expect(b[0].flags).toBe(2);
  });
});
