import { useEffect, useRef, useState } from "react";
import type { StepProps } from "../types";
import type { Loop, Note } from "../../music/model";
import { loopSteps } from "../../music/model";
import { Choice } from "../../ui/Choice";
import { Studio } from "../../ui/Studio";
import { StepGrid } from "../../ui/StepGrid";
import { PlayButton } from "../../ui/PlayButton";
import { usePlayer } from "../../audio/usePlayer";
import { useKeys } from "../../ui/taps";
import { quantize } from "../../music/timing";
import { Listen, TapPad, Verdict, Versions, type TapResult } from "./common";
import { L, accentHats, fixed, flatHats, ghostOff, ghostOn, human, machine, metronome, swingStart, swingTarget, swung, trap140 } from "./loops";

export function ThreeVersions({ complete, saved }: StepProps) {
  const prev = saved as { best?: string } | undefined;
  const [best, setBest] = useState<string | null>(prev?.best ?? null);
  const [solved, setSolved] = useState(!!saved);
  return (
    <div className="col">
      <h2 className="prompt">{best ? "Which one is a machine playing exactly on the grid?" : "Which one feels best?"}</h2>
      <Versions
        items={[
          { id: "a", label: "A", loop: swung, caption: solved ? "swung" : undefined },
          { id: "b", label: "B", loop: machine, caption: solved ? "on the grid" : undefined },
          { id: "c", label: "C", loop: human, caption: solved ? "played by hand" : undefined },
        ]}
      />
      {!best ? (
        <Choice
          key="best"
          options={["a", "b", "c"].map((id) => ({ id, label: id.toUpperCase() }))}
          onResult={(id) => setBest(id)}
        />
      ) : (
        <Choice
          key="machine"
          options={["a", "b", "c"].map((id) => ({ id, label: id.toUpperCase() }))}
          correct="b"
          initial={solved ? "b" : undefined}
          onResult={(_, attempts) => {
            setSolved(true);
            complete({ best, attempts });
          }}
        />
      )}
      {solved && (
        <p className="sub fade-in">
          {best === "b" ? "You liked the machine best. Plenty of great records are built exactly that way." : "The one you liked best is not on the grid."} Groove lives in small timing differences.
        </p>
      )}
    </div>
  );
}

export function MatchSwing({ complete, saved }: StepProps) {
  const [loop, setLoop] = useState<Loop>(saved ? swingTarget : swingStart);
  const [checked, setChecked] = useState<null | "low" | "high" | "ok">(saved ? "ok" : null);
  const target = swingTarget.swing!;
  return (
    <div className="col">
      <h2 className="prompt">Match the swing.</h2>
      <Listen loop={swingTarget} label="The groove" />
      <Studio
        loop={loop}
        onChange={(l) => {
          if (checked === "ok") return;
          setLoop(l);
          setChecked(null);
        }}
        lanes={[fixed(L.kick), fixed(L.snare), fixed(L.hat)]}
        swing
        showSwing
        staff={false}
      />
      {checked !== "ok" && (
        <button
          className="btn"
          onClick={() => {
            const s = loop.swing ?? 0.5;
            const r = Math.abs(s - target) <= 0.03 ? "ok" : s < target ? "low" : "high";
            setChecked(r);
            if (r === "ok") complete({ swing: s });
          }}
        >
          Check
        </button>
      )}
      <Verdict ok={checked === null ? null : checked === "ok"}>
        {checked === "ok" && `${Math.round(target * 100)}%. Every second sixteenth arrives late, and the beat starts to bounce.`}
        {checked === "low" && "Still too straight."}
        {checked === "high" && "Too much. It starts to limp."}
      </Verdict>
    </div>
  );
}

export function Velocity({ complete, saved }: StepProps) {
  const [solved, setSolved] = useState(!!saved);
  const [loop, setLoop] = useState<Loop>(accentHats);
  return (
    <div className="col">
      <h2 className="prompt">Which one sounds like a person playing?</h2>
      <Versions
        items={[
          { id: "a", label: "A", loop: flatHats },
          { id: "b", label: "B", loop: accentHats },
        ]}
      />
      <Choice
        options={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ]}
        correct="b"
        initial={solved ? "b" : undefined}
        wrongText="Listen to the hi-hats only."
        onResult={(_, attempts) => {
          setSolved(true);
          complete({ attempts });
        }}
      />
      {solved && (
        <div className="col fade-in">
          <p className="sub">
            B. Every hit has its own strength: <strong>velocity</strong>. Drag the bars up and down.
          </p>
          <Studio loop={loop} onChange={setLoop} lanes={[fixed(L.kick), fixed(L.snare), L.hat]} velocity staff={false} />
        </div>
      )}
    </div>
  );
}

export function GhostNotes({ complete, saved }: StepProps) {
  const [on, setOn] = useState(true);
  const [flips, setFlips] = useState(saved ? 2 : 0);
  const loop = on ? ghostOn : ghostOff;
  const t = usePlayer(loop);
  useEffect(() => {
    if (flips >= 2) complete();
  }, [flips, complete]);
  return (
    <div className="col">
      <h2 className="prompt">Switch the ghost notes off. Then on again.</h2>
      <div className="segbar" role="tablist">
        <button role="tab" aria-selected={on} className={on ? "on" : ""} onClick={() => !on && (setOn(true), setFlips((f) => f + 1))}>
          Ghost notes on
        </button>
        <button role="tab" aria-selected={!on} className={!on ? "on" : ""} onClick={() => on && (setOn(false), setFlips((f) => f + 1))}>
          Off
        </button>
      </div>
      <div className="panel">
        <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
        <StepGrid loop={loop} lanes={[L.kick, L.snare, L.hat]} step={t.step} velocity />
      </div>
      {flips >= 2 && <p className="sub fade-in">Barely audible snare hits between the loud ones. Take them away and the groove goes stiff.</p>}
    </div>
  );
}

type Rec = { lane: "kick" | "snare"; step: number };

export function LiveRecord({ complete, saved }: StepProps) {
  const prev = (saved as { rec?: Rec[] } | undefined)?.rec;
  const [rec, setRec] = useState<Rec[]>(prev ?? []);
  const [phase, setPhase] = useState<"idle" | "armed" | "recording" | "done">(prev ? "done" : "idle");
  const [amount, setAmount] = useState(prev ? 1 : 0);
  const [moved, setMoved] = useState(!!prev);
  const total = loopSteps(metronome);
  const buffer = useRef<Rec[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const notes = (lane: string): Note[] => quantize(rec.filter((r) => r.lane === lane).map((r) => ({ step: r.step, vel: 0.9 })), amount, total);
  const playback: Loop =
    phase === "done"
      ? {
          ...metronome,
          lanes: metronome.lanes
            .filter((l) => l.id !== "click")
            .map((l) => (l.id === "kick" || l.id === "snare" ? { ...l, notes: notes(l.id) } : l)),
        }
      : metronome;
  const t = usePlayer(playback);

  useEffect(
    () =>
      t.player.subscribe((s) => {
        if (s !== 0) return;
        if (phaseRef.current === "armed") {
          buffer.current = buffer.current.filter((r) => r.step > total - 0.6).map((r) => ({ ...r, step: r.step - total }));
          setPhase("recording");
        } else if (phaseRef.current === "recording") {
          setRec(buffer.current);
          setPhase("done");
        }
      }),
    [t.player, total],
  );

  useKeys(
    ["f", "j"],
    (k, time) => {
      const lane = k === "f" ? "kick" : "snare";
      void t.player.audition(lane, { step: 0, vel: 0.9 });
      if (phaseRef.current !== "armed" && phaseRef.current !== "recording") return;
      buffer.current.push({ lane, step: t.player.positionAt(time) });
    },
    true,
  );

  const record = () => {
    buffer.current = [];
    setRec([]);
    setAmount(0);
    setMoved(false);
    setPhase("armed");
    if (!t.playing) t.play();
  };

  const ready = phase === "done" && rec.length >= 4 && moved;
  useEffect(() => {
    if (ready) complete({ rec });
  }, [ready, rec, complete]);

  return (
    <div className="col">
      <h2 className="prompt">Play it yourself.</h2>
      <p className="sub">
        <kbd>F</kbd> kick · <kbd>J</kbd> snare · two bars
      </p>
      <div className="panel" style={{ width: 860 }}>
        <div className="toolbar">
          <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
          <button className={`btn ${phase === "armed" || phase === "recording" ? "on rec" : ""}`} onClick={record} disabled={phase === "armed" || phase === "recording"}>
            {phase === "armed" ? "Ready…" : phase === "recording" ? "Recording" : phase === "done" ? "Record again" : "Record"}
          </button>
          {phase === "done" && (
            <label className="field">
              Quantize
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(amount * 100)}
                onChange={(e) => {
                  setAmount(Number(e.target.value) / 100);
                  setMoved(true);
                }}
              />
              <span className="readout">{Math.round(amount * 100)}%</span>
            </label>
          )}
        </div>
        <Timeline rec={phase === "done" ? rec.map((r) => ({ ...r, step: quantize([{ step: r.step }], amount, total)[0].step })) : buffer.current} total={total} step={t.step} />
        <PadsRow onHit={(lane) => window.dispatchEvent(new KeyboardEvent("keydown", { key: lane === "kick" ? "f" : "j" }))} />
      </div>
      {ready && <p className="sub fade-in">Quantize pulls every hit onto the grid. All the way, and you sound like a machine.</p>}
    </div>
  );
}

function PadsRow({ onHit }: { onHit: (lane: "kick" | "snare") => void }) {
  return (
    <div className="row">
      <button className="pad" onPointerDown={() => onHit("kick")}>
        Kick <kbd>F</kbd>
      </button>
      <button className="pad" onPointerDown={() => onHit("snare")}>
        Snare <kbd>J</kbd>
      </button>
    </div>
  );
}

function Timeline({ rec, total, step }: { rec: Rec[]; total: number; step: number | null }) {
  const W = 780;
  const x = (s: number) => 20 + (((s % total) + total) % total) * ((W - 40) / total);
  return (
    <svg width={W} height={120} className="timeline" role="img" aria-label="Your recorded hits on the grid">
      {Array.from({ length: total + 1 }, (_, i) => (
        <line key={i} x1={x(i) || 20} x2={x(i) || 20} y1={i % 4 === 0 ? 14 : 30} y2={i % 4 === 0 ? 106 : 90} className={i % 16 === 0 ? "tl-bar" : i % 4 === 0 ? "tl-beat" : "tl-sub"} />
      ))}
      <line x1={W - 20} x2={W - 20} y1={14} y2={106} className="tl-bar" />
      <text x={6} y={44} className="tl-lbl">
        K
      </text>
      <text x={6} y={84} className="tl-lbl">
        S
      </text>
      {step != null && <rect x={x(step) - 1} y={10} width={(W - 40) / total} height={100} className="tl-head" />}
      {rec.map((r, i) => (
        <circle key={i} cx={x(r.step)} cy={r.lane === "kick" ? 40 : 80} r={6} className={`tl-hit ${r.lane}`} />
      ))}
    </svg>
  );
}

export function HalfTime({ complete, saved }: StepProps) {
  const t = usePlayer(trap140);
  const [res, setRes] = useState<TapResult | null>((saved as TapResult) ?? null);
  return (
    <div className="col">
      <h2 className="prompt">Tap along again.</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <TapPad
        playing={t.playing}
        actual={trap140.bpm}
        onResult={(r) => {
          if (res) return;
          setRes(r);
          complete(r);
        }}
      />
      <Verdict ok={res ? true : null}>
        {res && (
          <>
            {res.rel === "half" ? "You tapped around 70. " : res.rel === "same" ? "You tapped around 140. " : `You tapped ${Math.round(res.bpm)}. `}
            The track runs at 140, but with the snare only on beat 3 it feels like 70: <strong>half-time</strong>.
          </>
        )}
      </Verdict>
    </div>
  );
}
