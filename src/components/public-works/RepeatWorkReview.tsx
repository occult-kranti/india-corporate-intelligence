import { useState, type FormEvent } from 'react';
import { assessRepeatedWork, type RepeatWorkRecord } from '../../data/publicWorks';
import './repeat-work-review.css';

type Draft = {
  authorityId: string; locationId: string; contractId: string; assetId: string;
  scopeId: string; periodStart: string; periodEnd: string;
  stage: RepeatWorkRecord['stage']; cancelled: boolean; correction: boolean;
};
const blank = (): Draft => ({ authorityId: '', locationId: '', contractId: '', assetId: '', scopeId: '', periodStart: '', periodEnd: '', stage: 'award', cancelled: false, correction: false });
const textFields = [
  ['authorityId', 'Procuring authority ID', 'The same legal authority or buyer code'],
  ['locationId', 'Site or location ID', 'A stable site, chainage or locality code'],
  ['contractId', 'Contract ID', 'The contract, not a notice version'],
  ['assetId', 'Asset ID', 'A stable bridge, road segment or facility ID'],
  ['scopeId', 'Scope or item code', 'The same work package or service item'],
] as const;
const exclusionLabels: Record<string, string> = {
  'duplicate-extract': 'This is another extract of the same record.',
  cancelled: 'The record was cancelled.',
  'correction-or-amendment': 'A correction or amendment is part of an earlier record.',
  'notice-is-not-work': 'A tender notice does not establish an award, payment or completed work.',
  'missing-comparability-fields': 'Add the authority, location, contract, asset, scope and both work-period dates.',
  'invalid-period': 'Use valid dates with the start on or before the end.',
};

export default function RepeatWorkReview() {
  const [records, setRecords] = useState<[Draft, Draft]>([blank(), blank()]);
  const [result, setResult] = useState<ReturnType<typeof assessRepeatedWork> | null>(null);
  function update<K extends keyof Draft>(index: number, key: K, value: Draft[K]) {
    setRecords(current => current.map((record, i) => i === index ? { ...record, [key]: value } : record) as [Draft, Draft]);
    setResult(null);
  }
  function compare(event: FormEvent) {
    event.preventDefault();
    const nullable = (value: string) => value.trim() || null;
    const input = records.map((record, index) => ({
      id: `Record ${index + 1}`, authorityId: nullable(record.authorityId), locationId: nullable(record.locationId),
      contractId: nullable(record.contractId), assetId: nullable(record.assetId), scopeId: nullable(record.scopeId),
      periodStart: nullable(record.periodStart), periodEnd: nullable(record.periodEnd), stage: record.stage,
      cancelled: record.cancelled, correctsId: record.correction ? 'earlier-record' : null,
    }));
    setResult(assessRepeatedWork(input));
  }
  function reset() { setRecords([blank(), blank()]); setResult(null); }

  return <details className="pw-repeat-check">
    <summary>Compare two work records <span>User-entered check</span></summary>
    <p className="pw-repeat-intro">Enter the identifiers and work periods recorded in two documents for different contracts. This check tests whether they can be compared; the inputs remain unverified. An overlap identifies a question to investigate. Duplicate invoices within one contract need a separate payment-ledger check.</p>
    <form onSubmit={compare}>
      <div className="pw-repeat-pair">
        {records.map((record, index) => <fieldset key={index}>
          <legend>Record {index + 1}</legend>
          {textFields.map(([key, label, hint]) => <label key={key}>
            <span id={`pw-repeat-${index}-${key}-label`}>{label}</span>
            <input type="text" value={record[key]} onChange={event => update(index, key, event.target.value)} maxLength={180} aria-labelledby={`pw-repeat-${index}-${key}-label`} aria-describedby={`pw-repeat-${index}-${key}-hint`} />
            <small id={`pw-repeat-${index}-${key}-hint`}>{hint}</small>
          </label>)}
          <label><span id={`pw-repeat-${index}-stage-label`}>Record stage</span><select aria-labelledby={`pw-repeat-${index}-stage-label`} value={record.stage} onChange={event => update(index, 'stage', event.target.value as Draft['stage'])}>
            <option value="award">Award</option><option value="payment">Payment</option><option value="completion">Completion</option>
            <option value="notice">Tender notice</option><option value="amendment">Amendment</option>
          </select></label>
          <div className="pw-repeat-dates">
            <label><span>Work period starts</span><input type="date" value={record.periodStart} onChange={event => update(index, 'periodStart', event.target.value)} /></label>
            <label><span>Work period ends</span><input type="date" value={record.periodEnd} onChange={event => update(index, 'periodEnd', event.target.value)} /></label>
          </div>
          <label className="pw-repeat-checkbox"><input type="checkbox" checked={record.cancelled} onChange={event => update(index, 'cancelled', event.target.checked)} /><span>This record was cancelled</span></label>
          <label className="pw-repeat-checkbox"><input type="checkbox" checked={record.correction} onChange={event => update(index, 'correction', event.target.checked)} /><span>This record corrects an earlier record</span></label>
        </fieldset>)}
      </div>
      <div className="pw-repeat-actions"><button type="submit">Check comparability</button><button type="button" onClick={reset}>Clear records</button></div>
    </form>
    <div className="pw-repeat-result" role="status" aria-live="polite" aria-atomic="true">
      {result && <>
        <h4>{result.comparisons.length ? 'Overlapping scope needs review' : 'No comparable overlap established'}</h4>
        <p>{result.conclusion}</p>
        <p>{result.eligible} of 2 records met the comparison requirements.</p>
        {result.excluded.length > 0 && <ul>{result.excluded.map((item, index) => <li key={`${item.id}-${index}`}><strong>{item.id}:</strong> {exclusionLabels[item.reason] ?? item.reason}</li>)}</ul>}
        {result.eligible === 2 && result.comparisons.length === 0 && <p>The pair must have different contract IDs, matching authority, location, asset, scope and stage, and overlapping work periods. Repeated entries under one contract can represent separate instalments or lots.</p>}
        {result.comparisons.map((item, index) => <p key={index}><strong>{item.left} / {item.right}:</strong> {item.reason}</p>)}
        <p>Check the bill of quantities, maintenance cycle, cancellation or variation order, payment responsibility and completion certificates. Even matching records cannot establish duplicate payment without that evidence.</p>
      </>}
    </div>
    <p className="pw-repeat-note">Use exact identifiers from the records. Shared names or similar descriptions cannot resolve an asset. Changes to these inputs clear the previous result.</p>
  </details>;
}
