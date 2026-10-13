import { useEffect, useRef, useState } from "react";
import type { Player } from "../audio/player";
import { audio, heardOffset } from "../audio/engine";
import { useDrawings } from "./drawings";

const W = 700;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const R = 112;
const LINE_X0 = 110;
const LINE_X1 = W - 110;
const UNROLL_DRAWINGS = 26;

function at(phase: number, u: number) {
  const a = phase * Math.PI * 2;
  const cx = CX + R * Math.sin(a);
  const cy = CY - R * Math.cos(a);
  const lx = LINE_X0 + phase * (LINE_X1 - LINE_X0);
  return { x: cx + (lx - cx) * u, y: cy + (CY - cy) * u };
}

/**
 * One bar drawn as a cycle that can unroll into a line.
 * `taps` are positions inside the bar, 0..1.
 */
export function BeatCircle({
  player,
  playing,
  barSteps,
  beats = 4,
  taps = [],
  unrolled = false,
  numbers = false,
  highlight,
}: {
  player: Player;
  playing: boolean;
  barSteps: number;
  beats?: number;
  taps?: number[];
  unrolled?: boolean;
  numbers?: boolean;
  highlight?: number;
}) {
  const [u, setU] = useState(unrolled ? 1 : 0);
  const [phase, setPhase] = useState(0);
  const uRef = useRef(u);

  // 26 drawings (just over a second), slow in and slow out
  const [unrolling, setUnrolling] = useState(false);
  const move = useRef({ from: uRef.current, to: uRef.current, k: 0 });
  useEffect(() => {
    move.current = { from: uRef.current, to: unrolled ? 1 : 0, k: 0 };
    setUnrolling(move.current.from !== move.current.to);
  }, [unrolled]);
  useDrawings(unrolling, () => {
    const m = move.current;
    m.k += 1;
    const x = Math.min(1, m.k / UNROLL_DRAWINGS);
    const e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    uRef.current = m.from + (m.to - m.from) * e;
    setU(uRef.current);
    if (x >= 1) setUnrolling(false);
  });

  useDrawings(playing, () => setPhase((player.positionAt(audio().currentTime - heardOffset()) % barSteps) / barSteps), { player });

  const track =
    u < 0.999
      ? Array.from({ length: 121 }, (_, i) => at(i / 120, u))
          .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ")
      : `M${LINE_X0} ${CY} L${LINE_X1} ${CY}`;
  const head = at(phase, u);

  return (
    <svg className="beatcircle" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={unrolled ? "One bar laid out as a line" : "One bar drawn as a circle"}>
      <path d={track} className="bc-track" />
      {Array.from({ length: beats }, (_, i) => {
        const p = at(i / beats, u);
        const lbl = at(i / beats, u);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === 0 ? 9 : 7} className={`bc-beat ${i === 0 ? "one" : ""} ${highlight === i ? "hl" : ""}`} />
            {numbers && (
              <text x={lbl.x + (1 - u) * Math.sin((i / beats) * Math.PI * 2) * 30} y={lbl.y - (1 - u) * Math.cos((i / beats) * Math.PI * 2) * 30 + u * 34 + 5} className="bc-num">
                {i + 1}
              </text>
            )}
          </g>
        );
      })}
      {u > 0.999 && <circle cx={LINE_X1} cy={CY} r={4} className="bc-end" />}
      {taps.map((t, i) => {
        const p = at(t, u);
        return <circle key={i} cx={p.x} cy={p.y} r={3.5} className="bc-tap" />;
      })}
      {playing && <circle cx={head.x} cy={head.y} r={5} className="bc-head" />}
    </svg>
  );
}
