import type { LectureDef } from "./types";
import { anatomy } from "./anatomy";
import { pulse } from "./pulse";

export interface LectureEntry {
  id: string;
  number: number;
  title: string;
  /** Lectures that teach what this one builds on. The road is a suggestion, not a lock. */
  after: string[];
  def?: LectureDef;
}

export const LECTURES: LectureEntry[] = [
  { id: "anatomy", number: 0, title: "Anatomy of a Track", after: [], def: anatomy },
  { id: "pulse", number: 1, title: "Pulse & Groove", after: [], def: pulse },
  { id: "keys-1", number: 2, title: "Keys I: Notes & Scales", after: ["pulse"] },
  { id: "sampling-1", number: 3, title: "Sampling I: Chop", after: ["pulse"] },
  { id: "keys-2", number: 4, title: "Keys II: Chords", after: ["keys-1"] },
  { id: "bass", number: 5, title: "Bass", after: ["pulse", "keys-2"] },
  { id: "keys-3", number: 6, title: "Keys III: Pads & MIDI", after: ["keys-2"] },
  { id: "melody", number: 7, title: "Melody", after: ["keys-1", "keys-2"] },
  { id: "sampling-2", number: 8, title: "Sampling II: Flip", after: ["keys-1", "sampling-1"] },
  { id: "arrangement", number: 9, title: "Arrangement", after: ["bass", "keys-3", "melody"] },
  { id: "daw", number: 10, title: "Into the DAW", after: ["arrangement"] },
];

export const lectureById = (id: string) => LECTURES.find((l) => l.id === id);
