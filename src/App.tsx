import { HashRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import { DataProvider } from './context/DataContext';

/**
 * Routes are lazily loaded.
 *
 * Everything used to live in one chunk, which was heading past 1.2 MB before any
 * per-entity records had landed. The heavy pages are heavy for good reasons — the
 * Atlas subgraph, the provenance ledger and the geographic network each carry a
 * substantial dataset — but a reader arriving at the dashboard should not download
 * the ingestion audit to see it.
 *
 * The dashboard is deliberately NOT lazy: it is the landing route, and splitting it
 * only adds a round trip before the first paint.
 */
import Dashboard from './pages/Dashboard';

const MapExplorer = lazy(() => import('./pages/MapExplorer'));
const StateProfile = lazy(() => import('./pages/StateProfile'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const NetworkView = lazy(() => import('./pages/NetworkView'));
const GeoGraph = lazy(() => import('./pages/GeoGraph'));
const Cabinet = lazy(() => import('./pages/Cabinet'));
const Tenders = lazy(() => import('./pages/Tenders'));
const Resources = lazy(() => import('./pages/Resources'));
const Conglomerates = lazy(() => import('./pages/Conglomerates'));
const GroupDeepDive = lazy(() => import('./pages/GroupDeepDive'));
const Atlas = lazy(() => import('./pages/Atlas'));
const Patterns = lazy(() => import('./pages/Patterns'));
const EvidenceAudit = lazy(() => import('./pages/EvidenceAudit'));
const BaseRates = lazy(() => import('./pages/BaseRates'));
const Interlocks = lazy(() => import('./pages/Interlocks'));
const Motifs = lazy(() => import('./pages/Motifs'));
const Prospector = lazy(() => import('./pages/Prospector'));
const Desk = lazy(() => import('./pages/Desk'));
const Capture = lazy(() => import('./pages/Capture'));
const Allocation = lazy(() => import('./pages/Allocation'));
const PmCares = lazy(() => import('./pages/PmCares'));
const Competition = lazy(() => import('./pages/Competition'));
const Provenance = lazy(() => import('./pages/Provenance'));
const Method = lazy(() => import('./pages/Method'));
const IndustryView = lazy(() => import('./pages/IndustryView'));
const PoliticalView = lazy(() => import('./pages/PoliticalView'));
const MediaView = lazy(() => import('./pages/MediaView'));
const Search = lazy(() => import('./pages/Search'));
const Watchlist = lazy(() => import('./pages/Watchlist'));

/**
 * A deliberately quiet fallback. A spinner that flashes for 80ms is worse than a
 * held frame, and `prefers-reduced-motion` readers should not get an animation at
 * all — so this is a static line, not a shimmer.
 */
function RouteFallback() {
  return (
    <div className="py-24 text-center" role="status" aria-live="polite">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">Loading…</p>
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="*"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/map" element={<MapExplorer />} />
                    <Route path="/states/:code" element={<StateProfile />} />
                    <Route path="/company/:id" element={<CompanyProfile />} />
                    <Route path="/network" element={<NetworkView />} />
                    <Route path="/geograph" element={<GeoGraph />} />
                    <Route path="/cabinet" element={<Cabinet />} />
                    <Route path="/tenders" element={<Tenders />} />
                    <Route path="/resources" element={<Resources />} />
                    <Route path="/conglomerates" element={<Conglomerates />} />
                    <Route path="/conglomerates/:id" element={<GroupDeepDive />} />
                    <Route path="/atlas" element={<Atlas />} />
                    <Route path="/patterns" element={<Patterns />} />
                    <Route path="/evidence" element={<EvidenceAudit />} />
                    <Route path="/base-rates" element={<BaseRates />} />
                    <Route path="/interlocks" element={<Interlocks />} />
                    <Route path="/motifs" element={<Motifs />} />
                    <Route path="/prospector" element={<Prospector />} />
                    <Route path="/desk" element={<Desk />} />
                    <Route path="/capture" element={<Capture />} />
                    <Route path="/allocation" element={<Allocation />} />
                    <Route path="/pmcares" element={<PmCares />} />
                    <Route path="/competition" element={<Competition />} />
                    <Route path="/provenance" element={<Provenance />} />
                    <Route path="/method" element={<Method />} />
                    <Route path="/industries" element={<IndustryView />} />
                    <Route path="/political" element={<PoliticalView />} />
                    <Route path="/media" element={<MediaView />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                  </Routes>
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}

export default App;
