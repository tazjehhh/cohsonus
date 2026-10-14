import { useCallback, useEffect, useState } from "react";
import type { LectureDef, PartDef } from "./types";
import { getProgress, updateProgress, useProgress } from "../progress";
import { stopAll } from "../audio/player";
import { ListenList } from "../ui/ListenList";

type Screen = { kind: "cover" } | { kind: "intro"; part: number } | { kind: "step"; part: number; step: number } | { kind: "outro"; part: number };

const key = (p: PartDef, i: number) => `${p.id}/${p.steps[i].id}`;

export function LectureView({ lecture, startPart }: { lecture: LectureDef; startPart?: number }) {
  const progress = useProgress(lecture.id);
  const [screen, setScreen] = useState<Screen>(() => {
    if (startPart === undefined || !lecture.parts[startPart]) return { kind: "cover" };
    // opened to continue a part: pick up at the step where the learner left it, as the cover's Continue does
    const at = getProgress(lecture.id);
    const unfinished = !at.parts.includes(lecture.parts[startPart].id);
    if (unfinished && at.part === startPart && at.step > 0 && at.step < lecture.parts[startPart].steps.length) return { kind: "step", part: startPart, step: at.step };
    return { kind: "intro", part: startPart };
  });

  const go = useCallback(
    (s: Screen) => {
      stopAll();
      setScreen(s);
      if (s.kind === "step") updateProgress(lecture.id, (p) => ({ ...p, part: s.part, step: s.step }));
      if (s.kind === "intro") updateProgress(lecture.id, (p) => ({ ...p, part: s.part, step: 0 }));
      window.scrollTo(0, 0);
    },
    [lecture.id],
  );

  useEffect(() => () => stopAll(), []);

  const exit = () => {
    stopAll();
    location.hash = "#/";
  };

  return (
    <div className="lecture" data-lecture={lecture.id}>
      <header className="lecture-top">
        <button className="btn quiet small" onClick={exit} aria-label="Back to all lectures">
          ✕
        </button>
        <button className="lecture-title" onClick={() => go({ kind: "cover" })}>
          <span className="mono">{String(lecture.number).padStart(2, "0")}</span> {lecture.title}
        </button>
        <Dots lecture={lecture} screen={screen} />
      </header>
      <main className="lecture-stage">
        {screen.kind === "cover" && <Cover lecture={lecture} go={go} />}
        {screen.kind === "intro" && <Intro lecture={lecture} part={screen.part} go={go} />}
        {screen.kind === "step" && (
          <StepScreen key={key(lecture.parts[screen.part], screen.step)} lecture={lecture} part={screen.part} step={screen.step} go={go} progress={progress.steps} />
        )}
        {screen.kind === "outro" && <Outro lecture={lecture} part={screen.part} go={go} />}
      </main>
    </div>
  );
}

function Dots({ lecture, screen }: { lecture: LectureDef; screen: Screen }) {
  if (screen.kind !== "step" && screen.kind !== "intro" && screen.kind !== "outro") return <span className="dots" />;
  const part = lecture.parts[screen.part];
  const at = screen.kind === "step" ? screen.step : screen.kind === "outro" ? part.steps.length : -1;
  return (
    <span className="dots" aria-label={`Part ${screen.part + 1}, step ${Math.max(0, at) + 1} of ${part.steps.length}`}>
      <span className="label">Part {screen.part + 1}</span>
      {part.steps.map((s, i) => (
        <i key={s.id} className={i < at ? "past" : i === at ? "now" : ""} />
      ))}
    </span>
  );
}

function Cover({ lecture, go }: { lecture: LectureDef; go: (s: Screen) => void }) {
  const p = useProgress(lecture.id);
  const next = lecture.parts.findIndex((x) => !p.parts.includes(x.id));
  const resume = next === -1 ? 0 : next;
  const started = p.parts.length > 0 || Object.keys(p.steps).length > 0;
  return (
    <div className="col cover fade-in">
      <div className="mono cover-num">{String(lecture.number).padStart(2, "0")}</div>
      <h1 className="cover-title">{lecture.title}</h1>
      <ol className="parts">
        {lecture.parts.map((part, i) => {
          const done = p.parts.includes(part.id);
          return (
            <li key={part.id}>
              <button className={`part ${done ? "done" : ""} ${i === resume && next !== -1 ? "next" : ""}`} onClick={() => go({ kind: "intro", part: i })}>
                <span className="mono">{i + 1}</span>
                <span className="part-title">{part.title}</span>
                <span className="mono part-min">{done ? "✓" : `${part.minutes} min`}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="row">
        {next !== -1 && (
          <button
            className="btn primary"
            onClick={() => {
              const at = getProgress(lecture.id);
              if (started && at.part === resume && at.step > 0) go({ kind: "step", part: resume, step: at.step });
              else go({ kind: "intro", part: resume });
            }}
          >
            {started ? `Continue with part ${resume + 1}` : "Start"}
          </button>
        )}
        {next === -1 && lecture.refresher && (
          <a className="btn primary" href={`#/r/${lecture.id}`}>
            Refresh
          </a>
        )}
      </div>
    </div>
  );
}

function Intro({ lecture, part, go }: { lecture: LectureDef; part: number; go: (s: Screen) => void }) {
  const p = lecture.parts[part];
  useEnter(() => go({ kind: "step", part, step: 0 }), true);
  return (
    <div className="col intro fade-in">
      <div className="label">
        Part {part + 1} · {p.minutes} min
      </div>
      <h1 className="intro-title">{p.title}</h1>
      {p.note && <p className="sub">{p.note}</p>}
      <button className="btn primary" onClick={() => go({ kind: "step", part, step: 0 })}>
        Begin
      </button>
    </div>
  );
}

function StepScreen({
  lecture,
  part,
  step,
  go,
  progress,
}: {
  lecture: LectureDef;
  part: number;
  step: number;
  go: (s: Screen) => void;
  progress: Record<string, unknown>;
}) {
  const p = lecture.parts[part];
  const k = key(p, step);
  const doneBefore = k in progress;
  const [done, setDone] = useState(doneBefore);
  const { C } = p.steps[step];

  const complete = useCallback(
    (data?: unknown) => {
      setDone(true);
      updateProgress(lecture.id, (x) => ({ ...x, steps: { ...x.steps, [k]: data ?? true } }));
    },
    [lecture.id, k],
  );

  const next = () => {
    if (step + 1 < p.steps.length) go({ kind: "step", part, step: step + 1 });
    else {
      updateProgress(lecture.id, (x) => ({
        ...x,
        parts: x.parts.includes(p.id) ? x.parts : [...x.parts, p.id],
        finishedAt: x.finishedAt ?? (lecture.parts.every((q) => q.id === p.id || x.parts.includes(q.id)) ? Date.now() : undefined),
      }));
      go({ kind: "outro", part });
    }
  };
  const back = () => (step > 0 ? go({ kind: "step", part, step: step - 1 }) : go({ kind: "intro", part }));

  useEnter(next, done);

  return (
    <>
      <div className="step fade-in">
        <C complete={complete} done={done} saved={progress[k]} memory={progress} />
      </div>
      <footer className="lecture-bottom">
        <button className="btn quiet" onClick={back}>
          ← Back
        </button>
        <button className="btn primary" disabled={!done} onClick={next}>
          Continue
        </button>
        <span className="spacer" />
      </footer>
    </>
  );
}

function Outro({ lecture, part, go }: { lecture: LectureDef; part: number; go: (s: Screen) => void }) {
  const p = lecture.parts[part];
  const last = part + 1 >= lecture.parts.length;
  return (
    <div className="col outro fade-in">
      <div className="label">End of part {part + 1}</div>
      <h1 className="intro-title">{p.title}</h1>
      {p.homework && (
        <div className="homework">
          <div className="label">Assignment</div>
          <p>{p.homework.task}</p>
          {p.homework.listen && <ListenList items={p.homework.listen} />}
        </div>
      )}
      <div className="row">
        <a className="btn" href="#/">
          All lectures
        </a>
        {!last && (
          <button className="btn primary" onClick={() => go({ kind: "intro", part: part + 1 })}>
            Part {part + 2}: {lecture.parts[part + 1].title}
          </button>
        )}
        {last && (
          <button className="btn primary" onClick={() => go({ kind: "cover" })}>
            Finish
          </button>
        )}
      </div>
    </div>
  );
}

function useEnter(fn: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "Enter" || el.tagName === "TEXTAREA" || el.tagName === "BUTTON" || el.tagName === "A" || el.tagName === "INPUT") return;
      e.preventDefault();
      fn();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fn, enabled]);
}
