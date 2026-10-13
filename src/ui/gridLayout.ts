export const LABEL_W = 88;
export const BEAT_GAP = 10;

export function cellSize(count: number, stepsPerBeat: number, width = 820) {
  const beats = Math.ceil(count / stepsPerBeat);
  const c = (width - LABEL_W - (beats - 1) * BEAT_GAP) / count;
  return Math.max(24, Math.min(64, Math.floor(c)));
}

/** Left edge of a (relative) step. */
export function stepX(rel: number, cell: number, stepsPerBeat: number) {
  return LABEL_W + rel * cell + Math.floor(rel / stepsPerBeat) * BEAT_GAP;
}

export function gridWidth(count: number, cell: number, stepsPerBeat: number) {
  return stepX(count - 1, cell, stepsPerBeat) + cell;
}

export function countLabel(rel: number, stepsPerBeat: number) {
  const beat = Math.floor(rel / stepsPerBeat) % 4;
  const sub = rel % stepsPerBeat;
  if (sub === 0) return String(beat + 1);
  if (stepsPerBeat === 2) return "&";
  return ["", "e", "&", "a"][sub];
}
