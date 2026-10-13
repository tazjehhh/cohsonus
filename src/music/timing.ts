import type { Loop, Note } from "./model";
import { loopSteps } from "./model";

/** Where a programmed step lands once swing pushes every second step back. */
export function swingOffset(step: number, swing: number, stepDur: number) {
  return step % 2 === 1 ? (swing - 0.5) * 2 * stepDur : 0;
}

/** Seconds after the start of `slot` at which a note sounds. */
export function noteOffset(note: Note, slot: number, swing: number, stepDur: number) {
  const frac = note.step - Math.floor(note.step);
  const onGrid = Number.isInteger(note.step);
  return frac * stepDur + (onGrid ? swingOffset(slot, swing, stepDur) : 0);
}

export interface Indexed<T> {
  slot: number;
  item: T;
  note: Note;
}

/** Groups every note by the step it starts in, wrapping anything outside the loop back into it. */
export function indexLoop<T>(loop: Loop, tag: (laneIndex: number) => T): Map<number, Indexed<T>[]> {
  const total = loopSteps(loop);
  const map = new Map<number, Indexed<T>[]>();
  loop.lanes.forEach((lane, li) => {
    for (const n of lane.notes) {
      const s = ((n.step % total) + total) % total;
      const slot = Math.floor(s);
      const note = s === n.step ? n : { ...n, step: s };
      const arr = map.get(slot) ?? [];
      arr.push({ slot, item: tag(li), note });
      map.set(slot, arr);
    }
  });
  return map;
}

/** Median tempo from tap times in seconds; null until there are enough taps. */
export function tapTempo(times: number[], window = 9): number | null {
  const recent = times.slice(-window);
  if (recent.length < 4) return null;
  const gaps = recent.slice(1).map((t, i) => t - recent[i]).filter((g) => g > 0.15 && g < 2.5);
  if (gaps.length < 3) return null;
  gaps.sort((a, b) => a - b);
  const mid = gaps[Math.floor(gaps.length / 2)];
  return 60 / mid;
}

/** Compares a tapped tempo with the real one; half and double count as the same pulse. */
export function tempoRelation(tapped: number, actual: number, tolerance = 0.06): "same" | "half" | "double" | "off" {
  const near = (a: number, b: number) => Math.abs(a - b) / b <= tolerance;
  if (near(tapped, actual)) return "same";
  if (near(tapped, actual / 2)) return "half";
  if (near(tapped, actual * 2)) return "double";
  return "off";
}

/** Circular mean of tap phases inside a cycle of `length`; returns position in [0, length). */
export function meanPhase(phases: number[], length: number) {
  let x = 0;
  let y = 0;
  for (const p of phases) {
    const a = (p / length) * Math.PI * 2;
    x += Math.cos(a);
    y += Math.sin(a);
  }
  const a = Math.atan2(y, x);
  const pos = (a / (Math.PI * 2)) * length;
  return (pos + length) % length;
}

/** Distance between two positions on a cycle. */
export function cycleDistance(a: number, b: number, length: number) {
  const d = Math.abs(a - b) % length;
  return Math.min(d, length - d);
}

/** Pulls recorded notes toward the grid by `amount` (0 = as played, 1 = on the grid). */
export function quantize(notes: Note[], amount: number, total: number): Note[] {
  return notes.map((n) => {
    const target = Math.round(n.step);
    const step = n.step + (target - n.step) * amount;
    return { ...n, step: amount >= 1 ? ((target % total) + total) % total : step };
  });
}

/** Anything that moves is drawn at most 24 times a second, like film animation on ones. */
export const DRAWINGS_PER_SECOND = 24;

/** Drawings per beat: as many as fit under 24 a second, so every beat starts on a new drawing. */
export const drawingsPerBeat = (bpm: number) => Math.max(1, Math.floor((60 / bpm) * DRAWINGS_PER_SECOND));
