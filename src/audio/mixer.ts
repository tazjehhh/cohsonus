import { audio, masterIn, noiseBuffer, reverbIn } from "./engine";

export interface ChannelOpts {
  /** Old-record treatment: band-limited with surface noise. */
  dusty?: boolean;
  echo?: boolean;
  reverb?: number;
  gain?: number;
}

export class Channel {
  readonly input: GainNode;
  readonly analyser: AnalyserNode;
  private fader: GainNode;
  private level: number;
  private muted = false;
  private crackle: AudioBufferSourceNode | null = null;
  private crackleGain: GainNode | null = null;
  private nodes: AudioNode[] = [];

  constructor(
    readonly id: string,
    readonly opts: ChannelOpts = {},
  ) {
    const c = audio();
    this.level = opts.gain ?? 1;
    this.input = c.createGain();
    this.fader = c.createGain();
    this.fader.gain.value = this.level;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.82;

    let tail: AudioNode = this.input;
    if (opts.dusty) {
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 160;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      tail.connect(hp).connect(lp);
      tail = lp;
      this.nodes.push(hp, lp);
      this.crackleGain = c.createGain();
      this.crackleGain.gain.value = 0.9;
      this.crackleGain.connect(this.fader);
    }
    tail.connect(this.fader);
    this.fader.connect(this.analyser);
    if (opts.echo) {
      const d = c.createDelay(1);
      d.delayTime.value = 0.36;
      const fb = c.createGain();
      fb.gain.value = 0.32;
      const wet = c.createGain();
      wet.gain.value = 0.28;
      tail.connect(d).connect(fb).connect(d);
      d.connect(wet).connect(this.fader);
      this.nodes.push(d, fb, wet);
    }
    this.fader.connect(masterIn());
    const send = c.createGain();
    send.gain.value = opts.reverb ?? 0.1;
    this.fader.connect(send).connect(reverbIn());
    this.nodes.push(send);
  }

  setMuted(m: boolean) {
    this.muted = m;
    const c = audio();
    this.fader.gain.setTargetAtTime(m ? 0 : this.level, c.currentTime, 0.015);
  }

  get isMuted() {
    return this.muted;
  }

  startAmbient() {
    if (!this.crackleGain || this.crackle) return;
    const c = audio();
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    const hiss = noiseBuffer().getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = hiss[i % hiss.length] * 0.006;
      if (Math.random() < 0.0009) d[i] += (Math.random() * 2 - 1) * 0.35;
    }
    const s = c.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.connect(this.crackleGain);
    s.start();
    this.crackle = s;
  }

  stopAmbient() {
    this.crackle?.stop();
    this.crackle?.disconnect();
    this.crackle = null;
  }

  dispose() {
    this.stopAmbient();
    for (const n of [this.input, this.fader, this.analyser, this.crackleGain, ...this.nodes]) n?.disconnect();
  }
}
