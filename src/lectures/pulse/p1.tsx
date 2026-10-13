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
import { L, TEMPO_LOOPS, findOne, fourFloorStart, house124 } from "./loops";

export function TapAlong({ complete, saved }: StepProps) {
  const t = usePlayer(house124);
  const [res, setRes] = useState<TapResult | null>((saved as TapResult) ?? null);
  const [count, setCount] = useState(0);
  const ok = res && res.rel !== "off";
  return (
    <div className="col">
      <h2 className="prompt">Tap along with your head.</h2>
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
        {res?.rel === "same" && <>The track runs at 124 BPM. Beats per minute: the pulse, counted.</>}
        {res?.rel === "half" && <>You tapped every second beat: half of 124. Same pulse, counted slower.</>}
        {res?.rel === "double" && <>You tapped twice per beat: double of 124. Same pulse, counted in between.</>}
        {res?.rel === "off" && count < 16 && <>Keep going. Let your head lead, not your hand.</>}
        {res?.rel === "off" && count >= 16 && <>The track runs at 124 BPM. Try again later with a song you know.</>}
      </Verdict>
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
      <h2 className="prompt">Put them in order, slowest to fastest.</h2>
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
      <Verdict ok={checked ? solved : null}>{checked && (solved ? "Right order." : `${placed} of 4 in the right place.`)}</Verdict>
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
      <h2 className="prompt">{unrolled ? "One bar. Four beats." : "Tap where it starts over."}</h2>
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      <BeatCircle player={t.player} playing={t.playing} barSteps={bar} taps={found ? [] : taps.map((p) => p / bar)} numbers={found} unrolled={unrolled} />
      <Verdict ok={found ? true : taps.length >= 6 ? false : null}>
        {found && !unrolled && "That's the one. Count from there: 1, 2, 3, 4."}
        {unrolled && "A bar: one turn of the circle, laid flat. Count it: 1, 2, 3, 4."}
        {!found && taps.length >= 6 && "Listen for the chord. It changes right where the bar starts."}
      </Verdict>
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
      <h2 className="prompt">A kick on every beat.</h2>
      <Studio loop={loop} onChange={setLoop} lanes={[L.kick]} tempo={[70, 160]} />
      <Verdict ok={solved || null}>{solved && "Four on the floor: the engine of disco and house."}</Verdict>
      {solved && <Listen loop={{ ...loop, bpm: 124 }} label="Same thing at 124 BPM" />}
    </div>
  );
}
