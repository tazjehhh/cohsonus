import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { LectureEntry } from "../lectures/registry";
import { useDrawings } from "../ui/drawings";
import { CLOSE_DRAWINGS, OPEN_DRAWINGS, UNIT_SECONDS, centred, closing, opening, type Rect } from "./morph";

export type OriginKind = "large" | "compact" | "dot";

export interface PreviewInfo {
  status: "soon" | "new" | "started" | "done";
  /** "6 parts · 115 min", "2 of 6 parts", "Done", "Coming later" */
  meta: string;
  /** Part to start or continue with, 0-based. */
  resume: number;
}

const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The card lifted out of the hub: it dips, grows to about half the screen and settles,
 * the world behind it blurs, then its text comes in block by block. Closing runs it back home.
 */
export function Preview({
  lecture,
  info,
  art,
  origin,
  kind,
  face,
  onClosed,
}: {
  lecture: LectureEntry;
  info: PreviewInfo;
  art?: string;
  origin: Rect;
  kind: OriginKind;
  /** The card as it looks in the hub, worn for the first drawings and the last. */
  face: ReactNode;
  onClosed: () => void;
}) {
  const instant = useMemo(reducedMotion, []);
  const target = useMemo(() => centred(window.innerWidth, window.innerHeight), []);
  const [phase, setPhase] = useState<"open" | "close">("open");
  const [k, setK] = useState(instant ? OPEN_DRAWINGS : 0);
  const startedAt = useRef(performance.now());
  const dialog = useRef<HTMLDivElement>(null);

  const end = phase === "open" ? OPEN_DRAWINGS : CLOSE_DRAWINGS;
  // interface motion: smooth at the screen's rate, timed by the clock so it keeps its speed on any machine
  useDrawings(k < end, () => setK(Math.min(end, (performance.now() - startedAt.current) / 1000 / UNIT_SECONDS)), { smooth: true });

  useEffect(() => {
    if (phase === "close" && k >= CLOSE_DRAWINGS) onClosed();
  }, [phase, k, onClosed]);

  useEffect(() => dialog.current?.focus(), []);

  const close = () => {
    if (phase === "close") return;
    if (instant) return onClosed();
    startedAt.current = performance.now();
    setPhase("close");
    setK(0);
  };

  const pose = phase === "open" ? opening(k, origin, target) : closing(k, origin, target);
  const { rect, scale, veil, text } = pose;
  const block = (i: number): CSSProperties => ({ opacity: text[i], transform: `translateY(${(1 - text[i]) * 6}px)`, visibility: text[i] > 0 ? "visible" : "hidden" });
  const number = String(lecture.number).padStart(2, "0");

  return (
    <div
      className="preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      ref={dialog}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div className="preview-backdrop" style={{ backdropFilter: `blur(${(veil * 10).toFixed(1)}px)`, background: `rgba(10, 10, 12, ${(veil * 0.5).toFixed(3)})` }} onClick={close} />
      <div
        className={`preview-card ${kind} ${pose.asOrigin ? "as-origin" : ""}`}
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, transform: scale === 1 ? undefined : `scale(${scale})` }}
      >
        {pose.asOrigin ? (
          face
        ) : (
          <div className="preview-inner">
            <div className="preview-art" style={{ opacity: kind === "large" ? 1 : pose.art }}>
              {art ? <img src={art} alt="" draggable={false} /> : <span className="card-figure-num mono">{number}</span>}
            </div>
            <div className="preview-text">
              <div className="preview-head" style={block(0)}>
                <span className="mono preview-num">{number}</span>
                <h2 id="preview-title" className="preview-title">
                  {lecture.title}
                </h2>
              </div>
              <p className="preview-desc" style={block(1)}>
                {lecture.summary}
              </p>
              <div className="preview-foot" style={block(2)}>
                <span className="mono preview-meta">{info.meta}</span>
                <div className="row preview-actions">
                  {info.status === "new" && (
                    <a className="btn primary" href={`#/l/${lecture.id}/1`}>
                      Start
                    </a>
                  )}
                  {info.status === "started" && (
                    <a className="btn primary" href={`#/l/${lecture.id}/${info.resume + 1}`}>
                      Continue with part {info.resume + 1}
                    </a>
                  )}
                  {info.status === "done" && (
                    <>
                      {lecture.def?.refresher && (
                        <a className="btn primary" href={`#/r/${lecture.id}`}>
                          Refresh
                        </a>
                      )}
                      <a className="btn" href={`#/l/${lecture.id}`}>
                        Open
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button className="btn quiet small preview-close" style={block(2)} onClick={close} aria-label="Close">
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
