import { findLane, type Loop } from "../music/model";
import { STAFF_POS, isCross, isOpen, layoutBar, type BeatLayout, type NoteEvent } from "../music/notation";
import { cellSize, gridWidth, stepX } from "./gridLayout";

const SP = 9; // staff space
const TOP = 30;
const H = TOP + SP * 4 + 34;
const yOf = (pos: number) => TOP + (pos * SP) / 2;

interface Props {
  loop: Loop;
  laneIds: string[];
  from?: number;
  count?: number;
  step?: number | null;
  width?: number;
}

/** Drum notation that lines up column for column with a StepGrid of the same size. */
export function DrumStaff({ loop, laneIds, from = 0, count, step, width }: Props) {
  const spb = loop.stepsPerBeat;
  const n = count ?? loop.stepsPerBeat * loop.beatsPerBar * loop.bars - from;
  const cell = cellSize(n, spb, width);
  const w = gridWidth(n, cell, spb);
  const k = 4 / spb; // sixteenths per step
  const stepsPerBar = spb * 4;
  const bars = Math.ceil(n / stepsPerBar);

  const xOfSlot = (bar: number, slot: number) => stepX(bar * stepsPerBar + slot / k, cell, spb) + cell / 2 - 2;

  const layouts: BeatLayout[][] = [];
  for (let b = 0; b < bars; b++) {
    const hits = new Map<number, string[]>();
    for (const id of laneIds) {
      if (!(id in STAFF_POS)) continue;
      for (const note of findLane(loop, id)?.notes ?? []) {
        const rel = Math.round(note.step) - from - b * stepsPerBar;
        if (rel < 0 || rel >= stepsPerBar) continue;
        const slot = rel * k;
        hits.set(slot, [...(hits.get(slot) ?? []), id]);
      }
    }
    layouts.push(layoutBar(hits));
  }

  const rel = step != null ? step - from : null;

  return (
    <svg className="staff" width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="The same pattern in drum notation">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={8} x2={w} y1={TOP + i * SP} y2={TOP + i * SP} className="staff-line" />
      ))}
      <rect x={14} y={TOP + SP} width={3.5} height={SP * 2} className="ink" />
      <rect x={21} y={TOP + SP} width={3.5} height={SP * 2} className="ink" />
      <text x={44} y={TOP + SP * 2 - 2} className="timesig">
        4
      </text>
      <text x={44} y={TOP + SP * 4 - 2} className="timesig">
        4
      </text>
      {Array.from({ length: bars }, (_, b) => {
        const end = Math.min(n, (b + 1) * stepsPerBar) - 1;
        const x = stepX(end, cell, spb) + cell + 2;
        return <line key={b} x1={x} x2={x} y1={TOP} y2={TOP + SP * 4} className="staff-line bar" />;
      })}
      {rel != null && rel >= 0 && rel < n && (
        <line x1={stepX(rel, cell, spb) + cell / 2 - 2} x2={stepX(rel, cell, spb) + cell / 2 - 2} y1={TOP - 22} y2={TOP + SP * 4 + 22} className="staff-head" />
      )}
      {layouts.map((beats, b) => beats.map((beat) => <Beat key={`${b}-${beat.beat}`} beat={beat} x={(slot) => xOfSlot(b, slot)} />))}
    </svg>
  );
}

function Beat({ beat, x }: { beat: BeatLayout; x: (slot: number) => number }) {
  const stemTop = (n: NoteEvent) => yOf(Math.min(...n.voices.map((v) => STAFF_POS[v]))) - SP * 3.3;
  const groupTop = beat.notes.length ? Math.min(...beat.notes.map(stemTop)) : 0;
  const beamed = beat.notes.length >= 2;
  const sx = (n: NoteEvent) => x(n.slot) + 5;

  return (
    <g>
      {beat.events.map((e, i) =>
        e.kind === "rest" ? (
          <Rest key={i} x={x(e.slot)} dur={e.dur} />
        ) : (
          <g key={i}>
            {e.voices.map((v) => (
              <Head key={v} x={x(e.slot)} voice={v} />
            ))}
            <line
              x1={sx(e)}
              x2={sx(e)}
              y1={yOf(Math.max(...e.voices.map((v) => STAFF_POS[v]))) - 1}
              y2={beamed ? groupTop : stemTop(e)}
              className="stem"
            />
            {e.dur === 3 && <circle cx={x(e.slot) + 11} cy={yOf(Math.max(...e.voices.map((v) => STAFF_POS[v]))) - (STAFF_POS[e.voices[0]] % 2 === 0 ? SP / 2 : 0)} r={1.6} className="ink" />}
          </g>
        ),
      )}
      {beat.beams.map((bm, i) => (
        <rect
          key={i}
          x={sx(beat.notes[bm.from]) - 0.75}
          width={sx(beat.notes[bm.to]) - sx(beat.notes[bm.from]) + 1.5}
          y={groupTop + (bm.level - 1) * 7}
          height={4.5}
          className="ink"
        />
      ))}
      {beat.stubs.map((st, i) => {
        const xs = sx(beat.notes[st.note]);
        return <rect key={i} x={st.dir === 1 ? xs - 0.75 : xs - 8} width={8.75} y={groupTop + 7} height={4.5} className="ink" />;
      })}
      {!beamed &&
        beat.flags > 0 &&
        beat.notes.map((n, i) => {
          const top = stemTop(n);
          const xs = sx(n);
          return (
            <g key={`f${i}`}>
              {Array.from({ length: beat.flags }, (_, f) => (
                <path key={f} d={`M${xs} ${top + f * 7} c 1 6 9 7 7 16 c 1 -6 -3 -9 -7 -11 z`} className="ink" />
              ))}
            </g>
          );
        })}
    </g>
  );
}

function Head({ x, voice }: { x: number; voice: string }) {
  const y = yOf(STAFF_POS[voice]);
  if (isCross(voice)) {
    return (
      <g className="cross">
        <line x1={x - 4.5} x2={x + 4.5} y1={y - 4} y2={y + 4} />
        <line x1={x - 4.5} x2={x + 4.5} y1={y + 4} y2={y - 4} />
        {isOpen(voice) && <circle cx={x} cy={y - 12} r={3.2} fill="none" />}
        {voice === "crash" && <line x1={x - 8} x2={x + 8} y1={yOf(-2)} y2={yOf(-2)} />}
      </g>
    );
  }
  return <ellipse cx={x} cy={y} rx={5.6} ry={4} transform={`rotate(-20 ${x} ${y})`} className="ink" />;
}

function Rest({ x, dur }: { x: number; dur: 1 | 2 | 4 }) {
  const mid = TOP + SP * 2;
  if (dur === 4)
    return <path d={`M${x - 2} ${mid - 13} l 5 6 l -4 5 l 5 6 c -4 -1 -6 1 -3 5 c -6 -3 -5 -8 0 -6 l -6 -6 l 4 -5 z`} className="ink" />;
  const flag = (dy: number) => (
    <g key={dy}>
      <circle cx={x - 2 - dy * 0.25} cy={mid - 4 + dy} r={2.2} className="ink" />
      <path d={`M${x - 2 - dy * 0.25} ${mid - 2.5 + dy} c 3 1 5 0 6 -3`} className="rest-stroke" />
    </g>
  );
  return (
    <g>
      <line x1={x + 4} y1={mid - 7} x2={x - 1} y2={mid + (dur === 1 ? 12 : 8)} className="rest-stroke" />
      {flag(0)}
      {dur === 1 && flag(7)}
    </g>
  );
}
