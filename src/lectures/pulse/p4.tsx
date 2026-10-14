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
import { Explain } from "../../ui/Explain";
import { quantize } from "../../music/timing";
import { Listen, TapPad, Verdict, Versions, type TapResult } from "./common";
import { L, accentHats, fixed, flatHats, ghostOff, ghostOn, human, machine, metronome, swingStart, swingTarget, swung, trap140 } from "./loops";

export function ThreeVersions({ complete, saved }: StepProps) {
  const prev = saved as { best?: string } | undefined;
  const [best, setBest] = useState<string | null>(prev?.best ?? null);
  const [solved, setSolved] = useState(!!saved);
  return (
    <div className="col">
      <h2 className="prompt">{best ? "Which version is a machine playing every note exactly on the grid?" : "Which of the three versions feels best to you?"}</h2>
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
          wrongText="Not that one. That version is not exactly on the grid."
          onResult={(_, attempts) => {
            setSolved(true);
            complete({ best, attempts });
          }}
        />
      )}
      {solved && (
        <>
          <Verdict ok>Correct. Version B is the machine.</Verdict>
          <Explain>
            <p>
              {best === "b" ? "You preferred version B, the one played exactly on the grid." : `You preferred version ${best?.toUpperCase()}, which is not exactly on the grid.`}{" "}
              All three versions play the same kick, snare and hi-hat pattern at 90 BPM; only the timing and the loudness of the notes differ.
            </p>
            <p>
              In version B every note falls exactly on the grid and every hi-hat is equally loud. In version A every second sixteenth note arrives late, a feel
              called <strong>swing</strong>. In version C each note is moved early or late by up to about 17 milliseconds and played a little louder or softer, the
              way a drummer&apos;s hands vary from hit to hit.
            </p>
            <p>
              <strong>Groove</strong> is the quality of a rhythm that makes listeners want to move with it. It depends on the pattern and also on small differences
              in timing and loudness like these, which listeners feel rather than hear as mistakes. Exact grid timing is also a deliberate choice; much house and
              techno is built that way.
            </p>
          </Explain>
        </>
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
      <h2 className="prompt">Set the swing so that your loop matches the groove.</h2>
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
        {checked === "ok" && `Correct. The groove has ${Math.round(target * 100)}% swing.`}
        {checked === "low" && "Not yet. Your loop is straighter than the groove."}
        {checked === "high" && "Not yet. Your loop swings more than the groove."}
      </Verdict>
      {checked === "ok" && (
        <Explain>
          <p>
            Swing is set as a percentage that describes how a pair of sixteenth notes shares the length of one eighth note. At 50% both notes are equally long and
            the rhythm is <strong>straight</strong>. At {Math.round(target * 100)}%, as in this groove, the first note of each pair takes {Math.round(target * 100)}%
            of the time and the second note arrives correspondingly late.
          </p>
          <p>
            At 92 BPM an eighth note lasts 0.33 seconds (60 ÷ 92 ÷ 2), so {Math.round(target * 100)}% swing delays every second sixteenth note by about 39
            milliseconds. The kick and the snare on the beats do not move; only the notes between them shift. Drum machines and DAWs offer the same control,
            usually under the name swing or shuffle.
          </p>
        </Explain>
      )}
    </div>
  );
}

export function Velocity({ complete, saved }: StepProps) {
  const [solved, setSolved] = useState(!!saved);
  const [loop, setLoop] = useState<Loop>(accentHats);
  return (
    <div className="col">
      <h2 className="prompt">Which of the two versions sounds more like a person playing?</h2>
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
        wrongText="Not that one. Listen only to the hi-hats."
        onResult={(_, attempts) => {
          setSolved(true);
          complete({ attempts });
        }}
      />
      {solved && (
        <div className="col fade-in">
          <Verdict ok>Correct. Version B sounds played by hand.</Verdict>
          <Explain>
            <p>
              <strong>Velocity</strong> is the strength with which a note is played. The term comes from <strong>MIDI</strong> (Musical Instrument Digital
              Interface), the 1983 standard that lets electronic instruments and computers exchange notes. MIDI records how fast a key or pad was struck, on a scale
              from 1 to 127, and a higher velocity plays a louder and usually brighter sound.
            </p>
            <p>
              In version A every hi-hat has the same velocity. In version B the first beat of the bar is the loudest, the other beats are a little softer, the
              &ldquo;&amp;&rdquo; is at about half strength and the &ldquo;e&rdquo; and the &ldquo;a&rdquo; are very soft. A note played louder than the notes
              around it is an <strong>accent</strong>. Drummers rarely strike two notes with exactly the same force, so a row of equal velocities sounds mechanical.
            </p>
          </Explain>
          <h3 className="prompt small">Drag the hi-hat velocity bars up and down and listen to the change.</h3>
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
      <h2 className="prompt">Turn the quiet snare notes off, then turn them back on.</h2>
      <div className="segbar" role="tablist">
        <button role="tab" aria-selected={on} className={on ? "on" : ""} onClick={() => !on && (setOn(true), setFlips((f) => f + 1))}>
          Quiet notes on
        </button>
        <button role="tab" aria-selected={!on} className={!on ? "on" : ""} onClick={() => on && (setOn(false), setFlips((f) => f + 1))}>
          Off
        </button>
      </div>
      <div className="panel">
        <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
        <StepGrid loop={loop} lanes={[L.kick, L.snare, L.hat]} step={t.step} velocity />
      </div>
      {flips >= 2 && (
        <Explain>
          <p>
            <strong>Ghost notes</strong> are very soft notes played between the main hits, usually on the snare drum. They are felt more than heard: they fill the
            space around the backbeat and keep the groove in constant motion.
          </p>
          <p>
            In this beat the snare plays the backbeat on 2 and 4 and ghost notes on &ldquo;2&nbsp;a&rdquo;, &ldquo;3&nbsp;e&rdquo; and &ldquo;4&nbsp;a&rdquo;, at about a
            quarter of the backbeat&apos;s velocity. Without them the pattern still works, but it sounds
            stiffer and emptier.
          </p>
          <p>
            Ghost notes are central to funk, soul and R&amp;B drumming. Jeff Porcaro&apos;s shuffle on Toto&apos;s Rosanna (1982) is a well-known example, with
            ghost notes on the snare between the hi-hat strokes.
          </p>
        </Explain>
      )}
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
      <h2 className="prompt">Record two bars of kick and snare by playing them on the keyboard.</h2>
      <p className="sub">
        Press <kbd>F</kbd> for the kick and <kbd>J</kbd> for the snare. Recording begins when the loop returns to bar 1 and lasts two bars.
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
      {ready && (
        <Explain>
          <p>
            <strong>Quantization</strong> (also called <strong>quantizing</strong>) moves recorded notes toward the nearest position on the grid. The amount, often
            called the <strong>strength</strong>, sets how far each note moves: at 0% the notes stay where you played them, at 50% each note moves halfway to the
            grid, and at 100% every note sits exactly on it.
          </p>
          <p>
            As the amount rises, the dots in the timeline slide onto the sixteenth-note lines. At 100% your recording has machine timing, and the small
            differences that made it sound played by hand are gone.
          </p>
          <p>
            Quantizing became a standard feature of drum machines and sequencers in the 1980s. Many producers use a partial amount, which corrects large mistakes
            and keeps part of the human feel.
          </p>
        </Explain>
      )}
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
      <h2 className="prompt">Tap along with this beat.</h2>
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
        {res && (res.rel === "half" ? "You tapped at about 70 BPM." : res.rel === "same" ? "You tapped at about 140 BPM." : `You tapped at ${Math.round(res.bpm)} BPM.`)}
      </Verdict>
      {res && (
        <Explain>
          <p>
            The track runs at 140 BPM, yet many listeners nod at about 70. The snare plays only once per bar, on beat 3, instead of on 2 and 4. This feel is called{" "}
            <strong>half-time</strong>. With the backbeat moved to beat 3, the groove feels half as fast as the tempo, while the hi-hats keep the faster pulse of
            140 BPM going.
          </p>
          <p>
            The quick run of hi-hat notes at the end of the bar is a <strong>hi-hat roll</strong>. Half-time drums with hi-hat rolls and long 808 bass notes are
            the basis of <strong>trap</strong>, a style of hip-hop that developed in Atlanta in the 2000s. Dubstep, which usually runs at about 140 BPM with the
            snare on beat 3, uses the same feel.
          </p>
        </Explain>
      )}
    </div>
  );
}
