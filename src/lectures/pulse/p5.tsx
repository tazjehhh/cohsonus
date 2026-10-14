import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import type { Loop } from "../../music/model";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { Studio } from "../../ui/Studio";
import { hasFill } from "../../music/checks";
import { Explain } from "../../ui/Explain";
import { Verdict } from "./common";
import { L, eightBars, fillStart, fixed, with808 } from "./loops";

export function FindTheFill({ complete, saved }: StepProps) {
  const t = usePlayer(eightBars);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(!!saved);
  const bar = t.step != null ? Math.floor(t.step / 16) : null;
  return (
    <div className="col">
      <h2 className="prompt">In which of the eight bars does something different happen?</h2>
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
        {solved ? "Correct. It happens in bar 8." : wrong.length ? "Not yet. That bar plays the same pattern as the others." : ""}
      </Verdict>
      {solved && (
        <Explain>
          <p>
            In bar 8 the drums play a <strong>fill</strong>, a short break from the main pattern that leads into the next section. The hi-hat stops after beat 2,
            the snare plays four sixteenth notes on beat 3, and the <strong>toms</strong> (drums without snare wires, tuned from high to low) finish the bar on
            beat 4. When the loop starts over, a <strong>crash cymbal</strong>, a large cymbal with a loud, bursting sound, marks the first beat of bar 1.
          </p>
          <p>
            A <strong>phrase</strong> is a group of bars that forms a musical unit, much like a sentence in speech. In most popular and dance music, phrases are 4,
            8 or 16 bars long, and new sections such as a verse or a chorus begin on the first bar of a phrase. A fill in the last bar of a phrase signals that
            something new is about to begin. DJs count phrases in the same way, so that they can bring in the next record exactly where a new section starts.
          </p>
        </Explain>
      )}
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
      <h2 className="prompt">Write a drum fill on the last beat of bar 4.</h2>
      <Studio loop={loop} onChange={setLoop} lanes={[L.kick, L.snare, fixed(L.hat), L.tomHigh, L.tomLow]} bars initialBar={3} />
      <Verdict ok={ok || null}>{ok && "Correct. Bar 4 now ends with a fill."}</Verdict>
      {ok && (
        <Explain>
          <p>
            Most fills take up the last beat or the last two beats of a phrase, so the main pattern carries the bar until the fill takes over. Drummers often move
            from the snare to the high tom and then to the low tom, so the pitch falls as the fill approaches the next downbeat.
          </p>
          <p>
            A fill ends on beat 1 of the next phrase, usually with the kick and a crash cymbal together. Here the crash already sits on the first beat of bar 1, so
            each time the loop starts over, your fill leads straight into it.
          </p>
        </Explain>
      )}
    </div>
  );
}

const FITS = [28, 33, 36];
const FIT_NAMES: Record<number, string> = { 28: "E1 (41 Hz)", 33: "A1 (55 Hz)", 36: "C2 (65 Hz)" };

export function Tune808({ complete, saved }: StepProps) {
  const [pitch, setPitch] = useState(saved ? 33 : 30);
  const [state, setState] = useState<"fit" | "off" | null>(saved ? "fit" : null);
  const loop = with808(pitch);
  const t = usePlayer(loop);
  return (
    <div className="col">
      <h2 className="prompt">Tune the 808 until it fits the chord.</h2>
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
        {state === "fit" && "Correct. The 808 now fits the chord."}
        {state === "off" && "Not yet. This note clashes with the chord."}
      </Verdict>
      {state === "fit" && (
        <Explain>
          <p>
            The <strong>808</strong> is the bass drum of the Roland TR-808, a drum machine released in 1980. Its long, deep boom has a clear pitch, so producers
            stretch it into long notes and play it as a bass line as well as a kick. In this loop it plays on beat 1 and on &ldquo;3&nbsp;&amp;&rdquo; of each bar.
          </p>
          <p>
            <strong>Tuning</strong> the 808 means choosing which note it plays. Of the twelve notes in an octave, three fit this chord: E1, A1 and C2.
            You chose {FIT_NAMES[pitch]}. The other nine notes clash with the chord.
          </p>
          <p>
            Long, tuned 808 notes became the main bass sound of Miami bass in the 1980s and later of Southern hip-hop and trap. Because an 808 note can last a beat or
            longer, it has to match the chords like any other bass instrument.
          </p>
        </Explain>
      )}
      {state === "fit" && (
        <div className="cliff fade-in">
          <p className="prompt">Why do some notes fit the chord while others clash?</p>
          <div className="cliff-next">
            <span className="mono">02</span> Keys I: Notes & Scales
          </div>
        </div>
      )}
    </div>
  );
}
