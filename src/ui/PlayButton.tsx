import { useEffect, useState } from "react";

export function PlayButton({
  playing,
  onClick,
  step,
  stepsPerBeat = 4,
  size = "md",
  label,
}: {
  playing: boolean;
  onClick: () => void;
  step?: number | null;
  stepsPerBeat?: number;
  size?: "md" | "sm";
  label?: string;
}) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (playing && step != null && step % stepsPerBeat === 0) setBeat((b) => b + 1);
  }, [step, playing, stepsPerBeat]);
  return (
    <button
      className={`play ${size === "sm" ? "sm" : ""} ${playing ? "playing" : ""}`}
      onClick={onClick}
      aria-label={label ?? (playing ? "Stop" : "Play")}
      aria-pressed={playing}
    >
      <span key={beat} className="pulse" style={playing && beat ? { animation: "ring .35s var(--ease)" } : undefined} />
      {playing ? (
        <svg viewBox="0 0 10 10">
          <rect x="1.5" y="1.5" width="7" height="7" rx="0.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 10 10">
          <path d="M2.5 1.2 L9 5 L2.5 8.8 Z" />
        </svg>
      )}
    </button>
  );
}
