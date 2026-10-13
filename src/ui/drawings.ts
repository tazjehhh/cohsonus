import { useEffect, useRef } from "react";
import type { Player } from "../audio/player";
import { audio, heardOffset } from "../audio/engine";
import { DRAWINGS_PER_SECOND } from "../music/timing";

/** Screen refreshes land every ~16.7 ms, so 1/12 s can show up as 83 or 100 ms but never 67. */
const MIN_GAP = 1000 / DRAWINGS_PER_SECOND - 9;

/**
 * While `active`, calls `sample` on every screen refresh and `draw` once per drawing.
 * With a player, drawings follow its beat (every beat starts a new one); without, a plain 12 a second.
 * `draw` gets the seconds since the last drawing, so decays keep real time.
 */
export function useDrawings(active: boolean, draw: (dt: number) => void, opts: { player?: Player; sample?: () => void } = {}) {
  const drawRef = useRef(draw);
  const sampleRef = useRef(opts.sample);
  drawRef.current = draw;
  sampleRef.current = opts.sample;
  const player = opts.player;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last: number | null = null;
    let lastAt = performance.now();
    const t0 = lastAt;
    const frame = (now: number) => {
      sampleRef.current?.();
      const n = player ? player.drawingAt(audio().currentTime - heardOffset()) : Math.floor(((now - t0) / 1000) * DRAWINGS_PER_SECOND);
      // the audio clock moves in chunks; never let two drawings come closer than a twelfth of a second
      if (n !== last && (last === null || now - lastAt >= MIN_GAP)) {
        last = n;
        drawRef.current((now - lastAt) / 1000);
        lastAt = now;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, player]);
}

/** Stepped ease-out for a move of `n` drawings: drawing k (from 1) shows this share of the way. */
export const easeDrawing = (k: number, n: number) => 1 - Math.pow(1 - Math.min(1, k / n), 2);
