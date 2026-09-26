import { forwardRef, type ReactNode, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Tier } from '../../graph/schema';
import type { Scheme } from '../../data/welfare';
import {
  type ElectionRow, fmtNum, stateName, partyText, amountInForce, annualPerHead, yearOf, fyOf,
  personOf, responsesFor, auditNotesFor, findingsOf, whoLabel, monthsBetweenSafe, AS_OF_YEAR, liveInYear, byText, canon,
} from '../../data/welfareView';
import { TierWord, Src, Verbatim, Caption, QLink } from './ui';
import { BallotGlyph } from './Control';

type Search = (kv: Record<string, string | null>) => string;

export const MISSING_RESPONSE = 'No response located in this file. The file does not record whether one was sought.';

/**
 * What an alleged finding's or benefit row's own response slot says. Neither carries an
 * id in the contract, so no response is ever linked to one, and "no response located in
 * this file" (MISSING_RESPONSE, which is true of a claim no contra names) cannot be said
 * of an item: the file does hold replies to allegations whose claims name no scheme
 * (the Union's to Siddaramaiah on Anna Bhagya, the DMK's to Jayalalithaa on the free TV
 * scheme), and the page cannot tell which item such a reply answers. So an item's slot
 * says only what is true of it, and points to the scheme's responses when there are any.
 */
export function itemResponseText(schemeId: string, where: 'block' | 'card'): string {
  const n = responsesFor(schemeId).length;
  const base = 'No response linked to this item in the file. The file does not record whether one was sought.';
  if (!n) return base;
  const loc = where === 'block' ? 'printed under ‘Responses on record about this scheme’' : "printed in the scheme's card";
  return `${base} It holds ${n} response${n === 1 ? '' : 's'} to alleged claims about this scheme, ${loc}, none linked to this item.`;
}


/**
 * The response slot. Structural — one <dl> per alleged item — so the pairing survives
 * CSS, screen readers and screenshots. The slot keeps the rose rule (it is where a
 * denial would sit) but never holds a response the file does not link to this item:
 * a denial printed beside a claim it does not answer, or an accuser printed as the
 * respondent, is what invariant 4 exists to prevent.
 */
export function AllegationPair({ allegation, schemeId }: { allegation: ReactNode; schemeId: string }) {
  return (
    <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-1 my-3 text-[14px] leading-relaxed">
      <dt className="font-mono text-[12px] text-text-muted sm:col-start-1 sm:row-start-1">Allegation</dt>
      <dd className="text-text-secondary sm:col-start-1 sm:row-start-2 border-l-2 border-border-light pl-3">{allegation}</dd>
      <dt className="font-mono text-[12px] text-text-muted sm:col-start-2 sm:row-start-1">Response</dt>
      <dd className="text-amber sm:col-start-2 sm:row-start-2 border-l-2 border-rose pl-3">{itemResponseText(schemeId, 'block')}</dd>

    </dl>
  );
}

/**
 * The responses on record about a scheme, printed once, each beside the alleged claim it
 * names (so the denial sits beside what it answers), and never inside an item's slot.
 * The audit's markers follow as notes outside the rose rule: they name no respondent.
 */
export function SchemeResponses({ schemeId }: { schemeId: string }) {
  const rs = responsesFor(schemeId);
  const notes = auditNotesFor(schemeId);
  if (!rs.length && !notes.length) return null;
  return (
    <div data-scheme-responses="" className="my-3 text-[14px] leading-relaxed">
      {rs.length > 0 && (
        <>
          <p className="font-mono text-[12px] text-text-muted">Responses on record about this scheme (the file does not link them to one allegation)</p>
          <ul className="mt-1 space-y-2 border-l-2 border-rose pl-3 text-text-secondary">
            {rs.map((r, i) => (
              <li key={r.edge.id ?? i}>
                <span className="text-text">{r.by}</span>
                <span className="text-text-muted">{` answering the alleged claim by ${r.claimant}`}{r.answering ? <>{' '}<Verbatim>{r.answering}</Verbatim></> : null}</span>
                {': '}
                <Verbatim>{r.edge.lab ?? r.edge.d ?? 'position recorded without a summary'}</Verbatim>
                {' '}
                <Src srcs={r.edge.srcs} />
              </li>
            ))}
          </ul>
        </>
      )}
      {notes.map((n, i) => (
        <p key={n.edge.id ?? i} className="text-[13px] text-text-muted mt-2">
          {'Audit note on '}{n.on ? <Verbatim>{n.on}</Verbatim> : 'a claim'}{': '}<Verbatim>{n.edge.lab ?? 'no summary'}</Verbatim>
          {'. The audit names no respondent, so this is not printed as a response. '}
          <Src srcs={n.edge.srcs} />
        </p>
      ))}
    </div>
  );
}

export const ROSE_KEY = "Rose rule = the response of those concerned. It marks the denial's position, not its credibility.";

function PanelShell({ title, closeLabel, onClose, back, children, sub }: {
  title: string; closeLabel: string; onClose: () => void; back?: { label: string; onClick: () => void } | null; children: ReactNode; sub?: ReactNode;
}, ref: React.ForwardedRef<HTMLHeadingElement>) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
  };
  return (
    <section onKeyDown={onKey} className="border border-border-light rounded-lg p-3 bg-bg-elevated/70 text-[14px] scroll-mt-44 lg:scroll-mt-24 min-w-0 break-words">
      <h2 ref={ref} tabIndex={-1} className="heading-editorial text-xl text-text leading-snug outline-none focus-visible:ring-1 focus-visible:ring-accent/60">{title}</h2>
      {sub}
      {back && (
        <a href="#" aria-label={`Back to ${back.label}`} onClick={(e) => { e.preventDefault(); back.onClick(); }} className="inline-block mt-1 mr-3 text-[13px] underline underline-offset-2 hover:text-accent">{`← ${back.label}`}</a>
      )}
      <button type="button" aria-label={`Close ${closeLabel}`} onClick={onClose} className="mt-1 font-mono text-[12px] px-2 py-0.5 border border-border-light rounded hover:text-accent">close</button>
      {children}
    </section>
  );
}
const Shell = forwardRef(PanelShell);

const H = ({ children }: { children: ReactNode }) => <h3 className="font-mono text-[12px] text-text-muted mt-4 mb-1 border-b border-border pb-0.5">{children}</h3>;

// ---------------------------------------------------------------------------
// StatePanel
// ---------------------------------------------------------------------------

export interface StatePanelProps {
  st: string;
  year: number | null;
  readout: string[];
  moneyBlock: ReactNode;
  allSchemes: Scheme[];
  schemes: Scheme[];
  elections: ElectionRow[];
  declared: string | null;
  gaps: string[];
  search: Search;
  onClose: () => void;
  onPerson: (label: string) => void;
}

export const StatePanel = forwardRef<HTMLHeadingElement, StatePanelProps>(function StatePanel(p, ref) {
  const name = stateName(p.st);
  const people = new Map<string, { label: string; office: string | null; resolved: boolean; dates: string[] }>();
  for (const s of p.schemes) {
    const ids = [
      ...(s.announced?.byPersonId ? [{ id: s.announced.byPersonId, date: s.announced.date, office: s.announced.office }] : []),
      ...s.ministers.filter((m) => m.personId).map((m) => ({ id: m.personId!, date: m.date, office: m.role })),
    ];
    for (const x of ids) {
      const per = personOf(x.id);
      if (!people.has(x.id)) people.set(x.id, { label: per.label, office: x.office ?? per.office, resolved: per.resolved, dates: [] });
      if (x.date) people.get(x.id)!.dates.push(x.date);
    }
  }
  const liveCount = p.year != null ? p.schemes.filter((s) => liveInYear(s, p.year!)).length : null;
  return (
    <Shell ref={ref} title={name} closeLabel={name} onClose={p.onClose}
      sub={<p className="text-[13px] mt-1"><Link to={`/states/${p.st}`} className="underline underline-offset-2 hover:text-accent">{`${name} on the states page`}</Link></p>}>
      <div className="mt-3 border-l-2 border-border-light pl-3 space-y-1 text-text-secondary">
        {p.readout.map((l, i) => <p key={i}>{l}</p>)}
      </div>
      {p.moneyBlock}
      {!p.allSchemes.length ? (
        <p className="mt-3 text-text-secondary">{p.declared ? `${name} was searched for ${p.declared}; no scheme recorded.` : `${name}: none recorded in this file. Hatched means unknown, not none.`}</p>
      ) : !p.schemes.length ? (
        <p className="mt-3 text-text-secondary">{`No scheme from ${name} matches the current filters. This is a statement about this file.`}</p>
      ) : (
        <>
          <p className="font-mono text-[12px] text-text-muted mt-3">{`${p.schemes.length} state schemes in the file${liveCount != null ? ` · ${liveCount} live in ${p.year}` : ''}`}</p>
          <ul className="mt-2 space-y-2">
            {p.schemes.map((s) => {
              const y = p.year ?? AS_OF_YEAR;
              const amt = amountInForce(s, y).amount;
              const latest = [...s.status].filter((t) => t.date && (yearOf(t.date) ?? 9999) <= y).sort((a, b) => byText(a.date!, b.date!)).pop();
              return (
                <li key={s.id} className="leading-snug">
                  <QLink search={p.search({ s: s.id })} className="text-text underline underline-offset-2 hover:text-accent">{s.name}</QLink>
                  {p.year != null && liveInYear(s, p.year) && <span className="ml-2 font-mono text-[12px] text-text-muted">{`live in ${p.year}`}</span>}
                  <span className="block text-[13px] text-text-secondary">
                    {`${partyText(s)} · launched ${s.launched?.date ?? 'not located'} · per head ${amt != null ? `₹${fmtNum(amt)}` : 'not located'} `}
                    {s.benefit?.unit ? <Verbatim>{s.benefit.unit}</Verbatim> : 'unit not recorded'}
                    {` · latest status ${latest ? `${latest.status} ${latest.date}` : 'none dated'}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <H>Elections in this state in the file</H>
      {p.elections.length ? (
        <ul className="space-y-1.5 text-[13px]">
          {p.elections.map((r) => {
            const seat = p.allSchemes.map((s) => s.electionContext).find((c) => c && c.date === r.e.date && c.seatChange)?.seatChange;
            return (
              <li key={r.key}>
                <BallotGlyph r={r} />
                {`${r.e.date} · ${r.e.incumbentRaw ?? 'incumbent not recorded'} → ${r.e.winnerRaw ?? 'winner not recorded'} · fresh within 12 m: ${r.exposedBy[12].length ? 'yes' : 'no'}${seat ? ` · seat change ${seat}` : ''} `}
                <Src srcs={r.e.srcs} />
              </li>
            );
          })}
        </ul>
      ) : <p className="text-text-muted">No election in this state is recorded in the file.</p>}
      <H>Ministers and office-holders on these schemes</H>
      {people.size ? (
        <ul className="space-y-1 text-[13px]">
          {[...people.entries()].sort((a, b) => byText(a[1].label, b[1].label)).map(([id, x]) => (
            <li key={id}>
              <button type="button" className="underline underline-offset-2 hover:text-accent text-left" onClick={() => p.onPerson(x.label)}>{x.label}</button>
              {!x.resolved && ' (identity not confirmed)'}
              <span className="text-text-muted">{` · ${x.office ?? 'office not recorded'} · ${x.dates.length ? [...x.dates].sort(byText).join(', ') : 'dates not recorded'}`}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-text-muted">No office-holder recorded on these schemes.</p>}
      {p.gaps.length > 0 && (
        <>
          <H>Gaps touching this state</H>
          <ul className="space-y-1.5 text-text-secondary">{p.gaps.map((g, i) => <li key={i}><Verbatim>{g}</Verbatim></li>)}</ul>
        </>
      )}
    </Shell>
  );
});

// ---------------------------------------------------------------------------
// SchemeCard
// ---------------------------------------------------------------------------

export interface SchemeCardProps {
  scheme: Scheme;
  year: number | null;
  tiers: Set<Tier>;
  nextElection: { date: string; label: string; months: number | null; result: string } | null;
  backTo: { label: string; onClick: () => void } | null;
  onClose: () => void;
  onCopy: (text: string) => void;
  citeBase: string;
}

const CopyCite = ({ text, onCopy }: { text: string; onCopy: (t: string) => void }) => (
  <button type="button" onClick={() => onCopy(text)} className="ml-1 font-mono text-[12px] text-text-muted underline underline-offset-2 hover:text-accent">copy citation</button>
);

export const SchemeCard = forwardRef<HTMLHeadingElement, SchemeCardProps>(function SchemeCard({ scheme: s, year, tiers, nextElection, backTo, onClose, onCopy, citeBase }, ref) {
  const cite = (label: string, value: string, when: string, src: [string, string] | undefined) =>
    `${s.name} · ${label}: ${value} · ${when} · ${src ? `${src[0]} · ${src[1]}` : 'no source in file'} · ${citeBase}`;
  const ec = s.electionContext;
  const computedMonths = ec ? monthsBetweenSafe(s.launched?.date, ec.date) : null;
  const findings = findingsOf(s, tiers);
  const benefits = s.whoElseBenefits.filter((w) => w.tier == null || tiers.has(w.tier));
  const unit = s.benefit?.unit ?? null;
  // The base amount has no source of its own in the contract (SchemeBenefit carries no
  // srcs). It is cited to the scheme record and says so; citing the launch source would
  // attribute a figure to a record not known to state it.
  const amounts: { date: string | null; amount: number | null; note: string | null; srcs: [string, string][]; base?: boolean }[] = s.benefit
    ? [{ date: s.launched?.date ?? null, amount: s.benefit.amount, note: 'base amount', srcs: s.srcs, base: true },
      ...[...s.benefit.changes].sort((a, b) => byText(a.date ?? '9999', b.date ?? '9999'))]
    : [];
  const promised = s.status.filter((t) => t.status === 'promised-not-enacted');
  const statusSorted = [...s.status].sort((a, b) => byText(a.date ?? '9999', b.date ?? '9999'));
  const fyYear = year != null ? fyOf(year) : null;
  return (
    <Shell ref={ref} title={s.name} closeLabel={s.name} onClose={onClose} back={backTo}
      sub={
        <div className="text-[13px] text-text-secondary mt-1 space-y-0.5">
          {s.al.length > 0 && <p className="font-mono text-[12px] text-text-muted">{s.al.join(' · ')}</p>}
          <p>{`${s.level === 'central' ? 'Central · all states' : stateName(s.st)} · ${partyText(s)} · ${s.category ?? 'category not recorded'}`}</p>
        </div>
      }>
      <H>Lifecycle</H>
      <dl className="space-y-1.5 text-[13px]">
        <dt className="font-mono text-[12px] text-text-muted">Announced</dt>
        <dd>{s.announced ? <>{`${s.announced.date ?? 'date not located'} · ${s.announced.byPersonId ? personOf(s.announced.byPersonId).label : 'person not stated'} · `}{s.announced.office ? <Verbatim>{s.announced.office}</Verbatim> : 'office not stated'}{' '}<Src srcs={s.announced.srcs} /><CopyCite onCopy={onCopy} text={cite('announced', s.announced.date ?? 'date not located', s.announced.date ?? 'undated', s.announced.srcs[0])} /></> : 'not located'}</dd>
        <dt className="font-mono text-[12px] text-text-muted">Approved</dt>
        <dd>{s.approved ? <>{`${s.approved.date ?? 'date not located'} · `}{s.approved.body ? <Verbatim>{s.approved.body}</Verbatim> : 'body not stated'}{' '}<Src srcs={s.approved.srcs} /><CopyCite onCopy={onCopy} text={cite('approved', s.approved.date ?? 'date not located', s.approved.date ?? 'undated', s.approved.srcs[0])} /></> : 'not located'}</dd>
        <dt className="font-mono text-[12px] text-text-muted">Launched</dt>
        <dd>{s.launched ? <>{`${s.launched.date ?? 'date not located'} `}<Src srcs={s.launched.srcs} /><CopyCite onCopy={onCopy} text={cite('launched', s.launched.date ?? 'date not located', s.launched.date ?? 'undated', s.launched.srcs[0])} /></> : 'not located'}</dd>
        <dt className="font-mono text-[12px] text-text-muted">Election</dt>
        <dd>
          {ec ? (
            <>
              {`${ec.election ?? 'election not named'} · ${ec.date ?? 'date not located'} · `}
              {ec.monthsFromLaunch != null && computedMonths != null && Math.abs(ec.monthsFromLaunch - computedMonths) > 1
                ? `recorded ${ec.monthsFromLaunch} · computed ${computedMonths} months after launch (computed here; the page does not choose)`
                : computedMonths != null ? `${computedMonths} months after launch, computed here` : ec.monthsFromLaunch != null ? `${ec.monthsFromLaunch} months after launch as recorded` : 'months not computable from the recorded dates'}
              {` · ${ec.incumbentParty ?? 'incumbent not recorded'} → `}
              {ec.result ? <Verbatim>{ec.result}</Verbatim> : 'result not recorded'}
              {ec.seatChange ? <>{' · seat change '}<Verbatim>{ec.seatChange}</Verbatim></> : ''}
              {' '}<Src srcs={ec.srcs} />
            </>
          ) : nextElection ? `next assembly election in the file: ${nextElection.label} ${nextElection.date}${nextElection.months != null ? ` · ${nextElection.months} months after launch, computed here` : ''} · ${nextElection.result}` : 'not located'}
        </dd>
      </dl>

      <H>Who carried it</H>
      {s.ministers.length ? (
        <ul className="space-y-1 text-[13px]">
          {s.ministers.map((m, i) => {
            const per = m.personId ? personOf(m.personId) : null;
            return (
              <li key={i}>
                {per ? (per.href ? <Link to={per.href} className="underline underline-offset-2 hover:text-accent">{per.label}</Link> : per.label) : 'person not stated'}
                {per && !per.resolved ? ' (identity not confirmed)' : ''}
                {` · ${m.role ?? 'role not stated'} · ${m.action ?? 'action not recorded'} · ${m.date ?? 'date not located'} · ${m.party ?? 'party not recorded'} `}
                <Src srcs={m.srcs} />
              </li>
            );
          })}
        </ul>
      ) : <p className="text-text-muted text-[13px]">No office-holder recorded for this scheme.</p>}

      <H>What it pays</H>
      {amounts.length ? (
        <ul className="space-y-1.5 text-[13px]">
          {amounts.map((a, i) => {
            const ann = annualPerHead(a.amount, unit);
            return (
              <li key={i}>
                {`${a.date ?? 'date not located'} · ${a.amount != null ? `₹${fmtNum(a.amount)}` : 'amount not located'} as recorded `}
                {unit ? <Verbatim>{unit}</Verbatim> : 'unit not recorded'}
                {a.note && !a.base ? <>{' · '}<Verbatim>{a.note}</Verbatim></> : null}
                {a.base ? <span className="text-text-muted">{' · base amount, cited to the scheme record (the contract has no per-amount source)'}</span> : null}
                {' '}<Src srcs={a.srcs} />
                {ann.value != null && ann.factor === 12 ? ` · ₹${fmtNum(ann.value)} / yr ×12, computed here` : ''}
                <CopyCite onCopy={onCopy} text={cite(a.base ? 'per head, base amount (cited to the scheme record; the contract has no per-amount source)' : 'per head', a.amount != null ? `₹${fmtNum(a.amount)} ${unit ?? ''}` : 'not located', a.date ?? 'undated', a.srcs[0])} />
              </li>
            );
          })}
          {promised.map((t, i) => (
            <li key={`p${i}`} className="font-mono text-[12px]">{`promised: ${t.date ?? 'date not located'} · `}{t.note ? <Verbatim>{t.note}</Verbatim> : 'no note'}{' '}<Src srcs={t.srcs} /></li>
          ))}
        </ul>
      ) : <p className="text-text-muted text-[13px]">No per-head amount recorded.</p>}

      <H>How many, how much</H>
      <div className="text-[13px]">
        {s.beneficiaries.length ? (
          <ul className="space-y-1">
            {s.beneficiaries.map((b, i) => (
              <li key={i}>{`as of ${b.asOf ?? 'date not located'} · ${b.count != null ? fmtNum(b.count) : 'count not located'} enrolled `}<Src srcs={b.srcs} /><CopyCite onCopy={onCopy} text={cite('beneficiaries', b.count != null ? fmtNum(b.count) : 'not located', b.asOf ?? 'undated', b.srcs[0])} /></li>
            ))}
          </ul>
        ) : <p className="text-text-muted">No beneficiary count recorded.</p>}
        {s.outlay.length ? (
          <ul className="space-y-1 mt-2">
            {s.outlay.map((o, i) => (
              <li key={i}>
                {`FY ${o.fy} · budgeted ${o.budgetedCr != null ? `₹${fmtNum(o.budgetedCr)} cr` : 'not located'} · actual ${o.actualCr != null ? `₹${fmtNum(o.actualCr)} cr` : 'not located'} · state budget ${o.pctOfStateBudget != null ? `${fmtNum(o.pctOfStateBudget)} per cent` : 'not located'} · GSDP ${o.pctOfGSDP != null ? `${fmtNum(o.pctOfGSDP)} per cent` : 'not located'} `}
                {fyYear && yearOf(o.fy) === year && o.fy.startsWith(String(year)) ? <span className="font-mono text-[12px] text-accent">← map year </span> : null}
                <Src srcs={o.srcs} />
                <CopyCite onCopy={onCopy} text={cite(`outlay FY ${o.fy}`, `budgeted ${o.budgetedCr ?? 'not located'} · actual ${o.actualCr ?? 'not located'} ₹ cr`, `FY ${o.fy}`, o.srcs[0])} />
              </li>
            ))}
          </ul>
        ) : <p className="text-text-muted mt-2">No outlay recorded.</p>}
        <Caption id="C11">Counts are dated snapshots from different sources, not a series, and are not interpolated. Enrolled is not paid. Budgeted is what was allocated; actual is what was spent, often published two years late.</Caption>
      </div>

      <H>What happened to it</H>
      {statusSorted.length ? (
        <ul className="space-y-1 text-[13px]">
          {statusSorted.map((t, i) => (
            <li key={i}>
              <span className="font-mono text-[12px]">{`${t.date ?? 'undated'} · ${t.status}`}</span>
              {t.note ? <>{' · '}<Verbatim>{t.note}</Verbatim></> : null}{' '}
              <Src srcs={t.srcs} />
              <CopyCite onCopy={onCopy} text={cite('status', t.status, t.date ?? 'undated', t.srcs[0])} />
            </li>
          ))}
        </ul>
      ) : <p className="text-text-muted text-[13px]">No status history recorded.</p>}

      <H>What evaluations found</H>
      {findings.length ? (
        <div className="text-[13px]">
          {findings.some((f) => f.tier === 'alleged') && <p className="text-[14px] text-text-secondary">{ROSE_KEY}</p>}
          <ul className="space-y-2">
            {findings.map((f) => (
              <li key={f.idx}>
                {f.tier === 'alleged' ? (
                  <AllegationPair schemeId={s.id} allegation={<>{'date not located · body not stated · '}<TierWord tier={f.tier} />{' '}<Verbatim>{f.finding}</Verbatim>{' '}<Src srcs={f.srcs} /></>} />
                ) : (
                  <p>{'date not located · body not stated · '}<TierWord tier={f.tier} />{' '}<Verbatim>{f.finding}</Verbatim>{' '}<Src srcs={f.srcs} /></p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="text-[13px] text-text-secondary">No evaluation, audit, court finding or survey located for this scheme. Recorded as a gap.</p>}
      {tiers.has('alleged') && <SchemeResponses schemeId={s.id} />}

      <H>Who else benefits</H>

      {benefits.length ? (
        <ul className="space-y-2 text-[13px]">
          {benefits.map((w, i) => {
            const body = <>{`${whoLabel(w.who)} · `}{w.how ? <Verbatim>{w.how}</Verbatim> : 'channel not stated'}{` · ${w.amountCr != null ? `₹${fmtNum(w.amountCr)} cr` : 'not stated'} `}{w.tier ? <TierWord tier={w.tier} /> : 'tier not recorded'}{' '}<Src srcs={w.srcs} /></>;
            return <li key={i}>{w.tier === 'alleged' ? <AllegationPair schemeId={s.id} allegation={body} /> : body}</li>;
          })}
        </ul>
      ) : <p className="text-[13px] text-text-secondary">None recorded, which is not the same as none.</p>}

      <H>Sources</H>
      <p className="text-[13px]"><Src srcs={s.srcs} /></p>
      <p className="font-mono text-[12px] text-text-muted mt-2">{`party as recorded: ${partyText(s)}${canon(s.party) ? ` · resolved as ${canon(s.party)}` : ' · not resolved to one party'}`}</p>
    </Shell>
  );
});

export const StateMoneyBlock = ({ title, items, foot }: { title: string; items: { key: string; node: ReactNode }[]; foot: string }) => (
  <div className="mt-3 text-[13px]">
    <H>{title}</H>
    <ul className="space-y-1">{items.map((it) => <li key={it.key}>{it.node}</li>)}</ul>
    <p className="font-mono text-[12px] text-text-muted mt-1">{foot}</p>
  </div>
);
