import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import type { Loop } from "../../music/model";
import { Studio } from "../../ui/Studio";
import { hasBackbeat, hasDynamics, hasFill, hasOffbeatKick, hasSteadyHats } from "../../music/checks";
import { Rebuild } from "./p2";
import { L, earStart, earTarget, finalStart } from "./loops";

const RULES: { id: string; text: string; test: (l: Loop) => boolean }[] = [
  { id: "backbeat", text: "Snare on 2 and 4 in every bar", test: hasBackbeat },
  { id: "hats", text: "Hi-hats on every eighth", test: hasSteadyHats },
  { id: "sync", text: "At least one kick off the beat", test: hasOffbeatKick },
  { id: "dyn", text: "Some hits softer than others", test: hasDynamics },
  { id: "fill", text: "A fill at the end of bar 4", test: hasFill },
];

export function YourBeat({ complete, saved }: StepProps) {
  const [loop, setLoop] = useState<Loop>((saved as { loop?: Loop } | undefined)?.loop ?? finalStart);
  const [vel, setVel] = useState(false);
  const status = RULES.map((r) => r.test(loop));
  const all = status.every(Boolean);
  useEffect(() => {
    if (all) complete({ loop });
  }, [all, loop, complete]);
  const copyBar = () => {
    setLoop({
      ...loop,
      lanes: loop.lanes.map((l) => {
        const first = l.notes.filter((n) => n.step < 16);
        return { ...l, notes: [0, 1, 2, 3].flatMap((b) => first.map((n) => ({ ...n, step: n.step + b * 16 }))) };
      }),
    });
  };
  return (
    <div className="col">
      <h2 className="prompt">Four bars. Yours.</h2>
      <div className="final">
        <Studio
          loop={loop}
          onChange={setLoop}
          lanes={[L.kick, L.snare, L.hat, L.open, L.tomHigh, L.tomLow]}
          bars
          tempo={[70, 140]}
          swing
          velocity={vel}
          extra={
            <button className={`btn small ${vel ? "on" : ""}`} onClick={() => setVel(!vel)} aria-pressed={vel}>
              Velocity
            </button>
          }
          barExtra={
            <button className="btn small quiet" onClick={copyBar}>
              Copy bar 1 to all
            </button>
          }
        />
        <ul className="rules">
          {RULES.map((r, i) => (
            <li key={r.id} className={status[i] ? "ok" : ""}>
              <span className="tick" aria-hidden>
                {status[i] ? "✓" : ""}
              </span>
              {r.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function EarTest(p: StepProps) {
  return <Rebuild {...p} prompt="New beat. Build it by ear." target={earTarget} start={earStart} lanes={[L.kick, L.snare, L.hat]} editable={["kick", "snare", "hat"]} />;
}

const POINTS = [
  "Kick and snare take turns: kick on 1 and 3, snare on 2 and 4.",
  "The snare lands on the weaker beats and gives them the accent. That push and pull is the backbeat.",
  "The steady back and forth gives your body a down and an up to follow.",
];

export function ExplainIt({ complete, saved }: StepProps) {
  const prev = saved as { text?: string; had?: boolean[] } | undefined;
  const [text, setText] = useState(prev?.text ?? "");
  const [shown, setShown] = useState(!!prev);
  const [had, setHad] = useState<boolean[]>(prev?.had ?? POINTS.map(() => false));
  return (
    <div className="col" style={{ maxWidth: 680 }}>
      <h2 className="prompt">Why does a snare on 2 and 4 make your head nod?</h2>
      <p className="sub">Explain it to a friend who has never thought about it.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} readOnly={shown} aria-label="Your explanation" />
      {!shown ? (
        <button
          className="btn"
          disabled={text.trim().length < 20}
          onClick={() => {
            setShown(true);
            complete({ text, had });
          }}
        >
          Compare
        </button>
      ) : (
        <ul className="points fade-in">
          {POINTS.map((p, i) => (
            <li key={i}>
              <label>
                <input
                  type="checkbox"
                  checked={had[i]}
                  onChange={() => {
                    const n = had.map((x, j) => (j === i ? !x : x));
                    setHad(n);
                    complete({ text, had: n });
                  }}
                />
                <span>{p}</span>
              </label>
            </li>
          ))}
          <li className="points-foot">Tick what your explanation already said.</li>
        </ul>
      )}
    </div>
  );
}
