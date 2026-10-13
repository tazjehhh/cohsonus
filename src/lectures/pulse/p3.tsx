import { useState } from "react";
import type { StepProps } from "../types";
import { Choice } from "../../ui/Choice";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { StepGrid } from "../../ui/StepGrid";
import { DrumStaff } from "../../ui/DrumStaff";
import { Versions } from "./common";
import { Rebuild } from "./p2";
import { L, densityA, densityB, densityC, errorLoop, fixed, hats16, hats8, openStart, openTarget, syncPushed, syncQuiz, syncStraight } from "./loops";

export function Faster({ complete, saved }: StepProps) {
  const [solved, setSolved] = useState(!!saved);
  return (
    <div className="col">
      <h2 className="prompt">Which one is fastest?</h2>
      <Versions
        items={[
          { id: "a", label: "A", loop: densityA, caption: solved ? "96 BPM" : undefined },
          { id: "b", label: "B", loop: densityB, caption: solved ? "96 BPM" : undefined },
          { id: "c", label: "C", loop: densityC, caption: solved ? "96 BPM" : undefined },
        ]}
      />
      <Choice
        options={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
          { id: "same", label: "Same speed" },
        ]}
        correct="same"
        initial={solved ? "same" : undefined}
        wrongText="Follow only the kick and snare."
        onResult={(_, attempts) => {
          setSolved(true);
          complete({ attempts });
        }}
      />
      {solved && <p className="sub fade-in">Same tempo. More hi-hats only split each beat into smaller pieces.</p>}
    </div>
  );
}

export function Sixteenths({ complete, saved }: StepProps) {
  const [res, setRes] = useState<8 | 16>(saved ? 16 : 8);
  const [seen, setSeen] = useState<Set<number>>(new Set(saved ? [8, 16] : [8]));
  const loop = res === 8 ? hats8 : hats16;
  const t = usePlayer(loop);
  const pick = (r: 8 | 16) => {
    t.stop();
    setRes(r);
    const n = new Set(seen).add(r);
    setSeen(n);
    if (n.size === 2) complete();
  };
  return (
    <div className="col">
      <h2 className="prompt">{res === 8 ? "Two per beat: 1 & 2 & 3 & 4 &" : "Four per beat: 1 e & a 2 e & a"}</h2>
      <div className="segbar" role="tablist">
        <button role="tab" aria-selected={res === 8} className={res === 8 ? "on" : ""} onClick={() => pick(8)}>
          Eighths
        </button>
        <button role="tab" aria-selected={res === 16} className={res === 16 ? "on" : ""} onClick={() => pick(16)}>
          Sixteenths
        </button>
      </div>
      <div className="panel">
        <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} stepsPerBeat={loop.stepsPerBeat} />
        <StepGrid loop={loop} lanes={[L.kick, L.snare, L.hat]} step={t.step} />
        <DrumStaff loop={loop} laneIds={["kick", "snare", "hat"]} step={t.step} />
      </div>
    </div>
  );
}

export function OpenHat(p: StepProps) {
  return (
    <Rebuild
      {...p}
      prompt="Listen. Add the open hat."
      target={openTarget}
      start={openStart}
      lanes={[L.kick, L.clap, L.open]}
      editable={["open"]}
    />
  );
}

export function SpotTheHat({ complete, saved }: StepProps) {
  const t = usePlayer(errorLoop);
  const [solved, setSolved] = useState(!!saved);
  return (
    <div className="col">
      <h2 className="prompt">One hi-hat is out of place. On which beat?</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <Choice
        options={[1, 2, 3, 4].map((b) => ({ id: String(b), label: <span className="mono">{b}</span> }))}
        correct="3"
        initial={solved ? "3" : undefined}
        onResult={(_, attempts) => {
          setSolved(true);
          complete({ attempts });
        }}
      />
      {solved && (
        <div className="panel fade-in">
          <StepGrid loop={errorLoop} lanes={[L.kick, L.snare, L.hat]} step={t.step} misses={[{ lane: "hat", step: 11 }]} />
          <p className="sub">It should sit on “3 &”. It landed on “3 a”, one sixteenth late.</p>
        </div>
      )}
    </div>
  );
}

export function Syncopation({ complete, saved }: StepProps) {
  const [pushed, setPushed] = useState(false);
  const [heard, setHeard] = useState<Set<string>>(new Set(saved ? ["s", "p"] : []));
  const [solved, setSolved] = useState(!!saved);
  const loop = pushed ? syncPushed : syncStraight;
  const t = usePlayer(loop);
  return (
    <div className="col">
      <h2 className="prompt">One kick, two places.</h2>
      <div className="segbar" role="tablist">
        {[
          ["s", "On beat 3", false],
          ["p", "On “2 &”", true],
        ].map(([id, label, p]) => (
          <button
            key={id as string}
            role="tab"
            aria-selected={pushed === p}
            className={pushed === p ? "on" : ""}
            onClick={() => {
              setPushed(p as boolean);
              setHeard((h) => new Set(h).add(id as string));
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="panel">
        <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
        <StepGrid loop={loop} lanes={[L.kick, L.snare, fixed(L.hat)]} step={t.step} />
      </div>
      {heard.size === 2 && (
        <div className="col fade-in">
          <p className="sub">
            A hit that arrives before the beat you expect: <strong>syncopation</strong>. It pulls the groove forward.
          </p>
          <h3 className="prompt small">In this one, which kick is off the beat?</h3>
          <StepGrid loop={syncQuiz} lanes={[L.kick, L.snare]} width={640} />
          <Choice
            options={[
              { id: "1", label: "1" },
              { id: "3", label: "3" },
              { id: "3a", label: "3 a" },
            ]}
            correct="3a"
            initial={solved ? "3a" : undefined}
            onResult={(_, attempts) => {
              setSolved(true);
              complete({ attempts });
            }}
          />
        </div>
      )}
    </div>
  );
}

