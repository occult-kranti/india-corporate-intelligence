import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Download, Search, X } from 'lucide-react';
import { INVESTIGATION_CASES, INVESTIGATION_DATE, INVESTIGATION_SOURCES, INVESTIGATION_STATUS_LABELS, type InvestigationCase, type InvestigationStatus } from '../../data/investigations';

export const sourceById = new Map(INVESTIGATION_SOURCES.map(source => [source.id, source]));
export const sectors = [...new Set(INVESTIGATION_CASES.map(record => record.sector))].sort();
export const entities = [...new Set(INVESTIGATION_CASES.flatMap(record => record.entities))].sort();
export const statuses = Object.keys(INVESTIGATION_STATUS_LABELS) as InvestigationStatus[];

export function useInvestigationFilters() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const sector = params.get('sector') || '';
  const status = params.get('status') || '';
  const entity = params.get('entity') || '';
  const selectedId = params.get('case') || '';
  const setParam = (key: string, value: string, replace = false) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      if (['q', 'sector', 'status', 'entity'].includes(key)) { next.delete('case'); next.delete('page'); }
      return next;
    }, { replace });
  };
  const query = q.trim().toLocaleLowerCase();
  const filtered = INVESTIGATION_CASES.filter(record =>
    (!sector || record.sector === sector) && (!status || record.status === status) &&
    (!entity || record.entities.includes(entity)) && (!query || [record.title, record.summary, record.finding, record.response || '', record.limitation, record.sector, ...record.entities, ...record.hypotheses.map(h => h.question)].join(' ').toLocaleLowerCase().includes(query)));
  const reset = () => setParams(new URLSearchParams());
  return { params, setParam, q, sector, status, entity, selectedId, filtered, reset };
}

export function StatusBadge({ status }: { status: InvestigationStatus }) {
  return <span className={`inv-status inv-status--${status}`}><span aria-hidden="true" />{INVESTIGATION_STATUS_LABELS[status]}</span>;
}

export function InvestigationNav({ active }: { active: 'network' | 'leads' }) {
  return <nav className="inv-subnav" aria-label="Investigation workspace">
    <Link className={active === 'network' ? 'is-active' : ''} to="/investigations" aria-current={active === 'network' ? 'page' : undefined}>Investigation network</Link>
    <Link className={active === 'leads' ? 'is-active' : ''} to="/leads" aria-current={active === 'leads' ? 'page' : undefined}>Unresolved leads</Link>
    <Link to="/game-theory">Game theory lab <ArrowUpRight size={14} aria-hidden="true" /></Link>
    <Link to="/research-program">Research program <ArrowUpRight size={14} aria-hidden="true" /></Link>
  </nav>;
}

export function FilterBar({ filters }: { filters: ReturnType<typeof useInvestigationFilters> }) {
  return <section className="inv-filters" aria-label="Filter investigation cases">
    <label className="inv-search"><span className="inv-control-label">Search the records</span><span className="inv-input-wrap"><Search size={16} aria-hidden="true" /><input type="search" placeholder="PM CARES, coal, electoral bonds…" value={filters.q} onChange={e => filters.setParam('q', e.target.value, true)} /></span></label>
    <label><span className="inv-control-label">Sector</span><select value={filters.sector} onChange={e => filters.setParam('sector', e.target.value)}><option value="">All sectors</option>{sectors.map(sector => <option key={sector}>{sector}</option>)}</select></label>
    <label><span className="inv-control-label">Record status</span><select value={filters.status} onChange={e => filters.setParam('status', e.target.value)}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{INVESTIGATION_STATUS_LABELS[status]}</option>)}</select></label>
    <label><span className="inv-control-label">Public subject</span><select value={filters.entity} onChange={e => filters.setParam('entity', e.target.value)}><option value="">All subjects</option>{entities.map(entity => <option key={entity}>{entity}</option>)}</select></label>
    {(filters.q || filters.sector || filters.status || filters.entity) && <button className="inv-button inv-reset" onClick={filters.reset}><X size={14} aria-hidden="true" /> Clear filters</button>}
  </section>;
}

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function ExportButtons({ cases }: { cases: InvestigationCase[] }) {
  const exportJson = () => {
    const ids = new Set(cases.flatMap(record => record.sources));
    downloadFile(`investigations-${INVESTIGATION_DATE}.json`, JSON.stringify({ asOf: INVESTIGATION_DATE, scope: 'Filtered case dossiers; not a population census or a finding of culpability.', cases, sources: INVESTIGATION_SOURCES.filter(source => ids.has(source.id)) }, null, 2), 'application/json');
  };
  const exportCsv = () => {
    const columns = ['id', 'title', 'sector', 'status', 'summary', 'finding', 'response_and_limitations', 'public_subjects', 'source_urls', 'hypotheses', 'as_of'];
    const rows = cases.map(record => [record.id, record.title, record.sector, INVESTIGATION_STATUS_LABELS[record.status], record.summary, record.finding, [record.response, record.limitation].filter(Boolean).join('\n\n'), record.entities.join('; '), record.sources.map(id => sourceById.get(id)?.url || `Missing source: ${id}`).join('; '), JSON.stringify(record.hypotheses), INVESTIGATION_DATE]);
    downloadFile(`investigations-${INVESTIGATION_DATE}.csv`, '\uFEFF' + [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  };
  return <div className="inv-actions" aria-label="Export filtered dossiers"><button className="inv-button" disabled={!cases.length} onClick={exportJson}><Download size={14} aria-hidden="true" /> JSON</button><button className="inv-button" disabled={!cases.length} onClick={exportCsv}><Download size={14} aria-hidden="true" /> CSV</button></div>;
}

export function ShareButton({ path }: { path?: string }) {
  const [message, setMessage] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const share = async () => {
    const url = new URL(window.location.href);
    if (path) url.hash = path;
    try { await navigator.clipboard.writeText(url.href); setMessage('Link copied'); setManualUrl(''); }
    catch { setManualUrl(url.href); setMessage('Copy this link'); }
  };
  return <div className="inv-share"><button className="inv-button" onClick={share}>{message === 'Link copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{message || 'Copy link'}</button>{manualUrl && <label className="inv-share-fallback">Shareable URL<input readOnly value={manualUrl} onFocus={e => e.target.select()} /></label>}<span className="inv-sr-only" role="status">{message}</span></div>;
}

export function EmptyState({ reset, title = 'No dossiers match this view.', text = 'Try a broader search or clear the filters to return to all available records.' }: { reset?: () => void; title?: string; text?: string }) {
  return <div className="inv-empty"><span className="inv-kicker">An empty result is still a result</span><h2>{title}</h2><p>{text}</p>{reset && <button className="inv-button" onClick={reset}>Clear filters</button>}</div>;
}

export function LegacyLinks() {
  return <aside className="inv-related"><span className="inv-control-label">Go deeper in the existing registers</span><div><Link to="/pmcares?iw_view=dossier">PM CARES <ArrowUpRight size={14} aria-hidden="true" /></Link><Link to="/energy?iw_view=dossier">Energy & resources <ArrowUpRight size={14} aria-hidden="true" /></Link><Link to="/welfare?iw_view=dossier">Welfare <ArrowUpRight size={14} aria-hidden="true" /></Link><Link to="/atlas?iw_view=dossier">Money-trail atlas <ArrowUpRight size={14} aria-hidden="true" /></Link><Link to="/network?iw_view=dossier">Corporate network <ArrowUpRight size={14} aria-hidden="true" /></Link></div></aside>;
}
