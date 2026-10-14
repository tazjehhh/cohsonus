import { describe, expect, it } from "vitest";
import { layoutMap, zoneOf } from "../src/hub/map";
import { CLOSE_DRAWINGS, OPEN_DRAWINGS, centred, closing, opening } from "../src/hub/morph";
import { LECTURES } from "../src/lectures/registry";

describe("map", () => {
  const { placed, branches } = layoutMap(LECTURES);
  const at = (id: string) => placed.find((p) => p.id === id)!;

  it("puts every lecture below everything it branches from", () => {
    for (const l of LECTURES) for (const p of l.after) expect(at(l.id).row).toBeGreaterThan(at(p).row);
  });

  it("starts from one root", () => {
    expect(placed.filter((p) => p.row === 0).map((p) => p.id)).toEqual(["anatomy"]);
  });

  it("keeps cards apart and lines out from behind cards", () => {
    const half = 0.5;
    for (const a of placed)
      for (const b of placed) if (a !== b && a.row === b.row) expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(1 - 1e-9);
    for (const br of branches) {
      expect(br.via.length).toBe(at(br.to).row - at(br.from).row - 1);
      for (const v of br.via) for (const c of placed) if (c.row === v.row) expect(Math.abs(c.x - v.x)).toBeGreaterThanOrEqual(half);
    }
  });
});

describe("zones", () => {
  const { placed } = layoutMap(LECTURES);
  for (const focus of ["anatomy", "pulse"]) {
    it(`with ${focus} next, shows down to one row below it and dots the rest`, () => {
      const zones = zoneOf(placed, focus);
      const row = placed.find((p) => p.id === focus)!.row;
      expect([...zones.values()].filter((z) => z === "focus")).toHaveLength(1);
      expect(zones.get(focus)).toBe("focus");
      for (const p of placed) if (p.id !== focus) expect(zones.get(p.id)).toBe(p.row <= row + 1 ? "near" : "far");
    });
  }
});

describe("preview motion", () => {
  const from = { x: 600, y: 500, w: 210, h: 84 };
  const to = centred(1440, 900);

  it("starts on the card in the hub and lands on the centre", () => {
    expect(opening(0, from, to).rect).toEqual(from);
    expect(opening(0, from, to).asOrigin).toBe(true);
    expect(opening(OPEN_DRAWINGS, from, to).rect).toEqual(to);
    expect(opening(OPEN_DRAWINGS, from, to).scale).toBe(1);
    expect(opening(OPEN_DRAWINGS, from, to).text).toEqual([1, 1, 1]);
  });

  it("dips before it grows and overshoots by at most 1%", () => {
    expect(opening(1, from, to).scale).toBeLessThan(1);
    const scales = Array.from({ length: OPEN_DRAWINGS + 1 }, (_, k) => opening(k, from, to).scale);
    expect(Math.max(...scales)).toBeLessThanOrEqual(1.01);
  });

  it("keeps the text out until the card has landed, then brings it in block by block", () => {
    for (let k = 0; k <= OPEN_DRAWINGS; k++) {
      const p = opening(k, from, to);
      if (p.text.some((v) => v > 0)) expect(p.rect).toEqual(to);
      expect(p.text[0]).toBeGreaterThanOrEqual(p.text[1]);
      expect(p.text[1]).toBeGreaterThanOrEqual(p.text[2]);
    }
  });

  it("closes back onto the card in the hub", () => {
    expect(closing(0, from, to).rect).toEqual(to);
    expect(closing(1, from, to).text).toEqual([0, 0, 0]);
    expect(closing(CLOSE_DRAWINGS, from, to).rect).toEqual(from);
    expect(closing(CLOSE_DRAWINGS, from, to).veil).toBe(0);
  });

  it("is about half the screen, centred", () => {
    expect(to.x).toBeCloseTo((1440 - to.w) / 2);
    expect(to.w / 1440).toBeGreaterThan(0.45);
    expect(to.h / 900).toBeGreaterThan(0.45);
  });
});
