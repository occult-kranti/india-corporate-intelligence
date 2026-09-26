import { memo, type ReactNode, type RefObject } from 'react';

/**
 * The connection graph's interaction and accessibility layer.
 *
 * The canvas underneath is a picture and nothing else. This SVG sits exactly on
 * top of it, measured the same way (one viewBox unit per CSS pixel), and does the
 * two things a canvas cannot:
 *
 *   1. It is the camera's element. `camera.tsx` converts client pixels through
 *      this element's live `getScreenCTM`, exactly as it did when the whole graph
 *      was SVG, and every pointer event lands here — the canvas has none.
 *   2. It carries real, focusable elements for WHAT THE READER IS EXAMINING and
 *      nothing else: the selected entity, its neighbours and relationships, the
 *      path, the card's relationship, any denial answering one of those, the
 *      hovered entity and the keyboard cursor. Same roles, names and pressed
 *      states as the SVG graph had. Several hundred tab stops is not access, it is
 *      a trap; the table twin below the graph remains the complete, primary route
 *      for assistive technology, and this layer says so.
 *
 * Positions: rendered from the buffer at render time, then kept current by
 * `syncOverlay`, which the draw loop calls on each new buffer — this layer is never
 * re-rendered per tick. Every child is `pointer-events: none`; hit-testing is the
 * canvas's job, so a pointer and a keyboard can never disagree about what is where.
 */

export interface A11yNode {
  id: string;
  /** Index into the positions buffer. */
  i: number;
  /** The node's shape path, from the same `shapeFor` string the canvas fills. */
  d: string;
  name: string;
  pressed: boolean;
}

export interface A11yEdge {
  /** Index into the renderer's edge list — what focus handlers read back. */
  key: number;
  s: number;
  t: number;
  /** Perpendicular offset from the centre line (parallel edges fan out), signed along s→t. */
  o: number;
  title: string;
  tabbable: boolean;
}

/**
 * A relationship's drawn segment: the line between its endpoints' layout points,
 * moved `o` layout units along the left normal of s→t. One function for the
 * canvas, the hit-test and this layer, so all three put a line in the same place.
 */
export function segOf(pos: Float64Array, s: number, t: number, o: number): [number, number, number, number] {
  const ax = pos[2 * s], ay = pos[2 * s + 1], bx = pos[2 * t], by = pos[2 * t + 1];
  if (!o) return [ax, ay, bx, by];
  const len = Math.hypot(bx - ax, by - ay);
  if (!len) return [ax, ay, bx, by];
  const nx = (-(by - ay) / len) * o;
  const ny = ((bx - ax) / len) * o;
  return [ax + nx, ay + ny, bx + nx, by + ny];
}

/** More than this many examined entities and the layer stops adding stops; the caption says so. */
export const KEYBOARD_CAP = 200;

/** Move every overlay element to the buffer's positions. Attribute writes only; no React. */
export function syncOverlay(svg: SVGSVGElement | null, pos: Float64Array | null) {
  if (!svg || !pos) return;
  for (const el of svg.querySelectorAll<SVGGElement>('g[data-i]')) {
    const i = Number(el.dataset.i);
    el.setAttribute('transform', `translate(${pos[2 * i]},${pos[2 * i + 1]})`);
  }
  for (const el of svg.querySelectorAll<SVGLineElement>('line[data-s]')) {
    const [x1, y1, x2, y2] = segOf(pos, Number(el.dataset.s), Number(el.dataset.t), Number(el.dataset.o) || 0);
    el.setAttribute('x1', String(x1));
    el.setAttribute('y1', String(y1));
    el.setAttribute('x2', String(x2));
    el.setAttribute('y2', String(y2));
  }
}

export interface LayerHandlers {
  onKeyDown: (ev: React.KeyboardEvent<SVGGElement>) => void;
  onFocus: (ev: React.FocusEvent<SVGGElement>) => void;
  onBlur: (ev: React.FocusEvent<SVGGElement>) => void;
}

export default function GraphA11y({
  svgRef,
  W,
  H,
  transform,
  label,
  nodes,
  edges,
  anchor,
  pos,
  handlers,
  svgProps,
  live,
  children,
}: {
  svgRef: RefObject<SVGSVGElement>;
  W: number;
  H: number;
  /** The camera's transform, applied to the examined set exactly as to the canvas. */
  transform: string;
  label: string;
  nodes: A11yNode[];
  edges: A11yEdge[];
  /** The entity whose relationship stops follow it in the tab order. */
  anchor: string | null;
  pos: Float64Array | null;
  handlers: LayerHandlers;
  svgProps: React.SVGProps<SVGSVGElement> & Record<`data-${string}`, string | number | undefined>;
  /** Polite announcement for keyboard-cursor moves. */
  live: string;
  children?: ReactNode;
}) {
  return (
    <>
      <svg
        ref={svgRef}
        // Measured, not assumed: one unit is one pixel, so there is no letterbox
        // and a drag moves the graph exactly as far as the pointer moved.
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        // A group, not an img: role="img" makes every child presentational, which
        // would remove every focusable entity from the accessibility tree.
        role="group"
        aria-label={label}
        {...svgProps}
      >
        <g transform={transform} pointerEvents="none">
          <Examined nodes={nodes} edges={edges} anchor={anchor} pos={pos} handlers={handlers} />
        </g>
        {children}
      </svg>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {live}
      </p>
    </>
  );
}

/** Memoised: a pan or zoom changes only the transform above, never this list. */
const Examined = memo(function Examined({
  nodes,
  edges,
  anchor,
  pos,
  handlers,
}: {
  nodes: A11yNode[];
  edges: A11yEdge[];
  anchor: string | null;
  pos: Float64Array | null;
  handlers: LayerHandlers;
}) {
  if (!pos) return null;
  const stops = edges.filter((e) => e.tabbable);
  const rest = edges.filter((e) => !e.tabbable);
  const edgeEl = (e: A11yEdge) => {
    const [x1, y1, x2, y2] = segOf(pos, e.s, e.t, e.o);
    return (
    <g
      key={`e${e.key}`}
      data-edge={e.key}
      role="img"
      aria-roledescription="relationship"
      aria-label={e.title}
      tabIndex={e.tabbable ? 0 : undefined}
      className="outline-none [&:focus-visible>line]:stroke-accent"
    >
      <line
        data-s={e.s}
        data-t={e.t}
        data-o={e.o}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
      <title>{e.title}</title>
    </g>
    );
  };
  const out: ReactNode[] = [];
  for (const n of nodes) {
    out.push(
      <g
        key={n.id}
        data-id={n.id}
        data-i={n.i}
        transform={`translate(${pos[2 * n.i]},${pos[2 * n.i + 1]})`}
        tabIndex={0}
        role="button"
        aria-pressed={n.pressed}
        aria-label={n.name}
        className="outline-none [&:focus-visible>path]:stroke-accent"
      >
        {/* Invisible until focused; then a real ring, 2.5 px on screen at any zoom. */}
        <path d={n.d} fill="none" stroke="transparent" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      </g>,
    );
    // Relationship stops straight after their entity, so Tab walks from the entity
    // into its relationships and then on — never through relationships first.
    if (n.id === anchor) for (const e of stops) out.push(edgeEl(e));
  }
  if (!anchor || !nodes.some((n) => n.id === anchor)) for (const e of stops) out.push(edgeEl(e));
  for (const e of rest) out.push(edgeEl(e));
  return (
    <g onKeyDown={handlers.onKeyDown} onFocus={handlers.onFocus} onBlur={handlers.onBlur}>
      {out}
    </g>
  );
});
