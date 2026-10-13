import type { ComponentType } from "react";

export interface StepProps {
  /** Called when the step's task is met; may be called again with newer data. */
  complete: (data?: unknown) => void;
  /** True once the step has been completed (now or in an earlier session). */
  done: boolean;
  /** What the step stored the last time it was completed. */
  saved?: unknown;
  /** Data stored by other steps of the same lecture, keyed "partId/stepId". */
  memory: Record<string, unknown>;
}

export interface StepDef {
  id: string;
  C: ComponentType<StepProps>;
}

export interface Listen {
  artist: string;
  title: string;
  hint?: string;
}

export interface Homework {
  task: string;
  listen?: Listen[];
}

export interface PartDef {
  id: string;
  title: string;
  minutes: number;
  /** One line shown before the part starts, e.g. what to have ready. */
  note?: string;
  steps: StepDef[];
  homework?: Homework;
}

export interface RefreshTask {
  id: string;
  /** Part to revisit when this task is missed. */
  part: string;
  C: ComponentType<StepProps>;
}

export interface LectureDef {
  id: string;
  number: number;
  title: string;
  parts: PartDef[];
  refresher?: RefreshTask[];
}
