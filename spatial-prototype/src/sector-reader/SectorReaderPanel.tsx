import { Fragment, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { safeSourceUrl } from '../navigation';
import { withoutSectorReview } from './adapter';
import type { SectorReaderOverlay } from './adapter';
import type { DateFields, MoneyStage, SectorCriticismResponse, SectorEntry, SectorSource, SourceReference } from './types';
import './sector-reader.css';
const packetTitles: Record<string, string> = {
  'europe-china-ownership': 'Europe–China · reported ownership',
  'welfare-food-finance': 'South Sudan · food-programme finance',
  'energy-mineral-finance': 'Thacker Pass · financing and ownership',
  'rss-report-review': 'RSS · organizational report',
};
const labels: Record<string, string> = {
  snapshot: 'Snapshot date', statement: 'Statement date', publication: 'Publication date', publicationVerification: 'Publication verification limit',
  event: 'Event date', eventType: 'Event type', latestReportBound: 'Latest report-based bound', signatureDateKnown: 'Exact signature date known',
  firstDrawAnnouncement: 'First-draw announcement date', exactFundsReceiptDate: 'Exact funds-receipt date', reportPeriod: 'Report period',
  eventOrMeasurement: 'Event or measurement date', unresolvedEventAlternatives: 'Unresolved event-date alternatives', planting: 'Planting date',
  report_period_end: 'Report-period end', statement_date: 'Statement date', publication_date: 'Publication date', retrieved_at: 'Retained retrieval timestamp',
  acquiredAt: 'Retained acquisition timestamp', retrievedAt: 'Retained retrieval timestamp', stage: 'Financial stage', amount: 'Amount in this stage',
  currency: 'Currency', overlapGroup: 'Overlapping context', notAuditedCashProof: 'Not audited cash proof', valueAsReported: 'Value as reported',
  exactTransferDate: 'Exact transfer date', dateBasis: 'Date basis', announcementDate: 'Announcement date', financier: 'Financier',
  reportedRoute: 'Reported route', financierToPayerInferred: 'Financier-to-payer attribution is inferred', originatingAccountIdentified: 'Originating account identified',
};
/** In-dialog jumps never change history/hash or restore an old opt-in session. */
export function focusSectorCollection(packetId: string, target: Pick<Document, 'getElementById'> = document) {
  const section = target.getElementById(`sector-collection-${packetId}`);
  if (section) { section.scrollIntoView({ block: 'start' }); section.focus({ preventScroll: true }); }
}
/** Nulls stay unknown; timestamps and value strings retain their exact source precision. */
export function SectorFields({ values }: { values: DateFields | MoneyStage | NonNullable<SectorEntry['payerAttribution']> }) {
  return <dl className="sector-fields">{Object.entries(values).map(([key, value]) => <Fragment key={key}>
    <dt>{labels[key] ?? key}</dt><dd data-sector-field={key}>{value === null ? 'Unknown / not established' :
      Array.isArray(value) ? <ul>{value.map(item => <li key={item}>{item}</li>)}</ul> : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</dd>
  </Fragment>)}</dl>;
}
export function SectorCitation({ source, locator }: { source: SectorSource; locator?: string }) {
  const safe = safeSourceUrl(source.url);
  return <article className="sector-source" data-sector-source={source.id}>
    <h5>{source.id}</h5>
    {locator ? <p><strong>Claim-specific page / section locator:</strong> {locator}</p> : null}
    <p><strong>Source family:</strong> {source.sourceFamily}</p>
    <p>{source.independence}</p>
    <p><strong>Original source URL:</strong><br />{safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{source.url}</a> : <span>Unsafe source destination withheld</span>}</p>
    <SectorFields values={source.dates} />
    <dl className="sector-fields"><dt>Retained source SHA-256</dt><dd>{source.sha256}</dd><dt>Retained byte length</dt><dd>{source.bytes}</dd></dl>
  </article>;
}
function References({ refs, sources }: { refs: SourceReference[]; sources: Map<string, SectorSource> }) {
  return <>{refs.map(ref => <SectorCitation key={ref.sourceId} source={sources.get(ref.sourceId)!} locator={ref.locator} />)}</>;
}
function Pair({ pair, sources }: { pair: SectorCriticismResponse; sources: Map<string, SectorSource> }) {
  return <section className="sector-pair" data-sector-pair={pair.id} aria-label={`Criticism and adjacent response: ${pair.id}`}>
    <h5>Criticism or limitation</h5><p data-sector-criticism={pair.id}>{pair.criticism}</p>
    <h5>Response and scope</h5><p data-sector-response={pair.id}>{pair.response}</p>
    <p><strong>Status:</strong> {pair.status}</p>
    <References refs={[{ sourceId: pair.sourceId, locator: pair.locator }, ...(pair.additionalSources ?? [])]} sources={sources} />
  </section>;
}
function Claim({ entry, sources, pairs }: { entry: SectorEntry; sources: Map<string, SectorSource>; pairs: Map<string, SectorCriticismResponse> }) {
  return <article className="sector-claim" data-sector-claim={entry.id} id={`sector-claim-${entry.id}`}>
    <p className="sector-kicker">QUALIFIED READER PARAPHRASE · SOURCE-BOUND · GRAPH/PATHS BLOCKED</p>
    <h3>{entry.id}</h3>
    <p className="sector-claim-text" data-sector-claim-text={entry.id}>{entry.claimText}</p>
    <p>This is a qualified paraphrase, not a verbatim source quotation.</p>
    <h4>Dates and their limits</h4><SectorFields values={entry.dates} />
    <h4>Qualifications</h4><ul>{entry.qualifications.map(text => <li key={text}>{text}</li>)}</ul>
    {entry.notEstablished ? <p data-sector-negative={entry.id}><strong>This does not establish:</strong> {entry.notEstablished}</p> : null}
    {Object.prototype.hasOwnProperty.call(entry, 'directLegalParentAtSnapshot') ? <p><strong>Direct legal parent at snapshot:</strong> Unknown / not established</p> : null}
    {entry.payerAttribution ? <><h4>Financier and payer attribution</h4><SectorFields values={entry.payerAttribution} /></> : null}
    <h4>Unresolved questions</h4><ul>{entry.unresolved.map(text => <li key={text}>{text}</li>)}</ul>
    {entry.moneyStages.length ? <section aria-label={`Financial-stage qualifications for ${entry.id}`}><h4>Financial stages, kept separate</h4>
      <p>Stage labels and overlapping context are retained. These values must not be summed or treated as independently audited cash.</p>
      {entry.moneyStages.map((stage, i) => <SectorFields key={i} values={stage} />)}</section> : null}
    {entry.criticismResponseIds.length ? <section aria-label={`Paired criticism and responses for ${entry.id}`}><h4>Criticism with adjacent response</h4>
      {entry.criticismResponseIds.map(id => <Pair key={id} pair={pairs.get(id)!} sources={sources} />)}</section> : null}
    <h4>Expanded claim citations</h4><References refs={entry.sources} sources={sources} />
    <p className="sector-small">Retained source record: {entry.sourceRecordPointer.id} · {entry.sourceRecordPointer.file}<br />
      Retained packet status: {entry.publicationStatus}<br />Graph eligible: false · Path eligible: false · Aggregation permitted: false</p>
  </article>;
}
/** All panels, financial notes, citations and paired responses are expanded for reading and audit. */
export function SectorReaderView({ overlay, href, onClose }: { overlay: SectorReaderOverlay; href: string; onClose?: () => void }) {
  const { projection, readerAdmission } = overlay;
  const sources = new Map(projection.sources.map(source => [source.id, source]));
  const pairs = new Map(projection.criticismResponses.map(pair => [pair.id, pair]));
  return <section className="sector-reader-content" data-sector-reader="reader-admitted" data-reader-admission={readerAdmission.readerStatus}
    data-public-graph="blocked" data-public-paths="blocked" data-aggregation-permitted="false">
    <header><p className="sector-kicker">SOURCE-COLLECTION READER · GRAPH/PATHS: PUBLIC_GRAPH_BLOCKED</p>
      <h1 id="sector-reader-title">Qualified source collections</h1>
      <a href={withoutSectorReview(href)} onClick={onClose}>Return to the base atlas</a>
      <p data-testid="sector-reader-coverage"><strong>{projection.packets.length} collections · {projection.entries.length} qualified panels · {projection.sources.length} source records</strong><br />
        {projection.criticismResponses.length} distinct criticism/response pairs · {projection.financialContext.length} financial context notes. These are reader coverage counts, separate from the base registry catalogue.</p>
      <p>Read each source-bound claim with its dates, qualifications, unresolved questions and responses. Source-family dependence is shown beside the citations. Issuer publications, organizational reports and material hosted by a regulator do not become independent transaction verification.</p>
      <p>Amounts, ownership percentages, activity counts and attendance have different meanings and dates. They must not be added, converted into membership or receipts, or multiplied into an ownership chain. These panels make no currentness assertion.</p>
      <p>Separate reader admission: {readerAdmission.admissionId}. The exact reviewed projection remains unchanged, including its retained status “{projection.publicationStatus}” and mode “{projection.mode}”. Reader admission does not clear these original holds. Graph, search and paths continue to use only the unchanged base registry.</p>
    </header>
    <nav aria-label="Source collections"><ul>{projection.packets.map(packet => <li key={packet.id}><button type="button" onClick={() => focusSectorCollection(packet.id)}>{packetTitles[packet.id]}</button></li>)}</ul></nav>
    {projection.packets.map(packet => <section key={packet.id} id={`sector-collection-${packet.id}`} data-sector-collection={packet.id} tabIndex={-1} aria-labelledby={`sector-collection-title-${packet.id}`}>
      <h2 id={`sector-collection-title-${packet.id}`}>{packetTitles[packet.id]}</h2>
      <p>Documentary review date: {packet.reviewDate}<br />Review status: {packet.reviewStatus}<br />Retained packet status: {packet.publicationStatus}<br />Graph eligible: false · Path eligible: false</p>
      {projection.financialContext.some(row => row.packet === packet.id) ? <section aria-label={`Financial context for ${packetTitles[packet.id]}`}><h3>Financial context and reconciliation limits</h3>
        {projection.financialContext.filter(row => row.packet === packet.id).map((row, index) => <article className="sector-financial-context" key={index} data-sector-financial-context={`${packet.id}:${index}`}>
          <p>{row.text}</p><References refs={[{ sourceId: row.sourceId, locator: row.locator }, ...(row.additionalSources ?? [])]} sources={sources} />
        </article>)}</section> : null}
      {projection.entries.filter(entry => entry.packet === packet.id).map(entry => <Claim key={entry.id} entry={entry} sources={sources} pairs={pairs} />)}
      <section aria-label={`Source metadata for ${packetTitles[packet.id]}`} data-sector-source-collection={packet.id}><h3>Source collection and provenance</h3>
        <p>These are external source destinations and retained metadata. A source may provide contextual support rather than support every panel. Unknown publication dates remain unknown; retrieval timestamps are not publication dates.</p>
        {projection.sources.filter(source => source.id.startsWith(`${packet.id}:`)).map(source => <SectorCitation key={source.id} source={source} />)}
      </section>
    </section>)}
  </section>;
}
export default function SectorReaderPanel(props: { overlay: SectorReaderOverlay; href: string; onClose: () => void; returnFocusTo?: RefObject<HTMLButtonElement> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current; const previous = document.activeElement;
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      const target = props.returnFocusTo?.current ?? previous;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    };
  }, [props.returnFocusTo]);
  return <dialog ref={dialog} className="sector-reader-dialog" aria-labelledby="sector-reader-title" data-testid="sector-reader-dialog"
    onCancel={event => { event.preventDefault(); props.onClose(); }}>
    <button className="sector-dismiss" type="button" onClick={props.onClose} autoFocus>Close sector reader (Escape)</button>
    <SectorReaderView {...props} />
  </dialog>;
}
