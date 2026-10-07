import { useEffect, useState, type ReactNode } from 'react';
import type { GEdge } from '../../graph/schema';
import type { SecurityFile } from '../../data/cppp';
import { FAMILY_COLOR } from '../viz/ForceGraph';
import {
  type VendorClass, EMPTY, NOTHING, CONTROL_EMPTY, SLICE_ABSENT, NO_RESPONSE, NO_PAIRING, RUN, ASOF, EDGES, VOIDS, FOOTPRINT, IDENTITY, MOD,
  AWARDS, PRICED, UNPRICED, ALLEGED_AWARDS, AWARD_SPAN, VENDORS, CLASS_WORDS, vendorClass, vendorsOf, comparatorEdges, comparatorsOf, awardsOf,
  CASES, CASE_PAIRS, UNPAIRED, caseFile, firstRecord, recordKind, responsesTo, responseChain, BONDS, BOND_DONORS, bondsOf, BOARD_PAIRS, ROLE_EDGES, RULES,
  gapMonths, sliceFigures, WORKS_CLASS_WORDS, officeOn, labelOf, nodeOf, symmetryOf, fileOf, finite, fmtCr, yearOf, dateInFy, edgePass, fyLabel, stateName, ANALYTIC, DOMAIN,
  fmtInt, lensPopulation, last, responseHeadWords, JOINT_AWARDS, BOND_AND_AWARD_VENDORS, countWord,
} from '../../data/securityView';
import {
  usePage, QBlock, Caption, Twin, TwinTable, Exports, captionText, Src, Quote, Tx, TierWord, Denominator, NoMatch, FOCUS, TARGET, SkipLink, goTo, reveal, type Row, type Col,
} from './ui';
import { BaseRateSection, CompareTwin, C5_TEXT, Responses, ResponseHead, Narratives, CannotShow, Fold, zeroCount } from './Shared';

/**
 * The Procurement and people lens (§5.3). Its spine is the symmetry chapters: each
 * chapter opens with the research's own account of running the same lens on the other
 * side, then draws. A vendor is never shown without the vendors it competes with, and a
 * case never without the case recorded as its control.
 */

const HUE: Record<VendorClass, string> = { public: FAMILY_COLOR.state, private: FAMILY_COLOR.capital, unclassified: 'none' };
const DASH: Record<string, string | undefined> = { documented: undefined, reported: '6 3', alleged: '2 4', analytic: '8 3 2 3' };
const shareOf = (lab: string | null | undefined) => (lab ?? '').match(/\d+(\.\d+)?%/)?.[0] ?? 'share not stated';
const src = (e: GEdge) => (e.srcs ?? []).map(([, u]) => u).join(' ');

export function ProcurementLens({ slice }: { slice: SecurityFile | null | undefined }) {
  const { f } = usePage();
  const pop = lensPopulation(f);
  return (
    <>
      <QBlock q="P0" title="Q0 — The same lens on the other side"><Contents slice={slice} /></QBlock>
      <QBlock q="P1" title="Q1 — Who was awarded, to which class of vendor, when, and beside whom?"><NoMatch k={pop.k} n={pop.n} /><Chapter1 /></QBlock>
      <QBlock q="P2" title="Q2 — Who bought on the open market, and how many bid?"><Chapter2 slice={slice} /></QBlock>
      <QBlock q="P3" title="Q3 — Who sits on both sides of the money?"><Chapter3 /></QBlock>
      <QBlock q="P4" title="Q4 — What did courts and auditors record?"><Chapter4 /></QBlock>
      <Narratives lens="procurement" q="P5" n={5} />
      <CannotShow lens="procurement" q="P6" n={6} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Q0 — contents: four chapters, each with its control stated
// ---------------------------------------------------------------------------

function Contents({ slice }: { slice: SecurityFile | null | undefined }) {
  const pub = vendorsOf('public').length, priv = vendorsOf('private').length;
  const pairs = new Set(VENDORS.flatMap((v) => comparatorEdges(v).map((e) => e.id))).size;
  // The chapter-4 link lands on the first pair's button; focus scrolls it into view, so the
  // reader never holds focus on a control below the fold (A11Y-006 M3).
  const go = (id: string, focusSel?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
    const t = focusSel ? document.querySelector<HTMLElement>(focusSel) : document.getElementById(id);
    if (!t) return;
    t.focus({ preventScroll: true });
    if (focusSel) reveal(t);
  };
  const link = (to: string, text: string, sel?: string) => <a href={`#${to}`} onClick={go(to, sel)} className={`underline underline-offset-2 hover:text-accent ${FOCUS}`}>{text}</a>;
  return (
    <>
      {EMPTY && <p data-page-copy="" className="text-[14px]">{NOTHING}</p>}
      <ol data-page-copy="" className="list-decimal pl-5 m-0 space-y-0.5 sm:space-y-1 leading-snug text-[14px] text-text-secondary">
        <li>{link('sec-P1-h', `Vendors — ${pub} public-sector vendors beside ${priv} private, JV or foreign vendors; ${pairs} declared head-to-head comparisons`)}</li>
        <li>{link('sec-P2-h', `Open market — ${slice ? `${slice.rates.byClass.length} buyer classes` : 'the buyer classes'}, each beside the whole tender file`)}</li>
        <li>{link('sec-P3-h', 'Both sides of the money — bonds to every party a donor bought for; board roles beside the rule')}</li>
        <li>{link('sec-P4-h', `Cases, chapter 4 — ${CASE_PAIRS.length} control pairs, ${UNPAIRED.length} case(s) without one`, '[data-pair] h4 button')}</li>
      </ol>
    </>
  );
}

/** A chapter's opening block: the research's symmetry text verbatim, before any table or graphic. */
function ChapterHead({ domain }: { domain: string }) {
  const { narrow } = usePage();
  const sym = symmetryOf(domain);
  const head = `The same lens, run on the other side — ${domain} research file`;
  const text = sym ? <Quote as="p" className="text-[14px] text-text-secondary mt-1 mb-0">{sym}</Quote> : <p className="text-[14px] text-amber mt-1 mb-0">{CONTROL_EMPTY}</p>;
  const h = <h4 tabIndex={-1} className={`text-[14px] font-semibold text-text m-0 ${TARGET} ${narrow ? 'inline' : ''}`}>{head}</h4>;
  // Below 640px a chapter's symmetry text sits behind its own heading, first in the chapter;
  // the cases chapter keeps its text open, because its control pairs are read against it (AC-152).
  if (narrow && sym && domain !== 'literature') return <details className="border border-border-light rounded px-3 my-2"><summary className={`cursor-pointer py-2 ${FOCUS}`}>{h}</summary>{text}</details>;
  return <div className="border border-border-light rounded p-3 my-2">{h}{text}</div>;
}

// ---------------------------------------------------------------------------
// Chapter 1 — awards by class, and the vendor grid
// ---------------------------------------------------------------------------

function Chapter1() {
  const { f, narrow } = usePage();
  if (EMPTY) return <><p data-page-copy="" className="text-[14px]">{NOTHING}</p><ChapterHead domain="procurement-industry" /><VendorGrid /></>;
  const aon = VOIDS.find((v) => /^DAC Acceptance-of-Necessity/.test(v.what)) ?? null;
  return (
    <>
      <ChapterHead domain="procurement-industry" />
      <AwardsByClass />
      <div className="border border-border rounded p-3 my-3 text-[14px] text-text-secondary">
        <h4 className="text-[14px] font-semibold text-text m-0 mb-1">What the Defence Acquisition Council approvals show, and what they cannot</h4>
        <Fold on={narrow} summary="The approvals void, in the research's words">
          {aon ? <><Quote as="p" className="m-0">{aon.what}</Quote>{aon.whyItMatters && <Quote as="p" className="m-0 mt-1">{aon.whyItMatters}</Quote>}<Src srcs={aon.srcs} of="the approvals void" inline /></> : <p className="m-0">No void on the Council&apos;s approvals is recorded in this register.</p>}
        </Fold>
      </div>
      <div aria-describedby="sec-c5-procurement"><BaseRateSection domain="procurement-industry" /></div>
      <Caption id="sec-c5-procurement" cap="C5">{C5_TEXT}</Caption>
      <VendorGrid />
      <Caption id="sec-c13" cap="C13">{`Each mark is one contract the Ministry of Defence named with a vendor in a press release, placed by the year signed and the value stated; ${PRICED.length} of ${AWARDS.length} state a value, and the rest are counted beneath the axis and never drawn as zero. This is a sample of what was announced, not every contract signed, so no column is summed and no share is computed here; the research's own shares by class, over its sample, are printed beside the chart with their denominators. Approvals by the Defence Acquisition Council name no vendor and no price, so they cannot be drawn by vendor; the card beside the chart says what they show. Vendor class is read from the actor family — public sector, or private, joint venture and foreign together — until the register declares each vendor's class.`}</Caption>
      <Caption id="sec-c15" cap="C15">Every vendor carries the same fields. A field that is empty says so; empty does not mean searched and found nothing unless a void says so, and the voids are printed beside the field. A private vendor is never shown without the public-sector vendors beside it. Named awards are a sample of the Ministry&apos;s releases, not its order book; the research&apos;s own comparison of values by class is quoted above this chapter, and this page computes no share of awards by vendor or class.</Caption>
      <AwardsTwin />
      <VendorTwin />
      <CompareTwin domains={['procurement-industry', 'money-people', 'literature']} title="Base rates in the procurement chapters" />
      <span className="sr-only">{`${f.tiers.size} tiers shown`}</span>
    </>
  );
}

/** One mark per named contract at (year, ₹ on a log scale); unpriced contracts counted beneath the axis. */
function AwardsByClass() {
  const { f, narrow } = usePage();
  const [start, setStart] = useState(() => Math.max(0, AWARD_SPAN.length - 12));
  const years = narrow ? AWARD_SPAN.slice(start, start + 12) : AWARD_SPAN;
  const shown = AWARDS.filter((e) => edgePass(f, e) && dateInFy(f, e.from));
  const priced = shown.filter((e) => finite(e.a) && years.includes(yearOf(e.from) ?? -1));
  const unpriced = shown.filter((e) => !finite(e.a) && years.includes(yearOf(e.from) ?? -1));
  const vals = PRICED.map((e) => e.a as number);
  const lo = Math.max(0.1, Math.min(...vals, 1)), hi = Math.max(...vals, 10);
  const W = 640, H = 220, L = 56, R = 10, T = 10, B = 26;
  const colW = (W - L - R) / Math.max(1, years.length);
  // Class reads three ways, so greyscale and forced colours keep it (A11Y-006 M5): the family hue,
  // the half of the year's column (public left, private right, each mark kept inside its half),
  // and the shape (a circle public sector, a diamond private, JV or foreign).
  const x = (y: number, cls: VendorClass) => L + years.indexOf(y) * colW + (cls === 'public' ? colW * 0.25 : colW * 0.75);
  const jit = Math.min(3, colW * 0.08);
  const ly = (v: number) => T + (1 - (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (H - T - B);
  const pubAwards = AWARDS.filter((e) => vendorClass(e.t) === 'public').length;
  const privAwards = AWARDS.filter((e) => vendorClass(e.t) === 'private').length;
  const byYear = new Map<number, GEdge[]>();
  for (const e of unpriced) { const y = yearOf(e.from)!; if (!byYear.has(y)) byYear.set(y, []); byYear.get(y)!.push(e); }
  const ticks = [1, 10, 100, 1000, 10000, 100000].filter((t) => t >= lo && t <= hi);
  const k = new Map<string, number>();
  return (
    <>
    <SkipLink twin="awards" title="Named contracts by year and value" />
    <figure className="m-0 my-3 min-w-0" aria-describedby="sec-c13">
      <h4 className="text-[14px] font-semibold text-text m-0 mb-1">Named contracts by year and value, by class of vendor</h4>
      <svg aria-hidden="true" viewBox={`0 0 ${W} ${H + 40}`} className="block w-full h-auto">
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={ly(t)} y2={ly(t)} stroke="var(--color-border)" strokeWidth="0.6" /><text x={L - 4} y={ly(t) + 4} fontSize="12" textAnchor="end" fill="var(--color-text-muted)">{fmtInt(t)}</text></g>)}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--color-border-light)" />
        {years.map((y, i) => (i === 0 || i === years.length - 1 || y % 5 === 0) && <text key={y} x={L + i * colW + colW / 2} y={H - B + 14} fontSize="12" textAnchor="middle" fill="var(--color-text-muted)">{y}</text>)}
        {priced.map((e) => {
          const c = vendorClass(e.t);
          const y = yearOf(e.from)!;
          const n = (k.get(`${y}${c}`) ?? 0); k.set(`${y}${c}`, n + 1);
          const cx = x(y, c) + (n % 3 - 1) * jit, cy = ly(e.a as number);
          const common = { 'data-mark': 'award', 'data-cr': e.a as number, fill: HUE[c], stroke: 'var(--color-text)', strokeWidth: 1, strokeDasharray: DASH[e.tier] };
          return c === 'public'
            ? <circle key={e.id} {...common} cx={cx} cy={cy} r="4.5" />
            : <path key={e.id} {...common} d={`M${cx} ${cy - 5.6}L${cx + 5.6} ${cy}L${cx} ${cy + 5.6}L${cx - 5.6} ${cy}Z`} />;
        })}
        {[...byYear].map(([y, es]) => es.map((e, i) => {
          const c = vendorClass(e.t);
          return <rect key={e.id} data-mark="award-unpriced" x={L + years.indexOf(y) * colW + 3 + (i % 3) * 11} y={H + 2 + Math.floor(i / 3) * 11} width="9" height="9" fill="none" stroke={c === 'unclassified' ? 'var(--color-text-secondary)' : HUE[c]} strokeWidth="1.6" strokeDasharray={DASH[e.tier]} />;
        }))}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[12px] text-text-muted mt-1">
        {[...byYear].sort((a, b) => a[0] - b[0]).map(([y, es]) => <span key={y}><span>{`${es.length} contract${es.length === 1 ? '' : 's'} named without ₹`}</span>{` in ${y}`}</span>)}
      </div>
      {narrow && (
        <div className="flex items-center justify-between mt-1">
          <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => setStart(Math.max(0, start - 6))}>‹ earlier</button>
          <button type="button" className={`px-2 underline text-[13px] ${FOCUS}`} onClick={() => setStart(0)}>earliest</button>
          <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => setStart(Math.min(Math.max(0, AWARD_SPAN.length - 12), start + 6))}>later ›</button>
        </div>
      )}
      {narrow && <p className="font-mono text-[12px] text-text-muted my-1">{`showing ${years[0]}–${last(years)} of ${AWARD_SPAN[0]}–${last(AWARD_SPAN)}`}</p>}
      <figcaption data-page-copy="" className="font-mono text-[12px] text-text-muted mt-1">{`${PRICED.length} contracts with ₹ · ${UNPRICED.length} without · ${pubAwards} public sector, ${privAwards} private, JV or foreign · a sample of PIB releases, not every contract signed; no share is computed here${narrow ? ' · circle, left of each year: public sector; diamond, right: private, JV or foreign' : ` · ₹ crore on a log scale, ${AWARD_SPAN[0]}–${last(AWARD_SPAN)} · class: a blue circle in the left half of each year is public sector, a gold diamond in the right half private, JV or foreign; outline dash: evidence tier; a hollow square is a contract named without ₹`}`}</figcaption>
    </figure>
    </>
  );
}

function AwardsTwin() {
  const { f, filterWords, openRecord } = usePage();
  const shown = AWARDS.filter((e) => edgePass(f, e) && dateInFy(f, e.from));
  const seen = new Map<string, number>();
  const rows: Row[] = shown.map((e) => {
    const base = `Open record: ${labelOf(e.t)}, ${e.from ?? 'undated'}`;
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    const name = n > 1 ? `${base} (${n})` : base;
    const resp = responsesTo(e.id);
    return {
      cells: [e.from ?? 'undated', labelOf(e.t), CLASS_WORDS[vendorClass(e.t)], <Quote declared={[e.a]}>{e.lab}</Quote>,
        finite(e.a) ? <span data-cr={e.a}>{`₹${fmtCr(e.a)} cr — amount as the release states it; no denominator published for this line; previous year not applicable`}</span> : 'amount not stated',
        JOINT_AWARDS.includes(e) ? `joint total ₹${fmtCr(e.a as number)} cr announced for ${VENDORS.filter((v) => `${e.lab ?? ''} ${e.d ?? ''}`.includes(labelOf(v))).map(labelOf).join(' and ')}; not split` : 'not a joint total', <TierWord tier={e.tier} />, resp.length ? resp.map((r) => `${responseHeadWords(r)} ${r.lab ?? ''}`).join(' · ') : NO_RESPONSE, <Src srcs={e.srcs} of={`${labelOf(e.t)} ${e.from ?? ''}`} inline declared={[e.a]} record={e} />,
        <button type="button" className={`underline underline-offset-2 text-left ${FOCUS}`} onClick={(ev) => openRecord(e.id!, ev.currentTarget)}>{name}</button>],
      out: [e.from ?? '', labelOf(e.t), CLASS_WORDS[vendorClass(e.t)], e.lab ?? '', finite(e.a) ? e.a : '', e.tier, resp.length ? 'response recorded' : NO_RESPONSE, src(e)],
    };
  });
  const lo = f.fyFrom ? Number(f.fyFrom.slice(0, 4)) : -Infinity, hi = f.fyTo ? Number(f.fyTo.slice(0, 4)) + 1 : Infinity;
  const empties = AWARD_SPAN.filter((y) => !AWARDS.some((e) => yearOf(e.from) === y) && y >= lo && y <= hi);
  for (const y of empties) rows.push({ cells: [String(y), `no named contract in ${y}`, 'not applicable', 'not applicable', 'not applicable', 'not applicable', 'not applicable', 'not applicable', 'not applicable', 'not applicable'], out: [String(y), `no named contract in ${y}`, '', '', '', '', '', ''] });
  const cols: Col[] = [{ key: 'd', label: 'Date', th: true }, { key: 'v', label: 'Vendor' }, { key: 'c', label: 'class (from the actor family)' }, { key: 'i', label: 'Item as recorded' }, { key: 'cr', label: '₹ cr' }, { key: 'j', label: 'Joint total' }, { key: 't', label: 'Tier' }, { key: 'r', label: 'response' }, { key: 's', label: 'Sources' }, { key: 'o', label: 'Open' }];
  return (
    <Twin twin="awards" title="Named contracts by year and value" rowCount={rows.length}>
      {() => (
        <>
          <Exports name="Named contracts" twin="awards" meta={{ table: 'Named contracts', population: `${AWARDS.length} contracts the Ministry of Defence named`, rows: rows.length, amounts: 'as each release states it' }}
            header={['date', 'vendor', 'class', 'item', 'value_cr', 'tier', 'response', 'source_urls']} rows={() => rows.map((r) => r.out!)} />
          <TwinTable caption={captionText(rows.length, 'named contracts, one per row, and the years with none', filterWords)} cols={cols} rows={rows} minWidth="80rem" />
        </>
      )}
    </Twin>
  );
}

// ---- the vendor grid

const FIELDS: [string, string][] = [
  ['1', 'Class'], ['2', 'Listing and identity'], ['3', 'Recorded owner'], ['3b', 'Recorded holdings'], ['4', 'Named awards'], ['5', 'Installations'],
  ['6', 'Declared comparison'], ['7', 'Electoral bonds'], ['8', 'Retired officers on the board'], ['9', 'Court, audit and investigation records'],
  ['10', 'Role in the record'], ['11', 'Stories told about vendors'], ['12', 'Sources'],
];
const bondVoid = VOIDS.find((v) => v.domain === 'money-people' && /electoral-bond|bond/i.test(v.what)) ?? null;

function vendorFields(v: string, scope: string, page: ReturnType<typeof usePage>): ReactNode[] {
  const { f, openVendor } = page;
  const cls = vendorClass(v);
  const id = IDENTITY[v];
  const owners = EDGES.filter((e) => e.pred === 'own' && e.t === v);
  const holds = EDGES.filter((e) => e.pred === 'own' && e.s === v);
  const aw = awardsOf(v);
  const inRange = aw.filter((e) => dateInFy(f, e.from));
  const priced = aw.filter((e) => finite(e.a));
  const alleged = ALLEGED_AWARDS.filter((e) => e.t === v);
  const fys = aw.map((e) => yearOf(e.from)).filter((y): y is number => y != null).sort((a, b) => a - b);
  const inst = FOOTPRINT.filter((r) => r.body === v);
  const comps = comparatorEdges(v);
  const bonds = EDGES.filter((e) => e.pred === 'bond' && (e.s === v || owners.some((o) => o.s === e.s)));
  const boards = ROLE_EDGES.filter((e) => e.t === v && BOARD_PAIRS.includes(e.s));
  const enforce = EDGES.filter((e) => e.pred === 'enforce' && e.t === v);
  const nodeSrcs = (nodeOf(v)?.srcs ?? []) as [string, string][];
  const other = cls === 'public' ? 'private, JV or foreign' : 'public sector';
  return [
    <><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle border border-border-light" style={{ background: cls === 'unclassified' ? 'transparent' : HUE[cls] }} aria-hidden="true" />{`${CLASS_WORDS[cls]} — vendor class is not a field (S5); read from the actor family`}</>,
    id ? [id.identity?.nse ? `NSE ${id.identity.nse}` : null, id.identity?.cin ? `CIN ${id.identity.cin}` : null].filter(Boolean).join(' · ') || 'not recorded' : 'not recorded',
    owners.length ? owners.map((o) => `${labelOf(o.s)} (${shareOf(o.lab)}, ${o.tier})`).join('; ') : 'no owner recorded',
    holds.length ? <>{holds.map((h) => {
      const k = awardsOf(h.t).length;
      return <span key={h.id} className="block">{`${labelOf(h.t)} (${shareOf(h.lab)}, ${h.tier})${VENDORS.includes(h.t) ? `: ${k} named award(s) — listed, not added to this vendor` : ': not a vendor in this register'}`}</span>;
    })}</> : 'no holding recorded',
    <>{aw.length ? `${f.fyFrom ? `${inRange.length} of ${aw.length} awards in FY${f.fyFrom}–FY${f.fyTo}` : aw.length} (${priced.length} with ₹), ${fys[0]}–${last(fys)}` : '0 — none named in the Ministry releases the research read'}
      {alleged.map((e) => <span key={e.id} className="block">{'alleged, not counted: '}<Quote>{e.lab}</Quote>{' — see Contested'}</span>)}</>,
    inst.length ? `${inst.length} in ${[...new Set(inst.map((r) => stateName(r.st)))].join(', ')}` : 'none recorded',
    comps.length ? <>{comps.map((e) => {
      const c = e.s === v ? e.t : e.s;
      return (
        <span key={e.id} className="block">
          <button type="button" aria-label={`${labelOf(c)}, compared with ${labelOf(v)} — open both`} className={`underline underline-offset-2 ${FOCUS}`} onClick={(ev) => openVendor(c, ev.currentTarget)}>{labelOf(c)}</button>
          {': '}<Quote>{e.lab}</Quote>
          {e.innocentReading && <span className="block"><Tx>the reading in which nothing is wrong: </Tx><Quote>{e.innocentReading}</Quote></span>}
        </span>
      );
    })}</> : `no head-to-head declared — compared with the ${other} band`,
    bonds.length ? <>{bonds.map((b) => <span key={b.id} className="block" data-cr={finite(b.a) ? b.a : undefined}>{`${labelOf(b.s)} → ${labelOf(b.t)}: ${finite(b.a) ? `₹${fmtCr(b.a)} cr — as the disclosure lists it; no denominator published for this line; previous year not applicable` : 'amount not stated'}, ${b.from ?? 'undated'}${b.to ? `–${b.to}` : ''} (${b.tier})`}</span>)}</>
      : <>{'no bond recorded in this register'}{bondVoid && <span className="block"><Tx>{' — '}</Tx><Quote>{bondVoid.what}</Quote></span>}</>,
    boards.length ? boards.map((b) => `${labelOf(b.s)}: ${b.lab ?? 'role'} (${b.from ?? 'start not recorded'})`).join('; ') : 'no board role recorded',
    enforce.length || alleged.length ? <>{enforce.map((e) => <span key={e.id} className="block">{`${labelOf(e.s)}, ${e.from ?? 'undated'} [${e.tier}]: `}<Quote>{e.lab}</Quote></span>)}{alleged.map((e) => <span key={e.id} className="block">{`alleged [${e.tier}]: `}<Quote>{e.lab}</Quote></span>)}</> : 'none recorded',
    id?.publicRole ? <Quote>{id.publicRole}</Quote> : 'not recorded',
    <a href="#sec-P5-h" aria-label={`rated in Q5: the stories about ${labelOf(v)} (${scope})`} onClick={(e) => { e.preventDefault(); goTo('sec-P5-h'); }} className={`underline underline-offset-2 ${FOCUS}`}>rated in Q5</a>,
    <Src srcs={[...nodeSrcs, ...aw.flatMap((e) => e.srcs ?? [])].filter((s, i, a) => a.findIndex((x) => x[1] === s[1]) === i)} of={`${labelOf(v)} (${scope})`} inline />,
  ];
}
/** The thirteen field rows, identical on every card and in the margin (§5.3.1). */
export function VendorFieldsDl({ v, scope }: { v: string; scope: string }) {
  const page = usePage();
  const cells = vendorFields(v, scope, page);
  return (
    <dl className="m-0 text-[13.5px] text-text-secondary">
      {FIELDS.map(([n, t], i) => [
        <dt key={`t${n}`} data-field={n} className="font-mono text-[12px] text-text-muted mt-1.5">{t}</dt>,
        <dd key={`d${n}`} className="m-0 min-w-0 break-words">{cells[i]}</dd>,
      ])}
    </dl>
  );
}

function VendorCardInGrid({ v }: { v: string }) {
  const { f, narrow, openVendor, inlinePanel, patch, announce } = usePage();
  const current = f.vendor === v;
  const comps = f.vendor ? comparatorsOf(f.vendor) : [];
  const open = current || comps.includes(v);
  const aw = awardsOf(v);
  const head = (
    <h4 className="text-[14px] font-semibold text-text m-0">
      <button type="button" aria-pressed={current} className={`text-left underline underline-offset-2 decoration-border-light ${FOCUS}`}
        onClick={(e) => { if (current) { patch({ vendor: null }); announce(`${labelOf(v)} closed`, 0); } else openVendor(v, e.currentTarget); }}>{labelOf(v)}</button>
    </h4>
  );
  const cls = `border rounded min-w-0 ${current ? 'border-accent' : 'border-border'}`;
  if (!narrow) {
    return (
      <article data-vendor-card={v} aria-current={current ? 'true' : undefined} className={`${cls} p-2.5`}>
        {head}
        {current && <span className="sr-only">selected vendor</span>}
        <VendorFieldsDl v={v} scope="grid" />
      </article>
    );
  }
  // Below 640px each card folds behind one summary line that carries its name as the card's heading,
  // so a folded band still reads as a list of names; opening it shows the thirteen fields and the verb.
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => { if (current) { patch({ vendor: null }); announce(`${labelOf(v)} closed`, 0); } else openVendor(v, e.currentTarget); };
  return (
    <>
      <details data-vendor-card={v} aria-current={current ? 'true' : undefined} open={open} className={`${cls} px-2 py-0.5`}>
        <summary className={`cursor-pointer text-[12.5px] leading-tight truncate ${FOCUS}`}>
          <h4 className="inline text-[13.5px] font-semibold text-text m-0">{labelOf(v)}</h4>{` · ${CLASS_WORDS[vendorClass(v)]} · ${aw.length} named awards (${aw.filter((e) => finite(e.a)).length} with ₹) · 13 fields`}
        </summary>
        {current && <span className="sr-only">selected vendor</span>}
        <button type="button" aria-pressed={current} className={`underline underline-offset-2 text-[13px] my-1 min-h-[44px] ${FOCUS}`} onClick={toggle}>
          {current ? `Close ${labelOf(v)}` : `Open ${labelOf(v)} beside its comparators`}
        </button>
        <VendorFieldsDl v={v} scope="grid" />
      </details>
      {current && inlinePanel('P1')}
    </>
  );
}

function VendorGrid() {
  const { narrow } = usePage();
  const bands: VendorClass[] = ['public', 'private', 'unclassified'];
  return (
    <div className="mt-4" aria-describedby="sec-c15">
      <p className="text-[13px] my-1">
        <a href="#sec-P2-h" className={`underline underline-offset-2 text-text-muted ${FOCUS}`} onClick={(e) => { e.preventDefault(); const h = document.querySelector<HTMLElement>('[data-q="P2"] h4'); h?.focus(); h?.scrollIntoView({ block: 'start' }); }}>{`Skip the ${VENDORS.length} vendor cards to chapter 2`}</a>
      </p>
      {bands.map((b) => {
        const vs = vendorsOf(b);
        if (b === 'unclassified' && !vs.length) return null;
        return (
          <section key={b} aria-labelledby={`sec-band-${b}`} className={narrow ? 'mt-2' : 'mt-3'}>
            <h4 id={`sec-band-${b}`} className="text-[14px] font-semibold text-text m-0 mb-1">{`${CLASS_WORDS[b]}${b === 'unclassified' ? ': listed by name beneath the two bands' : ''} (${vs.length} vendors)`}</h4>
            {!vs.length && <p className="text-[14px] text-text-secondary">No vendor of this class in the register.</p>}
            <div className={`grid sm:grid-cols-2 2xl:grid-cols-3 ${narrow ? 'gap-0.5' : 'gap-1 sm:gap-2'}`}>{vs.map((v) => <VendorCardInGrid key={v} v={v} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

function VendorTwin() {
  const { filterWords } = usePage();
  const rows: Row[] = VENDORS.map((v) => {
    const aw = awardsOf(v);
    return {
      cells: [labelOf(v), CLASS_WORDS[vendorClass(v)], aw.length ? `${aw.length} (${aw.filter((e) => finite(e.a)).length} with ₹)` : 'none named', comparatorsOf(v).map(labelOf).join(', ') || 'no head-to-head declared', EDGES.some((e) => e.pred === 'bond' && e.s === v) ? 'bond recorded' : 'no bond recorded in this register', IDENTITY[v]?.publicRole ?? 'not recorded'],
      out: [v, labelOf(v), CLASS_WORDS[vendorClass(v)], aw.length, aw.filter((e) => finite(e.a)).length, comparatorsOf(v).join(' '), IDENTITY[v]?.publicRole ?? ''],
    };
  });
  return (
    <Twin twin="vendors" title="Every vendor, the same fields" rowCount={rows.length}>
      {() => (
        <>
          <Exports name="Vendors and their fields" twin="vendors" meta={{ table: 'Vendors and their fields', population: `${VENDORS.length} vendors`, rows: rows.length }} header={['id', 'vendor', 'class', 'named_awards', 'with_rupee', 'comparators', 'public_role']} rows={() => rows.map((r) => r.out!)} />
          <TwinTable caption={captionText(rows.length, 'every vendor in the register, alphabetical within its class', filterWords)} amounts={false} cols={[{ key: 'v', label: 'Vendor', th: true }, { key: 'c', label: 'Class' }, { key: 'a', label: 'Named awards' }, { key: 'k', label: 'Declared comparison' }, { key: 'b', label: 'Electoral bonds' }, { key: 'r', label: 'Role in the record' }]} rows={rows} />
        </>
      )}
    </Twin>
  );
}

// ---------------------------------------------------------------------------
// Chapter 2 — the open-market slice beside the whole tender file
// ---------------------------------------------------------------------------

function Chapter2({ slice }: { slice: SecurityFile | null | undefined }) {
  const { filterWords, narrow } = usePage();
  const [pick, setPick] = useState<string | null>(null);
  const head = (
    <h4 tabIndex={-1} className={`text-[14px] font-semibold text-text m-0 mb-1 ${TARGET}`}>The same lens, run on the other side — the open-market slice&apos;s own notes</h4>
  );
  if (slice === undefined) return <>{EMPTY && <p className="text-[14px]">{NOTHING}</p>}{head}<p className="text-[14px] text-text-secondary">Loading the open-market slice…</p></>;
  if (slice === null) return <>{EMPTY && <p className="text-[14px]">{NOTHING}</p>}{head}<p className="text-[14px] text-text-secondary">{SLICE_ABSENT}</p></>;
  const q = slice.quality, r = slice.rates;
  const sf = sliceFigures(slice);
  // Two works figures, each under its own label: the class (MES and BRO) and the one largest buyer.
  const worksShare = sf.worksClassPct;
  const worksClassWords = worksShare != null ? `${WORKS_CLASS_WORDS} is ${worksShare}% of the slice` : `${WORKS_CLASS_WORDS} has no quality row in the file`;
  const oneBuyerWords = sf.worksBuyer ? `one works buyer is ${sf.worksBuyer.pct}% of decisions (${sf.worksBuyer.member})` : 'no single works buyer in the file';
  const share = sf.classShare;
  const maxPct = Math.ceil(Math.max(...r.byClass.flatMap((c) => [c.wilson95?.[1] ?? c.singleBidderPct, c.wholeFile.singleBidderPct, c.wholeFileSamePortal?.singleBidderPct ?? 0])) / 10) * 10 || 10;
  const X = (p: number) => `${(p / maxPct) * 100}%`;
  const def = slice.classes.definitions;
  // A class-year the file cannot date reads as such, with the span of the years it can.
  const numericYears = r.byClassYear.map((y) => Number(y.year)).filter(Number.isFinite);
  const yearWords = (y: string | undefined) => (!y ? 'not stated' : /^\d{4}$/.test(y) ? y : `${y}: outside the ${Math.min(...numericYears)}–${Math.max(...numericYears)} years the file lists`);
  const twinRows: Row[] = [
    ...r.byClass.map((c) => {
      const qq = q.byClass.find((x) => x.class === c.class);
      const sh = share(c.class);
      return {
        cells: [c.class, def[c.class]?.definition ?? 'not stated', c.portal ? `${c.portal} portal` : 'not stated', 'all years', qq ? String(qq.rawRows) : 'not stated', qq ? String(qq.dedupRows) : 'not stated', sh == null ? 'not computed' : `${sh}% of slice decisions, computed here`, zeroCount(c.n), zeroCount(c.singleBidder), `${c.singleBidderPct}%`, c.wilson95 ? zeroCount(c.wilson95[0]) : 'not stated', c.wilson95 ? zeroCount(c.wilson95[1]) : 'not stated', c.wholeFileSamePortal ? `${c.wholeFileSamePortal.singleBidderPct}%` : 'not stated', `${c.wholeFile.singleBidderPct}%`, def[c.class]?.innocentReading ?? 'not stated'],
        out: [c.class, '', c.portal ?? '', qq?.rawRows ?? '', qq?.dedupRows ?? '', sh ?? '', c.n, c.singleBidder, c.singleBidderPct, c.wilson95?.[0] ?? '', c.wilson95?.[1] ?? '', c.wholeFileSamePortal?.singleBidderPct ?? '', c.wholeFile.singleBidderPct],
      };
    }),
    { cells: ['excluding the works class', r.excludingWorks.note, 'both', 'all years', 'not stated', 'not stated', 'reference row', zeroCount(r.excludingWorks.n), zeroCount(r.excludingWorks.singleBidder), `${r.excludingWorks.singleBidderPct}%`, r.excludingWorks.wilson95 ? zeroCount(r.excludingWorks.wilson95[0]) : 'not stated', r.excludingWorks.wilson95 ? zeroCount(r.excludingWorks.wilson95[1]) : 'not stated', 'not applicable', 'not applicable', 'a reference row, never a class mark'], out: ['excluding-works', '', '', '', '', '', r.excludingWorks.n, r.excludingWorks.singleBidder, r.excludingWorks.singleBidderPct, r.excludingWorks.wilson95?.[0] ?? '', r.excludingWorks.wilson95?.[1] ?? '', '', ''] },
    { cells: ['the slice as a whole', 'every class together', 'both', 'all years', String(q.total.rawRows), String(q.total.dedupRows), '100% of slice decisions', zeroCount(r.total.n), zeroCount(r.total.singleBidder), `${r.total.singleBidderPct}%`, r.total.wilson95 ? zeroCount(r.total.wilson95[0]) : 'not stated', r.total.wilson95 ? zeroCount(r.total.wilson95[1]) : 'not stated', 'not applicable', `${r.total.wholeFile.singleBidderPct}%`, 'a works rate: read by class'], out: ['slice', '', '', q.total.rawRows, q.total.dedupRows, 100, r.total.n, r.total.singleBidder, r.total.singleBidderPct, r.total.wilson95?.[0] ?? '', r.total.wilson95?.[1] ?? '', '', r.total.wholeFile.singleBidderPct] },
    ...r.byClassYear.map((y) => ({
      cells: [`${y.class} ${y.year}`, 'see the class row', y.portal ? `${y.portal} portal` : 'not stated', yearWords(y.year), 'not stated', 'not stated', 'not stated', zeroCount(y.n), zeroCount(y.singleBidder), y.n >= 10 ? `${y.singleBidderPct}%` : `n ${y.n}: no rate drawn`, y.n >= 10 && y.wilson95 ? zeroCount(y.wilson95[0]) : 'not drawn', y.n >= 10 && y.wilson95 ? zeroCount(y.wilson95[1]) : 'not drawn', y.wholeFileSamePortal ? `${y.wholeFileSamePortal.singleBidderPct}%` : 'not stated', `${y.wholeFile.singleBidderPct}%`, 'see the class row'],
      out: [y.class, y.year ?? '', y.portal ?? '', '', '', '', y.n, y.singleBidder, y.n >= 10 ? y.singleBidderPct : '', y.n >= 10 ? y.wilson95?.[0] ?? '' : '', y.n >= 10 ? y.wilson95?.[1] ?? '' : '', y.wholeFileSamePortal?.singleBidderPct ?? '', y.wholeFile.singleBidderPct],
    })),
  ];
  const tsvRows = () => [
    ...r.byClass.map((c) => { const qq = q.byClass.find((x) => x.class === c.class); return [c.class, '', c.portal ?? '', qq?.rawRows ?? '', qq?.dedupRows ?? '', share(c.class) ?? '', c.n, c.singleBidder, c.singleBidderPct, c.wilson95?.[0] ?? '', c.wilson95?.[1] ?? '', c.wholeFileSamePortal?.singleBidderPct ?? '', c.wholeFile.singleBidderPct]; }),
    ['excluding-works', '', '', '', '', '', r.excludingWorks.n, r.excludingWorks.singleBidder, r.excludingWorks.singleBidderPct, r.excludingWorks.wilson95?.[0] ?? '', r.excludingWorks.wilson95?.[1] ?? '', '', ''],
    ['slice', '', '', q.total.rawRows, q.total.dedupRows, 100, r.total.n, r.total.singleBidder, r.total.singleBidderPct, r.total.wilson95?.[0] ?? '', r.total.wilson95?.[1] ?? '', '', r.total.wholeFile.singleBidderPct],
    ...r.byClassYear.map((y) => [y.class, /^\d{4}$/.test(y.year ?? '') ? y.year : '', y.portal ?? '', '', '', '', y.n, y.singleBidder, y.n >= 10 ? y.singleBidderPct : '', y.n >= 10 ? y.wilson95?.[0] ?? '' : '', y.n >= 10 ? y.wilson95?.[1] ?? '' : '', y.wholeFileSamePortal?.singleBidderPct ?? '', y.wholeFile.singleBidderPct]),
  ];
  const sliceLines = `# open-market slice ${sf.hashes.join(',')} asOf ${sf.asOf ?? 'not stated'}\n# dedup rule: ${slice.quality.afterDedup?.rule ?? slice.provenance.dedupRule}`;
  return (
    <>
      {EMPTY && <p className="text-[14px]">{NOTHING}</p>}
      {/* §5.3.2: readMeFirst → caveat → Form A → Form B → the class definitions with their innocent readings. Never collapsed, at any width. */}
      <div className="border border-border-light rounded p-3 my-2">
        {head}
        <Quote as="p" className="text-[14px] text-text-secondary m-0">{slice.readMeFirst}</Quote>
        <Quote as="p" className="text-[14px] text-text-secondary mt-2 mb-0">{slice.caveat}</Quote>
      </div>
      <SkipLink twin="slice" title="The open-market slice by class and year" />
      <figure className="m-0 my-3 min-w-0" aria-describedby="sec-c14">
        <h4 className="text-[14px] font-semibold text-text m-0 mb-1">Each buyer class beside the whole tender file</h4>
        <div className="space-y-1.5">
          {r.byClass.map((c) => {
            const sh = share(c.class);
            const on = pick === c.class;
            const wil = c.wilson95 ? `Wilson 95% ${c.wilson95[0]}–${c.wilson95[1]}` : 'Wilson 95% not stated';
            const reading = def[c.class]?.innocentReading;
            return (
              <div key={c.class} data-class={c.class} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_minmax(0,16rem)] gap-x-2 items-center text-[13px]">
                <div className="min-w-0">
                  <button type="button" aria-pressed={on} aria-current={on ? 'true' : undefined} className={`underline underline-offset-2 text-left ${FOCUS}`} onClick={() => setPick(on ? null : c.class)}>{c.class === 'capf' ? 'capf (central armed police)' : c.class}</button>
                  <span className="block font-mono text-[12px] text-text-muted">{`${c.singleBidder} of ${c.n}`}</span>
                </div>
                <div aria-hidden="true" className="relative h-6 min-w-0">
                  {/* No quality row for the class: the share is absent, drawn as the no-data hatch, never as a 0% bar. */}
                  {sh == null ? <div className="absolute left-0 top-0 h-1.5 w-6 sec-hatch" /> : <div className="absolute left-0 top-0 h-1.5 bg-text-muted/40" style={{ width: `${sh}%` }} />}
                  <div className="absolute top-3 h-px bg-text-secondary" style={{ left: X(c.wilson95?.[0] ?? c.singleBidderPct), width: `calc(${X(c.wilson95?.[1] ?? c.singleBidderPct)} - ${X(c.wilson95?.[0] ?? c.singleBidderPct)})` }} />
                  <div className="absolute top-2 w-2 h-2 -ml-1 rounded-full bg-text" style={{ left: X(c.singleBidderPct) }} />
                  {c.wholeFileSamePortal && <div className="absolute top-1.5 h-3 w-px bg-text-secondary" style={{ left: X(c.wholeFileSamePortal.singleBidderPct) }} />}
                  <div className="absolute top-0 bottom-0 w-px bg-border-light" style={{ left: X(c.wholeFile.singleBidderPct) }} />
                </div>
                <div className="font-mono text-[12px] text-text-secondary col-span-2 sm:col-span-1">{narrow ? `${c.singleBidderPct}% (${wil}) · same portal ${c.wholeFileSamePortal?.singleBidderPct ?? 'not stated'}% · file ${c.wholeFile.singleBidderPct}%` : `${c.singleBidderPct}% single-bidder (${wil}) · ${sh == null ? 'share of slice decisions not computed: no quality row for the class' : `${sh}% of slice decisions, computed here`} · whole file, same portal ${c.wholeFileSamePortal?.singleBidderPct ?? 'not stated'}% · whole file ${c.wholeFile.singleBidderPct}%`}</div>
                {reading && <p className="col-span-2 sm:col-span-3 m-0 text-[13px] text-text-secondary"><Tx>the reading in which nothing is wrong: </Tx><Quote>{reading}</Quote></p>}
              </div>
            );
          })}
        </div>
        <div className="border-t border-border mt-2 pt-1 text-[13px] font-mono text-text-secondary space-y-0.5">
          <div>{`excluding the works class: ${r.excludingWorks.singleBidder} of ${r.excludingWorks.n}, ${r.excludingWorks.singleBidderPct}% — ${worksClassWords}`}</div>
          <div>{`the slice as a whole: ${r.total.singleBidder} of ${r.total.n}, ${r.total.singleBidderPct}% — a works rate, because ${worksClassWords}`}</div>
        </div>
        <h5 className="text-[13px] font-semibold text-text mt-3 mb-1">By year, each class beside the same-portal file that year</h5>
        <FormB slice={slice} pick={pick} />
        <figcaption data-page-copy="" className="font-mono text-[12px] text-text-muted mt-2">{`${q.total.dedupRows} award decisions after dedup (${q.afterDedup.shareOfFileDedupRowsPct}% of the file) · rate denominator ${r.total.n} with a bid count · slice-wide single bidding ${r.total.singleBidderPct}% against ${r.total.wholeFile.singleBidderPct}% for the file — read by class; ${worksClassWords}, and ${oneBuyerWords}`}</figcaption>
      </figure>
      <h5 className="text-[13px] font-semibold text-text mt-3 mb-1">{`The ${Object.keys(def).length} buyer classes defined, each with its innocent reading`}</h5>
      <ul className="list-none p-0 m-0 space-y-1 text-[13.5px] text-text-secondary">
        {Object.entries(def).map(([k, d]) => <li key={k}><span className="font-mono text-[12px] text-text">{`${k}: `}</span><Quote>{d.definition}</Quote>{d.innocentReading && <> — <Quote>{d.innocentReading}</Quote></>}</li>)}
      </ul>
      <Caption id="sec-c14" cap="C14">{`This is the slice of the central and state tender portals' award records whose buyer is a security body, not India's security procurement: capital acquisition runs on another portal, and GeM is not here. Single-bidder rate is the share of award decisions with exactly one bid, over decisions with a recorded bid count. ${worksShare != null ? `The works class (MES and BRO) alone is ${worksShare}% of the slice` : 'The works class (MES and BRO) has no quality row in the file'}, so the slice's overall rate is a works rate; read each class beside the whole file on its own portal. A low rate for works buyers reflects many local contractors; a high rate for laboratories or headquarters reflects specialised items. Every figure is dataset-only: the stored links had expired when the sample was checked. No winner is named here; the tender register names marked winners under its own rule.`}</Caption>
      <Twin twin="slice" title="The open-market slice by class and year" rowCount={twinRows.length}>
        {() => (
          <>
            <Exports name="Open-market slice by class and year" twin="slice" meta={{ table: 'Open-market slice by class and year', population: `${r.byClass.length} buyer classes, two reference rows and ${r.byClassYear.length} class-years`, rows: twinRows.length, slice: sliceLines }}
              header={['class', 'year', 'portal', 'raw_rows', 'dedup_rows', 'share_of_slice_pct', 'n', 'single', 'rate', 'low', 'high', 'whole_file_same_portal', 'whole_file']} rows={tsvRows} />
            <TwinTable caption={captionText(twinRows.length, 'buyer classes, two reference rows and class-years', filterWords)} amounts={false}
              cols={[{ key: 'c', label: 'class', th: true }, { key: 'd', label: 'definition' }, { key: 'p', label: 'portal' }, { key: 'y', label: 'year' }, { key: 'rr', label: 'raw rows' }, { key: 'dr', label: 'dedup rows' }, { key: 's', label: 'share of slice decisions' }, { key: 'n', label: 'n' }, { key: 'sb', label: 'single' }, { key: 'r', label: 'rate' }, { key: 'lo', label: 'Wilson low' }, { key: 'hi', label: 'high' }, { key: 'wsp', label: 'whole file same portal' }, { key: 'wf', label: 'whole file' }, { key: 'ir', label: 'innocent reading' }]}
              rows={twinRows} minWidth="90rem" />
          </>
        )}
      </Twin>
    </>
  );
}

/**
 * Form B (§5.3.2): per class, the single-bidder rate by year as a dot with its Wilson 95%
 * whisker, beside the same-portal whole-file rate that year as a short tick. Every class shares
 * one year axis (a year with no row for the class is left blank, never closed up) and one frozen
 * 0–max% scale, rounded up to the next 10% over every drawn class-year's whisker and tick. It is
 * not Form A's scale: class-year whiskers reach past the class rows' maximum, and a mark is never
 * clipped to a ceiling it exceeds. Both ends are labelled. A class-year with n < 10 draws nothing
 * and says so (D43).
 */
function FormB({ slice, pick }: { slice: SecurityFile; pick: string | null }) {
  const r = slice.rates;
  const maxPct = Math.ceil(Math.max(10, ...r.byClassYear.filter((y) => y.n >= 10).flatMap((y) => [y.wilson95?.[1] ?? y.singleBidderPct, y.singleBidderPct, y.wholeFileSamePortal?.singleBidderPct ?? 0])) / 10) * 10;
  const isYear = (y: string | undefined) => /^\d{4}$/.test(y ?? '');
  const years = [...new Set(r.byClassYear.map((y) => y.year).filter(isYear))].sort() as string[];
  const y0 = Number(years[0]), y1 = Number(last(years));
  // A year the file cannot place on the axis sits in the right gutter, never on a year it is not.
  const xPct = (y: string | undefined) => (!isYear(y) ? 99 : y1 > y0 ? ((Number(y) - y0) / (y1 - y0)) * 90 + 4 : 50);
  const yPct = (p: number) => (p / maxPct) * 88 + 4;
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {r.byClass.map((c) => {
        const ys = r.byClassYear.filter((y) => y.class === c.class);
        const drawn = ys.filter((y) => y.n >= 10);
        const small = ys.filter((y) => y.n < 10);
        const undatable = ys.filter((y) => y.n >= 10 && !isYear(y.year));
        return (
          <div key={c.class} className={`border rounded p-1.5 ${pick === c.class ? 'border-accent' : 'border-border'}`}>
            <p className="font-mono text-[12px] text-text-muted m-0">{c.class}</p>
            <div className="flex gap-1">
              <div aria-hidden="true" className="flex flex-col justify-between font-mono text-[12px] text-text-muted leading-none py-px"><span>{`${maxPct}%`}</span><span>0%</span></div>
              <div className="relative h-16 flex-1 min-w-0 border-l border-b border-border" aria-hidden="true">
                {drawn.map((y) => (
                  <div key={`${y.year}`} className="absolute top-0 bottom-0" style={{ left: `${xPct(y.year)}%` }}>
                    {y.wilson95 && <div className="absolute w-px -ml-px bg-text-secondary" style={{ bottom: `${yPct(y.wilson95[0])}%`, height: `${yPct(y.wilson95[1]) - yPct(y.wilson95[0])}%` }} />}
                    {y.wholeFileSamePortal && <div className="absolute h-px w-2.5 -ml-[5px] bg-text-muted" style={{ bottom: `${yPct(y.wholeFileSamePortal.singleBidderPct)}%` }} />}
                    <div data-rate={y.singleBidderPct} data-class={c.class} data-n={y.n} className="absolute w-1.5 h-1.5 -ml-[3px] -mb-[3px] rounded-full bg-text" style={{ bottom: `${yPct(y.singleBidderPct)}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div aria-hidden="true" className="flex justify-between font-mono text-[12px] text-text-muted pl-7"><span>{years[0]}</span><span>{last(years)}</span></div>
            <p className="font-mono text-[12px] text-text-muted m-0">{[
              `${drawn.length - undatable.length} years drawn, each a dot with its Wilson 95% whisker beside a short tick at the same-portal file that year`,
              ...small.map((y) => `${y.year}: n ${y.n}: no rate drawn`),
              ...undatable.map((y) => `${y.year ?? 'year not stated'}: outside the ${years[0]}–${last(years)} years the file lists, drawn in the right gutter`),
            ].join(' · ')}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chapter 3 — both sides of the money: bonds, board roles
// ---------------------------------------------------------------------------

function Chapter3() {
  const { f, filterWords, narrow } = usePage();
  if (EMPTY) return <><p data-page-copy="" className="text-[14px]">{NOTHING}</p><ChapterHead domain="money-people" /></>;
  const bondRows: Row[] = BOND_DONORS.flatMap((d) => bondsOf(d).filter((e) => edgePass(f, e)).map((e) => ({
    cells: [labelOf(d), labelOf(e.t), finite(e.a) ? <span data-cr={e.a}>{`₹${fmtCr(e.a)} cr — as the disclosure lists it; no denominator published for this line; previous year not applicable`}</span> : 'amount not stated', `${e.from ?? 'start not recorded'} – ${e.to ?? 'end not recorded'}`, <TierWord tier={e.tier} />, <Src srcs={e.srcs} of={`${labelOf(d)} to ${labelOf(e.t)}`} inline />],
    out: [labelOf(d), labelOf(e.t), finite(e.a) ? e.a : '', e.from ?? '', e.to ?? '', e.tier, src(e)],
  })));
  const bondCols: Col[] = [{ key: 'd', label: 'donor', th: true }, { key: 'p', label: 'Party, as recorded' }, { key: 'cr', label: '₹ cr as recorded' }, { key: 'w', label: 'Purchase window' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }];
  const boardRows: Row[] = BOARD_PAIRS.map((p) => {
    const roles = ROLE_EDGES.filter((e) => e.s === p);
    const office = roles.find((e) => ['ministry', 'agency'].includes(nodeOf(e.t)?.ty ?? '') || nodeOf(e.t)?.fam === 'state');
    const board = roles.find((e) => ['company', 'psu'].includes(nodeOf(e.t)?.ty ?? '') && e !== office);
    const gap = gapMonths(office?.to, board?.from);
    const m = gap.months;
    const rule = RULES[0];
    return {
      cells: [labelOf(p), office ? <><Quote>{office.lab}</Quote>{` (${office.from ?? 'start not recorded'} – ${office.to ?? 'end not recorded'})`}</> : 'no public office recorded',
        board ? <>{`${labelOf(board.t)}: `}<Quote>{board.lab}</Quote>{` (from ${board.from ?? 'not recorded'})`}</> : 'no board role recorded',
        m == null ? `not computable: ${gap.why}` : `${m} months, computed here from the dates the records give`,
        rule ? <Quote>{rule.lab}</Quote> : 'no rule recorded', <TierWord tier={board?.tier ?? office?.tier ?? 'documented'} />, <Src srcs={[...(office?.srcs ?? []), ...(board?.srcs ?? [])]} of={labelOf(p)} inline />],
      out: [labelOf(p), office?.lab ?? '', office?.from ?? '', office?.to ?? '', board ? labelOf(board.t) : '', board?.lab ?? '', board?.from ?? '', m ?? '', board?.tier ?? '', [...(office?.srcs ?? []), ...(board?.srcs ?? [])].map(([, u]) => u).join(' ')],
    };
  });
  const boardCols: Col[] = [{ key: 'p', label: 'Person', th: true }, { key: 'o', label: 'Public office' }, { key: 'b', label: 'Board' }, { key: 'm', label: 'Months between office end and board start' }, { key: 'r', label: 'The rule' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }];
  const control = ANALYTIC.find((e) => DOMAIN[e.id ?? ''] === 'money-people' && /retired/.test(e.t));
  const ruleVoids = VOIDS.filter((v) => v.domain === 'money-people' && /cooling-off|retired Defence Secretary/i.test(v.what));
  return (
    <>
      <ChapterHead domain="money-people" />
      <h4 className="text-[14px] font-semibold text-text mt-3 mb-1">Electoral bonds, each donor&apos;s purchases for every party together</h4>
      <Denominator>{`${BONDS.length} bond records · ${BOND_DONORS.length} donors · party is a text column; no fill, no sort by party`}</Denominator>
      <div aria-describedby="sec-c16"><Fold on={narrow} summary={`${bondRows.length} bond records from ${BOND_DONORS.length} donors, donors alphabetical`}><TwinTable caption={captionText(bondRows.length, 'bond records, donors alphabetical', filterWords)} cols={bondCols} rows={bondRows} /></Fold></div>
      {bondVoid && <Fold on={narrow} summary="Who bought no bond under their own name: the void, in the research's words"><p className="text-[14px] text-text-secondary"><Quote>{bondVoid.what}</Quote>{bondVoid.whyItMatters && <> — <Quote>{bondVoid.whyItMatters}</Quote></>}</p></Fold>}
      <h4 className="text-[14px] font-semibold text-text mt-4 mb-1">Board roles beside the rule</h4>
      <div aria-describedby="sec-c17"><Fold on={narrow} summary={`${boardRows.length} persons with a public office and a later board seat, beside the rule`}><TwinTable caption={captionText(boardRows.length, 'persons with a public office and a later board seat', filterWords)} amounts={false} cols={boardCols} rows={boardRows} /></Fold></div>
      <Fold on={narrow} summary="The rule's own voids, and the declared board control">
      <ul className="list-none p-0 m-0 mt-2 space-y-1.5 text-[14px] text-text-secondary">
        {ruleVoids.map((v, i) => <li key={i}><Quote>{v.what}</Quote></li>)}
        {control && <li><Quote>{control.lab}</Quote>{control.innocentReading && <span className="block"><Tx>the reading in which nothing is wrong: </Tx><Quote>{control.innocentReading}</Quote></span>}<Src srcs={control.srcs} of="the declared board control" inline /></li>}
      </ul>
      </Fold>
      <BaseRateSection domain="money-people" />
      <Caption id="sec-c16" cap="C16">A bond is a recorded purchase for a party; each donor&apos;s purchases for every party are shown together, as the Supreme Court-ordered disclosure lists them. Vendors not listed bought no bond under their own name in the disclosure the research read; that is recorded as a void, not as innocence or guilt. A purchase is not a payment for a contract: {`no order is joined to a bond except where a record dates both, and the register dates both a bond and a named award for ${countWord(BOND_AND_AWARD_VENDORS.length)} vendor${BOND_AND_AWARD_VENDORS.length === 1 ? '' : 's'}${BOND_AND_AWARD_VENDORS.length ? ` (${BOND_AND_AWARD_VENDORS.map(labelOf).join(', ')}), each in its own row and never joined here` : ''}. The base rates above give every party's share for comparison.`}</Caption>
      <Caption id="sec-c17" cap="C17">Persons appear only in public roles at the public rank. A board seat after the cooling-off period is lawful; the page prints the interval in months, computed only where both dates carry a month (otherwise the table says why), and the rule, not a judgement.</Caption>
      <Twin twin="bonds" title="Electoral bonds by donor" rowCount={bondRows.length}>
        {() => (
          <>
            <Exports name="Electoral bonds by donor" twin="bonds" meta={{ table: 'Electoral bonds by donor', population: `${BONDS.length} bond records`, rows: bondRows.length, amounts: 'as the disclosure lists them' }} header={['donor', 'party', 'amount_cr', 'from', 'to', 'tier', 'source_urls']} rows={() => bondRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(bondRows.length, 'bond records, donors alphabetical', filterWords)} cols={bondCols} rows={bondRows} />
          </>
        )}
      </Twin>
      <Twin twin="board" title="Board roles beside the rule" rowCount={boardRows.length}>
        {() => (
          <>
            <Exports name="Board roles" twin="board" meta={{ table: 'Board roles', population: `${BOARD_PAIRS.length} persons`, rows: boardRows.length }} header={['person', 'office', 'office_from', 'office_to', 'board', 'board_role', 'board_from', 'months_between', 'tier', 'source_urls']} rows={() => boardRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(boardRows.length, 'persons with a public office and a later board seat', filterWords)} amounts={false} cols={boardCols} rows={boardRows} />
          </>
        )}
      </Twin>
    </>
  );
}

// ---------------------------------------------------------------------------
// Chapter 4 — cases as records, each beside its control
// ---------------------------------------------------------------------------

const PAIR_ORDER = [...CASE_PAIRS.flatMap((p) => [p.a, p.b].sort((x, y) => (firstRecord(x) ?? '9999').localeCompare(firstRecord(y) ?? '9999'))), ...UNPAIRED];
/** Every response tick on a case-file record, once per response. */
function timelineMarks(f: ReturnType<typeof usePage>['f']) {
  const seen = new Set<string>();
  const marks: { c: string; e: GEdge; response: boolean; claim?: GEdge }[] = [];
  for (const c of PAIR_ORDER) {
    for (const e of caseFile(c).filter((x) => edgePass(f, x))) {
      marks.push({ c, e, response: false });
      for (const r of responsesTo(e.id)) if (!seen.has(r.id!)) { seen.add(r.id!); marks.push({ c, e: r, response: true, claim: e }); }
    }
  }
  return marks;
}

function Chapter4() {
  const { f, narrow, filterWords } = usePage();
  const [win, setWin] = useState(0);
  if (EMPTY || !CASES.length) return <><p data-page-copy="" className="text-[14px]">{NOTHING}</p><ChapterHead domain="literature" /><p className="text-[14px]">No case record in this register.</p></>;
  const marks = timelineMarks(f);
  const dates = marks.map((m) => m.e.from).filter((d): d is string => !!d).sort();
  const y0 = Number((dates[0] ?? ASOF).slice(0, 4)), y1 = Number(ASOF.slice(0, 4));
  const span = narrow ? 12 : y1 - y0 + 1;
  const from = narrow ? Math.max(y0, Math.min(y1 - span + 1, y0 + win)) : y0;
  const to = from + span - 1;
  const W = 640, L = 110, R = 40, laneH = 18;
  const xOf = (d: string | null | undefined) => (d ? L + ((Number(d.slice(0, 4)) + (d.length >= 7 ? (Number(d.slice(5, 7)) - 1) / 12 : 0.5) - from) / (to - from + 1)) * (W - L - R) : W - R + 14);
  const inWin = (d: string | null | undefined) => !narrow || !d || (Number(d.slice(0, 4)) >= from && Number(d.slice(0, 4)) <= to);
  const timelineRows: Row[] = marks.map((m) => ({
    cells: [labelOf(m.c), m.e.from ?? 'undated', <Quote>{m.e.lab}</Quote>, labelOf(m.e.s), recordKind(m.e), <TierWord tier={m.e.tier} />,
      m.response ? `answers: ${m.claim?.lab ?? 'a record'}` : responsesTo(m.e.id).length ? responsesTo(m.e.id).map((r) => `${responseHeadWords(r)} ${r.lab ?? ''}`).join(' · ') : NO_RESPONSE,
      <Src srcs={m.e.srcs} of={`${m.e.lab ?? m.e.id} (${labelOf(m.c)}${m.response ? ', response' : ''})`} inline />],
    out: [labelOf(m.c), m.e.from ?? '', m.e.lab ?? '', labelOf(m.e.s), recordKind(m.e), m.e.tier, m.response ? 'response' : responsesTo(m.e.id).length ? 'response recorded' : NO_RESPONSE, src(m.e)],
  }));
  return (
    <>
      <ChapterHead domain="literature" />
      {narrow && <CasePairs />}
      <SkipLink twin="case-timeline" title="Every record in each case file" />
      <figure className="m-0 my-3 min-w-0" aria-describedby="sec-c18">
        <h4 className="text-[14px] font-semibold text-text m-0 mb-1">Every record in each case file, on one axis</h4>
        <Fold on={narrow} summary={`The ${CASES.length} case files on one axis: ${marks.length} ticks`}>
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${PAIR_ORDER.length * laneH + 24}`} className="block w-full h-auto">
          {PAIR_ORDER.map((c, i) => (
            <g key={c}>
              <text x="2" y={i * laneH + 13} fontSize="12" fill="var(--color-text-secondary)">{labelOf(c).replace(/^Case: /, '').slice(0, 16)}</text>
              <line x1={L} x2={W - R} y1={i * laneH + 9} y2={i * laneH + 9} stroke="var(--color-border)" />
            </g>
          ))}
          {marks.filter((m) => inWin(m.e.from)).map((m, i) => {
            const lane = PAIR_ORDER.indexOf(m.c);
            const x = xOf(m.e.from);
            return m.response
              ? <circle key={`r${i}`} data-mark="response" cx={x} cy={lane * laneH + 9} r="3.6" fill="none" stroke="var(--color-rose)" strokeWidth="1.6" strokeDasharray={DASH[m.e.tier]} />
              : <line key={`c${i}`} data-mark="case" x1={x} x2={x} y1={lane * laneH + 3} y2={lane * laneH + 15} stroke="var(--color-text)" strokeWidth="2" strokeDasharray={DASH[m.e.tier]} />;
          })}
          <text x={L} y={PAIR_ORDER.length * laneH + 18} fontSize="12" fill="var(--color-text-muted)">{from}</text>
          <text x={W - R} y={PAIR_ORDER.length * laneH + 18} fontSize="12" textAnchor="end" fill="var(--color-text-muted)">{to}</text>
        </svg>
        </Fold>
        {narrow && (
          <>
            <div className="flex items-center justify-between mt-1">
              <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => setWin(Math.max(0, win - 6))}>‹ earlier</button>
              <button type="button" className={`px-2 underline text-[13px] ${FOCUS}`} onClick={() => setWin(0)}>earliest</button>
              <button type="button" className={`min-h-[44px] min-w-[44px] px-2 underline ${FOCUS}`} onClick={() => setWin(Math.min(Math.max(0, y1 - y0 + 1 - span), win + 6))}>later ›</button>
            </div>
            <p className="font-mono text-[12px] text-text-muted my-1">{`showing ${from}–${to} of ${y0}–${y1}`}</p>
          </>
        )}
        <figcaption data-page-copy="" className="font-mono text-[12px] text-text-muted mt-1">{`${CASES.length} case files · ${marks.filter((m) => !m.response).length} record ticks · ${marks.filter((m) => m.response).length} response ticks (rose circles) · undated records in the right gutter · axis to ${ASOF}`}</figcaption>
      </figure>
      <Caption id="sec-c18" cap="C18">Each lane is one case file as the register holds it; each tick a court order, an audit paragraph, an investigation step or an allegation, in its evidence tier&apos;s dash. Rose ticks are recorded answers. Lanes are paired as the research recorded them, so each case sits beside the case recorded as its control. A dense lane is a well-documented case, not a worse one.</Caption>
      {!narrow && <CasePairs />}
      <BaseRateSection domain="literature" />
      <Caption id="sec-c19" cap="C19">A case is shown as its records: what a court, an auditor or an investigator recorded, on what date, and what the other side answered. Each case sits beside the case the research recorded as its control, with the same fields in the same rows; Bofors and Rafale sit side by side by design, each the other&apos;s control. No case here is a finding of guilt or of innocence; the latest-record row quotes the latest record. What people say about the cases is rated in the narratives below and never drawn as a link to a party.</Caption>
      <Twin twin="case-timeline" title="Every record in each case file" rowCount={timelineRows.length}>
        {() => (
          <>
            <Exports name="Case records on one axis" twin="case-timeline" meta={{ table: 'Case records on one axis', population: `${CASES.length} case files`, rows: timelineRows.length }} header={['case', 'date', 'record', 'source_node', 'kind', 'tier', 'response', 'source_urls']} rows={() => timelineRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(timelineRows.length, 'case ticks and response ticks', filterWords)} amounts={false} cols={[{ key: 'c', label: 'case', th: true }, { key: 'd', label: 'date' }, { key: 'r', label: 'record' }, { key: 's', label: 'source node' }, { key: 'k', label: 'kind' }, { key: 't', label: 'tier' }, { key: 'resp', label: 'response' }, { key: 'src', label: 'sources' }]} rows={timelineRows} minWidth="70rem" />
          </>
        )}
      </Twin>
      <CaseFieldsTwin />
    </>
  );
}

/** A case's short name for a phone summary, from its id (force:case-bofors → Bofors). */
const shortCase = (c: string) => { const w = c.replace(/^force:case-/, ''); return w.charAt(0).toUpperCase() + w.slice(1); };
const CASE_DTS = ['Case', 'Decision record', 'Office on the decision date', 'Allegation', 'Investigation', 'Court', 'Audit', 'Latest record', 'Counter-record', 'Stories told about it', 'Sources'];
/**
 * The fields that hold records and the answers to them. They are never folded, at any width:
 * the denial beside the claim, in full, is the page's central rule (invariant 4, AC-65). Below
 * 640 px they take the column's full width, their name above them, so a record and its answer
 * stack at one width.
 */
const RECORD_FIELDS = new Set(['Allegation', 'Investigation', 'Court', 'Audit', 'Counter-record']);
/** Below 640 px only these fields sit behind a summary: none of them is a record's answer, and each is read in full elsewhere on the page. */
const FOLD_AT_M = new Set(['Decision record', 'Latest record', 'Sources']);
/** Below 640 px these fields take the full width with their name above them: the record fields, and the case's own long summary line. */
const WIDE_AT_M = new Set([...RECORD_FIELDS, 'Case']);
function caseCells(c: string, f: ReturnType<typeof usePage>['f']): { cells: ReactNode[]; words: string[]; summary: string[] } {
  const file = caseFile(c).filter((e) => edgePass(f, e));
  const dated = file.filter((e) => e.from).sort((a, b) => (a.from! < b.from! ? -1 : 1));
  const answerable = file.filter((e) => e.pred === 'enforce' || e.tier === 'alleged');
  const answered = answerable.filter((e) => responsesTo(e.id).length);
  const decision = file.find((e) => e.pred === 'award') ?? null;
  const holders = decision ? officeOn(decision.from, MOD) ?? [] : [];
  const allegations = file.filter((e) => e.tier === 'alleged');
  const kindOf = (k: string) => file.filter((e) => e.tier !== 'alleged' && e.pred !== 'award' && recordKind(e) === k);
  const recs = (es: GEdge[], none: string): { node: ReactNode; word: string } => es.length ? {
    node: <>{es.map((e) => (
      <div key={e.id} className="mb-1.5">
        <Quote as="p" className="m-0 text-text" declared={[e.a]} record={e}>{e.lab}</Quote>
        <p className="m-0 font-mono text-[12px] text-text-muted">{`${labelOf(e.s)} · ${e.from ?? 'undated'} · ${e.tier}`}</p>
        <Responses claim={e} />
      </div>
    ))}</>,
    word: es.map((e) => e.lab ?? e.id).join(' | '),
  } : { node: none, word: none };
  const allRes = file.flatMap((e) => responseChain(e.id).filter((x) => x.depth === 1).map((x) => x.edge));
  const latest = last(dated);
  const fields = [
    { node: `${labelOf(c)} · ${file.length} records · first ${dated[0]?.from ?? 'not dated'} · latest ${latest?.from ?? 'not dated'} · ${answered.length} of ${answerable.length} answerable records with a recorded response`, word: `${file.length} records` },
    decision ? { node: <>{`${decision.from ?? 'undated'} · ${labelOf(decision.s)} → ${labelOf(decision.t)} · `}{finite(decision.a) ? <span data-cr={decision.a}>{`₹${fmtCr(decision.a)} cr — as the record states it; no denominator published for this line; previous year not applicable`}</span> : 'amount not stated'}{' · '}<Quote declared={[decision.a]}>{decision.lab}</Quote></>, word: decision.lab ?? '' }
      : { node: 'decision record not joined to this case in the register (S11)', word: 'decision record not joined to this case in the register (S11)' },
    decision ? (holders.length ? { node: holders.map((w) => `${labelOf(w.s)} (${w.from ?? 'start not recorded'} – ${w.to ?? 'end not recorded'})`).join('; '), word: 'office holders' } : { node: `no recorded office window covers ${decision.from ?? 'an undated decision'}`, word: 'no office window' }) : { node: 'no decision date joined', word: 'no decision date joined' },
    recs(allegations, 'no allegation recorded in this case file'),
    recs(kindOf('investigation'), 'none recorded'),
    recs(kindOf('court'), 'none recorded'),
    recs(kindOf('audit'), 'none recorded'),
    latest ? { node: <Quote>{latest.lab}</Quote>, word: latest.lab ?? '' } : { node: 'not recorded', word: 'not recorded' },
    allRes.length ? { node: <>{allRes.map((r) => <p key={r.id} className="m-0 mb-1"><ResponseHead r={r} /><Tx> </Tx><Quote>{r.lab}</Quote></p>)}</>, word: `${allRes.length} responses` } : { node: <p className="m-0">{NO_RESPONSE}</p>, word: NO_RESPONSE },
    { node: <a href="#sec-P5-h" aria-label={`rated in Q5: the stories about ${labelOf(c)}`} onClick={(e) => { e.preventDefault(); goTo('sec-P5-h'); }} className={`underline underline-offset-2 ${FOCUS}`}>rated in Q5</a>, word: 'rated in Q5' },
    { node: <Src srcs={[...(nodeOf(c)?.srcs ?? []) as [string, string][], ...file.flatMap((e) => e.srcs ?? [])].filter((s, i, a) => a.findIndex((x) => x[1] === s[1]) === i)} of={labelOf(c)} inline />, word: 'sources' },
  ];
  const n = (es: GEdge[]) => `${es.length} record${es.length === 1 ? '' : 's'}, ${es.filter((e) => responsesTo(e.id).length).length} answered`;
  const summary = [`${file.length} records`, 'the decision record', 'the office on the date', n(allegations), n(kindOf('investigation')), n(kindOf('court')), n(kindOf('audit')), 'the latest record', `${allRes.length} response${allRes.length === 1 ? '' : 's'} in full`, 'rated in Q5', 'its sources'];
  return { cells: fields.map((x) => x.node), words: fields.map((x) => x.word), summary };
}

function CasePairs() {
  const { f, narrow, openCase } = usePage();
  // A case named by the URL is scrolled to on arrival, as a click on it would.
  useEffect(() => {
    if (!f.case) return;
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('[data-pair][aria-current="true"] h4')?.scrollIntoView({ block: 'center' })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rows: { a: string; b: string | null; edges: GEdge[] }[] = [...CASE_PAIRS.map((p) => {
    const [a, b] = [p.a, p.b].sort((x, y) => (firstRecord(x) ?? '9999').localeCompare(firstRecord(y) ?? '9999'));
    return { a, b, edges: p.edges };
  }), ...UNPAIRED.map((u) => ({ a: u, b: null, edges: [] }))];
  return (
    <div className={`${narrow ? 'space-y-3' : 'space-y-6'} mt-4`} aria-describedby="sec-c19">
      {rows.map(({ a, b, edges }) => {
        const current = !!f.case && (f.case === a || f.case === b);
        const ca = caseCells(a, f);
        const cb = b ? caseCells(b, f) : null;
        const files = [...new Set(edges.map((e) => fileOf(e)))];
        const colCls = `border-t-2 ${current ? 'border-accent' : 'border-border'} pt-1 text-[14px] min-w-0`;
        // Field rows align across the two columns (subgrid ≥ 640 px); below 640 they interleave, left then right.
        const fieldStyle = (side: 0 | 1, i: number) => (narrow ? { gridRow: 2 * i + 1 + side, gridColumn: 1 } : { gridRow: i + 1 });
        // Below 640px each field is one row, its name beside its value, left case then right.
        const rule = `border-t ${current ? 'border-accent' : 'border-border'} min-w-0`;
        const fieldCls = (t: string) => (WIDE_AT_M.has(t) ? `${rule} text-[14px] py-0.5` : `flex items-baseline gap-2 ${rule} text-[13px] leading-tight`);
        const dtCls = (t: string) => (!narrow ? 'font-mono text-[12px] text-text-muted' : WIDE_AT_M.has(t) ? `font-mono text-[12px] leading-tight text-text-muted py-0.5` : 'font-mono text-[12px] leading-tight tracking-tight text-text-muted w-[9.25rem] shrink-0 py-0.5');
        const cell = (side: string, x: ReturnType<typeof caseCells>, t: string, i: number) => (narrow && FOLD_AT_M.has(t) ? <Fold on small summary={`${shortCase(side)}: ${x.summary[i]}`}>{x.cells[i]}</Fold> : x.cells[i]);
        return (
          <section key={a} data-pair="" aria-current={current ? 'true' : undefined} aria-labelledby={`sec-pair-${a}`} className="min-w-0 scroll-mt-40">
            <h4 id={`sec-pair-${a}`} tabIndex={-1} className={`${narrow ? 'text-[14px] leading-tight' : 'text-[15px]'} font-semibold text-text m-0 ${TARGET}`}>
              <button type="button" className={`text-left underline underline-offset-2 decoration-border-light ${FOCUS}`} onClick={(e) => openCase(a, e.currentTarget)}>{b ? `${labelOf(a)} beside ${labelOf(b)}` : `${labelOf(a)}, without a recorded control`}</button>
            </h4>
            {current && <span className="sr-only">selected case</span>}
            {edges.length > 0 && (
              <Fold on={narrow} small summary={`Why paired: ${edges.length} record(s), quoted`}>
              <div className="border-l-2 border-border-light pl-3 my-2 text-[14px] text-text-secondary">
                {edges.map((e) => (
                  <div key={e.id} className="mb-1.5">
                    <p className="font-mono text-[12px] text-text-muted m-0">{`wording: ${e.id!.split(':')[0]}`}</p>
                    <Quote as="p" className="m-0 text-text">{e.lab}</Quote>
                    {e.d && <Quote as="p" className="m-0">{e.d}</Quote>}
                    {e.innocentReading && <p className="m-0"><Tx>the reading in which nothing is wrong: </Tx><Quote>{e.innocentReading}</Quote></p>}
                  </div>
                ))}
                {files.map((fl) => symmetryOf(fl) ? <div key={fl} className="mt-1"><p className="font-mono text-[12px] text-text-muted m-0">{`symmetry, ${fl} research file:`}</p><Quote as="p" className="m-0">{symmetryOf(fl)}</Quote></div> : null)}
              </div>
              </Fold>
            )}
            <div className={`grid gap-x-5 ${narrow ? 'gap-y-0 mt-1' : 'gap-y-1 mt-2'}`} style={{ gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gridTemplateRows: narrow ? undefined : `repeat(${CASE_DTS.length}, auto)` }}>
              <dl data-case={a} className={`m-0 ${colCls}`} style={narrow ? { display: 'contents' } : { display: 'grid', gridTemplateRows: 'subgrid', gridRow: `1 / span ${CASE_DTS.length}`, gridColumn: 1 }}>
                {CASE_DTS.map((t, i) => <div key={t} style={fieldStyle(0, i)} className={narrow ? fieldCls(t) : 'min-w-0'}><dt className={dtCls(t)}>{t}</dt><dd className="m-0 min-w-0 break-words">{cell(a, ca, t, i)}</dd></div>)}
              </dl>
              {cb ? (
                <dl data-case={b!} className={`m-0 ${colCls}`} style={narrow ? { display: 'contents' } : { display: 'grid', gridTemplateRows: 'subgrid', gridRow: `1 / span ${CASE_DTS.length}`, gridColumn: 2 }}>
                  {CASE_DTS.map((t, i) => <div key={t} style={fieldStyle(1, i)} className={narrow ? fieldCls(t) : 'min-w-0'}><dt className={dtCls(t)}>{t}</dt><dd className="m-0 min-w-0 break-words">{cell(b!, cb, t, i)}</dd></div>)}
                </dl>
              ) : (
                <dl data-case="none" className={`m-0 ${colCls}`} style={narrow ? { display: 'contents' } : { gridRow: `1 / span ${CASE_DTS.length}`, gridColumn: 2 }}>
                  {narrow
                    ? CASE_DTS.map((t, i) => <dd key={t} style={fieldStyle(1, i)} className={`m-0 text-amber border-t ${current ? 'border-accent' : 'border-border'} text-[12.5px] leading-tight py-0.5 min-w-0`}>{NO_PAIRING}</dd>)
                    : <dd className="m-0 text-amber">{NO_PAIRING}</dd>}
                </dl>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CaseFieldsTwin() {
  const { f, filterWords } = usePage();
  // One row per case and field: an unpaired case's missing control has no fields of its own (AC-106);
  // its pairing sentence is on the case's own rows.
  const cases = [...CASE_PAIRS.flatMap((p) => [p.a, p.b]), ...UNPAIRED];
  const rows: Row[] = cases.flatMap((c) => {
    const w = caseCells(c, f).words;
    const unpaired = UNPAIRED.includes(c);
    return CASE_DTS.map((t, i) => ({ cells: [labelOf(c), t, `${w[i] || 'not recorded'}${unpaired ? ` · ${NO_PAIRING}` : ''}`], out: [c, t, w[i]] }));
  });
  return (
    <Twin twin="case-fields" title="Each case's fields" rowCount={rows.length}>
      {() => (
        <>
          <Exports name="Case fields" twin="case-fields" meta={{ table: 'Case fields', population: `${CASES.length} cases × ${CASE_DTS.length} fields`, rows: rows.length }} header={['case', 'field', 'value']} rows={() => rows.map((r) => r.out!)} />
          <TwinTable caption={captionText(rows.length, 'case × field, with the null words', filterWords)} amounts={false} cols={[{ key: 'c', label: 'case', th: true }, { key: 'f', label: 'field' }, { key: 'v', label: 'value or the null words' }]} rows={rows} />
        </>
      )}
    </Twin>
  );
}

export { RUN, fyLabel };
