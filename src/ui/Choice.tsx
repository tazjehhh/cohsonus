import { useState, type ReactNode } from "react";

export interface Option {
  id: string;
  label: ReactNode;
}

/**
 * A question with options. With `correct`, a wrong pick can be retried and
 * `onResult` fires once the right one is found. Without it, any pick counts.
 */
export function Choice({
  options,
  correct,
  onResult,
  initial,
  locked,
  wrongText = "Not that one. Listen again.",
}: {
  options: Option[];
  correct?: string;
  onResult: (picked: string, attempts: number) => void;
  initial?: string;
  locked?: boolean;
  wrongText?: string;
}) {
  const [picked, setPicked] = useState<string | null>(initial ?? null);
  const [wrong, setWrong] = useState<string[]>([]);
  const solved = picked !== null && (correct === undefined || picked === correct);
  const pick = (id: string) => {
    if (solved || locked) return;
    if (correct !== undefined && id !== correct) {
      setWrong((w) => [...w, id]);
      return;
    }
    setPicked(id);
    onResult(id, wrong.length + 1);
  };
  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="choices" role="group">
        {options.map((o) => {
          const cls = solved && o.id === picked ? (correct !== undefined ? "right" : "picked") : wrong.includes(o.id) ? "wrong" : "";
          return (
            <button key={o.id} className={`choice ${cls}`} onClick={() => pick(o.id)} disabled={(solved || locked) && o.id !== picked}>
              {o.label}
            </button>
          );
        })}
      </div>
      <div className={`verdict ${wrong.length && !solved ? "miss" : ""}`} aria-live="polite">
        {wrong.length > 0 && !solved ? wrongText : ""}
      </div>
    </div>
  );
}
