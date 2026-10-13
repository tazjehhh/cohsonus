/**
 * Drum notation layout. Works in sixteenth-note slots: four per beat.
 * Every voice shares one rhythm (stems up), which is how simple drum parts are usually written.
 */

export type Dur = 1 | 2 | 3 | 4;

export interface NoteEvent {
  kind: "note";
  slot: number; // 0..15 within the bar
  dur: Dur;
  voices: string[];
}

export interface RestEvent {
  kind: "rest";
  slot: number;
  dur: 1 | 2 | 4;
}

export type BarEvent = NoteEvent | RestEvent;

export interface Beam {
  /** indices into the beat's note list */
  from: number;
  to: number;
  level: 1 | 2;
}

export interface Stub {
  note: number;
  dir: -1 | 1;
}

export interface BeatLayout {
  beat: number;
  events: BarEvent[];
  notes: NoteEvent[];
  beams: Beam[];
  stubs: Stub[];
  /** single unbeamed note: number of flags */
  flags: 0 | 1 | 2;
}

/** hits: slot (0..15) → voice ids */
export function layoutBar(hits: Map<number, string[]>): BeatLayout[] {
  const beats: BeatLayout[] = [];
  for (let beat = 0; beat < 4; beat++) {
    const base = beat * 4;
    const attacks = [0, 1, 2, 3].filter((s) => (hits.get(base + s)?.length ?? 0) > 0);
    const events: BarEvent[] = [];
    if (attacks.length === 0) {
      beats.push({ beat, events: [{ kind: "rest", slot: base, dur: 4 }], notes: [], beams: [], stubs: [], flags: 0 });
      continue;
    }
    const first = attacks[0];
    if (first === 1) events.push({ kind: "rest", slot: base, dur: 1 });
    if (first === 2) events.push({ kind: "rest", slot: base, dur: 2 });
    if (first === 3) events.push({ kind: "rest", slot: base, dur: 2 }, { kind: "rest", slot: base + 2, dur: 1 });
    const notes: NoteEvent[] = attacks.map((s, i) => ({
      kind: "note",
      slot: base + s,
      dur: ((attacks[i + 1] ?? 4) - s) as Dur,
      voices: hits.get(base + s)!,
    }));
    events.push(...notes);

    const beams: Beam[] = [];
    const stubs: Stub[] = [];
    let flags: 0 | 1 | 2 = 0;
    if (notes.length >= 2) {
      beams.push({ from: 0, to: notes.length - 1, level: 1 });
      let i = 0;
      while (i < notes.length) {
        if (notes[i].dur !== 1) {
          i++;
          continue;
        }
        let j = i;
        while (j + 1 < notes.length && notes[j + 1].dur === 1) j++;
        if (j > i) beams.push({ from: i, to: j, level: 2 });
        else stubs.push({ note: i, dir: i + 1 < notes.length ? 1 : -1 });
        i = j + 1;
      }
    } else if (notes[0].dur < 4) {
      flags = notes[0].dur === 1 ? 2 : 1;
    }
    beats.push({ beat, events, notes, beams, stubs, flags });
  }
  return beats;
}

/** Staff position in half-spaces below the top line (negative = above the staff). */
export const STAFF_POS: Record<string, number> = {
  crash: -3,
  hat: -1,
  open: -1,
  hatClosed: -1,
  hatOpen: -1,
  tomHigh: 1,
  snare: 3,
  clap: 3,
  tomLow: 5,
  kick: 7,
};

export const isCross = (voice: string) => voice === "hat" || voice === "open" || voice === "hatClosed" || voice === "hatOpen" || voice === "crash";
export const isOpen = (voice: string) => voice === "open" || voice === "hatOpen";
