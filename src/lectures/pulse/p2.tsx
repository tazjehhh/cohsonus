import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import type { Loop } from "../../music/model";
import { Studio } from "../../ui/Studio";
import { StepGrid } from "../../ui/StepGrid";
import { Choice } from "../../ui/Choice";
import { gridDiff, snareBeats, type Miss } from "../../music/checks";
import { stepsOf } from "../../music/model";
import { Listen, Verdict, Versions } from "./common";
import { Explain } from "../../ui/Explain";
import type { ReactNode } from "react";
import { L, backbeatA, backbeatB, fixed, kickSnareEmpty, rebuildStart, rebuildTarget } from "./loops";

export function NodBuild({ complete, saved }: StepProps) {
  const [loop, setLoop] = useState<Loop>((saved as { loop?: Loop } | undefined)?.loop ?? kickSnareEmpty);
  const ready = stepsOf(loop, "kick").length > 0 && stepsOf(loop, "snare").length > 0;
  useEffect(() => {
    if (ready) complete({ loop });
  }, [ready, loop, complete]);
  return (
    <div className="col">
      <h2 className="prompt">Build a beat with the kick and the snare that you can nod your head to.</h2>
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
      <h2 className="prompt">Which of the two versions makes you nod your head?</h2>
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
          <Verdict ok={pick === "b"}>{pick === "b" ? "Most listeners choose B as well." : "Most listeners choose B."}</Verdict>
          <Explain>
            <p>
              In version B the snare drum plays on beats 2 and 4. An accent on these two beats is called the <strong>backbeat</strong>. It answers the kick drum on 1
              and 3, and the alternation of low kick and sharp snare gives the head a down and an up to move to.
            </p>
            <p>
              In version A the kick and the snare have swapped places, so the snare falls on 1 and 3 and the bar feels stiff, like a march. The bass and the chords
              are the same in both versions; they start on beat 1 and mark where each bar begins.
            </p>
            <p>
              The backbeat became the standard of popular music with rhythm and blues and rock and roll in the 1950s; the New Orleans drummer Earl Palmer is often
              credited with establishing it on record. In house music a hand clap usually takes the role of the snare.
            </p>
          </Explain>
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
              In the beat you built before, the snare is on {beatsText(ownBeats)}
              {ownBeats.length === 2 && ownBeats[0] === 2 && ownBeats[1] === 4 ? ", which is already a backbeat." : "."}
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
  prompt = "Listen to the beat, then build the same pattern in the grid.",
  onCheck,
  explain,
}: StepProps & {
  target: Loop;
  start: Loop;
  lanes: typeof L.kick[];
  editable: string[];
  prompt?: string;
  onCheck?: (solved: boolean, attempts: number) => void;
  /** Written explanation shown once the pattern matches. */
  explain?: ReactNode;
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
        {misses !== null &&
          (solved
            ? "Correct. Your pattern matches the beat."
            : `Not yet: ${misses.length} ${misses.length === 1 ? "cell differs" : "cells differ"} from the beat.${attempts >= 2 ? " They are marked in red." : ""}`)}
      </Verdict>
      {solved && explain && <Explain>{explain}</Explain>}
    </div>
  );
}

export function RebuildBoomBap(p: StepProps) {
  return (
    <Rebuild
      {...p}
      target={rebuildTarget}
      start={rebuildStart}
      lanes={[L.kick, L.snare, L.hat]}
      editable={["kick", "snare"]}
      explain={
        <>
          <p>
            This pattern is a <strong>boom bap</strong> beat, the drum style of East Coast hip-hop in the late 1980s and the 1990s. The name imitates its two main
            sounds: the &ldquo;boom&rdquo; of the kick drum and the &ldquo;bap&rdquo; of the snare.
          </p>
          <p>
            The snare keeps the backbeat on 2 and 4. The kick plays on 1 and then moves off the beats, to the halfway points after 2 and after 3. These in-between
            points are counted with &ldquo;and&rdquo;: one and two and three and four and. A kick on &ldquo;and&rdquo; arrives before the listener expects it,
            which gives the beat its push.
          </p>
        </>
      }
    />
  );
}
