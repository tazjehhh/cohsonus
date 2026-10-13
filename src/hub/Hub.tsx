import { useEffect, useRef, useState } from "react";
import { LECTURES, type LectureEntry } from "../lectures/registry";
import { useAllProgress, type LectureProgress } from "../progress";
import { layoutMap } from "./map";

const DAY = 86_400_000;

/** Card art: one image per lecture in ./cards, named by lecture id, any image format. */
const ART: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("./cards/*.{png,jpg,jpeg,gif,webp,avif,svg}", { eager: true, query: "?url", import: "default" })).map(
    ([path, url]) => [path.replace(/^.*\//, "").replace(/\.\w+$/, ""), url],
  ),
);

type View = "path" | "all" | "released";
const VIEWS: { id: View; label: string }[] = [
  { id: "path", label: "Path" },
  { id: "all", label: "All" },
  { id: "released", label: "Released" },
];
const VIEW_KEY = "cohsonus.hub.view";

function savedView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (VIEWS.some((x) => x.id === v)) return v as View;
  } catch {
    /* no storage: start on the path */
  }
  return "path";
}

function status(l: LectureEntry, p?: LectureProgress) {
  if (!l.def) return "soon" as const;
  if (!p) return "new" as const;
  if (l.def.parts.every((x) => p.parts.includes(x.id))) return "done" as const;
  return p.parts.length || Object.keys(p.steps).length ? ("started" as const) : ("new" as const);
}

export function Hub() {
  const all = useAllProgress();
  const [view, setView] = useState<View>(savedView);
  const scroller = useRef<HTMLDivElement>(null);
  const next = LECTURES.find((l) => l.def && status(l, all[l.id]) !== "done") ?? LECTURES.find((l) => !l.def);

  const choose = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* the choice then lasts for this visit */
    }
  };

  useEffect(() => {
    const el = scroller.current;
    const card = el?.querySelector<HTMLElement>(`[data-id="${next?.id}"]`);
    if (!el || !card) return;
    const top = card.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    el.scrollTop = Math.max(0, top - el.clientHeight / 2 + card.clientHeight / 2);
  }, [view]);

  const cardProps = (l: LectureEntry) => ({ lecture: l, progress: all[l.id], isNext: l.id === next?.id });

  return (
    <div className="hub">
      <header className="hub-top">
        <span className="mono wordmark">cohsonus</span>
        <nav className="hub-views" aria-label="Show lectures as">
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id ? "on" : ""} aria-pressed={view === v.id} onClick={() => choose(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="hub-scroll" ref={scroller}>
        {view === "path" && <PathMap card={cardProps} />}
        {view === "all" && (
          <div className="hub-grid">
            {LECTURES.map((l) => (
              <Card key={l.id} {...cardProps(l)} />
            ))}
          </div>
        )}
        {view === "released" && <Released card={cardProps} />}
      </div>
      <footer className="hub-foot">
        <a href="#/credits">Sounds</a>
      </footer>
    </div>
  );
}

type CardPropsOf = (l: LectureEntry) => { lecture: LectureEntry; progress?: LectureProgress; isNext: boolean };

const CARD_W = 220;
const CARD_H = 258;
const COL = 268;
const ROW = 340;

function PathMap({ card }: { card: CardPropsOf }) {
  const all = useAllProgress();
  const { placed, branches } = layoutMap(LECTURES);
  const pos = new Map(placed.map((p) => [p.id, p]));
  const reach = Math.max(...placed.map((p) => Math.abs(p.x)), ...branches.flatMap((b) => b.via.map((v) => Math.abs(v.x))));
  const width = (reach * 2 + 1) * COL;
  const height = Math.max(...placed.map((p) => p.row)) * ROW + CARD_H;
  const cx = (x: number) => width / 2 + x * COL;
  const walked = (id: string) => status(LECTURES.find((l) => l.id === id)!, all[id]) === "done";

  // down from the bottom of one card to the top of the next, through the gap between rows
  const bend = (x0: number, y0: number, x1: number, y1: number) => {
    const m = (y0 + y1) / 2;
    return `C${x0} ${m}, ${x1} ${m}, ${x1} ${y1}`;
  };

  return (
    <div className="map" style={{ width, height }}>
      <svg className="map-lines" width={width} height={height} aria-hidden>
        {branches.map((b) => {
          const from = pos.get(b.from)!;
          const to = pos.get(b.to)!;
          let x = cx(from.x);
          let y = from.row * ROW + CARD_H;
          let d = `M${x} ${y}`;
          for (const v of b.via) {
            d += ` ${bend(x, y, cx(v.x), v.row * ROW)} L${cx(v.x)} ${v.row * ROW + CARD_H}`;
            x = cx(v.x);
            y = v.row * ROW + CARD_H;
          }
          d += ` ${bend(x, y, cx(to.x), to.row * ROW)}`;
          return <path key={`${b.from}-${b.to}`} className={walked(b.from) ? "walked" : ""} d={d} />;
        })}
      </svg>
      {placed.map((p) => (
        <div key={p.id} className="map-spot" style={{ left: cx(p.x) - CARD_W / 2, top: p.row * ROW, width: CARD_W }}>
          <Card {...card(LECTURES.find((l) => l.id === p.id)!)} size="small" />
        </div>
      ))}
    </div>
  );
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Released({ card }: { card: CardPropsOf }) {
  const out = LECTURES.filter((l) => l.released).sort((a, b) => b.released!.localeCompare(a.released!) || a.number - b.number);
  const coming = LECTURES.filter((l) => !l.released);
  const days = [...new Set(out.map((l) => l.released!))];
  return (
    <div className="released">
      {days.map((d) => (
        <section key={d} className="release-day">
          <h2 className="mono">{DATE.format(new Date(`${d}T12:00:00`))}</h2>
          <div className="hub-grid">
            {out
              .filter((l) => l.released === d)
              .map((l) => (
                <Card key={l.id} {...card(l)} />
              ))}
          </div>
        </section>
      ))}
      {coming.length > 0 && (
        <section className="release-day">
          <h2 className="mono">To come</h2>
          <div className="hub-grid">
            {coming.map((l) => (
              <Card key={l.id} {...card(l)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ lecture, progress, isNext, size = "large" }: { lecture: LectureEntry; progress?: LectureProgress; isNext: boolean; size?: "large" | "small" }) {
  const st = status(lecture, progress);
  const parts = lecture.def?.parts ?? [];
  const minutes = parts.reduce((a, p) => a + p.minutes, 0);
  const doneParts = parts.filter((p) => progress?.parts.includes(p.id)).length;
  const since = progress?.refreshedAt ?? progress?.finishedAt;
  const stale = st === "done" && since !== undefined && Date.now() - since > 14 * DAY;
  const art = ART[lecture.id];
  const body = (
    <>
      <div className="card-figure">
        {art ? <img src={art} alt="" draggable={false} /> : <span className="card-figure-num mono">{String(lecture.number).padStart(2, "0")}</span>}
      </div>
      <div className="card-body">
        <div className="card-num mono">{String(lecture.number).padStart(2, "0")}</div>
        <div className="card-title">{lecture.title}</div>
        <div className="card-meta mono">
          {st === "soon" && "Soon"}
          {st === "new" && `${parts.length} parts · ${minutes} min`}
          {st === "started" && `${doneParts} of ${parts.length} parts`}
          {st === "done" && (stale ? "Due for a refresh" : "Done")}
        </div>
        <div className="card-bar">
          <i style={{ width: `${(doneParts / Math.max(1, parts.length)) * 100}%` }} />
        </div>
      </div>
    </>
  );
  const cls = `card ${size} ${st} ${isNext ? "next" : ""} ${stale ? "stale" : ""}`;
  return (
    <div className="card-slot" data-id={lecture.id}>
      {st === "soon" ? (
        <div className={cls} aria-disabled>
          {body}
        </div>
      ) : (
        <a className={cls} href={`#/l/${lecture.id}`}>
          {body}
        </a>
      )}
      {st === "done" && lecture.def?.refresher && (
        <a className="btn small refresh" href={`#/r/${lecture.id}`}>
          Refresh
        </a>
      )}
    </div>
  );
}
