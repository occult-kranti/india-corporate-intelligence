import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';

/**
 * The shared camera for every graph on the platform.
 *
 * Extracted rather than copied, because the two graphs disagree about one thing
 * and agree about everything else:
 *
 *   - ForceGraph MEASURES its viewBox from the element, so one unit is one pixel
 *     and there is no dead space around the layout.
 *   - GeoNetwork keeps a FIXED viewBox, because its coordinates are map geometry
 *     and a stretched map is a lie. It letterboxes on purpose.
 *
 * Everything downstream of that — pan, zoom, fit, maximise, the keyboard, the
 * control cluster — is identical, and it is the part that was missing or wrong.
 * Client-to-local conversion goes through the live `getScreenCTM`, which is exact
 * in BOTH cases; the previous hand-rolled `rect.width` arithmetic silently assumed
 * no letterbox and moved the graph at the wrong rate whenever there was one.
 */

export interface View {
  k: number;
  tx: number;
  ty: number;
}

/** A bounding box in local (viewBox) coordinates. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const MIN_K = 0.08;
const MAX_K = 8;
/** One nudge, as a fraction of the frame. Resolution-independent by construction. */
const PAN_FRACTION = 0.12;

export interface Camera {
  view: View;
  /** Ready-made transform for the content group. */
  transform: string;
  dragging: boolean;
  expanded: boolean;
  setExpanded: (v: boolean | ((b: boolean) => boolean)) => void;
  zoomBy: (factor: number) => void;
  panBy: (dx: number, dy: number) => void;
  /** Frame the given box. `null` resets to the untransformed view. */
  fitTo: (box: Box | null) => void;
  /** Client pixels → content coordinates, through the current camera. */
  toLocal: (clientX: number, clientY: number) => { x: number; y: number } | null;
  svgProps: {
    onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
  };
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** True while a child (a node, say) has taken over the pointer. */
  suspend: { current: boolean };
  /** One nudge, in viewBox units, so the buttons and the arrow keys agree. */
  panStep: { x: number; y: number };
}

export function useCamera(
  svgRef: RefObject<SVGSVGElement | null>,
  W: number,
  H: number,
  opts: { maxFitK?: number; onKey?: (key: string) => boolean } = {},
): Camera {
  const { maxFitK = 2.2 } = opts;
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; sx: number; sy: number } | null>(null);
  /** A node drag sets this; the canvas then keeps its hands off the pointer. */
  const suspend = useRef(false);

  /** Client pixels → viewBox units, exact under letterboxing. */
  const toViewBox = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!ctm || !ctm.a || !ctm.d) return null;
      return { x: (clientX - ctm.e) / ctm.a, y: (clientY - ctm.f) / ctm.d, sx: ctm.a, sy: ctm.d };
    },
    [svgRef],
  );

  const toLocal = useCallback(
    (clientX: number, clientY: number) => {
      const p = toViewBox(clientX, clientY);
      if (!p) return null;
      const v = viewRef.current;
      return { x: (p.x - v.tx) / v.k, y: (p.y - v.ty) / v.k };
    },
    [toViewBox],
  );

  /** Zoom about the frame centre, so the thing being looked at stays put. */
  const zoomBy = useCallback(
    (factor: number) =>
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
        return { k, tx: W / 2 - ((W / 2 - v.tx) / v.k) * k, ty: H / 2 - ((H / 2 - v.ty) / v.k) * k };
      }),
    [W, H],
  );

  const panBy = useCallback((dx: number, dy: number) => setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy })), []);

  const fitTo = useCallback(
    (box: Box | null) => {
      if (!box) {
        setView({ k: 1, tx: 0, ty: 0 });
        return;
      }
      const bw = Math.max(1, box.x1 - box.x0);
      const bh = Math.max(1, box.y1 - box.y0);
      // Capped, so a two-node ego view does not balloon into two dinner plates.
      const k = Math.min(maxFitK, Math.max(MIN_K, Math.min(W / bw, H / bh) * 0.94));
      setView({ k, tx: (W - bw * k) / 2 - box.x0 * k, ty: (H - bh * k) / 2 - box.y0 * k });
    },
    [W, H, maxFitK],
  );

  /** Zoom about the cursor, so the thing under the pointer stays under the pointer. */
  const onWheel = useCallback(
    (ev: React.WheelEvent<SVGSVGElement>) => {
      const p = toViewBox(ev.clientX, ev.clientY);
      if (!p) return;
      ev.preventDefault();
      setView((v) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
        return { k, tx: p.x - ((p.x - v.tx) / v.k) * k, ty: p.y - ((p.y - v.ty) / v.k) * k };
      });
    },
    [toViewBox],
  );

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      if (ev.button !== 0 || suspend.current) return;
      const p = toViewBox(ev.clientX, ev.clientY);
      if (!p) return;
      dragRef.current = { x: ev.clientX, y: ev.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty, sx: p.sx, sy: p.sy };
      setDragging(true);
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
    },
    [toViewBox],
  );

  const onPointerMove = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    // Client delta ÷ CTM scale = viewBox delta. Exact, letterbox or not.
    setView((v) => ({ ...v, tx: d.tx + (ev.clientX - d.x) / d.sx, ty: d.ty + (ev.clientY - d.y) / d.sy }));
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  /**
   * Keyboard camera. Arrows pan, +/− zoom, 0 fits, f maximises. The page is only
   * stopped from scrolling when the graph actually consumed the key.
   */
  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (opts.onKey?.(ev.key)) {
        ev.preventDefault();
        return;
      }
      const step = W * PAN_FRACTION * (ev.shiftKey ? 3 : 1);
      const stepY = H * PAN_FRACTION * (ev.shiftKey ? 3 : 1);
      switch (ev.key) {
        case 'ArrowLeft':
          panBy(step, 0);
          break;
        case 'ArrowRight':
          panBy(-step, 0);
          break;
        case 'ArrowUp':
          panBy(0, stepY);
          break;
        case 'ArrowDown':
          panBy(0, -stepY);
          break;
        case '+':
        case '=':
          zoomBy(1.3);
          break;
        case '-':
        case '_':
          zoomBy(1 / 1.3);
          break;
        case 'f':
        case 'F':
          setExpanded((e) => !e);
          break;
        default:
          return;
      }
      ev.preventDefault();
    },
    [W, H, panBy, zoomBy, opts],
  );

  return {
    view,
    transform: `translate(${view.tx},${view.ty}) scale(${view.k})`,
    dragging,
    expanded,
    setExpanded,
    zoomBy,
    panBy,
    fitTo,
    toLocal,
    svgProps: { onWheel, onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerLeave: endDrag },
    onKeyDown,
    suspend,
    panStep: { x: W * PAN_FRACTION, y: H * PAN_FRACTION },
  };
}

export const CAMERA_BTN =
  'font-mono text-[11px] leading-none min-w-[26px] h-[24px] px-1.5 grid place-items-center rounded border border-border-light bg-bg/90 text-text-muted hover:text-accent hover:border-accent transition-colors';

/**
 * Zoom cluster and pan pad.
 *
 * A scroll wheel is neither discoverable nor friendly inside a long scrolling
 * document, and a drag is no use at all to someone driving this from a keyboard.
 * Both clusters are small, in the corners, and out of the way of the picture.
 */
export function CameraControls({
  cam,
  onFit,
  fitLabel = 'Fit the whole graph in the frame (0)',
}: {
  cam: Camera;
  onFit: () => void;
  fitLabel?: string;
}) {
  // The enclosing ExpandShell returns focus here when the maximised view closes.
  const toggleRef = useContext(ExpandToggle);
  return (
    <>
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button onClick={() => cam.zoomBy(1 / 1.3)} title="Zoom out (−)" aria-label="Zoom out" className={CAMERA_BTN}>
          −
        </button>
        <span className="font-mono text-[10px] leading-none h-[24px] px-1.5 grid place-items-center rounded border border-border bg-bg/90 text-text-muted tabular-nums">
          {cam.view.k < 1 ? cam.view.k.toFixed(2) : cam.view.k.toFixed(1)}×
        </span>
        <button onClick={() => cam.zoomBy(1.3)} title="Zoom in (+)" aria-label="Zoom in" className={CAMERA_BTN}>
          +
        </button>
        <button onClick={onFit} title={fitLabel} aria-label="Fit to frame" className={CAMERA_BTN}>
          fit
        </button>
        <button
          ref={toggleRef ?? undefined}
          onClick={() => cam.setExpanded((e) => !e)}
          title={cam.expanded ? 'Back to inline size (f or Escape)' : 'Fill the window (f)'}
          aria-label={cam.expanded ? 'Exit full window' : 'Fill the window'}
          className={`${CAMERA_BTN} !px-2 !text-accent !border-accent/60`}
        >
          {cam.expanded ? '⤡ shrink' : '⤢ maximise'}
        </button>
      </div>

      <PanPad cam={cam} onFit={onFit} />
    </>
  );
}

function PanPad({ cam, onFit }: { cam: Camera; onFit: () => void }) {
  // Matches the arrow keys exactly — same fraction of the frame per press.
  const { x: sx, y: sy } = cam.panStep;
  return (
    <div className="absolute bottom-2 right-2 grid grid-cols-3 gap-0.5" role="group" aria-label="Pan the graph">
      <span />
      <button onClick={() => cam.panBy(0, sy)} title="Pan up (↑)" aria-label="Pan up" className={CAMERA_BTN}>
        ↑
      </button>
      <span />
      <button onClick={() => cam.panBy(sx, 0)} title="Pan left (←)" aria-label="Pan left" className={CAMERA_BTN}>
        ←
      </button>
      <button onClick={onFit} title="Recentre (0)" aria-label="Recentre" className={CAMERA_BTN}>
        ◎
      </button>
      <button onClick={() => cam.panBy(-sx, 0)} title="Pan right (→)" aria-label="Pan right" className={CAMERA_BTN}>
        →
      </button>
      <span />
      <button onClick={() => cam.panBy(0, -sy)} title="Pan down (↓)" aria-label="Pan down" className={CAMERA_BTN}>
        ↓
      </button>
      <span />
    </div>
  );
}

/** The maximise toggle inside an ExpandShell, so the shell can hand focus back to it. */
const ExpandToggle = createContext<RefObject<HTMLButtonElement> | null>(null);

/**
 * Inline, or the whole window.
 *
 * A dense graph inside a 620-pixel band of a long article is a texture. Maximising
 * is not a luxury on this platform, it is the difference between a picture and a
 * smudge — so it is a real overlay, not a taller box you still have to scroll.
 *
 * And because it covers the page, it is a modal dialog (WCAG 2.4.3 / 4.1.2, audit
 * A11Y-001 S5), not just a fixed box:
 *   - role="dialog", aria-modal, a name, and the caption as its description;
 *   - everything outside it is `inert` while it is open — every sibling along the
 *     path from the dialog up to <body>, so the dialog itself stays live without
 *     being moved in the DOM — and Tab cannot reach the page underneath;
 *   - focus moves in on open. The content is remounted inside the overlay, so the
 *     control that opened it is gone and focus would fall to <body>; the dialog takes
 *     it, and a graph that wants its frame focused (ForceGraph, EnergyGraph) does so in
 *     its own effect, which runs after this one;
 *   - on close (Escape, "close", "shrink"), focus that fell to <body> goes to the
 *     inline maximise button, the control that reopens it. A graph may again move it
 *     on to its frame.
 */
export function ExpandShell({
  expanded,
  onClose,
  caption,
  label = 'Graph, filling the window',
  children,
}: {
  expanded: boolean;
  onClose: () => void;
  caption: string;
  /** The dialog's accessible name. */
  label?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const captionId = useId();

  // Focus in on open, back out on close. Skipped on mount: loading a page never moves focus.
  const was = useRef(expanded);
  useEffect(() => {
    if (was.current === expanded) return;
    was.current = expanded;
    const active = document.activeElement;
    const dropped = !active || active === document.body;
    if (expanded) {
      const d = dialogRef.current;
      if (d && !d.contains(active)) d.focus({ preventScroll: true });
    } else if (dropped) {
      toggleRef.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  // The page underneath is inert while the dialog is open.
  useEffect(() => {
    const d = dialogRef.current;
    if (!expanded || !d) return;
    const made: Element[] = [];
    for (let n: Element = d; n !== document.body && n.parentElement; n = n.parentElement) {
      for (const sib of Array.from(n.parentElement.children)) {
        if (sib === n || sib.hasAttribute('inert')) continue;
        sib.setAttribute('inert', '');
        made.push(sib);
      }
    }
    return () => {
      for (const el of made) el.removeAttribute('inert');
    };
  }, [expanded]);

  if (!expanded) return <ExpandToggle.Provider value={toggleRef}>{children}</ExpandToggle.Provider>;
  return (
    <ExpandToggle.Provider value={toggleRef}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-describedby={captionId}
        tabIndex={-1}
        className="fixed inset-0 z-50 bg-bg p-3 flex flex-col outline-none"
      >
        <div className="flex items-baseline justify-between gap-4 mb-2 px-1">
          <p id={captionId} className="font-mono text-[11px] text-text-muted">{caption} · press Escape to close</p>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] px-2 py-0.5 rounded border border-border-light text-text-muted hover:text-accent"
          >
            close
          </button>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </ExpandToggle.Provider>
  );
}
