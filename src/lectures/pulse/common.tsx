import { useState, type ReactNode } from "react";
import type { Loop } from "../../music/model";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { heardTime, useKeys } from "../../ui/taps";
import { tapTempo, tempoRelation } from "../../music/timing";

/** One labelled play button per loop; only one plays at a time. */
export function Versions({ items }: { items: { id: string; label: ReactNode; loop: Loop; caption?: ReactNode }[] }) {
  return (
    <div className="versions">
      {items.map((it) => (
        <Version key={it.id} {...it} />
      ))}
    </div>
  );
}

function Version({ label, loop, caption }: { label: ReactNode; loop: Loop; caption?: ReactNode }) {
  const t = usePlayer(loop);
  return (
    <div className="version">
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} stepsPerBeat={loop.stepsPerBeat} />
      <div className="version-label mono">{label}</div>
      {caption && <div className="version-caption fade-in">{caption}</div>}
    </div>
  );
}

export function Listen({ loop, label = "Listen" }: { loop: Loop; label?: string }) {
  const t = usePlayer(loop);
  return (
    <div className="row">
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} stepsPerBeat={loop.stepsPerBeat} />
      <span className="label">{label}</span>
    </div>
  );
}

export type TapResult = { bpm: number; rel: ReturnType<typeof tempoRelation> };

/** Space bar or the pad. Reports the tapped tempo against the real one. */
export function TapPad({
  playing,
  actual,
  onResult,
  need = 8,
}: {
  playing: boolean;
  actual: number;
  onResult: (r: TapResult, count: number) => void;
  need?: number;
}) {
  const [taps, setTaps] = useState<number[]>([]);
  const [flash, setFlash] = useState(0);
  const bpm = tapTempo(taps);
  const tap = (time: number) => {
    if (!playing) return;
    const next = [...taps, time].slice(-16);
    setTaps(next);
    setFlash((f) => f + 1);
    const b = tapTempo(next);
    if (b && next.length >= need) onResult({ bpm: b, rel: tempoRelation(b, actual) }, next.length);
  };
  useKeys(["Space"], (_, time) => tap(time), playing);
  return (
    <div className="col" style={{ gap: 14 }}>
      <button
        className={`tappad ${playing ? "" : "idle"}`}
        onPointerDown={(e) => {
          e.preventDefault();
          tap(heardTime(e.timeStamp));
        }}
        aria-label="Tap"
      >
        <span key={flash} className="tap-ring" />
        <span className="tap-bpm mono">{bpm ? Math.round(bpm) : "–"}</span>
        <span className="tap-unit mono">{bpm ? "BPM" : "tap"}</span>
      </button>
      <span className="sub">
        <kbd>Space</kbd>
      </span>
    </div>
  );
}

export function Verdict({ ok, children }: { ok?: boolean | null; children?: ReactNode }) {
  return (
    <div className={`verdict ${ok === true ? "good" : ok === false ? "miss" : ""}`} aria-live="polite">
      {children}
    </div>
  );
}
