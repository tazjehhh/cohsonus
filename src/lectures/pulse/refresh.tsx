import { useState } from "react";
import type { StepProps } from "../types";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { Choice } from "../../ui/Choice";
import { TapPad, Verdict, Versions } from "./common";
import { Rebuild } from "./p2";
import { L, refreshStart, refreshStraight, refreshSwung, refreshTap, refreshTarget } from "./loops";

export function RefreshTap({ complete }: StepProps) {
  const t = usePlayer(refreshTap);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="col">
      <h2 className="prompt">Tap the pulse.</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <TapPad
        playing={t.playing}
        actual={refreshTap.bpm}
        onResult={(r, n) => {
          if (done) return;
          if (r.rel !== "off" || n >= 12) {
            setDone(r.rel !== "off" ? `${Math.round(r.bpm)} BPM. The track runs at ${refreshTap.bpm}.` : `The track runs at ${refreshTap.bpm}.`);
            complete({ pass: r.rel !== "off" });
          }
        }}
      />
      <Verdict ok={done ? true : null}>{done}</Verdict>
    </div>
  );
}

export function RefreshRebuild(p: StepProps) {
  return (
    <Rebuild
      {...p}
      complete={() => {}}
      onCheck={(ok, n) => {
        if (ok) p.complete({ pass: n === 1 });
      }}
      prompt="Build it by ear."
      target={refreshTarget}
      start={refreshStart}
      lanes={[L.kick, L.snare, L.hat]}
      editable={["kick", "snare"]}
    />
  );
}

export function RefreshSwing({ complete }: StepProps) {
  return (
    <div className="col">
      <h2 className="prompt">Which one swings?</h2>
      <Versions
        items={[
          { id: "a", label: "A", loop: refreshSwung },
          { id: "b", label: "B", loop: refreshStraight },
        ]}
      />
      <Choice
        options={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ]}
        correct="a"
        onResult={(_, attempts) => complete({ pass: attempts === 1 })}
      />
    </div>
  );
}
