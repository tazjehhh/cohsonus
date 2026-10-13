import { useState } from "react";
import type { StepProps } from "../types";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { Choice } from "../../ui/Choice";
import { Explain } from "../../ui/Explain";
import { TapPad, Verdict, Versions } from "./common";
import { Rebuild } from "./p2";
import { L, refreshStart, refreshStraight, refreshSwung, refreshTap, refreshTarget } from "./loops";

export function RefreshTap({ complete }: StepProps) {
  const t = usePlayer(refreshTap);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="col">
      <h2 className="prompt">Tap along with the pulse of this track.</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <TapPad
        playing={t.playing}
        actual={refreshTap.bpm}
        onResult={(r, n) => {
          if (done) return;
          if (r.rel !== "off" || n >= 12) {
            setDone(r.rel !== "off" ? `You tapped ${Math.round(r.bpm)} BPM; the track runs at ${refreshTap.bpm} BPM.` : `The track runs at ${refreshTap.bpm} BPM.`);
            complete({ pass: r.rel !== "off" });
          }
        }}
      />
      <Verdict ok={done ? true : null}>{done}</Verdict>
      {done && (
        <Explain>
          <p>
            <strong>Tempo</strong> is the speed of the beat, measured in beats per minute (BPM). At {refreshTap.bpm} BPM a new beat arrives every {(60 / refreshTap.bpm).toFixed(2)} seconds (60 ÷{" "}
            {refreshTap.bpm}). Tapping every second beat ({refreshTap.bpm / 2} BPM) or twice per beat ({refreshTap.bpm * 2} BPM) follows the same pulse, counted
            more slowly or more quickly.
          </p>
        </Explain>
      )}
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
      prompt="Listen to the beat and rebuild its kick and snare by ear."
      target={refreshTarget}
      start={refreshStart}
      lanes={[L.kick, L.snare, L.hat]}
      editable={["kick", "snare"]}
      explain={
        <p>
          The snare plays the <strong>backbeat</strong> on beats 2 and 4, and the hi-hat keeps steady eighth notes. The kick plays on 1 and then three times
          between the beats, on &ldquo;1&nbsp;a&rdquo;, &ldquo;2&nbsp;&amp;&rdquo; and &ldquo;3&nbsp;&amp;&rdquo;. Kicks placed between the beats like these are{" "}
          <strong>syncopated</strong>.
        </p>
      }
    />
  );
}

const SWING_PCT = Math.round((refreshSwung.swing ?? 0.5) * 100);

export function RefreshSwing({ complete }: StepProps) {
  const [solved, setSolved] = useState(false);
  return (
    <div className="col">
      <h2 className="prompt">Which of the two versions swings?</h2>
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
        wrongText="Not that one. Listen to the spacing of the hi-hats."
        onResult={(_, attempts) => {
          setSolved(true);
          complete({ pass: attempts === 1 });
        }}
      />
      {solved && (
        <Explain>
          <p>
            Version A <strong>swings</strong>: every second sixteenth note arrives late, here with a swing setting of {SWING_PCT}%. Version B is{" "}
            <strong>straight</strong>, with all sixteenth notes evenly spaced, which corresponds to a setting of 50%.
          </p>
        </Explain>
      )}
    </div>
  );
}
