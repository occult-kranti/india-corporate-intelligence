import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => JSON.parse(readFileSync(new URL(`../research/investigations/${name}.json`, import.meta.url)));
const data = read('pmcares-accounts-extract');
const independent = read('pmcares-independent-check');
assert.equal(data.source.sha256, independent.sourcePdfSha256);
assert.equal(data.source.scale, 1);
assert.equal(data.source.displayed_unit, 'Amount in Rs.');
const sum = rows => rows.reduce((total, row) => total + (row.rupees ?? 0), 0);
let cells = 0;
for (const year of data.years) {
  const second = independent.years[year.financial_year];
  const groups = { opening_balances: 'opening', receipts: 'receipts', payments: 'payments', closing_balances: 'closing', donation_refunds_disclosed_in_row_labels: 'netDonationRefundDisclosures' };
  const compare = (row, other) => {
    assert.deepEqual({printed:row.printed, rupees:row.rupees}, {printed:other.printed, rupees:other.rupees}, `${year.financial_year}: ${row.label}`);
    assert(row.rupees === null || Number.isSafeInteger(row.rupees));
    if (row.printed === '-') assert.equal(row.rupees, null);
    else if (row.printed === 'Nil') assert.equal(row.rupees, 0);
    else assert.equal(Number(row.printed.replaceAll(',', '')), row.rupees);
    cells++;
  };
  for (const [firstKey, secondKey] of Object.entries(groups)) {
    const first = Object.values(year[firstKey]);
    const other = Object.values(second[secondKey]);
    assert.equal(first.length, other.length);
    first.forEach((row,index) => compare(row,other[index]));
  }
  const totals = year.printed_totals;
  for (const [firstKey, secondKey] of Object.entries({ receipts_side_including_opening: 'printedReceiptsSideTotalIncludingOpening', payments: 'printedPaymentsTotal', closing_balance: 'printedClosingTotal' })) compare(totals[firstKey], second[secondKey]);
  const opening=sum(year.opening_balances), receipts=sum(year.receipts), payments=sum(year.payments), closing=sum(year.closing_balances);
  assert.equal(opening + receipts, totals.receipts_side_including_opening.rupees);
  assert.equal(payments, totals.payments.rupees);
  assert.equal(closing, totals.closing_balance.rupees);
  assert.equal(opening + receipts - payments, closing);
  const derived = year.derived;
  assert.equal(derived.opening_balance_known_components_rupees, opening);
  assert.equal(derived.in_year_receipts_known_components_rupees, receipts);
  assert.equal(derived.payments_known_components_rupees, payments);
  assert.equal(derived.closing_balance_known_components_rupees, closing);
  assert.equal(derived.fresh_donations_net_of_refunds_rupees, sum(year.receipts.slice(0,2)));
  assert.equal(derived.interest_receipts_known_components_rupees, sum(year.receipts.slice(2,4)));
  assert.equal(derived.refund_receipts_known_components_rupees, sum(year.receipts.slice(4)));
}
assert.equal(cells, 34);
assert.equal(sum(data.years[0].opening_balances), data.years[1].printed_totals.closing_balance.rupees);
console.log(`PM CARES: ${cells} source cells match; two annual cash reconciliations and carry-forward pass; rupees and null dashes preserved.`);
