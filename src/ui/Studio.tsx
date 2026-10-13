import { useState, type ReactNode } from "react";
import type { Loop } from "../music/model";
import type { Miss } from "../music/checks";
import { usePlayer } from "../audio/usePlayer";
import type { ChannelOpts } from "../audio/mixer";
import { PlayButton } from "./PlayButton";
import { StepGrid, type GridLane } from "./StepGrid";
import { DrumStaff } from "./DrumStaff";

/**
 * A pattern, its sound and its notation from one Loop.
 * Owns its own player; edits are heard on the next pass of the playhead.
 */
export function Studio({
  loop,
  onChange,
  lanes,
  staff = true,
  velocity,
  misses,
  showSwing,
  tempo,
  swing,
  bars,
  extra,
  channels,
  accent,
  onPlay,
  initialBar = 0,
  barExtra,
}: {
  loop: Loop;
  onChange?: (l: Loop) => void;
  lanes: GridLane[];
  staff?: boolean;
  velocity?: boolean;
  misses?: Miss[];
  showSwing?: boolean;
  tempo?: [number, number];
  swing?: boolean;
  /** Show bar tabs for multi-bar loops. */
  bars?: boolean;
  extra?: ReactNode;
  channels?: Record<string, ChannelOpts>;
  accent?: string;
  onPlay?: () => void;
  initialBar?: number;
  barExtra?: ReactNode;
}) {
  const t = usePlayer(loop, channels);
  const perBar = loop.stepsPerBeat * loop.beatsPerBar;
  const [bar, setBar] = useState(initialBar);
  const multi = bars && loop.bars > 1;
  const from = multi ? bar * perBar : 0;
  const count = multi ? perBar : undefined;
  const playingBar = t.step != null ? Math.floor(t.step / perBar) : null;

  return (
    <div className="panel studio">
      <div className="toolbar">
        <PlayButton
          playing={t.playing}
          onClick={() => {
            if (!t.playing) onPlay?.();
            t.toggle();
          }}
          step={t.step}
          stepsPerBeat={loop.stepsPerBeat}
        />
        {tempo && (
          <label className="field">
            Tempo
            <input
              type="range"
              min={tempo[0]}
              max={tempo[1]}
              value={loop.bpm}
              onChange={(e) => onChange?.({ ...loop, bpm: Number(e.target.value) })}
            />
            <span className="readout">{loop.bpm} BPM</span>
          </label>
        )}
        {swing && (
          <label className="field">
            Swing
            <input
              type="range"
              min={50}
              max={75}
              value={Math.round((loop.swing ?? 0.5) * 100)}
              onChange={(e) => onChange?.({ ...loop, swing: Number(e.target.value) / 100 })}
            />
            <span className="readout">{Math.round((loop.swing ?? 0.5) * 100)}%</span>
          </label>
        )}
        {extra}
      </div>
      {multi && (
        <div className="bartabs" role="tablist">
          {Array.from({ length: loop.bars }, (_, i) => (
            <button key={i} role="tab" aria-selected={bar === i} className={`${bar === i ? "on" : ""} ${playingBar === i ? "live" : ""}`} onClick={() => setBar(i)}>
              Bar {i + 1}
            </button>
          ))}
          {barExtra}
        </div>
      )}
      <StepGrid
        loop={loop}
        lanes={lanes}
        onChange={onChange}
        step={t.step}
        from={from}
        count={count}
        velocity={velocity}
        misses={misses}
        showSwing={showSwing}
        accent={accent}
        onHit={(lane, note) => {
          if (!t.playing) void t.player.audition(lane, note);
        }}
      />
      {staff && <DrumStaff loop={loop} laneIds={lanes.map((l) => l.id)} step={t.step} from={from} count={count} />}
    </div>
  );
}
