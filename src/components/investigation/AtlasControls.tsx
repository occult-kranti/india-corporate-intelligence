import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Layers3, CalendarRange } from 'lucide-react';
import { INVESTIGATION_DOMAINS, type InvestigationFilters, type InvestigationRecord } from '../../data/investigation';
import { ATLAS_DATE_RANGE } from '../../data/atlasInvestigation';

export const ATLAS_SECTORS = [
  ['energy', '/energy', 'Energy'], ['water', '/water', 'Water & food'],
  ['public-works', '/public-works', 'Roads & bridges'], ['education', '/education', 'Education'],
  ['health', '/health', 'Hospitals'], ['welfare', '/welfare', 'Welfare'],
  ['ngo', '/ngo', 'NGOs & trusts'], ['disaster-relief', '/disaster-relief', 'Disaster relief'],
  ['transport', '/transport', 'Ports, airports & rail'], ['public-funds', '/public-funds', 'Public funds'],
  ['capital', '/conglomerates', 'Companies'], ['finance', '/finance', 'Lenders'],
  ['governance', '/cabinet', 'Public office'], ['media', '/media', 'Media'],
  ['security', '/security', 'Police & defence'], ['justice', '/justice', 'Justice'],
  ['debt-relief', '/debt', 'Debt & recovery'], ['resources', '/resources', 'Natural resources'],
  ['pmcares', '/pmcares', 'PM CARES'], ['policy', '/policy', 'Laws & rules'],
  ['public-records', '/public-records', 'Public releases'],
  ['international-finance', '/international-finance', 'International finance'],
  ['defence-trade', '/defence-trade', 'Arms contracts'],
] as const;

export function AtlasSectorStrip({ domains, onDomainsChange }: { domains?: string[]; onDomainsChange: (values?: string[]) => void }) {
  const location = useLocation();
  const route = (path: string) => {
    const next = new URLSearchParams(location.search);
    for (const key of ['iw_domains', 'iw_scope', 'iw_node', 'iw_edge', 'iw_record', 'iw_source']) next.delete(key);
    next.set('iw_view', 'map');
    return `${path}?${next}`;
  };
  return <section className="atlas-sector-strip" aria-label="Integrated sector maps">
    <div className="atlas-sector-heading"><span><Layers3 size={15} aria-hidden="true" />One atlas. Connected systems.</span><details className="atlas-sector-picker"><summary>Overlay sectors {domains ? `(${domains.length})` : '(all)'}</summary><div><button type="button" onClick={() => onDomainsChange(undefined)}>All sectors</button><button type="button" onClick={() => onDomainsChange([])}>Clear layers</button>{INVESTIGATION_DOMAINS.map(domain => <label key={domain.value}><input type="checkbox" checked={!domains || domains.includes(domain.value)} onChange={() => { const current = domains ?? INVESTIGATION_DOMAINS.map(row => row.value); onDomainsChange(current.includes(domain.value) ? current.filter(value => value !== domain.value) : [...current, domain.value]); }} />{domain.label}</label>)}</div></details></div>
    <nav aria-label="Sector map views">{ATLAS_SECTORS.map(([key, path, label]) => <Link key={key} to={route(path)}>{label}<ArrowUpRight size={12} aria-hidden="true" /></Link>)}</nav>
  </section>;
}

export function AtlasTimeControl({ filters, records, onChange }: { filters: InvestigationFilters; records: InvestigationRecord[]; onChange: (values: { from?: string; to?: string }) => void }) {
  const [expanded, setExpanded] = useState(() => !window.matchMedia('(max-width: 767px)').matches);
  const years = useMemo(() => Array.from({ length: 16 }, (_, index) => { const year = 2011 + index; return { year, count: records.filter(record => (record.fromDate ?? record.toDate)?.startsWith(String(year))).length }; }), [records]);
  const max = Math.max(1, ...years.map(row => row.count));
  const through = filters.to ? Math.min(2026, Math.max(2011, Number(filters.to.slice(0, 4)))) : 2026;
  const active = Boolean(filters.from || filters.to);
  return <section className={`atlas-time-control${expanded ? ' is-expanded' : ' is-collapsed'}`} aria-label="Time dimension"><button type="button" className="atlas-time-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><CalendarRange size={15} aria-hidden="true" /><span>Time lens · {active ? `${filters.from ?? 'Earliest'} → ${filters.to ?? 'Latest'}` : 'All retained dates'}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    <div className="atlas-time-heading"><span><CalendarRange size={15} aria-hidden="true" />Time lens</span><strong>{active ? `${filters.from ?? 'Earliest retained'} → ${filters.to ?? 'Latest retained'}` : 'All retained dates'}</strong><div><button type="button" aria-pressed={filters.from === ATLAS_DATE_RANGE.from && filters.to === ATLAS_DATE_RANGE.to} onClick={() => onChange(ATLAS_DATE_RANGE)}>15-year window</button><button type="button" aria-pressed={!active} onClick={() => onChange({})}>All history</button></div></div>
    <div className="atlas-time-scrubber"><label htmlFor="atlas-through-year">Explore through year <output>{through}</output></label><div className="atlas-time-track"><div className="atlas-time-bars" aria-hidden="true">{years.map(row => <span key={row.year} title={`${row.year}: ${row.count} dated starts`} style={{ height: `${12 + row.count / max * 88}%`, opacity: row.year <= through ? 1 : .22 }} />)}</div><input id="atlas-through-year" type="range" min="2011" max="2026" step="1" value={through} onChange={event => { const year = Number(event.target.value); onChange({ from: ATLAS_DATE_RANGE.from, to: year === 2026 ? ATLAS_DATE_RANGE.to : `${year}-12-31` }); }} /><div className="atlas-time-ticks"><span>2011</span><span>2016</span><span>2021</span><span>2026</span></div></div></div>
    <p>Bars count dated record starts in this view. The lens selects overlapping event windows; undated records remain governed by Layers & dates. Current state boundaries remain fixed.</p>
  </section>;
}
