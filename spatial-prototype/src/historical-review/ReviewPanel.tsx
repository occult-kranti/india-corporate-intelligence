import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { safeSourceUrl } from '../navigation';
import type { InvestigationSource } from '../domain';
import { reviewOriginalDestination, withoutHistoricalReview } from './adapter';
import type { HistoricalReviewOverlay, SourceProvenance } from './adapter';
import './review.css';

export function retainedRetrieval(source: InvestigationSource, provenance: SourceProvenance) {
  // Preserve the retained timestamp verbatim, including its original precision.
  // Day-only provenance never acquires a time merely from a precision label.
  return source.retrievedAt
    ? `${source.retrievedAt} (${source.retrievedAt.includes('T') ? provenance.retrievalPrecision : 'day'} precision)`
    : `${provenance.retrievalDate} (day precision)`;
}

function Citation({ source, provenance }: { source: InvestigationSource; provenance: SourceProvenance }) {
  return <article className="historical-source" data-source-id={source.id}>
    <h4><a href={safeSourceUrl(source.url) ?? undefined} target="_blank" rel="noopener noreferrer">{source.title}</a></h4>
    <p>Issuer: {source.publisher} · self-reported · source family: {provenance.sourceFamily}</p>
    <dl>
      <dt>Reporting period</dt><dd>{provenance.reportingPeriod}</dd>
      <dt>Document / MD&amp;A date</dt><dd>{provenance.documentDate ?? 'Unverified'}</dd>
      <dt>First publication</dt><dd>Unverified; not inferred from URL or retrieval date</dd>
      <dt>Retained retrieval</dt><dd>{retainedRetrieval(source, provenance)}</dd>
      <dt>Page / section locator</dt><dd>{source.locator}</dd>
    </dl>
    <ul>{source.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
  </article>;
}

/** Every qualification is expanded in the review reader; none is hidden in hover text. */
export function HistoricalReviewView({ overlay, href, onClose }: {
  overlay: HistoricalReviewOverlay; href: string; onClose?: () => void;
}) {
  const sources = new Map(overlay.additions.sources.map(source => [source.id, source]));
  const provenance = new Map(overlay.provenance.map(row => [row.sourceId, row]));
  const entities = new Map([...overlay.additions.entities, overlay.reusedEntity].map(entity => [entity.id, entity]));
  const overview = reviewOriginalDestination(overlay.additions.records[0]);
  const irb = reviewOriginalDestination(overlay.reusedEntity);
  return <section className="historical-review-content" data-historical-review="review-only" data-public-graph="blocked">
    <header>
      <p className="historical-kicker">HISTORICAL REVIEW ONLY · PUBLIC_GRAPH_BLOCKED</p>
      <h1 id="historical-review-title">Issuer-reported ownership at 2025-12-31</h1>
      <a href={withoutHistoricalReview(href)} onClick={onClose}>Close historical review and return to the base atlas</a>
      <p>Nine reviewed historical claims from three source documents in two issuer families. Same-issuer materials are dependent, not independent corroboration. No current ownership or independent registry certification is established.</p>
      <p><strong>The base graph remains unchanged: 2,469 entities · 5,617 records · 4,203 relationships · 3,314 sources.</strong> This separate inspection overlay adds 9 entities, 9 records, 9 relationships and 3 sources only to its review reader (2,478 / 5,626 / 4,212 / 3,317). No historical addition is rendered as a factual map mark or path.</p>
      <p><strong>No payment flow, award influence, wrongdoing or propagated control is established.</strong> Ownership percentages are interests, not financial amounts. Only Rafael’s reported control of Rijn is included; it does not propagate through Rijn’s minority Ferrovial stake.</p>
      <p>Snapshot date is not a validity interval. Validity endpoints remain unknown; document dates and reporting periods are shown separately. This reader is intentionally independent of the base atlas’s event-year filter.</p>
    </header>
    <section aria-label="Historical identities and incorporation context">
      <h2>Identity and incorporation limits</h2>
      <p>New Fairfax India is separately namespaced and unresolved. It is not merged with Fairfax Financial, Fairfax Media or a name match. IRB reuses the exact existing entity unchanged; it is not the Private InvIT. Historical Cintra Global SE and Ferrovial SE names do not establish an October 2026 successor or intermediary chain.</p>
      <a href={irb.href}>{irb.label}: {overlay.reusedEntity.label}</a>
      <ul>{overlay.additions.entities.map(entity => <li key={entity.id} data-entity-id={entity.id}>
        <strong>{entity.label}</strong> · {entity.id}<br />{entity.identityBasis}
        {entity.geography.map((geo, index) => <p key={index}>
          {geo.basis === 'country-context' ? `Historical incorporation country: ${geo.countryCodes?.join(', ')}. ` : ''}{geo.note}
        </p>)}
      </li>)}</ul>
      <p>CA, MU and IN are source-bound historical incorporation jurisdictions only. No addresses, coordinates, operational locations, buildings or project coverage have been added.</p>
    </section>
    <section aria-label="Nine historical claims">
      <h2>Nine qualified historical claims</h2>
      {overlay.additions.relationships.map(edge => {
        const record = overlay.additions.records.find(row => row.id === edge.recordIds[0])!;
        return <article className="historical-claim" key={edge.id} data-review-relationship={edge.id} data-review-record={record.id}>
          <p className="historical-kicker">{record.originalId} · 2025-12-31 · issuer-reported · self-reported · PUBLIC_GRAPH_BLOCKED</p>
          <h3>{entities.get(edge.from)!.label} → {entities.get(edge.to)!.label}</h3>
          <p><strong>{edge.label}</strong></p>
          <p>{edge.summary}</p>
          <p>{edge.dateBasis}</p>
          <p>Claim response: {record.response}</p>
          <h4>Basis and limitations</h4>
          <ul>{edge.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
          <h4>Alternative explanation and falsifier</h4>
          <ul>{edge.alternativeExplanations.map(value => <li key={value}>{value}</li>)}</ul>
          <p>{edge.falsifier}</p>
          <h4>Exact cited primary-source destinations</h4>
          {edge.sourceIds.map(sourceId => <Citation key={sourceId} source={sources.get(sourceId)!} provenance={provenance.get(sourceId)!} />)}
          <p className="historical-small">Relationship ID: {edge.id}<br />Claim ID: {record.id}</p>
        </article>;
      })}
    </section>
    <section aria-label="Publication holds">
      <h2>Publication stays blocked</h2>
      <p>All nine source holds are retained. Separate exact-ID guards exclude every new entity, record and relationship from the factual scene. The excluded packet claims and other frozen-packet relationships have not been imported.</p>
      <p>Passing machine tests or opening this overlay does not approve publication. Actual rendering and integration review are still required.</p>
      <ul>{overlay.additions.held.map(hold => {
        const target = overlay.holdTargets.find(row => row.holdId === hold.id)!;
        return <li key={hold.id}>{hold.id}: {hold.reason}<br />
          Target relationship: {target.relationshipIds.join(', ')}<br />
          Target claim: {target.recordIds.join(', ')}<br />
          Historical endpoint context: {target.entityIds.join(', ')}
        </li>;
      })}</ul>
      <p>New additions do not have original-item pages. Their authoritative evidence destinations are the primary sources above.</p>
      <a href={overview.href}>{overview.label}</a>
    </section>
  </section>;
}

export default function HistoricalReviewPanel(props: { overlay: HistoricalReviewOverlay; href: string; onClose: () => void; returnFocusTo?: RefObject<HTMLButtonElement> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      const target = props.returnFocusTo?.current ?? previous;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    };
  }, [props.returnFocusTo]);
  return <dialog ref={dialog} className="historical-review-dialog" aria-labelledby="historical-review-title"
    onCancel={event => { event.preventDefault(); props.onClose(); }}>
    <button className="historical-dismiss" type="button" onClick={props.onClose} autoFocus>Close review (Escape)</button>
    <HistoricalReviewView {...props} />
  </dialog>;
}
