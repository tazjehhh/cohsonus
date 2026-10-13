import { useSyncExternalStore } from "react";

export interface LectureProgress {
  part: number;
  step: number;
  /** keyed "partId/stepId" → whatever the step stored when it was completed */
  steps: Record<string, unknown>;
  parts: string[];
  finishedAt?: number;
  refreshedAt?: number;
  refresh?: Record<string, boolean>;
}

type State = Record<string, LectureProgress>;

const KEY = "cohsonus.progress.v1";
let state: State = read();
const listeners = new Set<() => void>();

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as State) : {};
  } catch {
    return {};
  }
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage can be unavailable; progress then lasts for this visit */
  }
  for (const fn of listeners) fn();
}

export const blank = (): LectureProgress => ({ part: 0, step: 0, steps: {}, parts: [] });

export function getProgress(id: string): LectureProgress {
  return state[id] ?? blank();
}

export function updateProgress(id: string, fn: (p: LectureProgress) => LectureProgress) {
  state = { ...state, [id]: fn(getProgress(id)) };
  write();
}

export function resetProgress(id: string) {
  const next = { ...state };
  delete next[id];
  state = next;
  write();
}

export function useProgress(id: string): LectureProgress {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state[id] ?? EMPTY,
  );
}

export function useAllProgress(): State {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}

const EMPTY = blank();
