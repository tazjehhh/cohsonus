import { useState } from "react";
import type { StepProps } from "../types";
import { Choice } from "../../ui/Choice";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { StepGrid } from "../../ui/StepGrid";
import { DrumStaff } from "../../ui/DrumStaff";
import { Explain } from "../../ui/Explain";
import { Verdict, Versions } from "./common";
import { Rebuild } from "./p2";
import { L, densityA, densityB, densityC, errorLoop, fixed, hats16, hats8, openStart, openTarget, syncPushed, syncQuiz, syncStraight } from "./loops";

export function Faster({ complete, saved }: StepProps) {
  const [solved, setSolved] = useState(!!saved);
  return (
    <div className="col">
      <h2 className="prompt">Which of these three loops is the fastest?</h2>
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
        wrongText="Not that one. Compare only the kick and the snare."
        onResult={(_, attempts) => {
          setSolved(true);
          complete({ attempts });
        }}
      />
      {solved && (
        <>
          <Verdict ok>Correct. All three loops run at 96 BPM.</Verdict>
          <Explain>
            <p>
              The kick and the snare are identical in all three loops, and they set the tempo. Only the hi-hat changes: loop A has none, loop B plays two hi-hat
              notes per beat, and loop C plays four. More notes make a loop sound busier and can make it seem faster, but in every version a new beat arrives every
              0.625 seconds (60 ÷ 96).
            </p>
            <p>
              Dividing each beat into smaller, equal parts is called <strong>subdivision</strong>. The beat stays the same; only the number of notes played inside
              it changes. Drummers and producers often raise the energy of a section this way, for example by doubling the hi-hat in a chorus while the tempo
              stays fixed.
            </p>
          </Explain>
        </>
      )}
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
      <h2 className="prompt">
        Count {res === 8 ? "“1\u00a0&\u00a02\u00a0&\u00a03\u00a0&\u00a04\u00a0&”" : "“1\u00a0e\u00a0&\u00a0a\u00a02\u00a0e\u00a0&\u00a0a\u00a03\u00a0e\u00a0&\u00a0a\u00a04\u00a0e\u00a0&\u00a0a”"} out loud along
        with the hi-hat.
      </h2>
      <div className="segbar" role="tablist">
        <button role="tab" aria-selected={res === 8} className={res === 8 ? "on" : ""} onClick={() => pick(8)}>
          Two per beat
        </button>
        <button role="tab" aria-selected={res === 16} className={res === 16 ? "on" : ""} onClick={() => pick(16)}>
          Four per beat
        </button>
      </div>
      <div className="panel">
        <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} stepsPerBeat={loop.stepsPerBeat} />
        <StepGrid loop={loop} lanes={[L.kick, L.snare, L.hat]} step={t.step} />
        <DrumStaff loop={loop} laneIds={["kick", "snare", "hat"]} step={t.step} />
      </div>
      {seen.size === 2 && (
        <Explain>
          <p>
            In 4/4 time each beat is a <strong>quarter note</strong>, because four of them fill a bar. Splitting every beat in two gives{" "}
            <strong>eighth notes</strong>, eight to a bar, counted &ldquo;1&nbsp;&amp;&nbsp;2&nbsp;&amp;&nbsp;3&nbsp;&amp;&nbsp;4&nbsp;&amp;&rdquo; (one and two and three and four and). Splitting every beat in four
            gives <strong>sixteenth notes</strong>, sixteen to a bar, counted &ldquo;1&nbsp;e&nbsp;&amp;&nbsp;a&nbsp;2&nbsp;e&nbsp;&amp;&nbsp;a&rdquo; and so on (one ee and uh, two ee and uh).
          </p>
          <p>
            At 96 BPM a beat lasts 0.625 seconds, so an eighth note lasts about 0.31 seconds and a sixteenth note about 0.16 seconds. The grid has one column per
            subdivision: 8 columns in the bar of eighths and 16 in the bar of sixteenths. In the staff, the eighth notes within a beat are joined by one beam and
            the sixteenth notes by two.
          </p>
          <p>
            The hi-hat usually plays the subdivision while the kick and the snare mark the beats. Eighth-note hi-hats are common in rock and pop; sixteenth-note
            hi-hats drive much of funk, disco and hip-hop.
          </p>
        </Explain>
      )}
    </div>
  );
}

export function OpenHat(p: StepProps) {
  return (
    <Rebuild
      {...p}
      prompt="Listen to the beat, then place the open hi-hat where you hear it."
      target={openTarget}
      start={openStart}
      lanes={[L.kick, L.clap, L.open]}
      editable={["open"]}
      explain={
        <>
          <p>
            A hi-hat is a pair of cymbals on a stand with a foot pedal. Struck while the pedal holds the cymbals together, it gives a short tick, called a{" "}
            <strong>closed hi-hat</strong>. Struck with the pedal released, the cymbals ring freely and give a long hiss, called an <strong>open hi-hat</strong>.
          </p>
          <p>
            In this beat the open hi-hat plays on every <strong>offbeat</strong>, the &ldquo;&amp;&rdquo; exactly halfway between two beats. The kick plays on every
            beat and the clap on 2 and 4, so low and high sounds alternate, with the kick on each beat and the open hat between the beats.
          </p>
          <p>
            Four on the floor with an open hi-hat on every offbeat is the standard groove of disco and house. The Philadelphia drummer Earl Young, who played on
            many disco records of the 1970s, is often credited with popularizing it.
          </p>
        </>
      }
    />
  );
}

export function SpotTheHat({ complete, saved }: StepProps) {
  const t = usePlayer(errorLoop);
  const [solved, setSolved] = useState(!!saved);
  return (
    <div className="col">
      <h2 className="prompt">On which beat does one hi-hat land in the wrong place?</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <Choice
        options={[1, 2, 3, 4].map((b) => ({ id: String(b), label: <span className="mono">{b}</span> }))}
        correct="3"
        initial={solved ? "3" : undefined}
        wrongText="Not that one. The hi-hats on that beat are in place."
        onResult={(_, attempts) => {
          setSolved(true);
          complete({ attempts });
        }}
      />
      {solved && (
        <>
          <div className="panel fade-in">
            <StepGrid loop={errorLoop} lanes={[L.kick, L.snare, L.hat]} step={t.step} misses={[{ lane: "hat", step: 11 }]} />
          </div>
          <Explain>
            <p>
              The hi-hat that belongs on &ldquo;3&nbsp;&amp;&rdquo; plays on &ldquo;3&nbsp;a&rdquo; instead, one sixteenth note late. At 100 BPM that is a delay of 0.15
              seconds. The grid outlines the misplaced hit in red.
            </p>
            <p>
              Each beat holds four sixteenth-note positions, counted &ldquo;3&nbsp;e&nbsp;&amp;&nbsp;a&rdquo; for beat 3. A steady eighth-note hi-hat plays on the number and on the
              &ldquo;&amp;&rdquo; and leaves the &ldquo;e&rdquo; and the &ldquo;a&rdquo; empty. Because the pattern repeats, the ear expects every hit in its place,
              and a single note moved by one sixteenth is heard as a stumble even though the kick and the snare are correct.
            </p>
          </Explain>
        </>
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
      <h2 className="prompt">Switch between the two versions and listen to where the second kick lands.</h2>
      <div className="segbar" role="tablist">
        {[
          ["s", "On beat 3", false],
          ["p", "On “2\u00a0&”", true],
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
          <Explain>
            <p>
              <strong>Syncopation</strong> is the placement of a note or an accent where the listener does not expect it, usually between the beats instead of on
              them. In the first version the second kick falls on beat 3, a strong beat. In the second it arrives on &ldquo;2&nbsp;&amp;&rdquo;, half a beat early, and
              beat 3 stays empty.
            </p>
            <p>
              The early kick creates a small tension that resolves on the next snare, and the groove seems to lean forward. A note played just before a strong
              beat in this way is also called an <strong>anticipation</strong> or a <strong>push</strong>. Syncopation is a defining feature of funk, as on James
              Brown&apos;s records of the late 1960s, and of the hip-hop beats that sampled them.
            </p>
          </Explain>
          <h3 className="prompt small">Which kick in the pattern below falls between the beats?</h3>
          <StepGrid loop={syncQuiz} lanes={[L.kick, L.snare]} width={640} />
          <Choice
            options={[
              { id: "1", label: "1" },
              { id: "3", label: "3" },
              { id: "3a", label: "3 a" },
            ]}
            correct="3a"
            initial={solved ? "3a" : undefined}
            wrongText="Not that one. That kick falls on a beat."
            onResult={(_, attempts) => {
              setSolved(true);
              complete({ attempts });
            }}
          />
          {solved && <Verdict ok>Correct. The kick on &ldquo;3&nbsp;a&rdquo; comes one sixteenth note before beat 4.</Verdict>}
        </div>
      )}
    </div>
  );
}
