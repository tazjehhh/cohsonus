import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import type { Loop, Note } from "../../music/model";
import { repeat } from "../../music/patterns";
import { usePlayer } from "../../audio/usePlayer";
import { audio, heardOffset } from "../../audio/engine";
import { PlayButton } from "../../ui/PlayButton";
import { ListenList } from "../../ui/ListenList";
import { useDrawings } from "../../ui/drawings";
import { Figure, Page, Spread } from "../../ui/page";
import { TRACKS, type Role } from "./tracks";
import { ROLE_COLOR } from "./parts";

// ---------- one layer at a time ----------

const ORDER = ["kick", "hats", "clap", "bass", "chords", "lead"];
const BARS_EACH = 2;
const house = TRACKS.house;

/** The house track built up: every two bars one more layer comes in. The same loop draws the picture. */
const buildUp: Loop = (() => {
  const src = house.loop;
  const barSteps = src.stepsPerBeat * src.beatsPerBar;
  const bars = ORDER.length * BARS_EACH;
  return {
    ...src,
    bars,
    lanes: src.lanes.map((lane) => {
      const enter = ORDER.indexOf(lane.id) * BARS_EACH * barSteps;
      return { ...lane, notes: repeat(lane.notes, bars / src.bars, barSteps * src.bars).filter((n) => n.step >= enter) };
    }),
  };
})();

const BAR_STEPS = buildUp.stepsPerBeat * buildUp.beatsPerBar;
const LW = 70;
const CELL = 30;
const ROW = 28;

function LayerScore({ at }: { at: number | null }) {
  const bar = at === null ? -1 : Math.floor(at / BAR_STEPS);
  const W = LW + CELL * buildUp.bars;
  const H = ROW * ORDER.length + 8;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Six layers entering one after another, two bars apart">
      {ORDER.map((id, r) => {
        const lane = buildUp.lanes.find((l) => l.id === id)!;
        const stem = house.stems.find((s) => s.id === id)!;
        const color = ROLE_COLOR[stem.role as Role];
        const has = new Set(lane.notes.map((n) => Math.floor(n.step / BAR_STEPS)));
        const y = r * ROW + 4;
        return (
          <g key={id}>
            <text x={LW - 12} y={y + ROW / 2 + 4} textAnchor="end" fontSize="11" fill={bar >= 0 && has.has(bar) ? "var(--ink)" : "var(--ink-3)"}>
              {stem.name}
            </text>
            {Array.from({ length: buildUp.bars }, (_, b) => (
              <rect
                key={b}
                x={LW + b * CELL + 2}
                y={y + 4}
                width={CELL - 4}
                height={ROW - 8}
                rx={3}
                fill={has.has(b) ? color : "none"}
                stroke={has.has(b) ? "none" : "var(--line)"}
                opacity={!has.has(b) ? 1 : b === bar ? 1 : b < bar ? 0.55 : 0.18}
              />
            ))}
          </g>
        );
      })}
      {at !== null && <line x1={LW + (at / BAR_STEPS) * CELL} x2={LW + (at / BAR_STEPS) * CELL} y1={0} y2={H} stroke="var(--ink)" strokeWidth={1} />}
    </svg>
  );
}

export function LayerByLayer({ complete }: StepProps) {
  const t = usePlayer(buildUp, house.channels);
  const [at, setAt] = useState<number | null>(null);
  useEffect(() => complete(), [complete]);
  useEffect(() => {
    if (!t.playing) setAt(null);
  }, [t.playing]);
  useDrawings(t.playing, () => setAt(t.player.positionAt(audio().currentTime - heardOffset())), { player: t.player });
  return (
    <Page title="Building a track in layers">
      <Spread
        figure={
          <Figure>
            <LayerScore at={at} />
            <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
          </Figure>
        }
      >
        <p>
          Most tracks do not begin with all of their parts at once. The parts enter one after another, so that the listener hears each new layer arrive. A common
          order follows the four jobs: first the drums, which establish the tempo; then the <strong>bass</strong>, which adds the low foundation; then the{" "}
          <strong>harmony</strong>, which sets the mood; and finally the <strong>melody</strong>.
        </p>
        <p>
          The technique also works in reverse. Daft
          Punk&apos;s Around the World (1997) repeats a small number of parts for about seven minutes and holds the listener&apos;s attention by removing layers and
          bringing them back.
        </p>
        <ListenList items={[{ artist: "Daft Punk", title: "Around the World" }]} />
      </Spread>
    </Page>
  );
}

// ---------- low, mid, high ----------

const LO = 20;
const HI = 20000;
const AX0 = 86;
const AX1 = 476;
const fx = (f: number) => AX0 + (Math.log(f / LO) / Math.log(HI / LO)) * (AX1 - AX0);
const TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

/** Where each sound of the house track sits. Body: where most of its energy lies. Edge: overtones and attack. */
const HOMES: { id: string; role: Role; body: [number, number]; edge?: [number, number]; note: Note }[] = [
  { id: "hats", role: "drums", body: [6000, 16000], note: { step: 0, vel: 0.8 } },
  { id: "lead", role: "melody", body: [380, 1300], edge: [1300, 6000], note: { step: 0, pitch: 76, len: 6 } },
  { id: "clap", role: "drums", body: [700, 2500], edge: [2500, 9000], note: { step: 0 } },
  { id: "chords", role: "harmony", body: [200, 1000], edge: [1000, 4000], note: { step: 0, chord: [57, 60, 64], len: 6 } },
  { id: "bass", role: "bass", body: [45, 220], edge: [220, 1200], note: { step: 0, pitch: 33, len: 6 } },
  { id: "kick", role: "drums", body: [40, 110], edge: [2000, 5000], note: { step: 0 } },
];

function centre(h: (typeof HOMES)[number]) {
  return Math.sqrt(h.body[0] * h.body[1]);
}

/** Air moving back and forth: the higher the sound, the more often per second. */
function Wave({ hz, running }: { hz: number; running: boolean }) {
  const [shift, setShift] = useState(0);
  useDrawings(running, (dt) => setShift((s) => s + dt * 60));
  const W = 390;
  const H = 44;
  // drawn at a fixed speed, so the waves crowd together as the pitch rises
  const len = 150 * Math.pow(50 / hz, 0.42);
  const pts = Array.from({ length: 196 }, (_, i) => {
    const x = (i / 195) * W;
    return `${i ? "L" : "M"}${x.toFixed(1)} ${(H / 2 + Math.sin(((x - shift) / len) * Math.PI * 2) * (H / 2 - 4)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <path d={pts} fill="none" stroke="var(--ink-2)" strokeWidth={1.5} />
    </svg>
  );
}

export function LowMidHigh({ complete }: StepProps) {
  const t = usePlayer(house.loop, house.channels);
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => complete(), [complete]);
  const picked = HOMES.find((h) => h.id === pick);
  const ROW_H = 30;
  const H = HOMES.length * ROW_H + 30;
  return (
    <Page title="Frequency: low, mid and high">
      <Spread
        figure={
          <Figure caption={picked ? `${house.stems.find((s) => s.id === picked.id)!.name}: around ${Math.round(centre(picked))} Hz` : "Click a sound to hear it."}>
            <svg width={AX1 + 10} height={H} viewBox={`0 0 ${AX1 + 10} ${H}`} role="img" aria-label="Where each sound sits from low to high frequencies">
              {TICKS.map((f) => (
                <g key={f}>
                  <line x1={fx(f)} x2={fx(f)} y1={0} y2={H - 22} stroke="var(--line)" />
                  <text x={fx(f)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--ink-3)">
                    {f >= 1000 ? `${f / 1000}k` : f}
                  </text>
                </g>
              ))}
              {HOMES.map((h, r) => {
                const y = r * ROW_H + 4;
                const on = pick === h.id;
                const name = house.stems.find((s) => s.id === h.id)!.name;
                return (
                  <g
                    key={h.id}
                    className="home-row"
                    role="button"
                    tabIndex={0}
                    aria-label={`Play ${name}`}
                    onClick={() => {
                      setPick(h.id);
                      void t.player.audition(h.id, h.note);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      setPick(h.id);
                      void t.player.audition(h.id, h.note);
                    }}
                  >
                    <rect x={0} y={y} width={AX1 + 10} height={ROW_H - 4} fill="transparent" />
                    <text x={AX0 - 12} y={y + ROW_H / 2 + 2} fontSize="11" textAnchor="end" fill={on ? "var(--ink)" : "var(--ink-2)"}>
                      {name}
                    </text>
                    {h.edge && <rect x={fx(h.edge[0])} y={y + 8} width={fx(h.edge[1]) - fx(h.edge[0])} height={ROW_H - 20} rx={3} fill={ROLE_COLOR[h.role]} opacity={on ? 0.45 : 0.22} />}
                    <rect x={fx(h.body[0])} y={y + 4} width={fx(h.body[1]) - fx(h.body[0])} height={ROW_H - 12} rx={4} fill={ROLE_COLOR[h.role]} opacity={on ? 1 : 0.7} />
                  </g>
                );
              })}
            </svg>
            <Wave hz={picked ? centre(picked) : 120} running={!!picked} />
          </Figure>
        }
      >
        <p>
          Sound is a vibration of the air. Its <strong>frequency</strong> is the number of vibrations per second, measured in <strong>hertz (Hz)</strong>. Human
          hearing covers roughly 20 Hz to 20,000 Hz (20 kHz). Low frequencies are heard as deep sounds, high frequencies as bright ones.
        </p>
        <p>
          An instrument covers a range of frequencies, not a single one. For a pitched sound, the lowest frequency is the <strong>fundamental</strong>, which is
          heard as the pitch; above it lie <strong>overtones</strong>, which give the sound its color. A kick drum&apos;s energy lies around 50 Hz, while its short click at 2 to 5 kHz is what
          remains audible on a phone speaker.
        </p>
        <p>
          Kick and bass occupy the same low range and can cover each other up. Producers therefore give each its own space, for example by letting the kick take the
          lowest frequencies and placing the bass slightly above it.
        </p>
      </Spread>
    </Page>
  );
}
