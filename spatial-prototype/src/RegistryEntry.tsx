import { Component, Suspense, lazy, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { InvestigationRegistry } from './domain';
import { loadFullRegistry, RegistryLoadError } from './registryLoader';
import type { RegistryLoadProgress } from './registryLoader';

const App = lazy(() => import('./App'));
const HistoricalReviewGate = lazy(() => import('./historical-review/ReviewGate'));
const SectorReaderGate = lazy(() => import('./sector-reader/SectorReaderGate'));
import { sectorReviewRequested } from './sector-reader/adapter';
import SectorReaderBoundary from './sector-reader/SectorReaderBoundary';
import { historicalReviewRequested } from './historical-review/adapter';
import HistoricalReviewBoundary from './historical-review/ReviewBoundary';
type Dataset = 'full' | 'preview';
export type RegistryEntryState =
  | { phase: 'loading'; progress: RegistryLoadProgress | null }
  | { phase: 'ready'; registry: InvestigationRegistry }
  | { phase: 'error'; message: string; url?: string };

export function requestedDataset(search: string): Dataset {
  return new URLSearchParams(search).get('dataset') === 'preview' ? 'preview' : 'full';
}

/** Relative navigation preserves the current nested deployment route and unrelated query/hash. */
export function datasetHref(dataset: Dataset, href: string): string {
  const url = new URL(href);
  if (dataset === 'preview') url.searchParams.set('dataset', 'preview');
  else url.searchParams.delete('dataset');
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The effect owns one cancellable attempt; stale attempts cannot overwrite a newer one. */
export function startRegistryLoad(
  onChange: (state: RegistryEntryState) => void,
  options: { reload?: boolean; load?: typeof loadFullRegistry } = {},
): () => void {
  const controller = new AbortController();
  let active = true;
  onChange({ phase: 'loading', progress: null });
  // StrictMode's immediate setup/cleanup can cancel before a redundant network request starts.
  void Promise.resolve().then(async () => {
    if (!active) return;
    const registry = await (options.load ?? loadFullRegistry)({
      signal: controller.signal,
      cache: options.reload ? 'reload' : 'default',
      onProgress: progress => {
        if (active && !controller.signal.aborted) onChange({ phase: 'loading', progress });
      },
    });
    if (active && !controller.signal.aborted) {
      active = false;
      onChange({ phase: 'ready', registry });
    }
  }).catch((error: unknown) => {
    if (!active || controller.signal.aborted) return;
    active = false;
    onChange({
      phase: 'error',
      message: error instanceof Error ? error.message : 'The complete registry could not be loaded. Check your connection and retry.',
      ...(error instanceof RegistryLoadError && error.url ? { url: error.url } : {}),
    });
  });
  return () => { active = false; controller.abort(); };
}

const panelStyle: CSSProperties = {
  minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '32px 20px',
  background: 'radial-gradient(ellipse at 45% 30%, #255941, #0c2a20)', color: '#e9dec0',
};
const cardStyle: CSSProperties = {
  width: 'min(100%, 620px)', padding: 'clamp(22px, 5vw, 42px)',
  background: 'rgba(12, 34, 26, .94)', border: '1px solid rgba(213, 224, 200, .25)', borderRadius: 10,
};

function EntryPanel({ children }: { children: ReactNode }) {
  return <main className="registry-entry-panel" style={panelStyle}><section style={cardStyle}>{children}</section></main>;
}

function OpeningApp({ dataset }: { dataset: Dataset }) {
  return <EntryPanel>
    <p style={{ letterSpacing: 2, fontSize: 11 }}>FIELDWORK</p>
    <h1>{dataset === 'preview' ? 'Opening preview dataset' : 'Opening the evidence atlas'}</h1>
    {dataset === 'preview' ? <p><strong>PREVIEW DATASET</strong><br />Selected subset: 36 entities · 12 records · 33 relationships · 24 sources</p> : null}
    <p role="status">{dataset === 'full' ? 'The complete registry has passed integrity checks. Loading the atlas interface.' : 'Opening the preview dataset: a selected subset of the registry.'}</p>
  </EntryPanel>;
}

/** A failed lazy application import should retain a readable recovery screen. */
class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <EntryPanel>
      <h1>The atlas interface could not open</h1>
      <p role="alert">Reload this page to retry downloading the application. No partial registry is being shown.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload page</button>
    </EntryPanel>;
    return this.props.children;
  }
}

export function RegistryEntryView({ dataset, state, onRetry, href }: {
  dataset: Dataset;
  state: RegistryEntryState;
  onRetry: () => void;
  href: string;
}) {
  if (dataset === 'preview') return <div data-registry-dataset="preview" data-registry-state="preview">
    <AppBoundary><Suspense fallback={<OpeningApp dataset="preview" />}><App dataset="preview" /></Suspense></AppBoundary>
  </div>;

  if (state.phase === 'ready') return <div data-registry-dataset="full" data-registry-state="ready">
    <AppBoundary><Suspense fallback={<OpeningApp dataset="full" />}><App registry={state.registry} dataset="full" /></Suspense></AppBoundary>
    {/* Next-release reader entry only. Exact manifest verification still follows a fresh Open. */}
    {historicalReviewRequested(new URL(href).search, true, dataset) ?
      <HistoricalReviewBoundary href={href}><Suspense fallback={null}><HistoricalReviewGate base={state.registry} href={href} /></Suspense></HistoricalReviewBoundary> : null}
    {sectorReviewRequested(new URL(href).search, true, dataset) ?
      <SectorReaderBoundary href={href}><Suspense fallback={null}><SectorReaderGate base={state.registry} href={href} /></Suspense></SectorReaderBoundary> : null}
  </div>;

  const progress = state.phase === 'loading' ? state.progress : null;
  return <div data-registry-dataset="full" data-registry-state={state.phase}>
    <EntryPanel>
      <p style={{ letterSpacing: 2, fontSize: 11 }}>FIELDWORK · COMPLETE ORIGINAL REGISTRY</p>
      <h1>{state.phase === 'error' ? 'Full registry is incomplete' : 'Loading the complete registry'}</h1>
      {state.phase === 'error' ? <>
        <p role="alert">{state.message}</p>
        <p>The complete dataset has not opened. No partial result or preview subset has been substituted.</p>
        {state.url ? <p style={{ overflowWrap: 'anywhere', fontSize: 12 }}>Failed file: {state.url}</p> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <button type="button" onClick={onRetry}>Retry full registry</button>
          <a href={datasetHref('preview', href)}>Open preview subset instead</a>
        </div>
      </> : <>
        <p>Original evidence, responses and held-review metadata are being loaded and verified before the atlas opens.</p>
        <progress aria-label="Verified registry chunks" max={progress?.totalChunks || 1}
          value={progress ? progress.loadedChunks : undefined} style={{ width: '100%', accentColor: '#d3b676' }} />
        <p role="status" aria-live="polite" aria-atomic="true" style={{ margin: '12px 0 0', fontVariantNumeric: 'tabular-nums' }}>
          {progress ? `${progress.loadedChunks.toLocaleString()} of ${progress.totalChunks.toLocaleString()} chunks verified · ${progress.loadedRows.toLocaleString()} of ${progress.totalRows.toLocaleString()} rows` : 'Reading the registry manifest…'}
        </p>
        <p style={{ color: '#a6b7a7', marginTop: 18, marginBottom: 0, fontSize: 12 }}>The atlas opens only after every declared chunk and the complete snapshot pass validation.</p>
      </>}
    </EntryPanel>
  </div>;
}

export default function RegistryEntry() {
  const [dataset] = useState(() => requestedDataset(typeof window === 'undefined' ? '' : window.location.search));
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<RegistryEntryState>({ phase: 'loading', progress: null });
  useEffect(() => {
    if (dataset === 'preview') return;
    return startRegistryLoad(setState, { reload: attempt > 0 });
  }, [dataset, attempt]);
  function retry() {
    setState({ phase: 'loading', progress: null });
    setAttempt(value => value + 1);
  }
  const href = typeof window === 'undefined' ? 'https://local.invalid/' : window.location.href;
  return <RegistryEntryView dataset={dataset} state={state} onRetry={retry} href={href} />;
}
