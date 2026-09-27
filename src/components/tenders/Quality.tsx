import type { ReactNode } from 'react';
import type { CpppCore, Provenance, QualityFile } from '../../data/cppp';
import { Code, Cols, FINDINGS, MONO_NOTE, Sub, Twin, WRAP, csvComments, csvName, d1, fmt, stamp } from './ui';

/**
 * §3.1 — the dataset's own defects, stated before any rate (D1). A key/value table: the
 * fact, its count, what is counted (never a bare number), its base and its share.
 * Long verbatim material folds; a count never does.
 */

type Unit = 'rows' | 'tender ids' | 'award decisions';

interface QRow {
  key: string;
  head: ReactNode;
  /** The header as plain text, for the CSV. */
  text: string;
  count: number;
  unit: Unit;
  base: string;
  /** The base's size when a share is meaningful; null prints "—". */
  of: number | null;
}

function rowsOf(q: QualityFile): QRow[] {
  const raw = q.raw.rows;
  const RAW = 'raw rows';
  const [y0, y1] = q.dates.yearRange;
  const out: QRow[] = [
    { key: 'raw', text: 'raw rows in the scrape', head: 'raw rows in the scrape', count: raw, unit: 'rows', base: RAW, of: raw },
    { key: 'tids', text: 'distinct tender ids', head: 'distinct tender ids', count: q.raw.distinctTenderIds, unit: 'tender ids', base: RAW, of: null },
    { key: 'sharing', text: 'rows sharing a tender id with another row', head: 'rows sharing a tender id with another row', count: q.duplicates.rowsSharingATenderId, unit: 'rows', base: RAW, of: raw },
    {
      key: 'dedup',
      text: `Dedup rule applied — ${q.afterDedup.rule}`,
      head: <>Dedup rule applied — {q.afterDedup.rule}</>,
      count: q.afterDedup.rows,
      unit: 'award decisions',
      base: RAW,
      of: raw,
    },
    { key: 'removed', text: 'rows removed by the applied dedup rule', head: 'rows removed by the applied dedup rule', count: q.afterDedup.removed, unit: 'rows', base: RAW, of: raw },
    {
      key: 'alt1',
      text: `Alternative rule, NOT applied — ${q.afterDedup.alternativeOnePerTenderId.rule}`,
      head: <>Alternative rule, NOT applied — {q.afterDedup.alternativeOnePerTenderId.rule}</>,
      count: q.afterDedup.alternativeOnePerTenderId.rows,
      unit: 'award decisions',
      base: RAW,
      of: raw,
    },
    {
      key: 'alt2',
      text: `Alternative rule, NOT applied — ${q.afterDedup.alternativeOnePerTenderBidder.rule}`,
      head: <>Alternative rule, NOT applied — {q.afterDedup.alternativeOnePerTenderBidder.rule}</>,
      count: q.afterDedup.alternativeOnePerTenderBidder.rows,
      unit: 'award decisions',
      base: RAW,
      of: raw,
    },
    { key: 'bnull', text: 'bids_received null', head: <><Code>bids_received</Code> null</>, count: q.bidsReceived.null, unit: 'rows', base: RAW, of: raw },
    { key: 'bzero', text: 'bids_received zero', head: <><Code>bids_received</Code> zero</>, count: q.bidsReceived.zero, unit: 'rows', base: RAW, of: raw },
    { key: 'bone', text: 'bids_received one', head: <><Code>bids_received</Code> one</>, count: q.bidsReceived.one, unit: 'rows', base: RAW, of: raw },
    { key: 'bover', text: 'bids_received over 1,000', head: <><Code>bids_received</Code> over 1,000</>, count: q.bidsReceived.over1000, unit: 'rows', base: RAW, of: raw },
    { key: 'vnull', text: 'contract_value_amount null', head: <><Code>contract_value_amount</Code> null</>, count: q.contractValue.null, unit: 'rows', base: RAW, of: raw },
    { key: 'vlte', text: 'contract_value_amount zero or negative', head: <><Code>contract_value_amount</Code> zero or negative</>, count: q.contractValue.lteZero, unit: 'rows', base: RAW, of: raw },
    {
      key: 'vover',
      text: 'contract value over ₹1 lakh crore (10^12 rupees)',
      // The threshold in words (U7); the power of ten only inside <code>.
      head: <>contract value over ₹1 lakh crore (<Code>10^12</Code> rupees)</>,
      count: q.contractValue.over1e12,
      unit: 'rows',
      base: RAW,
      of: raw,
    },
    { key: 'aocb', text: 'AOC dated before closing (a date-order violation)', head: 'AOC dated before closing (a date-order violation)', count: q.dates.aocBeforeClosing, unit: 'rows', base: RAW, of: raw },
    { key: 'aocr', text: `AOC years outside ${y0}–${y1}`, head: `AOC years outside ${y0}–${y1}`, count: q.dates.aocYearOutOfRange, unit: 'rows', base: RAW, of: raw },
    {
      key: 'pyd',
      text: 'portal year differs from AOC year (the rates use the AOC year)',
      head: 'portal year differs from AOC year (the rates use the AOC year)',
      count: q.dates.portalYearDiffersFromAocYear,
      unit: 'rows',
      base: RAW,
      of: raw,
    },
    ...Object.entries(q.tenderType.normalisedCounts).map(([cls, n]): QRow => ({
      key: `tt-${cls}`,
      text: `tender_type normalised to ${cls}`,
      head: <><Code>tender_type</Code> normalised to <span>{cls}</span></>,
      count: n,
      unit: 'rows',
      base: RAW,
      of: raw,
    })),
    { key: 'junk', text: 'junk organisations (null, blank or test names)', head: 'junk organisations (null, blank or test names)', count: q.organisations.junkRows, unit: 'rows', base: RAW, of: raw },
    { key: 'named', text: 'winner named', head: 'winner named', count: q.winnerMarkers.named, unit: 'rows', base: RAW, of: raw },
    { key: 'marked', text: 'winner marked (the name matches the marker rule and may be shown)', head: 'winner marked (the name matches the marker rule and may be shown)', count: q.winnerMarkers.marked, unit: 'rows', base: 'rows with a named winner', of: q.winnerMarkers.named },
    { key: 'unmarked', text: 'winner unmarked (counted, never named)', head: 'winner unmarked (counted, never named)', count: q.winnerMarkers.unmarked, unit: 'rows', base: 'rows with a named winner', of: q.winnerMarkers.named },
    ...q.raw.byPortalYear.map((r): QRow => ({
      key: `py-${r.portal}-${r.portal_year}`,
      text: `${r.portal}, portal year ${r.portal_year}`,
      head: `${r.portal}, portal year ${r.portal_year}`,
      count: r.rows,
      unit: 'rows',
      base: RAW,
      of: raw,
    })),
  ];
  return out;
}

const share = (r: QRow) => (r.of ? `${d1((100 * r.count) / r.of)}%` : '—');

export default function Quality({ core, p, params }: { core: CpppCore; p: Provenance; params: URLSearchParams }) {
  const q = core.quality!;
  const rows = rowsOf(q);
  const alt = [q.afterDedup.rows, q.afterDedup.alternativeOnePerTenderId.rows, q.afterDedup.alternativeOnePerTenderBidder.rows];
  const h0 = q.duplicates.heaviestTenderIds[0];
  const classes = Object.keys(q.tenderType.normalisedCounts).length;
  const terms = q.winnerMarkers.regex.split('|').length;
  const family = 'every raw row of the scrape (no dedup)';
  const heavy = q.duplicates.heaviestTenderIds
    .map((h) => `${h.tender_id}  ${h.portal}  rows ${h.rows}  distinct bidders ${h.distinct_bidders}  distinct AOC dates ${h.distinct_aoc}`)
    .join('\n');
  const dedupSql = p.sql.dedup ?? 'the dedup SQL is not in provenance.sql';
  return (
    <Sub id="cppp-quality" title="Dataset quality, before any rate">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent mb-1">Read this first about the data</div>
      <p className={`${FINDINGS} max-w-[72ch]`}>{q.readMeFirst}</p>

      <Twin
        twin="quality"
        label="Dataset quality table"
        describedBy="cppp-caveat"
        caption={<>Dataset quality, stated before any rate · {fmt(q.raw.rows)} raw rows · {stamp(p)}</>}
        head={
          <>
            {/* An empty corner cell, present to assistive technology so that each column
                header stays over its own column; the row headers name each fact. */}
            <td />
            <Cols names={['count', 'what is counted', 'base', 'share of base']} />
          </>
        }
        download={{
          filename: csvName('quality', p),
          comments: csvComments(core, p, family, q.raw.rows, params),
          columns: ['fact', 'count', 'what is counted', 'base', 'share of base (percent)'],
          rows: () => rows.map((r) => [r.text, String(r.count), r.unit, r.base, r.of ? String((100 * r.count) / r.of) : '']),
        }}
      >
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{r.head}</th>
            <td className="font-mono tabular-nums">{fmt(r.count)}</td>
            <td>{r.unit}</td>
            <td>{r.base}</td>
            <td className="font-mono tabular-nums">{share(r)}</td>
          </tr>
        ))}
      </Twin>

      <p className={`${FINDINGS} max-w-[72ch]`}>
        How many award decisions the scrape holds depends on the rule: between {fmt(Math.min(...alt))} and {fmt(q.afterDedup.rows)}. This page
        uses {fmt(q.afterDedup.rows)}. The smallest reading counts year/organisation buckets such as {h0.tender_id} ({fmt(h0.rows)} rows,{' '}
        {fmt(h0.distinct_bidders)} bidders) as one tender.
      </p>
      <p className={`${MONO_NOTE} mt-3 max-w-[72ch]`}>
        Winners: {q.winnerMarkers.rule}
      </p>
      <p className={`${MONO_NOTE} mt-2 max-w-[72ch]`}>{q.tenderType.note}</p>

      <div className="mt-4 space-y-2 text-[13px] text-text-secondary">
        <details>
          <summary className="cursor-pointer font-mono text-[11.5px]">
            {`${q.tenderType.rawValues.length} raw spellings → ${classes} normalised classes`}
          </summary>
          <pre className={`mt-2 font-mono text-[11.5px] ${WRAP}`}>
            {q.tenderType.rawValues.map((v) => `${v.raw === null ? 'NULL' : JSON.stringify(v.raw)} → ${v.normalised}: ${v.n}`).join('\n')}
          </pre>
        </details>
        <details>
          <summary className="cursor-pointer font-mono text-[11.5px]">{`Winner-marker regex, ${terms} terms`}</summary>
          <p className="mt-2">
            <Code>{q.winnerMarkers.regex}</Code>
          </p>
        </details>
        <details>
          <summary className="cursor-pointer font-mono text-[11.5px]">{`Dedup SQL, ${dedupSql.split('\n').length} lines`}</summary>
          <pre className={`mt-2 font-mono text-[11.5px] ${WRAP}`}>{dedupSql}</pre>
        </details>
        <details>
          <summary className="cursor-pointer font-mono text-[11.5px]">{`${q.duplicates.heaviestTenderIds.length} tender ids with the most rows`}</summary>
          <pre className={`mt-2 font-mono text-[11.5px] ${WRAP}`}>{heavy}</pre>
        </details>
      </div>
    </Sub>
  );
}
