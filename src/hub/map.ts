export interface MapNode {
  id: string;
  after: string[];
}

export interface Placed {
  id: string;
  row: number;
  /** centre of its slot, in card columns from the middle of the map */
  x: number;
}

export interface Branch {
  from: string;
  to: string;
  /** where the line crosses the rows in between, through a gap left for it */
  via: { row: number; x: number }[];
}

/** Width of the gap a line takes when it passes a row, in card columns. */
const PASS = 0.3;

/**
 * Lays lectures out as a tree that branches downward: each sits one row below the
 * deepest lecture it branches from. A line that skips rows gets its own gap in each
 * row it passes, so it never runs behind a card. Rows are ordered by where their
 * parents sit, which keeps lines from crossing where it can.
 */
export function layoutMap(nodes: MapNode[]): { placed: Placed[]; branches: Branch[] } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    const parents = (byId.get(id)?.after ?? []).filter((p) => byId.has(p));
    const d = parents.length ? 1 + Math.max(...parents.map(depthOf)) : 0;
    depth.set(id, d);
    return d;
  };

  // every slot: a lecture, or a gap for a line passing through
  type Slot = { key: string; width: number; above: string[]; order: number };
  const rows: Slot[][] = [];
  const add = (row: number, s: Slot) => (rows[row] ??= []).push(s);
  nodes.forEach((n, i) => add(depthOf(n.id), { key: n.id, width: 1, above: [], order: i }));
  const branches: { from: string; to: string; keys: string[] }[] = [];
  for (const n of nodes) {
    for (const p of n.after.filter((p) => byId.has(p))) {
      const keys: string[] = [];
      let prev = p;
      for (let r = depthOf(p) + 1; r < depthOf(n.id); r++) {
        const key = `${p}>${n.id}@${r}`;
        add(r, { key, width: PASS, above: [prev], order: nodes.indexOf(n) });
        keys.push(key);
        prev = key;
      }
      rows[depthOf(n.id)].find((s) => s.key === n.id)!.above.push(prev);
      branches.push({ from: p, to: n.id, keys });
    }
  }

  const x = new Map<string, number>();
  for (const row of rows) {
    const pull = (s: Slot) => {
      const xs = s.above.map((k) => x.get(k)!);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    };
    const sorted = row.map((s) => ({ s, at: pull(s) })).sort((a, b) => a.at - b.at || a.s.order - b.s.order);
    const total = sorted.reduce((a, o) => a + o.s.width, 0);
    let edge = -total / 2;
    for (const { s } of sorted) {
      x.set(s.key, edge + s.width / 2);
      edge += s.width;
    }
  }

  return {
    placed: nodes.map((n) => ({ id: n.id, row: depthOf(n.id), x: x.get(n.id)! })),
    branches: branches.map((b) => ({ from: b.from, to: b.to, via: b.keys.map((k) => ({ row: Number(k.split("@")[1]), x: x.get(k)! })) })),
  };
}
