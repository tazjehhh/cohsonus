import { findLane, type Loop } from "./model";

const SNARES = ["snare", "clap"];
const HATS = ["hat", "open"];
const FILLS = ["snare", "clap", "tomHigh", "tomLow"];

/** Positions in sixteenths across the whole loop. */
export function slots(loop: Loop, laneIds: string[]): number[] {
  const k = 4 / loop.stepsPerBeat;
  const out: number[] = [];
  for (const id of laneIds) for (const n of findLane(loop, id)?.notes ?? []) out.push(Math.round(n.step * k));
  return [...new Set(out)].sort((a, b) => a - b);
}

const barSlots = (all: number[], bar: number) => all.filter((s) => s >= bar * 16 && s < bar * 16 + 16).map((s) => s - bar * 16);

/** Beats (1..4) on which the snare or clap hits in a given bar. */
export function snareBeats(loop: Loop, bar = 0): number[] {
  return barSlots(slots(loop, SNARES), bar)
    .filter((s) => s % 4 === 0)
    .map((s) => s / 4 + 1);
}

export function hasBackbeat(loop: Loop): boolean {
  const all = slots(loop, SNARES);
  for (let b = 0; b < loop.bars; b++) {
    const s = barSlots(all, b);
    if (!s.includes(4) || !s.includes(12)) return false;
  }
  return true;
}

/** Hats on every eighth note in each bar (the last bar may break for a fill). */
export function hasSteadyHats(loop: Loop): boolean {
  const all = slots(loop, HATS);
  const bars = loop.bars > 1 ? loop.bars - 1 : 1;
  for (let b = 0; b < bars; b++) {
    const s = barSlots(all, b);
    for (let e = 0; e < 16; e += 2) if (!s.includes(e)) return false;
  }
  return true;
}

export function hasOffbeatKick(loop: Loop): boolean {
  return slots(loop, ["kick"]).some((s) => s % 4 !== 0);
}

export function hasDynamics(loop: Loop): boolean {
  const vels = loop.lanes.flatMap((l) => l.notes.map((n) => n.vel ?? 0.9));
  if (vels.length < 2) return false;
  return Math.max(...vels) - Math.min(...vels) >= 0.25;
}

/** At least two snare/tom hits in the last beat of the last bar, and that bar differs from the first. */
export function hasFill(loop: Loop): boolean {
  const last = loop.bars - 1;
  if (last < 1) return false;
  const fill = barSlots(slots(loop, FILLS), last).filter((s) => s >= 12);
  if (fill.length < 2) return false;
  const ids = loop.lanes.map((l) => l.id);
  const a = barSlots(slots(loop, ids), 0).join(",");
  const z = barSlots(slots(loop, ids), last).join(",");
  return a !== z;
}

export interface Miss {
  lane: string;
  step: number;
}

/** Cells that differ between two loops on the given lanes. */
export function gridDiff(target: Loop, attempt: Loop, laneIds: string[]): Miss[] {
  const out: Miss[] = [];
  for (const id of laneIds) {
    const a = new Set((findLane(target, id)?.notes ?? []).map((n) => Math.round(n.step)));
    const b = new Set((findLane(attempt, id)?.notes ?? []).map((n) => Math.round(n.step)));
    for (const s of a) if (!b.has(s)) out.push({ lane: id, step: s });
    for (const s of b) if (!a.has(s)) out.push({ lane: id, step: s });
  }
  return out;
}
