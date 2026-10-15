import { useEffect, useRef } from "react";
import { DRAWINGS_PER_SECOND } from "../music/timing";

/**
 * While `active`, calls `draw` with the seconds since the previous call.
 * `smooth`: on every screen refresh, for interface motion.
 * Otherwise 30 drawings a second, for illustrations meant to look drawn: each drawing is held an even
 * number of refreshes (2 at 60 Hz, 4 at 120 Hz), so the stepping never stutters.
 * `sample` runs on every refresh either way, to catch what happens between drawings.
 */
export function useDrawings(active: boolean, draw: (dt: number) => void, opts: { smooth?: boolean; sample?: () => void } = {}) {
  const drawRef = useRef(draw);
  const sampleRef = useRef(opts.sample);
  drawRef.current = draw;
  sampleRef.current = opts.sample;
  const smooth = !!opts.smooth;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last: number | null = null;
    let t0: number | null = null;
    let lastAt = 0;
    const frame = (now: number) => {
      // `now` is the refresh's own timestamp, so drawings line up with refreshes instead of drifting between them
      t0 ??= now;
      sampleRef.current?.();
      const n = smooth ? now : Math.floor(((now - t0) / 1000) * DRAWINGS_PER_SECOND + 0.05);
      if (n !== last) {
        drawRef.current(last === null ? 0 : (now - lastAt) / 1000);
        last = n;
        lastAt = now;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, smooth]);
}
