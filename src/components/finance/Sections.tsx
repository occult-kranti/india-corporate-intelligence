import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GEdge, GNode, Tier } from '../../graph/schema';
import { TierLegend } from '../Editorial';
import {
  type Filters, type Lens, LENSES, LENS_LABEL, MODULES, responsesTo, responseLine, NO_RESPONSE, labelOf, DERIVED_GAPS, derivedFor, graphParts, CENSUS, CENSUS_ONLY_IDS,
  sourceClass, hostOf, FAM_SPLITS, nodeOf, strictSt, fmtInt, ASOF, hasRealResponse, type DerivedGap,
} from '../../data/financeView';
import type { Void, FleetText } from '../../graph/fleet';
import { Caption, usePage, TierWord, Src, Q, NOTHING, Denominator, captionLine, Table } from './ui';
import { BaseRateLine } from './Control';

const GraphExplorer = lazy(() => import('../viz/GraphExplorer'));

const H2 = 'heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-3';

// ---------------------------------------------------------------------------
// Would the same lens alarm us elsewhere? (§5.4.1)
// ---------------------------------------------------------------------------

function Wilson({ k, n }: { k: number; n: number }) {
  const p = k / n; const z = 1.96;
  const d = 1 + (z * z) / n; const c = (p + (z * z) / (2 * n)) / d; const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return (
    <svg data-ci="" width="80" height="8" aria-hidden="true" className="inline-block ml-2 align-middle">
      <line x1="0" x2="80" y1="4" y2="4" stroke="rgba(150,150,150,0.35)" />
      <line x1={80 * Math.max(0, c - h)} x2={80 * Math.min(1, c + h)} y1="4" y2="4" stroke="rgb(200,200,200)" strokeWidth="2" />
      <circle cx={80 * p} cy="4" r="2" fill="rgb(230,230,230)" />
    </svg>
  );
}

export function BaseRatesSection({ lens }: { lens: Lens }) {
  const { empty } = usePage();
  const mod = MODULES[lens];
  const domains = [...new Set(mod.baseRates.map((r) => r.domain))];
  return (
    <section id="baserates" className="pt-12">
      <h2 className={H2}>Would the same lens alarm us elsewhere?</h2>
      {empty || !domains.length ? <p className="text-[14px]">{NOTHING}</p> : domains.map((d) => (
        // One section element holds every domain's rows and texts, each text directly under
        // its own rows: files that share a row wording still keep their texts in the frame.
        <div key={d} className="mt-4" data-domain={d}>
          <h3 className="font-mono text-[13px] text-text-muted">{d}</h3>
          <ul className="list-none p-0 m-0 space-y-1.5 mt-1">
            {mod.baseRates.filter((r) => r.domain === d).map((r, i) => {
              const both = Number.isInteger(r.numerator) && Number.isInteger(r.denominator);
              return (
                <li key={i} className="text-[13.5px] text-text-secondary">
                  <BaseRateLine r={r} />
                  {both && (r.denominator as number) >= 10 && (r.numerator as number) <= (r.denominator as number) && <Wilson k={r.numerator as number} n={r.denominator as number} />}
                  <span className="block"><Src srcs={r.srcs} of={r.property} inline /></span>
                </li>
              );
            })}
          </ul>
          {mod.symmetry.filter((s) => s.domain === d).map((s, i) => <p key={i} className="text-[14px] fin-q mt-2 max-w-[80ch]">{s.text}</p>)}
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Narratives, rated (§5.4.2)
// ---------------------------------------------------------------------------

const RUNGS = ['established', 'well-supported', 'contested', 'speculative', 'unsupported', 'debunked'] as const;
/**
 * Caption C14 (§5.4.2), the same on every lens. The spec's last sentence says "a family";
 * FG-32 allows that word only in narrative text and the standing line, so the page says
 * "lineage" — one word changed, the sentence kept on all three lenses.
 */
const C14 = 'A narrative is a claim about the world. It is rated, with its strongest case, its strongest counter and what would change the rating. It is never drawn as an edge. The same narrative can appear in more than one research file with a different rating; they are listed as recorded, not reconciled. A narrative that names a lineage, a religion or an ethnicity as the actor is recorded here in the words it circulates in, and is tested against the institutions the record holds.';

export function NarrativesSection({ lens, withHook }: { lens: Lens; withHook: boolean }) {
  const { empty } = usePage();
  const [all, setAll] = useState(false);
  const mods = all ? LENSES : [lens];
  const list = mods.flatMap((l) => MODULES[l].narratives.map((n) => ({ ...n, fleet: MODULES[l].fleet })));
  const total = LENSES.reduce((s, l) => s + MODULES[l].narratives.length, 0);
  return (
    <section id="narratives" className="pt-12">
      <h2 className={H2}>Narratives, rated</h2>
      {empty && <p className="text-[14px]">{NOTHING}</p>}
      <Denominator>{`${list.length} narratives in ${all ? 'the three registers' : 'this register'}, on six rungs; ratings are listed as recorded, not reconciled.`}</Denominator>
      <button type="button" aria-pressed={all} onClick={() => setAll(!all)} className="font-mono text-[12px] underline mb-2">{`show every register's narratives (${total})`}</button>
      <figure className="m-0" aria-describedby="fin-c14">
        {RUNGS.map((rung) => {
          const items = list.filter((n) => n.status === rung);
          return (
            <div key={rung} className="mt-3">
              <h3 className="font-mono text-[13px] text-text">{`${rung} (${items.length})`}</h3>
              {!items.length ? <p className="text-[13.5px] text-text-muted">none in this file</p> : (
                <ul className="list-none p-0 m-0 space-y-3 mt-1">
                  {items.map((n, i) => (
                    <li key={i} className="border-l-2 border-border-light pl-3 text-[13.5px]">
                      <p className="text-text"><Q>{n.claim}</Q></p>
                      <div className="grid gap-3 sm:grid-cols-2 mt-1">
                        <p><span className="font-mono text-[12px] text-text-muted block">Strongest case</span><Q>{n.strongestCase ?? 'not recorded'}</Q></p>
                        <p><span className="font-mono text-[12px] text-text-muted block">Strongest counter</span><Q>{n.strongestCounter ?? 'not recorded'}</Q></p>
                      </div>
                      <p className="mt-1"><span className="font-mono text-[12px] text-text-muted">What would change this: </span><Q>{n.whatWouldChangeThis ?? 'not recorded'}</Q></p>
                      <p className="font-mono text-[12px] text-text-muted">{`research file: ${n.fleet} · ${n.domain}`}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <Caption id="fin-c14" cap={withHook ? 'C14' : undefined} as="figcaption">{C14}</Caption>
      </figure>
    </section>
  );
}

// ---------------------------------------------------------------------------
// What this lens cannot show (§5.4.3) and the Gaps panel (§5.5.3)
// ---------------------------------------------------------------------------

export function CannotShow({ lens }: { lens: Lens }) {
  const { empty } = usePage();
  const mod = MODULES[lens];
  const derived = derivedFor(lens);
  return (
    <section id="cannot" className="pt-12">
      <h2 className={H2} data-page-copy="">What this lens cannot show</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <ul className="list-none p-0 m-0 space-y-3">
          {mod.voids.map((v, i) => <li key={`v${i}`} className="text-[15px] text-text"><Q>{v.what}</Q>{v.whyItMatters && <span className="block text-[14px] text-text-secondary mt-1"><Q>{v.whyItMatters}</Q></span>}<span className="block font-mono text-[12px] text-text-muted">{`void · ${v.domain}`}</span></li>)}
          {mod.gaps.map((g, i) => <li key={`g${i}`} className="text-[15px] text-text"><Q>{g.text}</Q><span className="block font-mono text-[12px] text-text-muted">{`recorded as a research gap by the ${g.domain} file`}</span></li>)}
          {derived.map((g, i) => <li key={`d${i}`} className="text-[15px] text-text">{g.text}<span className="block font-mono text-[12px] text-text-muted">derived by this page</span></li>)}
        </ul>
      )}
    </section>
  );
}

/** One lens's block of the Gaps panel: its voids and gaps grouped by domain, then its derived gaps. */
function GapBlock({ title, voids, gaps, derived }: { title: string; voids: Void[]; gaps: FleetText[]; derived: DerivedGap[] }) {
  const domains = [...new Set([...voids.map((v) => v.domain), ...gaps.map((g) => g.domain)])].sort();
  return (
    <div className="mt-4">
      <h3 className="text-[16px] font-semibold text-text">{title}</h3>
      <p className="text-[14px] text-text-secondary">{`${voids.length} voids and ${gaps.length} gaps recorded by the research, and ${derived.length} derived by this page.`}</p>
      {domains.map((d) => (
        <div key={d} className="mt-2">
          <h4 className="font-mono text-[12px] text-text-muted">{d}</h4>
          <ul className="list-none p-0 m-0 space-y-2 mt-1 text-[14px]">
            {voids.filter((v) => v.domain === d).map((v, i) => (
              <li key={`v${i}`} className="text-text"><Q>{v.what}</Q>{v.whyItMatters ? <span className="block text-text-secondary"><Q>{v.whyItMatters}</Q></span> : null}
                <span className="block"><Src srcs={v.srcs} of={v.what} inline /></span></li>
            ))}
            {gaps.filter((g) => g.domain === d).map((g, i) => <li key={`g${i}`} className="text-text"><Q>{g.text}</Q><span className="font-mono text-[12px] text-text-muted">{` · recorded as a research gap by the ${g.domain} file`}</span></li>)}
          </ul>
        </div>
      ))}
      {derived.length > 0 && (
        <ul className="list-none p-0 m-0 space-y-2 mt-2 text-[14px]">
          {derived.map((g, i) => <li key={`d${i}`} className="text-text">{g.text}<span className="font-mono text-[12px] text-text-muted"> · derived by this page</span></li>)}
        </ul>
      )}
    </div>
  );
}

/** The shared Gaps panel (§5.5.3): every lens's block, the active lens first, then the page-wide gaps. */
export function GapsSection({ lens }: { lens: Lens }) {
  const { empty } = usePage();
  const order = [lens, ...LENSES.filter((l) => l !== lens)];
  const shared = DERIVED_GAPS.filter((g) => g.lens === 'all');
  return (
    <section id="gaps" className="pt-12">
      <h2 className={H2}>Gaps</h2>
      {empty && <p className="text-[14px]">{NOTHING}</p>}
      {order.map((l) => (
        <GapBlock key={l} title={`${LENS_LABEL[l]}${l === lens ? ' (this lens)' : ''}`} voids={MODULES[l].voids} gaps={MODULES[l].gaps} derived={derivedFor(l)} />
      ))}
      {shared.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[16px] font-semibold text-text">Across the three registers</h3>
          <ul className="list-none p-0 m-0 space-y-2 mt-1 text-[14px]">
            {shared.map((g, i) => <li key={`s${i}`} className="text-text">{g.text}<span className="font-mono text-[12px] text-text-muted"> · derived by this page</span></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contested (§5.5.2): each alleged claim beside its response, equal width
// ---------------------------------------------------------------------------

export function ContestedSection({ lens, f }: { lens: Lens; f: Filters }) {
  const { empty, narrow } = usePage();
  const alleged = MODULES[lens].edges.filter((e) => e.tier === 'alleged' && e.pred !== 'contra');
  const shown = f.tiers.has('alleged') ? alleged : [];
  // A contra recording only that no response was found is printed beside its claim, but
  // it is not an answer and is not counted as one.
  const answered = alleged.filter((e) => hasRealResponse(e.id)).length;
  return (
    <section id="contested" className="pt-12">
      <h2 className={H2}>Contested</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : !alleged.length ? <p className="text-[14px]">No alleged claims in this lens.</p> : (
        <>
          <Denominator>{`${alleged.length} alleged claims in this lens · ${answered} with a recorded response · ${alleged.length - answered} without — whether a response was sought is not recorded.`}</Denominator>
          <div className="space-y-4">
            {shown.map((e) => {
              const rs = responsesTo(e.id);
              if (narrow) {
                return (
                  <dl key={e.id} className="border border-border rounded p-3 grid gap-1 text-[14px]">
                    <div><dt className="font-mono text-[12px] text-text-muted">Claim</dt><dd className="m-0 text-[14px]">{`${labelOf(e.s)} alleges [${e.tier}]: `}<Q>{e.lab ?? ''}</Q>{' '}<Q>{e.d ?? ''}</Q></dd></div>
                    <div><dt className="font-mono text-[12px] text-text-muted">Response</dt><dd className="m-0 text-[14px]"><span className="fin-q">{rs.length ? rs.map(responseLine).join(' ‖ ') : NO_RESPONSE}</span></dd></div>
                    <div><dt className="font-mono text-[12px] text-text-muted">Sources</dt><dd className="m-0"><Src srcs={e.srcs} of={e.lab ?? e.id!} inline /></dd></div>
                  </dl>
                );
              }
              return (
                <div key={e.id} className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                  <div className="min-w-0">
                    <p className="text-[14px] text-text-secondary m-0">
                      {`${labelOf(e.s)} alleges [${e.tier}]: ${e.lab ?? ''} — ${e.d ?? ''} `}
                      <span className="block mt-1"><Src srcs={e.srcs} of={e.lab ?? e.id!} inline /></span>
                    </p>
                  </div>
                  <div className="min-w-0 text-[14px] text-text-secondary">
                    {rs.length ? rs.map((r) => <p key={r.id} className="m-0 mb-1">{responseLine(r)} <TierWord tier={r.tier} /> <Src srcs={r.srcs} of={r.lab ?? r.id!} inline /></p>) : <p className="m-0">{NO_RESPONSE}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Refusals (§14) and the source ledger (§5.5.5)
// ---------------------------------------------------------------------------

export const REFUSALS = [
  'A ₹ total over all loans, or any subtotal over researched records: census and sample, duplicates, facilities beside tranches and memoranda make it false.',
  'A map of loans by borrower, or placement from a registered office or head office.',
  "A holder ranking, a 'most connected', an influence or risk score: rows are the comparison set, then alphabetical, and counts of records measure research attention.",
  'BlackRock, or any holder, alone: the comparison set always renders, and below four rows nothing renders.',
  'A percentage parsed from prose: a cell says its state in words until the field exists.',
  'A family, a religion or an ethnicity as a node, edge, filter or colour: narratives that name one are rated on the ladder only.',
  'A classification of FCRA actions by keyword, of associations by religion or stance, or of donors as foreign or domestic: labels are quoted.',
  'A sum of overlapping cancellation counts.',
  'An FCRA receipts map from state figures quoted in prose, or read as where the money was spent: the state map draws the Rajya Sabha annexure\'s rows by the registered state of each association, registered in, not where it works.',
  'Party colour anywhere: party is text, and there is no party, religion, donor-country or era filter.',
  'Budget marks invented from a calendar the data does not hold, or elections the register does not carry.',
  'A correlation or window between approvals and elections: the lanes show both, and the month histogram shows the boring explanation.',
  'A merge of two ids by name.',
];

export function RefusalsSection() {
  return (
    <section id="refusals" className="pt-12">
      <h2 className={H2}>What this page refuses to show, and why</h2>
      <ul className="list-disc pl-5 space-y-1 text-[14px] text-text-secondary max-w-[80ch]">{REFUSALS.map((r) => <li key={r}>{r}</li>)}</ul>
    </section>
  );
}

export function SourceLedger({ lens, f }: { lens: Lens; f: Filters }) {
  const { filters: filterText, empty } = usePage();
  const mod = MODULES[lens];
  // The ledger lists the sources of what the tier filter shows, so its example record is
  // always one the reader can see — a filtered-out claim is not quoted back through it.
  const rows = useMemo(() => {
    const by = new Map<string, { label: string; url: string; n: number; first: string }>();
    const add = (srcs: [string, string][] | undefined, lab: string) => {
      for (const [label, url] of srcs ?? []) { const r = by.get(url); if (r) r.n++; else by.set(url, { label, url, n: 1, first: lab }); }
    };
    for (const e of mod.edges) if (f.tiers.has(e.tier)) add(e.srcs, e.lab ?? e.id ?? '');
    for (const n of mod.nodes) add(n.srcs, n.label);
    return [...by.values()].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : a.url < b.url ? -1 : 1));
  }, [mod, f.tiers]);
  return (
    <section className="pt-12" aria-labelledby="fin-ledger-h">
      <h2 id="fin-ledger-h" className={H2}>Sources</h2>
      {empty ? <p className="text-[14px]">{NOTHING}</p> : (
        <div className="overflow-x-auto">
          <Table caption={captionLine(rows.length, `distinct sources cited by this lens, cited in a file dated ${ASOF[lens] ?? 'not promoted'}`, lens, filterText)} className="min-w-[40rem]"
            cols={[{ key: 's', label: 'Source' }, { key: 'c', label: 'Class' }, { key: 'e', label: 'Establishes' }]}
            rows={rows.map((r) => ({ cells: [<a key="a" href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`${r.label} (${r.url})`} className="underline break-words">{r.label}<span className="font-mono text-[11px] text-text-muted">{` ${hostOf(r.url)}`}</span></a>, sourceClass([r.label, r.url]), `cited by ${r.n} records, e.g. ${r.first}`], out: [] }))} />
        </div>
      )}
      <TierLegend />
      <p className="text-[14px] text-text-secondary max-w-[72ch]">This platform maps public records and published claims about the conduct of public offices, and is a matter of legitimate public interest. It asserts no guilt. Allegations are identified as allegations, attributed, and paired with the response of those they concern. No node adjudicates a quid pro quo.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Connection graph (§5.5.1)
// ---------------------------------------------------------------------------

export function ConnectionsSection({ f, extraNodes, headingRef, withHook, onShowProjects }: {
  f: Filters; extraNodes: GNode[]; headingRef: React.RefObject<HTMLHeadingElement>; withHook: boolean; onShowProjects: (id: string) => void;
}) {
  const { narrow } = usePage();
  const box = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const parts = useMemo(() => graphParts(extraNodes), [extraNodes]);
  const inTier = (e: GEdge) => f.tiers.has(e.tier as Tier);
  const drawn = parts.edges.filter(inTier).length;
  useEffect(() => {
    if (narrow || mount) return;
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) setMount(true); }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [narrow, mount]);
  const sel = f.sel;
  const selKnown = sel ? parts.nodes.some((n) => n.id === sel) : true;
  const censusOnly = sel && CENSUS_ONLY_IDS.has(sel);
  const splits = FAM_SPLITS.length ? ` ${FAM_SPLITS.map((s) => `${s.pairs.length} ${s.ty} nodes carry different actor families across research files (${s.pairs.join('; ')}); their hue is inconsistent and means nothing.`).join(' ')}` : '';
  const capText: ReactNode = 'Position carries no meaning. Line dash is evidence tier; hue is the kind of actor; shape is entity type; size is a declared band. Persons appear only in public roles.';
  return (
    <section id="connections" className="pt-12 scroll-mt-40" aria-labelledby="fin-conn-h">
      <h2 id="fin-conn-h" ref={headingRef} tabIndex={-1} className={`${H2} outline-none`}>Connections across the three registers</h2>
      <p className="text-[14px] text-text-secondary max-w-[80ch]">
        {`${fmtInt(drawn)} relationships across the three registers are drawn under the tier filter (${fmtInt(parts.edges.length)} in all). The World Bank census (${CENSUS.length} loan records) is not drawn here: two lenders to one borrower, ${CENSUS.length} times, would draw two fans of parallel lines that show degree and hide value. It is in the map, the flow and the list. Identity across the three registers is joined only where ids match; the same institution can appear under two ids until reconciled. ${parts.dropped} edges with an endpoint outside every register are not drawn. This graph's own filters are its own; the page's year control does not reach it.${splits}`}
      </p>
      {sel && !selKnown && !censusOnly && <p className="text-[14px] text-amber">{`${sel} is not in the register: no node with that id is in the graph.`}</p>}
      {censusOnly && (
        <p className="text-[14px] text-text">
          {`${labelOf(sel!)} appears only in the World Bank project table, which is not drawn in the graph. `}
          <a href="#twin-project-list" className="underline" onClick={(e) => { e.preventDefault(); onShowProjects(sel!); }}>Show its projects →</a>
        </p>
      )}
      <figure className="m-0" aria-describedby="fin-c15">
        <div ref={box} style={{ minHeight: narrow ? 120 : 620 }}>
          {narrow && !mount ? (
            <button type="button" className="font-mono text-[13px] underline min-h-[44px]" onClick={() => setMount(true)}>{`Load the graph${sel && selKnown ? ` — ${labelOf(sel)} is selected` : ''}`}</button>
          ) : mount ? (
            <Suspense fallback={<p className="text-[14px] text-text-secondary">{`Drawing the connection graph: ${parts.nodes.length} nodes and ${parts.edges.length} relationships…`}</p>}>
              <GraphExplorer nodes={parts.nodes} edges={parts.edges} height={narrow ? 480 : 620} />
            </Suspense>
          ) : <p className="text-[14px] text-text-secondary">{`The graph draws when it scrolls into view: ${parts.nodes.length} nodes and ${parts.edges.length} relationships.`}</p>}
        </div>
        {withHook
          ? <Caption id="fin-c15" cap="C15" as="figcaption">{capText}</Caption>
          : <figcaption id="fin-c15" className="text-[14px] leading-relaxed text-text-secondary border-l-2 border-border-light pl-3 max-w-[72ch] my-3">{capText}</figcaption>}
      </figure>
    </section>
  );
}

export { nodeOf, strictSt };
