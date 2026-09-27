import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { GEdge, StateCode } from '../../graph/schema';
import {
  type Lens, EDGE_BY_ID, LENS_OF_EDGE, LENS_LABEL, labelOf, nodeOf, fmtCr, hasRupee, isCensus, inclusion, LOAN_FACT, G1, NO_AMOUNT, NO_RESPONSE,
  responsesTo, responseLine, benefitOf, officeOnDate, loanOfficeIds, contractsFor, instrumentOf, conditionsOf, placeText, sourceClass, ASOF,
  MODULES, DOMAIN_OF, stateName, assemblyFor, OWN_IDX, OWN_OUTSIDE, lineKind, MANDATES, BAND_A, holderLabel, BAND_B, pToken,
  type Filters, CASE_FILES, MOF, LOAN_FACT as LF, roleOf, ROLE_WORDS,
} from '../../data/financeView';
import { TierWord, usePage, Src, OpenRecord, Q } from './ui';
import { amountCell, stateGroups } from './LoansLens';

/**
 * The margin panels (spec §5.1.6, §5.1.12, §5.3.6). Every panel has a visible Close
 * first in its tab order after its heading and a "Back to" link at its foot; both, and
 * Escape pressed inside the panel, clear the panel's param and return focus to the
 * control that opened it (U14, D49). A block with nothing prints its "none recorded"
 * line; it never disappears.
 */

const KIND: Record<string, string> = {
  loan: 'loan commitment at the rate stated in the record',
  award: 'contract value recorded for the award',
  grant: 'foreign contribution for the year in the record',
  enforce: 'amount attached, fined or alleged',
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="font-mono text-[12px] tracking-wide text-text-muted">{title}</h3>
      <div className="text-[13.5px] text-text-secondary mt-1 space-y-1">{children}</div>
    </div>
  );
}

function PanelShell({ title, onClose, origin, children, headingRef, extraHead }: {
  title: string; onClose: () => void; origin: string; children: ReactNode; headingRef: React.RefObject<HTMLHeadingElement>; extraHead?: ReactNode;
}) {
  const onKey = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
  return (
    <section onKeyDown={onKey} className="border border-border-light rounded p-3 my-3 bg-bg-elevated/60 min-w-0 break-words scroll-mt-40" data-panel="">
      <h2 ref={headingRef} tabIndex={-1} className="font-serif text-[18px] text-text outline-none focus-visible:ring-1 focus-visible:ring-accent">{title}</h2>
      <button type="button" onClick={onClose} className="font-mono text-[12px] underline mt-1 mr-3">Close</button>
      {extraHead}
      {children}
      <p className="mt-4"><a href="#" onClick={(e) => { e.preventDefault(); onClose(); }} className="font-mono text-[12px] underline">{`Back to ${origin}`}</a></p>
    </section>
  );
}

export function citationFor(e: GEdge, lens: Lens): string {
  const lf = LOAN_FACT(e);
  const amt = hasRupee(e)
    ? `₹${fmtCr(e.a as number)} cr — ${KIND[e.pred] ?? 'amount as recorded'}${G1 && lf?.usdM != null ? `, US$${fmtCr(lf.usdM)} m` : ''}`
    : e.pred === 'loan' ? NO_AMOUNT : 'no amount in the record';
  const src = e.srcs?.[0];
  const link = typeof location !== 'undefined' ? `${location.origin}${location.pathname}#/finance?lens=${lens}&rec=${encodeURIComponent(e.id ?? '')}` : '';
  return `${e.lab ?? e.id} — ${amt} — approved ${e.from ?? 'undated'} — ${labelOf(e.s)} → ${labelOf(e.t)} — ${e.tier} — ${src ? `${src[0]} ${src[1]}` : 'no source in file'} — ICIP ${link}, read to ${ASOF[lens] ?? 'not promoted'}`;
}

export function OfficeOnDate({ e }: { e: GEdge }) {
  const o = officeOnDate(e.from, loanOfficeIds(e));
  const row = (r: GEdge) => <li key={r.id}>{`${labelOf(r.s)} — ${r.lab ?? ''} · ${r.from ?? 'start not recorded'} to ${r.to ?? 'end not recorded'} · `}<TierWord tier={r.tier} /></li>;
  const date = e.from ?? 'undated';
  return (
    <div>
      <p className="text-[13.5px]">Holding office on the approval date is the date test, not a finding. No World Bank record in this register names a minister as signatory; the research file records that agreements are signed by officials of the Department of Economic Affairs.</p>
      <h4 className="font-mono text-[12px] text-text-muted mt-2">{`Recorded office window covers ${date} — the date test, not a signature`}</h4>
      {o.covers.length ? <ul className="list-none p-0 m-0">{o.covers.map(row)}</ul> : <p>none recorded</p>}
      <h4 className="font-mono text-[12px] text-text-muted mt-2">Start recorded, no end recorded — held office from the date shown; the record gives no end date</h4>
      {o.openEnded.length ? <ul className="list-none p-0 m-0">{o.openEnded.map(row)}</ul> : <p>none recorded</p>}
      <h4 className="font-mono text-[12px] text-text-muted mt-2">{`Acts recorded on ${date}`}</h4>
      {o.sameDay.length ? <ul className="list-none p-0 m-0">{o.sameDay.map(row)}</ul> : <p>none recorded</p>}
    </div>
  );
}

export function Responses({ id }: { id: string | undefined }) {
  const rs = responsesTo(id);
  if (!rs.length) return <dl className="m-0"><dt className="sr-only">Response</dt><dd className="m-0 text-[13.5px]">{NO_RESPONSE}</dd></dl>;
  return (
    <>
      {rs.map((c) => (
        <dl key={c.id} className="m-0 mb-2">
          <dt className="font-mono text-[12px] text-text-muted">Response</dt>
          <dd className="m-0 text-[13.5px]">{responseLine(c)} <TierWord tier={c.tier} /></dd>
        </dl>
      ))}
    </>
  );
}

export function RecordCard({ id, lens, onClose, origin, headingRef, onGo }: {
  id: string; lens: Lens; onClose: () => void; origin: string; headingRef: React.RefObject<HTMLHeadingElement>; onGo: (lens: Lens, id: string) => string;
}) {
  const { showConnections, announce } = usePage();
  const e = EDGE_BY_ID.get(id);
  if (!e) {
    return (
      <PanelShell title="Record not found" onClose={onClose} origin={origin} headingRef={headingRef}>
        <p className="text-[14px] mt-2">{`No record ${id} in the three registers.`}</p>
      </PanelShell>
    );
  }
  const home = LENS_OF_EDGE.get(id) ?? 'loans';
  const lab = e.lab ?? id;
  const cite = citationFor(e, home);
  const b = benefitOf(e);
  const lf = LF(e);
  const isLoan = e.pred === 'loan';
  const domain = DOMAIN_OF(id);
  const condVoid = isLoan ? MODULES.loans.voids.find((v) => (v.domain === domain || v.domain === 'worldbank') && /condition/i.test(v.what)) : null;
  const supersedes = [...EDGE_BY_ID.values()].filter((x) => x.supersededBy === id);
  return (
    <PanelShell title={lab} onClose={onClose} origin={origin} headingRef={headingRef}
      extraHead={(
        <div className="mt-2 space-y-1 text-[13px]">
          {home !== lens && (
            <p className="text-amber">{`This record belongs to the ${home} lens — `}<a href={`#/finance${onGo(home, id)}`} className="underline">go there</a></p>
          )}
          <p className="flex flex-wrap gap-2 items-center">
            <button type="button" className="underline" onClick={(ev) => showConnections(e.s, ev.currentTarget)}>{`From: ${labelOf(e.s)}`}</button>
            <button type="button" className="underline" onClick={(ev) => showConnections(e.t, ev.currentTarget)}>{`To: ${labelOf(e.t)}`}</button>
            <TierWord tier={e.tier} />
            <span className="font-mono text-[12px] text-text-muted">{`${LENS_LABEL[home]} · ${id}`}</span>
          </p>
          <button type="button" aria-label={`Copy citation for ${lab}`} className="font-mono text-[12px] border border-border-light rounded px-2 py-1"
            onClick={async () => { try { await navigator.clipboard.writeText(cite); announce('Citation copied'); } catch { announce('Copy refused by the browser: the citation is shown below to select'); } }}>
            Copy citation
          </button>
          <output className="block font-mono text-[12px] text-text-secondary break-words">{cite}</output>
        </div>
      )}>
      <Block title="Amount">
        {hasRupee(e) ? (
          <>
            <p className="font-mono">{e.a === 0 ? '₹0 cr — as recorded' : `₹${fmtCr(e.a as number)} cr — ${KIND[e.pred] ?? 'amount as recorded'}`}{e.a === 0 ? ' — read the record text' : ''}</p>
            {isLoan && <p className="font-mono text-[12px]">{isCensus(e) ? (lf?.usdM != null && lf.fxRate != null ? `US$${fmtCr(lf.usdM)} m at ₹${fmtCr(lf.fxRate)}/US$ (${lf.fxBasis ?? 'basis in the record'})` : "₹ converted from the lender's US$ commitment at the approval-year rate the record states — the US$ figure and the rate are in the record text ↓") : '₹ as the research recorded it — its basis is in the record text ↓'}</p>}
          </>
        ) : isLoan ? (
          <><p className="font-mono">{NO_AMOUNT}</p><p><Q>{e.d ?? ''}</Q></p></>
        ) : (
          <p>{`No amount in the record${KIND[e.pred] ? ` (${KIND[e.pred]}: not stated)` : ''}.`}</p>
        )}
      </Block>
      {isLoan && (
        <Block title="Inclusion">
          <p>{{ 'census-counted': 'Counted in the census ₹ total', 'census-no-rupee': `In no ₹ total — ${NO_AMOUNT}`, 'researched-listed': 'Listed, not summed — researched record', 'researched-no-rupee': `In no ₹ total — ${NO_AMOUNT}` }[inclusion(e)]}</p>
          {lf && (!lf.countable || lf.countedAs) && <p>{lf.countedAs ? `Counted under ${pToken(EDGE_BY_ID.get(lf.countedAs)?.lab) ?? lf.countedAs}` : `Not a commitment: ${lf.notCountableReason ?? 'reason not recorded'}`}</p>}
        </Block>
      )}
      <Block title="Dates"><p>{`${isLoan ? 'Approved' : 'From'} ${e.from ?? 'undated'} · ${e.to ? `to ${e.to}` : 'window open: end not recorded'}`}</p></Block>
      {isLoan && <Block title="Place"><p>{placeText(e)}</p></Block>}
      {isLoan && (
        <Block title="Terms">
          <p>{`Instrument: ${instrumentOf(e) ?? 'not stated'} · rate: ${e.terms?.ratePct != null ? `${e.terms.ratePct}%` : 'not stated'} · tenor: ${e.terms?.tenorYears != null ? `${e.terms.tenorYears} years` : 'not stated'} · grace: ${e.terms?.graceYears != null ? `${e.terms.graceYears} years` : 'not stated'}`}</p>
          {conditionsOf(e).length ? <ul className="list-disc pl-5">{conditionsOf(e).map((c, i) => <li key={i}><Q>{c}</Q></li>)}</ul> : <p>No conditions recorded in this record.</p>}
          {!conditionsOf(e).length && condVoid && <p><span className="text-amber">Void: </span><Q>{condVoid.what}</Q></p>}
        </Block>
      )}
      <Block title="Who benefits">
        {b ? <p>{labelOf(b.who)}{b.how ? `: ${b.how}` : ''}{` · ${b.amountCr != null ? `₹${fmtCr(b.amountCr)} cr (${b.confidence ?? 'confidence not recorded'})` : 'amount unknown'}`}</p>
          : <p className="text-amber">No cui-bono row recorded for this record.</p>}
      </Block>
      {isLoan && <Block title="Office on the date"><OfficeOnDate e={e} /></Block>}
      {isLoan && (
        <Block title="Contracts under this project">
          {contractsFor(e).length ? <ul className="list-none p-0 m-0">{contractsFor(e).map((c) => <li key={c.id}><OpenRecord id={c.id!} lab={c.lab ?? c.id!}>{c.lab ?? c.id}</OpenRecord></li>)}</ul> : <p>No contract in the register is linked to this project.</p>}
        </Block>
      )}
      <h3 className="font-mono text-[12px] tracking-wide text-text-muted mt-3">Responses</h3>
      <Responses id={id} />
      <Block title="Record text"><p><Q>{e.d ?? 'not stated'}</Q></p></Block>
      <Block title="Sources">
        {e.srcs?.length ? <ul className="list-none p-0 m-0">{e.srcs.map(([l, u], i) => <li key={i}><span className="font-mono text-[11px] text-text-muted mr-1">{sourceClass([l, u])}</span><a href={u} target="_blank" rel="noopener noreferrer" className="underline">{l}</a></li>)}</ul> : <p className="text-amber">no source in file</p>}
        {e.upgradeIf && <p>{`Upgrade if: ${e.upgradeIf}`}</p>}
        {e.killIf && <p>{`Kill if: ${e.killIf}`}</p>}
      </Block>
      {(e.supersededBy || supersedes.length > 0) && (
        <Block title="Supersession">
          {e.supersededBy && <p>Superseded by <OpenRecord id={e.supersededBy} lab={EDGE_BY_ID.get(e.supersededBy)?.lab ?? e.supersededBy}>{e.supersededBy}</OpenRecord></p>}
          {supersedes.map((s) => <p key={s.id}>Supersedes <OpenRecord id={s.id!} lab={s.lab ?? s.id!}>{s.id}</OpenRecord></p>)}
        </Block>
      )}
    </PanelShell>
  );
}

export function StatePanel({ st, lens, f, onClose, origin, headingRef }: {
  st: StateCode; lens: Lens; f: Filters; onClose: () => void; origin: string; headingRef: React.RefObject<HTMLHeadingElement>;
}) {
  const { announce } = usePage();
  const name = stateName(st);
  if (lens === 'associations') {
    const cases = CASE_FILES.filter((c) => c.st === st);
    return (
      <PanelShell title={name} onClose={onClose} origin={origin} headingRef={headingRef}>
        <p className="text-[13.5px] mt-2">Associations are placed by registered state: registered in, not where it works.</p>
        <p className="text-[13.5px]">{`${cases.length} case files whose target is registered here`}</p>
        <ul className="list-none p-0 m-0 text-[13.5px]">{cases.map((c) => <li key={c.id}><a href={`#case-${c.id}`} className="underline" onClick={(ev) => { ev.preventDefault(); document.getElementById(`case-${c.id}`)?.scrollIntoView({ block: 'start' }); }}>{c.label}</a></li>)}</ul>
      </PanelShell>
    );
  }
  const g = stateGroups({ ...f, st });
  const placedCr = g.placed.filter(hasRupee).reduce((s, e) => s + (e.a as number), 0);
  const excluded = g.placed.filter((e) => !hasRupee(e)).length;
  const assembly = assemblyFor(st);
  const winnerOn = (date: string | undefined) => {
    if (!date) return 'no approval date';
    const prior = assembly.filter((a) => a.date <= date).pop();
    return prior ? `${prior.winner ?? 'winner not recorded'} (assembly election ${prior.date}; date test, not a finding)` : `no assembly election in the register covers ${date}`;
  };
  const sym = MODULES.loans.symmetry.find((s) => s.domain === 'worldbank-projects')?.text.split(/(?<=\.)\s+/).find((x) => /income/i.test(x));
  const none = !g.placed.length && !g.fetcher.length && !g.body.length && !g.researched.length;
  const item = (e: GEdge, extra?: string) => <li key={e.id}>{`${e.from ?? 'undated'} · ${labelOf(e.s)} · ${amountCell(e).text}${extra ? ` · ${extra}` : ''} · `}<OpenRecord id={e.id!} lab={e.lab ?? e.id!} /></li>;
  return (
    <PanelShell title={name} onClose={onClose} origin={origin} headingRef={headingRef}
      extraHead={<button type="button" className="font-mono text-[12px] underline" onClick={async () => { try { await navigator.clipboard.writeText(location.href); announce('Link copied'); } catch { announce('Copy refused by the browser'); } }}>Copy link to this state</button>}>
      <p className="text-[13.5px] mt-2">Placed means the record names this state&apos;s government as borrower or implementer.</p>
      {none && <p className="text-[13.5px] text-text">{`No loan record names ${name}. This is a statement about the register.`}</p>}
      <ul className="list-none p-0 m-0 text-[13.5px] font-mono">
        <li>{`${g.placed.length} census records placed`}</li>
        <li>{`${g.body.length} name a body registered here — not placed, not in the fill`}</li>
        <li>{`${g.researched.length} researched records name this state government — listed, not summed`}</li>
        <li>{`₹${fmtCr(Math.round(placedCr * 100) / 100)} cr counted of these · ${excluded} placed records without ₹ in no total`}</li>
      </ul>
      {g.placed.length > 0 && <Block title="Placed records"><ul className="list-none p-0 m-0">{g.placed.map((e) => item(e, winnerOn(e.from)))}</ul></Block>}
      {G1 && g.fetcher.length > 0 && <Block title="Placed by the fetcher's rule (state agency, seat or title)"><ul className="list-none p-0 m-0">{g.fetcher.map((e) => item(e, LOAN_FACT(e)?.stBasis ?? 'basis not exported'))}</ul></Block>}
      {g.body.length > 0 && <Block title="Body-registered records"><ul className="list-none p-0 m-0">{g.body.map((e) => item(e, 'not where the money went'))}</ul></Block>}
      {g.researched.length > 0 && <Block title="Researched records naming the state government"><ul className="list-none p-0 m-0">{g.researched.map((e) => item(e))}</ul></Block>}
      {sym && <p className="text-[13px] mt-2"><Q>{sym}</Q> (wording: worldbank-projects research file)</p>}
      <p className="mt-2"><button type="button" className="font-mono text-[12px] underline" onClick={() => document.getElementById('twin-project-list')?.scrollIntoView({ block: 'start' })}>Show these in the table</button></p>
    </PanelShell>
  );
}

export function HolderCard({ id, onClose, origin, headingRef }: { id: string; onClose: () => void; origin: string; headingRef: React.RefObject<HTMLHeadingElement> }) {
  const { announce } = usePage();
  const n = nodeOf(id);
  // The declared role, not band membership: with G3c the subjects of the narrative sit in
  // Band A beside their controls, and are never called a comparison holder.
  const declared = roleOf(id);
  const role = declared ? `${ROLE_WORDS[declared] ?? declared} (Band A, always shown)` : BAND_B.some((r) => r.id === id) ? 'other holder with a recorded line' : 'no recorded line in a NIFTY 50 filing';
  const own = [...OWN_IDX.filter((e) => e.s === id), ...OWN_OUTSIDE.filter((e) => e.s === id)];
  const mandates = MANDATES.filter((e) => e.t === id);
  return (
    <PanelShell title={holderLabel(id)} onClose={onClose} origin={origin} headingRef={headingRef}
      extraHead={<p className="text-[13px] text-text-secondary mt-1">{`${n?.sub ?? ''}${n?.sub ? ' · ' : ''}${role}`}</p>}>
      <p className="text-[13.5px] mt-2">{`Comparison set required: ${holderLabel(id)} is shown with the ${BAND_A.length} holders the research measured with the same lens, and with every other holder named in these filings. This page does not display one holder alone.`}</p>
      {!own.length && !mandates.length && <p className="text-[13.5px]">{`No holding recorded for ${holderLabel(id)} in this register.`}</p>}
      {own.map((e) => (
        <dl key={e.id} className="border-t border-border pt-2 mt-2 grid gap-0.5 text-[13.5px]">
          <dt className="font-mono text-[12px] text-text-muted">Company</dt><dd className="m-0">{labelOf(e.t)}</dd>
          <dt className="font-mono text-[12px] text-text-muted">Kind</dt><dd className="m-0">{lineKind(e) === 'aggregate' ? 'aggregate, analytic, lower bound' : 'filing line'}</dd>
          <dt className="font-mono text-[12px] text-text-muted">Date</dt><dd className="m-0">{e.from ?? 'undated'}</dd>
          <dt className="font-mono text-[12px] text-text-muted">Tier</dt><dd className="m-0"><TierWord tier={e.tier} /></dd>
          <dt className="font-mono text-[12px] text-text-muted">Record</dt><dd className="m-0"><Q>{e.lab ?? ''}</Q></dd>
          <dt className="font-mono text-[12px] text-text-muted">Record text</dt><dd className="m-0"><Q>{e.d ?? 'not stated'}</Q></dd>
          <dt className="font-mono text-[12px] text-text-muted">Source</dt><dd className="m-0">{e.srcs?.[0] ? <a href={e.srcs[0][1]} target="_blank" rel="noopener noreferrer" className="underline">{e.srcs[0][0]}</a> : <span className="text-amber">no source in file</span>}</dd>
          <dd className="m-0 flex gap-3"><OpenRecord id={e.id!} lab={e.lab ?? e.id!} />
            <button type="button" aria-label={`Copy citation for ${e.lab ?? e.id}`} className="underline font-mono text-[12px]" onClick={async () => { try { await navigator.clipboard.writeText(citationFor(e, 'capital')); announce('Citation copied'); } catch { announce('Copy refused by the browser'); } }}>Copy citation</button>
          </dd>
        </dl>
      ))}
      {mandates.length > 0 && (
        <Block title="Mandates naming this holder">
          <ul className="list-none p-0 m-0">{mandates.map((e) => <li key={e.id}><OpenRecord id={e.id!} lab={e.lab ?? e.id!}>{e.lab ?? e.id}</OpenRecord></li>)}</ul>
        </Block>
      )}
      <Src srcs={n?.srcs} of={holderLabel(id)} />
    </PanelShell>
  );
}

/** Focus a panel's heading once, on the reader's act (never on load). */
export function useFocusOnce(ref: React.RefObject<HTMLElement>, want: boolean, key: string | null) {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!want || !key || last.current === key) return;
    last.current = key;
    const h = () => ref.current?.focus();
    requestAnimationFrame(h);
  }, [want, key, ref]);
}

export { MOF };
