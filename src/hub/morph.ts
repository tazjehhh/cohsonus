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

/**
 * The choreography is timed in drawings of 1/24 s, the way an animator times a move on a dope
 * sheet, and played back smoothly at the screen's own rate: `k` may fall between drawings.
 */
export const UNIT_SECONDS = 1 / 24;
/** Opening: dip, grow, settle, then the text block by block. */
export const OPEN_DRAWINGS = 18;
/** Closing: text out, shrink home. */
export const CLOSE_DRAWINGS = 8;

const GROW_FROM = 1;
const LANDED = 10;
const TEXT_AT = [11, 13, 15];
const TEXT_DRAWINGS = 3;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect =>
  t <= 0 ? a : t >= 1 ? b : { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;

/** The card as it opens: k = 0 is the card in the hub, OPEN_DRAWINGS is landed with all text in. */
export function opening(k: number, from: Rect, to: Rect): Pose {
  const e = easeOut(clamp01((k - GROW_FROM) / (LANDED - GROW_FROM)));
  // 0–2: a 3% dip that recovers as the growth gets going (anticipation); 10–12: a 1% overshoot that settles
  const dip = k < 2 ? 0.03 * Math.sin((Math.PI * Math.max(0, k)) / 2) : 0;
  const over = k > LANDED && k < LANDED + 2 ? 0.01 * Math.sin((Math.PI * (k - LANDED)) / 2) : 0;
  return {
    rect: lerpRect(from, to, e),
    scale: 1 - dip + over,
    veil: clamp01(k / LANDED),
    art: e,
    text: TEXT_AT.map((at) => clamp01((k - at) / TEXT_DRAWINGS)) as Pose["text"],
    // the card changes from its hub face to the open layout as it starts to move (a cut on action)
    asOrigin: k < GROW_FROM,
  };
}

/** The card as it closes: k = 0 is landed, CLOSE_DRAWINGS is back in the hub. */
export function closing(k: number, from: Rect, to: Rect): Pose {
  // 0–1: text out; 1–8: shrink home, eased in, so it accelerates into place
  const t = clamp01((k - 1) / (CLOSE_DRAWINGS - 1));
  const e = easeIn(t);
  const textOut = clamp01(1 - k);
  return {
    rect: lerpRect(to, from, e),
    scale: 1,
    veil: 1 - t,
    art: 1 - e,
    text: [textOut, textOut, textOut],
    asOrigin: k >= CLOSE_DRAWINGS,
  };
}

/** The grown card: about half the screen, centred. */
export function centred(vw: number, vh: number): Rect {
  const w = Math.min(960, Math.max(680, vw * 0.56));
  const h = Math.min(600, Math.max(420, vh * 0.54));
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}
