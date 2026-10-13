import { useEffect, useRef } from "react";
import { DEFAULT_VEL, findLane, withLane, type Loop, type Note } from "../music/model";
import type { Miss } from "../music/checks";
import { LABEL_W, cellSize, countLabel, gridWidth, stepX } from "./gridLayout";

export interface GridLane {
  id: string;
  label: string;
  editable?: boolean;
}

interface Props {
  loop: Loop;
  lanes: GridLane[];
  onChange?: (loop: Loop) => void;
  /** Absolute playing step, or null. */
  step?: number | null;
  from?: number;
  count?: number;
  velocity?: boolean;
  misses?: Miss[];
  counting?: boolean;
  /** Draw every second step where swing actually puts it. */
  showSwing?: boolean;
  onHit?: (lane: string, note: Note) => void;
  width?: number;
  accent?: string;
}

const ROW = 40;

export function StepGrid({
  loop,
  lanes,
  onChange,
  step,
  from = 0,
  count,
  velocity,
  misses,
  counting = true,
  showSwing,
  onHit,
  width,
  accent,
}: Props) {
  const n = count ?? loop.stepsPerBeat * loop.beatsPerBar * loop.bars - from;
  const spb = loop.stepsPerBeat;
  const cell = cellSize(n, spb, width);
  const w = gridWidth(n, cell, spb);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const drag = useRef<{ lane: string; on: boolean } | null>(null);
  const velDrag = useRef<{ lane: string; step: number; y: number; vel: number; moved: boolean } | null>(null);

  useEffect(() => {
    const up = () => {
      const v = velDrag.current;
      if (v && !v.moved) toggle(v.lane, v.step, null);
      drag.current = null;
      velDrag.current = null;
    };
    const move = (e: PointerEvent) => {
      const v = velDrag.current;
      if (!v) return;
      const dy = v.y - e.clientY;
      if (Math.abs(dy) > 3) v.moved = true;
      if (v.moved) setVel(v.lane, v.step, Math.max(0.1, Math.min(1, v.vel + dy / 60)));
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
    };
  });

  const noteAt = (laneId: string, s: number) => findLane(loopRef.current, laneId)?.notes.find((x) => Math.round(x.step) === s);

  function toggle(laneId: string, s: number, force: boolean | null) {
    if (!onChange) return;
    const l = loopRef.current;
    const notes = findLane(l, laneId)?.notes ?? [];
    const has = notes.some((x) => Math.round(x.step) === s);
    const on = force ?? !has;
    if (on === has) return;
    const note: Note = { step: s, vel: DEFAULT_VEL };
    const next = on ? [...notes, note].sort((a, b) => a.step - b.step) : notes.filter((x) => Math.round(x.step) !== s);
    if (on) onHit?.(laneId, note);
    onChange(withLane(l, laneId, next));
  }

  function setVel(laneId: string, s: number, vel: number) {
    if (!onChange) return;
    const l = loopRef.current;
    const notes = (findLane(l, laneId)?.notes ?? []).map((x) => (Math.round(x.step) === s ? { ...x, vel } : x));
    onChange(withLane(l, laneId, notes));
  }

  const missSet = new Set((misses ?? []).map((m) => `${m.lane}:${m.step}`));
  const swingShift = showSwing ? ((loop.swing ?? 0.5) - 0.5) * 2 * cell : 0;
  const rel = step != null ? step - from : null;

  return (
    <div className="grid" style={{ width: w, ["--cell" as string]: `${cell}px`, ["--hit" as string]: accent ?? "var(--accent)" }}>
      {rel != null && rel >= 0 && rel < n && <div className="grid-head" style={{ left: stepX(rel, cell, spb), width: cell }} />}
      {lanes.map((lane) => {
        const editable = lane.editable !== false && !!onChange;
        return (
          <div className="grid-row" key={lane.id} style={{ height: ROW }}>
            <div className="grid-label" style={{ width: LABEL_W - 12 }}>
              {lane.label}
            </div>
            {Array.from({ length: n }, (_, i) => {
              const s = from + i;
              const note = noteAt(lane.id, s);
              const shift = i % 2 === 1 ? swingShift : 0;
              const miss = missSet.has(`${lane.id}:${s}`);
              const vel = note?.vel ?? DEFAULT_VEL;
              return (
                <button
                  key={i}
                  className={`cell ${note ? "on" : ""} ${i % spb === 0 ? "beat" : ""} ${miss ? "miss" : ""} ${editable ? "" : "fixed"}`}
                  style={{ left: stepX(i, cell, spb) + shift, width: cell - 4, height: ROW - 6 }}
                  aria-pressed={!!note}
                  aria-label={`${lane.label}, ${countLabel(i, spb)}${i % spb === 0 ? "" : ` after ${Math.floor(i / spb) + 1}`}`}
                  tabIndex={editable ? 0 : -1}
                  onPointerDown={(e) => {
                    if (!editable) return;
                    e.preventDefault();
                    if (velocity && note) {
                      velDrag.current = { lane: lane.id, step: s, y: e.clientY, vel, moved: false };
                      return;
                    }
                    drag.current = { lane: lane.id, on: !note };
                    toggle(lane.id, s, !note);
                  }}
                  onPointerEnter={() => {
                    const d = drag.current;
                    if (d && d.lane === lane.id) toggle(lane.id, s, d.on);
                  }}
                  onKeyDown={(e) => {
                    if (editable && (e.key === " " || e.key === "Enter")) {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(lane.id, s, null);
                    }
                  }}
                >
                  {note && <span className="fill" style={velocity ? { height: `${Math.round(vel * 100)}%` } : { opacity: 0.4 + 0.6 * vel }} />}
                </button>
              );
            })}
          </div>
        );
      })}
      {counting && (
        <div className="grid-count" style={{ height: 22 }}>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={i % spb === 0 ? "beat" : ""} style={{ left: stepX(i, cell, spb), width: cell - 4 }}>
              {countLabel(i, spb)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

