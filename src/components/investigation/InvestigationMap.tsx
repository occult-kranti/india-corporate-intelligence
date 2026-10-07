import { useId, useMemo, useRef, useState } from 'react';
import type { InvestigationStateCoverage } from '../../data/investigation';
import geometry from './assets/india-current36.json';
import './map.css';

export interface InvestigationMapProps {
  coverage: InvestigationStateCoverage[];
  selectedState: string | null;
  onStateSelect: (stateCode: string | null) => void;
  geographyMode?: 'coverage' | 'associations' | 'all';
  nationalRecords: number;
  unknownRecords: number;
  highlightedStateCodes?: string[];
  indexLabel?: string;
}
const RAMP = ['#274745', '#35615a', '#468273', '#70a38d', '#acd0b4'];
const CALLOUTS: Record<string, [number, number]> = { CH: [-46,-9], DL: [36,-8], DN: [-66,-6], GA: [-46,4], LD: [-27,9], PY: [48,17], SK: [-9,-21] };
const countFor = (row: InvestigationStateCoverage, mode: InvestigationMapProps['geographyMode']) => mode === 'associations' ? row.associationRecords : mode === 'all' ? row.records : row.coverageRecords;

export function InvestigationMap({ coverage, selectedState, onStateSelect, geographyMode = 'coverage', nationalRecords, unknownRecords, highlightedStateCodes = [], indexLabel = 'GEOGRAPHIC INDEX' }: InvestigationMapProps) {
  const uid = useId().replace(/:/gu, '');
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
  return <section className="iw-map" aria-labelledby={`${uid}-title`}>
    <div className="iw-map-heading"><div><p className="iw-map-eyebrow">{indexLabel}</p><h2 id={`${uid}-title`}>{selectedName ?? 'India · geographic evidence'}</h2></div><button type="button" disabled={!selectedState} onClick={() => onStateSelect(null)}>All India</button></div>
    <div className="iw-map-select"><label htmlFor={`${uid}-state`}>State or union territory</label><select id={`${uid}-state`} value={selectedState ?? ''} onChange={event => onStateSelect(event.target.value || null)}><option value="">All 36 states &amp; union territories</option>{geometry.states.map(state => <option key={state.code} value={state.code}>{state.name} · {rows.has(state.code) ? countFor(rows.get(state.code)!, geographyMode).toLocaleString() : '?'}</option>)}</select></div>
    <div className="iw-map-stage">
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
      </svg>
      <div className="iw-map-readout" role="status" aria-live="polite"><strong>{active?.name ?? selectedName ?? '36 states & union territories'}</strong><span>{activeCoverage ? `${countFor(activeCoverage, geographyMode).toLocaleString()} ${modeLabel.toLowerCase()} · ${activeCoverage.entities.toLocaleString()} linked entities` : active ? 'Coverage unassessed for this selection' : 'Select a place to filter the linked investigation'}</span>{activeCoverage && <small>{activeCoverage.coverageRecords.toLocaleString()} activity / programme · {activeCoverage.associationRecords.toLocaleString()} headquarters, constituency or other association records</small>}</div>
    </div>
    <div className="iw-map-legend"><span className="iw-map-legend-name">{modeLabel}</span><span className="iw-map-gradient" aria-hidden="true"/><span>{positive.length ? `Positive-count quantiles · ${positive[0].toLocaleString()}–${positive[positive.length-1].toLocaleString()}` : 'No matching recorded coverage'}</span><span className="iw-map-hatch" aria-hidden="true"/><span>0 matching records</span></div>
    <p className="iw-map-caption">Record counts describe this corpus. A hatched state means no matching records, not absence of activity. Multi-state records can appear in more than one state.</p>
    <div className="iw-map-unlocated"><span><strong>{nationalRecords.toLocaleString()}</strong> national context records</span><span><strong>{unknownRecords.toLocaleString()}</strong> records with unknown location</span></div>
    <details className="iw-map-provenance"><summary>Boundary source &amp; geographic limitations</summary><p>LGD / BharatMaps, via <a href="https://github.com/ramSeraph/indian_admin_boundaries/releases/tag/states" target="_blank" rel="noopener noreferrer">ramSeraph and DataMeet</a>. <a href={geometry.provenance.licenseUrl} target="_blank" rel="noopener noreferrer">CC0-1.0</a>. Retrieved {geometry.provenance.retrievedAt}. {geometry.provenance.boundaryVintage}</p><p>{geometry.provenance.boundaryScope} Project locations, programme coverage and institution locations are distinguished from headquarters, constituencies and state associations. National and unknown locations are not placed at invented coordinates.</p><p>{geometry.provenance.projection} Simplified for display; all polygon components retained.</p></details>
  </section>;
}
export default InvestigationMap;
