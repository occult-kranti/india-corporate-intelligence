/// <reference types="vite/client" />
import { useCallback, useEffect, useRef, useState } from 'react';
import { createLayout, LAYOUT_TICKS, RELEASE_TICKS, type Layout, type LayoutInput } from './layoutCore';
import type { FromWorker, ToWorker } from './layout.worker';

/**
 * The layout, owned outside React's render cycle.
 *
 * Positions live in a `Float64Array` behind a ref and are never React state: a tick
 * is a buffer swap and a call to `onFrame`, which marks the canvas dirty. React
 * hears about the layout exactly once per settle (`settled` bumps), which is what
 * the camera's fit waits for.
 *
 * Two drivers, one interface. The worker is inline (a Blob URL), because the
 * hand-off `dist/` is opened from `file://` and Chromium refuses a module worker
 * loaded by URL from there. It is imported lazily, so pages that only borrow this
 * module's colours and shapes never download it. The in-thread driver is the same
 * `createLayout` on the main thread, spread across animation frames on the same
 * fixed tick count; it is chosen when `Worker` is missing, the worker chunk fails
 * to load, construction throws, or the worker reports an error — so a gate running
 * where workers fail still exercises a real layout, and `driver` says which ran.
 */

/** Main-thread budget per animation frame for the in-thread driver. */
const FRAME_BUDGET_MS = 10;

export type Driver = 'loading' | 'worker' | 'thread';

interface Job {
  gen: number;
  input: LayoutInput;
}

export function useLayout({
  input,
  reduced,
  onFrame,
}: {
  /** A new object means a new layout. Null clears it. */
  input: LayoutInput | null;
  reduced: boolean;
  /** Called after every new positions buffer — mark dirty, do not set state. */
  onFrame: () => void;
}) {
  const pos = useRef<Float64Array | null>(null);
  /** Ticks run for this component so far, across every layout — monotonic. */
  const ticks = useRef(0);
  const [settled, setSettled] = useState(0);
  const [driver, setDriverState] = useState<Driver>('loading');
  const mode = useRef<Driver>('loading');
  const setDriver = (d: Driver) => {
    mode.current = d;
    setDriverState(d);
  };

  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const worker = useRef<Worker | null>(null);
  const job = useRef<Job | null>(null);
  const genSeq = useRef(0);
  /** Pins applied locally, re-imposed on every buffer so a late buffer cannot snap a dragged node back. */
  const localPins = useRef(new Map<number, { x: number; y: number }>());
  /** Ticks already counted for the current generation. */
  const countedForGen = useRef(0);
  const thread = useRef<{ layout: Layout; raf: number } | null>(null);

  const accept = useCallback((gen: number, buf: Float64Array, genTicks: number, done: boolean) => {
    if (gen !== job.current?.gen) return;
    for (const [i, p] of localPins.current) {
      buf[2 * i] = p.x;
      buf[2 * i + 1] = p.y;
    }
    pos.current = buf;
    ticks.current += genTicks - countedForGen.current;
    countedForGen.current = genTicks;
    onFrameRef.current();
    if (done) setSettled((n) => n + 1);
  }, []);

  const stopThread = () => {
    if (thread.current) cancelAnimationFrame(thread.current.raf);
  };

  /** Run `n` ticks on the main thread: all at once under reduced motion, else ≤ 10 ms per frame. */
  const runThread = useCallback(
    (layout: Layout, gen: number, n: number) => {
      stopThread();
      const count = job.current?.input.r.length ?? 0;
      let left = n;
      let genTicks = countedForGen.current;
      const emit = (done: boolean) => {
        const buf = new Float64Array(count * 2);
        layout.write(buf);
        accept(gen, buf, genTicks, done);
      };
      const t = { layout, raf: 0 };
      thread.current = t;
      if (reducedRef.current) {
        layout.tick(n);
        genTicks += n;
        emit(true);
        return;
      }
      const step = () => {
        const t0 = performance.now();
        while (left > 0 && performance.now() - t0 < FRAME_BUDGET_MS) {
          layout.tick(1);
          left--;
          genTicks++;
        }
        emit(left === 0);
        if (left > 0) t.raf = requestAnimationFrame(step);
      };
      t.raf = requestAnimationFrame(step);
    },
    [accept],
  );

  const post = (m: ToWorker) => worker.current?.postMessage(m);
  const init = (j: Job) => {
    countedForGen.current = 0;
    if (mode.current === 'worker') {
      post({ type: 'init', gen: j.gen, ticks: LAYOUT_TICKS, reduced: reducedRef.current, ...cloneInput(j.input) });
    } else if (mode.current === 'thread') {
      runThread(createLayout(j.input), j.gen, LAYOUT_TICKS);
    }
    // 'loading': the loader starts the pending job once it knows which driver it has.
  };
  const initRef = useRef(init);
  initRef.current = init;

  // ---- driver ----
  useEffect(() => {
    let dead = false;
    const fallBack = () => {
      if (dead) return;
      worker.current?.terminate();
      worker.current = null;
      setDriver('thread');
      if (job.current) initRef.current(job.current);
    };
    if (typeof Worker === 'undefined') {
      fallBack();
      return () => {
        dead = true;
      };
    }
    import('./layout.worker?worker&inline')
      .then(({ default: LayoutWorker }) => {
        if (dead) return;
        let w: Worker;
        try {
          w = new LayoutWorker();
        } catch {
          fallBack();
          return;
        }
        w.onmessage = (ev: MessageEvent<FromWorker>) => {
          const m = ev.data;
          if (m.type === 'pos') accept(m.gen, m.pos, m.ticks, m.done);
        };
        w.onerror = (ev) => {
          ev.preventDefault();
          fallBack();
        };
        worker.current = w;
        setDriver('worker');
        if (job.current) initRef.current(job.current);
      })
      .catch(fallBack);
    return () => {
      dead = true;
      stopThread();
      worker.current?.terminate();
      worker.current = null;
      mode.current = 'loading';
    };
  }, [accept]);

  // ---- a new layout per input ----
  useEffect(() => {
    stopThread();
    localPins.current = new Map();
    if (!input) {
      job.current = null;
      pos.current = null;
      post({ type: 'stop' });
      onFrameRef.current();
      return;
    }
    const j = { gen: ++genSeq.current, input };
    job.current = j;
    for (let i = 0; i < input.r.length; i++) {
      const x = input.pinned[2 * i];
      if (!Number.isNaN(x)) localPins.current.set(i, { x, y: input.pinned[2 * i + 1] });
    }
    initRef.current(j);
  }, [input, reduced]);

  /** Pin node `i` at (x, y): drawn there at once, honoured by the layout from its next tick. */
  const pin = useCallback((i: number, x: number, y: number) => {
    const j = job.current;
    if (!j) return;
    localPins.current.set(i, { x, y });
    const buf = pos.current;
    if (buf) {
      buf[2 * i] = x;
      buf[2 * i + 1] = y;
    }
    if (mode.current === 'worker') worker.current?.postMessage({ type: 'pin', gen: j.gen, i, x, y } satisfies ToWorker);
    else thread.current?.layout.pin(i, x, y);
    onFrameRef.current();
  }, []);

  /** Release every pin and let the layout re-settle around the change. */
  const release = useCallback(() => {
    const j = job.current;
    if (!j) return;
    localPins.current = new Map();
    if (mode.current === 'worker') {
      worker.current?.postMessage({ type: 'release', gen: j.gen, ticks: RELEASE_TICKS, reduced: reducedRef.current } satisfies ToWorker);
    } else if (thread.current) {
      thread.current.layout.release();
      runThread(thread.current.layout, j.gen, RELEASE_TICKS);
    }
  }, [runThread]);

  return { pos, ticks, settled, driver, pin, release };
}

/** The worker receives copies, so the caller's arrays stay the caller's. */
function cloneInput(i: LayoutInput): LayoutInput {
  return { r: i.r.slice(), band: i.band.slice(), links: i.links.slice(), pinned: i.pinned.slice() };
}
