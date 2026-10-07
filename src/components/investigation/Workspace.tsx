import { useEffect, useMemo, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookmarkPlus, BookOpen, Check, ChevronDown, FileText, GitBranch, Layers, Map as MapIcon, Network, Search, Share2, SlidersHorizontal, X } from 'lucide-react';
import {
  INVESTIGATION_REGISTRY, INVESTIGATION_STATES, INVESTIGATION_LAYERS, INVESTIGATION_DOMAINS,
  INVESTIGATION_UPDATED_AT, getRouteLens, normalizeInvestigationState, getInvestigationView, getInvestigationStateCoverage,
  getInvestigationReviewQuestions, findInvestigationPaths,
  type InvestigationEntity, type InvestigationRelationship, type InvestigationRecord,
  type InvestigationFilters, type InvestigationTier,
  type InvestigationGeography, type InvestigationAmount,
} from '../../data/investigation';
import { LinkedEvidenceMap } from './LinkedEvidenceMap';
import { InvestigationGraph } from './InvestigationGraph';
import Casebook, { pinCasebookItem } from './Casebook';
import ProcurementTrail, { ProcurementGuidedEntry, ProcurementAuditEntry } from './ProcurementTrail';
import { useHistorySearchDrafts } from '../../lib/useHistorySearchDrafts';
import { AtlasCaseFeed, AtlasPolicyTimeline } from './AtlasCaseFeed';
import { AtlasNetwork } from './AtlasNetwork';
import { AtlasSectorStrip, AtlasTimeControl } from './AtlasControls';
import { getAtlasVisibleSites } from '../../data/atlasInvestigation';
import './workspace.css';
import './atlas-workspace.css';

type Surface = 'map' | 'connections' | 'evidence' | 'casebook' | 'dossier';
type SelectionKind = 'entity' | 'relationship' | 'record';
type Selection = { kind: 'entity'; item: InvestigationEntity } | { kind: 'relationship'; item: InvestigationRelationship } | { kind: 'record'; item: InvestigationRecord };
const surfaces: { value: Surface; label: string; icon: typeof MapIcon }[] = [
  { value: 'map', label: 'Map', icon: MapIcon }, { value: 'connections', label: 'Connections', icon: Network },
  { value: 'evidence', label: 'Evidence', icon: FileText }, { value: 'casebook', label: 'Casebook', icon: BookmarkPlus },
  { value: 'dossier', label: 'Dossier', icon: BookOpen },
];
const tiers: { value: InvestigationTier; label: string }[] = [
  { value: 'documented', label: 'Documented' }, { value: 'reported', label: 'Reported' },
  { value: 'self-reported', label: 'Self-reported' }, { value: 'alleged', label: 'Alleged' }, { value: 'analytic', label: 'Analytic' },
];
const sourceById = new Map(INVESTIGATION_REGISTRY.sources.map(item => [item.id, item]));
const entityById = new Map(INVESTIGATION_REGISTRY.entities.map(item => [item.id, item]));
const relationshipById = new Map(INVESTIGATION_REGISTRY.relationships.map(item => [item.id, item]));
const recordById = new Map(INVESTIGATION_REGISTRY.records.map(item => [item.id, item]));
const stateByCode = new Map(INVESTIGATION_STATES.map(item => [item.code, item.name]));
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const tierDashes: Record<InvestigationTier, string> = { documented: '', reported: '6 3', 'self-reported': '4 2', alleged: '2 4', analytic: '8 3 2 3' };
const geoLabels: Record<string, string> = { 'project-location': 'Recorded project location', 'programme-coverage': 'Programme coverage', headquarters: 'Headquarters association', constituency: 'Constituency association', 'institution-location': 'Institution location', 'state-association': 'State association', 'national-context': 'National context', 'country-context': 'Country context', unknown: 'Geography unknown' };
function validDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === value;
}
function dateLabel(value: string | null | undefined) {
  if (!value) return 'Date not established';
  if (/^\d{4}$/u.test(value)) return value;
  const month = /^\d{4}-\d{2}$/u.test(value);
  const date = new Date(`${month ? `${value}-01` : value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { ...(month ? {} : { day: 'numeric' as const }), month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function latestParams() { return new URLSearchParams(new URL(window.location.hash.slice(1), window.location.origin).search); }
function choices<T extends string>(value: string | null, options: { value: T }[]): T[] | undefined {
  if (value === null) return undefined;
  if (value === 'none') return [];
  const valid = options.filter(option => value.split(',').includes(option.value)).map(option => option.value);
  return valid.length ? valid : undefined;
}
function parseWorkspaceFilters(p: URLSearchParams, routeDomains: string[], routeState: string | null): InvestigationFilters {
  const from = validDate(p.get('iw_from')) ? p.get('iw_from')! : undefined;
  const to = validDate(p.get('iw_to')) ? p.get('iw_to')! : undefined;
  return {
    stateCode: p.has('iw_state') ? INVESTIGATION_STATES.some(state => state.code === p.get('iw_state')) ? p.get('iw_state')! : undefined : routeState ?? undefined,
    compareStateCode: INVESTIGATION_STATES.some(state => state.code === p.get('iw_compare')) ? p.get('iw_compare')! : undefined,
    q: p.get('iw_q')?.trim() || undefined,
    domains: p.has('iw_domains') ? p.get('iw_domains') === 'none' ? [] : INVESTIGATION_DOMAINS.filter(row => p.get('iw_domains')!.split(',').includes(row.value)).map(row => row.value) : p.get('iw_scope') === 'all' ? undefined : routeDomains.length ? routeDomains : undefined,
    layers: choices(p.get('iw_layers'), INVESTIGATION_LAYERS), tiers: choices(p.get('iw_tier'), tiers),
    from: from && to && from > to ? undefined : from, to: from && to && from > to ? undefined : to,
    includeUndated: p.get('iw_undated') !== '0', includeNational: p.get('iw_national') !== '0',
    geographyMode: p.get('iw_geo') === 'coverage' ? 'coverage' : p.get('iw_geo') === 'associations' ? 'associations' : 'all',
  };
}
function citationIds(item: { sourceIds: string[]; geography: InvestigationGeography[] }) {
  return [...new Set([...item.sourceIds, ...item.geography.flatMap(geo => geo.sourceIds)])];
}
function responseRecords(item: InvestigationRecord | InvestigationRelationship) {
  const ids = 'responseIds' in item ? item.responseIds : item.relationshipIds.flatMap(id => relationshipById.get(id)?.responseIds ?? []);
  return [...new Set(ids)].map(id => recordById.get(id)).filter((record): record is InvestigationRecord => Boolean(record));
}
function textCell(value: unknown) {
  let text = String(value ?? '');
  if (/^\s*[=+@\-]/u.test(text) || /^[\t\r]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/gu, '""')}"`;
}
function downloadText(value: string, name: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', value], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Tier({ value }: { value: InvestigationTier }) {
  return <span className="iw-tier" data-tier={value}><svg width="24" height="9" aria-hidden="true"><line x1="0" x2="24" y1="5" y2="5" stroke="currentColor" strokeWidth="1.6" strokeDasharray={tierDashes[value]} /></svg>{tiers.find(tier => tier.value === value)?.label ?? value}</span>;
}
function Amounts({ items }: { items: InvestigationAmount[] }) {
  if (!items.length) return null;
  return <dl className="iw-amounts" aria-label="Recorded amounts, separated by accounting stage">{items.map((item, index) => <div key={index}><dt>{item.stage}</dt><dd><strong>{item.currency} {number.format(item.value)} {item.unit}</strong><span>{item.period}</span></dd></div>)}</dl>;
}
function Geography({ items }: { items: InvestigationGeography[] }) {
  return <div className="iw-geography">{items.map((item, index) => <p key={index}><strong>{geoLabels[item.basis] ?? item.basis}</strong>{item.stateCodes.length > 0 ? ` · ${item.stateCodes.map(code => stateByCode.get(code) ?? code).join(', ')}` : ''}{item.countryCodes?.length ? ` · ${item.countryCodes.join(', ')}` : ''}<br />{item.note}</p>)}</div>;
}
function CitationList({ ids, onSelect }: { ids: string[]; onSelect: (id: string) => void }) {
  return <ul className="iw-citations">{[...new Set(ids)].map(id => {
    const source = sourceById.get(id);
    return <li key={id}>{source ? <><button onClick={() => onSelect(id)}>{source.title}</button><span>{source.publisher} · {dateLabel(source.publishedAt)}</span><a href={source.url} target="_blank" rel="noopener noreferrer">Open cited source <ArrowUpRight size={12} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></> : <span>Source unavailable in this snapshot: {id}</span>}</li>;
  })}</ul>;
}
function IdentityPicker({ label, selected, candidates, onChoose }: { label: string; selected?: InvestigationEntity; candidates: InvestigationEntity[]; onChoose: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const detail = useRef<HTMLDetailsElement>(null);
  const matches = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase('en-IN').split(/\s+/u).filter(Boolean);
    const pool = terms.length ? INVESTIGATION_REGISTRY.entities : candidates;
    return pool.filter(entity => entity.resolved && terms.every(term => `${entity.label} ${entity.id} ${entity.type}`.toLocaleLowerCase('en-IN').includes(term))).sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  }, [query, candidates]);
  return <details className="iw-identity-picker" ref={detail}><summary><span>{label}</span><strong>{selected?.label ?? 'Choose a resolved identity'}</strong><ChevronDown size={14} aria-hidden="true" /></summary><div className="iw-picker-options"><label><span>Search identities for {label.toLowerCase()}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, canonical ID or role" /></label><p>{number.format(matches.length)} matches · showing up to 12. Choose a recorded identity; similar names are not merged.</p><ul>{matches.slice(0, 12).map(entity => <li key={entity.id}><button onClick={() => { onChoose(entity.id); if (detail.current) detail.current.open = false; detail.current?.querySelector('summary')?.focus(); }}><strong>{entity.label}</strong><span>{entity.type} · {entity.namespace}</span><small>{entity.id}</small></button></li>)}</ul>{matches.length === 0 && <p>No resolved identity matches. Broaden the search; no relationship is inferred from a name.</p>}</div></details>;
}

export interface WorkspaceProps { children: ReactNode; routeTitle: string; routeKey: string }

/** Shared geographic investigation surface; legacy route state remains untouched. */
export default function Workspace({ children, routeTitle, routeKey }: WorkspaceProps) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const paramsKey = params.toString();
  const filterParamsKey = JSON.stringify(['iw_domains', 'iw_state', 'iw_compare', 'iw_q', 'iw_scope', 'iw_layers', 'iw_tier', 'iw_from', 'iw_to', 'iw_undated', 'iw_national', 'iw_geo'].map(key => [key, params.get(key)]));
  const routeLens = useMemo(() => getRouteLens(routeKey), [routeKey]);
  const isHome = routeKey === '/' || routeKey === '/investigate';
  const routeIdentity = /^\/company\/([^/]+)$/u.exec(routeKey) ?? /^\/conglomerates\/([^/]+)$/u.exec(routeKey);
  const routeEntity = routeIdentity ? entityById.get(`legacy:entity:${routeKey.startsWith('/company/') ? 'co' : 'grp'}:${routeIdentity[1]}`) : undefined;
  const routeStateRaw = /^\/states\/([^/]+)$/u.exec(routeKey)?.[1];
  const routeState = normalizeInvestigationState(routeStateRaw);
  const historicalDossierMap = /^\/(map|geograph|states(?:\/|$)|cabinet|conglomerates(?:\/|$)|industries|atlas|tenders|resources|welfare)/u.test(routeKey);
  const scope = params.has('iw_domains') ? 'overlay' : params.get('iw_scope') === 'all' ? 'all' : 'route';
  const surface = surfaces.find(item => item.value === params.get('iw_view'))?.value ?? 'map';
  const selectedLayers = choices(params.get('iw_layers'), INVESTIGATION_LAYERS);
  const selectedTiers = choices(params.get('iw_tier'), tiers);
  const [queryDraft, setQueryDraft] = useState(params.get('iw_q') ?? '');
  useHistorySearchDrafts(setQueryDraft, undefined, 'iw_q');
  const [advanced, setAdvanced] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(Boolean(params.get('iw_node') || params.get('iw_edge') || params.get('iw_record') || params.get('iw_source')));
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const inspectorReturn = useRef<HTMLElement | null>(null);
  const tracePanel = useRef<HTMLDetailsElement>(null);
  const dossierContent = useRef<HTMLElement>(null);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [recordLimit, setRecordLimit] = useState(30);
  const pathStart = params.get('iw_pathFrom') ?? '';
  const pathEnd = params.get('iw_pathTo') ?? '';
  const pathDirection = params.get('iw_direction') === 'directed' ? 'directed' : 'both';
  const depth = params.get('iw_depth') === '2' ? 2 : 1;
  const graphView = params.get('iw_graph') === 'table' ? 'table' : 'graph';
  const compareState = INVESTIGATION_STATES.some(state => state.code === params.get('iw_compare')) ? params.get('iw_compare')! : undefined;
  const reversedDates = validDate(params.get('iw_from')) && validDate(params.get('iw_to')) && params.get('iw_from')! > params.get('iw_to')!;
  const filters = useMemo(() => parseWorkspaceFilters(new URLSearchParams(JSON.parse(filterParamsKey).filter((item: [string, string | null]) => item[1] !== null)), routeLens.domains, routeState), [filterParamsKey, routeLens, routeState]);
  const view = useMemo(() => getInvestigationView(filters), [filters]);
  const atlasSites = useMemo(() => getAtlasVisibleSites(INVESTIGATION_REGISTRY, filters), [filters]);
  const orderedRecords = useMemo(() => [...view.records].sort((a, b) => {
    const latest = (item: InvestigationRecord) => (item.fromDate ?? '') > (item.toDate ?? '') ? item.fromDate! : item.toDate ?? '';
    return latest(b).localeCompare(latest(a)) || a.id.localeCompare(b.id);
  }), [view.records]);
  const coverageKey = JSON.stringify({ ...filters, stateCode: undefined, compareStateCode: undefined });
  const coverage = useMemo(() => getInvestigationStateCoverage(JSON.parse(coverageKey)), [coverageKey]);
  const questions = useMemo(() => getInvestigationReviewQuestions(view), [view]);
  const paths = useMemo(() => pathStart && pathEnd && entityById.get(pathStart)?.resolved && entityById.get(pathEnd)?.resolved ? findInvestigationPaths(pathStart, pathEnd, filters, { maxDepth: 5, maxVisited: 1500, maxPaths: 3, direction: pathDirection }) : null, [pathStart, pathEnd, filters, pathDirection]);
  const pathIndex = Math.max(0, Math.min(Number.parseInt(params.get('iw_path') ?? '0', 10) || 0, (paths?.paths.length ?? 1) - 1));
  const activePath = paths?.paths[pathIndex];
  const sourceSelection = params.get('iw_source') ? sourceById.get(params.get('iw_source')!) : undefined;
  const selection = useMemo<Selection | undefined>(() => {
    const p = new URLSearchParams(paramsKey);
    const relationship = relationshipById.get(p.get('iw_edge') ?? '');
    if (relationship) return { kind: 'relationship', item: relationship };
    const record = recordById.get(p.get('iw_record') ?? '');
    if (record) return { kind: 'record', item: record };
    const entity = entityById.get(p.get('iw_node') ?? '');
    return entity ? { kind: 'entity', item: entity } : undefined;
  }, [paramsKey]);
  const selectedNode = params.get('iw_node') ?? null;
  const selectedEdge = params.get('iw_edge') ?? null;
  const activeState = coverage.find(item => item.stateCode === filters.stateCode);
  const comparison = coverage.find(item => item.stateCode === compareState);
  const hasWorkspaceState = [...params.keys()].some(key => key.startsWith('iw_'));
  const invalid = [
    params.has('iw_state') && params.get('iw_state') !== 'all' && !filters.stateCode ? 'state' : null,
    params.has('iw_compare') && !compareState ? 'comparison state' : null,
    params.has('iw_view') && !surfaces.some(item => item.value === params.get('iw_view')) ? 'surface' : null,
    params.has('iw_scope') && !['all', 'route'].includes(params.get('iw_scope')!) ? 'topic scope' : null,
    params.has('iw_layers') && params.get('iw_layers') !== 'none' && params.get('iw_layers')!.split(',').some(value => !INVESTIGATION_LAYERS.some(item => item.value === value)) ? 'layer' : null,
    params.has('iw_tier') && params.get('iw_tier') !== 'none' && params.get('iw_tier')!.split(',').some(value => !tiers.some(item => item.value === value)) ? 'evidence tier' : null,
    params.has('iw_from') && !validDate(params.get('iw_from')) ? 'start date' : null,
    params.has('iw_to') && !validDate(params.get('iw_to')) ? 'end date' : null,
    reversedDates ? 'date range (start is after end)' : null,
    params.has('iw_geo') && !['all', 'coverage', 'associations'].includes(params.get('iw_geo')!) ? 'geographic basis' : null,
    params.has('iw_depth') && !['1', '2'].includes(params.get('iw_depth')!) ? 'graph depth' : null,
    params.has('iw_graph') && !['graph', 'table'].includes(params.get('iw_graph')!) ? 'graph view' : null,
    params.has('iw_node') && !entityById.has(params.get('iw_node')!) ? 'entity selection' : null,
    params.has('iw_edge') && !relationshipById.has(params.get('iw_edge')!) ? 'relationship selection' : null,
    params.has('iw_record') && !recordById.has(params.get('iw_record')!) ? 'record selection' : null,
    params.has('iw_source') && !sourceById.has(params.get('iw_source')!) ? 'source selection' : null,
    pathStart && !entityById.get(pathStart)?.resolved ? 'path start identity' : null,
    pathEnd && !entityById.get(pathEnd)?.resolved ? 'path end identity' : null,
    params.has('iw_direction') && !['both', 'directed'].includes(params.get('iw_direction')!) ? 'traversal direction' : null,
  ].filter(Boolean);
  useEffect(() => { setQueryDraft(filters.q ?? ''); }, [filters.q]);
  useEffect(() => { setRecordLimit(30); }, [filterParamsKey, routeKey]);
  useEffect(() => { setStatus(''); setShareUrl(''); }, [paramsKey, routeKey]);
  useEffect(() => { setInspectorOpen(Boolean(selection || sourceSelection)); }, [selection?.item.id, sourceSelection?.id]);
  const patch = (values: Record<string, string | undefined>) => {
    const next = latestParams();
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    setParams(next);
  };
  const reset = () => {
    const next = latestParams(); for (const key of [...next.keys()]) if (key.startsWith('iw_')) next.delete(key);
    setQueryDraft(''); setParams(next);
  };
  const chooseState = (code: string | null) => { setInspectorOpen(false); patch({ iw_state: code ?? (routeState ? 'all' : undefined), iw_node: undefined, iw_edge: undefined, iw_record: undefined, iw_source: undefined }); };
  const rememberInspectorReturn = () => { const active = document.activeElement; if (active instanceof HTMLElement && !active.closest('.iw-inspector')) inspectorReturn.current = active; };
  const closeInspection = () => { setInspectorOpen(false); patch({ iw_node: undefined, iw_edge: undefined, iw_record: undefined, iw_source: undefined }); requestAnimationFrame(() => { const target = inspectorReturn.current; if (target?.isConnected) target.focus({ preventScroll: true }); else document.querySelector<HTMLInputElement>('#iw-global-query')?.focus({ preventScroll: true }); }); };
  const inspect = (kind: SelectionKind, id: string) => { rememberInspectorReturn(); setInspectorOpen(true); patch({ iw_node: kind === 'entity' ? id : undefined, iw_edge: kind === 'relationship' ? id : undefined, iw_record: kind === 'record' ? id : undefined, iw_source: undefined }); };
  const inspectSource = (id: string) => { rememberInspectorReturn(); setInspectorOpen(true); patch({ iw_source: id }); };
  const openProcurementConnections = () => { setInspectorOpen(true); patch({ iw_view: 'connections', iw_node: 'public-works:entity:rw-nhai', iw_edge: 'public-works:relationship:pwg-package7-irb', iw_record: undefined, iw_source: undefined, iw_depth: '2', iw_graph: undefined, iw_pathFrom: undefined, iw_pathTo: undefined, iw_path: undefined, iw_direction: undefined }); };
  const backToCanvas = () => { setInspectorOpen(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.iw-surfaces button[aria-pressed="true"]')?.focus()); };
  const chooseSurface = (value: Surface) => { setInspectorOpen(false); patch({ iw_view: value === 'map' ? undefined : value }); };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); patch({ iw_q: queryDraft.trim() || undefined, iw_scope: queryDraft.trim() ? 'all' : undefined, iw_domains: undefined, iw_node: undefined, iw_edge: undefined, iw_record: undefined, iw_source: undefined }); };
  const toggleChoice = <T extends string,>(key: string, value: T, selected: T[] | undefined, options: { value: T }[]) => {
    const current = selected ?? options.map(item => item.value);
    const next = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
    patch({ [key]: next.length === options.length ? undefined : next.length ? next.join(',') : 'none' });
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setStatus('Investigation link copied with filters, selections and path endpoints.'); }
    catch { setShareUrl(window.location.href); setStatus('Select and copy the investigation link.'); }
  };
  const pin = (kind: SelectionKind, id: string) => { setStatus(pinCasebookItem(kind, id) ? 'Evidence pinned to your browser-local casebook.' : 'Your casebook holds 250 pins. Export it or remove an item before adding another.'); };
  const sourceDossierUrl = (route: string) => {
    const target = new URL(route, window.location.origin);
    const next = new URLSearchParams(target.search);
    const current = latestParams();
    if (target.pathname === routeKey) for (const [key, value] of current) if (!key.startsWith('iw_') && !next.has(key)) next.set(key, value);
    for (const [key, value] of current) if (key.startsWith('iw_')) next.set(key, value);
    if (!next.has('iw_state')) {
      const inheritedState = parseWorkspaceFilters(current, routeLens.domains, routeState).stateCode;
      if (inheritedState) next.set('iw_state', inheritedState);
    }
    next.set('iw_view', 'dossier'); return `${target.pathname}?${next}`;
  };
  const exportRecords = () => {
    // Read the authoritative URL at the action boundary so a rapid filter/export
    // pair cannot serialize the previous render's view.
    const activeFilters = parseWorkspaceFilters(latestParams(), routeLens.domains, routeState);
    const exported = getInvestigationView(activeFilters);
    const fields = ['id', 'originalId', 'namespace', 'title', 'kind', 'tier', 'status', 'statusAsOf', 'period', 'fromDate', 'toDate', 'dateBasis', 'summary', 'response', 'alternativeExplanations', 'falsifier', 'amounts', 'geography', 'entityIds', 'relationshipIds', 'domains', 'layers', 'sourceIds', 'sources', 'linkedResponses', 'limitations', 'route', 'snapshotAsOf', 'filterContext'] as const;
    const rows = exported.records.map(record => {
      const row = { ...record,
        sources: citationIds(record).map(id => sourceById.get(id) ?? { id, unavailable: true }),
        linkedResponses: responseRecords(record).map(response => ({ ...response, sources: citationIds(response).map(id => sourceById.get(id) ?? { id, unavailable: true }) })),
        snapshotAsOf: INVESTIGATION_UPDATED_AT, filterContext: activeFilters,
      };
      return fields.map(key => textCell(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key])).join(',');
    });
    downloadText([fields.join(','), ...rows].join('\r\n'), `investigation-records-${INVESTIGATION_UPDATED_AT}.csv`);
    setStatus(`Exported all ${exported.records.length} matching records with geographic provenance, unfiltered linked responses and limitations.`);
  };
  const selectedOutsideView = selection ? !(selection.kind === 'entity' ? view.entities : selection.kind === 'relationship' ? view.relationships : view.records).some(item => item.id === selection.item.id) : false;

  useEffect(() => { if (pathStart || pathEnd) { if (tracePanel.current) tracePanel.current.open = true; } }, [pathStart, pathEnd]);
  useEffect(() => { if (inspectorOpen && (surface === 'map' || window.matchMedia('(max-width: 1100px)').matches)) inspectorHeading.current?.focus({ preventScroll: true }); }, [inspectorOpen, selection?.item.id, sourceSelection?.id]);

  // Enter an explicitly requested mobile dossier at its reading origin. Lazy
  // routes can arrive later; user interaction cancels the pending focus move.
  useEffect(() => {
    const container = dossierContent.current;
    if (surface !== 'dossier' || !container || location.hash || !window.matchMedia('(max-width: 767px)').matches) return;
    let stopped = false;
    let frame: number | undefined;
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    const observer = new MutationObserver(focusWhenReady);
    function stop() {
      stopped = true; observer.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      for (const event of events) window.removeEventListener(event, stop, true);
    }
    function focusWhenReady() {
      if (stopped) return;
      const heading = container!.querySelector<HTMLHeadingElement>('h1');
      if (!heading || !heading.getBoundingClientRect().height) return;
      observer.disconnect();
      frame = requestAnimationFrame(() => {
        const current = new URL(window.location.hash.slice(1), window.location.origin);
        const active = document.activeElement;
        const hasDossierFocus = active && container!.contains(active) && active !== container && active !== heading;
        stop();
        if (!heading.isConnected || current.pathname !== routeKey || current.searchParams.get('iw_view') !== 'dossier' || hasDossierFocus) return;
        if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
    }
    for (const event of events) window.addEventListener(event, stop, { capture: true, passive: true });
    observer.observe(container, { childList: true, subtree: true });
    focusWhenReady();
    return stop;
  }, [surface, routeKey, location.hash]);

  const contextMap = (compact = false) => <section className={`iw-map-panel${compact ? ' is-context' : ''}`} aria-label="Geographic evidence context">
    <LinkedEvidenceMap registry={INVESTIGATION_REGISTRY} filters={filters} focusSelection={selection ? {kind: selection.kind, id: selection.item.id} : null} sites={compact ? [] : atlasSites} onEntitySelect={id => inspect('entity', id)} spatial={!compact} timeLabel={filters.from || filters.to ? `${filters.from ?? 'Earliest retained'} — ${filters.to ?? 'Latest retained'}` : 'All retained dates'} coverage={coverage} selectedState={filters.stateCode ?? null} onStateSelect={chooseState} geographyMode={filters.geographyMode} nationalRecords={view.nationalRecords} unknownRecords={view.unknownRecords} internationalRecords={view.internationalRecords} />
    {compact && <button className="iw-button iw-context-return" onClick={() => chooseSurface('map')}><MapIcon size={14} aria-hidden="true" />Return to linked map</button>}
  </section>;

  const inspector = <aside className="iw-inspector" aria-label="Evidence inspector" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeInspection(); } }}>
    <div className="iw-panel-heading"><div><p className="iw-overline">Evidence inspector</p><h2 ref={inspectorHeading} tabIndex={-1}>{sourceSelection ? 'Source record' : selection ? selection.kind === 'entity' ? 'Recorded identity' : selection.kind === 'relationship' ? 'Recorded connection' : 'Case & record' : 'Start with a record'}</h2></div>{(sourceSelection || selection) && <button className="iw-icon-button" aria-label={sourceSelection ? 'Return from source to selection' : 'Clear evidence selection'} onClick={() => sourceSelection && selection ? patch({ iw_source: undefined }) : closeInspection()}><X size={16} aria-hidden="true" /></button>}</div>
    <div className="iw-mobile-inspector-actions"><button className="iw-button" onClick={backToCanvas}>Back to {surface === 'connections' ? 'connections' : surface === 'evidence' ? 'evidence list' : 'map'}</button></div><div className="iw-inspector-scroll" key={sourceSelection ? `source:${sourceSelection.id}` : selection ? `${selection.kind}:${selection.item.id}` : 'unselected'}>
      {sourceSelection ? <article className="iw-source-inspection" data-investigation-source={sourceSelection.id}><Tier value={sourceSelection.tier} /><h3>{sourceSelection.title}</h3><p>{sourceSelection.summary}</p><dl className="iw-facts"><div><dt>Publisher</dt><dd>{sourceSelection.publisher}</dd></div><div><dt>Published</dt><dd>{dateLabel(sourceSelection.publishedAt)}</dd></div><div><dt>Retrieved</dt><dd>{dateLabel(sourceSelection.retrievedAt)}</dd></div><div><dt>Locator</dt><dd>{sourceSelection.locator}</dd></div></dl><a className="iw-button iw-button-primary" href={sourceSelection.url} target="_blank" rel="noopener noreferrer">Read cited source <ArrowUpRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a><h4>Limits of this source</h4><ul className="iw-prose-list">{sourceSelection.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></article> : selection ? <article className="iw-selected-record" data-investigation-selection={selection.item.id}>
        {selection.kind !== 'entity' && <Tier value={selection.item.tier} />}<p className="iw-selection-kind">{selection.kind === 'entity' ? selection.item.type : selection.item.kind} · {selection.item.namespace}</p><h3>{selection.kind === 'record' ? selection.item.title : selection.item.label}</h3>
        {selectedOutsideView && <p className="iw-notice">This saved or linked selection is outside the current filters. Its original evidence remains visible. <button onClick={() => patch({ iw_scope: 'all', iw_domains: undefined, iw_state: undefined, iw_q: undefined, iw_layers: undefined, iw_tier: undefined, iw_from: undefined, iw_to: undefined, iw_geo: undefined, iw_undated: undefined, iw_national: undefined })}>Broaden the view</button></p>}
        <p>{selection.item.summary}</p>
        <div className="iw-selection-actions"><button className="iw-button iw-button-primary" onClick={() => pin(selection.kind, selection.item.id)}><BookmarkPlus size={14} aria-hidden="true" />Pin evidence</button><Link className="iw-button" to={sourceDossierUrl(selection.item.route)}>Open dossier <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        {selection.kind === 'record' && selection.item.namespace === 'procurement-trails' && <ProcurementTrail trailId={selection.item.originalId} period={selection.item.period} onSourceSelect={inspectSource} onOpenConnections={openProcurementConnections} />}
        {selection.kind === 'entity' ? <><h4>Identity basis</h4><p>{selection.item.identityBasis}</p><div className="iw-selection-actions"><button className="iw-button" disabled={!selection.item.resolved} onClick={() => patch({ iw_pathFrom: selection.item.id, iw_path: undefined })}>Use as path start</button><button className="iw-button" disabled={!selection.item.resolved} onClick={() => patch({ iw_pathTo: selection.item.id, iw_path: undefined })}>Use as path end</button></div><h4>Recorded relationships</h4><p className="iw-small-note">Showing up to 16 of {view.relationships.filter(edge => edge.from === selection.item.id || edge.to === selection.item.id).length} matching relationships. The Connections ledger retains the complete filtered list.</p><ul className="iw-related-list">{view.relationships.filter(edge => edge.from === selection.item.id || edge.to === selection.item.id).slice(0, 16).map(edge => <li key={edge.id}><button onClick={() => inspect('relationship', edge.id)}>{edge.label}<span>{entityById.get(edge.from)?.label} → {entityById.get(edge.to)?.label}</span></button></li>)}</ul></> : <>
          <dl className="iw-facts"><div><dt>Status</dt><dd>{selection.item.status}{selection.item.statusAsOf ? ` · as of ${dateLabel(selection.item.statusAsOf)}` : ' · status date not established'}</dd></div><div><dt>Recorded dates</dt><dd>{dateLabel(selection.item.fromDate)} → {selection.item.toDate ? dateLabel(selection.item.toDate) : 'End not recorded'}<span>{selection.item.dateBasis}</span></dd></div>{selection.kind === 'record' && <div><dt>Observation period</dt><dd>{selection.item.period}</dd></div>}</dl>
          <Amounts items={selection.item.amounts} />
          {selection.kind === 'relationship' ? <><h4>Recorded endpoints</h4><div className="iw-endpoint-pair"><button onClick={() => inspect('entity', selection.item.from)}>{entityById.get(selection.item.from)?.label ?? selection.item.from}</button><ArrowRight size={15} aria-hidden="true" /><button onClick={() => inspect('entity', selection.item.to)}>{entityById.get(selection.item.to)?.label ?? selection.item.to}</button></div>{selection.item.responseIds.length > 0 && <><h4>Response & counter-evidence</h4><ul className="iw-related-list">{selection.item.responseIds.map(id => { const response = recordById.get(id); return <li key={id}>{response ? <button onClick={() => inspect('record', id)}>{response.title}<span>{response.summary}</span></button> : <span>Response reference retained: {id}</span>}</li>; })}</ul></>}</> : <><h4>Response &amp; unresolved status</h4><p className="iw-response">{selection.item.response}</p>{responseRecords(selection.item).length > 0 && <><h4>Linked responses outside filter limits</h4><ul className="iw-related-list">{responseRecords(selection.item).map(response => <li key={response.id}><button onClick={() => inspect('record', response.id)}>{response.title}<span>{response.summary}</span></button></li>)}</ul></>}{selection.item.entityIds.length > 0 && <><h4>Linked identities</h4><ul className="iw-related-list">{selection.item.entityIds.map(id => <li key={id}><button onClick={() => inspect('entity', id)}>{entityById.get(id)?.label ?? id}</button></li>)}</ul></>}{selection.item.relationshipIds.length > 0 && <><h4>Exact recorded connections</h4><ul className="iw-related-list">{selection.item.relationshipIds.map(id => <li key={id}><button onClick={() => inspect('relationship', id)}>{relationshipById.get(id)?.label ?? id}</button></li>)}</ul></>}</>}
          {selection.item.alternativeExplanations.length > 0 && <><h4>Alternative explanations</h4><ul className="iw-prose-list">{selection.item.alternativeExplanations.map((item, index) => <li key={index}>{item}</li>)}</ul></>}{selection.item.falsifier && <><h4>What would change this assessment?</h4><p>{selection.item.falsifier}</p></>}
        </>}
        <h4>Geographic basis</h4><Geography items={selection.item.geography} />
        {selection.item.limitations.length > 0 && <><h4>Evidence limits</h4><ul className="iw-prose-list">{selection.item.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
        <h4>Source &amp; geographic evidence</h4><CitationList ids={citationIds(selection.item)} onSelect={inspectSource} />
      </article> : <>
        <p className="iw-inspector-intro">Select a state, then a recorded identity, connection or case. Read its source, dates and response before following the next link.</p>
        {/^\/(public-works|tenders)$/u.test(routeKey) && <><ProcurementGuidedEntry onOpen={openProcurementConnections} /><ProcurementAuditEntry /></>}
        <div className="iw-inspector-stats"><span><strong>{number.format(view.records.length)}</strong> records</span><span><strong>{number.format(view.entities.length)}</strong> identities</span></div>
        <h3 className="iw-list-heading">Latest recorded windows</h3><p className="iw-small-note">Known event dates first; undated records follow. This is chronological order, not a significance ranking.</p><ul className="iw-record-list">{orderedRecords.slice(0, 8).map(record => <li key={record.id}><button onClick={() => inspect('record', record.id)}><Tier value={record.tier} /><strong>{record.title}</strong><span>{record.kind} · {record.period}</span></button></li>)}</ul>
        {view.records.length > 8 && <button className="iw-text-button" onClick={() => chooseSurface('evidence')}>Browse all {number.format(view.records.length)} records <ArrowRight size={13} aria-hidden="true" /></button>}
        {!view.records.length && <p className="iw-notice">No records match these filters. Broaden the date, layer or geographic scope. This is a corpus gap, not evidence that no activity occurred.</p>}
        {view.entities.length > 0 && <><h3 className="iw-list-heading">Recorded identities</h3><ul className="iw-related-list">{view.entities.slice(0, 8).map(entity => <li key={entity.id}><button onClick={() => inspect('entity', entity.id)}>{entity.label}<span>{entity.type}</span></button></li>)}</ul></>}
      </>}
    </div>
  </aside>;

  const graph = <section className="iw-graph-panel" aria-label="Linked relationship investigation"><div className="iw-graph-expand"><button className="iw-text-button" onClick={() => chooseSurface(surface === 'connections' ? 'map' : 'connections')}>{surface === 'connections' ? 'Linked map' : 'Expand connections'} <ArrowRight size={13} aria-hidden="true" /></button></div>
    <InvestigationGraph entities={view.entities} relationships={view.relationships} sources={view.sources} selectedNode={activePath ? null : selectedNode} selectedEdge={selectedEdge} depth={depth} view={graphView} onNodeSelect={id => id ? inspect('entity', id) : patch({ iw_node: undefined, iw_edge: undefined, iw_record: undefined, iw_source: undefined })} onEdgeSelect={id => id ? inspect('relationship', id) : patch({ iw_edge: undefined })} onDepthChange={value => patch({ iw_depth: value === 1 ? undefined : String(value) })} onViewChange={value => patch({ iw_graph: value === 'graph' ? undefined : value })} highlightEdgeIds={activePath?.relationshipIds} onSourceSelect={inspectSource} />
  </section>;

  return <div className={`investigation-workspace atlas-workbench${isHome ? ' atlas-home' : ''} iw-surface-${surface}${inspectorOpen && (selection || sourceSelection) ? ' iw-inspector-open' : ''}`} data-investigation-workspace="" data-workspace-route={routeKey}>
    <header className="iw-command-header"><div className="iw-topic"><p className="iw-overline">The Public Record Atlas / India</p>{surface === 'dossier' ? <p className="iw-route-title">{routeTitle}</p> : <h1>{isHome ? 'India, connected.' : routeTitle}</h1>}</div>
      <form className="iw-global-search" role="search" onSubmit={submitSearch}><label htmlFor="iw-global-query">Search across people, companies, cases and schemes</label><div><Search size={16} aria-hidden="true" /><input id="iw-global-query" type="search" value={queryDraft} onChange={event => setQueryDraft(event.target.value)} placeholder="Trace a person, company, case or scheme" /><button type="submit">Search</button></div></form>
      <div className="iw-command-actions">{(selection || sourceSelection) && <button className="iw-mobile-inspect iw-icon-button" aria-label="Inspect selected evidence" onClick={() => setInspectorOpen(true)}><FileText size={17} aria-hidden="true" /></button>}<button className="iw-icon-button" aria-label="Copy investigation link" onClick={copyLink}><Share2 size={17} aria-hidden="true" /></button><button className="iw-icon-button" aria-label="Open local casebook" onClick={() => chooseSurface('casebook')}><BookmarkPlus size={17} aria-hidden="true" /></button></div>
    </header>
    {isHome && surface === 'map' && <AtlasSectorStrip domains={params.has('iw_domains') ? filters.domains : undefined} onDomainsChange={values => patch({ iw_domains: values ? values.join(',') || 'none' : undefined })} />}
    <div className="iw-control-bar"><div className="iw-scope-controls"><label><span id="iw-state-label">Place</span><select aria-labelledby="iw-state-label" value={filters.stateCode ?? ''} onChange={event => chooseState(event.target.value || null)}><option value="">All India</option>{INVESTIGATION_STATES.map(state => <option key={state.code} value={state.code}>{state.name}</option>)}</select></label><label><span id="iw-scope-label">Topic scope</span><select aria-labelledby="iw-scope-label" value={scope} onChange={event => patch({ iw_scope: event.target.value === 'all' ? 'all' : undefined, iw_domains: undefined })}><option value="route">{routeLens.label}</option><option value="all">All topics · cross-domain</option>{scope === 'overlay' && <option value="overlay">Selected sectors ({filters.domains?.length ?? 0})</option>}</select></label><button className="iw-filter-toggle" aria-expanded={advanced} aria-controls="iw-advanced-filters" onClick={() => setAdvanced(value => !value)}><SlidersHorizontal size={15} aria-hidden="true" />Layers &amp; dates{(selectedLayers || selectedTiers || filters.from || filters.to) && <span className="iw-active-dot" aria-label="Filters active" />}</button></div>
      <nav className="iw-surfaces" aria-label="Investigation surface">{surfaces.map(item => <button key={item.value} aria-pressed={surface === item.value} onClick={() => chooseSurface(item.value)}><item.icon size={14} aria-hidden="true" /><span>{item.label}</span></button>)}</nav>
    </div>
    {advanced && <section className="iw-advanced" id="iw-advanced-filters" aria-label="Investigation layers and date filters"><fieldset className="iw-layer-fieldset"><legend><Layers size={14} aria-hidden="true" />Evidence layers</legend><div>{INVESTIGATION_LAYERS.map(layer => <label key={layer.value}><input type="checkbox" checked={!selectedLayers || selectedLayers.includes(layer.value)} onChange={() => toggleChoice('iw_layers', layer.value, selectedLayers, INVESTIGATION_LAYERS)} /><span>{layer.label}</span></label>)}</div></fieldset><fieldset className="iw-tier-fieldset"><legend>Evidence tier</legend><div>{tiers.map(tier => <label key={tier.value}><input type="checkbox" checked={!selectedTiers || selectedTiers.includes(tier.value)} onChange={() => toggleChoice('iw_tier', tier.value, selectedTiers, tiers)} /><Tier value={tier.value} /></label>)}</div></fieldset><div className="iw-date-controls"><label><span>Recorded window — from</span><input type="date" value={validDate(params.get('iw_from')) ? params.get('iw_from')! : ''} onChange={event => patch({ iw_from: event.target.value || undefined })} /></label><label><span>Recorded window — through</span><input type="date" value={validDate(params.get('iw_to')) ? params.get('iw_to')! : ''} onChange={event => patch({ iw_to: event.target.value || undefined })} /></label><label className="iw-checkbox"><input type="checkbox" checked={filters.includeUndated} onChange={event => patch({ iw_undated: event.target.checked ? undefined : '0' })} /><span>Include undated records</span></label></div><div className="iw-geography-controls"><label><span id="iw-geo-label">Geographic basis</span><select aria-labelledby="iw-geo-label" value={filters.geographyMode} onChange={event => patch({ iw_geo: event.target.value === 'all' ? undefined : event.target.value })}><option value="all">All recorded geography — bases shown separately</option><option value="coverage">Project / institution / programme coverage</option><option value="associations">Headquarters / constituency / state associations</option></select></label><label className="iw-checkbox"><input type="checkbox" checked={filters.includeNational} onChange={event => patch({ iw_national: event.target.checked ? undefined : '0' })} /><span>Retain national context in state views</span></label><label><span id="iw-compare-label">Compare state coverage</span><select aria-labelledby="iw-compare-label" value={compareState ?? ''} onChange={event => patch({ iw_compare: event.target.value || undefined })}><option value="">No comparison</option>{INVESTIGATION_STATES.filter(state => state.code !== filters.stateCode).map(state => <option key={state.code} value={state.code}>{state.name}</option>)}</select></label></div><p className="iw-small-note">Date filters select overlapping known event or observation windows; an absent end date does not imply an ongoing role. Undated and national-context records remain explicit. Coverage is not an outcome or misconduct ranking. Endpoint identities remain visible as context for matching relationships.</p></section>}
    <div className="iw-result-bar" role="status"><p><strong>{number.format(view.totals.records)}</strong> / {number.format(view.denominator.records)} registry records <span>·</span> <strong>{number.format(view.totals.entities)}</strong> identities <span>·</span> <strong>{number.format(view.totals.relationships)}</strong> sourced connections <span>·</span> {number.format(view.totals.sources)} sources</p><div><span>{scope === 'overlay' ? `Selected sectors (${filters.domains?.length ?? 0})` : scope === 'all' ? 'All topics' : routeLens.label}{filters.stateCode ? ` · ${stateByCode.get(filters.stateCode)}` : ' · India'}</span>{hasWorkspaceState && <button onClick={reset}>Reset workspace</button>}</div></div>
    {routeStateRaw && !routeState && !params.has('iw_state') && <p className="iw-invalid">This legacy state dossier does not establish a current geographic boundary. Choose a current state explicitly; the dossier remains available.</p>}
    {routeEntity?.resolved && surface !== 'dossier' && <div className="iw-route-entity"><span>Exact route identity: <strong>{routeEntity.label}</strong></span><button className="iw-button" onClick={() => { chooseSurface('connections'); inspect('entity', routeEntity.id); }}>Focus {routeEntity.label} in connections <ArrowRight size={12} aria-hidden="true" /></button><button className="iw-text-button" onClick={() => chooseSurface('dossier')}>Open dossier</button></div>}
    {invalid.length > 0 && <p className="iw-invalid" role="status">This link contains an unavailable or invalid {invalid.join(', ')} value. Valid filters still apply; invalid controls use their stated defaults. <button onClick={reset}>Reset workspace filters</button></p>}
    {status && <p className="iw-action-status" role="status"><Check size={14} aria-hidden="true" />{status}</p>}{shareUrl && <label className="iw-share-fallback"><span>Investigation link</span><input readOnly value={shareUrl} onFocus={event => event.target.select()} /></label>}
    {comparison && <section className="iw-comparison" aria-label="State evidence coverage comparison"><h2>Compare recorded coverage</h2>{[activeState, comparison].filter(item => item !== undefined).map(item => <div key={item.stateCode}><strong>{item.name}</strong><span>{number.format(item.coverageRecords)} coverage records</span><span>{number.format(item.associationRecords)} association records</span><span>{number.format(item.nationalContextRecords)} national-context records</span></div>)}{!activeState && <p>Select a primary state on the map to compare two places.</p>}<p>Counts describe this corpus and these filters. They do not measure population need, spending, performance or wrongdoing.</p></section>}

    {surface === 'dossier' ? <div className="iw-dossier-layout"><div className="iw-context-rail">{contextMap(true)}</div><section className="iw-dossier-content" ref={dossierContent} aria-label={`${routeTitle} complete dossier`} tabIndex={-1}><div className="iw-dossier-note"><BookOpen size={15} aria-hidden="true" /><span>Complete route dossier · its original filters and saved lists remain available.</span><button onClick={() => chooseSurface('map')}>Back to map</button></div>{historicalDossierMap && <p className="iw-historical-map-note">The original dossier map uses historical boundaries, including undivided Jammu and Kashmir and separate Dadra and Nagar Haveli / Daman and Diu. The current 36-unit map is retained in this workspace’s geographic context. Legacy records have not been reassigned to new boundaries.</p>}{children}</section></div> : surface === 'casebook' ? <div className="iw-casebook-layout"><div className="iw-context-rail">{contextMap(true)}</div><div className="iw-casebook-content"><Casebook selection={selection ? { kind: selection.kind, id: selection.item.id } : undefined} viewUrl={typeof window === 'undefined' ? `${location.pathname}${location.search}` : window.location.href} onInspect={(item: { kind: SelectionKind; id: string }) => { chooseSurface('evidence'); inspect(item.kind, item.id); }} /></div></div> : <div className="iw-investigation-layout">
      <div className="iw-canvas-area">
        {surface === 'evidence' ? <div className="iw-evidence-layout"><div className="iw-context-rail">{contextMap(true)}</div><section className="iw-evidence-ledger" aria-label="Filtered evidence records"><div className="iw-panel-heading"><div><p className="iw-overline">Evidence ledger</p><h2>{number.format(view.records.length)} matching records</h2></div><button className="iw-button" onClick={exportRecords} disabled={!view.records.length}>Export records CSV</button></div><p className="iw-small-note">Latest known event windows first, undated records last. Each row keeps its evidence tier, observation period, response and source. Selecting a row opens the full record in the inspector.</p><ul className="iw-record-list iw-ledger-list">{orderedRecords.slice(0, recordLimit).map(record => <li key={record.id}><button onClick={() => inspect('record', record.id)} aria-pressed={selection?.kind === 'record' && selection.item.id === record.id}><Tier value={record.tier} /><strong>{record.title}</strong><p>{record.summary}</p><span>{record.kind} · {record.period} · {record.sourceIds.length} source records</span></button><button className="iw-pin-row" aria-label={`Pin ${record.title}`} onClick={() => pin('record', record.id)}><BookmarkPlus size={15} aria-hidden="true" /></button></li>)}</ul>{recordLimit < view.records.length && <button className="iw-button iw-more" onClick={() => setRecordLimit(value => value + 30)}>Show more records ({recordLimit} of {number.format(view.records.length)} shown)</button>}{!view.records.length && <p className="iw-notice">No records match this query. Broaden the filters or open the complete dossier; absence in this curated view does not establish absence of activity.</p>}</section></div> : <><div className="atlas-time-row"><AtlasTimeControl filters={filters} records={view.records} onChange={({ from, to }) => patch({ iw_from: from, iw_to: to })} /></div><div className="iw-linked-canvases">{contextMap(surface === 'connections')}{surface === 'map' ? <aside className="atlas-evidence-dock"><AtlasCaseFeed registry={INVESTIGATION_REGISTRY} filters={filters} onRelationshipSelect={id => inspect('relationship', id)} onRecordSelect={id => inspect('record', id)} onSourceSelect={inspectSource} /></aside> : graph}</div>{surface === 'map' && <section className="atlas-linked-network"><div className="atlas-section-heading"><div><h2>Recorded connections</h2></div><button className="iw-button" onClick={() => chooseSurface('connections')}>Open connection workspace <ArrowRight size={14} /></button></div><AtlasNetwork registry={INVESTIGATION_REGISTRY} filters={filters} onSourceSelect={inspectSource} /></section>}<details className="atlas-policy-section" open={routeKey === '/policy'}><summary>Laws, rules &amp; ownership changes <span>Inspect the instrument and its legal status</span></summary><AtlasPolicyTimeline registry={INVESTIGATION_REGISTRY} filters={filters} onRecordSelect={id => inspect('record', id)} /></details></>}
        <details className="iw-trace" ref={tracePanel}><summary><GitBranch size={15} aria-hidden="true" /><span>Trace a recorded path</span><small>Identity → connection → source</small></summary><div className="iw-trace-content"><p>Choose two resolved identities. Search traverses up to five steps and 1,500 entities, returning up to three paths. Connectivity is not evidence of causation or improper influence.</p><div className="iw-path-pickers"><IdentityPicker label="Path start" selected={entityById.get(pathStart)} candidates={view.entities} onChoose={id => patch({ iw_pathFrom: id, iw_path: undefined })} /><IdentityPicker label="Path end" selected={entityById.get(pathEnd)} candidates={view.entities} onChoose={id => patch({ iw_pathTo: id, iw_path: undefined })} /><label><span id="iw-direction-label">Traversal</span><select aria-labelledby="iw-direction-label" value={pathDirection} onChange={event => patch({ iw_direction: event.target.value === 'both' ? undefined : event.target.value })}><option value="both">Both directions, with original edge direction shown</option><option value="directed">Recorded direction only</option></select></label></div>{paths && <div className="iw-path-results"><p role="status">{paths.paths.length} paths returned · {number.format(paths.searchedEntities)} entities searched{paths.truncated ? ' · search limit reached' : ''}. {paths.reason}</p>{paths.paths.map((path, index) => <article key={index}><button className="iw-path-choice" aria-pressed={pathIndex === index} onClick={() => patch({ iw_path: index ? String(index) : undefined, iw_view: 'connections' })}>Path {index + 1} · {path.relationshipIds.length} recorded steps</button><ol>{path.entityIds.map((id, position) => <li key={`${id}-${position}`}><button onClick={() => inspect('entity', id)}>{entityById.get(id)?.label ?? id}</button>{path.relationshipIds[position] && <button className="iw-path-edge" onClick={() => inspect('relationship', path.relationshipIds[position])}>{relationshipById.get(path.relationshipIds[position])?.label ?? 'Read connection'} <ArrowRight size={12} aria-hidden="true" /></button>}</li>)}</ol></article>)}</div>}{(pathStart || pathEnd) && <button className="iw-text-button" onClick={() => patch({ iw_pathFrom: undefined, iw_pathTo: undefined, iw_path: undefined })}>Clear path endpoints</button>}</div></details>
        <details className="iw-review"><summary><FileText size={15} aria-hidden="true" /><span>Questions the records can support</span><small>{questions.length} structured checks</small></summary><div className="iw-review-content">{questions.map(question => <article key={question.id}><h3>{question.title}</h3><p>{question.summary}</p><p className="iw-review-denominator">{number.format(question.numerator)} / {number.format(question.denominator)} · {question.denominatorLabel}</p><h4>Other explanations</h4><ul>{question.alternativeExplanations.map((item, index) => <li key={index}>{item}</li>)}</ul><h4>What would resolve it?</h4><p>{question.falsifier}</p>{question.limitations.map((item, index) => <p className="iw-small-note" key={index}>{item}</p>)}<div className="iw-selection-actions">{question.recordIds.slice(0, 3).map(id => <button key={id} className="iw-button" onClick={() => inspect('record', id)}>Inspect record</button>)}{question.entityIds.slice(0, 3).map(id => <button key={id} className="iw-button" onClick={() => inspect('entity', id)}>{entityById.get(id)?.label ?? 'Inspect identity'}</button>)}</div><CitationList ids={question.sourceIds} onSelect={inspectSource} /></article>)}{!questions.length && <p>No structured comparison can be supported by the selected records. This does not establish that the underlying activity is free of problems.</p>}</div></details>
      </div>{(surface !== 'map' || inspectorOpen && (selection || sourceSelection)) && inspector}
    </div>}
    <footer className="iw-workspace-footer"><span>Evidence snapshot · {dateLabel(INVESTIGATION_UPDATED_AT)}</span><span>{number.format(view.heldCount)} items held outside the drawable graph</span><Link to={sourceDossierUrl('/method')}>Evidence method <ArrowUpRight size={12} aria-hidden="true" /></Link></footer>
  </div>;
}
