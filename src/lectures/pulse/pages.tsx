import { useEffect, useMemo, useState } from "react";
import type { StepProps } from "../types";
import type { Loop } from "../../music/model";
import type { Player } from "../../audio/player";
import { usePlayer } from "../../audio/usePlayer";
import { audio, heardOffset } from "../../audio/engine";
import { PlayButton } from "../../ui/PlayButton";
import { ListenList } from "../../ui/ListenList";
import { useDrawings } from "../../ui/drawings";
import { Art, Figure, Page, Spread } from "../../ui/page";
import { TEMPO_LOOPS, swingTarget } from "./loops";

// ---------- tempo neighbourhoods ----------

const BPM0 = 70;
const BPM1 = 185;
const RX0 = 110;
const RX1 = 470;
const bx = (bpm: number) => RX0 + ((bpm - BPM0) / (BPM1 - BPM0)) * (RX1 - RX0);

const HOODS: { id: string; genre: string; range: [number, number]; loop?: Loop }[] = [
  ...TEMPO_LOOPS.map((t) => ({
    id: t.id,
    genre: t.genre,
    loop: t.loop,
    range: ({ boombap: [85, 95], indie: [105, 130], house: [118, 128], techno: [128, 142] } as Record<string, [number, number]>)[t.id] ?? [t.loop.bpm - 5, t.loop.bpm + 5],
  })),
  { id: "dnb", genre: "Drum & bass", range: [170, 178] },
];

/** A ball that lands on every beat: slow at the top, fast at the bottom, squashed for one drawing on the hit. */
function Bounce({ player, playing, x }: { player: Player | null; playing: boolean; x: number }) {
  const [phase, setPhase] = useState(0);
  useDrawings(
    playing && !!player,
    () => {
      if (!player) return;
      const loop = player.getLoop();
      setPhase(((player.positionAt(audio().currentTime - heardOffset()) / loop.stepsPerBeat) % 1 + 1) % 1);
    },
    { player: player ?? undefined },
  );
  const ground = 58;
  const lift = playing ? 44 * 4 * phase * (1 - phase) : 0;
  const contact = playing && (phase < 0.05 || phase > 0.97);
  const fast = playing && (phase < 0.2 || phase > 0.8);
  const rx = contact ? 9.5 : fast ? 6.2 : 7;
  const ry = contact ? 4.5 : fast ? 8 : 7;
  return (
    <g>
      <line x1={RX0} x2={RX1} y1={ground + 7} y2={ground + 7} stroke="var(--line)" />
      <ellipse cx={x} cy={ground - lift + 7 - ry} rx={rx} ry={ry} fill="var(--ink)" />
    </g>
  );
}

function HoodRow({ hood, y, onPlay }: { hood: (typeof HOODS)[number]; y: number; onPlay: (p: Player | null, x: number) => void }) {
  const t = usePlayer(hood.loop ?? TEMPO_LOOPS[0].loop);
  const [lo, hi] = hood.range;
  useEffect(() => {
    if (hood.loop) onPlay(t.playing ? t.player : null, bx(hood.loop.bpm));
  }, [t.playing]);
  const label = (
    <text x={RX0 - 14} y={y + 14} fontSize="11" textAnchor="end" fill={t.playing ? "var(--ink)" : "var(--ink-2)"}>
      {hood.genre}
    </text>
  );
  return (
    <g
      className={hood.loop ? "home-row" : ""}
      role={hood.loop ? "button" : undefined}
      tabIndex={hood.loop ? 0 : undefined}
      aria-label={hood.loop ? `Play ${hood.genre} at ${hood.loop.bpm} BPM` : `${hood.genre}, ${lo} to ${hi} BPM`}
      onClick={() => hood.loop && t.toggle()}
      onKeyDown={(e) => {
        if (!hood.loop || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        t.toggle();
      }}
    >
      <rect x={0} y={y} width={RX1 + 10} height={22} fill="transparent" />
      {label}
      <rect x={bx(lo)} y={y + 4} width={bx(hi) - bx(lo)} height={14} rx={4} fill={t.playing ? "var(--ink)" : hood.loop ? "var(--ink-3)" : "var(--line-2)"} opacity={t.playing ? 0.9 : 0.6} />
      {hood.loop && <circle cx={bx(hood.loop.bpm)} cy={y + 11} r={2.5} fill="var(--bg)" />}
    </g>
  );
}

export function TempoHoods({ complete }: StepProps) {
  const [live, setLive] = useState<{ player: Player | null; x: number }>({ player: null, x: bx(120) });
  useEffect(() => complete(), [complete]);
  const top = 84;
  const H = top + HOODS.length * 26 + 30;
  return (
    <Page title="Tempo ranges by genre">
      <Spread
        figure={
          <Figure caption="Click a genre to hear its loop.">
            <svg width={RX1 + 10} height={H} viewBox={`0 0 ${RX1 + 10} ${H}`} role="img" aria-label="Tempo ranges of genres, from 70 to 185 beats per minute">
              <Bounce player={live.player} playing={!!live.player} x={live.x} />
              {[80, 100, 120, 140, 160, 180].map((b) => (
                <g key={b}>
                  <line x1={bx(b)} x2={bx(b)} y1={top - 6} y2={H - 22} stroke="var(--line)" />
                  <text x={bx(b)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--ink-3)">
                    {b}
                  </text>
                </g>
              ))}
              {HOODS.map((h, i) => (
                <HoodRow
                  key={h.id}
                  hood={h}
                  y={top + i * 26}
                  onPlay={(p, x) => setLive((cur) => (p ? { player: p, x } : cur.x === x ? { ...cur, player: null } : cur))}
                />
              ))}
            </svg>
          </Figure>
        }
      >
        <p>
          Each genre has a typical <strong>tempo range</strong>. Boom bap usually sits between 85 and 95 BPM, house between 118 and 128, techno between about
          128 and 142, and drum and bass near 174.
        </p>
        <p>
          Tempo is part of what defines a genre. DJs mix records whose tempos are close to each other, and a beat moved far outside its usual range changes
          character: a boom bap beat played at 124 BPM no longer sounds like boom bap.
        </p>
      </Spread>
    </Page>
  );
}

// ---------- where swing comes from ----------

const GX0 = 20;
const GX1 = 440;
const STEPS = 16;
const gx = (pos: number) => GX0 + (pos / STEPS) * (GX1 - GX0);

/** One bar of sixteenths. Every second one slides late as the swing rises. */
function SwingGrid({ swing, at }: { swing: number; at: number | null }) {
  const H = 64;
  const pos = (i: number) => (i % 2 ? i - 1 + swing * 2 : i);
  return (
    <svg width={GX1 + GX0} height={H} viewBox={`0 0 ${GX1 + GX0} ${H}`} role="img" aria-label={`Sixteenth notes with ${Math.round(swing * 100)}% swing`}>
      {Array.from({ length: STEPS }, (_, i) => (
        <g key={i}>
          {i % 2 === 1 && <circle cx={gx(i)} cy={H / 2} r={5} fill="none" stroke="var(--line-2)" />}
          <circle
            cx={gx(pos(i))}
            cy={H / 2}
            r={i % 4 === 0 ? 7 : 5}
            fill={at !== null && at >= pos(i) && at < pos(i) + 0.6 ? "var(--ink)" : i % 2 ? "var(--ink-2)" : "var(--ink-3)"}
          />
        </g>
      ))}
      {at !== null && <line x1={gx(at)} x2={gx(at)} y1={8} y2={H - 8} stroke="var(--ink)" />}
    </svg>
  );
}

export function SwingHistory({ complete }: StepProps) {
  const [swing, setSwing] = useState(0.58);
  const loop = useMemo<Loop>(() => ({ ...swingTarget, swing }), [swing]);
  const t = usePlayer(loop);
  const [at, setAt] = useState<number | null>(null);
  useEffect(() => complete(), [complete]);
  useEffect(() => {
    if (!t.playing) setAt(null);
  }, [t.playing]);
  useDrawings(t.playing, () => setAt(t.player.positionAt(audio().currentTime - heardOffset()) % STEPS), { player: t.player });
  return (
    <Page title="The origins of swing">
      <Spread figure={<Art name="pulse/mpc60" w={300} h={210} alt="An Akai MPC60, 1988" />}>
        <p>
          <strong>Swing</strong> is a rhythmic feel in which the notes that divide a beat are played unevenly: the first of each pair is longer, the second shorter
          and later. It comes from jazz, where drummers played the ride cymbal in a long-short pattern, and it carried over into soul, funk and hip-hop.
        </p>
        <p>
          Drum machines play exactly on the grid unless they are told otherwise. Roger Linn, who designed the LinnDrum and the Akai MPC60 (1988), gave his machines a
          swing setting that delays every second sixteenth note. At 50% the notes are straight; at about 66% the second note falls where a triplet would, which is
          the classic swing feel.
        </p>
      </Spread>
      <Spread
        flip
        figure={
          <Figure caption={`Swing: ${Math.round(swing * 100)}%`}>
            <SwingGrid swing={swing} at={at} />
            <div className="row">
              <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
              <input type="range" min={50} max={75} step={1} value={Math.round(swing * 100)} onChange={(e) => setSwing(Number(e.target.value) / 100)} aria-label="Swing" />
            </div>
          </Figure>
        }
      >
        <p>
          Settings far above 66% delay the second note so much that the groove begins to sound uneven.
        </p>
        <p>
          The producer <strong>J Dilla</strong> took the idea further. On his Akai MPC3000 he often switched off the machine&apos;s correction to the grid and played
          his drums in by hand, slightly early or slightly late. His loose timing influenced a generation of hip-hop and neo-soul producers.
        </p>
        <ListenList
          items={[
            { artist: "Slum Village", title: "Fall in Love" },
            { artist: "Erykah Badu", title: "Didn't Cha Know" },
          ]}
        />
      </Spread>
    </Page>
  );
}
