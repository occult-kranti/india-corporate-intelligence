import { type ReactNode } from 'react';
import type { GEdge, Tier } from '../../graph/schema';
import type { SecurityFile } from '../../data/cppp';
import {
  type Lens, type BudgetRow, LENS_DOMAINS, EMPTY, NOTHING, NO_BUDGET_ROWS, CONTROL_EMPTY, BUDGETS, UNION_ROWS, FY_AXIS, STAGES, MOD, PAY_LAWS, CONTRACTS, LAWS,
  responseChain, responderWords, leftResponder, benefitOf, officeOn, labelOf, nodeOf, EDGES, analyticOfDomain, symmetryOf, baseRatesOf, rowTier, fmtCr, DELHI_POLICE, DELHI_ROWS, DELHI_POINTS, DELHI_LINE, delhiLineAt, type DelhiPoint, LANES, cellParam, COMMISSIONERATES, CITY_POLICE_TEXT, CITY_STRENGTH_VOID, strengthOfBody, stateName,
  fmtInt, NATIONAL_STATE_RECORDS, UNFILED_STATE_RECORDS, GRANT_SPLIT, countWord, fileOf, FOOTPRINT, GRANT_ROWS, GRANT_FYS, grantStageWord, budgetPass, lensPopulation, crContext, ZERO_WORDS, NO_RESPONSE, fyStart, kindWord, last,
} from '../../data/securityView';
import {
  usePage, QBlock, Caption, Twin, TwinTable, Exports, captionText, Src, Quote, Tx, Lab, TierWord, Roving, Anchor, Denominator, NoMatch, Pager, FOCUS, SkipLink, End, type Row, type Col,
} from './ui';
import { DemandStack, Q1 } from './Stack';
import { OfficeLanes, LineLedger, Q2, Q3 } from './Ledger';
import { BaseRateSection, CompareTwin, C5_TEXT, CannotShow, Fold, Responder, ResponseHead } from './Shared';
import { StatePair, Q6 } from './StatePair';

/**
 * The Budgets lens (§5.1): nine numbered answers on one stage. Q1–Q3 and Q6 live in their
 * own modules; this file holds the comparisons (Q4), the contracts with people (Q5), the
 * one city budget (Q7), the grants to states (Q8) and the lens's cannot-show block (Q9).
 */

const Q4 = 'Q4 — Compared with what?';
const Q5 = 'Q5 — Who is paid, and on what terms?';
const Q7 = 'Q7 — Which city has a police budget?';
const Q8 = 'Q8 — What does the Union give the states for police?';

export function BudgetsLens({ slice, fyCurrent, setFyCurrent }: { slice: SecurityFile | null | undefined; fyCurrent: string | null; setFyCurrent: (fy: string) => void }) {
  const { f } = usePage();
  const pop = lensPopulation(f);
  return (
    <>
      <QBlock q="B1" title={Q1} className="relative"><NoMatch k={pop.k} n={pop.n} /><DemandStack fyCurrent={fyCurrent} setFyCurrent={setFyCurrent} slice={slice} /></QBlock>
      <QBlock q="B2" title={Q2}><OfficeLanes /></QBlock>
      <QBlock q="B3" title={Q3}><NoMatch k={pop.k} n={pop.n} /><LineLedger /></QBlock>
      <QBlock q="B4" title={Q4}><CompareBlock lens="budgets" /></QBlock>
      <QBlock q="B5" title={Q5}><PayTerms /></QBlock>
      <QBlock q="B6" title={Q6}><StatePair /></QBlock>
      <QBlock q="B7" title={Q7}><CityBlock /></QBlock>
      <QBlock q="B8" title={Q8}><Grants /></QBlock>
      <CannotShow lens="budgets" q="B9" n={9} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Q4 — Compared with what? (CompareBlock, one per lens)
// ---------------------------------------------------------------------------

export function CompareBlock({ lens, domains: only }: { lens: Lens; domains?: string[] }) {
  const domains = only ?? LENS_DOMAINS[lens];
  if (EMPTY) return <p data-page-copy="" className="text-[14px]">{NOTHING}</p>;
  const missing = domains.filter((d) => !symmetryOf(d));
  return (
    <div id={lens === 'procurement' ? undefined : 'baserates'} aria-describedby={`sec-c5-${lens}`}>
      <Roving label="Base rates, their sources and the symmetry texts">
        {domains.map((d) => <BaseRateSection key={d} domain={d} roving={false} extra={d === 'state-police' && (NATIONAL_STATE_RECORDS.length || UNFILED_STATE_RECORDS.length) ? <NationalRecords /> : undefined} />)}
      </Roving>
      {missing.length > 0 && missing.every((d) => !baseRatesOf(d).length) && <p className="text-[14px] text-amber">{CONTROL_EMPTY}</p>}
      <Caption id={`sec-c5-${lens}`} cap="C5">{C5_TEXT}</Caption>
      <CompareTwin domains={domains} title={lens === 'footprint' ? 'Q4 — Compared with what?' : lens === 'procurement' ? 'Base rates in the procurement chapters' : Q4} />
    </div>
  );
}

/**
 * The state-police comparisons made by a national body (the party-group medians, the two
 * custody counts): they compare states, so they sit here beside the base rates, quoted whole
 * with every set and coding they carry, never filed under the one state whose capital
 * houses the body that published them.
 */
/** C10's source words, from the per-state rows' own sources: a Parliament answer is named as one, anything else as a document. */
const capWord = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
function grantDocWords() {
  const n = GRANT_SPLIT.sources.length;
  const kind = GRANT_SPLIT.sources.every((l) => /Lok Sabha|Rajya Sabha/.test(l)) ? 'Parliament answer' : 'document';
  return `${countWord(n)} ${kind}${n === 1 ? '' : 's'}`;
}
function NationalRecords() {
  const { f } = usePage();
  const shown = NATIONAL_STATE_RECORDS.filter((e) => f.tiers.has(e.tier));
  // Rendered inside the state-police file's section, so below 640px it folds with that file's base rates (SG-53).
  return (
    <section aria-labelledby="sec-br-national" className="mt-4 border-t border-border pt-2 min-w-0">
      <h4 id="sec-br-national" className="text-[14px] font-semibold text-text mb-1">Comparisons across states in the state-police research file</h4>
      <p data-page-copy="" className="text-[13.5px] text-text-secondary m-0 mb-1 max-w-[80ch]">{`${NATIONAL_STATE_RECORDS.length} records compare groups of states or two national counts. Each is quoted whole, with every set and coding it states, and none is placed on any one state.`}</p>
      {UNFILED_STATE_RECORDS.length > 0 && <p data-page-copy="" className="text-[13.5px] text-amber m-0 mb-1">{`${UNFILED_STATE_RECORDS.length} records have a source that is neither a state's police nor a declared national body, so they are filed under no state: ${UNFILED_STATE_RECORDS.map((e) => e.id).join(', ')}.`}</p>}
      {shown.length < NATIONAL_STATE_RECORDS.length && <p className="text-[13px] text-text-secondary m-0">{`${NATIONAL_STATE_RECORDS.length - shown.length} records hidden by the tier filter — not absent`}</p>}
      <ul className="list-none p-0 m-0 space-y-3">
        {shown.map((e) => (
          <li key={e.id} className="text-[14px] border-l border-border-light pl-2">
            <Quote record={e}>{e.lab}</Quote>{' '}<TierWord tier={e.tier} />
            {e.d && <Quote as="p" className="text-[13.5px] text-text-secondary m-0 mt-1" record={e}>{e.d}</Quote>}
            {e.innocentReading && <span className="block mt-1"><Tx>the reading in which nothing is wrong: </Tx><Quote record={e}>{e.innocentReading}</Quote></span>}
            <Src srcs={e.srcs} of={e.lab ?? e.id ?? 'record'} inline record={e} />
            <span className="block font-mono text-[12px] text-text-muted">{`record ${e.id}, quoted from the ${fileOf(e)} research file`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Q5 — Who is paid, and on what terms? (PayTerms + ContractCards)
// ---------------------------------------------------------------------------

const COLUMN_RULE = "Columns are assigned by the responder's kind: ministries and state agencies left; parties, veterans' bodies and petitioners right. The rule is applied to the record's node type and family, never by hand.";
const CONTRACT_DTS = ['Who', 'What the record says', 'Cost or saving stated by the Ministry', 'Office on the date', 'Responses', 'Sources'];

function PayTerms() {
  const { f, patch, announce, filterWords, narrow } = usePage();
  if (EMPTY) return <p data-page-copy="" className="text-[14px]">{NOTHING}</p>;
  const pay = PAY_LAWS.filter((e) => f.tiers.has(e.tier));
  // The post class is the record's own node label, so it is a cell, not a row header the page writes.
  const cols: Col[] = [{ key: 'post', label: 'Post class' }, { key: 'lvl', label: 'Pay level and entry pay as the record states' }, { key: 'rule', label: 'Rule' }, { key: 'from', label: 'From' }, { key: 'tier', label: 'Tier' }, { key: 'src', label: 'Sources' }];
  const payRows: Row[] = pay.map((e) => ({
    cells: [<Lab id={e.t} />, <Quote>{e.lab}</Quote>, <Lab id={e.s} />, e.from ?? 'not recorded', <TierWord tier={e.tier} />, <Src srcs={e.srcs} of={e.lab ?? e.id ?? 'pay level'} inline />],
    attrs: /Level 3\b/.test(e.lab ?? '') ? { id: 'sec-pay-l3' } : undefined,
    out: [labelOf(e.t), e.lab ?? '', labelOf(e.s), e.from ?? '', e.tier, (e.srcs ?? []).map(([, u]) => u).join(' ')],
  }));
  const analytic = analyticOfDomain('pay-pensions').filter((e) => f.tiers.has(e.tier));
  const contracts = CONTRACTS.filter((e) => f.tiers.has(e.tier));
  const respRows: Row[] = contracts.flatMap((k) => {
    const chain = responseChain(k.id);
    if (!chain.length) return [{ cells: [<Quote>{k.lab}</Quote>, 'right', 'not recorded', 'not recorded', 'not recorded', NO_RESPONSE, 'not recorded'], out: [k.lab ?? '', 'right', '', '', '', NO_RESPONSE, ''] }];
    return chain.map((c) => ({
      cells: [<Quote>{k.lab}</Quote>, leftResponder(c.edge.s) ? 'left' : 'right', <Responder r={c.edge} />, c.edge.from ?? 'undated response', <TierWord tier={c.edge.tier} />, <><Quote>{c.edge.lab}</Quote>{c.edge.d ? <><Tx> — </Tx><Quote>{c.edge.d}</Quote></> : null}</>, <Src srcs={c.edge.srcs} of={c.edge.lab ?? 'response'} inline />],
      out: [k.lab ?? '', leftResponder(c.edge.s) ? 'left' : 'right', responderWords(c.edge), c.edge.from ?? '', c.edge.tier, `${c.edge.lab ?? ''}${c.edge.d ? ` — ${c.edge.d}` : ''}`, (c.edge.srcs ?? []).map(([, u]) => u).join(' ')],
    }));
  });
  return (
    <>
      <p data-page-copy="" className="text-[14px] text-text-secondary max-w-[80ch]">
        Pay and pensions in the Union demands are lines inside the revenue demands and the Defence Pensions demand; the stack above brackets them, and the ledger has their rows.{' '}
        <button type="button" className={`underline underline-offset-2 ${FOCUS}`} onClick={() => { patch({ comp: 'pay,pension' }); announce('the ledger now shows the pay and pension lanes; the stack is unchanged', 0); requestAnimationFrame(() => document.getElementById('sec-B3-h')?.scrollIntoView({ block: 'start' })); }}>
          Pay and pension lanes in the ledger →
        </button>
      </p>
      <h4 className="text-[14px] font-semibold text-text mt-3 mb-1">Pay levels, by post and never by person</h4>
      <Roving label="Pay levels and their sources">
        {pay.length ? <Fold on={narrow} summary={`${pay.length} pay levels, by post and never by person, with their rules and sources`}><TwinTable caption={`${pay.length} pay levels as the record states them · read to the run`} cols={cols} rows={payRows} amounts={false} /></Fold> : <p className="text-[14px]">No pay level recorded.</p>}
      </Roving>
      {analytic.length > 0 && (
        <Roving label="The research's own comparisons of pay and pensions">
          <Fold on={narrow} summary={`${analytic.length} comparisons of pay and pensions the research computed, each with its innocent reading`}>
          <ul className="list-none p-0 m-0 mt-3 space-y-2 text-[14px] text-text-secondary">
            {analytic.map((e) => (
              <li key={e.id} className="border-l border-border-light pl-2">
                <Quote>{e.lab}</Quote>
                {e.innocentReading && <span className="block"><span className="font-mono text-[12px] text-text-muted">the reading in which nothing is wrong: </span><Quote>{e.innocentReading}</Quote></span>}
                <span className="block font-mono text-[12px] text-text-muted">{`${e.tier} · pay-pensions research file`}</span>
                <Src srcs={e.srcs} of={e.lab ?? e.id ?? 'comparison'} inline /><End />
              </li>
            ))}
          </ul>
          </Fold>
        </Roving>
      )}
      <h4 className="text-[14px] font-semibold text-text mt-4 mb-1">Contracts with people: the terms beside the objections</h4>
      {contracts.length ? (
        <Roving label="Contract cards, their responses and sources">
          <div className="space-y-4" aria-describedby="sec-c6">{contracts.map((k) => <Fold key={k.id} on={narrow} summary={`${labelOf(k.s)} → ${labelOf(k.t)}, ${k.from ?? 'undated'}: the terms beside the objections`}><ContractCard k={k} /></Fold>)}</div>
        </Roving>
      ) : <p className="text-[14px]">No contract recorded.</p>}
      <Caption id="sec-c6" cap="C6">Pay levels are the Pay Commission&apos;s, for a rank, never a person. A contract card sets the terms and the Ministry&apos;s stated case beside the objections and the answers, with the same fields at the same size; the column a response sits in is decided by the kind of body that made it, and neither column is a verdict. A saving the Ministry has not published is recorded as absent, not estimated.</Caption>
      <Twin twin="pay" title="Pay levels" rowCount={payRows.length}>
        {() => (
          <>
            <Exports name="Pay levels" twin="pay" meta={{ table: 'Pay levels', population: `${PAY_LAWS.length} pay rules in the pay-pensions research file`, rows: payRows.length }} header={['post_class', 'pay_level_as_recorded', 'rule', 'from', 'tier', 'source_urls']} rows={() => payRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(payRows.length, 'pay rules as the record states them', filterWords)} amounts={false} cols={cols} rows={payRows.map((r) => ({ ...r, attrs: undefined }))} />
          </>
        )}
      </Twin>
      <Twin twin="contracts" title="Contract responses" rowCount={respRows.length}>
        {() => (
          <>
            <Exports name="Contract responses" twin="contracts" meta={{ table: 'Contract responses', population: `${CONTRACTS.length} contracts and every recorded response to them`, rows: respRows.length }} header={['contract', 'column', 'responder', 'date', 'tier', 'text', 'source_urls']} rows={() => respRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(respRows.length, 'responses to the contracts, by column', filterWords)} cols={[{ key: 'k', label: 'Contract', th: true }, { key: 'col', label: 'Column' }, { key: 'who', label: 'Responder' }, { key: 'd', label: 'Date' }, { key: 't', label: 'Tier' }, { key: 'x', label: 'Text' }, { key: 's', label: 'Sources' }]} rows={respRows} />
          </>
        )}
      </Twin>
      <p className="sr-only">{`${LAWS.length} pay and contract records in the pay-pensions research file`}</p>
    </>
  );
}

function sideResponses(k: GEdge, left: boolean): ReactNode {
  const chain = responseChain(k.id).filter((c) => leftResponder(c.edge.s) === left);
  if (!chain.length) return <p className="m-0 text-text-secondary">{NO_RESPONSE}</p>;
  return (
    <ul className="list-none p-0 m-0 space-y-1.5">
      {chain.map((c) => (
        <li key={c.edge.id} className="border-l-2 border-border-light pl-2">
          {c.depth > 1 ? <><Tx>in reply to </Tx><Lab id={c.parent.s} /><Tx>{`, ${c.edge.from ?? 'undated'}: `}</Tx></> : <><ResponseHead r={c.edge} /><Tx> </Tx></>}
          <Quote>{c.edge.lab}</Quote>{c.edge.d ? <><Tx> — </Tx><Quote>{c.edge.d}</Quote></> : null}
          {c.depth > 1 && <span className="block text-[13px]"><Responder r={c.edge} /><Tx>{` · ${c.edge.tier}`}</Tx></span>}
        </li>
      ))}
    </ul>
  );
}

function ContractCard({ k }: { k: GEdge }) {
  const b = benefitOf(k.id);
  const chain = responseChain(k.id);
  const courts = EDGES.filter((e) => e.pred === 'enforce' && e.t === k.s);
  const holders = officeOn(k.from, MOD) ?? [];
  // One entry per distinct responder, in the record's words; the audit's denials are named as the audit's.
  const rightWho = chain.filter((c) => !leftResponder(c.edge.s)).map((c) => c.edge)
    .filter((e, i, xs) => xs.findIndex((x) => responderWords(x) === responderWords(e)) === i);
  const leftSrcs = [...(k.srcs ?? []), ...chain.filter((c) => leftResponder(c.edge.s)).flatMap((c) => c.edge.srcs ?? [])];
  const rightSrcs = [...courts.flatMap((e) => e.srcs ?? []), ...chain.filter((c) => !leftResponder(c.edge.s)).flatMap((c) => c.edge.srcs ?? [])];
  const agni = /agnipath/i.test(`${k.s} ${k.lab}`);
  const dd = 'm-0 text-[14px] text-text-secondary min-w-0 break-words';
  const dt = 'font-mono text-[12px] text-text-muted mt-2';
  // A cell whose whole value is an amber absence carries the amber on the cell itself.
  const col = (cells: ReactNode[], amber: number[] = []) => (
    <dl className="m-0 min-w-0">
      {CONTRACT_DTS.map((t, i) => <div key={t}><dt className={dt}>{t}</dt><dd className={amber.includes(i) ? dd.replace('text-text-secondary', 'text-amber') : dd}>{cells[i]}</dd></div>)}
    </dl>
  );
  return (
    <article className="border border-border rounded p-3 min-w-0">
      <h5 className="text-[14px] font-semibold text-text m-0"><Lab id={k.t} /><Tx>{`: the terms from ${k.from ?? 'an undated record'}`}</Tx></h5>
      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3 mt-2">
        <div className="min-w-0">
          <h6 className="text-[13px] font-semibold text-text m-0">The terms and the stated case</h6>
          {col([
            <><Lab id={k.s} /><Tx> → </Tx><Lab id={k.t} /><Tx>{` [${k.tier}]`}</Tx></>,
            <><Quote>{k.lab}</Quote>{k.d ? <><Tx> — </Tx><Quote>{k.d}</Quote></> : null}</>,
            b && b.amountCr != null
              ? <span data-cr={b.amountCr}><Tx>{`₹${fmtCr(b.amountCr)} cr (${b.confidence ?? 'confidence not stated'}) — cost or saving stated by the Ministry; no denominator published for this line; previous year not applicable`}</Tx>{b.how ? <><Tx> — </Tx><Quote>{b.how}</Quote></> : null}</span>
              : <><span className="text-amber">no stated saving recorded</span>{b?.how ? <><Tx> — </Tx><Quote>{b.how}</Quote></> : null}</>,
            holders.length ? holders.map((w) => `${labelOf(w.s)} (${w.from ?? 'start not recorded'} – ${w.to ?? 'end not recorded'})`).join('; ') : `no recorded office window covers ${k.from ?? 'an undated record'}`,
            sideResponses(k, true),
            leftSrcs.length ? <Src srcs={leftSrcs} of={`${k.lab ?? k.id}, terms`} inline /> : <span className="text-amber">no source in file</span>,
          ], [...(!(b && b.amountCr != null) && !b?.how ? [2] : []), ...(leftSrcs.length ? [] : [5])])}
        </div>
        <div className="min-w-0">
          <h6 className="text-[13px] font-semibold text-text m-0">The stated objections and the answers</h6>
          {col([
            rightWho.length ? <>{rightWho.map((e, i) => <span key={e.id}>{i ? <Tx>; </Tx> : null}<Responder r={e} /></span>)}</> : 'none recorded',
            courts.length ? <>{courts.map((e) => <span key={e.id} className="block"><Lab id={e.s} /><Tx>{`, ${e.from ?? 'undated'} [${e.tier}]: `}</Tx><Quote>{e.lab}</Quote>{e.d ? <><Tx> — </Tx><Quote>{e.d}</Quote></> : null}</span>)}</> : 'no court holding recorded',
            b?.amountCr != null ? 'not applicable: a cost is stated by the Ministry, in the left column' : 'not applicable: no cost or saving is stated by the Ministry',
            'not applicable: the office is on the left',
            sideResponses(k, false),
            rightSrcs.length ? <Src srcs={rightSrcs} of={`${k.lab ?? k.id}, objections`} inline /> : 'none recorded',
          ])}
        </div>
        {agni && (
          <p className="text-[14px] text-text-secondary m-0 sm:col-span-2">
            The record does not join the Agnipath terms to the terms they replaced (prerequisite S13). The regular-entry pay level for the same post class is in{' '}
            <Anchor to="sec-pay-l3">the pay table above</Anchor>.
          </p>
        )}
        <p data-page-copy="" className="font-mono text-[12px] text-text-muted m-0 sm:col-span-2">{COLUMN_RULE}</p>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Q7 — Which city has a police budget? (DelhiLine + CityLedger)
// ---------------------------------------------------------------------------

const delhiFys = [...new Set(DELHI_ROWS.map((r) => r.fy))].sort();
const DELHI_TOTAL_LANE = LANES.find((l) => l.body === DELHI_POLICE && l.component === 'total') ?? LANES.find((l) => l.body === DELHI_POLICE) ?? null;

function CityBlock() {
  const { f, filterWords, openCell } = usePage();
  if (EMPTY) return <p data-page-copy="" className="text-[14px]">{NOTHING}</p>;
  const pts = DELHI_LINE.filter((p) => p.total && f.tiers.has(rowTier(p.total)));
  const delhiRows: Row[] = pts.map((d) => {
    const { fy, stage } = d;
    const t = d.total!;
    const share = d.shareOfPolice != null ? `${d.shareOfPolice}% of the Police demand total, computed here` : 'no Police demand total for this FY';
    const lane = DELHI_TOTAL_LANE;
    return {
      cells: [`FY${fy}`, stage, <span data-cr={t.cr}>{`₹${fmtCr(t.cr)} cr`}</span>, d.revenue ? <span data-cr={d.revenue.cr}>{`₹${fmtCr(d.revenue.cr)} cr`}</span> : 'no row in this register', d.capital ? <span data-cr={d.capital.cr}>{`₹${fmtCr(d.capital.cr)} cr`}</span> : 'no row in this register', share, rowTier(t), <Src srcs={t.srcs} of={`Delhi Police ${fy} ${stage}`} inline />,
        lane ? <button type="button" aria-label={`Open the line: Delhi Police ${fy} ${stage}`} className={`underline underline-offset-2 font-mono text-[12px] ${FOCUS}`} onClick={(e) => openCell(cellParam(lane, fy), e.currentTarget)}>{`line ${fy} ${stage} ↗`}</button> : 'no lane'],
      out: [fy, stage, t.cr, d.revenue?.cr ?? '', d.capital?.cr ?? '', d.shareOfPolice ?? '', rowTier(t), t.srcs.map(([, u]) => u).join(' ')],
    };
  });
  return (
    <>
      <p data-page-copy="" className="text-[14px] text-text">{delhiFys.length ? `One: Delhi Police, a Union demand line, FY${delhiFys[0]}–FY${last(delhiFys)}. Every other city's police money is inside its state's police head.` : `${NO_BUDGET_ROWS} Every other city's police money is inside its state's police head.`}</p>
      <DelhiLine pts={pts} />
      <Caption id="sec-c8" cap="C8">Delhi Police is the only city police force with its own budget line, because the Union pays for it through the Police demand. Every other city&apos;s police is paid from its state&apos;s police head and has no published budget of its own; the city ledger says so for each commissionerate the record holds.</Caption>
      <CityLedger lens="budgets" />
      <Twin twin="delhi" title="The one city police budget" rowCount={delhiRows.length}>
        {() => (
          <>
            <Exports name="Delhi Police by FY and stage" twin="delhi" meta={{ table: 'Delhi Police by FY and stage', population: `${DELHI_POINTS.length} (FY, stage) points with a Delhi Police row`, rows: delhiRows.length, amounts: 'BE, RE and actual, as each row states' }}
              header={['fy', 'stage', 'total_cr', 'revenue_cr', 'capital_cr', 'pct_of_police_demand', 'tier', 'source_urls']} rows={() => delhiRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(delhiRows.length, 'Delhi Police rows, one per FY and stage', filterWords)} cols={[{ key: 'fy', label: 'FY', th: true }, { key: 'st', label: 'Stage' }, { key: 't', label: 'Total' }, { key: 'r', label: 'Revenue' }, { key: 'c', label: 'Capital' }, { key: 's', label: 'Share of the Police demand' }, { key: 'tier', label: 'Tier' }, { key: 'src', label: 'Sources' }, { key: 'o', label: 'Open' }]} rows={delhiRows} />
          </>
        )}
      </Twin>
      <CityLedgerTwin />
    </>
  );
}

/** Three lines on the stack's FY axis, points only where a row exists, no line across a missing FY. */
function DelhiLine({ pts }: { pts: DelhiPoint[] }) {
  const W = 640, H = 150, L = 46, R = 12, T = 10, B = 24;
  const max = Math.max(1, ...pts.map((p) => p.total!.cr));
  const x = (fy: string) => L + (FY_AXIS.indexOf(fy) / Math.max(1, FY_AXIS.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const runs: { stage: string; fys: string[] }[] = [];
  for (const s of STAGES) {
    let cur: string[] = [];
    for (const fy of FY_AXIS) {
      if (pts.some((p) => p.fy === fy && p.stage === s)) cur.push(fy);
      else if (cur.length) { runs.push({ stage: s, fys: cur }); cur = []; }
    }
    if (cur.length) runs.push({ stage: s, fys: cur });
  }
  const val = (fy: string, s: string) => pts.find((p) => p.fy === fy && p.stage === s)!.total!.cr;
  const dash = (fy: string, s: string) => (rowTier(pts.find((p) => p.fy === fy && p.stage === s)!.total!) === 'reported' ? '6 3' : undefined);
  return (
    <figure className="m-0 my-2 min-w-0" aria-describedby="sec-c8">
      <h4 className="text-[14px] font-semibold text-text m-0 mb-1">The one city police budget</h4>
      <SkipLink twin="delhi" title="The one city police budget" />
      <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto max-h-[200px]">
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--color-border-light)" />
        {runs.map((r, i) => (
          <path key={i} d={r.fys.map((fy, j) => `${j ? 'L' : 'M'}${x(fy).toFixed(1)} ${y(val(fy, r.stage)).toFixed(1)}`).join(' ')} fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.4" />
        ))}
        {pts.map((p) => {
          const cx = x(p.fy), cy = y(p.total!.cr);
          return p.stage === 'BE'
            ? <circle key={`${p.fy}${p.stage}`} data-mark="delhi" cx={cx} cy={cy} r="3" fill="var(--color-text-secondary)" stroke="var(--color-text)" strokeWidth="0.8" strokeDasharray={dash(p.fy, p.stage)} />
            : <rect key={`${p.fy}${p.stage}`} data-mark="delhi" x={cx - 2.6} y={cy - 2.6} width="5.2" height="5.2" transform={p.stage === 'actual' ? `rotate(45 ${cx} ${cy})` : undefined} fill="var(--color-text-secondary)" stroke="var(--color-text)" strokeWidth="0.8" strokeDasharray={dash(p.fy, p.stage)} />;
        })}
        <text x={L} y={H - 6} fontSize="12" fill="var(--color-text-muted)">{FY_AXIS[0]}</text>
        <text x={W - R} y={H - 6} fontSize="12" textAnchor="end" fill="var(--color-text-muted)">{last(FY_AXIS)}</text>
        <text x={L - 4} y={T + 8} fontSize="12" textAnchor="end" fill="var(--color-text-muted)">{fmtInt(Math.round(max))}</text>
      </svg>
      <p data-page-copy="" className="font-mono text-[12px] text-text-muted my-1">{`${pts.length} points (FY × stage) with a Delhi Police total · ₹ crore, nominal, as published · circle BE, square RE, diamond actual · no line crosses a missing FY`}</p>
    </figure>
  );
}

/** The tier filter reaches the city ledger as it reaches every twin: a row whose record is off is not drawn. */
function cityRows(lens: Lens, forTwin: boolean, tiers: Set<Tier>): { rows: Row[]; out: (string | number)[][]; sts: string[] } {
  const rows: Row[] = [];
  const sts: string[] = [];
  const out: (string | number)[][] = [];
  const dBe = [...new Set(DELHI_ROWS.filter((r) => r.stage === 'BE').map((r) => r.fy))].sort();
  const latestBe = last(dBe);
  const tot = latestBe ? delhiLineAt(latestBe, 'BE')?.total ?? null : null;
  const dStr = strengthOfBody(DELHI_POLICE);
  const dInst = FOOTPRINT.filter((r) => r.st === 'dl').length;
  const ctx = tot ? crContext(tot) : null;
  if (tiers.has(tot ? rowTier(tot) : 'documented')) {
  sts.push('dl');
  rows.push({
    cells: ['Delhi', stateName('dl'), labelOf(DELHI_POLICE),
      tot ? <><span data-cr={tot.cr}>{`₹${fmtCr(tot.cr)} cr BE ${latestBe} — the Police demand (Union) — ${ctx!.denom} · ${ctx!.compare}`}</span>{!forTwin && <> · <Anchor to="sec-B7-h">the Delhi line</Anchor></>}</> : NO_BUDGET_ROWS,
      dStr.length ? dStr.map((s) => `${s.year}: ${s.sanctioned != null ? `sanctioned ${fmtInt(s.sanctioned)}` : 'sanctioned not recorded'}; ${s.actual != null ? `actual ${fmtInt(s.actual)}` : 'actual not recorded'} (${rowTier(s)})`).join(' · ') : CITY_STRENGTH_VOID,
      dInst ? `${dInst} installations in this register` : 'none recorded'],
  });
  out.push(['Delhi', stateName('dl'), labelOf(DELHI_POLICE), tot ? `₹${fmtCr(tot.cr)} cr BE ${latestBe} — the Police demand (Union)` : NO_BUDGET_ROWS, dStr.length ? `${dStr.length} strength rows` : CITY_STRENGTH_VOID, dInst, (tot?.srcs ?? []).map(([, u]) => u).join(' ')]);
  }
  for (const c of COMMISSIONERATES) {
    if (!tiers.has(rowTier(c))) continue;
    sts.push(c.st);
    const st = stateName(c.st);
    const s = strengthOfBody(c.body);
    const inst = FOOTPRINT.filter((r) => r.city === c.city && r.st === c.st);
    const kinds = [...new Set(inst.map((r) => kindWord(r.kind)))].join(', ');
    rows.push({
      cells: [c.city, st, labelOf(c.body),
        <><span data-city-body={c.body}>{CITY_POLICE_TEXT(st)}</span>{!forTwin ? ' ' : ' · '}<StateLink st={c.st} city={c.city} /></>,
        s.length ? s.map((x) => `${x.year}: ${x.sanctioned != null ? `sanctioned ${fmtInt(x.sanctioned)}` : 'sanctioned not recorded'} (${rowTier(x)})`).join(' · ') : CITY_STRENGTH_VOID,
        inst.length ? `${inst.length} installation${inst.length === 1 ? '' : 's'}${lens === 'footprint' ? `: ${kinds}` : ''}` : 'none recorded'],
    });
    out.push([c.city, st, labelOf(c.body), CITY_POLICE_TEXT(st), s.length ? `${s.length} strength rows` : CITY_STRENGTH_VOID, inst.length, c.srcs.map(([, u]) => u).join(' ')]);
  }
  return { rows, out, sts };
}
function StateLink({ st, city }: { st: string; city: string }) {
  const { patch, announce } = usePage();
  return (
    <button type="button" aria-label={`${stateName(st)}'s police head, which pays the ${city} commissionerate`} className={`underline underline-offset-2 text-left ${FOCUS}`}
      onClick={() => { patch({ st, lens: null }); announce(`${stateName(st)}: its police head`, 0); requestAnimationFrame(() => document.getElementById('sec-B6-h')?.scrollIntoView({ block: 'start' })); }}>
      {`${stateName(st)}'s police head →`}
    </button>
  );
}
const CITY_COLS: Col[] = [{ key: 'city', label: 'City', th: true }, { key: 'st', label: 'State' }, { key: 'body', label: 'Body' }, { key: 'b', label: 'Budget' }, { key: 's', label: 'Strength' }, { key: 'i', label: 'Installations in that city' }];

/** The city ledger (§5.1.7), mounted on Budgets Q7 and Footprint Q3: Delhi first, then every commissionerate the record holds. */
export function CityLedger({ lens }: { lens: Lens }) {
  const { f, filterWords, narrow } = usePage();
  if (EMPTY) return <p data-page-copy="" className="text-[14px]">{NOTHING}</p>;
  const { rows, sts } = cityRows(lens, false, f.tiers);
  // Below 640px the selected state's rows stay open and the rest sit behind one summary.
  const mine = rows.filter((_, i) => sts[i] === f.st);
  const rest = rows.filter((_, i) => sts[i] !== f.st);
  const states = new Set(COMMISSIONERATES.map((c) => c.st)).size;
  return (
    <div className="mt-3 min-w-0">
      <h4 className="text-[14px] font-semibold text-text m-0 mb-1">City police: what is recorded</h4>
      <Denominator>{COMMISSIONERATES.length ? `${COMMISSIONERATES.length} commissionerates recorded in ${states} states · not every commissionerate: the national list is unreachable` : 'No commissionerate in this register.'}</Denominator>
      {!rows.length && <NoMatch k={0} n={1 + COMMISSIONERATES.length} />}
      <Roving label="City ledger links" describedBy={`sec-c9-${lens}`}>
        {narrow && mine.length > 0 && <TwinTable caption={captionText(mine.length, `${stateName(f.st!)}: the selected state's rows`, filterWords)} cols={CITY_COLS} rows={mine} minWidth="56rem" />}
        <Fold on={narrow} summary={`${narrow && mine.length ? `The other ${rest.length} rows` : `Delhi Police and ${COMMISSIONERATES.length} commissionerates`}: where the money sits, strength, installations`}>
          <TwinTable caption={captionText(narrow ? rest.length : rows.length, 'Delhi Police and every commissionerate the record places', filterWords)} cols={CITY_COLS} rows={narrow ? rest : rows} minWidth="56rem" />
        </Fold>
      </Roving>
      <Caption id={`sec-c9-${lens}`} cap="C9">A city police commissionerate is paid from its state&apos;s police head. No state publishes a city&apos;s police budget, so this table prints where the money sits instead of a number, and computes no estimate. Delhi is the exception because its police is a Union force with its own line. A commissionerate is listed because a primary list names it; the national list is unreachable, so this is not every commissionerate.</Caption>
    </div>
  );
}
export function CityLedgerTwin() {
  const { f, filterWords } = usePage();
  if (EMPTY) return null;
  const { rows, out } = cityRows('budgets', true, f.tiers);
  return (
    <Twin twin="city-ledger" title="City police: what is recorded" rowCount={rows.length}>
      {() => (
        <>
          <Exports name="City police ledger" twin="city-ledger" meta={{ table: 'City police ledger', population: `Delhi Police and ${COMMISSIONERATES.length} commissionerates`, rows: rows.length }}
            header={['city', 'state', 'body', 'budget', 'strength', 'installations_in_city', 'source_urls']} rows={() => out} />
          <TwinTable caption={captionText(rows.length, 'Delhi Police and every commissionerate the record places', filterWords)} cols={CITY_COLS} rows={rows} minWidth="56rem" />
        </>
      )}
    </Twin>
  );
}

// ---------------------------------------------------------------------------
// Q8 — Grants to states (a table: the recipient is in the line's text, not a field)
// ---------------------------------------------------------------------------

function Grants() {
  const { f, filterWords, patch } = usePage();
  if (EMPTY) return <p data-page-copy="" className="text-[14px]">{NOTHING}</p>;
  if (!BUDGETS.length) return <p data-page-copy="" className="text-[14px]">{NO_BUDGET_ROWS}</p>;
  const shown = GRANT_ROWS.filter((r) => budgetPass(f, r));
  const pages = Math.max(1, Math.ceil(shown.length / 400));
  const page = Math.min(f.tp, pages);
  const slice = shown.slice((page - 1) * 400, page * 400);
  const rows: Row[] = slice.map((r) => ({
    cells: [<Quote>{r.head}</Quote>, `FY${r.fy}`, grantStageWord(r), r.cr === 0 ? <span data-cr={0}>{`${ZERO_WORDS} — ${crContext(r).denom}`}</span> : <GrantCr r={r} />, rowTier(r), <Src srcs={r.srcs} of={`${r.head.slice(0, 60)} FY${r.fy}`} inline />],
  }));
  const out = () => shown.map((r) => [r.head, r.fy, fyStart(r.fy), r.stage, grantStageWord(r), r.cr, rowTier(r), r.note ?? '', r.srcs.map(([, u]) => u).join(' ')]);
  return (
    <>
      <p data-page-copy="" className="text-[14px] text-text-secondary max-w-[80ch]">{`${GRANT_ROWS.length} grant lines to states as printed; the recipient is named inside each line's title, so they are a table, not a map.`}</p>
      {f.st && <p className="text-[13px] text-amber">the recipient state is in the line&apos;s text, not a field (S2): the state selection does not reach this table</p>}
      {!shown.length && <p className="text-[14px]">{`No grant line matches ${filterWords || 'these filters'}.`}</p>}
      <Caption id="sec-c10" cap="C10">{`Allocation is what the Union set aside for a state; released is what it paid out by the date in the note. A release of ₹0 is a recorded figure. The per-state split exists here only for the modernisation scheme${GRANT_FYS.length ? `, FY${GRANT_FYS[0]}–FY${last(GRANT_FYS)}` : ''}, from ${grantDocWords()}, and the state is named inside the line's title, so this is a table, not a map. ${GRANT_SPLIT.totalLines ? `${capWord(countWord(GRANT_SPLIT.totalLines))} line${GRANT_SPLIT.totalLines === 1 ? ' is the document\'s own total and is not a state' : 's are the document\'s own totals and are not states'}; ` : ''}rows are not to be added across the table.`}</Caption>
      <div aria-describedby="sec-c10"><Twin twin="grants" title={Q8} rowCount={shown.length} paged>
        {() => (
          <>
            <Exports name="Grants to states" twin="grants" meta={{ table: 'Grants to states', population: `${GRANT_ROWS.length} grant lines as printed`, rows: shown.length, amounts: 'BE (allocation) and actual (released), as each row states' }}
              header={['head', 'fy', 'fy_start', 'stage', 'stage_word', 'cr', 'tier', 'note', 'source_urls']} rows={out} />
            <Pager page={page} pages={pages} onPage={(p) => patch({ tp: p > 1 ? String(p) : null })} />
            <TwinTable caption={captionText(slice.length, `grant lines ${(page - 1) * 400 + 1}–${(page - 1) * 400 + slice.length} of ${shown.length}`, filterWords)} cols={[{ key: 'h', label: 'Scheme line as printed', th: true }, { key: 'fy', label: 'FY' }, { key: 'st', label: 'Stage' }, { key: 'cr', label: '₹ cr' }, { key: 't', label: 'Tier' }, { key: 's', label: 'Sources' }]} rows={rows} minWidth="56rem" />
          </>
        )}
      </Twin></div>
    </>
  );
}
function GrantCr({ r }: { r: BudgetRow }) {
  const c = crContext(r);
  // A previous year recorded as zero is said in words here, so only a row that is itself
  // zero reads "₹0 cr — as recorded" in this table.
  const compare = c.compare.replace(/: ₹0 cr — as recorded$/, ': recorded as zero');
  return <span data-cr={r.cr}>{`₹${fmtCr(r.cr)} cr — ${c.denom} · ${compare}`}</span>;
}

export { UNION_ROWS, nodeOf };
