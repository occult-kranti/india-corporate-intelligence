import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { SecurityFile } from '../../data/cppp';
import type { Tier } from '../../graph/schema';
import {
  type Filters, type Lens, LENS_LABEL, LENS_SHORT, LENS_DOMAINS, LENSES, STAGES, COMPONENTS, TIER_LIST, KINDS, KIND_COUNT, EMPTY_KINDS,
  EMPTY, META, RUN, ASOF, FILES, VERDICTS, KILLED, BUDGETS, STRENGTH, FOOTPRINT, EDGES, STATE_ROWS, FY_AXIS, DEFAULT_STAGE, coveredFys, defenceStack, latestFy, fmtCr, fmtInt,
  COMMISSIONERATES, FP_CITIES, FP_STATES, FP_DATED, UNITS_ALPHA, stateName, budgetPass, lensPopulation,
  AWARDS, PRICED, UNPRICED, VENDORS, CASES, CASE_PAIRS, UNPAIRED, ALLEGED, ANSWERED, BONDS, BOND_DONORS, BOND_PARTIES, AUDIT_CONTRAS,
  EMPTY_MONO, CONTROL_EMPTY, symmetryOf, kindWord, kindReason, nodeOf, labelOf, CASE_PREFIX, VENDOR_SET, CITY_BODIES, CITY_POLICE_TEXT,
  LANE_BODIES, last, edgePass, dateInFy, FY_DOMAIN, GRANT_ROWS, STATE_NAME, FORCE_NODE_LIST, CASES as CASE_IDS, parseFilters,
  ORDNANCE_RULE, RESOLUTION_COUNTS, BUDGET_STRIP, BUDGET_RECON, PROCUREMENT_COUNTS, sliceFigures,
} from '../../data/securityView';
import { usePage, Effect, Reason, Dash, FOCUS, TARGET, Quote, Anchor } from './ui';

// ---------------------------------------------------------------------------
// Fixed copy (§4.1): no figure in any of it
// ---------------------------------------------------------------------------

export const KICKER = 'Security spend · defence, police, intelligence and the bodies around them';
export const TITLE = 'The money India spends on force';
export const STANDFIRST = "The Union pays for defence and for its own police; each state pays for its police; only Delhi's city police has a budget line of its own. This page draws what each payer budgets and spends, where force sits, who is paid and on what terms, and what the Ministry of Defence has bought and from whom, each figure beside what it is a share of and what it is compared with. Spending on force is a policy choice. A large number is not a finding.";
export const STANDING = 'No colour on this page stands for a party, a government, a state or a verdict. Party appears only as text, as the record states it. Vendors appear beside the vendors they compete with; cases appear beside the case recorded as their control.';
export const RAIL_REFUSAL = "Not offered: party, government, era, vendor-class-only, 'risk' and city-budget filters — why →";
export const RESOLUTION = [
  { key: 'union', dt: 'Union — to the line', dd: 'Every rupee the Union spends here resolves to a line in a demand for grants, with Budget Estimate, Revised Estimate and Actual where the document prints them.' },
  { key: 'state', dt: 'State — to the Police head', dd: "Each state's police money resolves to its Police major head and no further, except where a state's own budget opened. Strength, vacancy and per-lakh figures come through secondary transcriptions while the national strength table is unreachable, and say so. Prisons, home guards, fire and forensic money resolve only as Union scheme totals and are not budget rows here." },
  { key: 'city', dt: 'City — to the footprint, and Delhi', dd: "Only Delhi Police has a budget line of its own, and it is a Union demand. Every other city's police money is inside its state's police head, and this page prints those words in place of a number. Cities appear through what is located in them." },
] as const;

const NO_ROWS = 'no rows in this build';

// ---------------------------------------------------------------------------
// The head
// ---------------------------------------------------------------------------

export function sliceLine(slice: SecurityFile | null | undefined) {
  if (slice === undefined) return 'open-market slice loading';
  if (slice === null) return 'open-market slice not built in this copy';
  const sf = sliceFigures(slice);
  return `open-market slice from the CPPP scrape ${sf.hashes.join(' ')} (as of ${sf.asOf ?? 'date not stated'})`;
}
export function Head({ slice, wideHead }: { slice: SecurityFile | null | undefined; wideHead: boolean }) {
  const byline = EMPTY
    ? `force: register not yet promoted · ${sliceLine(slice)}`
    : `force ${RUN} · records read to ${ASOF} · ${sliceLine(slice)} · built from ${FILES} research files, cross-examined (${VERDICTS} audit verdicts, ${KILLED.length} claim${KILLED.length === 1 ? '' : 's'} killed)`;
  return (
    <header className={wideHead ? 'xl:grid xl:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] xl:gap-x-6' : ''}>
      <div>
        <p data-page-copy="" className="font-mono text-[12px] tracking-[0.08em] text-accent mb-2">{KICKER}</p>
        <h1 className="heading-editorial font-bold text-[26px] sm:text-4xl xl:text-[1.85rem] leading-tight text-balance mb-2">{TITLE}</h1>
      </div>
      <div>
        <p data-page-copy="" className="text-[14px] xl:text-[12.5px] xl:leading-[1.4] text-text-secondary leading-relaxed xl:max-w-none max-w-[72ch]">{STANDFIRST}</p>
        <p data-page-copy="" className="text-[13px] xl:text-[12px] xl:leading-[1.35] text-text mt-1 xl:max-w-none max-w-[72ch]">{STANDING}</p>
        <p className="font-mono text-[12px] text-text-muted mt-1 break-words">{byline}</p>
      </div>
    </header>
  );
}
export function EmptyCallout() {
  return (
    <div role="note" className="border border-amber/40 bg-amber/[0.06] rounded-lg my-3 overflow-hidden">
      <p className="font-mono text-[12px] tracking-wide px-4 py-2 border-b border-border text-text">Register not yet promoted</p>
      <p data-page-copy="" className="px-4 py-3 text-[14px] text-text-secondary max-w-[72ch]">The force register has not been promoted into this build. Every surface on every lens says so, and nothing below is a zero.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The resolution statement (§5.0.1, C1): fixed words, derived counts
// ---------------------------------------------------------------------------

export function resolutionMono(): Record<'union' | 'state' | 'city', string> {
  if (EMPTY) return { union: EMPTY_MONO, state: EMPTY_MONO, city: EMPTY_MONO };
  const c = RESOLUTION_COUNTS;
  const union = c.unionRows
    ? `${fmtInt(c.unionRows)} line rows · ${c.unionBodies} bodies · FY${FY_AXIS[0]}–FY${last(FY_AXIS)} · actuals for ${c.actualFys} of ${FY_AXIS.length} FYs`
    : NO_ROWS;
  const statePart = STATE_ROWS.length
    ? `${c.seriesStates} of 36 states and UTs carry a Police-head row${c.seriesSpan ? ` (FY${c.seriesSpan.first}–FY${c.seriesSpan.last})` : ''} · ${c.statesWithOwn.length} with their own budget series`
    : `state budget rows: ${NO_ROWS}`;
  const strPart = STRENGTH.length ? `${c.strengthStates} with a strength row; ${c.reportedStrength} of ${STRENGTH.length} strength rows reported` : `strength rows: ${NO_ROWS}`;
  const delhi = c.delhiRows && c.delhiSpan ? `Delhi Police: ${fmtInt(c.delhiRows)} line rows, FY${c.delhiSpan.first}–FY${c.delhiSpan.last}` : `Delhi Police: ${NO_ROWS}`;
  const city = FOOTPRINT.length ? `${c.commissionerates} commissionerates placed, ${c.commWithStrength} with a strength row · ${c.fpCities} cities with an installation` : `installations: ${NO_ROWS}`;
  return { union, state: `${statePart} · ${strPart}`, city: `${delhi} · ${city}` };
}
export function Resolution() {
  const mono = resolutionMono();
  return (
    <section id="resolution" aria-labelledby="sec-res-h" className="mt-3 mb-2 scroll-mt-40">
      <dl id="sec-c1" data-caption="C1" data-page-copy="" className="sec-res text-[14px] text-text-secondary m-0">
        <h2 id="sec-res-h" className="sec-res-h font-semibold text-text text-[14px]">What resolves at which level</h2>
        {RESOLUTION.map((r) => (
          <div key={r.key} className="sec-res-row">
            <dt className="sec-res-dt font-semibold text-text">{r.dt}</dt>
            <dd className="sec-res-dd m-0">
              {r.dd}
              <span className="sec-res-mono font-mono text-text-muted">{` ${mono[r.key]}`}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The denominator strip (§5.0.2) and the reconciliation line (§5.0.3)
// ---------------------------------------------------------------------------

function stripFacts(f: Filters, slice: SecurityFile | null | undefined): ReactNode[] {
  if (f.lens === 'budgets') {
    const pop = lensPopulation(f);
    const first = BUDGETS.length ? `${fmtInt(pop.k)} of ${fmtInt(BUDGETS.length)} budget rows · ${f.stage}` : 'no budget rows in this build';
    if (!BUDGETS.length) return [first];
    const cols = defenceStack(f.stage);
    const fy = latestFy(f.stage);
    const col = cols.find((c) => c.fy === fy);
    const facts: ReactNode[] = [first];
    if (col && !col.missing) {
      const prev = cols.filter((c) => !c.missing && c.fy < col.fy).pop();
      const pubLast = [...cols].reverse().find((c) => c.published);
      facts.push(
        <span key="f2" data-cr={col.sum}>
          {`defence ${f.stage} ${col.fy}: ₹${fmtCr(col.sum)} cr across ${col.rows.length} demands, computed here; pensions ${col.pensionWords} · `}
          {col.published
            ? `published total ₹${fmtCr(col.published.cr)} cr (${col.recon === 'equal' ? 'the stack equals it' : `the stack exceeds it by ₹${fmtCr(col.delta)} cr`})`
            : `no published all-demands total for FY${col.fy}${pubLast?.published ? `; latest published: ₹${fmtCr(pubLast.published.cr)} cr (FY${pubLast.fy}, ${f.stage})` : ''}`}
          {` · ${prev ? `FY${prev.fy} ${f.stage}: ₹${fmtCr(prev.sum)} cr, computed here` : 'previous year not applicable'}`}
        </span>,
      );
    }
    facts.push(`${coveredFys(f.stage).length} of ${FY_AXIS.length} FYs have a ${f.stage} stack · actuals for ${RESOLUTION_COUNTS.actualFys} of ${FY_AXIS.length} FYs`);
    facts.push(`${BUDGET_STRIP.stateUnits} of 36 map units have a state police row · Delhi's police is a Union line`);
    facts.push(`${BUDGET_STRIP.reportedRows} rows transcribed from a secondary (reported)`);
    facts.push(`${BUDGET_STRIP.zeroRows} rows print ₹0 as recorded`);
    return facts;
  }
  if (f.lens === 'footprint') {
    if (!FOOTPRINT.length) return ['no installation rows in this build'];
    const pop = lensPopulation(f);
    const withRows = KINDS.length - EMPTY_KINDS.length;
    return [
      `${pop.k} of ${FOOTPRINT.length} installations`,
      `${withRows} of ${KINDS.length} kinds recorded; ${EMPTY_KINDS.length} with no row`,
      `${FP_STATES.length} of 36 map units with any row · ${FP_CITIES.length} cities named · no coordinates`,
      `${FP_DATED} of ${FOOTPRINT.length} dated`,
      `${COMMISSIONERATES.length} commissionerates; budget inside the state's police head; city strength: no primary table`,
    ];
  }
  const pc = PROCUREMENT_COUNTS;
  const sf = slice ? sliceFigures(slice) : null;
  return [
    `${AWARDS.length} contracts MoD named (${PRICED.length} with ₹, ${UNPRICED.length} unpriced) to ${pc.awardVendors} vendors`,
    `${pc.publicVendors} public-sector beside ${pc.privateVendors} private, JV or foreign — vendor class not a field`,
    `${CASES.length} cases, ${CASE_PAIRS.length} control pairs, ${UNPAIRED.length} unpaired · ${pc.enforce} court and audit records`,
    `${ANSWERED.length} of ${ALLEGED.length} alleged claims with a recorded response`,
    `${BONDS.length} bond records, ${BOND_DONORS.length} donors, ${BOND_PARTIES.length} parties`,
    sf
      ? `open market: ${sf.decisions} award decisions in ${sf.classes} buyer classes, ${sf.worksBuyer ? `${sf.worksBuyer.pct}% one works buyer` : 'no works buyer in the file'} — read by class`
      : slice === undefined ? 'open market: loading the slice' : 'open-market slice not built in this copy',
  ];
}
const LEVELS = 'what resolves at which level';
export function Strip({ f, narrow, slice }: { f: Filters; narrow: boolean; slice: SecurityFile | null | undefined }) {
  const pop = lensPopulation(f);
  const levels = (short: boolean) => (
    <a href="#resolution" aria-label={short ? LEVELS : undefined} aria-describedby="sec-c1" className={`underline underline-offset-2 hover:text-accent ${FOCUS}`}
      onClick={(e) => { e.preventDefault(); document.getElementById('resolution')?.scrollIntoView({ block: 'start' }); }}>{short ? 'levels' : LEVELS}</a>
  );
  if (narrow) {
    const n = f.lens === 'budgets' ? BUDGETS.length : f.lens === 'footprint' ? FOOTPRINT.length : EDGES.length;
    const line = EMPTY ? 'register not yet promoted · nothing below is zero' : n ? `${fmtInt(pop.k)} of ${fmtInt(n)} rows · ${f.lens === 'budgets' ? f.stage : LENS_SHORT[f.lens].toLowerCase()} · read to ${ASOF} · ` : `${f.lens === 'budgets' ? 'no budget rows in this build' : 'no rows in this build'} · read to ${ASOF} · `;
    return (
      <section aria-label="Denominators" className="font-mono text-[12px] text-text-secondary leading-snug">
        <h2 hidden>Denominators</h2>
        <p className="m-0">{line}{!EMPTY && levels(true)}</p>
      </section>
    );
  }
  const facts = EMPTY ? ['register not yet promoted · nothing below is zero'] : stripFacts(f, slice);
  return (
    <section aria-label="Denominators" className="font-mono text-[12px] lg:text-[11.5px] text-text-secondary leading-snug">
      <h2 hidden>Denominators</h2>
      <p className="m-0">
        {!EMPTY && pop.n > 0 && <><Effect n={pop.n} k={pop.k} tail={pop.unit} className="text-text" />{' · '}</>}
        {facts.map((x, i) => <span key={i}>{i ? ' · ' : ''}{x}</span>)}
        {' · '}<span>{`read to ${ASOF}`}</span>{' · '}{levels(false)}
      </p>
    </section>
  );
}
/** Facts 2–6 of the strip, moved whole (not hidden) under the first figcaption below 640px (U3). */
export function MovedFacts({ f, slice }: { f: Filters; slice: SecurityFile | null | undefined }) {
  if (EMPTY) return null;
  const facts = stripFacts(f, slice).slice(1).filter((_, i) => !(f.lens === 'budgets' && i === 0));
  return (
    <ul className="list-none p-0 m-0 mt-2 font-mono text-[12px] text-text-secondary space-y-0.5" aria-label="Denominators, continued">
      {facts.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  );
}

export function reconText(lens: Lens, slice: SecurityFile | null | undefined): string {
  if (EMPTY) return 'register not yet promoted — nothing below is zero';
  if (lens === 'budgets') {
    if (!BUDGETS.length) return 'no budget rows in this build · no total on this page adds rows from two levels';
    const b = BUDGET_RECON;
    return `${fmtInt(b.total)} rows = ${fmtInt(b.union)} Union (${fmtInt(b.demand)} demand-level + ${fmtInt(b.inside)} lines inside a demand + ${fmtInt(b.grants)} grants to states + ${fmtInt(b.pub)} published totals) + ${fmtInt(b.state)} state (${b.rbi} RBI Police head + ${b.own} a state's own budget + ${b.prs} PRS transcriptions, reported) · ${b.zero} recorded as ₹0 · no total on this page adds rows from two levels`;
  }
  if (lens === 'footprint') {
    const terms = KINDS.map((k) => { const n = KIND_COUNT.get(k) ?? 0; return n ? `${n} ${kindWord(k)}` : `0 ${kindWord(k)} (none in this register)`; });
    return `${FOOTPRINT.length} installations = ${terms.join(' + ')}`;
  }
  const pc = PROCUREMENT_COUNTS;
  const sf = slice ? sliceFigures(slice) : null;
  const sliceTerm = sf ? ` · tender slice ${sf.rawRows} raw rows → ${sf.decisions} after dedup` : slice === null ? ' · tender slice not built in this copy' : '';
  return `${EDGES.length} records = ${pc.award} awards + ${pc.enforce} court, audit and investigation records + ${pc.contra} responses (${AUDIT_CONTRAS.length} added by the audit) + ${pc.role} office and board + ${pc.bond} bonds + ${pc.law} rules + ${pc.analytic} comparisons + ${pc.other} other${sliceTerm}`;
}
export function ReconLine({ lens, slice }: { lens: Lens; slice: SecurityFile | null | undefined }) {
  return (
    <ul className="list-none p-0 m-0 font-mono text-[12px] text-text-muted leading-snug" aria-label="Reconciliation">
      <li data-page-copy="">{reconText(lens, slice)}</li>
    </ul>
  );
}

// ---------------------------------------------------------------------------
// The active-filter line, the notices and the tabs
// ---------------------------------------------------------------------------

export function filterTerms(f: Filters): string[] {
  const t: string[] = [];
  // A filter is named in the words its control shows, never by its URL code (§0.7 step 4).
  if (f.payer) t.push(`Payer — ${f.payer === 'union' ? 'Union' : 'States'}`);
  if (f.st) t.push(stateName(f.st));
  if (f.fyFrom) t.push(f.fyFrom === f.fyTo ? `FY ${f.fyFrom}` : `FY ${f.fyFrom}–${f.fyTo}`);
  if (f.stageSet) t.push(`stage ${f.stage}`);
  if (f.compSet) t.push(`components: ${[...f.comp].join(', ') || 'none'}`);
  if (f.tierSet) t.push(`tiers: ${[...f.tiers].join(', ') || 'none'}`);
  if (f.kindSet) t.push(`kinds: ${[...f.kind].map(kindWord).join(', ')}`);
  // Find filters nothing, so it is not on this line; the Find box shows the query (Reading B).
  return t;
}
export function ActiveFilters({ f, onReset }: { f: Filters; onReset: () => void }) {
  const t = filterTerms(f);
  if (!t.length) return null;
  return (
    <p data-page-copy="" className="text-[13px] text-text-secondary mt-2">
      {`filters: ${t.join(' · ')} · `}
      <button type="button" className={`underline underline-offset-2 hover:text-accent ${FOCUS}`} onClick={onReset}>reset</button>
    </p>
  );
}
export function Notices({ f, extra }: { f: Filters; extra: string[] }) {
  if (!f.unknown.length && !extra.length) return null;
  return (
    <div className="mt-2 space-y-0.5">
      {f.unknown.map((k) => <p key={k} className="text-[13px] text-amber m-0">{`ignored an unrecognised ${k} value`}</p>)}
      {extra.map((x) => <p key={x} className="text-[13px] text-amber m-0">{x}</p>)}
    </div>
  );
}

export function LensTabs({ lens, onPick, narrow }: { lens: Lens; onPick: (l: Lens) => void; narrow: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(LENSES.indexOf(lens));
  useEffect(() => { setFocusIdx(LENSES.indexOf(lens)); }, [lens]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % LENSES.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + LENSES.length) % LENSES.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = LENSES.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(LENSES[i]); return; }
    if (n < 0) return;
    e.preventDefault();
    setFocusIdx(n);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label="Lenses" className={`flex ${narrow ? 'w-full' : 'flex-wrap'} gap-1`}>
      {LENSES.map((l, i) => (
        <button key={l} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`sec-tab-${l}`} aria-selected={lens === l} aria-controls={`sec-panel-${l}`}
          aria-label={LENS_LABEL[l]} tabIndex={i === focusIdx ? 0 : -1}
          onClick={(e) => { if (e.detail === 0) return; onPick(l); }} onKeyDown={(e) => onKey(e, i)}
          className={`sec-pressed ${narrow ? 'flex-1 min-h-[44px]' : 'min-h-[30px]'} px-2.5 text-[13.5px] border rounded ${lens === l ? 'border-accent text-text bg-accent/10' : 'border-border-light text-text-secondary'} ${FOCUS}`}>
          {narrow ? LENS_SHORT[l] : LENS_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Find (§5.0.4): searches the register; filters nothing; never auto-selects
// ---------------------------------------------------------------------------

type Group = 'Bodies' | 'Places' | 'Vendors' | 'Cases' | 'Records';
const GROUPS: Group[] = ['Bodies', 'Places', 'Vendors', 'Cases', 'Records'];
interface Hit { group: Group; id: string; label: string; rank: number; sub?: string | null; place?: (typeof FOOTPRINT)[number] }
const ENTITY = FORCE_NODE_LIST.map((n) => ({ id: n.id, label: n.label, al: n.al ?? [], sub: n.sub ?? null }));
const EXTRA_VENDORS = VENDORS.filter((v) => !ENTITY.some((n) => n.id === v)).map((v) => ({ id: v, label: labelOf(v), al: nodeOf(v)?.al ?? [], sub: nodeOf(v)?.sub ?? null }));
const HEAD_BODIES = new Map<string, string[]>();
for (const r of BUDGETS) { if (!HEAD_BODIES.has(r.body)) HEAD_BODIES.set(r.body, []); const hs = HEAD_BODIES.get(r.body)!; if (hs.length < 40 && !hs.includes(r.head)) hs.push(r.head); }
export function search(q: string): Hit[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const out: Hit[] = [];
  for (const n of [...ENTITY, ...EXTRA_VENDORS]) {
    const lab = n.label.toLowerCase();
    let rank = lab === s ? 0 : n.al.some((a) => a.toLowerCase() === s) ? 1 : lab.includes(s) || n.al.some((a) => a.toLowerCase().includes(s)) ? 2 : (n.sub ?? '').toLowerCase().includes(s) ? 3 : -1;
    if (rank < 0 && (HEAD_BODIES.get(n.id) ?? []).some((h) => h.toLowerCase().includes(s))) rank = 3;
    if (rank < 0) continue;
    const group: Group = n.id.startsWith(CASE_PREFIX) ? 'Cases' : VENDOR_SET.has(n.id) ? 'Vendors' : 'Bodies';
    out.push({ group, id: n.id, label: n.label, rank, sub: n.sub });
  }
  for (const r of FOOTPRINT) {
    const lab = r.label.toLowerCase();
    const rank = lab === s ? 0 : r.city.toLowerCase() === s ? 1 : lab.includes(s) || r.city.toLowerCase().includes(s) ? 2 : -1;
    if (rank >= 0) out.push({ group: 'Places', id: r.id, label: r.label, rank, place: r });
  }
  for (const e of EDGES) {
    const lab = (e.lab ?? '').toLowerCase();
    const rank = lab === s ? 0 : lab.includes(s) ? 3 : -1;
    if (rank >= 0 && e.id) out.push({ group: 'Records', id: e.id, label: e.lab ?? e.id, rank });
  }
  return out.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.rank - b.rank || a.label.localeCompare(b.label) || (a.id < b.id ? -1 : 1));
}

export function Find({ f, inputRef }: { f: Filters; inputRef: React.RefObject<HTMLInputElement> }) {
  const { patch, announce, showConnections, openRecord, openBody, openVendor, openCase, selectState } = usePage();
  const [draft, setDraft] = useState(f.find);
  const [all, setAll] = useState<Set<Group>>(new Set());
  const timer = useRef<number | null>(null);
  const first = useRef(true);
  useEffect(() => { setDraft(f.find); }, [f.find]);
  const hits = useMemo(() => search(draft), [draft]);
  useEffect(() => {
    if (first.current) { first.current = false; if (f.find) announce(`${search(f.find).length} matches for ${f.find}`, 300); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onChange = (v: string) => {
    setDraft(v);
    setAll(new Set());
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      patch({ find: v || null });
      if (v) announce(`${search(v).length} matches for ${v}`, 0);
    }, 300);
  };
  const cityBody = (id: string) => CITY_BODIES.has(id);
  const stateOfCity = (id: string) => FOOTPRINT.find((r) => r.body === id)?.st ?? nodeOf(id)?.st ?? null;
  const btn = (label: string, aria: string, on: (el: HTMLButtonElement) => void) => (
    <button type="button" aria-label={aria === label ? undefined : aria} className={`underline underline-offset-2 hover:text-accent mr-3 inline-flex items-center min-h-[44px] sm:min-h-0 ${FOCUS}`} onClick={(e) => on(e.currentTarget)}>{label}</button>
  );
  const citySentence = (id: string) => {
    const st = stateOfCity(id);
    return st ? (
      <>
        <span data-city-body={id} className="block text-text">{CITY_POLICE_TEXT(stateName(st))}</span>
        {btn('Where its police money sits', 'Where its police money sits', () => patch({ st, lens: null }))}
      </>
    ) : null;
  };
  const render = (h: Hit) => {
    if (h.group === 'Places' && h.place) {
      const r = h.place;
      return (
        <li key={`p-${h.id}`} className="text-[13.5px]">
          <span className="text-text">{r.label}</span><span className="text-text-muted">{` — ${r.city}, ${stateName(r.st)} · ${kindWord(r.kind)}`}</span>
          {r.kind === 'commissionerate' && cityBody(r.body) && citySentence(r.body)}
          <span className="block">{btn('Show in footprint', `Show in footprint: ${r.label}`, () => patch({ lens: 'footprint', st: r.st }))}</span>
        </li>
      );
    }
    if (h.group === 'Records') {
      return (
        <li key={`r-${h.id}`} className="text-[13.5px]">
          {btn('Open record', `Open record: ${h.label}`, (el) => openRecord(h.id, el))}
          <Quote>{h.label}</Quote>
        </li>
      );
    }
    if (h.group === 'Cases') {
      return (
        <li key={`c-${h.id}`} className="text-[13.5px]">
          <span className="text-text">{h.label}</span>{' '}
          {btn('Show the pair', `Show the pair: ${h.label}`, (el) => openCase(h.id, el))}
          {btn('Show connections', `Show connections for ${h.label}`, (el) => showConnections(h.id, el))}
        </li>
      );
    }
    if (h.group === 'Vendors') {
      return (
        <li key={`v-${h.id}`} className="text-[13.5px]">
          <span className="text-text">{h.label}</span>{' '}
          {btn('Show vendor', `Show vendor: ${h.label}`, (el) => openVendor(h.id, el))}
          {btn('Show connections', `Show connections for ${h.label}`, (el) => showConnections(h.id, el))}
        </li>
      );
    }
    return (
      <li key={`b-${h.id}`} className="text-[13.5px]">
        <span className="text-text">{h.label}</span>{h.sub ? <span className="text-text-muted">{` — ${h.sub}`}</span> : null}
        {cityBody(h.id) && citySentence(h.id)}
        <span className="block">
          {LANE_BODIES.has(h.id) && btn('Show its budget lines', `Show its budget lines: ${h.label}`, (el) => openBody(h.id, el))}
          {btn('Show connections', `Show connections for ${h.label}`, (el) => showConnections(h.id, el))}
        </span>
      </li>
    );
  };
  void selectState;
  return (
    <div role="search" aria-label="Find in the force register" className="mt-3 min-w-0">
      <label htmlFor="sec-find" className="font-mono text-[12px] text-text-muted block">Find</label>
      <input id="sec-find" ref={inputRef} type="search" value={draft} placeholder="body, place, vendor, case or record" onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') e.preventDefault(); }}
        className={`w-full sm:w-[28rem] bg-bg-elevated border border-border-light rounded px-2 min-h-[44px] sm:min-h-[36px] text-[14px] ${FOCUS}`} />
      {draft.trim() && (
        <div className="mt-2 text-[13.5px] max-w-[80ch]">
          {!hits.length && <p className="m-0">{`No body, place, vendor, case or record in this register matches "${draft}". This is a statement about the register, not about the world.`}</p>}
          {GROUPS.map((g) => {
            const list = hits.filter((h) => h.group === g);
            if (!list.length) return null;
            const shown = all.has(g) ? list : list.slice(0, 8);
            return (
              <div key={g} className="mt-2">
                <p className="font-mono text-[12px] text-text-muted m-0">{g}</p>
                <ul className="list-none p-0 m-0 space-y-1.5">
                  {shown.map(render)}
                  {list.length > 8 && !all.has(g) && (
                    <li><button type="button" className={`underline font-mono text-[12px] ${FOCUS}`} onClick={() => setAll(new Set([...all, g]))}>{`Show all ${list.length} ${g.toLowerCase()}`}</button></li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The filter rail (§6)
// ---------------------------------------------------------------------------

function Segmented<T extends string>({ value, options, onPick, disabled, describedBy, label }: {
  value: T | null; options: { v: T; label: string }[]; onPick: (v: T) => void; disabled?: boolean; describedBy?: string; label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={value === o.v} aria-disabled={disabled ? 'true' : undefined} aria-describedby={disabled ? describedBy : undefined}
          onClick={() => { if (!disabled) onPick(o.v); }}
          className={`sec-pressed font-mono text-[12px] px-2 min-h-[32px] border rounded ${value === o.v ? 'border-accent text-text bg-accent/10' : 'border-border-light text-text-secondary'} ${disabled ? 'opacity-60' : ''} ${FOCUS}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
const CTRL = 'space-y-1 py-2 border-b border-border';
const LBL = 'font-mono text-[12px] text-text-muted block';

export function FilterRail({ f, narrow, onReset }: { f: Filters; narrow: boolean; onReset: () => void }) {
  const { patch, announce } = usePage();
  const lens = f.lens;
  const N = BUDGETS.length;
  const pass = (r: (typeof BUDGETS)[number]) => budgetPass(f, r);
  const kAll = BUDGETS.filter(pass).length;
  const changed = (msg: string, next: Filters | null = null) => { void next; announce(msg); };
  const popAfter = (kv: Record<string, string | null>) => {
    const p = new URLSearchParams(location.hash.split('?')[1] ?? '');
    for (const [k, v] of Object.entries(kv)) { if (v == null) p.delete(k); else p.set(k, v); }
    return p;
  };
  const write = (kv: Record<string, string | null>, word: string, popFn: (p: URLSearchParams) => { n: number; k: number; unit: string }) => {
    patch(kv);
    const pop = popFn(popAfter(kv));
    changed(`${word}; from ${pop.n} to ${pop.k} ${pop.unit}`);
  };
  const lensPop = (p: URLSearchParams) => lensPopulationOf(p);

  // Payer
  const payerReason = `does not apply to ${LENS_LABEL[lens].toLowerCase()}: installations and contracts are not budget rows`;
  // State
  const stateCount = (st: string) => (lens === 'footprint' ? FOOTPRINT.filter((r) => r.st === st).length : STATE_ROWS.filter((r) => r.payer === st).length);
  const stateReason = "does not apply: a vendor's registered office is not where its work is";
  const stateK = lens === 'budgets' ? STATE_ROWS.filter(pass).length : FOOTPRINT.filter((r) => (!f.st || r.st === f.st) && f.kind.has(r.kind)).length;
  // FY
  const fyIn = FY_AXIS.filter((fy) => !f.fyFrom || (fy >= f.fyFrom && fy <= f.fyTo!)).length;
  const undated = EDGES.filter((e) => !e.from).length;
  const fyOptions = lens === 'procurement' ? FY_DOMAIN : FY_AXIS;
  const setFy = (fromIn: string | null, toIn: string | null) => {
    // An end at the axis's own edge is the same as "All years" on that side.
    const from = fromIn === fyOptions[0] ? null : fromIn;
    const to = toIn === last(fyOptions) ? null : toIn;
    let v: string | null = null;
    if (from && to) v = from === to ? from : from < to ? `${from}..${to}` : `${to}..${from}`;
    else if (from) v = `${from}..${last(fyOptions)}`;
    else if (to) v = `${fyOptions[0]}..${to}`;
    write({ fy: v }, v ? `FY filter ${v.replace('..', ' to ')}` : 'FY filter cleared', lensPop);
  };
  // Stage
  const stageReason = `does not apply to ${LENS_LABEL[lens].toLowerCase()}: installations and contracts are not budget rows`;
  const stageK = BUDGETS.filter((r) => pass(r) && r.stage === f.stage).length;
  // Component
  const compK = BUDGETS.filter((r) => budgetPass(f, r) && r.payer === 'union' && r.component !== 'grant-to-states').length;
  const compCount = (c: string) => BUDGETS.filter((r) => r.component === c).length;
  const toggleComp = (c: (typeof COMPONENTS)[number]) => {
    const next = new Set(f.comp);
    if (next.has(c)) next.delete(c); else next.add(c);
    const v = next.size === COMPONENTS.length ? null : COMPONENTS.filter((x) => next.has(x)).join(',') || 'none';
    write({ comp: v }, `component filter: ${[...next].join(', ') || 'none'}`, lensPop);
  };
  // Tier
  const toggleTier = (t: Tier) => {
    const next = new Set(f.tiers);
    if (next.has(t)) next.delete(t); else next.add(t);
    const v = next.size === TIER_LIST.length ? null : TIER_LIST.filter((x) => next.has(x)).join(',') || 'none';
    write({ tier: v }, `tier filter: ${TIER_LIST.filter((x) => next.has(x)).join(', ') || 'none'}`, lensPop);
  };
  const tierK = lensPopulation(f).k;
  const tierN = lensPopulation(f).n;

  const rid = (s: string) => `sec-rail-${s}`;
  const content = (
    <>
      <div className={CTRL}>
        <span className={LBL}>Payer</span>
        <Segmented<'all' | 'union' | 'states'> label="Payer" value={f.payer ?? 'all'} disabled={lens !== 'budgets'} describedBy={rid('payer')}
          options={[{ v: 'all', label: 'All' }, { v: 'union', label: 'Union' }, { v: 'states', label: 'States' }]}
          onPick={(v) => write({ payer: v === 'all' ? null : v }, `payer filter ${v}`, lensPop)} />
        {lens === 'budgets'
          ? <Effect n={N} k={kAll} tail="budget rows" />
          : <Reason id={rid('payer')}>{payerReason}</Reason>}
        <p className="text-[12px] text-text-muted m-0">the Union stack is Union-only; States affects the ledger, the state table and the panels</p>
      </div>
      <div className={CTRL}>
        <label htmlFor={rid('st-sel')} className={LBL}>State (where the record places it)</label>
        <select id={rid('st-sel')} value={f.st ?? ''} aria-disabled={lens === 'procurement' ? 'true' : undefined} aria-describedby={lens === 'procurement' ? rid('st') : undefined}
          onChange={(e) => write({ st: e.target.value || null }, e.target.value ? `${stateName(e.target.value)} selected` : 'state cleared', lensPop)}
          className={`w-full bg-bg-elevated border border-border-light rounded px-1 min-h-[36px] text-[13px] ${FOCUS}`}>
          <option value="">All states and UTs</option>
          {UNITS_ALPHA.map((st) => { const k = lens === 'procurement' ? STATE_ROWS.filter((r) => r.payer === st).length : stateCount(st); return <option key={st} value={st} aria-disabled={k === 0 ? 'true' : undefined}>{`${stateName(st)} (${k})`}</option>; })}
        </select>
        {lens === 'procurement'
          ? <Reason id={rid('st')}>{stateReason}</Reason>
          : <Effect n={lens === 'budgets' ? N : FOOTPRINT.length} k={lens === 'budgets' ? kAll : stateK} tail={lens === 'budgets' ? 'rows · Union lines not placed by state' : 'installations'} />}
        {lens === 'budgets' && <p className="text-[12px] text-text-muted m-0">a state's own police head; Delhi's police is a Union line; grants: recipient not a field (S2)</p>}
      </div>
      <div className={CTRL}>
        <span className={LBL}>FY from – to</span>
        <div className="flex gap-1">
          <label className="sr-only" htmlFor={rid('fy-from')}>FY from</label>
          <select id={rid('fy-from')} value={f.fyFrom ?? ''} onChange={(e) => setFy(e.target.value || null, f.fyTo && f.fyFrom !== f.fyTo ? f.fyTo : (f.fyTo ?? null))}
            className={`flex-1 bg-bg-elevated border border-border-light rounded px-1 min-h-[36px] text-[13px] ${FOCUS}`}>
            <option value="">All years</option>
            {fyOptions.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <label className="sr-only" htmlFor={rid('fy-to')}>FY to</label>
          <select id={rid('fy-to')} value={f.fyTo ?? ''} onChange={(e) => setFy(f.fyFrom, e.target.value || null)}
            className={`flex-1 bg-bg-elevated border border-border-light rounded px-1 min-h-[36px] text-[13px] ${FOCUS}`}>
            <option value="">All years</option>
            {fyOptions.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        {lens === 'footprint'
          ? <Reason>{`does not apply: ${FP_DATED} of ${FOOTPRINT.length} installations carry a date`}</Reason>
          : lens === 'budgets'
            ? <Effect n={N} k={kAll} tail={`rows · ${fyIn} of ${FY_AXIS.length} FYs`} />
            : <Effect n={EDGES.length} k={lensPopulation(f).k} tail={`records · ${undated} undated shown under all years only`} />}
        <p className="text-[12px] text-text-muted m-0">{lens === 'procurement' ? 'calendar dates of the record' : 'dims years outside the range; the axis does not move; strength tables dated 1 January Y count in FY Y−1–Y'}</p>
      </div>
      <div className={CTRL}>
        <span className={LBL}>Stage</span>
        <Segmented<string> label="Stage" value={f.stage} disabled={lens !== 'budgets'} describedBy={rid('stage')}
          options={STAGES.map((s) => ({ v: s, label: `${s} · ${coveredFys(s).length} of ${FY_AXIS.length} FYs` }))}
          onPick={(v) => write({ stage: v === DEFAULT_STAGE ? null : v }, `stage ${v}`, (p) => { const pop = lensPopulationOf(p); const ff = parseFor(p); return { ...pop, k: BUDGETS.filter((r) => budgetPass(ff, r) && r.stage === ff.stage).length }; })} />
        {lens === 'budgets' ? <Effect n={N} k={stageK} tail="rows" /> : <Reason id={rid('stage')}>{stageReason}</Reason>}
        <p className="text-[12px] text-text-muted m-0">{`actuals arrive two years after the budget${coveredFys('BE').length >= Math.max(coveredFys('RE').length, coveredFys('actual').length) ? '; BE is the stage with rows in the greatest number of years' : ''}`}</p>
      </div>
      <div className={CTRL}>
        <span className={LBL}>Component</span>
        <div className="grid grid-cols-2 gap-x-2">
          {COMPONENTS.map((c) => (
            <label key={c} className="text-[12.5px] flex items-center gap-1">
              <input type="checkbox" checked={f.comp.has(c)} aria-disabled={lens !== 'budgets' ? 'true' : undefined} aria-describedby={lens !== 'budgets' ? rid('comp') : undefined}
                onChange={() => { if (lens === 'budgets') toggleComp(c); }} className={FOCUS} />
              {`${c} (${compCount(c)})`}
            </label>
          ))}
        </div>
        <button type="button" className={`underline font-mono text-[12px] ${FOCUS}`} onClick={() => write({ comp: null }, 'component filter cleared', lensPop)}>Select all components</button>
        <div>{lens === 'budgets' ? <Effect n={N} k={compK} tail="ledger rows; the stack is not affected" /> : <Reason id={rid('comp')}>{stageReason}</Reason>}</div>
        <p className="text-[12px] text-text-muted m-0">components overlap by level; this filter never adds rows; pay sits inside revenue demands</p>
      </div>
      <div className={CTRL}>
        <span className={LBL}>Tier</span>
        <div className="flex flex-wrap gap-1">
          {TIER_LIST.map((t) => (
            <button key={t} type="button" aria-pressed={f.tiers.has(t)} onClick={() => toggleTier(t)}
              className={`sec-pressed font-mono text-[12px] px-2 min-h-[32px] border rounded flex items-center gap-1 ${f.tiers.has(t) ? 'border-accent text-text' : 'border-border-light text-text-muted'} ${FOCUS}`}>
              {t}<span aria-hidden="true"><Dash tier={t} w={18} /></span>
            </button>
          ))}
        </div>
        <Effect n={tierN} k={tierK} tail={`${lensPopulation(f).unit}; also filters the connection graph`} />
        <p className="text-[12px] text-text-muted m-0">series rows are documented or reported by their note; responses follow their claim</p>
      </div>
      {narrow && lens === 'footprint' && <KindChecks f={f} />}
      <div className="py-2 space-y-1">
        <button type="button" className={`font-mono text-[12px] border border-border-light rounded px-2 min-h-[32px] ${FOCUS}`} onClick={onReset}>Reset</button>
        <p className="text-[12px] m-0">
          <Anchor to="refusals" className="text-text-muted">{RAIL_REFUSAL}</Anchor>
        </p>
      </div>
    </>
  );
  if (narrow) {
    const active = filterTerms(f).length;
    const pop = lensPopulation(f);
    return (
      <>
        <details className="mt-3 border border-border rounded px-2">
          <summary className={`cursor-pointer min-h-[44px] flex items-center text-[14px] ${FOCUS}`}>{`Filters (${active}) · ${pop.n} → ${pop.k}`}</summary>
          <nav aria-labelledby="sec-filters-name"><span id="sec-filters-name" hidden>Filters</span>{content}</nav>
        </details>
        <p className="mt-1"><Effect n={pop.n} k={pop.k} tail={pop.unit} /></p>
      </>
    );
  }
  // Named by reference, not by aria-label, so the landmark carries its name and not the text inside it.
  return <nav aria-labelledby="sec-filters-name" className="text-[13px]"><span id="sec-filters-name" hidden>Filters</span>{content}</nav>;
}

/** A filter population for a prospective URL (the effect announced when a control writes). */
const parseFor = (p: URLSearchParams) => parseFilters(p);
function lensPopulationOf(p: URLSearchParams) { return lensPopulation(parseFor(p)); }

/** The kind chips: all eleven with counts; a kind with no row stays, aria-disabled, with its reason (D27). */
export function kindToggle(f: Filters, k: (typeof KINDS)[number]): string | null {
  if (!f.kindSet) return k;
  const next = new Set(f.kind);
  if (next.has(k)) next.delete(k); else next.add(k);
  if (!next.size || next.size === KINDS.length) return null;
  return KINDS.filter((x) => next.has(x)).join(',');
}
export function KindChips({ f }: { f: Filters }) {
  const { patch, announce } = usePage();
  return (
    <div role="group" aria-label="Kinds of installation" className="flex flex-wrap gap-1 my-2">
      {KINDS.map((k) => {
        const n = KIND_COUNT.get(k) ?? 0;
        const reason = n ? null : `none in this register${kindReason(k) ? ` — ${kindReason(k)}` : ''}`;
        const on = f.kindSet && f.kind.has(k);
        return (
          <button key={k} type="button" aria-pressed={on} aria-disabled={n ? undefined : 'true'}
            onClick={() => { if (!n) return; const v = kindToggle(f, k); patch({ kind: v }); const kk = v ? v.split(',') : KINDS; const k2 = FOOTPRINT.filter((r) => kk.includes(r.kind) && (!f.st || r.st === f.st)).length; announce(`kind filter: ${v ? v.replace(/,/g, ', ') : 'all kinds'}; from ${FOOTPRINT.length} to ${k2} installations`); }}
            className={`sec-pressed font-mono text-[12px] px-2 min-h-[32px] border rounded text-left ${on ? 'border-accent text-text bg-accent/10' : 'border-border-light text-text-secondary'} ${n ? '' : 'opacity-70'} ${FOCUS}`}>
            {`${kindWord(k)} (${n})`}{reason ? <span className={`block ${kindReason(k) === ORDNANCE_RULE ? 'text-text-muted' : 'text-amber'}`}>{reason}</span> : null}
          </button>
        );
      })}
      <button type="button" aria-pressed={!f.kindSet} onClick={() => { patch({ kind: null }); announce(`kind filter: all kinds; from ${FOOTPRINT.length} to ${FOOTPRINT.filter((r) => !f.st || r.st === f.st).length} installations`); }}
        className={`sec-pressed font-mono text-[12px] px-2 min-h-[32px] border rounded ${!f.kindSet ? 'border-accent text-text' : 'border-border-light text-text-secondary'} ${FOCUS}`}>all kinds</button>
    </div>
  );
}
function KindChecks({ f }: { f: Filters }) {
  const { patch, announce } = usePage();
  return (
    <div className={CTRL}>
      <span className={LBL}>Kind</span>
      {KINDS.map((k) => {
        const n = KIND_COUNT.get(k) ?? 0;
        const reason = n ? '' : ` — none in this register${kindReason(k) ? `: ${kindReason(k)}` : ''}`;
        return (
          <label key={k} className="text-[13px] flex items-start gap-2 min-h-[44px]">
            <input type="checkbox" checked={f.kindSet && f.kind.has(k)} aria-disabled={n ? undefined : 'true'}
              onChange={() => { if (!n) return; const v = kindToggle(f, k); patch({ kind: v }); announce(`kind filter: ${v ? v.replace(/,/g, ', ') : 'all kinds'}`); }} className={`mt-1 ${FOCUS}`} />
            <span>{`${kindWord(k)} (${n})${reason}`}</span>
          </label>
        );
      })}
      <label className="text-[13px] flex items-center gap-2 min-h-[44px]">
        <input type="checkbox" checked={!f.kindSet} onChange={() => patch({ kind: null })} className={FOCUS} />
        <span>all kinds</span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reading key and the control card (margin at rest)
// ---------------------------------------------------------------------------

export function ReadingKey() {
  return (
    <section aria-labelledby="sec-key-h" className="text-[13px] text-text-secondary mt-4">
      <h3 id="sec-key-h" className="text-[14px] font-semibold text-text mb-1">Reading key</h3>
      <ul className="list-none p-0 m-0 space-y-1" data-page-copy="">
        {TIER_LIST.map((t) => <li key={t} className="flex items-center gap-2"><Dash tier={t} /><span>{t}</span></li>)}
        <li><span className="inline-block w-4 h-3 align-middle mr-2 sec-hatch-swatch" aria-hidden="true" />hatch: no row in this register, never zero</li>
        <li><span className="inline-block w-4 h-3 align-middle mr-2 sec-cross-swatch" aria-hidden="true" />crosshatch: police paid by the Union (Delhi)</li>
        <li><span className="inline-block w-4 h-3 align-middle mr-2 sec-stipple-swatch" aria-hidden="true" />stipple: counts recorded without per-lakh</li>
        <li><span className="inline-block w-4 h-3 align-middle mr-2 sec-zero-swatch" aria-hidden="true" />a recorded zero: ₹0 as recorded</li>
        <li>stack bands: lightness steps of one grey, from the bottom: revenue, capital, MoD civil and misc., pensions; a bracket is a line inside a band; a tick is the published total</li>
        <li>reconciliation marks under a column: equal, differs, or no published total</li>
        <li>ledger slots: BE · RE · actual, left to right inside each year</li>
        <li>a dot: one installation, positioned within its state, not geocoded</li>
        <li>No colour on this page stands for a party, a state or a verdict. Hue is only the kind of actor.</li>
        <li>Rose marks a response or denial, never &apos;bad&apos;. Amber marks something not recorded.</li>
      </ul>
      <h4 className="text-[13px] font-semibold text-text mt-2 mb-1">Words</h4>
      <ul className="list-none p-0 m-0 text-[12.5px] space-y-0.5" data-page-copy="">
        {[
          ['BE', "the budget's first estimate"], ['RE', 'the revised estimate later that year'], ['actual', 'the accounts, two years later'],
          ['demand', 'one grant as Parliament votes it'], ['line', 'a sub-head inside a demand as the document prints it'], ['published total', 'a total the document itself prints'],
          ['computed here', 'a figure this page computed, with its a of b'], ['reported', 'transcribed from a secondary source'], ['derived', 'computed by the research from a ratio, not a printed count'],
          ['of published total / of stack, computed here', 'the two bases of the pension share'], ['hidden by filter', 'rows that exist but a filter hides, drawn dimmed, never hatched — not absent'],
          ['as published: ₹ lakh', 'the unit the source printed before the research converted it'],
        ].map(([k, v]) => <li key={k}><span className="font-mono text-text">{k}</span>{` — ${v}`}</li>)}
      </ul>
    </section>
  );
}

export function ControlCard({ lens }: { lens: Lens }) {
  const domains = LENS_DOMAINS[lens];
  const texts = domains.map((d) => ({ d, t: symmetryOf(d) })).filter((x) => x.t);
  return (
    <section aria-labelledby={`sec-ctl-${lens}`} className="text-[13.5px] text-text-secondary mt-4 border-t border-border pt-3">
      <h3 id={`sec-ctl-${lens}`} className="text-[14px] font-semibold text-text mb-1">The same lens on the other side</h3>
      {EMPTY || !texts.length ? <p className="text-amber m-0">{CONTROL_EMPTY}</p> : lens === 'procurement' ? (
        <ul className="list-none p-0 m-0 space-y-1">
          {[['P1', 'procurement-industry'], ['P3', 'money-people'], ['P4', 'literature']].map(([q, d]) => (
            <li key={q}><Anchor to={`sec-${q}-h`}>{`${q.replace('P', 'Q')}: the ${d} research file's symmetry text, at the head of its chapter`}</Anchor></li>
          ))}
        </ul>
      ) : (
        texts.map(({ d, t }) => (
          <div key={d} className="mt-2">
            <Quote as="p" className="m-0">{t}</Quote>
            <p className="font-mono text-[12px] text-text-muted m-0">{`wording: ${d} research file, run ${RUN}; its base rates are in Q4`}</p>
          </div>
        ))
      )}
    </section>
  );
}

export { CASE_IDS, STATE_NAME, GRANT_ROWS, META, TARGET, edgePass, dateInFy };
