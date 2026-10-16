import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { InvestigationRegistry } from '../domain';
import type { HistoricalReviewOverlay } from './adapter';
import { withoutHistoricalReview } from './adapter';
const HistoricalReviewPanel = lazy(() => import('./ReviewPanel'));

type State = { phase: 'idle' | 'loading' } | { phase: 'ready'; overlay: HistoricalReviewOverlay } | { phase: 'error'; message: string };
export type HistoricalLoader = (base: InvestigationRegistry) => Promise<HistoricalReviewOverlay>;
const load: HistoricalLoader = async base => (await import('./loadHistoricalReview')).loadHistoricalReview(base);

/** Cancellation invalidates results; a stale review load can never replace the base. */
export function startHistoricalReviewLoad(base: InvestigationRegistry, onChange: (state: State) => void, loader: HistoricalLoader = load) {
  let active = true;
  onChange({ phase: 'loading' });
  void Promise.resolve().then(() => active ? loader(base) : null).then(overlay => {
    if (active && overlay) { active = false; onChange({ phase: 'ready', overlay }); }
  }).catch((error: unknown) => {
    if (active) { active = false; onChange({ phase: 'error', message: error instanceof Error ? error.message : 'Historical review failed verification. The base atlas remains available.' }); }
  });
  return () => { active = false; };
}

/** History/BFCache navigation cancels the session instead of restoring an old opt-in. */
export function watchHistoricalReviewNavigation(onNavigate: () => void, target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window) {
  const invalidate = () => onNavigate();
  const restore = (event: Event) => { if ((event as PageTransitionEvent).persisted) onNavigate(); };
  for (const event of ['popstate', 'hashchange', 'pagehide']) target.addEventListener(event, invalidate);
  target.addEventListener('pageshow', restore);
  return () => {
    for (const event of ['popstate', 'hashchange', 'pagehide']) target.removeEventListener(event, invalidate);
    target.removeEventListener('pageshow', restore);
  };
}

export default function HistoricalReviewGate({ base, href }: { base: InvestigationRegistry; href: string }) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [closed, setClosed] = useState(false);
  const cancel = useRef<(() => void) | null>(null);
  const inFlight = useRef(false);
  const openButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const unwatch = watchHistoricalReviewNavigation(() => {
      cancel.current?.(); inFlight.current = false; setClosed(true);
    });
    return () => { cancel.current?.(); unwatch(); };
  }, [base, href]);
  const dismiss = () => { cancel.current?.(); inFlight.current = false; setClosed(true); };
  // Keep the original Open button mounted, so closing the dialog has a real focus target.
  // A later Open is a fresh explicit opt-in and reruns pinned verification.
  const closeReader = () => { cancel.current?.(); inFlight.current = false; setState({ phase: 'idle' }); };
  if (closed) return null;
  return <>
    <aside hidden={state.phase === 'ready'} aria-label="Optional historical review" style={{position:'fixed',bottom:18,right:18,left:18,margin:'auto',maxWidth:620,padding:20,zIndex:60,background:'#102e25',color:'#f2e9d5',border:'2px solid #d4b276',borderRadius:8}}>
      <strong>Historical review only · 2025-12-31 · PUBLIC_GRAPH_BLOCKED</strong>
      <p>The base atlas is unchanged. Open nine qualified issuer-reported claims in a separate review reader. No new factual map marks or payment/control conclusions are enabled.</p>
      {state.phase === 'error' ? <p role="alert">{state.message}</p> : null}
      {state.phase === 'loading' ? <p role="status">Verifying the exact base snapshot and reviewed payload…</p> : null}
      <button ref={openButton} type="button" disabled={state.phase === 'loading'} onClick={() => {
        if (inFlight.current) return;
        inFlight.current = true;
        cancel.current = startHistoricalReviewLoad(base, next => {
          if (next.phase === 'error' || next.phase === 'ready') inFlight.current = false;
          setState(next);
        });
      }}>{state.phase === 'error' ? 'Retry verified historical review' : 'Open historical review reader'}</button>{' '}
      <button type="button" onClick={dismiss}>Dismiss review</button>{' '}
      <a href={withoutHistoricalReview(href)} style={{color:'#fae3a8'}}>Return to base-only URL</a>
    </aside>
    {state.phase === 'ready' ? <Suspense fallback={<aside aria-label="Opening historical review"><p role="status">Opening historical review… The base graph remains unchanged.</p><button type="button" onClick={closeReader}>Cancel opening historical review</button></aside>}>
      <HistoricalReviewPanel overlay={state.overlay} href={href} onClose={closeReader} returnFocusTo={openButton} />
    </Suspense> : null}
  </>;
}
