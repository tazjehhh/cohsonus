import { useEffect, useMemo, useState } from "react";
import type { StepProps } from "../types";
import { usePlayer } from "../../audio/usePlayer";
import { PlayButton } from "../../ui/PlayButton";
import { Choice } from "../../ui/Choice";
import { Strips } from "../../ui/Strips";
import { Spectrum } from "../../ui/Spectrum";
import { ROLES, TRACKS, lettered, type Role, type Stem, type Track } from "./tracks";

export const ROLE_COLOR: Record<Role, string> = {
  drums: "#3987e5",
  bass: "#d95926",
  harmony: "#199e70",
  melody: "#c98500",
};

const STEM_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9"];

function useTrack(track: Track) {
  return usePlayer(track.loop, track.channels);
}

function Transport({ t, label }: { t: ReturnType<typeof usePlayer>; label?: string }) {
  return (
    <div className="row">
      <PlayButton playing={t.playing} onClick={t.toggle} step={t.step} />
      {label && <span className="label">{label}</span>}
    </div>
  );
}

/** Keeps at most two picks; a third replaces a pick marked wrong, else the older one. */
function pickPair(picked: string[], id: string, wrong: string[]) {
  if (picked.includes(id)) return picked.filter((x) => x !== id);
  if (picked.length < 2) return [...picked, id];
  const drop = picked.find((x) => wrong.includes(x)) ?? picked[0];
  return [...picked.filter((x) => x !== drop), id];
}

// ---------------- Part 1 ----------------

export function Count({ complete, saved }: StepProps) {
  const t = useTrack(TRACKS.house);
  const [heard, setHeard] = useState(!!saved);
  if (t.playing && !heard) setHeard(true);
  return (
    <div className="col">
      <h2 className="prompt">How many different sounds are playing at the same time?</h2>
      <Transport t={t} />
      <div style={{ opacity: heard ? 1 : 0.3, pointerEvents: heard ? "auto" : "none" }} className="fade-in">
        <Choice
          options={[2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ id: String(n), label: <span className="mono">{n}</span> }))}
          initial={(saved as { count?: string } | undefined)?.count}
          onResult={(id) => complete({ count: id })}
        />
      </div>
    </div>
  );
}

const P1_ORDER = [3, 0, 5, 2, 4, 1];
type Register = Stem["register"];

export function MuteAndDescribe({ complete, saved }: StepProps) {
  const t = useTrack(TRACKS.house);
  const chans = useMemo(() => lettered(TRACKS.house, P1_ORDER), []);
  const prev = saved as { tags: Record<string, Register> } | undefined;
  const [tags, setTags] = useState<Record<string, Register>>(prev?.tags ?? {});
  const [tried, setTried] = useState<Record<string, boolean>>(prev ? Object.fromEntries(chans.map((c) => [c.stem.id, true])) : {});

  const update = (nextTags: Record<string, Register>, nextTried: Record<string, boolean>) => {
    if (chans.every((c) => nextTags[c.stem.id] && nextTried[c.stem.id])) complete({ tags: nextTags });
  };

  return (
    <div className="col">
      <h2 className="prompt">Mute each channel. What goes missing?</h2>
      <p className="sub">Then mark where it sits: low, mid or high.</p>
      <Transport t={t} />
      <Strips
        player={t.player}
        playing={t.playing}
        strips={chans.map((c) => ({ id: c.stem.id, title: <span className="mono">{c.letter}</span> }))}
        onMute={(id, m) => {
          if (!m) return;
          const n = { ...tried, [id]: true };
          setTried(n);
          update(tags, n);
        }}
        footer={(id) => (
          <div className="seg">
            {(["high", "mid", "low"] as Register[]).map((r) => (
              <button
                key={r}
                className={tags[id] === r ? "on" : ""}
                onClick={() => {
                  const n = { ...tags, [id]: r };
                  setTags(n);
                  update(n, tried);
                }}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      />
    </div>
  );
}

export function Reveal({ complete, memory }: StepProps) {
  const t = useTrack(TRACKS.house);
  const count = (memory["p1/count"] as { count?: string } | undefined)?.count;
  const tags = (memory["p1/mute"] as { tags?: Record<string, Register> } | undefined)?.tags ?? {};
  useEffect(() => complete(), [complete]);
  const stems = TRACKS.house.stems;
  return (
    <div className="col">
      <h2 className="prompt">Six sounds. Four jobs.</h2>
      {count && (
        <p className="sub">
          You counted <span className="mono">{count}</span>.
        </p>
      )}
      <Transport t={t} />
      <div className="roles">
        {ROLES.map((r) => {
          const own = stems.filter((s) => s.role === r.id);
          return (
            <div key={r.id} className="role fade-in" style={{ ["--c" as string]: ROLE_COLOR[r.id] }}>
              <div className="role-head">
                <span className="role-name">{r.name}</span>
                <span className="role-job">{r.job}</span>
              </div>
              <Strips
                player={t.player}
                playing={t.playing}
                strips={own.map((s) => ({ id: s.id, title: s.name, color: ROLE_COLOR[r.id] }))}
                footer={(id) => {
                  const stem = stems.find((s) => s.id === id)!;
                  const mine = tags[id];
                  if (!mine) return null;
                  return (
                    <span className={`tag ${mine === stem.register ? "good" : "miss"}`}>
                      {mine === stem.register ? `${stem.register} ✓` : `${stem.register}, not ${mine}`}
                    </span>
                  );
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BassMoment({ complete, saved }: StepProps) {
  const t = useTrack(TRACKS.house);
  const [flips, setFlips] = useState(saved ? 2 : 0);
  const [solved, setSolved] = useState(!!saved);
  return (
    <div className="col">
      <h2 className="prompt">Mute the bass. Then bring it back.</h2>
      <Transport t={t} />
      <Strips
        player={t.player}
        playing={t.playing}
        strips={TRACKS.house.stems.map((s) => ({ id: s.id, title: s.name, color: ROLE_COLOR[s.role] }))}
        onMute={(id) => id === "bass" && setFlips((f) => f + 1)}
      />
      {flips >= 2 && (
        <div className="col fade-in">
          <h3 className="prompt small">What changed?</h3>
          <Choice
            options={[
              { id: "melody", label: "The melody changed" },
              { id: "tempo", label: "It got slower" },
              { id: "weight", label: "It lost its weight" },
              { id: "nothing", label: "Nothing" },
            ]}
            correct="weight"
            initial={solved ? "weight" : undefined}
            onResult={(_, attempts) => {
              setSolved(true);
              complete({ attempts });
            }}
          />
          {solved && (
            <p className="sub fade-in">
              Bass is felt more than heard. On small speakers it almost vanishes. Take it away and everything floats.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RoleAssign({ track, order, onSolved, saved }: { track: Track; order: number[]; onSolved: (attempts: number) => void; saved?: boolean }) {
  const t = useTrack(track);
  const chans = useMemo(() => lettered(track, order), [track, order]);
  const [pick, setPick] = useState<Record<string, Role>>(saved ? Object.fromEntries(track.stems.map((s) => [s.id, s.role])) : {});
  const [checked, setChecked] = useState(!!saved);
  const [attempts, setAttempts] = useState(0);
  const all = chans.every((c) => pick[c.stem.id]);
  const wrong = chans.filter((c) => pick[c.stem.id] !== c.stem.role).map((c) => c.stem.id);
  const solved = checked && wrong.length === 0;

  return (
    <div className="col">
      <Transport t={t} />
      <Strips
        player={t.player}
        playing={t.playing}
        strips={chans.map((c) => ({
          id: c.stem.id,
          title: <span className="mono">{c.letter}</span>,
          color: pick[c.stem.id] ? ROLE_COLOR[pick[c.stem.id]] : undefined,
        }))}
        footer={(id) => (
          <div className={`seg vertical ${checked && wrong.includes(id) ? "miss" : ""}`}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                className={pick[id] === r.id ? "on" : ""}
                style={{ ["--c" as string]: ROLE_COLOR[r.id] }}
                disabled={solved}
                onClick={() => {
                  setPick((p) => ({ ...p, [id]: r.id }));
                  setChecked(false);
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      />
      <div className="row">
        {!solved && (
          <button
            className="btn"
            disabled={!all}
            onClick={() => {
              const n = attempts + 1;
              setAttempts(n);
              setChecked(true);
              if (wrong.length === 0) onSolved(n);
            }}
          >
            Check
          </button>
        )}
      </div>
      <div className={`verdict ${checked ? (solved ? "good" : "miss") : ""}`} aria-live="polite">
        {checked && (solved ? "All six." : `${wrong.length} not right yet.`)}
      </div>
    </div>
  );
}

export function RoleTest({ complete, saved }: StepProps) {
  return (
    <div className="col">
      <h2 className="prompt">New track. Which job does each channel do?</h2>
      <RoleAssign track={TRACKS.boombap} order={[4, 2, 0, 5, 1, 3]} saved={!!saved} onSolved={(attempts) => complete({ attempts })} />
    </div>
  );
}

// ---------------- Part 2 ----------------

const ROUNDS: { stem: string }[] = [{ stem: "bass" }, { stem: "chords" }, { stem: "lead" }];
const OTHERS: { track: Track; order: number[] }[] = [
  { track: TRACKS.boombap, order: [1, 3, 5, 0, 4, 2] },
  { track: TRACKS.indie, order: [5, 0, 3, 4, 2, 1] },
];

export function SameJob({ complete, saved }: StepProps) {
  const [round, setRound] = useState(saved ? ROUNDS.length : 0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const house = useTrack(TRACKS.house);
  const others = OTHERS.map((o) => ({ ...o, p: usePlayer(o.track.loop, o.track.channels) }));
  const done = round >= ROUNDS.length;
  const target = !done ? TRACKS.house.stems.find((s) => s.id === ROUNDS[round].stem)! : null;
  const right = (trackId: string) => {
    const o = OTHERS.find((x) => x.track.id === trackId)!;
    return o.track.stems.find((s) => s.id === picks[trackId])?.role === target?.role;
  };
  const allPicked = OTHERS.every((o) => picks[o.track.id]);
  const allRight = allPicked && OTHERS.every((o) => right(o.track.id));

  const listen = (p: ReturnType<typeof usePlayer>, solo: string | null) => {
    p.player.solo(solo);
    p.play();
  };

  if (done)
    return (
      <div className="col">
        <h2 className="prompt">Bass, harmony, melody: found in all three.</h2>
      </div>
    );

  return (
    <div className="col">
      <h2 className="prompt">Same job, different track.</h2>
      <div className="label">
        Round {round + 1} of {ROUNDS.length}
      </div>
      <div className="match-target">
        <span className="track-tag mono">Track 1</span>
        <PlayButton playing={house.playing} onClick={() => (house.playing ? house.stop() : listen(house, target!.id))} size="sm" label={`Play the ${target!.name}`} />
        <span>
          This is the <strong>{target!.name.toLowerCase()}</strong>. Find the channel doing the same job in tracks 2 and 3.
        </span>
      </div>
      {others.map((o, k) => {
        const chans = lettered(o.track, o.order);
        return (
          <div key={o.track.id} className="match-row">
            <span className="track-tag mono">Track {k + 2}</span>
            <PlayButton playing={o.p.playing} onClick={() => (o.p.playing ? o.p.stop() : listen(o.p, null))} size="sm" label="Play the whole track" />
            {chans.map((c) => {
              const picked = picks[o.track.id] === c.stem.id;
              const state = checked && picked ? (right(o.track.id) ? "right" : "wrong") : picked ? "picked" : "";
              return (
                <button
                  key={c.stem.id}
                  className={`choice chan ${state}`}
                  onClick={() => {
                    listen(o.p, c.stem.id);
                    setPicks((p) => ({ ...p, [o.track.id]: c.stem.id }));
                    setChecked(false);
                  }}
                >
                  <span className="mono">{c.letter}</span>
                </button>
              );
            })}
          </div>
        );
      })}
      <div className="row">
        {!allRight || !checked ? (
          <button className="btn" disabled={!allPicked} onClick={() => setChecked(true)}>
            Check
          </button>
        ) : (
          <button
            className="btn primary"
            onClick={() => {
              for (const o of others) o.p.stop();
              house.stop();
              setPicks({});
              setChecked(false);
              if (round + 1 >= ROUNDS.length) complete();
              setRound(round + 1);
            }}
          >
            {round + 1 < ROUNDS.length ? "Next round" : "Done"}
          </button>
        )}
      </div>
      <div className={`verdict ${checked ? (allRight ? "good" : "miss") : ""}`} aria-live="polite">
        {checked && (allRight ? "Both right." : "Not both. Listen to each again.")}
      </div>
    </div>
  );
}

export function Instruments({ complete }: StepProps) {
  useEffect(() => complete(), [complete]);
  const worlds = [TRACKS.house, TRACKS.boombap, TRACKS.indie];
  const players = worlds.map((w) => ({ w, p: usePlayer(w.loop, w.channels) }));
  const [on, setOn] = useState<string | null>(null);
  const play = (wi: number, stem: string) => {
    const key = `${wi}:${stem}`;
    if (on === key) {
      players[wi].p.stop();
      setOn(null);
      return;
    }
    players[wi].p.player.solo(stem);
    players[wi].p.play();
    setOn(key);
  };
  const byRole = (w: Track, r: Role) => w.stems.filter((s) => s.role === r && (r !== "drums" || s.id === "kick"));
  return (
    <div className="col">
      <h2 className="prompt">Same job. Different instruments.</h2>
      <table className="matrix">
        <thead>
          <tr>
            <th />
            {worlds.map((w) => (
              <th key={w.id}>
                <span className="label">{w.world}</span>
                <div>{w.genre}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLES.map((r) => (
            <tr key={r.id} style={{ ["--c" as string]: ROLE_COLOR[r.id] }}>
              <th>
                <span className="role-dot" />
                {r.name}
              </th>
              {worlds.map((w, wi) =>
                byRole(w, r.id).map((s) => (
                  <td key={w.id}>
                    <button className={`cellplay ${on === `${wi}:${s.id}` ? "on" : ""}`} onClick={() => play(wi, s.id)}>
                      <span className="tri" aria-hidden>
                        {on === `${wi}:${s.id}` ? "■" : "▶"}
                      </span>
                      {s.instrument}
                    </button>
                  </td>
                )),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WhereItLives({ complete, saved }: StepProps) {
  const t = useTrack(TRACKS.house);
  const lines = useMemo(() => TRACKS.house.stems.map((s, i) => ({ id: s.id, name: s.name, color: STEM_COLORS[i] })), []);
  const [picked, setPicked] = useState<string[]>(saved ? ["kick", "bass"] : []);
  const [checked, setChecked] = useState(!!saved);
  const right = picked.length === 2 && picked.includes("kick") && picked.includes("bass");
  return (
    <div className="col">
      <h2 className="prompt">Where does each sound live?</h2>
      <Transport t={t} />
      <Spectrum player={t.player} lines={lines} playing={t.playing} />
      <h3 className="prompt small">Which two fight over the lowest space?</h3>
      <div className="choices">
        {TRACKS.house.stems.map((s) => {
          const on = picked.includes(s.id);
          const cls = checked && on ? (right ? "right" : ["kick", "bass"].includes(s.id) ? "right" : "wrong") : on ? "picked" : "";
          return (
            <button
              key={s.id}
              className={`choice ${cls}`}
              disabled={checked && right}
              onClick={() => {
                setChecked(false);
                setPicked((p) => pickPair(p, s.id, checked ? p.filter((x) => !["kick", "bass"].includes(x)) : []));
              }}
            >
              {s.name}
            </button>
          );
        })}
      </div>
      {!(checked && right) && (
        <button
          className="btn"
          disabled={picked.length !== 2}
          onClick={() => {
            setChecked(true);
            if (right) complete();
          }}
        >
          Check
        </button>
      )}
      <div className={`verdict ${checked ? (right ? "good" : "miss") : ""}`} aria-live="polite">
        {checked && (right ? "Kick and bass share the floor. Keeping them out of each other's way is a craft of its own." : "One of them lives higher up.")}
      </div>
    </div>
  );
}

const MAP: { role: Role; lectures: { n: string; title: string }[] }[] = [
  { role: "drums", lectures: [{ n: "01", title: "Pulse & Groove" }] },
  { role: "bass", lectures: [{ n: "05", title: "Bass" }] },
  {
    role: "harmony",
    lectures: [
      { n: "02", title: "Keys I: Notes & Scales" },
      { n: "04", title: "Keys II: Chords" },
      { n: "06", title: "Keys III: Pads & MIDI" },
    ],
  },
  { role: "melody", lectures: [{ n: "07", title: "Melody" }] },
];

export function Map({ complete, saved }: StepProps) {
  return (
    <div className="col">
      <h2 className="prompt">Which job do you want to understand first?</h2>
      <Choice
        options={MAP.map((m) => {
          const r = ROLES.find((x) => x.id === m.role)!;
          return {
            id: m.role,
            label: (
              <span className="mapopt" style={{ ["--c" as string]: ROLE_COLOR[m.role] }}>
                <span className="role-name">{r.name}</span>
                {m.lectures.map((l) => (
                  <span key={l.n} className="mapl">
                    <span className="mono">{l.n}</span> {l.title}
                  </span>
                ))}
              </span>
            ),
          };
        })}
        initial={(saved as { role?: string } | undefined)?.role}
        onResult={(role) => complete({ role })}
      />
      <p className="sub">
        Taking any of them from an old record: <span className="mono">03</span> Sampling I.
      </p>
    </div>
  );
}

// ---------------- Refresher ----------------

export function RefreshRoles({ complete }: StepProps) {
  return (
    <div className="col">
      <h2 className="prompt">Which job does each channel do?</h2>
      <RoleAssign track={TRACKS.indie} order={[2, 4, 1, 3, 0, 5]} onSolved={(attempts) => complete({ pass: attempts === 1 })} />
    </div>
  );
}

export function RefreshFloor({ complete }: StepProps) {
  const t = useTrack(TRACKS.boombap);
  const chans = useMemo(() => lettered(TRACKS.boombap, [2, 5, 0, 4, 1, 3]), []);
  return (
    <div className="col">
      <h2 className="prompt">Which two channels share the lowest space?</h2>
      <Transport t={t} />
      <Strips player={t.player} playing={t.playing} solo strips={chans.map((c) => ({ id: c.stem.id, title: <span className="mono">{c.letter}</span> }))} />
      <PairPick
        options={chans.map((c) => ({ id: c.stem.id, label: c.letter }))}
        answer={["kick", "bass"]}
        onDone={(firstTry) => complete({ pass: firstTry })}
      />
    </div>
  );
}

function PairPick({ options, answer, onDone }: { options: { id: string; label: string }[]; answer: string[]; onDone: (firstTry: boolean) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [solved, setSolved] = useState(false);
  const right = picked.length === 2 && answer.every((a) => picked.includes(a));
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="choices">
        {options.map((o) => (
          <button
            key={o.id}
            className={`choice ${picked.includes(o.id) ? (solved ? "right" : "picked") : ""}`}
            disabled={solved}
            onClick={() => setPicked((p) => pickPair(p, o.id, tries ? p.filter((x) => !answer.includes(x)) : []))}
          >
            <span className="mono">{o.label}</span>
          </button>
        ))}
      </div>
      {!solved && (
        <button
          className="btn"
          disabled={picked.length !== 2}
          onClick={() => {
            const n = tries + 1;
            setTries(n);
            if (right) {
              setSolved(true);
              onDone(n === 1);
            }
          }}
        >
          Check
        </button>
      )}
      <div className={`verdict ${solved ? "good" : tries ? "miss" : ""}`}>{solved ? "Kick and bass." : tries ? "Not that pair." : ""}</div>
    </div>
  );
}

