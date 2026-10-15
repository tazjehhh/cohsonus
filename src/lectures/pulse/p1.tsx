import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { BeatCircle } from "../../ui/BeatCircle";
import { Studio } from "../../ui/Studio";
import { useKeys } from "../../ui/taps";
import { cycleDistance, meanPhase } from "../../music/timing";
import { stepsOf } from "../../music/model";
import { Listen, TapPad, Verdict, type TapResult } from "./common";
import { Explain } from "../../ui/Explain";
import { L, TEMPO_LOOPS, findOne, fourFloorStart, house124 } from "./loops";

export function TapAlong({ complete, saved }: StepProps) {
  const t = usePlayer(house124);
  const [res, setRes] = useState<TapResult | null>((saved as TapResult) ?? null);
  const [count, setCount] = useState(0);
  const ok = res && res.rel !== "off";
  return (
    <div className="col">
      <h2 className="prompt">Press play, nod along, and tap in time with the beat.</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <TapPad
        playing={t.playing}
        actual={house124.bpm}
        onResult={(r, n) => {
          setCount(n);
          if (ok) return;
          setRes(r);
          if (r.rel !== "off" || n >= 16) complete(r);
        }}
      />
      <Verdict ok={res ? res.rel !== "off" : null}>
        {res?.rel === "same" && <>You tapped at the tempo of the track: 124 BPM.</>}
        {res?.rel === "half" && <>You tapped on every second beat, which comes to 62 BPM.</>}
        {res?.rel === "double" && <>You tapped twice for every beat, which comes to 248 BPM.</>}
        {res?.rel === "off" && count < 16 && <>The taps are not steady yet. Keep going, and let the movement of your head set the timing.</>}
        {res?.rel === "off" && count >= 16 && <>The track runs at 124 BPM.</>}
      </Verdict>
      {res && (res.rel !== "off" || count >= 16) && (
        <Explain>
          <p>
            <strong>Tempo</strong> is the speed of the beat. It is measured in <strong>beats per minute (BPM)</strong>: the number of beats that fall within one
            minute. At 124 BPM a new beat arrives about every half second (60 ÷ 124 = 0.48 seconds).
          </p>
          {res.rel === "half" && (
            <p>
              Counting every second beat is a common way to follow a track, and it halves the number. By convention the tempo of a track is given for the beat that
              the drums mark most clearly; here that is the kick drum, which plays on every beat.
            </p>
          )}
          {res.rel === "double" && (
            <p>
              Tapping twice for every beat doubles the number. By convention the tempo of a track is given for the beat that the drums mark most clearly; here that
              is the kick drum, which plays on every beat.
            </p>
          )}
        </Explain>
      )}
    </div>
  );
}

const SORT_START = ["techno", "boombap", "house", "indie"];

export function TempoSort({ complete, saved }: StepProps) {
  const [order, setOrder] = useState<string[]>(saved ? [...TEMPO_LOOPS].sort((a, b) => a.loop.bpm - b.loop.bpm).map((x) => x.id) : SORT_START);
  const [checked, setChecked] = useState(!!saved);
  const correct = [...TEMPO_LOOPS].sort((a, b) => a.loop.bpm - b.loop.bpm).map((x) => x.id);
  const placed = order.filter((id, i) => correct[i] === id).length;
  const solved = checked && placed === order.length;
  const letter = (id: string) => "ABCD"[SORT_START.indexOf(id)];
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const n = [...order];
    [n[i], n[j]] = [n[j], n[i]];
    setOrder(n);
    setChecked(false);
  };
  return (
    <div className="col">
      <h2 className="prompt">Put the four loops in order from slowest to fastest.</h2>
      <div className="sortrow">
        <span className="label">slow</span>
        {order.map((id, i) => {
          const item = TEMPO_LOOPS.find((x) => x.id === id)!;
          return <SortCard key={id} letter={letter(id)} item={item} revealed={solved} onLeft={() => move(i, -1)} onRight={() => move(i, 1)} first={i === 0} last={i === order.length - 1} />;
        })}
        <span className="label">fast</span>
      </div>
      {!solved && (
        <button
          className="btn"
          onClick={() => {
            setChecked(true);
            if (placed === order.length) complete();
          }}
        >
          Check
        </button>
      )}
      <Verdict ok={checked ? solved : null}>{checked && (solved ? "Correct." : `${placed} of the four loops ${placed === 1 ? "is" : "are"} in the right place.`)}</Verdict>
      {solved && (
        <Explain>
          <p>
            The four loops run at 88, 112, 124 and 136 BPM. Each genre tends to keep to a typical tempo, and these loops sit near the usual tempo of their genres:
            boom bap, indie rock, house and techno.
          </p>
        </Explain>
      )}
    </div>
  );
}

function SortCard({
  letter,
  item,
  revealed,
  onLeft,
  onRight,
  first,
  last,
}: {
  letter: string;
  item: (typeof TEMPO_LOOPS)[number];
  revealed: boolean;
  onLeft: () => void;
  onRight: () => void;
  first: boolean;
  last: boolean;
}) {
  const t = usePlayer(item.loop);
  return (
    <div className="sortcard">
      <div className="mono sortletter">{letter}</div>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} size="sm" />
      <div className="sortreveal">
        {revealed ? (
          <span className="fade-in">
            {item.genre}
            <br />
            <span className="mono">{item.loop.bpm} BPM</span>
          </span>
        ) : (
          " "
        )}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn small" onClick={onLeft} disabled={first || revealed} aria-label="Move left">
          ←
        </button>
        <button className="btn small" onClick={onRight} disabled={last || revealed} aria-label="Move right">
          →
        </button>
      </div>
    </div>
  );
}

export function FindTheOne({ complete, saved }: StepProps) {
  const t = usePlayer(findOne);
  const bar = 16;
  const [taps, setTaps] = useState<number[]>([]);
  const [found, setFound] = useState(!!saved);
  const [unrolled, setUnrolled] = useState(!!saved);

  useKeys(
    ["Space"],
    (_, time) => {
      if (!t.playing || found) return;
      const pos = t.player.positionAt(time) % bar;
      const next = [...taps, pos].slice(-6);
      setTaps(next);
      if (next.length >= 3) {
        const recent = next.slice(-3);
        if (recent.every((p) => cycleDistance(p, 0, bar) <= 1.6) || (cycleDistance(meanPhase(recent, bar), 0, bar) <= 1.2 && next.length >= 4)) setFound(true);
      }
    },
    t.playing,
  );

  useEffect(() => {
    if (!found || unrolled) return;
    const id = setTimeout(() => {
      setUnrolled(true);
      complete();
    }, 1600);
    return () => clearTimeout(id);
  }, [found, unrolled, complete]);

  return (
    <div className="col">
      <h2 className="prompt">{unrolled ? "Bars and beats" : "Press play and tap the space bar each time the loop starts over."}</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <BeatCircle player={t.player} playing={t.playing} barSteps={bar} taps={found ? [] : taps.map((p) => p / bar)} numbers={found} unrolled={unrolled} />
      <Verdict ok={found ? true : taps.length >= 6 ? false : null}>
        {found && !unrolled && "Correct. Count from there: 1, 2, 3, 4."}
        {unrolled && "Correct. The loop starts over on the first beat of the bar."}
        {!found && taps.length >= 6 && "Not yet. Listen for the chord: it changes exactly where the loop starts over."}
      </Verdict>
      {unrolled && (
        <Explain>
          <p>
            Beats are grouped into <strong>bars</strong> (also called <strong>measures</strong>). In most popular music a bar holds four beats, which is called{" "}
            <strong>4/4 time</strong>. The first beat of each bar is the <strong>downbeat</strong>, usually called &ldquo;the one&rdquo;.
          </p>
          <p>
            Chords and drum patterns tend to change on the downbeat, which is why the chord change marked the point where the loop started over. The circle and the
            line show the same bar: once around the circle is one bar, and laid flat it reads from left to right, the way music is written down.
          </p>
        </Explain>
      )}
      {!t.playing && !found && (
        <span className="sub">
          <kbd>Space</kbd>
        </span>
      )}
    </div>
  );
}

export function FourOnTheFloor({ complete, saved }: StepProps) {
  const [loop, setLoop] = useState(saved ? { ...fourFloorStart, lanes: [{ ...fourFloorStart.lanes[0], notes: [0, 1, 2, 3].map((s) => ({ step: s })) }] } : fourFloorStart);
  const solved = [0, 1, 2, 3].every((s) => stepsOf(loop, "kick").includes(s));
  useEffect(() => {
    if (solved) complete();
  }, [solved, complete]);
  return (
    <div className="col">
      <h2 className="prompt">Place a kick drum on every beat of the bar.</h2>
      <Studio loop={loop} onChange={setLoop} lanes={[L.kick]} tempo={[70, 160]} />
      <Verdict ok={solved || null}>{solved && "Correct."}</Verdict>
      {solved && (
        <Explain>
          <p>
            A kick drum on every beat of the bar is called <strong>four on the floor</strong>. The name comes from the drum kit: the kick drum is played with a foot
            pedal on the floor, and here it plays all four beats.
          </p>
          <p>
            The pattern drives disco from the 1970s, such as Donna Summer&apos;s I Feel Love (1977), and house and techno from the 1980s onward. House usually
            plays it between 120 and 128 BPM.
          </p>
        </Explain>
      )}
      {solved && <Listen loop={{ ...loop, bpm: 124 }} label="The same pattern at 124 BPM" />}
    </div>
  );
}
