import { describe, expect, it } from "vitest";
import { layoutMap, zoneOf } from "../src/hub/map";
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
