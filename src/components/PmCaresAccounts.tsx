import accounts from '../../research/investigations/pmcares-accounts-extract.json';
import { Section, DataTable, Callout, StatGrid } from './Editorial';

const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`;
const crore = (value: number) => `₹${(value / 1e7).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cr`;

export default function PmCaresAccounts() {
  const current = accounts.years[0];
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(accounts, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pmcares-accounts-2024-25-verified-extract.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const metrics = [
    ['Opening balance', 'opening_balance_known_components_rupees'],
    ['In-year receipts', 'in_year_receipts_known_components_rupees'],
    ['Payments', 'payments_known_components_rupees'],
    ['Closing balance', 'closing_balance_known_components_rupees'],
  ] as const;
  return <Section id="current-pm-accounts" title="Two years, reconciled to the rupee" note="FY2024–25 statement and its FY2023–24 comparative column · checked 14 October 2026">
    <p className="text-sm leading-relaxed text-text-secondary max-w-[78ch]">
      The current statement reports a large closing balance and limited payments during FY2024–25.
      Understanding why requires the outstanding commitments, agency refunds and delivery records.
      A matching cash equation alone cannot establish the quality or legality of spending.
    </p>
    <StatGrid items={metrics.map(([label, key]) => ({ label: `${label} · FY2024–25`, value: crore(current.derived[key]) }))} />
    <p className="text-xs text-text-muted">Cards show crore, rounded to two decimals. The table preserves exact rupees.</p>
    <DataTable caption="Cash reconciliation · exact INR; calculated from the statement’s numeric entries" columns={['Item', ...accounts.years.map(y => `FY${y.financial_year}`)]}
      rows={[
        ...metrics.map(([label, key]) => [label, ...accounts.years.map(y => rupees(y.derived[key]))]),
        ['Opening + receipts − payments − closing', ...accounts.years.map(y => rupees(y.derived.opening_balance_known_components_rupees + y.derived.in_year_receipts_known_components_rupees - y.derived.payments_known_components_rupees - y.derived.closing_balance_known_components_rupees))],
      ]} />
    <Callout label="What the receipts include" tone="warn">
      FY2024–25 in-year receipts comprise {crore(current.derived.fresh_donations_net_of_refunds_rupees)} in net donations,
      {' '}{crore(current.derived.interest_receipts_known_components_rupees)} in interest and
      {' '}{crore(current.derived.refund_receipts_known_components_rupees)} in refunds.
      The printed receipts-side total includes opening balances. Moving cash into fixed deposits is not programme expenditure.
    </Callout>
    <details className="mt-5 border border-border rounded-lg p-4">
      <summary className="cursor-pointer text-accent font-medium">Inspect all statement rows and verification</summary>
      {(['opening_balances', 'receipts', 'payments', 'closing_balances'] as const).map(group => <DataTable key={group}
        caption={`${group.replace(/_/g, ' ')} · exact INR as printed`}
        columns={['Statement row', ...accounts.years.map(y => `FY${y.financial_year}`)]}
        rows={current[group].map((row, index) => [row.label, ...accounts.years.map(y => y[group][index].printed)])} />)}
      <p className="text-sm text-text-secondary leading-relaxed">
        All 34 amount cells, including the donation-refund annotations, matched between two AI reviewers’
        independent visual transcriptions of the same PDF. Both years’ four arithmetic checks and the
        opening-balance carry-forward have zero residual. Dashes remain null in the data; sums use numeric entries only.
        This verifies transcription and arithmetic, not the underlying transactions.
      </p>
    </details>
    <p className="mt-5 text-sm text-text-secondary leading-relaxed max-w-[80ch]">
      The downloaded file contains one signed receipts-and-payments page. It refers to notes 1–16 and a separate
      auditor report, neither included in that file. The auditor signature is dated 7 August 2026; this is not
      a verified publication date. The {crore(current.receipts[5].rupees!)} in implementing-agency refunds
      calls for Note 11 and project-level reconciliation before interpreting delivery outcomes.
    </p>
    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
      <a className="text-accent underline" href={accounts.source.url} target="_blank" rel="noreferrer">Open the official statement</a>
      <button className="border border-border-light rounded px-3 py-2 text-accent hover:bg-bg-elevated" onClick={download}>Download verified accounts JSON</button>
    </div>
  </Section>;
}
