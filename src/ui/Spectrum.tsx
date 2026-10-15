import { useEffect, useRef, useState } from "react";
import type { Player } from "../audio/player";
import { audio } from "../audio/engine";
import { useDrawings } from "./drawings";

export interface SpectrumLine {
  id: string;
  name: string;
  color: string;
}

const W = 860;
const H = 280;
const PAD_B = 26;
const LO = 30;
const HI = 16000;
const BANDS = 120;
const TICKS = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

const xOf = (f: number) => (Math.log(f / LO) / Math.log(HI / LO)) * W;

/** Where each channel sits from low to high, drawn on one shared axis. */
export function Spectrum({ player, lines, playing }: { player: Player; lines: SpectrumLine[]; playing: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const memo = useRef<Record<string, Float32Array>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const loudest = useRef<Record<string, Float32Array>>({});
  const bins = useRef<Float32Array<ArrayBuffer> | null>(null);
  const edges = useRef(Array.from({ length: BANDS + 1 }, (_, i) => LO * Math.pow(HI / LO, i / BANDS)));

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    const g = cv.getContext("2d")!;
    g.scale(dpr, dpr);
    ctx.current = g;
  }, []);

  const render = () => {
    const g = ctx.current;
    if (!g) return;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,255,255,0.06)";
    g.lineWidth = 1;
    for (const t of TICKS) {
      g.beginPath();
      g.moveTo(xOf(t), 0);
      g.lineTo(xOf(t), H - PAD_B);
      g.stroke();
    }
    const y = (db: number) => {
      const v = Math.max(0, Math.min(1, (db + 100) / 70));
      return H - PAD_B - v * (H - PAD_B - 8);
    };
    for (const line of lines) {
      const vals = memo.current[line.id];
      if (hidden.has(line.id) || !vals) continue;
      g.beginPath();
      g.moveTo(0, H - PAD_B);
      for (let b = 0; b < BANDS; b++) g.lineTo(((b + 0.5) / BANDS) * W, y(vals[b]));
      g.lineTo(W, H - PAD_B);
      g.closePath();
      g.fillStyle = line.color + "2a";
      g.fill();
      g.beginPath();
      for (let b = 0; b < BANDS; b++) {
        const px = ((b + 0.5) / BANDS) * W;
        if (b === 0) g.moveTo(px, y(vals[b]));
        else g.lineTo(px, y(vals[b]));
      }
      g.strokeStyle = line.color;
      g.lineWidth = 2;
      g.stroke();
    }
    g.fillStyle = "#75746f";
    g.font = "11px 'IBM Plex Mono', monospace";
    g.textAlign = "center";
    for (const t of TICKS) g.fillText(t >= 1000 ? `${t / 1000}k` : String(t), xOf(t), H - 8);
  };

  useEffect(() => {
    if (!playing) render();
  });

  useDrawings(
    playing,
    (dt) => {
      // each band falls 72 dB a second, as before at 1.2 dB per 1/60 s
      for (const line of lines) {
        const peak = loudest.current[line.id];
        if (!peak) continue;
        const prev = memo.current[line.id] ?? new Float32Array(BANDS).fill(-120);
        const vals = new Float32Array(BANDS);
        for (let b = 0; b < BANDS; b++) vals[b] = Math.max(peak[b], prev[b] - 72 * dt);
        memo.current[line.id] = vals;
      }
      loudest.current = {};
      render();
    },
    {
      smooth: true,
      sample: () => {
        const hz = audio().sampleRate / 2;
        for (const line of lines) {
          if (hidden.has(line.id)) continue;
          const a = player.channel(line.id).analyser;
          if (bins.current?.length !== a.frequencyBinCount) bins.current = new Float32Array(a.frequencyBinCount);
          const bs = bins.current;
          a.getFloatFrequencyData(bs);
          const per = hz / bs.length;
          const peak = (loudest.current[line.id] ??= new Float32Array(BANDS).fill(-140));
          for (let b = 0; b < BANDS; b++) {
            const i0 = Math.max(1, Math.floor(edges.current[b] / per));
            const i1 = Math.max(i0 + 1, Math.ceil(edges.current[b + 1] / per));
            for (let i = i0; i < i1 && i < bs.length; i++) if (bs[i] > peak[b]) peak[b] = bs[i];
          }
        }
      },
    },
  );

  return (
    <figure className="spectrum">
      <canvas ref={canvas} style={{ width: W, height: H }} role="img" aria-label="Each channel drawn from low frequencies on the left to high on the right" />
      <figcaption className="legend">
        {lines.map((l) => (
          <button
            key={l.id}
            className={hidden.has(l.id) ? "off" : ""}
            aria-pressed={!hidden.has(l.id)}
            onClick={() =>
              setHidden((h) => {
                const n = new Set(h);
                if (n.has(l.id)) n.delete(l.id);
                else n.add(l.id);
                return n;
              })
            }
          >
            <i style={{ background: l.color }} />
            {l.name}
          </button>
        ))}
        <span className="legend-axis mono">Hz · low → high</span>
      </figcaption>
    </figure>
  );
}
