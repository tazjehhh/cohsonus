export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One drawing of the preview: where the card is, how the world behind it looks, how much of the text is in. */
export interface Pose {
  rect: Rect;
  scale: number;
  /** 0..1: blur and dim of everything behind the card */
  veil: number;
  /** 0..1: the grown card's art, for origins that had none (small cards, dots) */
  art: number;
  /** 0..1 per text block: title, description, actions */
  text: [number, number, number];
  /** true while the card still wears the face it had in the hub */
  asOrigin: boolean;
}

/** Drawings of the opening: dip, grow, settle, then the text block by block. */
export const OPEN_DRAWINGS = 18;
/** Drawings of the closing: text out, shrink home. */
export const CLOSE_DRAWINGS = 8;

const GROW_FROM = 2;
const GROW_TO = 10;
const TEXT_AT = [12, 14, 16];
const TEXT_DRAWINGS = 3;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect =>
  t <= 0 ? a : t >= 1 ? b : { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;

/** The card as it opens: drawing 0 is the card in the hub, OPEN_DRAWINGS is landed with all text in. */
export function opening(k: number, from: Rect, to: Rect): Pose {
  // 1: dip in place (anticipation); 2–10: grow to the centre, eased out; 11: overshoot 1%; 12: rest
  const grow = clamp01((k - GROW_FROM + 1) / (GROW_TO - GROW_FROM + 1));
  const e = easeOut(grow);
  const scale = k === 1 ? 0.97 : k === GROW_TO + 1 ? 1.01 : 1;
  const text = TEXT_AT.map((at) => clamp01((k - at + 1) / TEXT_DRAWINGS)) as Pose["text"];
  return {
    rect: k < GROW_FROM ? from : lerpRect(from, to, e),
    scale,
    veil: clamp01(k / GROW_TO),
    art: e,
    text,
    asOrigin: k < GROW_FROM,
  };
}

/** The card as it closes: drawing 0 is landed, CLOSE_DRAWINGS is back in the hub. */
export function closing(k: number, from: Rect, to: Rect): Pose {
  // 1: text out; 2–8: shrink home, eased in, so it accelerates into place
  const t = clamp01((k - 1) / (CLOSE_DRAWINGS - 1));
  const e = easeIn(t);
  return {
    rect: lerpRect(to, from, e),
    scale: 1,
    veil: 1 - t,
    art: 1 - e,
    text: k === 0 ? [1, 1, 1] : [0, 0, 0],
    asOrigin: k >= CLOSE_DRAWINGS,
  };
}

/** The grown card: about half the screen, centred. */
export function centred(vw: number, vh: number): Rect {
  const w = Math.min(960, Math.max(680, vw * 0.56));
  const h = Math.min(600, Math.max(420, vh * 0.54));
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}
