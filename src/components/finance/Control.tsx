import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { TIERS, TIER_ORDER, type Tier } from '../../graph/schema';
import { FAMILY_COLOR, FAMILY_LABEL } from '../viz/ForceGraph';
import { TextureSwatch } from '../welfare/WelfareMap';
import {
  type Filters, type Lens, type Inclusion, LENSES, LENS_LABEL, MODULES, INCLUSIONS, YEARS, STATES_BY_NAME, LENDERS_CENSUS, LENDERS_RESEARCHED,
  BAND_A, BAND_B, holderSummary, LOANS, CENSUS, loanPass, inclusion, hasRupee, rupeeTotal, strictSt, censusInView,
  conditionsOf, fmtCr, fmtInt, ASOF_LABEL, INDICES_AS_OF, censusProjects, blendProjects, WB_TOTALS, G2, FY_AXIS, FY_WITH, ACTIONS,
  CASE_FILES, NGO_ALLEGED, hasRealResponse, NAMED_GRANTS, LINKED_SCHEMES, WELFARE_SCHEMES, COLUMNS, RESEARCHED_COLS, FILING_DATES,
  AWARDS_CAP, RULES_CAP, benefitOf, OWN, lineKind, NO_AMOUNT, isEmpty, FAM_SPLITS, inYear, yearOf, AGG_RECIPIENT, isAggregateId,
  nodeOf, type BandRow, CAPITAL_BY_PRED, NGO_BY_PRED, activeTerms, SHARE_FLOOR, ROLE_WORDS,
} from '../../data/financeView';
import { Effect, usePage, Dash, Q } from './ui';

// ---------------------------------------------------------------------------
// Populations per lens under the filters — what every effect and fact counts
// ---------------------------------------------------------------------------

export function loansRows(f: Filters) { return LOANS.filter((e) => loanPass(f, e)); }
export function actionsInView(f: Filters) {
  return ACTIONS.filter((e) => !isAggregateId(e.t) && f.tiers.has(e.tier) && inYear(f, e.from) && (!f.st || nodeOf(e.t)?.st === f.st));
}
export function capitalInView(f: Filters) {
  return [...AWARDS_CAP, ...RULES_CAP].filter((e) => f.tiers.has(e.tier) && inYear(f, e.from));
}
export function lensPopulation(lens: Lens, f: Filters): { n: number; k: number; unit: string } {
  if (lens === 'loans') return { n: LOANS.length, k: loansRows(f).length, unit: 'records' };
  if (lens === 'associations') return { n: ACTIONS.filter((e) => !isAggregateId(e.t)).length, k: actionsInView(f).length, unit: 'actions' };
  return { n: AWARDS_CAP.length + RULES_CAP.length, k: capitalInView(f).length, unit: 'awards and rules' };
}
export const fyInView = (f: Filters) => FY_AXIS.filter((y) => f.yFrom == null || (y >= f.yFrom && y <= (f.yTo ?? f.yFrom))).length;

// ---------------------------------------------------------------------------
// Strip facts (spec §5.0.2)
// ---------------------------------------------------------------------------

export interface Fact { key: string; text: ReactNode; plain: string }

export function stripFacts(lens: Lens, f: Filters): Fact[] {
  if (isEmpty(lens)) return [];
  if (lens === 'loans') {
    const rows = loansRows(f);
    const census = censusInView(f).filter((e) => !f.inc || inclusion(e) === f.inc);
    const cc = census.filter(hasRupee);
    const total = rupeeTotal(census);
    const placed = rupeeTotal(census.filter((e) => strictSt(e)));
    const ys = census.map((e) => yearOf(e.from)).filter((y): y is number => y != null);
    const span = ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : 'no approval year in view';
    const researched = rows.filter((e) => !CENSUS.includes(e));
    const lenders = new Set(researched.map((e) => e.s)).size;
    const withCond = rows.filter((e) => conditionsOf(e).length > 0).length;
    const noRupee = rows.filter((e) => !hasRupee(e)).length;
    const facts: Fact[] = [
      { key: 'rows', plain: `${rows.length} of ${LOANS.length} loan records`, text: `${rows.length} of ${LOANS.length} loan records` },
      { key: 'counted', plain: '', text: <>₹{fmtCr(total)} cr counted, nominal, from the World Bank projects table, {span} — {cc.length} of {census.length} <dfn title="The World Bank projects table, enumerated by script: the only population this page sums.">census</dfn> records carry ₹</> },
      { key: 'placed', plain: '', text: <>₹{fmtCr(placed)} cr of ₹{fmtCr(total)} cr <dfn title="The record names a state government as the borrower or the implementer.">placed</dfn> in a state government</> },
      { key: 'researched', plain: '', text: <>{researched.length} <dfn title="Records the research found by hand: listed, never summed.">researched</dfn> records, {lenders} lenders — listed, not summed</> },
      { key: 'cond', plain: '', text: `${withCond} of ${rows.length} records state conditions` },
      { key: 'norupee', plain: '', text: `${noRupee} records: ${NO_AMOUNT}` },
    ];
    if (G2 && WB_TOTALS) facts.push({ key: 'api', plain: '', text: `${censusProjects} projects of ${WB_TOTALS.totals.projects} in the API (${WB_TOTALS.totals.dropped} dropped, ${WB_TOTALS.totals.grantOnly} grant-only: not loans)` });
    return facts;
  }
  if (lens === 'associations') {
    const acts = actionsInView(f);
    // A contra that records only "no response found" is printed beside its claim, but it
    // does not answer it: counting it would overstate how many allegations were answered.
    const answered = NGO_ALLEGED.filter((e) => hasRealResponse(e.id)).length;
    const donors = new Set(NAMED_GRANTS.map((e) => e.s)).size;
    return [
      { key: 'fy', plain: `${FY_WITH.size} of ${FY_AXIS.length} financial years with a national receipts total`, text: `${FY_WITH.size} of ${FY_AXIS.length} financial years with a national receipts total` },
      { key: 'acts', plain: '', text: `${acts.length} enforcement actions, ${CASE_FILES.filter((c) => c.actions.some((a) => acts.includes(a))).length} named case files` },
      { key: 'answered', plain: '', text: `${answered} of ${NGO_ALLEGED.length} allegations with a recorded response` },
      { key: 'grants', plain: '', text: `${NAMED_GRANTS.length} named grant records, ${donors} donors` },
      { key: 'schemes', plain: '', text: `${LINKED_SCHEMES.size} of ${WELFARE_SCHEMES.length} register schemes linked to an association` },
    ];
  }
  const withBenefit = RULES_CAP.filter((e) => benefitOf(e)).length;
  const span = FILING_DATES.length ? `${FILING_DATES[0]}–${FILING_DATES[FILING_DATES.length - 1]}` : 'none recorded';
  return [
    { key: 'cols', plain: `${RESEARCHED_COLS.length} of ${COLUMNS.length} NIFTY 50 companies with a named holder recorded`, text: `${RESEARCHED_COLS.length} of ${COLUMNS.length} NIFTY 50 companies with a named holder recorded` },
    // The spec's wording, then the declared roles, so the subjects are never read as their own controls.
    { key: 'bandA', plain: '', text: `${BAND_A.length} comparison holders always shown${BAND_A.some((r) => r.role !== 'comparison') ? ` (${['subject', 'comparison', 'domestic-control'].map((role) => [role, BAND_A.filter((r) => r.role === role).length] as const).filter(([, n]) => n > 0).map(([role, n]) => `${n} ${ROLE_WORDS[role]}`).join(', ')})` : ''}` },
    { key: 'dates', plain: '', text: `${FILING_DATES.length} filing dates across columns (${span})` },
    { key: 'awards', plain: '', text: `${AWARDS_CAP.length} awards by the Union and regulators` },
    { key: 'rules', plain: '', text: `${withBenefit} of ${RULES_CAP.length} rules with a cui-bono row` },
  ];
}

export function asOfText(lens: Lens) {
  return `read to ${ASOF_LABEL}${lens === 'capital' ? ` · indices as of ${INDICES_AS_OF}` : ''}`;
}

/** The sticky strip. Below 640px only fact 1 and the date stay pinned; the rest move under the first figcaption. */
export function Strip({ lens, f, narrow }: { lens: Lens; f: Filters; narrow: boolean }) {
  const facts = stripFacts(lens, f);
  return (
    <section aria-label="Denominators" className="font-mono text-[11px] text-text-secondary leading-snug">
      <h2 className="sr-only">Denominators</h2>
      {isEmpty(lens) ? (
        <p>register not yet promoted · nothing below is zero · {asOfText(lens)}</p>
      ) : (
        <p className={narrow ? 'truncate' : ''}>
          {(narrow ? facts.slice(0, 1) : facts).map((x, i) => <span key={x.key}>{i > 0 ? ' · ' : ''}<span>{x.text}</span></span>)}
          {' · '}<span>{asOfText(lens)}</span>
        </p>
      )}
    </section>
  );
}

/** Facts 2–6 (and the byline) as the mono list a phone reads under the first figcaption: moved, not hidden. */
export function MovedFacts({ lens, f, byline }: { lens: Lens; f: Filters; byline: ReactNode[] }) {
  const facts = stripFacts(lens, f).slice(1);
  return (
    <ul className="font-mono text-[12px] text-text-secondary list-none p-0 my-3 space-y-1 border-l-2 border-border-light pl-3">
      {facts.map((x) => <li key={x.key}>{x.text}</li>)}
      {byline.map((b, i) => <li key={`b${i}`}>{b}</li>)}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// ReconciliationLine (§5.0.3)
// ---------------------------------------------------------------------------

export function ReconciliationLine({ lens, f, asList }: { lens: Lens; f: Filters; asList: boolean }) {
  const { patch, hrefWith } = usePage();
  if (isEmpty(lens)) {
    return <p className="font-mono text-[12px] text-text-muted">{`${MODULES[lens].fleet} records: register not yet promoted`}</p>;
  }
  if (lens === 'loans') {
    const rows = LOANS.filter((e) => loanPass(f, e, { inc: true }));
    const n = (inc: Inclusion) => rows.filter((e) => inclusion(e) === inc).length;
    const words: Record<Inclusion, string> = {
      'census-counted': 'census counted',
      'census-no-rupee': `census, ${NO_AMOUNT}`,
      'researched-listed': 'researched with ₹ (listed, not summed)',
      'researched-no-rupee': 'researched, amount not stated',
    };
    const term = (inc: Inclusion) => (
      <a data-inclusion={inc} href={`#/finance${hrefWith({ view: 'table', inc, tp: null })}`}
        className="underline underline-offset-2 decoration-border-light hover:text-accent"
        onClick={(e) => { e.preventDefault(); patch({ view: 'table', inc, tp: null }); }}>
        {`${n(inc)} ${words[inc]}`}
      </a>
    );
    const tail = `${censusProjects} census projects, ${blendProjects} with two legs`;
    if (asList) {
      return (
        <ul className="font-mono text-[12px] text-text-secondary list-none p-0 my-2 space-y-1">
          <li>{`${rows.length} loan records = `}</li>
          {INCLUSIONS.map((inc, i) => <li key={inc}>{i > 0 ? '+ ' : ''}{term(inc)}</li>)}
          <li>{tail}</li>
        </ul>
      );
    }
    return (
      <p className="font-mono text-[12px] text-text-secondary">
        {`${rows.length} loan records = `}
        {INCLUSIONS.map((inc, i) => <span key={inc}>{i > 0 ? ' + ' : ''}{term(inc)}</span>)}
        {` · ${tail}`}
      </p>
    );
  }
  const by = lens === 'associations' ? NGO_BY_PRED : CAPITAL_BY_PRED;
  const total = MODULES[lens].edges.length;
  const g = (p: string) => by.get(p) ?? 0;
  let text: string;
  if (lens === 'associations') {
    const other = total - g('grant') - g('enforce') - g('contra') - g('role');
    text = `${total} records = ${g('grant')} grant + ${g('enforce')} enforcement + ${g('contra')} responses + ${g('role')} office + ${other} other`;
  } else {
    const own = OWN.length;
    const aggs = OWN.filter((e) => lineKind(e) === 'aggregate').length;
    const other = total - own - g('award') - g('law') - g('contra');
    text = `${total} records = ${own} holdings (${own - aggs} filing lines + ${aggs} aggregates) + ${g('award')} awards + ${g('law')} rules + ${g('contra')} responses + ${other} other`;
  }
  return asList
    ? <ul className="font-mono text-[12px] text-text-secondary list-none p-0 my-2"><li>{text}</li></ul>
    : <p className="font-mono text-[12px] text-text-secondary">{text}</p>;
}

// ---------------------------------------------------------------------------
// Active-filter line (§5.0.4) and the unrecognised-value notices
// ---------------------------------------------------------------------------

export function ActiveFilters({ params, f, onReset }: { params: URLSearchParams; f: Filters; onReset: () => void }) {
  const terms = activeTerms(params, f);
  if (!terms.length) return null;
  return (
    <p className="font-mono text-[11px] text-text-secondary my-2">
      {`filters: ${terms.join(' · ')} · `}
      <button type="button" onClick={onReset} className="underline underline-offset-2 hover:text-accent">reset</button>
    </p>
  );
}

export function Notices({ f }: { f: Filters }) {
  if (!f.bad.length) return null;
  return (
    <p className="font-mono text-[12px] my-1">
      {f.bad.map((k, i) => <span key={k}>{i > 0 ? ' · ' : ''}<span className="text-amber">{`ignored an unrecognised ${k} value; showing the default`}</span></span>)}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Lens tabs (WAI-ARIA tabs, manual activation)
// ---------------------------------------------------------------------------

export function LensTabs({ lens, onPick }: { lens: Lens; onPick: (l: Lens) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(LENSES.indexOf(lens));
  useEffect(() => { setFocusIdx(LENSES.indexOf(lens)); }, [lens]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % LENSES.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + LENSES.length) % LENSES.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = LENSES.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(LENSES[i]); return; }
    else return;
    e.preventDefault();
    setFocusIdx(n);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label="Lenses" className="flex flex-wrap gap-1">
      {LENSES.map((l, i) => (
        <button key={l} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" id={`fin-tab-${l}`} aria-selected={l === lens}
          aria-controls={`fin-panel-${l}`} tabIndex={i === focusIdx ? 0 : -1}
          onKeyDown={(e) => onKey(e, i)} onClick={() => onPick(l)}
          className={`min-h-[44px] px-4 text-[14px] border rounded ${l === lens ? 'border-accent text-accent bg-accent/[0.08]' : 'border-border-light text-text-secondary hover:text-text'}`}>
          {LENS_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter rail (§6)
// ---------------------------------------------------------------------------

const TOGGLE = 'inline-flex items-center gap-1.5 px-2 min-h-[32px] border rounded font-mono text-[12px]';

export function FilterRail({ lens, f, stateCounts, narrow }: { lens: Lens; f: Filters; stateCounts: Map<string, number>; narrow: boolean }) {
  const { patch, announce } = usePage();
  const pop = lensPopulation(lens, f);
  const { n, k } = pop;
  const unit = pop.unit;
  const yTail = lens === 'loans' ? 'records (approval year)' : lens === 'associations' ? `actions · ${fyInView(f)} FYs` : 'awards and rules · matrix unaffected';
  const tierTail = lens === 'associations' ? `${unit} · also filters the connection graph · grounds and responses stay with their action` : `${unit} · also filters the connection graph`;
  const yDef = lens === 'loans' ? 'approval year of loans, awards and acts'
    : lens === 'associations' ? 'FY starting in the year for money; calendar year of the action date for actions'
      : 'year of awards and rules; the holder matrix is not reached (one filing per company)';
  const stDef = lens === 'loans' ? 'placed by state government only' : lens === 'associations' ? 'registered state, not where it works' : 'holdings are not placed by state';
  const setY = (from: string, to: string) => {
    if (!from && !to) { patch({ y: null, tp: null }); return; }
    const a = from || String(YEARS[0]);
    const b = to || String(YEARS[YEARS.length - 1]);
    const [lo, hi] = Number(a) <= Number(b) ? [a, b] : [b, a];
    patch({ y: lo === hi ? lo : `${lo}-${hi}`, tp: null });
  };
  // An open end is written as the register's first or last year and read back as "All
  // years", so clearing one end and then the other always returns the URL to no y.
  const yFromV = f.yFrom != null && !(f.yFrom === YEARS[0] && f.yTo !== f.yFrom) ? String(f.yFrom) : '';
  const yToV = f.yTo != null && !(f.yTo === YEARS[YEARS.length - 1] && f.yTo !== f.yFrom) ? String(f.yTo) : '';
  const toggleTier = (t: Tier) => {
    const next = new Set(f.tiers);
    if (next.has(t)) next.delete(t); else next.add(t);
    const list = TIER_ORDER.filter((x) => next.has(x));
    const v = list.length === TIER_ORDER.length ? null : list.length ? list.join(',') : 'none';
    patch({ tier: v, tp: null });
    const nf = { ...f, tiers: next };
    announce(`tier filter: ${list.length ? list.join(', ') : 'none'}; from ${n} to ${lensPopulation(lens, nf).k} ${unit}`);
  };
  const lenderInactive = lens !== 'loans';
  const holderInactive = lens !== 'capital';
  const lenderSample = f.lender && LENDERS_RESEARCHED.some((l) => l.id === f.lender) ? LENDERS_RESEARCHED.find((l) => l.id === f.lender) : null;
  const optBand = (r: BandRow) => { const s = holderSummary(r.id); return `${r.label}${ROLE_WORDS[r.role] ? ` — ${ROLE_WORDS[r.role]}` : ''} (${s.lines} lines, ${s.aggs} aggregates)`; };
  const activeCount = [f.yFrom != null, !!f.st, !!f.lender, !!f.holder, f.tierSet].filter(Boolean).length;

  const controls = (
    <div className="flex flex-col gap-3 text-[13px]">
      <fieldset className="min-w-0 border-0 p-0 m-0">
        <legend className="font-mono text-[11px] text-text-muted">Year — {yDef}; undated records are shown under all years only</legend>
        <select name="yfrom" aria-label="Year From" value={yFromV} onChange={(e) => setY(e.target.value, yToV)} className="bg-bg-elevated border border-border-light rounded px-1.5 py-1 font-mono text-[12px] mt-1 mr-2">
          <option value="">All years</option>
          {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <span aria-hidden="true" className="text-text-muted mr-2">to</span>
        <select name="yto" aria-label="Year To" value={yToV} onChange={(e) => setY(yFromV, e.target.value)} className="bg-bg-elevated border border-border-light rounded px-1.5 py-1 font-mono text-[12px] mt-1">
          <option value="">All years</option>
          {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <Effect n={n} k={k} tail={yTail} className="block" />
      </fieldset>
      <div className="min-w-0">
        <label htmlFor="fin-state" className="font-mono text-[11px] text-text-muted block">State — {stDef}</label>
        <select id="fin-state" name="st" value={f.st ?? ''} aria-disabled={lens === 'capital' ? 'true' : undefined}
          onChange={(e) => patch({ st: e.target.value || null, tp: null })} className="bg-bg-elevated border border-border-light rounded px-1.5 py-1 font-mono text-[12px] mt-1 max-w-full">
          <option value="">{`All states (${[...stateCounts.values()].reduce((a, b) => a + b, 0)})`}</option>
          {STATES_BY_NAME.map((s) => {
            const c = stateCounts.get(s.id) ?? 0;
            return <option key={s.id} value={s.id} aria-disabled={c === 0 ? 'true' : undefined}>{`${s.name} (${c})`}</option>;
          })}
        </select>
        <Effect n={n} k={k} tail={lens === 'capital' ? `${unit} · does not apply to this lens` : unit} />
      </div>
      <div className="min-w-0">
        <label htmlFor="fin-lender" className="font-mono text-[11px] text-text-muted block">Lender{lenderInactive ? ' — does not apply to this lens' : ''}</label>
        <select id="fin-lender" name="lender" value={f.lender ?? ''} aria-disabled={lenderInactive ? 'true' : undefined}
          onChange={(e) => patch({ lender: e.target.value || null, tp: null })} className="bg-bg-elevated border border-border-light rounded px-1.5 py-1 font-mono text-[12px] mt-1 max-w-full">
          <option value="">All lenders</option>
          <optgroup label="World Bank (census)">
            {LENDERS_CENSUS.map((l) => <option key={l.id} value={l.id}>{`${l.label} (${l.n})`}</option>)}
          </optgroup>
          <optgroup label="Researched sample">
            {LENDERS_RESEARCHED.map((l) => <option key={l.id} value={l.id}>{`${l.label} (${l.n})`}</option>)}
          </optgroup>
        </select>
        <Effect n={n} k={k} tail={lenderInactive ? `${unit} · does not apply to this lens` : unit} />
        {lenderSample && !lenderInactive && <p className="text-[12.5px] text-text-secondary mt-1">{`${lenderSample.label}: a researched sample of ${lenderSample.n} records, not its India portfolio`}</p>}
      </div>
      <div className="min-w-0">
        <label htmlFor="fin-holder" className="font-mono text-[11px] text-text-muted block">Holder — highlights, never isolates{holderInactive ? '; does not apply to this lens' : ''}</label>
        <select id="fin-holder" name="holder" value={f.holder ?? ''} aria-disabled={holderInactive ? 'true' : undefined}
          onChange={(e) => patch({ holder: e.target.value || null })} className="bg-bg-elevated border border-border-light rounded px-1.5 py-1 font-mono text-[12px] mt-1 max-w-full">
          <option value="">All holders</option>
          <optgroup label={BAND_A.some((r) => r.role !== 'comparison') ? 'Always shown: subjects, comparison set and domestic control' : 'Comparison set, always shown'}>{BAND_A.map((r) => <option key={r.id} value={r.id}>{optBand(r)}</option>)}</optgroup>
          <optgroup label="Other holders with a recorded line">{BAND_B.map((r) => <option key={r.id} value={r.id}>{optBand(r)}</option>)}</optgroup>
        </select>
        <Effect n={n} k={k} tail={holderInactive ? `${unit} · does not apply to this lens` : `${unit} · highlights; never isolates`} />
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[11px] text-text-muted">Evidence tier</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {TIER_ORDER.map((t) => (
            <span key={t}>
              <button type="button" aria-pressed={f.tiers.has(t)} onClick={() => toggleTier(t)}
                className={`${TOGGLE} ${f.tiers.has(t) ? 'border-accent text-text' : 'border-border-light text-text-muted line-through'}`}>
                {t} <Dash tier={t} w={18} />
              </button>
            </span>
          ))}
        </div>
        <Effect n={n} k={k} tail={tierTail} />
      </div>
      <p className="text-[12.5px] text-text-muted">
        <a href="#refusals" data-page-copy="" className="underline underline-offset-2 hover:text-accent"
          onClick={(e) => { e.preventDefault(); document.getElementById('refusals')?.scrollIntoView({ block: 'start' }); }}>
          Not offered: party, religion, donor-country and &apos;risk&apos; filters — why →
        </a>
      </p>
    </div>
  );
  if (narrow) {
    return (
      <div>
        <details className="border border-border-light rounded px-3 py-2">
          <summary className="cursor-pointer text-[14px] min-h-[44px] flex items-center">{`Filters (${activeCount}) · ${n} → ${k}`}</summary>
          <div className="mt-2">{controls}</div>
        </details>
        <Effect n={n} k={k} tail={unit} className="block mt-1" />
      </div>
    );
  }
  return <nav aria-label="Filters" className="min-w-0">{controls}</nav>;
}

// ---------------------------------------------------------------------------
// ReadingKey (§5.0.6)
// ---------------------------------------------------------------------------

export const KEY_ROSE = "Rose marks a response or denial, never 'bad'. Amber marks something not recorded.";

export function ReadingKey() {
  const hue = FAM_SPLITS.length
    ? ` ${FAM_SPLITS.map((s) => `${s.pairs.length} ${s.ty} nodes carry different actor families across research files (${s.pairs.join('; ')}); their hue is inconsistent and means nothing.`).join(' ')}`
    : '';
  // No list elements: on a phone this key sits directly under the map's caption, and the
  // moved strip facts must stay the first list after that caption (U25, U26).
  return (
    <div className="text-[13px] text-text-secondary space-y-2 border border-border rounded p-3 my-3" data-reading-key="">
      <h3 className="font-mono text-[12px] text-text-muted tracking-wide">Reading key</h3>
      <p>
        <svg width="16" height="6" aria-hidden="true" className="inline-block mr-2 align-middle"><rect width="16" height="3" y="1.5" fill="var(--color-rose)" /></svg>
        {KEY_ROSE}
      </p>
      <div role="group" aria-label="Line dash is the evidence tier" className="space-y-1">
        {TIER_ORDER.map((t) => <p key={t} className="m-0"><span data-tier={t} className="inline-flex items-center gap-2"><Dash tier={t} /> {t} — {TIERS[t].bar}</span></p>)}
      </div>
      <p role="group" aria-label="Hue is the kind of actor" className="m-0 flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(FAMILY_COLOR) as (keyof typeof FAMILY_COLOR)[]).map((fam) => (
          <span key={fam} className="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill={FAMILY_COLOR[fam]} /></svg>{FAMILY_LABEL[fam]}</span>
        ))}
      </p>
      <p className="text-[12.5px]">Shape is the entity type in the connection graph; size is a declared band, never importance.</p>
      <p className="m-0"><TextureSwatch kind="hatch" />hatch: no record names this</p>
      <p className="m-0"><TextureSwatch kind="stipple" />stipple: records name a body registered here, not a state government</p>
      <p className="m-0"><svg width="16" height="12" aria-hidden="true" className="inline-block mr-2 align-middle"><rect x="0.5" y="0.5" width="15" height="11" fill="none" stroke="currentColor" strokeWidth="1" /></svg>hollow: not named ≥1% in a filing the register holds</p>
      <p>{`No colour on this page stands for a party, a country, a religion or a verdict. Hue is only the kind of actor.${hue}`}</p>
      <p className="text-[12.5px]"><span className="font-mono text-text-muted">Words this page uses: </span><dfn>census</dfn> — the World Bank projects table, enumerated by script, the only population this page sums · <dfn>researched</dfn> — records the research found by hand, listed and never summed · <dfn>record</dfn> — one lending leg (a blended project has an IBRD leg and an IDA leg) · <dfn>placed</dfn> — the record names a state government as borrower or implementer · <dfn>analytic</dfn> — the research&apos;s own comparison or sum, not a filing · <dfn>aggregate</dfn> — a research sum of fund holdings files, a lower bound · <dfn>run id</dfn> — the build of the register these figures come from</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ControlCard (§5.0.7): base rates and symmetry text, grouped by pinned domain
// ---------------------------------------------------------------------------

export const CONTROL_HEADING = 'The same lens on the other side';
export const PINNED: Record<Lens, string[]> = {
  loans: ['worldbank-projects', 'worldbank'],
  associations: ['fcra-actions', 'fcra-receipts', 'political-trusts'],
  capital: ['holders', 'mandates-ventures'],
};

export function BaseRateLine({ r }: { r: { numerator: number | null; denominator: number | null; label: string | null; property: string } }) {
  const both = r.numerator != null && r.denominator != null;
  // One text node per row: the figure and its label read as one sentence, so a share
  // quoted in the label always sits beside the a of b it belongs to.
  const text = both
    ? `${r.property}: ${fmtInt(r.numerator as number)} of ${fmtInt(r.denominator as number)}${r.label ? ` — ${r.label}` : ''}`
    : `${r.property}: not computed in this file${r.label ? ` — ${r.label}` : ''}`;
  return (
    <>
      <span className="fin-q">{text}</span>
      {!both && <span className="ml-2 font-mono text-[11px] text-amber border border-amber/40 rounded px-1">figure in the research file&apos;s wording, not computed by this page</span>}
    </>
  );
}

export function ControlCard({ lens }: { lens: Lens }) {
  const mod = MODULES[lens];
  const domains = PINNED[lens].filter((d) => mod.symmetry.some((s) => s.domain === d) || mod.baseRates.some((r) => r.domain === d));
  return (
    <div className="border border-border rounded p-3 my-3 text-[13.5px]">
      <h2 className="font-serif text-[18px] text-text mb-2">{CONTROL_HEADING}</h2>
      {!domains.length ? (
        <p className="text-amber">No symmetry check recorded for this lens — the control has not been run. This is a gap, not a pass.</p>
      ) : domains.map((d) => (
        <div key={d} className="mb-3">
          <h3 className="font-mono text-[12px] text-text-muted">{d}</h3>
          <ul className="list-none p-0 m-0 space-y-1 my-1">
            {mod.baseRates.filter((r) => r.domain === d).map((r, i) => <li key={i} className="text-[13px]"><BaseRateLine r={r} /></li>)}
          </ul>
          {mod.symmetry.filter((s) => s.domain === d).map((s, i) => <p key={i} className="text-[13.5px] fin-q">{s.text}</p>)}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map metric / scale / flow middle — segmented, with unavailable options named
// ---------------------------------------------------------------------------

export function Segmented({ param, value, options, onPick }: {
  param: string; value: string; options: { v: string; label: string; note?: string; disabled?: string }[]; onPick: (v: string) => void;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1 items-center">
      {options.map((o) => (
        <button key={o.v} type="button" data-param={param} value={o.v} aria-pressed={value === o.v}
          aria-disabled={o.disabled ? 'true' : undefined}
          aria-label={o.disabled ? `${o.label}, unavailable: ${o.disabled}` : undefined}
          onClick={() => { if (!o.disabled) onPick(o.v); }}
          className={`${TOGGLE} ${value === o.v ? 'border-accent text-text' : 'border-border-light text-text-muted'} ${o.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          {o.label}{o.note ? <span className="text-text-muted">{` · ${o.note}`}</span> : null}
        </button>
      ))}
    </span>
  );
}

/** Share of a population only over a large enough denominator; else nothing. */
export const shareText = (a: number, b: number) => (b >= SHARE_FLOOR ? ` (${((100 * a) / b).toFixed(1)}%)` : '');
export { AGG_RECIPIENT, Q };
