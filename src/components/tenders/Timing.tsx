import type { CpppCore, Provenance } from '../../data/cppp';
import { Cols, FINDINGS, FamilyLink, GREY, MONO_NOTE, Sub, Twin, csvComments, csvName, d1, fmt, rateText, stamp, useWidth } from './ui';

/**
 * §3.4 — days from tender closing to award of contract (AOC), and AOC by month of the
 * financial year (U8). The two-day share is followed at once, at the same size, by the
 * reading that fits it without anyone's conduct: e-procurement auto-evaluation and
 * financial-year spending rules.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Bin width in days, read from the emitted label ("0", "3–7", ">365"). */
function binWidth(bin: string): string {
  if (/^\d+$/.test(bin)) return '1';
  const m = bin.match(/^(\d+)[–-](\d+)$/);
  if (m) return String(Number(m[2]) - Number(m[1]) + 1);
  const o = bin.match(/^>(\d+)$/);
  return o ? `open (over ${o[1]})` : 'not stated';
}

function Histogram({ bins, aria }: { bins: { bin: string; n: number }[]; aria: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(720);
  const W = Math.max(300, width);
  const top = 30;
  const plotH = 150;
  const H = top + plotH + 40;
  const max = Math.max(...bins.map((b) => b.n), 1);
  const bw = W / bins.length;
  return (
    <div ref={ref} className="w-full">
      <svg role="img" aria-label={aria} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block font-mono">
        <line x1={0} x2={W} y1={top + plotH} y2={top + plotH} stroke={GREY.axis} strokeWidth={1} />
        {bins.map((b, i) => {
          const h = (b.n / max) * plotH;
          const cx = i * bw + bw / 2;
          return (
            // The bar's bin and n are printed on it: hover carries nothing the table does not.
            <g key={b.bin} data-mark="bar" data-key={b.bin} data-flag="plotted" fill={GREY.bar}>
              <rect x={i * bw + 2} y={top + plotH - h} width={Math.max(1, bw - 4)} height={h} fill={GREY.bar} />
              <text x={cx} y={top + plotH + 15} fontSize={W < 520 ? 8.5 : 10} fill="#9a9a9a" textAnchor="middle">
                {b.bin}
              </text>{' '}
              <text x={cx} y={top + plotH - h - 5} fontSize={W < 520 ? 8.5 : 10} fill="#d0d0d0" textAnchor="middle">
                {fmt(b.n)}
              </text>
            </g>
          );
        })}
        <text x={0} y={H - 6} fontSize={10} fill="#9a9a9a">
          days from closing to AOC (bins of unequal width)
        </text>
      </svg>
    </div>
  );
}

export default function Timing({ core, p, params }: { core: CpppCore; p: Provenance; params: URLSearchParams }) {
  const t = core.timing!;
  const q = core.quality;
  const le2 = t.shareLe2Days;
  // The two null counts are printed apart: a row missing both dates would be counted
  // twice by a sum, and the rows missing either one is not an emitted figure.
  const nullCount = (k: string) => (q && q.nulls[k] != null ? fmt(q.nulls[k]) : 'not present in this build');
  const total = t.daysClosingToAoc.reduce((a, b) => a + b.n, 0);
  return (
    <Sub id="cppp-timing" title="Timing">
      <p data-rate className={`${FINDINGS} max-w-[72ch]`}>
        Two days or fewer from closing to AOC: {rateText(le2.count, le2.n, le2.pct, le2.wilson95)}
      </p>
      <p data-innocent className={`${FINDINGS} max-w-[72ch]`}>
        {t.innocentReading}
      </p>

      <div className={`${MONO_NOTE} mt-3 space-y-1 max-w-[76ch]`}>
        <p>
          AOC dated before closing: {q ? fmt(q.dates.aocBeforeClosing) : 'not present in this build:'} raw rows (quality table);{' '}
          {fmt(t.excludedAocBeforeClosing)} award decisions after dedup, excluded here. A date-order defect, excluded, not read as conduct.
        </p>
        <p>
          Dates missing, in raw rows (quality table, nulls): aoc_at null {nullCount('aoc_at_null')}; closing_at null {nullCount('closing_at_null')};{' '}
          {fmt(t.excludedDateMissing)} award decisions after dedup, excluded here.
        </p>
      </div>

      <figure className="mt-5">
        <Histogram
          bins={t.daysClosingToAoc}
          aria={`Days from closing to AOC, histogram, n = ${fmt(t.n)} award decisions; ${fmt(t.excludedAocBeforeClosing)} excluded for an AOC dated before closing and ${fmt(t.excludedDateMissing)} for a missing date; table follows.`}
        />
        <figcaption className="mt-3 space-y-1 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
          <p>Bins are unequal widths; bar heights are counts, not densities.</p>
          <p className={MONO_NOTE}>
            Median {fmt(t.medianDays)} days. {stamp(p)} · over the <FamilyLink>timing family</FamilyLink>
          </p>
        </figcaption>
      </figure>

      <Twin
        twin="hist"
        label="Days from closing to AOC"
        caption={
          <>
            Days from closing to AOC · n = {fmt(t.n)} award decisions in {t.daysClosingToAoc.length} bins · {stamp(p)} · <FamilyLink>family</FamilyLink>
          </>
        }
        head={<Cols names={['bin', 'width in days', 'n', 'share']} />}
        minWidth="26rem"
        download={{
          filename: csvName('hist', p),
          comments: csvComments(core, p, t.definition, t.n, params),
          columns: ['bin_days', 'width_days', 'n', 'share_pct'],
          rows: () => t.daysClosingToAoc.map((b) => [b.bin, binWidth(b.bin), String(b.n), String((100 * b.n) / total)]),
        }}
      >
        {t.daysClosingToAoc.map((b) => (
          <tr key={b.bin}>
            <th scope="row">{b.bin}</th>
            <td className="font-mono tabular-nums">{binWidth(b.bin)}</td>
            <td className="font-mono tabular-nums">{fmt(b.n)}</td>
            <td className="font-mono tabular-nums">{d1((100 * b.n) / total)}%</td>
          </tr>
        ))}
      </Twin>

      <Twin
        twin="fymonth"
        label="AOC by month of the financial year"
        describedBy="cppp-timing-reading"
        caption={
          <>
            AOC by month of the financial year (April is month 1) · n = {fmt(t.aocByFinancialYearMonth.reduce((a, m) => a + m.n, 0))} award decisions ·{' '}
            {stamp(p)} · <FamilyLink>family</FamilyLink>
          </>
        }
        head={<Cols names={['FY month', 'calendar month', 'n', '%', 'central', 'state', 'note']} />}
        download={{
          filename: csvName('fymonth', p),
          comments: csvComments(core, p, t.definition, t.n, params),
          columns: ['fy_month', 'calendar_month', 'n', 'pct', 'central', 'state', 'note'],
          rows: () =>
            t.aocByFinancialYearMonth.map((m) => [
              String(m.fyMonth), MONTHS[m.calendarMonth - 1], String(m.n), String(m.pct), String(m.byPortal.central), String(m.byPortal.state),
              m.calendarMonth === 3 ? 'see the financial-year reading' : '',
            ]),
        }}
      >
        {t.aocByFinancialYearMonth.map((m) => (
          <tr key={m.fyMonth}>
            <th scope="row">{m.fyMonth}</th>
            <td>{MONTHS[m.calendarMonth - 1]}</td>
            <td className="font-mono tabular-nums">{fmt(m.n)}</td>
            <td className="font-mono tabular-nums">{m.pct}%</td>
            <td className="font-mono tabular-nums">{fmt(m.byPortal.central)}</td>
            <td className="font-mono tabular-nums">{fmt(m.byPortal.state)}</td>
            <td>{m.calendarMonth === 3 ? 'see the financial-year reading' : ''}</td>
          </tr>
        ))}
      </Twin>
      <p id="cppp-timing-reading" data-innocent className={`${FINDINGS} max-w-[72ch]`}>
        {t.innocentReading}
      </p>
    </Sub>
  );
}
