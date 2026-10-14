import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { LECTURES, type LectureEntry } from "../lectures/registry";
import { useAllProgress, type LectureProgress } from "../progress";
import { layoutMap, zoneOf, type Zone } from "./map";
import { Preview, type OriginKind, type PreviewInfo } from "./Preview";
import type { Rect } from "./morph";

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

/** Status, meta line and the part to resume, as the card and its preview show them. */
function cardInfo(l: LectureEntry, p?: LectureProgress) {
  const st = status(l, p);
  const parts = l.def?.parts ?? [];
  const minutes = parts.reduce((a, x) => a + x.minutes, 0);
  const doneParts = parts.filter((x) => p?.parts.includes(x.id)).length;
  const since = p?.refreshedAt ?? p?.finishedAt;
  const stale = st === "done" && since !== undefined && Date.now() - since > 14 * DAY;
  const next = parts.findIndex((x) => !p?.parts.includes(x.id));
  return { st, parts, minutes, doneParts, stale, resume: next === -1 ? 0 : next };
}

type Opened = { id: string; from: Rect; kind: OriginKind; el: HTMLElement };
type OpenFn = (id: string, kind: OriginKind, e: MouseEvent<HTMLElement>) => void;

export function Hub() {
  const all = useAllProgress();
  const [view, setView] = useState<View>(savedView);
  const [opened, setOpened] = useState<Opened | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const open: OpenFn = (id, kind, e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    returnTo.current = el;
    setOpened({ id, kind, el, from: { x: r.left, y: r.top, w: r.width, h: r.height } });
  };
  const closed = useCallback(() => setOpened(null), []);
  // focus goes back to the card once it is visible again
  useEffect(() => {
    if (opened || !returnTo.current) return;
    returnTo.current.focus();
    returnTo.current = null;
  }, [opened]);
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

  const cardProps = (l: LectureEntry) => ({ lecture: l, progress: all[l.id], isNext: l.id === next?.id, onOpen: open, lifted: opened?.id === l.id });
  const openedLecture = opened && LECTURES.find((l) => l.id === opened.id);

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
      <div className={`hub-scroll ${opened ? "locked" : ""}`} ref={scroller}>
        {view === "path" && <PathMap card={cardProps} focus={next?.id} />}
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
      {opened && openedLecture && (
        <Preview
          lecture={openedLecture}
          info={previewInfo(openedLecture, all[openedLecture.id])}
          art={ART[openedLecture.id]}
          origin={opened.from}
          kind={opened.kind}
          face={
            opened.kind === "dot" ? (
              <span className={`map-dot ${openedLecture.def ? "released" : ""}`} />
            ) : (
              <CardFace lecture={openedLecture} progress={all[openedLecture.id]} isNext={openedLecture.id === next?.id} size={opened.kind} />
            )
          }
          onClosed={closed}
        />
      )}
    </div>
  );
}

function previewInfo(l: LectureEntry, p?: LectureProgress): PreviewInfo {
  const i = cardInfo(l, p);
  const meta =
    i.st === "soon"
      ? "Coming later"
      : i.st === "new"
        ? `${i.parts.length} parts · ${i.minutes} min`
        : i.st === "started"
          ? `${i.doneParts} of ${i.parts.length} parts`
          : i.stale
            ? "Done · due for a refresh"
            : "Done";
  return { status: i.st, meta, resume: i.resume };
}

type CardProps = { lecture: LectureEntry; progress?: LectureProgress; isNext: boolean; onOpen: OpenFn; lifted: boolean };
type CardPropsOf = (l: LectureEntry) => CardProps;

const COL = 300;
const FAR_SQUEEZE = 0.55;
/** Box of each kind of node on the path, in px. */
const SIZE: Record<Zone, { w: number; h: number }> = {
  focus: { w: 300, h: 388 },
  near: { w: 210, h: 84 },
  far: { w: 10, h: 10 },
};

function PathMap({ card, focus }: { card: CardPropsOf; focus?: string }) {
  const all = useAllProgress();
  const [hover, setHover] = useState<string | null>(null);
  const { placed, branches } = layoutMap(LECTURES);
  const zones = zoneOf(placed, focus);
  const pos = new Map(placed.map((p) => [p.id, p]));
  const byId = new Map(LECTURES.map((l) => [l.id, l]));
  const reach = Math.max(...placed.map((p) => Math.abs(p.x)), ...branches.flatMap((b) => b.via.map((v) => Math.abs(v.x))));
  const width = (reach * 2 + 1) * COL;
  const done = (id: string) => status(byId.get(id)!, all[id]) === "done";
  // rows of dots draw together under the cards instead of spreading as wide
  const focusRow = pos.get(focus ?? "")?.row ?? 0;
  const cx = (x: number, row: number) => width / 2 + x * COL * (row > focusRow + 1 ? FAR_SQUEEZE : 1);

  // rows are as tall as their tallest node; dots sit closer together than cards
  const rows = Math.max(...placed.map((p) => p.row)) + 1;
  const rowH = Array.from({ length: rows }, (_, r) => Math.max(...placed.filter((p) => p.row === r).map((p) => SIZE[zones.get(p.id)!].h)));
  const rowTop: number[] = [];
  let y = 0;
  for (let r = 0; r < rows; r++) {
    rowTop[r] = y;
    const dots = (k: number) => rowH[k] === SIZE.far.h;
    y += rowH[r] + (r + 1 >= rows ? 0 : dots(r) && dots(r + 1) ? 34 : dots(r + 1) ? 48 : 56);
  }
  const height = rowTop[rows - 1] + rowH[rows - 1];
  const bottomOf = (id: string) => rowTop[pos.get(id)!.row] + SIZE[zones.get(id)!].h;

  // down from the bottom of one node to the top of the next, through the gap between rows
  const bend = (x0: number, y0: number, x1: number, y1: number) => {
    const m = (y0 + y1) / 2;
    return `C${x0} ${m}, ${x1} ${m}, ${x1} ${y1}`;
  };

  const lineClass = (from: string, to: string) => {
    const kind = from === focus ? "ahead" : done(from) ? "walked" : zones.get(to) === "far" ? "far" : "";
    return `${kind} ${hover === from || hover === to ? "lit" : ""}`;
  };

  const point = (id: string) => ({
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover((h) => (h === id ? null : h)),
    onFocus: () => setHover(id),
    onBlur: () => setHover((h) => (h === id ? null : h)),
  });

  return (
    <div className="map" style={{ width, height }}>
      <svg className="map-lines" width={width} height={height} aria-hidden>
        {branches.map((b) => {
          const from = pos.get(b.from)!;
          let x = cx(from.x, from.row);
          // a node shorter than its row drops straight to the row's bottom first, clear of the big card beside it
          let y = rowTop[from.row] + rowH[from.row];
          let d = `M${x} ${bottomOf(b.from)} L${x} ${y}`;
          let x1 = x;
          for (const v of b.via) {
            x1 = cx(v.x, v.row);
            d += ` ${bend(x, y, x1, rowTop[v.row])} L${x1} ${rowTop[v.row] + rowH[v.row]}`;
            x = x1;
            y = rowTop[v.row] + rowH[v.row];
          }
          const to = pos.get(b.to)!;
          d += ` ${bend(x, y, cx(to.x, to.row), rowTop[to.row])}`;
          return <path key={`${b.from}-${b.to}`} className={lineClass(b.from, b.to)} d={d} />;
        })}
      </svg>
      {placed.map((p) => {
        const zone = zones.get(p.id)!;
        const { w, h } = SIZE[zone];
        const l = byId.get(p.id)!;
        return (
          <div key={p.id} className={`map-spot ${zone}`} data-id={p.id} style={{ left: cx(p.x, p.row) - w / 2, top: rowTop[p.row], width: w, height: h }} {...point(p.id)}>
            {zone === "far" ? (
              <Dot lecture={l} side={p.x < 0 ? "left" : "right"} onOpen={card(l).onOpen} lifted={card(l).lifted} />
            ) : (
              <Card {...card(l)} size={zone === "focus" ? "large" : "compact"} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A lecture far down the path: a point on the line, its name when pointed at. */
function Dot({ lecture, side, onOpen, lifted }: { lecture: LectureEntry; side: "left" | "right"; onOpen: OpenFn; lifted: boolean }) {
  return (
    <button
      type="button"
      className={`map-dot ${lecture.def ? "released" : ""}`}
      style={lifted ? { visibility: "hidden" } : undefined}
      aria-label={lecture.def ? lecture.title : `${lecture.title}, soon`}
      onClick={(e) => onOpen(lecture.id, "dot", e)}
    >
      <span className={`map-dot-label ${side}`}>
        <span className="mono">{String(lecture.number).padStart(2, "0")}</span> {lecture.title}
      </span>
    </button>
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

/** The inside of a card: art (large only), number, title, status. */
function CardFace({ lecture, progress, isNext, size }: { lecture: LectureEntry; progress?: LectureProgress; isNext: boolean; size: "large" | "compact" }) {
  const { st, parts, minutes, doneParts, stale } = cardInfo(lecture, progress);
  const art = ART[lecture.id];
  return (
    <div className={`card ${size} ${st} ${isNext ? "next" : ""} ${stale ? "stale" : ""}`}>
      {size === "large" && (
        <div className="card-figure">
          {art ? <img src={art} alt="" draggable={false} /> : <span className="card-figure-num mono">{String(lecture.number).padStart(2, "0")}</span>}
        </div>
      )}
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
    </div>
  );
}

function Card({ lecture, progress, isNext, onOpen, lifted, size = "large" }: CardProps & { size?: "large" | "compact" }) {
  const { st } = cardInfo(lecture, progress);
  return (
    <div className={`card-slot ${size}`} data-id={lecture.id} style={lifted ? { visibility: "hidden" } : undefined}>
      <button type="button" className="card-button" aria-haspopup="dialog" onClick={(e) => onOpen(lecture.id, size, e)}>
        <CardFace lecture={lecture} progress={progress} isNext={isNext} size={size} />
      </button>
      {st === "done" && lecture.def?.refresher && (
        <a className="btn small refresh" href={`#/r/${lecture.id}`}>
          Refresh
        </a>
      )}
    </div>
  );
}
