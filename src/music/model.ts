export type VoiceName =
  | "kick"
  | "kickDeep"
  | "kickLive"
  | "snare"
  | "snareLive"
  | "clap"
  | "hatClosed"
  | "hatOpen"
  | "tomHigh"
  | "tomLow"
  | "crash"
  | "bass808"
  | "synthBass"
  | "subBass"
  | "pluckBass"
  | "stab"
  | "ep"
  | "pad"
  | "lead"
  | "flute"
  | "strum"
  | "pluck"
  | "click";

export interface Note {
  /** Position in steps. Fractional values sit between grid lines (played, not programmed). */
  step: number;
  /** 0..1 */
  vel?: number;
  /** MIDI note number. */
  pitch?: number;
  chord?: number[];
  /** Length in steps. */
  len?: number;
  voice?: VoiceName;
  up?: boolean;
}

export interface Lane {
  id: string;
  voice: VoiceName;
  notes: Note[];
  /** Mixer channel; defaults to the lane id. */
  channel?: string;
}

export interface Loop {
  bpm: number;
  /** 1 = quarters, 2 = eighths, 4 = sixteenths */
  stepsPerBeat: number;
  beatsPerBar: number;
  bars: number;
  /** Position of every second step inside its pair: 0.5 is straight. */
  swing?: number;
  lanes: Lane[];
}

export const DEFAULT_VEL = 0.9;

export const loopSteps = (l: Pick<Loop, "stepsPerBeat" | "beatsPerBar" | "bars">) =>
  l.stepsPerBeat * l.beatsPerBar * l.bars;

export const stepSeconds = (l: Pick<Loop, "bpm" | "stepsPerBeat">) => 60 / l.bpm / l.stepsPerBeat;

export const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export const findLane = (l: Loop, id: string) => l.lanes.find((x) => x.id === id);

export function withLane(l: Loop, id: string, notes: Note[]): Loop {
  return { ...l, lanes: l.lanes.map((x) => (x.id === id ? { ...x, notes } : x)) };
}

export function stepsOf(l: Loop, id: string): number[] {
  return (findLane(l, id)?.notes ?? []).map((n) => n.step).sort((a, b) => a - b);
}
