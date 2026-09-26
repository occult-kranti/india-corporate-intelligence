import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, type SimulationNodeDatum } from 'd3-force';

/**
 * The connection graph's force layout, with no DOM and no React.
 *
 * One definition, run in two places: inside the layout worker, and on the main
 * thread when a worker cannot be had. Both drive it with the same fixed tick
 * count, so the picture is identical whichever ran it — and identical on a fast
 * machine and a slow one, because the count, not a clock, decides when it stops.
 *
 * The forces are the SVG renderer's, unchanged: the family bands (public power
 * left, capital right) are why the graph reads as a flow rather than a hairball.
 * d3 seeds unplaced nodes on its phyllotaxis spiral in index order and its jiggle
 * RNG is a fixed-seed LCG, so a cold start from the same input is reproducible.
 */

/** How far apart the family bands sit, in layout units. Not a pixel measure. */
export const BAND = 230;
/** d3's default alpha decay reaches alphaMin at 300 ticks: "run to the natural end", fixed. */
export const LAYOUT_TICKS = 300;
/** Ticks after releasing pins: a nudge from alpha 0.3, not a re-layout. */
export const RELEASE_TICKS = 120;

export interface LayoutInput {
  /** Collision radius source: the drawn radius of each node. */
  r: Float64Array;
  /** -1 public power, +1 private capital, 0 everything else. */
  band: Int8Array;
  /** Index pairs [s0, t0, s1, t1, …] in edge order. */
  links: Uint32Array;
  /** Pinned positions [x0, y0, …]; NaN where the node is free. */
  pinned: Float64Array;
}

interface N extends SimulationNodeDatum {
  band: number;
  r: number;
}

export interface Layout {
  tick(n: number): void;
  /** Positions into `out` ([x0, y0, x1, y1, …]). */
  write(out: Float64Array): void;
  pin(i: number, x: number, y: number): void;
  /** Free every pinned node and re-energise gently. */
  release(): void;
}

export function createLayout(input: LayoutInput): Layout {
  const count = input.r.length;
  const nodes: N[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const n: N = { band: input.band[i], r: input.r[i] };
    const px = input.pinned[2 * i];
    if (!Number.isNaN(px)) {
      n.x = n.fx = px;
      n.y = n.fy = input.pinned[2 * i + 1];
    }
    nodes[i] = n;
  }
  const links: { source: number; target: number }[] = [];
  for (let k = 0; k < input.links.length; k += 2) links.push({ source: input.links[k], target: input.links[k + 1] });

  // Created stopped: d3's own timer is wall-clock driven, which is the thing that
  // made the picture depend on the machine.
  const sim = forceSimulation<N>(nodes)
    .stop()
    .force('link', forceLink<N, { source: number; target: number }>(links as never).distance(78).strength(0.55))
    .force('charge', forceManyBody().strength(-190))
    .force('collide', forceCollide<N>().radius((d) => d.r + 7))
    .force('x', forceX<N>((d) => d.band * BAND).strength(0.09))
    .force('y', forceY<N>(0).strength(0.05));

  return {
    tick: (n) => {
      if (n > 0) sim.tick(n);
    },
    write: (out) => {
      for (let i = 0; i < count; i++) {
        out[2 * i] = nodes[i].x ?? 0;
        out[2 * i + 1] = nodes[i].y ?? 0;
      }
    },
    pin: (i, x, y) => {
      const n = nodes[i];
      if (!n) return;
      n.x = n.fx = x;
      n.y = n.fy = y;
      n.vx = n.vy = 0;
    },
    release: () => {
      for (const n of nodes) {
        n.fx = null;
        n.fy = null;
      }
      sim.alpha(0.3);
    },
  };
}
