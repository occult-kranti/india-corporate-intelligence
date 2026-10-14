import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Download, GitBranch } from 'lucide-react';
import {
  PROCUREMENT_TRAILS, PROCUREMENT_TRAIL_METADATA, PROCUREMENT_TRAIL_SCOPE, PROCUREMENT_TRAIL_SOURCES,
  getProcurementTrail, loadProcurementTrailDetails, procurementTrailRecordId,
  type ProcurementTrailDetails,
} from '../../data/procurementTrails';
import './procurement-trail.css';
import { PROCUREMENT_AUDIT_STATUS, PROCUREMENT_AUDIT_FINDINGS, PROCUREMENT_AUDIT_SLICE } from '../../data/procurementAudit';

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const reviewedBuyers = new Map(PROCUREMENT_TRAILS.map(trail => [JSON.stringify([trail.portal, trail.buyer]), trail]));
const selectionKeys = ['iw_node', 'iw_edge', 'iw_record', 'iw_source'];
const missingStages = ['Linked notice and corrigenda', 'Lot and asset identifiers', 'Measurement book and bill of quantities', 'Payment', 'Physical completion'];
const nextRecords = ['Obtain the exact notice, corrigenda, lot/work-order and bidder-evaluation records.', 'Resolve legal identity with a statutory identifier or an explicit primary document before following ownership.', 'Match asset, scope and period to measurement books, invoices, payments and completion evidence.'];
function currentLocation() { return new URL(window.location.hash.slice(1), window.location.origin); }
function selectionSearch(params: URLSearchParams, recordId: string) {
  const next = new URLSearchParams(params);
  for (const key of selectionKeys) next.delete(key);
  next.set('iw_record', recordId); next.set('iw_view', 'evidence');
  return next;
}

/** Only exact reviewed buyer keys receive an action. All unrelated query state survives. */
export function ProcurementTrailLink({ portal, buyer }: { portal: string; buyer: string }) {
  const location = useLocation(); const navigate = useNavigate();
  const trail = reviewedBuyers.get(JSON.stringify([portal, buyer]));
  if (!trail) return null;
  return <Link className="pt-row-link" data-procurement-trail-link={trail.id}
    to={{ pathname: location.pathname, search: `?${selectionSearch(new URLSearchParams(location.search), procurementTrailRecordId(trail.id))}` }}
    onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); const current = currentLocation();
      navigate({ pathname: current.pathname, search: `?${selectionSearch(current.searchParams, procurementTrailRecordId(trail.id))}` });
    }}>Inspect procurement trail <ArrowRight size={13} aria-hidden="true" /><span className="sr-only"> for {buyer}</span></Link>;
}

export function ProcurementAuditLink({ findingId, label }: { findingId: string; label?: string }) {
  const location = useLocation(); const navigate = useNavigate();
  const finding = PROCUREMENT_AUDIT_FINDINGS.find(item => item.id === findingId);
  if (PROCUREMENT_AUDIT_STATUS.state !== 'complete' || !finding) return null;
  return <Link className="pt-row-link" data-procurement-audit-link={finding.recordId} to={{ pathname: location.pathname, search: `?${selectionSearch(new URLSearchParams(location.search), finding.recordId)}` }} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); const current = currentLocation(); navigate({ pathname: current.pathname, search: `?${selectionSearch(current.searchParams, finding.recordId)}` });
  }}>{label ?? finding.title}<ArrowRight size={13} aria-hidden="true" /></Link>;
}

export function ProcurementAuditEntry() {
  const complete = PROCUREMENT_AUDIT_STATUS.state === 'complete';
  return <div className="pt-audit-entry" data-procurement-audit-status={PROCUREMENT_AUDIT_STATUS.state}>
    <p className="iw-overline">Corpus-level source audit</p><strong>{complete ? `${PROCUREMENT_AUDIT_FINDINGS.length} reviewed findings` : 'Source and linkage review in progress'}</strong>
    <p>{PROCUREMENT_AUDIT_STATUS.scope} These are separate from the selected buyer’s historical cohort.</p>
    {complete ? <><p className="pt-note">Reviewed {PROCUREMENT_AUDIT_STATUS.asOf}. Each finding retains its eligible population, query references, competing explanations and limits.</p><details className="pt-details"><summary>Inspect the source-audit findings</summary><ul className="pt-audit-findings">{PROCUREMENT_AUDIT_FINDINGS.map(finding => <li key={finding.id}><ProcurementAuditLink findingId={finding.id} /><p>{finding.summary}</p></li>)}</ul></details></> : <p className="pt-note">No provisional join result is being attributed to this buyer.</p>}
  </div>;
}

export function ProcurementGuidedEntry({ onOpen }: { onOpen?: () => void }) {
  const location = useLocation(); const navigate = useNavigate();
  const guidedSearch = (params: URLSearchParams) => {
    const next = new URLSearchParams(params);
    for (const key of [...selectionKeys, 'iw_pathFrom', 'iw_pathTo', 'iw_path', 'iw_direction', 'iw_graph']) next.delete(key);
    next.set('iw_view', 'connections'); next.set('iw_node', 'public-works:entity:rw-nhai');
    next.set('iw_depth', '2'); next.set('iw_edge', 'public-works:relationship:pwg-package7-irb');
    return next;
  };
  return <div className="pt-guided-entry"><p className="iw-overline">A sourced project trail</p><strong>NHAI → Gujarat Package 7 → IRB</strong><p>Inspect the recorded award and dated ownership links. This curated trail has not been matched to CPPP rows and contains no procurement payment record.</p>
    {onOpen ? <button className="iw-button" onClick={onOpen}><GitBranch size={14} aria-hidden="true" />Open sourced project trail</button> : <Link className="iw-button" to={{ pathname: location.pathname, search: `?${guidedSearch(new URLSearchParams(location.search))}` }} onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); const current = currentLocation(); navigate({ pathname: current.pathname, search: `?${guidedSearch(current.searchParams)}` });
    }}><GitBranch size={14} aria-hidden="true" />Open sourced project trail</Link>}
  </div>;
}

function csvCell(value: unknown) {
  let text = String(value ?? ''); if (/^(?:\s*[=+@\-]|[\t\r])/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/gu, '""')}"`;
}
function exportLabels(details: ProcurementTrailDetails) {
  const { trail } = details;
  const headers = ['buyer', 'portal', 'supplierLabel', 'identityStatus', 'awardCount', 'reportedAwardValueINR', 'amountStage', 'family', 'namedPlausibleAwards', 'markedAwards', 'snapshot', 'computedAt', 'namingRule', 'sources', 'limitations'];
  const csv = [headers, ...details.labels.map(label => [trail.buyer, trail.portal, label.label, label.identityStatus, label.awards, label.valueInr, 'reported award value; not payment', details.family, trail.concentration?.namedPlausibleAwards, trail.concentration?.markedAwards, trail.snapshot, trail.computedAt, details.namingRule, JSON.stringify(PROCUREMENT_TRAIL_SOURCES), details.limitations.join(' | ')])].map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `procurement-labels-${trail.id}.csv`;
  document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportFullTrail(trailId: string, period: string, details: ProcurementTrailDetails | null) {
  const trail = getProcurementTrail(trailId); if (!trail) return;
  const payload = { format: 'icip-procurement-trail', version: 1, exportedAt: new Date().toISOString(), viewUrl: window.location.href, period, trail, details, provenance: PROCUREMENT_TRAIL_METADATA, sources: PROCUREMENT_TRAIL_SOURCES, accountingStage: 'Reported award aggregate; no payment or completion established', missingStages, nextRecords, limitations: details?.limitations ?? PROCUREMENT_TRAIL_SOURCES.flatMap(source => source.limitations), corpusAudit: { status: PROCUREMENT_AUDIT_STATUS, findings: PROCUREMENT_AUDIT_FINDINGS, records: PROCUREMENT_AUDIT_SLICE.records, sources: PROCUREMENT_AUDIT_SLICE.sources, interpretation: 'Corpus-level findings are not measurements or allegations about this selected buyer.' } };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `procurement-trail-${trailId}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ProcurementTrail({ trailId, period, onSourceSelect, onOpenConnections }: { trailId: string; period: string; onSourceSelect: (id: string) => void; onOpenConnections: () => void }) {
  const trail = getProcurementTrail(trailId);
  const [loaded, setLoaded] = useState<{ id: string; details: ProcurementTrailDetails | null; error?: string }>();
  const [exportStatus, setExportStatus] = useState('');
  useEffect(() => {
    let live = true; setExportStatus('');
    loadProcurementTrailDetails(trailId).then(details => { if (live) setLoaded({ id: trailId, details }); }).catch(() => {
      if (live) setLoaded({ id: trailId, details: null, error: 'Concentration details could not be matched to this snapshot. No substitute labels are shown.' });
    });
    return () => { live = false; };
  }, [trailId]);
  if (!trail) return null;
  const concentration = trail.concentration; const ready = loaded?.id === trailId; const details = ready ? loaded.details : null;
  return <section className="procurement-trail" aria-label="Procurement trail evidence" data-procurement-trail={trail.id}>
    <p className="pt-scope">{PROCUREMENT_TRAIL_SCOPE}</p>
    <p className="pt-note"><strong>Period:</strong> {period}<br /><strong>Computed:</strong> {trail.computedAt}; not an award or payment date.</p>
    <button className="iw-button" disabled={!ready || Boolean(loaded?.error)} onClick={() => { exportFullTrail(trailId, period, details); setExportStatus('Exported the full trail, available labels, source chain, accounting stages and missing evidence.'); }}><Download size={14} aria-hidden="true" />Export full trail JSON</button><p className="pt-note">Casebook pins retain the sourced cohort summary. This full download also retains the available supplier-label detail.</p><p className="pt-note" role="status">{exportStatus}</p>
    <h4>Two different evidence populations</h4>
    <div className="pt-cohort"><p className="pt-cohort-label">01 / Recorded bid counts</p><strong>{number.format(trail.bidRate.singleBidder)} / {number.format(trail.bidRate.n)}</strong><p>Single-bid awards / awards with 1–1,000 reported bids.</p><p>{number.format(trail.bidRate.pct)}% · Wilson 95%: {trail.bidRate.wilson95.map(value => `${number.format(value)}%`).join('–')}</p></div>
    <div className="pt-cohort"><p className="pt-cohort-label">02 / Named winners and plausible values</p>{concentration ? <>
      <strong>{number.format(concentration.namedPlausibleAwards)} awards</strong><p>This separate family requires a named winner and a reported value above ₹0 and at most ₹1 trillion. It is not the bid-count denominator.</p>
      <dl className="pt-metrics"><div><dt>Marked-label subset used for HHI</dt><dd>{number.format(concentration.markedAwards)} / {number.format(concentration.namedPlausibleAwards)} ({number.format(concentration.markedSharePct)}%)</dd></div><div><dt>Unmarked awards excluded from HHI</dt><dd>{number.format(concentration.unmarkedAwards)}</dd></div><div><dt>Count HHI · 0–10,000</dt><dd>{concentration.hhiMarkedCount === null ? 'Not computed' : number.format(concentration.hhiMarkedCount)}</dd></div><div><dt>Value HHI · reported award values</dt><dd>{concentration.hhiMarkedValue === null ? 'Not computed' : number.format(concentration.hhiMarkedValue)}</dd></div></dl>
      {concentration.markedAwards < 50 && <p className="pt-caution">Only {number.format(concentration.markedAwards)} marked awards support these HHIs. The 50-award entry threshold applies to the larger named-value family, not this subset.</p>}
      <p className="pt-note">HHI describes the marked subset, not every supplier. Trade markers do not resolve a company or person. This is no misconduct score.</p>
    </> : <p>Outside the retained concentration family. Concentration is unavailable, not zero.</p>}</div>

    <h4>What can be followed</h4><ol className="pt-stages">
      <li data-stage="notice"><strong>Notice &amp; amendments</strong><span>Not linked to this historical aggregate.</span></li>
      <li data-stage="award"><strong>Award</strong><span>Reported aggregate only; individual contracts and assets remain unverified.</span>{concentration && <span className="pt-stage-value">₹{number.format(concentration.namedPlausibleValueInr)} reported award value in the named-value family. This is not cash paid.</span>}</li>
      <li data-stage="payment"><strong>Payment</strong><span>No linked invoice, measurement certificate, treasury/PFMS reference or payment reversal.</span></li>
      <li data-stage="completion"><strong>Delivery &amp; completion</strong><span>No linked completion or physical inspection record.</span></li>
    </ol>
    <details className="pt-details"><summary>Winner labels in the retained aggregate</summary><p>At most five marked labels, each with at least five awards for this buyer. No identity, ownership or political connection is inferred.</p>
      {!ready ? <p role="status">Loading the exact buyer snapshot…</p> : loaded.error ? <p role="status">{loaded.error}</p> : !details ? <p>No concentration detail is retained for this buyer.</p> : <>
        <ul className="pt-labels">{details.labels.map((label, index) => <li key={index}><strong>{label.label}</strong><span>{number.format(label.awards)} awards · ₹{number.format(label.valueInr)} reported award value</span><span>Dataset label only · legal identity unresolved</span></li>)}</ul>{details.labels.length === 0 && <p>No label meets the retained naming rule.</p>}
        <button className="iw-button" disabled={!details.labels.length} onClick={() => { exportLabels(details); setExportStatus(`Exported ${details.labels.length} labels with population, stage and sources.`); }}><Download size={14} aria-hidden="true" />Export label evidence CSV</button><p className="pt-note" role="status">{exportStatus}</p>
      </>}
    </details>
    <details className="pt-details"><summary>Source chain &amp; reproducibility</summary><p>These are publication and transformation steps of the same scrape, not independent corroboration.</p><ol className="pt-lineage">{PROCUREMENT_TRAIL_SOURCES.map(source => <li key={source.id}><button onClick={() => onSourceSelect(`procurement-trails:source:${source.id}`)}>{source.title}</button><span>{source.summary}</span><a href={source.url} target="_blank" rel="noopener noreferrer">Open source <ArrowUpRight size={12} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ol><p><strong>Computed:</strong> {trail.computedAt}. This is not an award date.</p><p><strong>Snapshot:</strong> <code>{trail.snapshot}</code></p><p><strong>Deduplication:</strong> {PROCUREMENT_TRAIL_METADATA.dedupRule}</p><p><strong>Buyer grouping:</strong> {trail.buyerRule}</p><p><strong>Classification:</strong> {trail.classificationBasis}</p></details>
    <details className="pt-details"><summary>Next records &amp; competing explanations</summary><p>{PROCUREMENT_TRAIL_METADATA.concentrationInnocentReading}</p><ul>{nextRecords.map(item => <li key={item}>{item}</li>)}</ul></details>
    <ProcurementAuditEntry />
    <ProcurementGuidedEntry onOpen={onOpenConnections} />
  </section>;
}
