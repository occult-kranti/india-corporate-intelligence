import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import type { InvestigationRegistry } from '../../data/investigation';
import { createInvestigationMatcher } from '../../data/investigationFilters';
import type { MapEvidenceScene, MapEvidenceSelection } from '../../data/mapEvidence';
import './map-evidence-hub-panel.css';

export interface MapEvidenceHubPanelProps {
  registry: InvestigationRegistry;
  scene: MapEvidenceScene;
  /** State and site selections are rendered here; identity/relationship readers are separate. */
  selection: MapEvidenceSelection | null;
  onClose: () => void;
  onSelectionChange?: (selection: MapEvidenceSelection) => void;
  onEntitySelect: (id: string) => void;
  onRecordSelect: (id: string) => void;
  returnFocusRef?: RefObject<HTMLElement>;
}

type HubTab = 'records' | 'entities' | 'sources';
const PAGE_SIZE = 8;
const formatCount = (value: number) => value.toLocaleString('en-IN');
const humanize = (value: string) => value.replace(/-/gu, ' ');

/** A place is an evidence index, never a claim that every associated event occurred there. */
export function MapEvidenceHubPanel({ registry, scene, selection, onClose, onSelectionChange, onEntitySelect, onRecordSelect, returnFocusRef }: MapEvidenceHubPanelProps) {
  const titleId = useId();
  const container = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const [tab, setTab] = useState<HubTab>('records');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const open = selection?.kind === 'state' || selection?.kind === 'site';
  const hub = selection?.kind === 'state' ? scene.stateHubs.find(row => row.id === selection.id) : undefined;
  const site = selection?.kind === 'site' ? scene.sites.find(row => row.id === selection.id) : undefined;
  const place = hub ?? site;

  const population = useMemo(() => {
    const recordIds = new Set(place?.recordIds ?? []);
    const entityIds = new Set(place?.entityIds ?? []);
    const sourceIds = new Set(place?.sourceIds ?? []);
    return {
      records: registry.records.filter(row => recordIds.has(row.id)),
      entities: registry.entities.filter(row => entityIds.has(row.id)),
      sources: registry.sources.filter(row => sourceIds.has(row.id)),
    };
  }, [registry, place]);
  const matched = useMemo(() => {
    const matches = createInvestigationMatcher(registry, { q: query });
    const terms = query.normalize('NFKC').toLocaleLowerCase('en-IN').trim().split(/\s+/u).filter(Boolean);
    return {
      records: population.records.filter(matches),
      entities: population.entities.filter(matches),
      sources: population.sources.filter(row => {
        const text = `${row.title} ${row.publisher} ${row.summary} ${row.id} ${row.locator}`.normalize('NFKC').toLocaleLowerCase('en-IN');
        return terms.every(term => text.includes(term));
      }),
    };
  }, [registry, population, query]);

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    const previous = active instanceof HTMLElement || active instanceof SVGElement ? active : null;
    const element = container.current;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      closeCallback.current();
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      // Avoid moving focus away from another reader opened by the parent.
      if (document.activeElement !== document.body && !element?.contains(document.activeElement)) return;
      if (previous?.isConnected && previous !== document.body && previous !== document.documentElement) previous.focus({ preventScroll: true });
      else returnFocusRef?.current?.focus({ preventScroll: true });
    };
  }, [open, returnFocusRef]);
  useEffect(() => {
    if (!open) return;
    setTab('records'); setQuery(''); setPage(1); setExpanded(false);
    heading.current?.focus({ preventScroll: true });
    container.current?.querySelector('.map-hub-scroll')?.scrollTo({ top: 0 });
  }, [open, selection?.id, selection?.kind]);

  if (!open) return null;
  const selectTab = (next: HubTab) => { setTab(next); setPage(1); };
  const labels: { id: HubTab; label: string }[] = [{ id: 'records', label: 'Records' }, { id: 'entities', label: 'Identities' }, { id: 'sources', label: 'Sources' }];
  const total = matched[tab].length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const state = site ? scene.stateHubs.find(row => row.stateCode === site.stateCode) : hub;
  const nearbySites = hub ? scene.sites.filter(row => row.stateCode === hub.stateCode) : [];
  const stateLabel = registry.states.find(row => row.code === place?.stateCode)?.name;
  const missing = place ? place.entityIds.length - population.entities.length + place.recordIds.length - population.records.length + place.sourceIds.length - population.sources.length : 0;

  return <aside ref={container} className={`map-hub-panel${expanded ? ' is-expanded' : ''}`} role="region" aria-label={site ? 'Selected site details' : 'Selected state evidence'} data-map-place={selection?.id}>
    <div className="map-hub-toolbar">
      <span>{site ? 'Verified public site' : 'State evidence index'}</span>
      <button type="button" className="map-hub-expand" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Compact' : 'Expand'}</button>
      <button type="button" className="map-hub-close" aria-label="Close place details" onClick={onClose}>×</button>
    </div>
    <div className="map-hub-scroll">
      <header className="map-hub-heading">
        <p className="map-hub-kicker">{site ? `${site.precision} coordinate precision · ${stateLabel ?? site.stateCode}` : 'Schematic state association'}</p>
        <h2 id={titleId} ref={heading} tabIndex={-1}>{place?.label ?? 'Place unavailable'}</h2>
        {!place ? <p>This place is outside the current evidence selection. Close the reader to choose another visible place.</p> : <p>{site ? 'A sourced location for this public site. Read each linked record for the location and scope of its claim.' : 'Explore the records and identities connected to this state in the current map selection.'}</p>}
      </header>
      {place && <>
        <section className="map-hub-geography" aria-label="Placement precision and source basis">
          <h3>{site ? 'What this point locates' : 'What this hub represents'}</h3>
          <p>{site?.coordinateNote ?? hub?.qualification}</p>
          {site && <p>Nearby OSM buildings do not establish ownership, control, or a connection to any allegation.</p>}
          {hub && <div className="map-hub-placement-counts"><span><strong>{formatCount(hub.coverageRecordIds.length)}</strong> records with recorded coverage</span><span><strong>{formatCount(hub.associationRecordIds.length)}</strong> records with entity or state associations</span><small>These groups can overlap. A hub is not an address or a count of wrongdoing.</small></div>}
          {site && <><p>{population.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>)}</p><details><summary>Coordinate details</summary><p>{site.lat.toFixed(5)}° N, {site.lon.toFixed(5)}° E · {site.kind}</p></details></>}
        </section>
        <dl className="map-hub-counts" aria-label="Evidence population">
          <div><dt>Records</dt><dd>{formatCount(population.records.length)}</dd></div>
          <div><dt>Identities</dt><dd>{formatCount(population.entities.length)}</dd></div>
          <div><dt>Sources</dt><dd>{formatCount(population.sources.length)}</dd></div>
        </dl>
        {!!hub?.counts.relationships && <p className="map-hub-connection-count">{formatCount(hub.counts.relationships)} retained relationships. Open an identity or record to inspect its connections, direction and response.</p>}
        {missing > 0 && <p className="map-hub-missing">{missing} indexed references are unavailable in the supplied registry.</p>}
        <div className="map-hub-tabs" role="tablist" aria-label="Place evidence sections">
          {labels.map((item, index) => <button key={item.id} ref={element => { tabs.current[index] = element; }} type="button" role="tab" id={`${titleId}-${item.id}`} aria-controls={`${titleId}-results`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => selectTab(item.id)} onKeyDown={event => {
            let next = index;
            if (event.key === 'ArrowRight') next = (index + 1) % labels.length;
            else if (event.key === 'ArrowLeft') next = (index - 1 + labels.length) % labels.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = labels.length - 1;
            else return;
            event.preventDefault(); selectTab(labels[next].id); tabs.current[next]?.focus();
          }}>{item.label}<span>{formatCount(population[item.id].length)}</span></button>)}
        </div>
        <section className="map-hub-results" role="tabpanel" id={`${titleId}-results`} aria-labelledby={`${titleId}-${tab}`}>
          <label className="map-hub-search">Search this place's evidence<input type="search" value={query} placeholder="Name, record or source" onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
          <p className="map-hub-result-count" role="status">{total ? `${formatCount(start + 1)}–${formatCount(end)} of ${formatCount(total)}` : '0'} matching {tab === 'entities' ? 'identities' : tab}{query && ` · ${formatCount(population[tab].length)} in this place`}</p>
          <ol className="map-hub-result-list" start={start + 1}>
            {tab === 'records' && matched.records.slice(start, end).map(record => <li key={record.id} data-hub-record={record.id}>
              <div className="map-hub-row-meta"><span data-tier={record.tier}>{record.tier}</span><span>{humanize(record.status)}</span></div>
              <button className="map-hub-title-link" type="button" onClick={() => onRecordSelect(record.id)}>{record.title}<span aria-hidden="true"> ↗</span></button>
              <p>{record.summary}</p>
              <small>{record.fromDate ?? record.toDate ?? 'Date not established'}{record.fromDate && record.toDate && record.fromDate !== record.toDate ? ` – ${record.toDate}` : ''} · {record.sourceIds.length} source{record.sourceIds.length === 1 ? '' : 's'}</small>
              <details><summary>Date basis, response and outcome</summary><p>{record.dateBasis}</p>{record.statusAsOf && <p>Status as of {record.statusAsOf}.</p>}<p>{record.response}</p></details>
            </li>)}
            {tab === 'entities' && matched.entities.slice(start, end).map(entity => <li key={entity.id} data-hub-entity={entity.id}>
              <div className="map-hub-row-meta"><span>{humanize(entity.type)}</span><span>{entity.sourceIds.length} source{entity.sourceIds.length === 1 ? '' : 's'}</span></div>
              <button className="map-hub-title-link" type="button" onClick={() => onEntitySelect(entity.id)}>{entity.label}<span aria-hidden="true"> ↗</span></button>
              <p>{entity.summary || entity.identityBasis}</p>
              <small>Open identity and exact connections</small>
            </li>)}
            {tab === 'sources' && matched.sources.slice(start, end).map(source => <li key={source.id}>
              <div className="map-hub-row-meta"><span data-tier={source.tier}>{source.tier}</span><span>{source.publisher}</span></div>
              <a className="map-hub-title-link" href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>
              <small>{source.publishedAt ?? 'Publication date unknown'}</small><p>{source.locator}</p>
              {source.limitations.length > 0 && <details><summary>Source limitations</summary>{source.limitations.map((limitation, index) => <p key={index}>{limitation}</p>)}</details>}
            </li>)}
          </ol>
          {!total && <p className="map-hub-empty">{query ? 'No matching entries. Try a broader name or clear the search.' : `No ${tab === 'entities' ? 'identities' : tab} are retained for this place in the current map selection.`}</p>}
          {pages > 1 && <nav className="map-hub-pagination" aria-label="Place evidence pages"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Previous</button><span>Page {currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next →</button></nav>}
        </section>
        {onSelectionChange && (nearbySites.length > 0 || site && state) && <nav className="map-hub-related" aria-label="Related geographic indexes"><h3>{site ? 'State evidence index' : 'Verified sites in this state'}</h3>{site && state && <button type="button" onClick={() => onSelectionChange({ kind: 'state', id: state.id })}>{state.label} <span>{formatCount(state.counts.records)} records →</span></button>}{nearbySites.map(item => <button type="button" key={item.id} onClick={() => onSelectionChange({ kind: 'site', id: item.id })}>{item.label}<span>{item.precision} precision →</span></button>)}</nav>}
        <footer className="map-hub-footer">This is the full indexed population for the current map selection. Association with a place or an identity does not establish culpability.<code>{place.id}</code></footer>
      </>}
    </div>
  </aside>;
}
