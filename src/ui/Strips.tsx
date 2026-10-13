import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Player } from "../audio/player";

export interface StripDef {
  id: string;
  title: ReactNode;
  color?: string;
}

/** Live loudness per channel, 0..1. Reads the analyser that sits before each fader. */
export function useLevels(player: Player, ids: string[], playing: boolean) {
  const [levels, setLevels] = useState<Record<string, number>>({});
  const smooth = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!playing) {
      smooth.current = {};
      setLevels({});
      return;
    }
    const buf = new Float32Array(2048);
    let raf = 0;
    const frame = () => {
      const next: Record<string, number> = {};
      for (const id of ids) {
        const a = player.channel(id).analyser;
        a.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const db = 20 * Math.log10(Math.sqrt(sum / buf.length) + 1e-9);
        const v = Math.max(0, Math.min(1, (db + 54) / 48));
        const prev = smooth.current[id] ?? 0;
        next[id] = v > prev ? v : prev * 0.88 + v * 0.12;
      }
      smooth.current = next;
      setLevels(next);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [player, playing, ids.join(",")]);
  return levels;
}

export function Strips({
  player,
  strips,
  playing,
  onMute,
  solo,
  footer,
  muted: mutedProp,
}: {
  player: Player;
  strips: StripDef[];
  playing: boolean;
  onMute?: (id: string, muted: boolean) => void;
  solo?: boolean;
  footer?: (id: string) => ReactNode;
  muted?: Record<string, boolean>;
}) {
  const levels = useLevels(
    player,
    strips.map((s) => s.id),
    playing,
  );
  const [muted, setMuted] = useState<Record<string, boolean>>(mutedProp ?? {});
  const [soloed, setSoloed] = useState<string | null>(null);

  useEffect(() => {
    for (const s of strips) player.setMuted(s.id, !!muted[s.id]);
    // run once with the initial mutes
  }, []);

  const toggleMute = (id: string) => {
    const m = !muted[id];
    setMuted((x) => ({ ...x, [id]: m }));
    player.setMuted(id, m);
    onMute?.(id, m);
  };
  const toggleSolo = (id: string) => {
    const s = soloed === id ? null : id;
    setSoloed(s);
    player.solo(s);
  };

  return (
    <div className="strips">
      {strips.map((s) => {
        const silent = muted[s.id] || (soloed !== null && soloed !== s.id);
        return (
          <div key={s.id} className={`strip ${silent ? "silent" : ""}`} style={{ ["--c" as string]: s.color ?? "var(--ink)" }}>
            <div className="strip-title">{s.title}</div>
            <div className="meter" aria-hidden>
              <i style={{ height: `${Math.round((levels[s.id] ?? 0) * 100)}%` }} />
            </div>
            <div className="strip-buttons">
              <button className={`btn small ${muted[s.id] ? "on" : ""}`} onClick={() => toggleMute(s.id)} aria-pressed={!!muted[s.id]}>
                Mute
              </button>
              {solo && (
                <button className={`btn small ${soloed === s.id ? "on" : ""}`} onClick={() => toggleSolo(s.id)} aria-pressed={soloed === s.id}>
                  Solo
                </button>
              )}
            </div>
            {footer && <div className="strip-foot">{footer(s.id)}</div>}
          </div>
        );
      })}
    </div>
  );
}
