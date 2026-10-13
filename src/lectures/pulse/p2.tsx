import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import type { Loop } from "../../music/model";
import { Studio } from "../../ui/Studio";
import { StepGrid } from "../../ui/StepGrid";
import { Choice } from "../../ui/Choice";
import { gridDiff, snareBeats, type Miss } from "../../music/checks";
import { stepsOf } from "../../music/model";
import { Listen, Verdict, Versions } from "./common";
import { L, backbeatA, backbeatB, fixed, kickSnareEmpty, rebuildStart, rebuildTarget } from "./loops";

export function NodBuild({ complete, saved }: StepProps) {
  const [loop, setLoop] = useState<Loop>((saved as { loop?: Loop } | undefined)?.loop ?? kickSnareEmpty);
  const ready = stepsOf(loop, "kick").length > 0 && stepsOf(loop, "snare").length > 0;
  useEffect(() => {
    if (ready) complete({ loop });
  }, [ready, loop, complete]);
  return (
    <div className="col">
      <h2 className="prompt">Make something you can nod your head to.</h2>
      <Studio loop={loop} onChange={setLoop} lanes={[L.kick, L.snare, fixed(L.hat)]} />
    </div>
  );
}

const beatsText = (b: number[]) => (b.length ? b.join(" and ").replace(/ and (?=.* and )/g, ", ") : "nowhere on a beat");

export function Backbeat({ complete, saved, memory }: StepProps) {
  const [pick, setPick] = useState<string | null>((saved as { pick?: string } | undefined)?.pick ?? null);
  const own = (memory["p2/build"] as { loop?: Loop } | undefined)?.loop;
  const ownBeats = own ? snareBeats(own) : [];
  return (
    <div className="col">
      <h2 className="prompt">Which one makes you nod?</h2>
      <Versions
        items={[
          { id: "a", label: "A", loop: backbeatA },
          { id: "b", label: "B", loop: backbeatB },
        ]}
      />
      <Choice
        options={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ]}
        initial={pick ?? undefined}
        onResult={(id) => {
          setPick(id);
          complete({ pick: id });
        }}
      />
      {pick && (
        <div className="col fade-in" style={{ gap: 18 }}>
          <p className="sub">
            {pick === "b" ? "B." : "Most heads nod to B."} The snare on 2 and 4 is the <strong>backbeat</strong>. In A, kick and snare swapped places.
          </p>
          <div className="pair">
            <div className="col" style={{ gap: 6 }}>
              <span className="label">A</span>
              <StepGrid loop={backbeatA} lanes={[L.kick, L.snare]} width={420} />
            </div>
            <div className="col" style={{ gap: 6 }}>
              <span className="label">B</span>
              <StepGrid loop={backbeatB} lanes={[L.kick, L.snare]} width={420} />
            </div>
          </div>
          {own && (
            <p className="sub">
              Your beat from before: snare on {beatsText(ownBeats)}
              {ownBeats.length === 2 && ownBeats[0] === 2 && ownBeats[1] === 4 ? ". A backbeat already." : "."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Rebuild({
  complete,
  saved,
  target,
  start,
  lanes,
  editable,
  prompt = "Listen. Build the same beat.",
  onCheck,
}: StepProps & {
  target: Loop;
  start: Loop;
  lanes: typeof L.kick[];
  editable: string[];
  prompt?: string;
  onCheck?: (solved: boolean, attempts: number) => void;
}) {
  const [loop, setLoop] = useState<Loop>(saved ? target : start);
  const [attempts, setAttempts] = useState(0);
  const [misses, setMisses] = useState<Miss[] | null>(saved ? [] : null);
  const solved = misses !== null && misses.length === 0;
  return (
    <div className="col">
      <h2 className="prompt">{prompt}</h2>
      <Listen loop={target} label="The beat" />
      <Studio
        loop={loop}
        onChange={(l) => {
          if (solved) return;
          setLoop(l);
          setMisses(null);
        }}
        lanes={lanes.map((l) => (editable.includes(l.id) ? l : fixed(l)))}
        misses={attempts >= 2 && misses ? misses : undefined}
      />
      {!solved && (
        <button
          className="btn"
          onClick={() => {
            const m = gridDiff(target, loop, editable);
            const n = attempts + 1;
            setAttempts(n);
            setMisses(m);
            onCheck?.(m.length === 0, n);
            if (m.length === 0) complete({ attempts: n });
          }}
        >
          Check
        </button>
      )}
      <Verdict ok={misses === null ? null : solved}>
        {misses !== null && (solved ? "Same beat." : `${misses.length} ${misses.length === 1 ? "cell" : "cells"} off.${attempts >= 2 ? " Marked in red." : ""}`)}
      </Verdict>
    </div>
  );
}

export function RebuildBoomBap(p: StepProps) {
  return <Rebuild {...p} target={rebuildTarget} start={rebuildStart} lanes={[L.kick, L.snare, L.hat]} editable={["kick", "snare"]} />;
}
