import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import type { Loop } from "../../music/model";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { Studio } from "../../ui/Studio";
import { hasFill } from "../../music/checks";
import { Verdict } from "./common";
import { L, eightBars, fillStart, fixed, with808 } from "./loops";

export function FindTheFill({ complete, saved }: StepProps) {
  const t = usePlayer(eightBars);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(!!saved);
  const bar = t.step != null ? Math.floor(t.step / 16) : null;
  return (
    <div className="col">
      <h2 className="prompt">Something happens once in eight bars. Where?</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <div className="bars8">
        {Array.from({ length: 8 }, (_, i) => (
          <button
            key={i}
            className={`barbox ${bar === i ? "live" : ""} ${wrong.includes(i) ? "wrong" : ""} ${solved && i === 7 ? "right" : ""}`}
            disabled={solved}
            onClick={() => {
              if (i === 7) {
                setSolved(true);
                complete({ attempts: wrong.length + 1 });
              } else setWrong((w) => [...w, i]);
            }}
          >
            <span className="mono">{i + 1}</span>
          </button>
        ))}
      </div>
      <Verdict ok={solved ? true : wrong.length ? false : null}>
        {solved ? "Bar 8. A fill: the drums announce that a new round is coming." : wrong.length ? "Not there. Count the bars as they light up." : ""}
      </Verdict>
      {solved && <p className="sub fade-in">Music counts in phrases of 4 and 8 bars. Most changes in a song land on those borders.</p>}
    </div>
  );
}

export function WriteAFill({ complete, saved }: StepProps) {
  const [loop, setLoop] = useState<Loop>((saved as { loop?: Loop } | undefined)?.loop ?? fillStart);
  const ok = hasFill(loop);
  useEffect(() => {
    if (ok) complete({ loop });
  }, [ok, loop, complete]);
  return (
    <div className="col">
      <h2 className="prompt">Write a fill at the end of bar 4.</h2>
      <Studio loop={loop} onChange={setLoop} lanes={[L.kick, L.snare, fixed(L.hat), L.tomHigh, L.tomLow]} bars initialBar={3} />
      <Verdict ok={ok || null}>{ok && "That's a fill. Let it run into bar 1 and hear the reset."}</Verdict>
    </div>
  );
}

const FITS = [28, 33, 36];

export function Tune808({ complete, saved }: StepProps) {
  const [pitch, setPitch] = useState(saved ? 33 : 30);
  const [state, setState] = useState<"fit" | "off" | null>(saved ? "fit" : null);
  const loop = with808(pitch);
  const t = usePlayer(loop);
  return (
    <div className="col">
      <h2 className="prompt">Tune the 808 until it sits with the chord.</h2>
      <div className="panel" style={{ width: 640 }}>
        <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
        <label className="field" style={{ width: "100%" }}>
          <span>low</span>
          <input
            type="range"
            min={28}
            max={39}
            value={pitch}
            aria-label="808 pitch"
            onChange={(e) => {
              setPitch(Number(e.target.value));
              if (state !== "fit") setState(null);
            }}
            style={{ width: "100%" }}
            disabled={state === "fit"}
          />
          <span>high</span>
        </label>
      </div>
      {state !== "fit" && (
        <button
          className="btn"
          onClick={() => {
            const fit = FITS.includes(pitch);
            setState(fit ? "fit" : "off");
            if (fit) complete({ pitch });
          }}
        >
          Check
        </button>
      )}
      <Verdict ok={state === null ? null : state === "fit"}>
        {state === "fit" && "It sits."}
        {state === "off" && "It rubs against the chord. Keep turning."}
      </Verdict>
      {state === "fit" && (
        <div className="cliff fade-in">
          <p className="prompt">Some notes fit. Others don't. Why?</p>
          <div className="cliff-next">
            <span className="mono">02</span> Keys I: Notes & Scales
          </div>
        </div>
      )}
    </div>
  );
}
