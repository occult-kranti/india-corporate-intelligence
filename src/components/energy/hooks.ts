import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';

/**
 * Small hooks shared by the /energy components.
 *
 * Every URL write goes through `usePatch`, which always replaces: the page's
 * controls change the view, not the reader's place in history, so Back leaves
 * the page instead of undoing a checkbox.
 */

export function useMedia(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [on, setOn] = useState(get);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const h = () => setOn(m.matches);
    h();
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, [query]);
  return on;
}

/** Below 640: stacked tables, the bottom sheet, the reading key above the canvas. */
export const useNarrow = () => useMedia('(max-width: 639px)');

export type Patch = (kv: Record<string, string | null>) => void;

/**
 * URL state with a synchronous render.
 *
 * React Router 7 applies navigations inside `startTransition`, so the address bar
 * changes a frame or more BEFORE the page does — a reader (or a test) who reads the
 * URL and then the page sees two different states. `patch` therefore renders the new
 * state first, synchronously, from a local mirror of the params, and only then
 * writes the URL; the mirror is dropped as soon as the router has caught up.
 * `patchQuiet` is for effects, where a synchronous render is not allowed.
 */
export function usePatch(): [URLSearchParams, Patch, Patch] {
  const [routerParams, setParams] = useSearchParams();
  const routerRaw = routerParams.toString();
  const [override, setOverride] = useState<string | null>(null);
  useEffect(() => {
    if (override != null && routerRaw === override) setOverride(null);
  }, [routerRaw, override]);
  const raw = override ?? routerRaw;
  const current = useRef(raw);
  current.current = raw;
  const params = useMemo(() => new URLSearchParams(raw), [raw]);
  const next = (kv: Record<string, string | null>) => {
    const n = new URLSearchParams(current.current);
    for (const [k, v] of Object.entries(kv)) {
      if (v == null || v === '') n.delete(k);
      else n.set(k, v);
    }
    return n.toString();
  };
  const patch = useCallback<Patch>(
    (kv) => {
      const s = next(kv);
      current.current = s;
      flushSync(() => setOverride(s));
      setParams(new URLSearchParams(s), { replace: true });
    },
    [setParams],
  );
  const patchQuiet = useCallback<Patch>(
    (kv) => {
      const s = next(kv);
      current.current = s;
      setOverride(s);
      setParams(new URLSearchParams(s), { replace: true });
    },
    [setParams],
  );
  return [params, patch, patchQuiet];
}

/**
 * Hand focus to the margin's heading once the answer has rendered.
 *
 * A screen reader cannot perceive a scroll, so an answer written from outside the
 * canvas (a ledger row, a constituent, a twin row) moves focus to the heading that
 * names it. The aside consumes the flag in an effect keyed on its heading, so the
 * focus lands on the NEW heading, not the one about to be replaced.
 */
export const marginFocus = { pending: false };

export const MARGIN_HEADING_ID = 'energy-margin-heading';

export function focusMarginHeading() {
  const h = document.getElementById(MARGIN_HEADING_ID);
  if (!h) return;
  if (window.innerWidth >= 1280) {
    document.getElementById('stage')?.scrollIntoView({ block: 'start', behavior: 'auto' });
    h.focus({ preventScroll: true });
  } else {
    h.focus();
  }
}

export function requestMarginFocus() {
  marginFocus.pending = true;
  // If the heading does not change (the same claim clicked twice) no effect fires;
  // this second attempt covers that case and is harmless otherwise.
  window.setTimeout(() => {
    if (!marginFocus.pending) return;
    marginFocus.pending = false;
    focusMarginHeading();
  }, 400);
}

/** One focus ring for every control on the page — visible on programmatic focus as well as keyboard. */
export const FOCUS = 'focus:outline-2 focus:outline-accent focus:outline-offset-2 focus:transition-none';

/**
 * Visually hidden, but NOT the usual 1px absolutely positioned box: that box's text
 * overflows it sideways, and on a phone every such element reads as a sideways
 * scroller. A full-width, 1px-tall, clipped block wraps its text instead.
 */
export const VH = 'h-px overflow-hidden [clip-path:inset(50%)] whitespace-normal';
