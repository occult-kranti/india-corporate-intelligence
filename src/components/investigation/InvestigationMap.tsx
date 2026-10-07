import { lazy, Suspense, useCallback, useId, useMemo, useRef, useState } from 'react';
import type { SpatialSite, SpatialArc } from './SpatialAtlas';
import { projectAtlasCoordinate } from './spatialProjection';
import './SpatialAtlas.css';
import type { InvestigationStateCoverage } from '../../data/investigation';
import geometry from './assets/india-current36.json';
import './map.css';

const SpatialAtlas = lazy(() => import('./SpatialAtlas'));
const PlacesAtlas = lazy(() => import('./PlacesAtlas'));

export interface InvestigationMapProps {
  coverage: InvestigationStateCoverage[];
  selectedState: string | null;
  onStateSelect: (stateCode: string | null) => void;
  geographyMode?: 'coverage' | 'associations' | 'all';
  nationalRecords: number;
  unknownRecords: number;
  internationalRecords?: number;
  highlightedStateCodes?: string[];
  indexLabel?: string;
  spatial?: boolean;
  sites?: SpatialSite[];
  arcs?: SpatialArc[];
  timeLabel?: string;
  onSiteSelect?: (site: SpatialSite) => void;
  onEntitySelect?: (id: string) => void;
}
const EMPTY_CODES: string[] = [];
const RAMP = ['#274745', '#35615a', '#468273', '#70a38d', '#acd0b4'];
const CALLOUTS: Record<string, [number, number]> = { CH: [-46,-9], DL: [36,-8], DN: [-66,-6], GA: [-46,4], LD: [-27,9], PY: [48,17], SK: [-9,-21] };
const countFor = (row: InvestigationStateCoverage, mode: InvestigationMapProps['geographyMode']) => mode === 'associations' ? row.associationRecords : mode === 'all' ? row.records : row.coverageRecords;

export function InvestigationMap({ coverage, selectedState, onStateSelect, geographyMode = 'coverage', nationalRecords, unknownRecords, internationalRecords = 0, highlightedStateCodes = EMPTY_CODES, indexLabel = 'GEOGRAPHIC INDEX', spatial = false, sites, arcs, timeLabel, onSiteSelect, onEntitySelect }: InvestigationMapProps) {
  const uid = useId().replace(/:/gu, '');
  const [dimension, setDimension] = useState<'2d' | '3d' | 'places'>(() => spatial && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'places' : '2d');
  const [graphicsNotice, setGraphicsNotice] = useState('');
  const onUnavailable = useCallback((reason: string) => { setGraphicsNotice(reason); setDimension('2d'); }, []);
  const showSpatial = spatial && dimension === '3d';
  const showPlaces = spatial && dimension === 'places';
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const locationSites = useMemo(() => (sites ?? []).filter(site => Number.isFinite(site.lon) && Number.isFinite(site.lat) && site.lon >= 65 && site.lon <= 100 && site.lat >= 5 && site.lat <= 38 && site.sourceIds.length > 0 && geometry.states.some(state => state.code === site.stateCode)), [sites]);
  const selectedSite = locationSites.find(site => site.id === selectedSiteId);
  const selectSite = (site: SpatialSite) => { setSelectedSiteId(site.id); onSiteSelect?.(site); };
  const [hovered, setHovered] = useState<string | null>(null);
  const paths = useRef(new Map<string, SVGPathElement>());
  const rows = useMemo(() => new Map(coverage.map(row => [row.stateCode, row])), [coverage]);
  const positive = useMemo(() => coverage.map(row => countFor(row, geographyMode)).filter(n => n > 0).sort((a,b) => a-b), [coverage, geographyMode]);
  const thresholds = useMemo(() => [1,2,3,4].map(n => positive[Math.min(positive.length-1, Math.floor(positive.length*n/5))] ?? 0), [positive]);
  const fillFor = (code: string) => {
    const row = rows.get(code);
    if (!row) return `url(#${uid}-unknown)`;
    const value = countFor(row, geographyMode);
    if (!value) return `url(#${uid}-none)`;
    return RAMP[thresholds.filter(threshold => value > threshold).length];
  };
  const active = geometry.states.find(state => state.code === (hovered ?? selectedState));
  const activeCoverage = active && rows.get(active.code);
  const modeLabel = geographyMode === 'associations' ? 'Association records' : geographyMode === 'all' ? 'Located or associated records' : 'Activity / programme records';
  const selectedName = geometry.states.find(state => state.code === selectedState)?.name;
  const label = (code:string, name:string) => {
    const row = rows.get(code);
    return `${name}: ${row ? `${countFor(row, geographyMode).toLocaleString()} matching ${modeLabel.toLowerCase()}` : 'coverage unassessed'}${selectedState === code ? ', selected' : ''}`;
  };
  return <section className={`iw-map${spatial ? ' iw-map-spatial' : ''}`} aria-labelledby={`${uid}-title`} data-map-dimension={showPlaces ? 'places' : showSpatial ? '3d' : '2d'}>
    <div className="iw-map-heading"><div><p className="iw-map-eyebrow">{indexLabel}</p><h2 id={`${uid}-title`}>{selectedName ?? 'India · geographic evidence'}</h2></div><button type="button" disabled={!selectedState} onClick={() => onStateSelect(null)}>All India</button></div>
    <div className="iw-map-select"><label htmlFor={`${uid}-state`}>State or union territory</label><select id={`${uid}-state`} value={selectedState ?? ''} onChange={event => onStateSelect(event.target.value || null)}><option value="">All 36 states &amp; union territories</option>{geometry.states.map(state => <option key={state.code} value={state.code}>{state.name} · {rows.has(state.code) ? countFor(rows.get(state.code)!, geographyMode).toLocaleString() : '?'}</option>)}</select></div>
    {spatial && <div className="iw-map-view-switch" aria-label="Map presentation"><button type="button" aria-pressed={dimension === 'places'} onClick={() => { setGraphicsNotice(''); setDimension('places'); }}>Places map</button><button type="button" aria-pressed={dimension === '3d'} onClick={() => { setGraphicsNotice(''); setDimension('3d'); }}>3D atlas</button><button type="button" aria-pressed={dimension === '2d'} onClick={() => setDimension('2d')}>2D map</button><span>36 retained boundaries</span></div>}
    {graphicsNotice && <p className="iw-map-graphics-notice" role="status">{graphicsNotice}</p>}
    {showSpatial && <Suspense fallback={<p className="iw-map-graphics-notice" role="status">Loading spatial map…</p>}><SpatialAtlas coverage={coverage} selectedState={selectedState} onStateSelect={onStateSelect} geographyMode={geographyMode} sites={sites} arcs={arcs} timeLabel={timeLabel} highlightedStateCodes={highlightedStateCodes} onSiteSelect={onSiteSelect} onEntitySelect={onEntitySelect} onUnavailable={onUnavailable} /></Suspense>}
    {showPlaces && <Suspense fallback={<p className="iw-map-graphics-notice" role="status">Loading places map…</p>}><PlacesAtlas coverage={coverage} selectedState={selectedState} onStateSelect={onStateSelect} geographyMode={geographyMode} sites={sites} timeLabel={timeLabel} highlightedStateCodes={highlightedStateCodes} onSiteSelect={onSiteSelect} onEntitySelect={onEntitySelect} onUnavailable={onUnavailable} /></Suspense>}
    <div className="iw-map-stage" hidden={showSpatial || showPlaces}>
      <svg viewBox={geometry.viewBox.join(' ')} role="group" aria-labelledby={`${uid}-map-title ${uid}-map-desc`}>
        <title id={`${uid}-map-title`}>India: matching evidence records by state and union territory</title>
        <desc id={`${uid}-map-desc`}>Thirty-six geographic boundaries. Shade shows {modeLabel.toLowerCase()}, not funding amounts, sites, incidence or misconduct. Arrow keys move through states alphabetically; Enter or Space selects; Escape clears. The state selector provides an equivalent control.</desc>
        <defs><pattern id={`${uid}-none`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#192727"/><path d="M0 6L6 0" stroke="#30433f" strokeWidth=".65"/></pattern><pattern id={`${uid}-unknown`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#182024"/><circle cx="3" cy="3" r=".7" fill="#52615c"/></pattern></defs>
        {geometry.states.map((state, index) => <path key={state.code} ref={element => { if (element) paths.current.set(state.code, element); else paths.current.delete(state.code); }} d={state.path} fill={fillFor(state.code)} fillRule="evenodd" className={`iw-map-state${selectedState === state.code ? ' is-selected' : ''}${highlightedStateCodes.includes(state.code) ? ' is-case-location' : ''}`} data-state-code={state.code} role="button" tabIndex={state.code === (selectedState ?? geometry.states[0].code) ? 0 : -1} aria-pressed={selectedState === state.code} aria-label={label(state.code, state.name)} onClick={() => onStateSelect(selectedState === state.code ? null : state.code)} onMouseEnter={() => setHovered(state.code)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(state.code)} onBlur={() => setHovered(null)} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onStateSelect(selectedState === state.code ? null : state.code); }
          if (event.key === 'Escape') onStateSelect(null);
          if (['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)) {
            event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 35 : (index + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1) + 36) % 36;
            paths.current.get(geometry.states[next].code)?.focus();
          }
        }}><title>{label(state.code, state.name)}</title></path>)}
        <g className="iw-map-labels" aria-hidden="true">{geometry.states.map(state => {
          const offset = CALLOUTS[state.code];
          return <g key={state.code}>{offset && <path d={`M${state.x},${state.y} L${state.x+offset[0]},${state.y+offset[1]}`} className="iw-map-leader"/>}<text x={state.x+(offset?.[0] ?? 0)} y={state.y+(offset?.[1] ?? 0)} dy=".35em">{state.code}</text></g>;
        })}</g>
        {spatial && <g className="iw-map-sites">{locationSites.map(site => { const [x, y] = projectAtlasCoordinate(site.lon, site.lat); return <g key={site.id} transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={`${site.label}, ${site.precision} coordinate precision. Inspect site`} onClick={() => selectSite(site)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSite(site); } if (event.key === 'Escape') setSelectedSiteId(null); }}><title>{site.label}</title><circle r="9" fill="#e7bd76" stroke="#17343e" strokeWidth="2"/><path d="M-3 4V-4H3V4M-5 4H5M-1-2H1M-1 0H1" fill="none" stroke="#17343e" strokeWidth="1.2"/></g>; })}</g>}
      </svg>
      <div className="iw-map-readout" role="status" aria-live="polite"><strong>{active?.name ?? selectedName ?? '36 states & union territories'}</strong><span>{activeCoverage ? `${countFor(activeCoverage, geographyMode).toLocaleString()} ${modeLabel.toLowerCase()} · ${activeCoverage.entities.toLocaleString()} linked entities` : active ? 'Coverage unassessed for this selection' : 'Select a place to filter the linked investigation'}</span>{activeCoverage && <small>{activeCoverage.coverageRecords.toLocaleString()} activity / programme · {activeCoverage.associationRecords.toLocaleString()} headquarters, constituency or other association records</small>}</div>
    </div>
    {!showSpatial && !showPlaces && spatial && locationSites.length > 0 && <div className="iw-map-flat-sites"><label htmlFor={`${uid}-flat-site`}>Find a public site<select id={`${uid}-flat-site`} value={selectedSite?.id ?? ''} onChange={event => { const site = locationSites.find(item => item.id === event.target.value); if (site) selectSite(site); else setSelectedSiteId(null); }}><option value="">Select a sourced location</option>{locationSites.map(site => <option key={site.id} value={site.id}>{site.label} · {site.stateCode}</option>)}</select></label>{selectedSite && <section className="spatial-atlas-popover" aria-label="Selected site details"><button className="spatial-atlas-close" type="button" onClick={() => setSelectedSiteId(null)} aria-label="Close site details">×</button><p className="spatial-atlas-kicker">{selectedSite.kind} · {selectedSite.precision} coordinate precision</p><h3>{selectedSite.label}</h3><p className="spatial-atlas-coordinates">{selectedSite.lat.toFixed(4)}° N, {selectedSite.lon.toFixed(4)}° E · {selectedSite.stateCode}</p><p>{selectedSite.coordinateNote}</p><p className="spatial-atlas-site-caveat">Schematic public-site symbol. This location does not locate any person or establish where programme spending occurred.</p>{selectedSite.sourceUrl ? <a href={selectedSite.sourceUrl} target="_blank" rel="noopener noreferrer">{selectedSite.sourceLabel ?? 'Coordinate source'} ↗</a> : <p>Source references: {selectedSite.sourceIds.join(', ')}</p>}{onEntitySelect && selectedSite.entityIds.map(id => <button key={id} type="button" onClick={() => onEntitySelect(id)}>Inspect linked identity · {id}</button>)}</section>}</div>}
    <div className="iw-map-legend"><span className="iw-map-legend-name">{modeLabel}</span><span className="iw-map-gradient" aria-hidden="true"/><span>{positive.length ? `Positive-count quantiles · ${positive[0].toLocaleString()}–${positive[positive.length-1].toLocaleString()}` : 'No matching recorded coverage'}</span><span className="iw-map-hatch" aria-hidden="true"/><span>0 matching records</span></div>
    <p className="iw-map-caption">Record counts describe this corpus. {showPlaces ? 'A pale research-state overlay' : showSpatial ? 'A dark state' : 'A hatched state'} means no matching records, not absence of activity. Multi-state records can appear in more than one state.</p>
    <div className="iw-map-unlocated"><span><strong>{nationalRecords.toLocaleString()}</strong> national context records</span><span><strong>{unknownRecords.toLocaleString()}</strong> records with unknown location</span><span><strong>{internationalRecords.toLocaleString()}</strong> international context records · country-level, not point locations</span></div>
    <details className="iw-map-provenance"><summary>Boundary source &amp; geographic limitations</summary><p>LGD / BharatMaps, via <a href="https://github.com/ramSeraph/indian_admin_boundaries/releases/tag/states" target="_blank" rel="noopener noreferrer">ramSeraph and DataMeet</a>. <a href={geometry.provenance.licenseUrl} target="_blank" rel="noopener noreferrer">CC0-1.0</a>. Retrieved {geometry.provenance.retrievedAt}. {geometry.provenance.boundaryVintage}</p><p>{geometry.provenance.boundaryScope} Project locations, programme coverage and institution locations are distinguished from headquarters, constituencies and state associations. National and unknown locations are not placed at invented coordinates.</p><p>{showPlaces ? 'WGS84 longitude/latitude from the pinned LGD source; simplified at 0.001 degrees.' : geometry.provenance.projection} Simplified for display; all polygon components retained.</p></details>
  </section>;
}
export default InvestigationMap;
