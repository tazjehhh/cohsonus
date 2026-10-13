import { audio, unlock } from "./engine";
import { Channel, type ChannelOpts } from "./mixer";
import { VOICES, instrumentOf } from "./voices";
import { load } from "./sampler";
import { loopSteps, stepSeconds, type Lane, type Loop, type Note } from "../music/model";
import { drawingsPerBeat, indexLoop, noteOffset, type Indexed } from "../music/timing";

type Listener = (step: number | null) => void;

let current: Player | null = null;

/** Stops whatever is playing anywhere on the page. */
export function stopAll() {
  current?.stop();
}

/**
 * Plays a Loop on repeat. The Loop is the single source of truth: the grid,
 * the notation and the sound all read the same object, and edits reach the
 * next scheduled step.
 */
export class Player {
  private loop: Loop;
  private index: Map<number, Indexed<Lane>[]>;
  private channels = new Map<string, Channel>();
  private listeners = new Set<Listener>();
  private timer: number | null = null;
  private raf: number | null = null;
  private nextStep = 0;
  private nextTime = 0;
  private queue: { step: number; time: number }[] = [];
  private shown: number | null = null;
  private muted = new Set<string>();
  private soloed: string | null = null;
  /** Audio time at which step 0 of the current cycle started. */
  private origin = 0;
  private run = 0;
  starting = false;
  playing = false;

  constructor(
    loop: Loop,
    private channelOpts: Record<string, ChannelOpts> = {},
  ) {
    this.loop = loop;
    this.index = indexLoop(loop, (i) => loop.lanes[i]);
    if (import.meta.env.DEV) ((window as unknown as { __players: Player[] }).__players ??= []).push(this);
    void this.ready();
  }

  /** Loads every sample the current loop needs. */
  ready() {
    return load(new Set(this.loop.lanes.flatMap((l) => [instrumentOf(l.voice), ...l.notes.filter((n) => n.voice).map((n) => instrumentOf(n.voice!))])));
  }

  setLoop(loop: Loop) {
    if (loop === this.loop) return;
    const total = loopSteps(loop);
    this.loop = loop;
    this.index = indexLoop(loop, (i) => loop.lanes[i]);
    if (this.nextStep >= total) this.nextStep = 0;
    void this.ready();
  }

  getLoop() {
    return this.loop;
  }

  channel(id: string) {
    let ch = this.channels.get(id);
    if (!ch) {
      ch = new Channel(id, this.channelOpts[id]);
      ch.setMuted(this.isSilenced(id));
      this.channels.set(id, ch);
    }
    return ch;
  }

  channelIds() {
    return [...new Set(this.loop.lanes.map((l) => l.channel ?? l.id))];
  }

  private isSilenced(id: string) {
    return this.muted.has(id) || (this.soloed !== null && this.soloed !== id);
  }

  private applyMutes() {
    for (const id of this.channelIds()) this.channel(id).setMuted(this.isSilenced(id));
  }

  setMuted(id: string, m: boolean) {
    if (m) this.muted.add(id);
    else this.muted.delete(id);
    this.applyMutes();
  }

  isMuted(id: string) {
    return this.muted.has(id);
  }

  solo(id: string | null) {
    this.soloed = id;
    this.applyMutes();
  }

  async play(fromStep = 0) {
    if (this.playing || this.starting) return;
    if (current && current !== this) current.stop();
    current = this;
    const run = ++this.run;
    this.starting = true;
    this.emit(null);
    await unlock();
    await this.ready();
    this.starting = false;
    if (current !== this || run !== this.run) return;
    const c = audio();
    for (const id of this.channelIds()) this.channel(id);
    this.applyMutes();
    this.playing = true;
    this.nextStep = fromStep;
    this.nextTime = c.currentTime + 0.08;
    this.origin = this.nextTime - fromStep * stepSeconds(this.loop);
    this.queue = [];
    this.timer = window.setInterval(this.tick, 25);
    this.tick();
    this.raf = requestAnimationFrame(this.frame);
    this.emit(null);
  }

  stop() {
    const was = this.playing || this.starting;
    this.run++;
    this.starting = false;
    if (this.timer !== null) clearInterval(this.timer);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.timer = null;
    this.raf = null;
    this.queue = [];
    this.playing = false;
    if (current === this) current = null;
    this.shown = null;
    if (was) this.emit(null);
  }

  toggle() {
    if (this.playing || this.starting) this.stop();
    else void this.play();
  }

  /** Plays one note right now through a lane's channel. */
  async audition(laneId: string, note: Note) {
    await unlock();
    const lane = this.loop.lanes.find((l) => l.id === laneId);
    if (!lane) return;
    await load([instrumentOf(note.voice ?? lane.voice)]);
    const ch = this.channel(lane.channel ?? lane.id);
    VOICES[note.voice ?? lane.voice](audio().currentTime + 0.01, note, ch.input, stepSeconds(this.loop));
  }

  /** Position in steps (fractional) of an audio time inside the running cycle. */
  positionAt(time: number) {
    const total = loopSteps(this.loop);
    const p = (time - this.origin) / stepSeconds(this.loop);
    return ((p % total) + total) % total;
  }

  /** Number of the drawing on screen at an audio time: at most 24 a second, a new one on every beat. */
  drawingAt(time: number) {
    const beats = (time - this.origin) / (60 / this.loop.bpm);
    return Math.floor(beats * drawingsPerBeat(this.loop.bpm));
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  dispose() {
    this.stop();
    for (const ch of this.channels.values()) ch.dispose();
    this.channels.clear();
    this.listeners.clear();
  }

  private emit(step: number | null) {
    for (const fn of this.listeners) fn(step);
  }

  private tick = () => {
    const c = audio();
    const total = loopSteps(this.loop);
    while (this.nextTime < c.currentTime + 0.12) {
      const sd = stepSeconds(this.loop);
      const step = this.nextStep % total;
      if (step === 0) this.origin = this.nextTime;
      for (const { item: lane, note } of this.index.get(step) ?? []) {
        const t = Math.max(c.currentTime, this.nextTime + noteOffset(note, step, this.loop.swing ?? 0.5, sd));
        const ch = this.channel(lane.channel ?? lane.id);
        VOICES[note.voice ?? lane.voice](t, note, ch.input, sd);
      }
      this.queue.push({ step, time: this.nextTime });
      this.nextTime += sd;
      this.nextStep = (step + 1) % total;
    }
  };

  private frame = () => {
    const now = audio().currentTime;
    let latest: number | null = null;
    while (this.queue.length && this.queue[0].time <= now) latest = this.queue.shift()!.step;
    if (latest !== null && latest !== this.shown) {
      this.shown = latest;
      this.emit(latest);
    }
    if (this.playing) this.raf = requestAnimationFrame(this.frame);
  };
}
