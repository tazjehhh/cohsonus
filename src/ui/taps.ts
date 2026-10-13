import { useEffect, useRef } from "react";
import { audio, heardOffset } from "../audio/engine";

/** Audio-clock time at which the listener heard the sound playing when the event fired. */
export function heardTime(eventStamp: number) {
  const c = audio();
  const ts = c.getOutputTimestamp?.();
  if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
    return ts.contextTime + (eventStamp - ts.performanceTime) / 1000;
  }
  return c.currentTime - heardOffset();
}

/**
 * Calls `onKey(key, heardTime)` for the given keys. Space is taken over completely
 * while active so it never presses a focused button by accident.
 */
export function useKeys(keys: string[], onKey: (key: string, time: number) => void, active = true) {
  const fn = useRef(onKey);
  fn.current = onKey;
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      const k = e.key === " " ? "Space" : e.key.toLowerCase();
      if (!keys.includes(k)) return;
      const el = e.target as HTMLElement;
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      fn.current(k, heardTime(e.timeStamp));
    };
    window.addEventListener("keydown", h, { capture: true });
    return () => window.removeEventListener("keydown", h, { capture: true });
  }, [active, keys.join(",")]);
}
