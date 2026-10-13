import { useEffect, useState, type ComponentType } from "react";
import { drums } from "../music/patterns";
import { StepGrid } from "../ui/StepGrid";
import { DrumStaff } from "../ui/DrumStaff";

/** A still-life of each lecture's own stage, shown on its card. */
export const PREVIEWS: Record<string, ComponentType> = {
  anatomy: AnatomyPreview,
  pulse: PulsePreview,
};

const BEAT = 60 / 124;

const STRIPS: { name: string; color: string; every: number; at: number }[] = [
  { name: "Kick", color: "var(--drums)", every: 1, at: 0 },
  { name: "Clap", color: "var(--drums)", every: 2, at: 1 },
  { name: "Hats", color: "var(--drums)", every: 0.5, at: 0.25 },
  { name: "Bass", color: "var(--bass)", every: 1, at: 0.5 },
  { name: "Chords", color: "var(--harmony)", every: 2, at: 0.75 },
  { name: "Lead", color: "var(--melody)", every: 1.5, at: 0 },
];

const GROUPS = [
  { color: "var(--drums)", span: 3 },
  { color: "var(--bass)", span: 1 },
  { color: "var(--harmony)", span: 1 },
  { color: "var(--melody)", span: 1 },
];

function AnatomyPreview() {
  return (
    <div className="pv-anatomy" aria-hidden>
      <div className="pv-groups">
        {GROUPS.map((g, i) => (
          <i key={i} style={{ background: g.color, flex: g.span }} />
        ))}
      </div>
      <div className="pv-strips">
        {STRIPS.map((s) => (
          <div key={s.name} className="pv-strip">
            <div className="pv-meter">
              <i style={{ background: s.color, animationDuration: `${s.every * BEAT}s`, animationDelay: `${s.at * BEAT}s` }} />
            </div>
            <span>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PULSE_LOOP = drums({ bpm: 96 }, { kick: "x......x..x.....", snare: "....x.......x...", hat: "x.o.x.o.x.o.x.oo" });
const PULSE_LANES = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "hat", label: "Hi-hat" },
];

function useStep(stepSeconds: number, steps: number) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % steps), stepSeconds * 1000);
    return () => clearInterval(id);
  }, [stepSeconds, steps]);
  return step;
}

function PulsePreview() {
  const step = useStep(60 / PULSE_LOOP.bpm / 4, 16);
  return (
    <div className="pv-pulse" aria-hidden inert>
      <div className="pv-scale">
        <StepGrid loop={PULSE_LOOP} lanes={PULSE_LANES} step={step} width={560} counting={false} />
        <DrumStaff loop={PULSE_LOOP} laneIds={["kick", "snare", "hat"]} step={step} width={560} />
      </div>
    </div>
  );
}
