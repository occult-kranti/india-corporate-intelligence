import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { InvestigationRegistry } from '../domain';
import type { SectorReaderOverlay } from './adapter';
import { sectorReviewRequested, withoutSectorReview } from './adapter';
const SectorReaderPanel = lazy(() => import('./SectorReaderPanel'));
export type SectorReaderState = { phase: 'idle' | 'loading' } | { phase: 'ready'; overlay: SectorReaderOverlay } | { phase: 'error'; message: string };
export type SectorReaderLoader = (base: InvestigationRegistry) => Promise<SectorReaderOverlay>;
const load: SectorReaderLoader = async base => (await import('./loadSectorReader')).loadSectorReader(base);

/** Every Open creates a fresh cancellable attempt. Cancellation invalidates success and failure. */
export function startSectorReaderLoad(base: InvestigationRegistry, onChange: (state: SectorReaderState) => void, loader: SectorReaderLoader = load) {
  let active = true;
  onChange({ phase: 'loading' });
  void Promise.resolve().then(() => active ? loader(base) : null).then(overlay => {
    if (active && overlay) { active = false; onChange({ phase: 'ready', overlay }); }
  }).catch((error: unknown) => {
    if (active) { active = false; onChange({ phase: 'error', message: error instanceof Error ? error.message : 'Sector reader verification failed. The base atlas remains available.' }); }
  });
  return () => { active = false; };
}
export function watchSectorReaderNavigation(onNavigate: () => void, target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window) {
  const invalidate = () => onNavigate();
  const restore = (event: Event) => { if ((event as PageTransitionEvent).persisted) onNavigate(); };
  for (const event of ['popstate', 'hashchange', 'pagehide']) target.addEventListener(event, invalidate);
  target.addEventListener('pageshow', restore);
  return () => {
    for (const event of ['popstate', 'hashchange', 'pagehide']) target.removeEventListener(event, invalidate);
    target.removeEventListener('pageshow', restore);
  };
}
export default function SectorReaderGate({ base, href }: { base: InvestigationRegistry; href: string }) {
  const [state, setState] = useState<SectorReaderState>({ phase: 'idle' });
  const [closed, setClosed] = useState(false);
  const cancel = useRef<(() => void) | null>(null);
  const inFlight = useRef(false);
  const openedFor = useRef<{ base: InvestigationRegistry; href: string } | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setState({ phase: 'idle' });
    const unwatch = watchSectorReaderNavigation(() => {
      cancel.current?.(); inFlight.current = false; openedFor.current = null; setClosed(true);
    });
    return () => { cancel.current?.(); inFlight.current = false; openedFor.current = null; unwatch(); };
  }, [base, href]);
  const closeReader = () => {
    cancel.current?.(); inFlight.current = false; openedFor.current = null; setState({ phase: 'idle' });
  };
  const dismiss = () => { closeReader(); setClosed(true); };
  if (closed || !sectorReviewRequested(new URL(href).search, true, 'full')) return null;
  const ready = state.phase === 'ready' && openedFor.current?.base === base && openedFor.current?.href === href;
  return <>
    <aside hidden={ready} aria-label="Optional sector reader" data-testid="sector-reader-prompt"
      style={{ position: 'fixed', bottom: 18, right: 18, left: 18, margin: 'auto', maxWidth: 620, padding: 20, zIndex: 60, background: '#102e25', color: '#f2e9d5', border: '2px solid #d4b276', borderRadius: 8 }}>
      <strong>Optional source-collection reader</strong>
      <p>Read qualified documentary panels with source dates, unresolved questions, financial context and adjacent responses. Reader admission is separate from retained graph/path holds. The base atlas stays unchanged.</p>
      {state.phase === 'error' ? <p role="alert">{state.message}</p> : null}
      {state.phase === 'loading' ? <p role="status">Verifying the complete baseline, exact reviewed text and separate reader admission…</p> : null}
      <button ref={openButton} type="button" disabled={state.phase === 'loading'} data-testid="sector-reader-open" onClick={() => {
        if (inFlight.current) return;
        inFlight.current = true; openedFor.current = { base, href };
        cancel.current = startSectorReaderLoad(base, next => {
          if (next.phase === 'error' || next.phase === 'ready') inFlight.current = false;
          setState(next);
        });
      }}>{state.phase === 'error' ? 'Retry sector reader' : 'Open sector reader'}</button>{' '}
      {state.phase === 'loading' ? <button type="button" onClick={closeReader}>Cancel verification</button> : <button type="button" onClick={dismiss}>Dismiss reader</button>}{' '}
      <a href={withoutSectorReview(href)} style={{ color: '#fae3a8' }}>Return to base-only URL</a>
    </aside>
    {ready && state.phase === 'ready' ? <Suspense fallback={<aside aria-label="Opening sector reader"><p role="status">Opening sector reader… The base atlas remains unchanged.</p><button type="button" onClick={closeReader}>Cancel opening sector reader</button></aside>}>
      <SectorReaderPanel overlay={state.overlay} href={href} onClose={closeReader} returnFocusTo={openButton} />
    </Suspense> : null}
  </>;
}
