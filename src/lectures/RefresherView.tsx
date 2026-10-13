import { useCallback, useEffect, useState } from "react";
import type { LectureDef } from "./types";
import { updateProgress, useProgress } from "../progress";
import { stopAll } from "../audio/player";

export function RefresherView({ lecture }: { lecture: LectureDef }) {
  const tasks = lecture.refresher ?? [];
  const progress = useProgress(lecture.id);
  const [at, setAt] = useState(-1);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);

  useEffect(() => () => stopAll(), []);

  const complete = useCallback(
    (data?: unknown) => {
      const pass = !!(data as { pass?: boolean } | undefined)?.pass;
      setResults((r) => ({ ...r, [tasks[at].id]: pass }));
      setDone(true);
    },
    [at, tasks],
  );

  const next = () => {
    stopAll();
    setDone(false);
    if (at + 1 < tasks.length) setAt(at + 1);
    else {
      updateProgress(lecture.id, (p) => ({ ...p, refreshedAt: Date.now(), refresh: results }));
      setAt(tasks.length);
    }
  };

  const title = (
    <header className="lecture-top">
      <a className="btn quiet small" href="#/" aria-label="Back to all lectures">
        ✕
      </a>
      <span className="lecture-title">
        <span className="mono">{String(lecture.number).padStart(2, "0")}</span> {lecture.title} · Refresh
      </span>
      <span className="dots">
        {tasks.map((t, i) => (
          <i key={t.id} className={i < at ? "past" : i === at ? "now" : ""} />
        ))}
      </span>
    </header>
  );

  if (at === -1)
    return (
      <div className="lecture">
        {title}
        <main className="lecture-stage">
          <div className="col intro fade-in">
            <div className="label">Refresh · {tasks.length} tasks</div>
            <h1 className="intro-title">{lecture.title}</h1>
            <button className="btn primary" onClick={() => setAt(0)}>
              Begin
            </button>
          </div>
        </main>
      </div>
    );

  if (at >= tasks.length) {
    const missed = tasks.filter((t) => !results[t.id]);
    return (
      <div className="lecture">
        {title}
        <main className="lecture-stage">
          <div className="col outro fade-in">
            <div className="label">Refresh done</div>
            <h1 className="intro-title">
              {tasks.length - missed.length} of {tasks.length}
            </h1>
            {missed.length > 0 && (
              <ol className="parts">
                {missed.map((t) => {
                  const pi = lecture.parts.findIndex((p) => p.id === t.part);
                  const part = lecture.parts[pi];
                  return (
                    <li key={t.id}>
                      <a className="part next" href={`#/l/${lecture.id}/${pi + 1}`}>
                        <span className="mono">{pi + 1}</span>
                        <span className="part-title">{part.title}</span>
                        <span className="mono part-min">{part.minutes} min</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            )}
            <a className="btn primary" href="#/">
              All lectures
            </a>
          </div>
        </main>
      </div>
    );
  }

  const { C, id } = tasks[at];
  return (
    <div className="lecture">
      {title}
      <main className="lecture-stage">
        <div className="step fade-in" key={id}>
          <C complete={complete} done={done} memory={progress.steps} />
        </div>
        <footer className="lecture-bottom">
          <span />
          <button className="btn primary" disabled={!done} onClick={next}>
            Continue
          </button>
          <span />
        </footer>
      </main>
    </div>
  );
}
