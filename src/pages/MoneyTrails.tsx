import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Download, FileText, Map as MapIcon, Network, Unplug } from 'lucide-react';
import { INVESTIGATION_REGISTRY as registry, type InvestigationAmount } from '../data/investigation';
import { MONEY_TRAIL_BASIS_LABELS, MONEY_TRAIL_FLOW_LABELS, getMoneyTrailsView, getMoneyTrailDetail, exportMoneyTrailEvidence } from '../data/moneyTrails';
import { buildMapEvidenceScene } from '../data/mapEvidence';
import type { AtlasSelection } from '../data/atlasInvestigation';
import { LinkedEvidenceMap, type LinkedMapSelection } from '../components/investigation/LinkedEvidenceMap';
import { AtlasNetwork } from '../components/investigation/AtlasNetwork';
import './money-trails.css';

type TrailDetail = NonNullable<ReturnType<typeof getMoneyTrailDetail>>;
type TrailHop = TrailDetail['hops'][number];
type EvidenceRef = { kind: 'entity' | 'relationship' | 'record' | 'source'; id: string };
const NO_FILTERS = { geographyMode: 'all' as const };
const displayHopTitle = (title: string) => title.replace(/^\d+\s*[·.]\s*/u, '');
function readSelection(value: string | null): LinkedMapSelection | null {
  if (!value) return null;
  const split = value.indexOf(':'), kind = value.slice(0, split), id = value.slice(split + 1);
  return ['state', 'site', 'entity', 'relationship', 'record'].includes(kind) && id ? { kind, id } as LinkedMapSelection : null;
}
function evidenceLabel(ref: EvidenceRef) {
  if (ref.kind === 'source') return registry.sources.find(row => row.id === ref.id)?.title ?? ref.id;
  if (ref.kind === 'record') return registry.records.find(row => row.id === ref.id)?.title ?? ref.id;
  if (ref.kind === 'relationship') return registry.relationships.find(row => row.id === ref.id)?.label ?? ref.id;
  return registry.entities.find(row => row.id === ref.id)?.label ?? ref.id;
}
function evidenceSummary(ref: EvidenceRef) {
  const rows = ref.kind === 'source' ? registry.sources : ref.kind === 'record' ? registry.records : ref.kind === 'relationship' ? registry.relationships : registry.entities;
  return rows.find(row => row.id === ref.id)?.summary;
}
function formatAmount(amount: InvestigationAmount) {
  return `${amount.currency === 'INR' ? '₹' : `${amount.currency} `}${amount.value.toLocaleString('en-IN', { maximumFractionDigits: 4 })} ${amount.unit}`;
}
function Citation({ sourceId, locator, role }: { sourceId: string; locator: string; role?: string }) {
  const source = registry.sources.find(row => row.id === sourceId);
  if (!source) return <span className="mt-citation">Source unavailable: {sourceId}</span>;
  return <span className="mt-citation" data-money-source={sourceId}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={11} aria-hidden="true" /></a><small>{role ? `${role} · ` : ''}{locator}</small><small>{source.publisher}{source.publishedAt ? ` · ${source.publishedAt}` : ' · publication date not established'}</small></span>;
}
function EvidenceLink({ reference, choose, summary = false }: { reference: EvidenceRef; choose: (selection: LinkedMapSelection) => void; summary?: boolean }) {
  if (reference.kind === 'source') {
    const source = registry.sources.find(row => row.id === reference.id);
    return source ? <Citation sourceId={source.id} locator={source.locator} /> : <span>Source unavailable: {reference.id}</span>;
  }
  return <div className="mt-evidence-ref"><button type="button" className="mt-inspect" data-money-reference={reference.id} onClick={() => choose({ kind: reference.kind as 'entity' | 'relationship' | 'record', id: reference.id })}>{evidenceLabel(reference)}<ArrowUpRight size={12} aria-hidden="true" /></button>{summary && <p>{evidenceSummary(reference)}</p>}</div>;
}
function HopCard({ hop, index, choose }: { hop: TrailHop; index: number; choose: (selection: LinkedMapSelection) => void }) {
  const primary = hop.recordIds[0] ? { kind: 'record' as const, id: hop.recordIds[0] } : hop.relationshipIds[0] ? { kind: 'relationship' as const, id: hop.relationshipIds[0] } : null;
  if (hop.flowState === 'gap') return <li className="mt-gap" data-money-hop={hop.id} data-flow-state="gap"><span className="mt-kicker">PUBLIC CASH PATH STOPS</span><h3><Unplug size={19} aria-hidden="true" />{displayHopTitle(hop.title)}</h3><p>{hop.summary}</p><p><strong>Next record:</strong> {hop.missingNextDocument}</p><p><strong>Document holder:</strong> {hop.documentHolder}</p><small>{hop.response}</small><div className="mt-citations">{hop.sourceLocators.map((ref, i) => <Citation key={`${ref.sourceId}-${i}`} {...ref} />)}</div></li>;
  return <li className="mt-hop" data-money-hop={hop.id} data-flow-state={hop.flowState}>
    <span className="mt-hop-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
    <div className="mt-hop-meta"><span className="mt-proof" data-proof={hop.basis}>{MONEY_TRAIL_BASIS_LABELS[hop.basis]}</span><span>{MONEY_TRAIL_FLOW_LABELS[hop.flowState]}</span></div>
    <h3>{displayHopTitle(hop.title)}</h3>
    <div className="mt-hop-route" aria-label="Recorded payer and payee">{hop.fromEntityId && <button type="button" data-money-entity={hop.fromEntityId} onClick={() => choose({ kind: 'entity', id: hop.fromEntityId! })}>{evidenceLabel({ kind: 'entity', id: hop.fromEntityId })}</button>}{hop.fromEntityId && hop.toEntityId && <ArrowDown size={16} aria-hidden="true" />}{hop.toEntityId && <button type="button" data-money-entity={hop.toEntityId} onClick={() => choose({ kind: 'entity', id: hop.toEntityId! })}>{evidenceLabel({ kind: 'entity', id: hop.toEntityId })}</button>}</div>
    {hop.amounts.map((amount, i) => <div key={i} data-money-amount=""><strong className="mt-amount">{formatAmount(amount)}</strong><span className="mt-stage">{amount.stage} · {amount.period}</span></div>)}
    <p className="mt-hop-summary">{hop.summary}</p><span className="mt-stage">Financial stage: {hop.financialStage}</span>
    <p className="mt-hop-date">{hop.date ?? 'Exact transaction date not established'}<br />{hop.dateBasis}</p>
    <div className="mt-citations">{hop.sourceLocators.map((ref, i) => <Citation key={`${ref.sourceId}-${i}`} {...ref} />)}</div>
    <p className="mt-hop-response"><strong>Response / limitation</strong>{hop.response}</p><details><summary>Alternatives & next document</summary>{hop.alternatives.map((alternative, i) => <p key={i}>{alternative}</p>)}{hop.counterEvidenceRecordIds.map(id => <EvidenceLink key={id} reference={{ kind: 'record', id }} choose={choose} />)}{hop.responseRecordIds.filter(id => !hop.counterEvidenceRecordIds.includes(id)).map(id => <EvidenceLink key={id} reference={{ kind: 'record', id }} choose={choose} />)}<p><strong>Next record:</strong> {hop.missingNextDocument}</p><p><strong>Document holder:</strong> {hop.documentHolder}</p>{hop.limitations.map((limitation, i) => <p key={i}>{limitation}</p>)}</details>
    {primary && <button type="button" className="mt-inspect" data-money-inspect={primary.id} onClick={() => choose(primary)}><FileText size={13} aria-hidden="true" />Inspect evidence & all connections<ArrowUpRight size={12} aria-hidden="true" /></button>}
  </li>;
}
export default function MoneyTrails() {
  const [params, setParams] = useSearchParams();
  const workspace = useRef<HTMLElement>(null), pathHeading = useRef<HTMLHeadingElement>(null), pathPanel = useRef<HTMLElement>(null);
  const view = useMemo(() => getMoneyTrailsView(registry, {}), []);
  const requestedId = params.get('mt_trail'), trailId = view.trails.some(row => row.id === requestedId) ? requestedId! : view.trails[0]?.id;
  const detail = useMemo(() => trailId ? getMoneyTrailDetail(registry, trailId) : null, [trailId]);
  useEffect(() => { pathPanel.current?.scrollTo({ top: 0, behavior: 'instant' }); }, [trailId]);
  const mode = params.get('mt_view') === 'network' ? 'network' : 'map', scope = params.get('mt_scope') === 'context' ? 'context' : 'path';
  const selection = readSelection(params.get('mt_selection'));
  const visibleRegistry = detail ? scope === 'context' ? detail.contextRegistry : detail.pathRegistry : registry;
  const mapRegistry = detail ? scope === 'context' ? detail.contextMapRegistry : detail.pathMapRegistry : registry;
  const scene = useMemo(() => buildMapEvidenceScene(mapRegistry, NO_FILTERS), [mapRegistry]);
  const coverage = useMemo(() => registry.states.map(state => {
    const hub = scene.stateHubs.find(row => row.stateCode === state.code);
    return { stateCode: state.code, name: state.name, records: hub?.counts.records ?? 0, entities: hub?.counts.entities ?? 0, relationships: hub?.counts.relationships ?? 0, coverageRecords: hub?.coverageRecordIds.length ?? 0, associationRecords: hub?.associationRecordIds.length ?? 0, nationalContextRecords: 0, unknownRecords: 0, domains: [] };
  }), [scene]);
  const patch = (changes: Record<string, string | undefined>) => {
    const route = new URL(window.location.hash.slice(1), window.location.origin), next = new URLSearchParams(route.search);
    for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };
  const choose = (next: LinkedMapSelection | null) => {
    patch({ mt_selection: next ? `${next.kind}:${next.id}` : undefined });
    if (next && window.matchMedia('(max-width:767px)').matches) requestAnimationFrame(() => workspace.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  };
  const exportPacket = () => {
    if (!trailId) return;
    const packet = exportMoneyTrailEvidence(registry, trailId);
    const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${trailId.replace(/:/gu, '-')}-evidence.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const entityId = selection?.kind === 'entity' ? selection.id : selection?.kind === 'relationship' ? registry.relationships.find(row => row.id === selection.id)?.from : selection?.kind === 'record' ? registry.records.find(row => row.id === selection.id)?.entityIds[0] : undefined;
  const pathHops = detail?.hops.filter(hop => hop.flowState !== 'context') ?? [], contextHops = detail?.hops.filter(hop => hop.flowState === 'context') ?? [];
  const jumpToPath = () => { pathHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); pathHeading.current?.focus({ preventScroll: true }); };
  return <div className="money-trails" data-money-trails-page="" data-money-trail={trailId} data-money-scope={scope} data-money-view={mode} data-money-query={params.toString()}>
    <header className="mt-command"><div><span className="mt-kicker">PUBLIC MONEY / DOCUMENTS / OPEN QUESTIONS</span><h1>Follow the money</h1></div><div className="mt-command-actions"><button type="button" onClick={exportPacket} disabled={!detail} aria-label="Export complete money-trail evidence packet"><Download size={16} aria-hidden="true" /><span>Export evidence packet</span></button><Link to="/allegations">Claims atlas<ArrowUpRight size={14} aria-hidden="true" /></Link></div></header>
    {view.trails.length > 0 && <div className="mt-controls"><label className="mt-trail-select"><span>Investigation</span><select aria-label="Choose money-trail investigation" value={trailId} onChange={event => patch({ mt_trail: event.target.value, mt_selection: undefined })}>{view.trails.map(trail => <option key={trail.id} value={trail.id}>{trail.title}</option>)}</select></label><div className="mt-view-switch" role="group" aria-label="Money trail view"><button type="button" aria-pressed={mode === 'map'} onClick={() => patch({ mt_view: undefined })}><MapIcon size={14} aria-hidden="true" />Map</button><button type="button" aria-pressed={mode === 'network'} onClick={() => patch({ mt_view: 'network' })}><Network size={14} aria-hidden="true" />Network</button></div><div className="mt-scope-switch" role="group" aria-label="Money trail graph scope"><button type="button" aria-pressed={scope === 'path'} onClick={() => patch({ mt_scope: undefined })}>Money path</button><button type="button" aria-pressed={scope === 'context'} onClick={() => patch({ mt_scope: 'context' })}>Wider connections</button></div></div>}
    {requestedId && requestedId !== trailId && <p className="mt-unavailable" role="status">That saved investigation is unavailable. Showing the first retained investigation; no replacement identity or relationship has been inferred.</p>}
    {!detail ? <section className="mt-empty"><h2>No reviewed money trails in this scope</h2><p>A trace needs a document for each step, an accounting stage and a response. No paths are generated from names, proximity or missing records.</p><Link to="/allegations">Open the claims atlas</Link></section> : <>
      <div className="mt-scope-note"><p>{scope === 'path' ? 'Documentary steps, not a reconciled chain of the same money. Each payer → payee link keeps its own stage; commitments and allegations are labeled. Missing joins never become payments.' : 'Wider documented connections include roles, ownership and institutional context. These links are not a downstream cash route or proof of influence.'}</p><button type="button" className="mt-jump" onClick={jumpToPath}>Read cash path<ArrowDown size={12} aria-hidden="true" /></button></div>
      <section className="mt-workspace" ref={workspace} aria-label="Money trail geographic and relationship workspace">
        <div className="mt-map-canvas">{mode === 'map' ? <LinkedEvidenceMap registry={registry} sceneRegistry={mapRegistry} filters={NO_FILTERS} selection={selection} onSelectionChange={choose} depth={2} spatial coverage={coverage} selectedState={selection?.kind === 'state' ? selection.id.replace('state:', '') : null} onStateSelect={code => choose(code ? { kind: 'state', id: `state:${code}` } : null)} geographyMode="all" nationalRecords={scene.populations.national.counts.records} unknownRecords={scene.populations.unplaced.counts.records} internationalRecords={scene.populations.international.counts.records} indexLabel="DOCUMENTARY ASSOCIATIONS / NOT TRANSACTION ADDRESSES" /> : <AtlasNetwork registry={visibleRegistry} evidenceRegistry={registry} selectedEntityId={entityId} selectedEvidence={selection && selection.kind !== 'state' && selection.kind !== 'site' ? selection as AtlasSelection : null} onSelectionChange={choose} />}</div>
        <aside className="mt-path" ref={pathPanel} tabIndex={0} aria-label="Selected documentary money path"><header className="mt-path-header"><span className="mt-kicker">{detail.trail.city.replace('-', ' ')} · INVESTIGATION FILE</span><h2 ref={pathHeading} tabIndex={-1}>{detail.trail.question}</h2><p>{detail.trail.conclusion}</p><div className="mt-path-status"><span>Reviewed {detail.trail.cutoff}</span></div><p className="mt-source-status">{detail.trail.sourceStatus}</p><button type="button" className="mt-inspect" data-money-case={detail.trail.caseRecordId} onClick={() => choose({ kind: 'record', id: detail.trail.caseRecordId })}><FileText size={13} aria-hidden="true" />Open investigation dossier<ArrowUpRight size={12} aria-hidden="true" /></button></header><ol className="mt-path-list">{pathHops.map((hop, i) => <HopCard key={hop.id} hop={hop} index={i} choose={choose} />)}</ol>{!pathHops.length && <div className="mt-gap"><h3>Transaction path not established</h3><p>This investigation retains contextual evidence. It does not establish a sequence of cash transfers.</p></div>}</aside>
      </section>
      <section className="mt-review" aria-label="Test the money-trail hypotheses"><header className="mt-review-heading"><div><span className="mt-kicker">TEST THE EXPLANATION</span><h2>What would change the conclusion?</h2></div><p>Each question carries the evidence that supports it, the strongest challenge, and the record needed to distinguish a lawful explanation from an alleged diversion.</p></header><div className="mt-hypotheses">{detail.hypotheses.map(hypothesis => <article className="mt-hypothesis" key={hypothesis.id} data-money-hypothesis={hypothesis.id}><header><span className="mt-hypothesis-status">{hypothesis.status.replace(/-/gu, ' ').toUpperCase()} · INVESTIGATIVE QUESTION</span><h3>{hypothesis.question}</h3></header><div className="mt-hypothesis-body"><p>{hypothesis.observation}</p><div className="mt-test-columns"><section><h4>Evidence supporting the question</h4><ul>{hypothesis.supportingEvidence.map(reference => <li key={`${reference.kind}:${reference.id}`}><EvidenceLink reference={reference} choose={choose} summary /></li>)}</ul>{!hypothesis.supportingEvidence.length && <p>No supporting evidence is retained.</p>}</section><section><h4>Counter-evidence / strongest challenge</h4><ul>{hypothesis.refutingEvidence.map(reference => <li key={`${reference.kind}:${reference.id}`}><EvidenceLink reference={reference} choose={choose} summary /></li>)}</ul>{!hypothesis.refutingEvidence.length && <p>No independent refuting document is retained; this does not confirm the hypothesis.</p>}</section></div><div className="mt-falsifier"><h4>What would disprove or narrow it</h4><p>{hypothesis.disconfirmationTest}</p></div><details className="mt-footprints"><summary>Expected documentary footprints & limits</summary><ul>{hypothesis.expectedDocumentaryFootprints.map((footprint, i) => <li key={i}>{footprint}</li>)}</ul>{hypothesis.limitations.map((limitation, i) => <p key={i}>{limitation}</p>)}</details></div><div className="mt-next-record"><h4>The next records to obtain</h4>{hypothesis.neededRecords.map((record, i) => <p key={i}>{record}</p>)}<p><strong>Document holder:</strong> {hypothesis.documentHolder}</p></div></article>)}</div>{!detail.hypotheses.length && <p className="mt-empty">No testable hypothesis is recorded for this investigation.</p>}</section>
      <section className="mt-context" aria-label="Ownership roles and procedural context"><span className="mt-kicker">CONTEXT, SEPARATELY</span><h2>People, institutions & context</h2><p>Ownership, public office, political funding and court proceedings can explain which documents to examine next. They do not establish that a payment reached a person, or that a contract bought influence. Use Wider connections to inspect sourced context and identity bridges.</p><div className="mt-context-list">{contextHops.map(hop => <article key={hop.id} className="mt-context-card" data-money-context={hop.id}><span>{MONEY_TRAIL_BASIS_LABELS[hop.basis]}</span><h3>{displayHopTitle(hop.title)}</h3><p>{hop.summary}</p><div className="mt-citations">{hop.sourceLocators.map((ref, i) => <Citation key={`${ref.sourceId}-${i}`} {...ref} />)}</div>{hop.recordIds.map(id => <EvidenceLink key={id} reference={{ kind: 'record', id }} choose={choose} />)}<details className="mt-footprints"><summary>Response & limits</summary><p>{hop.response}</p>{hop.alternatives.map((alternative, i) => <p key={i}>{alternative}</p>)}</details></article>)}</div>{!contextHops.length && <p>No additional role or ownership step has been established in this authored cash path. The wider network retains separately sourced registry connections.</p>}</section>
      <footer className="mt-footnote">{detail.trail.limitations.map((limitation, i) => <p key={i}>{limitation}</p>)}<p>Amounts retain their financial stage, currency and period. They are not added across steps. A missing document is a research gap; proximity in this workspace is not a transaction.</p></footer>
    </>}
  </div>;
}
