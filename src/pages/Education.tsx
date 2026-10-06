import { useHistorySearchDrafts } from '../lib/useHistorySearchDrafts';
import { preserveWorkspaceParams } from '../lib/dossierNavigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownRight, Bookmark, Check, Download, Link as LinkIcon, Search } from 'lucide-react';
import { Kicker, PageTitle } from '../components/Editorial';
import {
  EDUCATION_UPDATED_AT, EDUCATION_STATES, EDUCATION_LOCALITIES, EDUCATION_SOURCES,
  EDUCATION_CHANNELS, EDUCATION_MANAGEMENTS, EDUCATION_LEVELS,
  EDUCATION_METHODOLOGY, EDUCATION_COVERAGE_NOTES, EDUCATION_SCHOOL_SERIES,
  getEducationSources, getEducationPrograms, getEducationFlows, getEducationLeads,
  getEducationSchoolSeries, getSchoolCountChange, educationCsvCell,
  type EducationFilters, type EducationSource, type EducationSchoolSeries,
} from '../data/education';
import './education.css';

const SAVED_KEY = 'icip-education-reading-list-v1';
const sourceById = new Map(EDUCATION_SOURCES.map(source => [source.id, source]));
const stateByCode = new Map(EDUCATION_STATES.map(state => [state.code, state.name]));
const localityById = new Map(EDUCATION_LOCALITIES.map(place => [place.id, place.name]));
const number = new Intl.NumberFormat('en-IN');
const channelLabel = (id: string) => EDUCATION_CHANNELS.find(choice => choice.value === id)?.label ?? id;
const managementLabel = (id: string) => EDUCATION_MANAGEMENTS.find(choice => choice.value === id)?.label ?? id;
const levelLabel = (id: string) => EDUCATION_LEVELS.find(choice => choice.value === id)?.label ?? id;
const dateLabel = (date: string) => {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const evidenceLabel: Record<EducationSource['tier'], string> = {
  primary: 'Primary record', reported: 'News report', 'self-reported': 'Self-reported',
};

function choiceValue<T extends string>(value: string | null, choices: { value: T }[]): T | undefined {
  return choices.find(choice => choice.value === value)?.value;
}

function sourcePlace(source: EducationSource) {
  if (source.geographicLabel) return `${source.scope === 'national' ? 'National context · ' : ''}${source.geographicLabel}`;
  if (source.scope === 'national') return 'National context';
  const places = source.localityIds.map(id => localityById.get(id) ?? id);
  return [...places, ...source.stateCodes.map(code => stateByCode.get(code) ?? code)].join(' · ') || source.scope;
}

function SectionHeading({ index, id, title, count }: { index: string; id: string; title: string; count?: string }) {
  return <div className="edu-section-heading">
    <span className="edu-section-index" aria-hidden="true">{index}</span>
    <h2 id={id} tabIndex={-1}>{title}</h2>
    {count && <span className="edu-count">{count}</span>}
  </div>;
}

function jumpTo(id: string) {
  const section = document.getElementById(id);
  section?.querySelector('h2')?.focus({ preventScroll: true });
  section?.scrollIntoView({ block: 'start' });
}

function DiscoveryLinks({ place, stateCode }: { place?: string; stateCode?: string }) {
  const geography = [place, stateCode ? stateByCode.get(stateCode) : 'India'].filter(Boolean).join(' ');
  const query = encodeURIComponent(`site:gov.in ${geography} education school college funding budget`);
  return <div className="edu-discovery">
    <h4>Continue the local evidence search</h4>
    <p>Use official portals to identify institutions, then seek sanction orders, releases and utilisation certificates for the same financial year. These external links start a new search; their results are not verified by this register.</p>
    <div className="edu-inline-sources">
      <a href="https://udiseplus.gov.in/" target="_blank" rel="noopener noreferrer">UDISE+ school records ↗</a>
      <a href="https://aishe.gov.in/aishe-final-report/" target="_blank" rel="noopener noreferrer">AISHE college reports ↗</a>
      {sourceById.get('samagra-pab-index') && <a href={sourceById.get('samagra-pab-index')!.url} target="_blank" rel="noopener noreferrer">State Samagra Shiksha PAB archive ↗</a>}
      <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer">Search official records for {geography} ↗</a>
    </div>
  </div>;
}

function SourceLinks({ ids }: { ids: string[] }) {
  return <div className="edu-inline-sources" aria-label="Supporting sources">
    {ids.map(id => {
      const source = sourceById.get(id);
      return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>
        {source.publisher}<span aria-hidden="true"> ↗</span><span className="sr-only">: {source.title} (opens in a new tab)</span>
      </a> : null;
    })}
  </div>;
}

function EmptyState({ title, children, onReset }: { title: string; children: ReactNode; onReset?: () => void }) {
  return <div className="edu-empty">
    <h3>{title}</h3>
    <p>{children}</p>
    {onReset && <button className="edu-button" onClick={onReset}>Clear filters</button>}
  </div>;
}

function SchoolTable({ series }: { series: EducationSchoolSeries[] }) {
  const years = [...new Set(series.flatMap(row => row.points.map(point => point.year)))].sort();
  return <div className="edu-table-scroll" tabIndex={0} role="region" aria-label="School counts table, horizontally scrollable">
    <table className="edu-table">
      <caption>Reported government-school stocks. A net change does not identify school closures.</caption>
      <thead><tr><th scope="col">Geography</th>{years.map(year => <th scope="col" className="edu-numeric" key={year}>{year}</th>)}<th scope="col" className="edu-numeric">Net change</th><th scope="col">Evidence</th></tr></thead>
      <tbody>{series.map(row => {
        const change = getSchoolCountChange(row);
        return <tr key={row.id}>
          <th scope="row">{row.name}{row.localityId ? <span className="block text-xs text-text-muted">District · {stateByCode.get(row.stateCode)}</span> : row.stateCode === 'IN' ? <span className="block text-xs text-text-muted">National total</span> : null}</th>
          {years.map(year => { const point = row.points.find(item => item.year === year); return <td className="edu-numeric" key={year}>{point ? number.format(point.value) : 'Not recorded'}</td>; })}
          <td className="edu-numeric edu-change">{change ? `${change.change > 0 ? '+' : ''}${number.format(change.change)}` : '—'}{change?.percentage != null && <span className="block text-xs text-text-muted">{change.percentage > 0 ? '+' : ''}{change.percentage.toFixed(1)}%</span>}</td>
          <td><SourceLinks ids={row.sourceIds} /></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function SchoolTrend({ series }: { series: EducationSchoolSeries }) {
  const change = getSchoolCountChange(series);
  if (!change) return null;
  const points = [...series.points].sort((a, b) => a.year.localeCompare(b.year));
  const minimum = Math.min(...points.map(point => point.value));
  const maximum = Math.max(...points.map(point => point.value));
  const padding = Math.max((maximum - minimum) * 0.3, maximum * 0.005, 1);
  const lower = Math.max(0, Math.floor(minimum - padding));
  const upper = Math.ceil(maximum + padding);
  const y = (value: number) => 175 - ((value - lower) / (upper - lower)) * 145;
  const plot = (compact: boolean) => {
    const left = compact ? 110 : 78;
    const right = compact ? 345 : 648;
    const fontSize = compact ? 17 : 11;
    const x = (index: number) => left + index * ((right - left) / Math.max(points.length - 1, 1));
    return <svg className={compact ? 'edu-trend-chart-narrow' : 'edu-trend-chart-wide'} viewBox={compact ? '0 0 380 250' : '0 0 690 225'} role="img" aria-label={`${series.name}: reported government-school counts ${points.map(point => `${point.year}: ${point.value}`).join('; ')}. Vertical axis begins at ${lower}, not zero.`}>
      {[lower, Math.round((lower + upper) / 2), upper].map(tick => <g key={tick}><line x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke="var(--color-border-light)" /><text x={left - 13} y={y(tick) + 5} textAnchor="end" fill="var(--color-text-muted)" fontSize={fontSize} fontFamily="var(--font-mono)">{number.format(tick)}</text></g>)}
      <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2.5" points={points.map((point, i) => `${x(i)},${y(point.value)}`).join(' ')} />
      {points.map((point, i) => <g key={point.year}><circle cx={x(i)} cy={y(point.value)} r="4" fill="var(--color-accent)" /><text x={x(i)} y="203" textAnchor="middle" fill="var(--color-text-secondary)" fontSize={fontSize} fontFamily="var(--font-mono)">{compact ? <><tspan x={x(i)}>{point.year.slice(0, 4)}</tspan><tspan x={x(i)} dy="22">{point.year.slice(4)}</tspan></> : point.year}</text></g>)}
    </svg>;
  };
  return <div className="edu-trend">
    <div><p className="edu-overline">{series.localityId ? 'District' : series.stateCode === 'IN' ? 'National total' : 'State / union territory'} · {series.name}</p>
      <p className="edu-trend-value">{number.format(change.last.value)}</p><p className="edu-trend-caption">government schools reported in {change.last.year}</p>
      <p className="edu-trend-change">{change.change > 0 ? '+' : ''}{number.format(change.change)} since {change.first.year}<br /><span>Net change in reported stock</span></p>
    </div>
    <div>{plot(false)}{plot(true)}<p className="edu-trend-axis">Vertical axis starts at {number.format(lower)} to show year-to-year variation. Exact values appear in the table.</p></div>
  </div>;
}

/** A compiled, source-led register. Query state lives in the URL; only the reading list is local. */
export default function Education() {
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const filters = useMemo<EducationFilters>(() => ({
    stateCode: EDUCATION_STATES.some(state => state.code === params.get('state')) ? params.get('state')! : undefined,
    q: params.get('q')?.trim() || undefined,
    place: params.get('place')?.trim() || undefined,
    channel: choiceValue(params.get('channel'), EDUCATION_CHANNELS),
    management: choiceValue(params.get('management'), EDUCATION_MANAGEMENTS),
    level: choiceValue(params.get('level'), EDUCATION_LEVELS),
  // The serialized key changes for browser back/forward as well as filter actions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [paramsKey]);
  const [queryDraft, setQueryDraft] = useState(filters.q ?? '');
  const [placeDraft, setPlaceDraft] = useState(filters.place ?? '');
  useHistorySearchDrafts(setQueryDraft, setPlaceDraft);
  const [visibleSources, setVisibleSources] = useState(8);
  const [visibleFlows, setVisibleFlows] = useState(6);
  const [visibleLeads, setVisibleLeads] = useState(4);
  const [visibleCounts, setVisibleCounts] = useState(8);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && sourceById.has(id)) : [];
    } catch { return []; }
  });
  const savedOnly = params.get('saved') === '1';
  const countScope = params.get('counts') === 'district' ? 'district' : 'state';
  const invalidParams = [
    params.has('state') && !EDUCATION_STATES.some(state => state.code === params.get('state')) ? 'state' : null,
    params.has('channel') && !choiceValue(params.get('channel'), EDUCATION_CHANNELS) ? 'funding channel' : null,
    params.has('management') && !choiceValue(params.get('management'), EDUCATION_MANAGEMENTS) ? 'management' : null,
    params.has('level') && !choiceValue(params.get('level'), EDUCATION_LEVELS) ? 'education level' : null,
    params.has('counts') && !['state', 'district'].includes(params.get('counts')!) ? 'school-count geography' : null,
    params.has('saved') && !['0', '1'].includes(params.get('saved')!) ? 'reading list' : null,
  ].filter(Boolean);

  useEffect(() => { setQueryDraft(filters.q ?? ''); }, [filters.q]);
  useEffect(() => { setPlaceDraft(filters.place ?? ''); }, [filters.place]);
  useEffect(() => {
    setVisibleSources(8);
    setVisibleFlows(6);
    setVisibleLeads(4);
    setVisibleCounts(8);
    setShareUrl('');
    setStatus('');
  }, [paramsKey]);

  const patch = (values: Record<string, string | undefined>) => {
    // History commits before a concurrent router render can finish. A rapid next
    // action must compose from that latest URL rather than this render's parameters.
    const route = new URL(window.location.hash.slice(1), window.location.origin);
    const next = new URLSearchParams(route.search);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // A committed filter is a navigable step; Back restores the previous research view.
    setParams(next);
  };
  const reset = () => { setQueryDraft(''); setPlaceDraft(''); setParams(preserveWorkspaceParams(new URLSearchParams(), params)); };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    patch({ q: queryDraft.trim() || undefined, place: placeDraft.trim() || undefined });
  };
  const matchedSources = useMemo(() => getEducationSources(filters), [filters]);
  const sources = useMemo(() => savedOnly ? matchedSources.filter(source => saved.includes(source.id)) : matchedSources, [matchedSources, savedOnly, saved]);
  const programs = useMemo(() => getEducationPrograms(filters), [filters]);
  const flows = useMemo(() => getEducationFlows(filters), [filters]);
  const leads = useMemo(() => getEducationLeads(filters), [filters]);
  const schoolSeries = useMemo(() => getEducationSchoolSeries(filters).filter(row => countScope === 'district' ? Boolean(row.localityId) : !row.localityId), [filters, countScope]);
  const hasFilters = Boolean(filters.stateCode || filters.q || filters.place || filters.channel || filters.management || filters.level || savedOnly);
  const nationalCount = sources.filter(source => source.scope === 'national').length;
  const stateSeriesCount = new Set(EDUCATION_SCHOOL_SERIES.filter(row => !row.localityId && row.stateCode !== 'IN').map(row => row.stateCode)).size;
  const districtSeriesCount = EDUCATION_SCHOOL_SERIES.filter(row => row.localityId).length;
  const trendSeries = schoolSeries.find(row => row.id === params.get('trend')) ?? schoolSeries[0];

  const toggleSave = (source: EducationSource) => {
    const wasSaved = saved.includes(source.id);
    const next = wasSaved ? saved.filter(id => id !== source.id) : [...saved, source.id];
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setStatus(wasSaved ? 'Removed from your reading list.' : 'Saved to your reading list on this browser.');
    } catch {
      setStatus('Reading list updated for this session. Browser storage is unavailable.');
    }
  };
  const exportSources = () => {
    const columns = ['id', 'title', 'publisher', 'type', 'evidence', 'published_at', 'period', 'geographic_scope', 'geographic_label', 'states', 'localities', 'funding_channels', 'management', 'level', 'establishes', 'limitations', 'source_url', 'retrieved_at', 'retrieval_status', 'locator'];
    const rows = sources.map(source => [source.id, source.title, source.publisher, source.type, evidenceLabel[source.tier], source.publishedAt ?? '', source.period, source.scope,
      source.geographicLabel ?? '',
      source.stateCodes.map(code => stateByCode.get(code) ?? code).join('; '), source.localityIds.map(id => localityById.get(id) ?? id).join('; '),
      source.channels.map(channelLabel).join('; '), source.managements.map(managementLabel).join('; '), source.levels.map(levelLabel).join('; '), source.summary,
      source.limitations.join('; '), source.url, source.retrievedAt, source.retrievalStatus ?? '', source.locator ?? '']);
    const csv = '\uFEFF' + [columns, ...rows].map(row => row.map(educationCsvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `education-sources-${EDUCATION_UPDATED_AT}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Exported ${sources.length} matching source${sources.length === 1 ? '' : 's'} with provenance and limitations.`);
  };
  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(savedOnly ? 'Link copied. The recipient’s reading list is local to their browser.' : 'Link copied with your current filters.');
    } catch {
      setShareUrl(url);
      setStatus('Select and copy the research link below.');
    }
  };

  return <div className="education-page">
    <header className="edu-hero">
      <div>
        <Kicker>India / The education register</Kicker>
        <PageTitle>Who funds the classroom?</PageTitle>
        <p className="edu-intro">Follow the money behind India’s <strong>schools and colleges</strong>. Explore government budgets, private funding and philanthropy — then examine what the evidence says about access.</p>
        <p className="edu-hero-date">Research snapshot · {dateLabel(EDUCATION_UPDATED_AT)} · Source links open the original record</p>
      </div>
      <aside className="edu-coverage-note" aria-labelledby="edu-coverage-title">
        <p className="edu-overline">Read the boundary</p>
        <h2 id="edu-coverage-title">A growing register. A visible edge.</h2>
        <p>{EDUCATION_STATES.length} states and union territories are searchable. {EDUCATION_SOURCES.length} curated source records are loaded. Local funding coverage varies; a missing record is not zero funding.</p>
        <button onClick={() => jumpTo('education-coverage')}>See coverage &amp; methodology <ArrowDownRight size={15} className="inline-block" aria-hidden="true" /></button>
      </aside>
    </header>

    <nav className="edu-section-nav" aria-label="On this education page">
      <button onClick={() => jumpTo('education-sources')}><span>01</span> Documents &amp; news</button>
      <button onClick={() => jumpTo('education-funding')}><span>02</span> Funding routes</button>
      <button onClick={() => jumpTo('education-investigations')}><span>03</span> Questions to investigate</button>
      <button onClick={() => jumpTo('education-school-counts')}><span>04</span> School counts</button>
    </nav>

    <section className="edu-workbench" aria-labelledby="edu-workbench-title">
      <div className="edu-workbench-heading">
        <h2 id="edu-workbench-title">Start with a place. Follow a source.</h2>
        <p>Filters stay in the link.</p>
      </div>
      {invalidParams.length > 0 && <div className="edu-invalid" role="status">This link has an unrecognised {invalidParams.join(', ')} filter. Those values were ignored. <button className="edu-text-button" onClick={reset}>Reset filters</button></div>}
      <form onSubmit={submitSearch} aria-label="Search the education register">
        <div className="edu-search-fields">
          <label className="edu-field"><span className="edu-label">State or union territory</span>
            <select value={filters.stateCode ?? ''} onChange={event => patch({ state: event.target.value || undefined })}>
              <option value="">All states &amp; UTs</option>
              {EDUCATION_STATES.map(state => <option key={state.code} value={state.code}>{state.name}</option>)}
            </select>
          </label>
          <label className="edu-field"><span className="edu-label">City or district</span>
            <input type="search" value={placeDraft} onChange={event => setPlaceDraft(event.target.value)} placeholder="e.g. Lucknow" list="edu-locality-options" aria-describedby="edu-search-scope" />
          </label>
          <datalist id="edu-locality-options">{EDUCATION_LOCALITIES.filter(place => !filters.stateCode || place.stateCode === filters.stateCode).map(place => <option key={place.id} value={place.name} />)}</datalist>
          <label className="edu-field"><span className="edu-label">Topic, organisation or document</span>
            <input type="search" value={queryDraft} onChange={event => setQueryDraft(event.target.value)} placeholder="e.g. CSR, Samagra Shiksha" />
          </label>
          <button className="edu-button edu-button-primary" type="submit"><Search size={16} aria-hidden="true" />Search</button>
        </div>
        <div className="edu-filter-fields">
          <label className="edu-field"><span className="edu-label">Funding channel</span><select value={filters.channel ?? ''} onChange={event => patch({ channel: event.target.value || undefined })}>
            <option value="">All funding channels</option>{EDUCATION_CHANNELS.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select></label>
          <label className="edu-field"><span className="edu-label">Institution management</span><select value={filters.management ?? ''} onChange={event => patch({ management: event.target.value || undefined })}>
            <option value="">All management types</option>{EDUCATION_MANAGEMENTS.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select></label>
          <label className="edu-field"><span className="edu-label">Education level</span><select value={filters.level ?? ''} onChange={event => patch({ level: event.target.value || undefined })}>
            <option value="">Schools &amp; colleges</option>{EDUCATION_LEVELS.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select></label>
        </div>
      </form>
      <p className="edu-workbench-note" id="edu-search-scope">State filters include national context. City and district searches match the curated text and recorded localities; they are not a complete local funding census.</p>
      <div className="edu-workbench-footer">
        <p className="edu-result-summary" role="status"><strong>{sources.length}</strong> of {EDUCATION_SOURCES.length} source records{savedOnly ? ' · reading list only' : ''}{filters.stateCode && nationalCount > 0 ? ` · ${nationalCount} national context` : ''}</p>
        <div className="edu-tools">
          <button className="edu-button" onClick={() => patch({ saved: savedOnly ? undefined : '1' })} aria-pressed={savedOnly}><Bookmark size={14} aria-hidden="true" />Saved ({saved.length})</button>
          <button className="edu-button" onClick={copyLink}><LinkIcon size={14} aria-hidden="true" />Copy link</button>
          <button className="edu-button" onClick={exportSources} disabled={sources.length === 0}><Download size={14} aria-hidden="true" />Export CSV</button>
          {hasFilters && <button className="edu-text-button" onClick={reset}>Clear filters</button>}
        </div>
      </div>
      <p className="edu-status" role="status">{status}</p>
      {shareUrl && <label className="edu-field mt-3"><span className="edu-label">Research link</span><input readOnly value={shareUrl} onFocus={event => event.target.select()} /></label>}
    </section>

    <section className="edu-section" id="education-sources" aria-labelledby="edu-sources-title">
      <SectionHeading index="01" id="edu-sources-title" title="The document trail" count={`${sources.length} matching records`} />
      <div className="edu-document-layout">
        <div className="edu-documents">
          {sources.length === 0 ? <><EmptyState title={savedOnly ? 'No saved sources in this view.' : 'No source records match this view.'} onReset={hasFilters ? reset : undefined}>
            {savedOnly ? 'Save a document with its bookmark button, or broaden your filters. Your reading list is stored only in this browser.' : 'This is a gap in this curated register, not evidence that funding or institutions do not exist. Try a state, a different place spelling, or a broader topic.'}
          </EmptyState>{!savedOnly && <DiscoveryLinks place={filters.place} stateCode={filters.stateCode} />}</> : sources.slice(0, visibleSources).map(source => <article className="edu-source" id={`edu-source-${source.id}`} key={source.id}>
            <div className="edu-source-head"><div>
              <p className="edu-meta"><span className="edu-evidence" data-tier={source.tier}>{evidenceLabel[source.tier]}</span><span>{source.type}</span><span>{source.publishedAt ? dateLabel(source.publishedAt) : 'Publication date not recorded'}</span></p>
              <h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></h3>
            </div><button className="edu-save" onClick={() => toggleSave(source)} aria-pressed={saved.includes(source.id)} aria-label={`${saved.includes(source.id) ? 'Remove saved source' : 'Save source'}: ${source.title}`} title={saved.includes(source.id) ? 'Remove from reading list' : 'Save to reading list'}>
              {saved.includes(source.id) ? <Check size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}
            </button></div>
            <p className="edu-source-summary">{source.summary}</p>
            <p className="edu-source-tags"><strong>{source.publisher}</strong> · {sourcePlace(source)}<br />{source.channels.map(channelLabel).join(' / ')} · {source.levels.map(levelLabel).join(' / ')}</p>
            <details><summary>Scope, limitations &amp; provenance</summary>
              <p className="edu-retrieved">Period covered: {source.period}<br />Management: {source.managements.map(managementLabel).join(' / ')}<br />Retrieved: {dateLabel(source.retrievedAt)} · Record {source.id}</p>
              {source.geographicLabel && <p className="edu-retrieved">Geographic scope: {source.geographicLabel}</p>}
              {source.retrievalStatus && <p className="edu-retrieved">Retrieval status: {source.retrievalStatus}</p>}
              {source.locator && <p className="edu-retrieved">Within the source: {source.locator}</p>}
              <ul className="edu-limitations">{source.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul>
            </details>
          </article>)}
          {sources.length > visibleSources && <button className="edu-button edu-show-more" onClick={() => setVisibleSources(value => value + 12)}>Show {Math.min(12, sources.length - visibleSources)} more sources · {sources.length - visibleSources} remaining</button>}
        </div>
        <aside className="edu-rail" aria-labelledby="edu-reading-title">
          <p className="edu-overline">A reader’s field guide</p>
          <h3 id="edu-reading-title">Follow the money in stages.</h3>
          <p>A funding announcement is a starting point. The route to a classroom needs several records.</p>
          <ol>
            <li><strong>Find the instrument.</strong><br />Budget, grant, loan, donation or investment? They carry different obligations.</li>
            <li><strong>Check the stage.</strong><br />An allocation, a release and actual expenditure are different observations.</li>
            <li><strong>Follow the recipient.</strong><br />A state total or an NGO’s receipt does not establish what a particular school received.</li>
          </ol>
          <button onClick={() => jumpTo('education-investigations')}>Examine the open questions <ArrowDownRight size={15} className="inline-block" aria-hidden="true" /></button>
        </aside>
      </div>
    </section>

    <section className="edu-section" id="education-funding" aria-labelledby="edu-funding-title">
      <SectionHeading index="02" id="edu-funding-title" title="Different routes into education" count={`${programs.length} mechanisms`} />
      <p className="edu-section-intro">Government schemes, CSR, NGO grants, foreign contributions, development lending and private investment have different recipients and reporting rules. These are sourced mechanisms, not a directory of currently open applications. National eligibility is not evidence of a local disbursement.</p>
      {programs.length ? <div className="edu-program-grid">{programs.map(program => <article className="edu-program" key={program.id}>
        <p className="edu-overline">{program.channels.map(channelLabel).join(' / ')}</p>
        <h3>{program.title}</h3><p>{program.summary}</p>
        {program.constraints.length > 0 && <p className="edu-program-caution">{program.constraints.join(' ')}</p>}
        <SourceLinks ids={program.sourceIds} />
      </article>)}</div> : <EmptyState title="No funding mechanisms match these filters.">Broaden the view to explore the funding routes recorded in this register.</EmptyState>}
      {flows.length > 0 && <div className="edu-flow-list">
        <h3>Amounts in their original context</h3>
        <p>These observations are not added together. Periods, currencies and funding stages differ, and some records may overlap.</p>
        {flows.slice(0, visibleFlows).map(flow => <article className="edu-flow" key={flow.id}>
          <div><h4>{flow.title}</h4><p>{flow.summary}</p><SourceLinks ids={flow.sourceIds} />
            {flow.limitations.length > 0 && <details><summary>Amount limitations</summary><ul className="edu-limitations">{flow.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul></details>}
          </div>
          <div className="edu-flow-amount"><strong>{flow.currency === 'INR' ? '₹' : 'US$'}{number.format(flow.amount)}{flow.unit === 'crore' ? ' cr' : flow.unit === 'million' ? ' mn' : flow.unit === 'lakh' ? ' lakh' : ''}</strong><span>{flow.stage.toUpperCase()}<br />{flow.period}</span></div>
        </article>)}
        {flows.length > visibleFlows && <button className="edu-button edu-show-more" onClick={() => setVisibleFlows(flows.length)}>Show all {flows.length} monetary observations</button>}
      </div>}
    </section>

    <section className="edu-section" id="education-investigations" aria-labelledby="edu-investigations-title">
      <SectionHeading index="03" id="edu-investigations-title" title="Questions the evidence leaves open" count={`${leads.length} research leads`} />
      <div className="edu-guardrail"><strong>School counts down. Population up?</strong> That is a question to test using the same boundaries, years and school-age population. This register does not yet contain a comparable population series or a verified school-closure ledger. It cannot establish that schools closed where population grew.</div>
      {leads.length ? <div>{leads.slice(0, visibleLeads).map(lead => <article className="edu-lead" key={lead.id}>
        <div><p className="edu-overline">{lead.status === 'investigate' ? 'Investigation lead · not a finding' : 'Context · interpret with care'}</p><h3>{lead.title}</h3><p>{lead.summary}</p><SourceLinks ids={lead.sourceIds} /></div>
        <dl className="edu-lead-tests"><div><dt>What prompts the question</dt><dd>{lead.signal}</dd></div><div><dt>Other explanations to test</dt><dd><ul>{lead.alternativeExplanations.map((alternative, i) => <li key={i}>{alternative}</li>)}</ul></dd></div><div><dt>What would resolve or weaken it</dt><dd>{lead.falsifier}</dd></div></dl>
      </article>)}{leads.length > visibleLeads && <button className="edu-button edu-show-more" onClick={() => setVisibleLeads(leads.length)}>Show all {leads.length} research leads</button>}</div> : <EmptyState title="No research leads match this view.">A missing lead is not a finding that everything is resolved. Broaden your filters to read the documented questions.</EmptyState>}
    </section>

    <section className="edu-section" id="education-school-counts" aria-labelledby="edu-counts-title">
      <SectionHeading index="04" id="edu-counts-title" title="Count institutions. Don’t infer closures." count={`${schoolSeries.length} geographies in view`} />
      <p className="edu-section-intro">Reported government-school counts are loaded for {stateSeriesCount} states and union territories{districtSeriesCount > 0 ? ` and ${districtSeriesCount} districts` : ''}. A fall in the stock may reflect mergers, closures, reclassification, reporting changes or fewer openings. School identities and local access need separate verification.</p>
      <div className="edu-series-controls">
        <label className="edu-field"><span className="edu-label">School-count geography</span><select value={countScope} onChange={event => patch({ counts: event.target.value === 'district' ? 'district' : undefined, trend: undefined })}><option value="state">National, states &amp; union territories</option><option value="district">Districts — available records only</option></select></label>
        <p>The filters above also apply here. Figures describe government schools, and do not count colleges, private schools or individual closures.</p>
      </div>
      {schoolSeries.length ? <><label className="edu-field edu-trend-picker"><span className="edu-label">View a government-school count trend</span><select value={trendSeries.id} onChange={event => patch({ trend: event.target.value })}>{schoolSeries.map(row => <option key={row.id} value={row.id}>{row.name}{row.localityId ? ' district' : ''}</option>)}</select></label><SchoolTrend series={trendSeries} /><SchoolTable series={schoolSeries.slice(0, visibleCounts)} />{schoolSeries.length > visibleCounts && <button className="edu-button" onClick={() => setVisibleCounts(schoolSeries.length)}>Show all {schoolSeries.length} matching geographies</button>}
        <details className="edu-series-details"><summary>School-count definitions &amp; limitations</summary><ul className="edu-limitations">{[...new Set(schoolSeries.flatMap(row => row.limitations))].map((limitation, i) => <li key={i}>{limitation}</li>)}</ul></details>
      </> : <EmptyState title="No comparable school-count series in this view.">This data layer currently covers government-school stocks for selected geographic levels. Clear topic, management or funding filters, or choose another geography. Missing data does not mean there are no schools.</EmptyState>}
    </section>

    <section className="edu-section" id="education-coverage" aria-labelledby="edu-coverage-heading">
      <SectionHeading index="05" id="edu-coverage-heading" title="Know what this register can support" />
      <div className="edu-coverage-layout"><div><h3>Coverage is part of the evidence.</h3><p>This is a curated research snapshot, not a census of every school, college, donor or transaction. A national scheme’s reach does not demonstrate a payment to every city.</p><ul>{EDUCATION_COVERAGE_NOTES.map((note, i) => <li key={i}>{note}</li>)}</ul></div>
        <div><h3>A reproducible reading, not a verdict.</h3><p>Original records stay attached to the statements they support. Export preserves their dates, scope and limitations so a result can be checked outside this page.</p><ul>{EDUCATION_METHODOLOGY.map((note, i) => <li key={i}>{note}</li>)}</ul></div>
      </div>
      <details className="edu-state-coverage"><summary>View source coverage for all {EDUCATION_STATES.length} states and union territories</summary>
        <p className="edu-workbench-note">Counts below use explicitly tagged state records, excluding national context. They measure this register’s coverage, not funding volume. Multi-state records can appear under more than one state.</p>
        <div className="edu-state-list">{EDUCATION_STATES.map(state => {
          const count = EDUCATION_SOURCES.filter(source => source.scope !== 'national' && source.stateCodes.includes(state.code)).length;
          return <div className="edu-state-row" key={state.code}><span>{state.name}</span><span>{count ? `${count} sourced record${count === 1 ? '' : 's'}` : 'Not yet recorded'}</span></div>;
        })}</div>
      </details>
    </section>
    <footer className="edu-page-end">Compiled snapshot · {dateLabel(EDUCATION_UPDATED_AT)}. Reading lists stay on this browser. Filters travel in the URL. Source links may change after retrieval.</footer>
  </div>;
}
