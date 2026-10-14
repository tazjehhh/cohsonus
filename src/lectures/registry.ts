import type { LectureDef } from "./types";
import { anatomy } from "./anatomy";
import { pulse } from "./pulse";

export interface LectureEntry {
  id: string;
  number: number;
  title: string;
  /** Lectures it branches from on the map: what they teach, this one builds on. A suggestion, not a lock. */
  after: string[];
  /** Day it came out, YYYY-MM-DD. Unset while it is still to come. */
  released?: string;
  /** What the lecture is about, shown in the hub preview before it starts. Textbook voice, two or three sentences. */
  summary: string;
  def?: LectureDef;
}

export const LECTURES: LectureEntry[] = [
  { id: "anatomy", number: 0, title: "Anatomy of a Track", after: [], released: "2026-10-13", summary: "A track is made of parts that each do a job: the drums keep time, the bass lays the foundation, the harmony sets the mood and the melody carries the line. Three tracks from house, boom bap and indie rock are taken apart channel by channel and listened to role by role, from the lowest frequencies to the highest.", def: anatomy },
  { id: "pulse", number: 1, title: "Pulse & Groove", after: ["anatomy"], released: "2026-10-13", summary: "Rhythm organizes music in time. Tempo and the bar, the backbeat of kick and snare, the subdivisions of the hi-hat, swing and the feel of notes played off the grid, phrases, fills and the tuned 808 are each heard first, then built on a drum grid.", def: pulse },
  { id: "keys-1", number: 2, title: "Keys I: Notes & Scales", after: ["anatomy"], summary: "Pitch is how high or low a note sounds. The twelve notes of the keyboard, the octave, and the scales that choose seven of those notes and give a piece its key, heard in bass lines and melodies before they are named." },
  { id: "sampling-1", number: 3, title: "Sampling I: Chop", after: ["pulse"], summary: "Sampling builds new music from existing recordings. Choosing a loop, cutting it into slices on the beat and playing the slices from pads in a new order is the method hip-hop producers have used since the 1980s." },
  { id: "keys-2", number: 4, title: "Keys II: Chords", after: ["keys-1"], summary: "A chord is three or more notes sounding together. How chords are built from a scale, why major chords sound bright and minor chords dark, and how a progression of chords moves a song forward." },
  { id: "bass", number: 5, title: "Bass", after: ["pulse", "keys-1"], summary: "The bass connects the rhythm to the harmony. Root notes and octaves, lines that lock with the kick drum, and the slides and long notes of the 808, across funk, house and trap." },
  { id: "keys-3", number: 6, title: "Keys III: Pads & MIDI", after: ["keys-2"], summary: "Pads hold the harmony as long, slowly changing sounds, and MIDI records what is played as notes that can be edited afterwards. Voicing chords for a pad, the piano roll, and moving between keyboard and grid." },
  { id: "melody", number: 7, title: "Melody", after: ["keys-1"], summary: "A melody is a line of single notes that a listener can follow and remember. Steps and leaps, phrases that ask and answer, and how a melody uses the notes of the chord beneath it." },
  { id: "sampling-2", number: 8, title: "Sampling II: Flip", after: ["sampling-1"], summary: "Flipping a sample means turning it into something its source never was. Changing the pitch and speed of a sample, rearranging chopped chords into a new progression, and the questions of clearance and credit." },
  { id: "arrangement", number: 9, title: "Arrangement", after: ["sampling-2", "bass", "keys-3", "melody"], summary: "Arrangement decides when each part plays. Intros, verses, choruses, drops and breakdowns, and how layers enter and leave to build and release tension across a whole track." },
  { id: "daw", number: 10, title: "Into the DAW", after: ["arrangement"], summary: "A digital audio workstation (DAW) is the software in which tracks are produced. Tracks, clips, the mixer and the piano roll, and how everything practiced in the earlier lectures carries over to a real DAW." },
];

export const lectureById = (id: string) => LECTURES.find((l) => l.id === id);
