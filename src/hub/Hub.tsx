import { useEffect, useRef } from "react";
import { LECTURES, type LectureEntry } from "../lectures/registry";
import { useAllProgress, type LectureProgress } from "../progress";
import { PREVIEWS } from "./previews";

const DAY = 86_400_000;

function status(l: LectureEntry, p?: LectureProgress) {
  if (!l.def) return "soon" as const;
  if (!p) return "new" as const;
  if (l.def.parts.every((x) => p.parts.includes(x.id))) return "done" as const;
  return p.parts.length || Object.keys(p.steps).length ? ("started" as const) : ("new" as const);
}

export function Hub() {
  const all = useAllProgress();
  const track = useRef<HTMLDivElement>(null);
  const next = LECTURES.find((l) => l.def && status(l, all[l.id]) !== "done") ?? LECTURES.find((l) => !l.def);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(`[data-id="${next?.id}"]`);
    if (card) el.scrollLeft = card.offsetLeft - el.clientWidth / 2 + card.clientWidth / 2;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY, behavior: "auto" });
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  return (
    <div className="hub">
      <header className="hub-top">
        <span className="mono wordmark">cohsonus</span>
      </header>
      <div
        className="hub-track"
        ref={track}
        tabIndex={0}
        aria-label="Lectures"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") track.current?.scrollBy({ left: 340, behavior: "smooth" });
          if (e.key === "ArrowLeft") track.current?.scrollBy({ left: -340, behavior: "smooth" });
        }}
      >
        {LECTURES.map((l) => (
          <Card key={l.id} lecture={l} progress={all[l.id]} isNext={l.id === next?.id} />
        ))}
      </div>
      <footer className="hub-foot">
        <a href="#/credits">Sounds</a>
      </footer>
    </div>
  );
}

function Card({ lecture, progress, isNext }: { lecture: LectureEntry; progress?: LectureProgress; isNext: boolean }) {
  const st = status(lecture, progress);
  const Preview = PREVIEWS[lecture.id];
  const parts = lecture.def?.parts ?? [];
  const minutes = parts.reduce((a, p) => a + p.minutes, 0);
  const doneParts = parts.filter((p) => progress?.parts.includes(p.id)).length;
  const since = progress?.refreshedAt ?? progress?.finishedAt;
  const stale = st === "done" && since !== undefined && Date.now() - since > 14 * DAY;
  const body = (
    <>
      <div className="card-figure">{Preview ? <Preview /> : <span className="card-figure-num mono">{String(lecture.number).padStart(2, "0")}</span>}</div>
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
  const cls = `card ${st} ${isNext ? "next" : ""} ${stale ? "stale" : ""}`;
  return (
    <div className="card-slot" data-id={lecture.id}>
      <div className={`node ${st} ${isNext ? "next" : ""}`} aria-hidden />
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
