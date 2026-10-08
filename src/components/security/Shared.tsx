import { Suspense, lazy, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GEdge, Tier } from '../../graph/schema';
import type { SecurityFile } from '../../data/cppp';
import {
  type Filters, type Lens, LENS_DOMAINS, LENS_LABEL, EMPTY, RUN, ASOF, VOIDS, GAPS, KILLED, BASE_RATES, NARRATIVES, ALLEGED, ANSWERED, EDGES, BUDGETS, STRENGTH, FOOTPRINT,
  baseRateForm, baseRateShare, baseRatesOf, symmetryOf, voidsOf, gapsOf, narrativesOf, derivedGaps, responseChain, responderParts, RESPONSE_HEAD_PRE, responseHeadPost, labelOf, fileOf, edgePass,
  sliceFigures, drawnEdges, GRAPH_NODES, GRAPH_EDGES, UNRESOLVED, SPLIT_IDS, UNDATED_EDGES, FAM_SPLITS, fyStart, NO_RESPONSE, NOTHING, CONTROL_EMPTY, hostOf, FORCE_NODE_LIST,
} from '../../data/securityView';
import { usePage, Caption, Twin, TwinTable, Exports, captionText, Src, Quote, Tx, Lab, TierWord, Roving, FOCUS, TARGET, QBlock, Denominator, QuotedLink, End, type Row, type Col } from './ui';

const GraphExplorer = lazy(() => import('../viz/GraphExplorer'));
const H2 = 'text-[20px] font-semibold text-text mb-2 heading-editorial';
const NUM_FMT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 10 });
const fmtNum = (x: number) => NUM_FMT.format(x);
/** A recorded zero printed as a recorded zero, never as a bare 0 that reads as absence (AC-61). */
export const zeroCount = (n: number) => (n === 0 ? '0, as recorded' : fmtNum(n));

// ---------------------------------------------------------------------------
// Base rates (§5.1.4): verbatim cards, the domain's symmetry text in the same section
// ---------------------------------------------------------------------------

export function baseRateText(r: (typeof BASE_RATES)[number]): { lead: string; chip: string | null } {
  const form = baseRateForm(r);
  if (form === 'null') return { lead: 'not computed in this file', chip: "figure in the research file's wording, not computed by this page" };
  if (form === 'two-figures') return { lead: `${fmtNum(r.numerator!)} and ${fmtNum(r.denominator!)}`, chip: 'two figures as the research states them, not a share' };
  return { lead: `${fmtNum(r.numerator!)} of ${fmtNum(r.denominator!)}`, chip: null };
}
export function BaseRateSection({ domain, heading = true, roving = true, extra }: { domain: string; heading?: boolean; roving?: boolean; extra?: ReactNode }) {
  const { f, narrow } = usePage();
  const rows = baseRatesOf(domain);
  const sym = symmetryOf(domain);
  const shown = f.tiers.has('analytic');
  if (!rows.length && !sym) return null;
  const body = (
    <section aria-labelledby={`sec-br-${domain}`} className="mt-4 border-t border-border pt-2 min-w-0">
      {heading && <h4 id={`sec-br-${domain}`} className="text-[14px] font-semibold text-text mb-1">{`Base rates in the ${domain} research file`}</h4>}
      {!heading && <span id={`sec-br-${domain}`} className="sr-only">{`Base rates in the ${domain} research file`}</span>}
      {!shown && rows.length > 0 && <p className="text-[13px] text-text-secondary">{`${rows.length} base rates hidden by the tier filter — not absent (base rates are the research's computed ratios, read as analytic)`}</p>}
      {shown && rows.length > 0 && (
        <Wrap on={roving} label={`Base rates and their sources, ${domain} research file`}>
          <ul className="list-none p-0 m-0 space-y-1.5 text-[13.5px]">
            {rows.map((r, i) => {
              const t = baseRateText(r);
              return (
                <li key={i} className="border-l border-border-light pl-2">
                  <span className="text-text-secondary">
                    <span className="font-mono tabular-nums text-text">{t.lead}</span><Tx>{' — '}</Tx><Quote declared={[r.numerator, r.denominator]}>{r.label ?? r.property}</Quote>
                  </span>
                  {t.chip && <span className={`ml-1 font-mono text-[12px] ${t.chip.startsWith('figure') ? 'text-amber' : 'text-text-muted'}`}>{` [${t.chip}]`}</span>}
                  <span className="block font-mono text-[12px] text-text-muted"><Quote declared={[r.numerator, r.denominator]}>{r.property}</Quote></span>
                  <Src srcs={r.srcs} of={r.property} inline declared={[r.numerator, r.denominator]} /><End />
                </li>
              );
            })}
          </ul>
        </Wrap>
      )}
      {sym ? <Quote as="p" className="text-[14px] text-text-secondary mt-2 mb-0 max-w-[80ch]">{sym}</Quote> : <p className="text-amber text-[14px]">{CONTROL_EMPTY}</p>}
      <p className="font-mono text-[12px] text-text-muted m-0">{`wording: ${domain} research file, run ${RUN}`}</p>
      {extra}
    </section>
  );
  // Below 640px the cards and the symmetry text sit behind one summary per file, so the
  // page stays within its length budget (SG-53); nothing is dropped, and it opens in place.
  if (!narrow) return body;
  return (
    <details className="mt-3 border-t border-border pt-1">
      <summary className={`cursor-pointer text-[14px] py-2 ${FOCUS}`}>{`${domain} research file: ${rows.length} base rates${sym ? ' and the symmetry text' : ''}${extra ? ', and its comparisons across states' : ''}`}</summary>
      {body}
    </details>
  );
}
/** Below 640px a long list sits behind one summary that names what it holds; above, it is open. */
export function Fold({ on, summary, children, open, small }: { on: boolean; summary: ReactNode; children: ReactNode; open?: boolean; small?: boolean }) {
  if (!on) return <>{children}</>;
  return (
    <details className={small ? '' : 'mt-1'} open={open}>
      <summary className={`cursor-pointer ${small ? 'text-[12px] leading-tight py-px' : 'text-[14px] leading-snug py-0.5'} ${FOCUS}`}>{summary}</summary>
      {children}
    </details>
  );
}
/** A roving group when the block is its own stop, a plain wrapper when an outer group already is. */
function Wrap({ on, label, children }: { on: boolean; label: string; children: ReactNode }) {
  return on ? <Roving label={label}>{children}</Roving> : <>{children}</>;
}
export function CompareTwin({ domains, title }: { domains: string[]; title: string }) {
  const { f, filterWords } = usePage();
  const rows: Row[] = f.tiers.has('analytic') ? domains.flatMap((d) => baseRatesOf(d).map((r) => {
    const form = baseRateForm(r);
    return {
      cells: [d, <Quote declared={[r.numerator, r.denominator]}>{r.label ?? r.property}</Quote>, r.numerator == null ? 'not computed in this file' : zeroCount(r.numerator), r.denominator == null ? 'not computed in this file' : zeroCount(r.denominator),
        baseRateShare(r) != null ? `${baseRateShare(r)}% (computed here from a of b)` : form === 'share' ? 'denominator under 10: no percentage' : 'not a share', <Src srcs={r.srcs} of={r.property} inline declared={[r.numerator, r.denominator]} />],
      out: [d, r.property, r.label ?? '', r.numerator ?? '', r.denominator ?? '', (r.srcs ?? []).map(([, u]) => u).join(' ')],
    };
  })) : [];
  const cols: Col[] = [{ key: 'd', label: 'domain', th: true }, { key: 'l', label: 'label' }, { key: 'n', label: 'numerator' }, { key: 'dd', label: 'denominator' }, { key: 'r', label: 'ratio where integer' }, { key: 's', label: 'sources' }];
  return (
    <Twin twin="compare" title={title} rowCount={rows.length}>
      {() => (
        <>
          <Exports name="Base rates" twin="compare" meta={{ table: 'Base rates', population: `the ${domains.join(', ')} research files`, rows: rows.length }} header={['domain', 'property', 'label', 'numerator', 'denominator', 'source_urls']} rows={() => rows.map((r) => r.out!)} />
          <TwinTable caption={captionText(rows.length, 'base rates as the research states them', filterWords)} amounts={false} cols={cols} rows={rows} />
        </>
      )}
    </Twin>
  );
}
export const C5_TEXT = "These ratios were computed by the research, each over the denominator printed beside it. The year and kind of each ratio are in its words, not in a field, so this page does not chart them. The symmetry text under each group is the research's account of running the same lens on both governments or both groups of states; this page has not re-run it.";

// ---------------------------------------------------------------------------
// Responses: every answer at the claim's size, replies nested under what they answer
// ---------------------------------------------------------------------------

/**
 * Who answered a record, on screen: the words around the responder are the page's, the
 * responder's register label is the research's. Built from `responderParts`, the one source
 * the string form (`responseHeadWords`, for twin cells and exports) also renders from.
 */
export function Responder({ r }: { r: GEdge }) {
  const p = responderParts(r);
  return <>{p.pre && <Tx>{p.pre}</Tx>}<Lab id={p.id} />{p.post && <Tx>{p.post}</Tx>}</>;
}
/** `Response from {responder} [{tier}], {date}:` with the responder's label kept as the record's words. */
export function ResponseHead({ r }: { r: GEdge }) {
  return <><Tx>{RESPONSE_HEAD_PRE}</Tx><Responder r={r} /><Tx>{responseHeadPost(r)}</Tx></>;
}
/** The response slot for one record: the chain as nested lists, or the exact no-response sentence. */
export function Responses({ claim, full = true, filter }: { claim: GEdge; full?: boolean; filter?: (e: GEdge) => boolean }) {
  const chain = responseChain(claim.id).filter((c) => !filter || filter(c.edge));
  const top = chain.filter((c) => c.depth === 1);
  if (!top.length) return <p data-response="false" className="m-0 text-text-secondary">{NO_RESPONSE}</p>;
  const kids = (parent: GEdge, depth: number): ReactNode => {
    const ks = chain.filter((c) => c.depth === depth && c.parent === parent);
    if (!ks.length) return null;
    return (
      <ul className="list-none pl-4 m-0 mt-1 space-y-1">
        {ks.map((c) => (
          <li key={c.edge.id} data-reply-depth={depth - 1}>
            <Tx>in reply to </Tx><Lab id={parent.s} /><Tx>{`, ${c.edge.from ?? 'undated'}: `}</Tx>
            <Quote record={c.edge}>{c.edge.lab}</Quote>{full && c.edge.d ? <><Tx> — </Tx><Quote record={c.edge}>{c.edge.d}</Quote></> : null}
            <span className="block text-[12.5px]"><Responder r={c.edge} /><Tx>{` · ${c.edge.tier}`}</Tx></span>
            {full && <Src srcs={c.edge.srcs} of={c.edge.lab ?? c.edge.id ?? 'response'} inline record={c.edge} />}
            {kids(c.edge, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };
  // One response slot per claim: every answer it holds, at the claim's size (U27).
  return (
    <div data-response="true">
    <ul className="list-none p-0 m-0 space-y-1.5">
      {top.map((c) => (
        <li key={c.edge.id} className="border-l-2 border-rose pl-2">
          <ResponseHead r={c.edge} /><Tx> </Tx><Quote record={c.edge}>{c.edge.lab}</Quote>{full && c.edge.d ? <><Tx> — </Tx><Quote record={c.edge}>{c.edge.d}</Quote></> : null}
          {full && <span className="block"><Src srcs={c.edge.srcs} of={c.edge.lab ?? c.edge.id ?? 'response'} inline record={c.edge} /></span>}
          {kids(c.edge, 2)}
        </li>
      ))}
    </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// What is not published (§5.4.3): the last Q-block of every lens, at findings size
// ---------------------------------------------------------------------------

/** The `What is not published?` block's heading, shared with the jump lists that name it. */
export const cannotShowTitle = (n: number) => `Q${n} — What is not published?`;
/** The narratives block's heading, shared with the jump lists that name it. */
export const narrativesTitle = (n: number) => `Q${n} — Which stories hold up?`;

export function CannotShow({ lens, q, n }: { lens: Lens; q: string; n: number }) {
  const { narrow } = usePage();
  const ds = LENS_DOMAINS[lens];
  const voids = voidsOf(ds);
  const gaps = gapsOf(ds);
  const killed = KILLED.filter((k) => ds.includes(k.domain));
  const derived = EMPTY ? [] : derivedGaps().filter((g) => g.lens === lens || g.lens === 'all');
  return (
    <QBlock q={q} title={cannotShowTitle(n)}>
      <p data-page-copy="" className="text-[14px] text-text">{`${voids.length} voids and ${gaps.length} gaps recorded by the research, ${killed.length} claim(s) killed in audit, and ${derived.length} derived by this page.`}</p>
      {EMPTY && <p className="text-[14px] text-text-secondary">{NOTHING}</p>}
      {narrow ? (
        <>
          <Fold on summary={`${voids.length} voids: what the research looked for and could not find`}>
            <ul className="list-none p-0 m-0 space-y-2 text-[14px] text-text-secondary">
              {voids.map((v, i) => <li key={`v${i}`}><Quote>{v.what}</Quote><End /></li>)}
            </ul>
          </Fold>
          <details className="mt-2">
            <summary className={`cursor-pointer text-[14px] py-2 ${FOCUS}`}>{`Why each void matters, its sources, the ${gaps.length} gaps, ${killed.length} killed claim(s) and ${derived.length} derived lines`}</summary>
            <ul className="list-none p-0 m-0 space-y-2 text-[14px] text-text-secondary">
              {voids.map((v, i) => <li key={`w${i}`}><Quote>{v.whyItMatters}</Quote> <Src srcs={v.srcs} of={v.what.slice(0, 60)} inline /><End /></li>)}
              {gaps.map((g, i) => <li key={`g${i}`}><Quote>{g.text}</Quote><End /></li>)}
              {killed.map((k) => <li key={k.id}><Tx>{`killed in audit: ${k.id} — `}</Tx><Quote>{k.lab}</Quote><Tx>{' — '}</Tx><Quote>{k.killedReason}</Quote><End /></li>)}
              {derived.map((g, i) => <li key={`d${i}`} data-page-copy="">{g.text}<End /></li>)}
            </ul>
          </details>
        </>
      ) : (
        <Roving label={`Voids and gaps for ${LENS_LABEL[lens]}`}>
          <ul className="list-none p-0 m-0 space-y-2 text-[14px] text-text-secondary">
            {voids.map((v, i) => (
              <li key={`v${i}`}>
                <Quote>{v.what}</Quote>
                {v.whyItMatters && <span className="block"><Quote>{v.whyItMatters}</Quote></span>}
                <span className="block font-mono text-[12px] text-text-muted">{`void · ${v.domain} research file`}</span>
                <Src srcs={v.srcs} of={v.what.slice(0, 60)} inline /><End />
              </li>
            ))}
            {gaps.map((g, i) => <li key={`g${i}`}><Quote>{g.text}</Quote><span className="block font-mono text-[12px] text-text-muted">{`gap · ${g.domain} research file`}</span><End /></li>)}
            {killed.map((k) => <li key={k.id}><Tx>{`killed in audit: ${k.id} — `}</Tx><Quote>{k.lab}</Quote><Tx>{' — '}</Tx><Quote>{k.killedReason}</Quote><End /></li>)}
            {derived.map((g, i) => <li key={`d${i}`} data-page-copy="">{g.text}<End /></li>)}
          </ul>
        </Roving>
      )}
    </QBlock>
  );
}

// ---------------------------------------------------------------------------
// Narratives, rated (§5.4.2)
// ---------------------------------------------------------------------------

const RUNGS = ['established', 'well-supported', 'contested', 'speculative', 'unsupported', 'debunked'] as const;
export function Narratives({ lens, q, n }: { lens: Lens; q: string; n: number }) {
  const { f, filterWords, narrow } = usePage();
  const [everyDomain, setEvery] = useState(false);
  const ds = everyDomain ? [...new Set(NARRATIVES.map((x) => x.domain))] : LENS_DOMAINS[lens];
  const rows = narrativesOf(ds);
  const twinRows: Row[] = f.tiers.has('analytic') ? rows.map((r) => ({
    cells: [r.status, <Quote>{r.claim}</Quote>, <Quote>{r.strongestCase}</Quote>, <Quote>{r.strongestCounter}</Quote>, <Quote>{r.whatWouldChangeThis}</Quote>, r.domain],
    out: [r.status, r.claim, r.strongestCase ?? '', r.strongestCounter ?? '', r.whatWouldChangeThis ?? '', r.domain],
  })) : [];
  return (
    <QBlock q={q} title={narrativesTitle(n)}>
      <div id="narratives" aria-describedby="sec-c20">
        {EMPTY && <p className="text-[14px]">{NOTHING}</p>}
        <p className="text-[13px]">
          <button type="button" aria-pressed={everyDomain} className={`underline underline-offset-2 ${FOCUS}`} onClick={() => setEvery(!everyDomain)}>{`Every domain's narratives (${NARRATIVES.length})`}</button>
        </p>
        <Roving label="Narratives and their sources">
          {RUNGS.map((rung) => {
            const list = rows.filter((x) => x.status === rung);
            return (
              <section key={rung} aria-labelledby={`sec-rung-${rung}`} className="mt-1.5 sm:mt-3">
                {/* Below 640px the rung's name and its count share one line (SG-53). */}
                {!(narrow && list.length) && <h4 id={`sec-rung-${rung}`} className={`text-[14px] font-semibold text-text m-0 ${narrow ? 'inline' : ''}`}>{rung}</h4>}
                {!list.length ? <p className={`text-[13.5px] text-text-muted m-0 ${narrow ? 'inline' : ''}`}>{narrow ? ': none in this file' : 'none in this file'}</p> : (
                  <Fold on={narrow} summary={narrow ? <><h4 id={`sec-rung-${rung}`} className="inline text-[14px] font-semibold text-text m-0">{rung}</h4>{`: ${list.length} narrative${list.length === 1 ? '' : 's'} rated ${rung}`}</> : `${list.length} narrative${list.length === 1 ? '' : 's'} rated ${rung}`}>
                  <ul className="list-none p-0 m-0 space-y-2">
                    {list.map((x, i) => (
                      <li key={i} className="text-[13.5px] border-l border-border-light pl-2">
                        <Quote as="p" className="m-0 text-text">{x.claim}</Quote>
                        <div className="grid sm:grid-cols-2 gap-2 mt-1">
                          <div><span className="font-mono text-[12px] text-text-muted block">strongest case</span><Quote>{x.strongestCase}</Quote></div>
                          <div><span className="font-mono text-[12px] text-text-muted block">strongest counter</span><Quote>{x.strongestCounter}</Quote></div>
                        </div>
                        <span className="block mt-1"><span className="font-mono text-[12px] text-text-muted">what would change this: </span><Quote>{x.whatWouldChangeThis}</Quote></span>
                        <span className="block font-mono text-[12px] text-text-muted">{`${x.domain} research file`}</span>
                        <Src srcs={x.srcs} of={x.claim.slice(0, 60)} inline /><End />
                      </li>
                    ))}
                  </ul>
                  </Fold>
                )}
              </section>
            );
          })}
        </Roving>
      </div>
      <Caption id="sec-c20" cap="C20">{`Status is the research's calibration on the evidence it found as of ${ASOF}, not the verdict of any court, regulator or auditor. A narrative is a claim about the world, rated with its strongest case, its strongest counter and what would change the rating. It is never drawn as an edge. The same narrative can appear in two research files with two ratings; both are listed as recorded.`}</Caption>
      <Twin twin="narratives" title={`Q${n} — Which stories hold up?`} rowCount={twinRows.length}>
        {() => (
          <>
            <Exports name="Narratives, rated" twin="narratives" meta={{ table: 'Narratives, rated', population: `${rows.length} narratives`, rows: twinRows.length }} header={['status', 'claim', 'strongest_case', 'strongest_counter', 'what_would_change', 'domain']} rows={() => twinRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(twinRows.length, 'narratives in the lens files', filterWords)} cols={[{ key: 's', label: 'status', th: true }, { key: 'c', label: 'claim' }, { key: 'a', label: 'strongest case' }, { key: 'b', label: 'strongest counter' }, { key: 'w', label: 'what would change it' }, { key: 'd', label: 'file' }]} rows={twinRows} />
          </>
        )}
      </Twin>
    </QBlock>
  );
}

// ---------------------------------------------------------------------------
// The connection graph (§5.5.1)
// ---------------------------------------------------------------------------

export function Connections({ f }: { f: Filters }) {
  const { narrow, patch, announce } = usePage();
  const box = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const nodes = useMemo(() => GRAPH_NODES(), []);
  const edges = useMemo(() => GRAPH_EDGES(), []);
  const drawn = drawnEdges(f.tiers as Set<Tier>).length;
  // The same element every render, so a page filter does not re-render the graph; it reads its own params.
  const graph = useMemo(() => <GraphExplorer nodes={nodes} edges={edges} height={narrow ? 480 : 620} />, [nodes, edges, narrow]);
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (narrow || mount) return;
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) setMount(true); }, { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, [narrow, mount]);
  // "Show connections" sets focus and the selection; remember where the reader came from.
  useEffect(() => {
    const on = () => setOrigin(document.activeElement as HTMLElement | null);
    window.addEventListener('sec-conn-origin', on);
    return () => window.removeEventListener('sec-conn-origin', on);
  }, []);
  const famLine = FAM_SPLITS.length ? ` ${FAM_SPLITS.length} entity types carry more than one actor family across the research files (${FAM_SPLITS.join(', ')}); their hue is inconsistent and means nothing.` : '';
  const applyFy = f.fyFrom ? () => { patch({ from: `${fyStart(f.fyFrom!)}-04-01`, to: `${fyStart(f.fyTo!) + 1}-03-31` }); announce(`FY${f.fyFrom}–FY${f.fyTo} applied to the graph`, 0); } : null;
  return (
    <section id="connections" className="pt-12 scroll-mt-40" aria-labelledby="sec-conn-h">
      <h2 id="sec-conn-h" tabIndex={-1} className={`${H2} ${TARGET}`}>Connections in the force register</h2>
      <p data-page-copy="" className="text-[14px] text-text-secondary max-w-[80ch]">
        {`${drawn} edges drawn under the tier filter, of ${edges.length} relationships among ${nodes.length} entities in the force register. Budget lines, strength tables and installations are rows, not relationships, and are in the lenses above. ${UNRESOLVED.length} edges with an endpoint outside every register are not drawn. Ids are joined only where they match; ${SPLIT_IDS} entities appear under two ids until reconciled. ${UNDATED_EDGES} relationships are undated. This graph's own filters are its own; the page's FY control does not reach it.${famLine}`}
      </p>
      {applyFy && <p className="text-[13px]"><button type="button" className={`underline underline-offset-2 ${FOCUS}`} onClick={applyFy}>{`Apply FY${f.fyFrom}–FY${f.fyTo} to the graph`}</button></p>}
      {origin && origin.isConnected && (
        <p className="text-[13px]"><a href="#back" className={`underline underline-offset-2 ${FOCUS}`} onClick={(e) => { e.preventDefault(); origin.focus(); origin.scrollIntoView({ block: 'center' }); }}>{`Back to ${origin.textContent?.trim().slice(0, 60) || 'where you were'}`}</a></p>
      )}
      <figure className="m-0" aria-labelledby="sec-conn-h" aria-describedby="sec-c21">
        <div ref={box} style={{ minHeight: narrow && !mount ? 60 : 620 }}>
          {narrow && !mount ? (
            <button type="button" className={`font-mono text-[13px] underline min-h-[44px] ${FOCUS}`} onClick={() => setMount(true)}>{`Load the graph (${nodes.length} entities, ${edges.length} relationships)`}</button>
          ) : mount ? (
            <Suspense fallback={<p className="text-[14px] text-text-secondary">{`Drawing the connection graph: ${nodes.length} entities and ${edges.length} relationships…`}</p>}>
              {graph}
            </Suspense>
          ) : <p className="text-[14px] text-text-secondary">{`The graph draws when it scrolls into view: ${nodes.length} entities and ${edges.length} relationships.`}</p>}
        </div>
        <Caption id="sec-c21" cap="C21" as="figcaption">Position carries no meaning. Line dash is evidence tier; hue is the kind of actor; shape is entity type; size is a declared band. Persons appear only in public roles.</Caption>
      </figure>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contested (§5.5.2): every alleged claim beside its answer, at equal size
// ---------------------------------------------------------------------------

// Memoised: the list depends only on the tier set, and it is long.
export const Contested = memo(function Contested({ f }: { f: Filters }) {
  const shown = ALLEGED.filter((e) => edgePass(f, e));
  const k = ALLEGED.length - ANSWERED.length;
  return (
    <section id="contested" className="pt-12 scroll-mt-40" aria-labelledby="sec-contested-h">
      <h2 id="sec-contested-h" className={H2}>Contested: every alleged claim beside its answer</h2>
      <p data-page-copy="" className="text-[14px] text-text-secondary">{EMPTY ? NOTHING : ALLEGED.length ? `${ALLEGED.length} alleged claims · ${ANSWERED.length} with a recorded response · ${k} without — whether a response was sought is not recorded.` : 'No alleged claims in this register.'}</p>
      {shown.length < ALLEGED.length && <p className="text-[13px] text-text-secondary">{`${ALLEGED.length - shown.length} alleged claims hidden by the tier filter — not absent`}</p>}
      <Roving label="Alleged claims, their answers and sources">
        <ul className="list-none p-0 m-0 space-y-4">
          {shown.map((e) => (
            <li key={e.id} className="min-w-0">
              {/*
                The claim and its answer side by side at one size (D61, invariant 4): first each one's
                headline words, then, in the same two columns, each one's own description and its own
                sources — the answer never loses the sourcing the claim keeps.
              */}
              <article className="grid sm:grid-cols-2 gap-3 text-[14px]">
                <div className="min-w-0">
                  <Quote as="p" className="m-0 text-text" declared={[e.a]} record={e}>{e.lab}</Quote>
                  <p className="m-0 font-mono text-[12px] text-text-muted">{`${labelOf(e.s)} → ${labelOf(e.t)} · ${e.tier} · ${e.from ?? 'undated'} · ${fileOf(e)}`}</p>
                </div>
                <div className="min-w-0 text-[14px]"><Responses claim={e} full={false} /></div>
              </article>
              <div className="grid sm:grid-cols-2 gap-3 text-[13px] text-text-secondary mt-1">
                <div className="min-w-0">
                  {e.d && <Quote as="p" className="m-0" declared={[e.a]} record={e}>{e.d}</Quote>}
                  <span className="block"><Src srcs={e.srcs} of={e.lab ?? e.id ?? 'claim'} inline declared={[e.a]} record={e} /></span>
                </div>
                <div className="min-w-0">
                  {responseChain(e.id).map((c) => (
                    <div key={c.edge.id} className="mb-1">
                      {c.edge.d && <Quote as="p" className="m-0" record={c.edge}>{c.edge.d}</Quote>}
                      <span className="block"><Src srcs={c.edge.srcs} of={c.edge.lab ?? c.edge.id ?? 'response'} inline record={c.edge} /></span>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Roving>
    </section>
  );
}, (a, b) => [...a.f.tiers].join() === [...b.f.tiers].join());

// ---------------------------------------------------------------------------
// Gaps (§5.5.3), refusals (§14), source ledger
// ---------------------------------------------------------------------------

export const Gaps = memo(function Gaps() {
  const derived = EMPTY ? [] : derivedGaps();
  const byLens = (['budgets', 'footprint', 'procurement'] as Lens[]).map((l) => ({ l, ds: LENS_DOMAINS[l] }));
  return (
    <section id="gaps" className="pt-12 scroll-mt-40" aria-labelledby="sec-gaps-h">
      <h2 id="sec-gaps-h" className={H2}>Gaps: what this register cannot show</h2>
      <p data-page-copy="" className="text-[14px] text-text">{`${VOIDS.length} voids and ${GAPS.length} gaps recorded by the research, ${KILLED.length} claim(s) killed in audit, and ${derived.length} derived by this page.`}</p>
      <Roving label="Voids and gaps, all lenses">
        {byLens.map(({ l, ds }) => (
          <div key={l} className="mt-3">
            <h3 className="text-[16px] font-semibold text-text m-0">{LENS_LABEL[l]}</h3>
            {ds.map((d) => {
              const vs = VOIDS.filter((v) => v.domain === d);
              const gs = GAPS.filter((g) => g.domain === d);
              if (!vs.length && !gs.length) return null;
              return (
                <div key={d} className="mt-2">
                  <h4 className="text-[14px] font-semibold text-text-secondary m-0">{`${d} research file`}<End /></h4>
                  <ul className="list-none p-0 m-0 space-y-1.5 text-[14px] text-text-secondary">
                    {vs.map((v, i) => <li key={`v${i}`}><Quote>{v.what}</Quote>{v.whyItMatters ? <><Tx> — </Tx><Quote>{v.whyItMatters}</Quote></> : null} <Src srcs={v.srcs} of={v.what.slice(0, 60)} inline /><End /></li>)}
                    {gs.map((g, i) => <li key={`g${i}`}><Quote>{g.text}</Quote><End /></li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
        {VOIDS.some((v) => !Object.values(LENS_DOMAINS).flat().includes(v.domain)) && (
          <ul className="list-none p-0 m-0 mt-2 text-[14px]">{VOIDS.filter((v) => !Object.values(LENS_DOMAINS).flat().includes(v.domain)).map((v, i) => <li key={i}><Quote>{v.what}</Quote></li>)}</ul>
        )}
      </Roving>
      <h3 className="text-[16px] font-semibold text-text mt-4 mb-1">What the audit killed</h3>
      {KILLED.length ? (
        <ul className="list-none p-0 m-0 space-y-1.5 text-[14px] text-text-secondary">
          {KILLED.map((k) => <li key={k.id}><span className="font-mono text-[12.5px]">{k.id}</span><Tx>{' — '}</Tx><Quote>{k.lab}</Quote><Tx>{' — '}</Tx><Quote>{k.killedReason}</Quote><End /></li>)}
        </ul>
      ) : <p className="text-[14px] text-text-secondary">No claim was killed in audit in this build.</p>}
      <h3 className="text-[16px] font-semibold text-text mt-4 mb-1">Derived by this page</h3>
      <ul className="list-none p-0 m-0 space-y-1 text-[14px] text-text-secondary" data-page-copy="">
        {derived.map((g, i) => <li key={i}>{g.text}<End /></li>)}
      </ul>
    </section>
  );
});

/** Each refusal and its reason; the slice's reason is null here and read from the slice at render (`sliceRefusal`). */
export const REFUSAL_ITEMS: [string, string | null][] = [
  ["A city police budget other than Delhi's", 'in any form: a number, a share of the state\'s head, an estimate, a per-capita figure. None is published; the page prints where the money sits.'],
  ['A total that adds a demand to its own lines', 'pay on top of revenue, Union plus states, BE plus actual, or a grand total for security spending. Rows overlap by level; the only sums are disjoint demands of one year and stage beside the published total.'],
  ['A per-person figure on the 2011 Census', 'or a per-capita map built from figures parsed out of prose.'],
  ['A per-state outcome rate parsed from prose', 'or any outcome coloured by who governs a state.'],
  ['A map of defence money by state or city', 'No defence demand is printed by place.'],
  ['Points at city addresses without coordinates', 'or a footprint drawn by money.'],
  ['DAC approvals by vendor', 'Approvals name no vendor and no value.'],
  ['A vendor alone', 'a vendor leaderboard, a "most connected", a risk score, or a share of awards by vendor or class computed from a sample of named releases.'],
  ["The tender slice's overall rate as a finding", null],
  ['Party as a colour, a filter, a sort or a column the page writes', 'or a toggle by government or period. Party is text; the symmetry texts carry the comparison, quoted.'],
  ['A case without the case recorded as its control beside it', 'or without its answer slot; a case or a narrative drawn as an edge to a party.'],
  ['A ranking, score or index', 'of states, forces, vendors, officers or cases.'],
  ['A merge of two ids by name', 'Ids are joined only where the reconciliation maps them.'],
  ['Operational detail', 'deployments, orders of battle, procurement the Ministry has not announced, the addresses of jails; any salary of a named person, or any person below the public rank.'],
];
/** The slice refusal's reason, with the works figure read from the slice itself when it is loaded (never typed in). */
function sliceRefusal(slice: SecurityFile | null | undefined) {
  const wb = slice ? sliceFigures(slice).worksBuyer : null;
  const lead = wb ? `One works buyer is ${wb.pct}% of its award decisions, so the overall rate is a works rate` : slice === null ? 'The slice is not built in this copy of the register' : 'Its overall rate is a works rate, read by class';
  return `${lead}; and no open-market winner is named, because the comparator rule this page holds vendors to cannot be applied to them.`;
}
export const Refusals = memo(function Refusals({ slice }: { slice: SecurityFile | null | undefined }) {
  return (
    <section id="refusals" className="pt-12 scroll-mt-40" aria-labelledby="sec-ref-h">
      <h2 id="sec-ref-h" className={H2}>What this page refuses to show, and why</h2>
      <ul className="list-none p-0 m-0 space-y-1.5 text-[14px] text-text-secondary" data-page-copy="">
        {REFUSAL_ITEMS.map(([a, b]) => <li key={a}><strong className="text-text">{a}</strong>{` — ${b ?? sliceRefusal(slice)}`}</li>)}
      </ul>
    </section>
  );
});

const classOf = (url: string) => (/sansad|parliament|loksabha|rajyasabha|pib\.gov|mha\.gov|indiabudget|mod\.gov|rbi\.org|ncrb|gazette|cag\.gov|nic\.in|gov\.in/i.test(url) ? 'primary or Parliament' : 'secondary');
export const SourceLedger = memo(function SourceLedger({ slice }: { slice: SecurityFile | null | undefined }) {
  // Two thousand links are drawn only when asked for: every record above already carries its own sources.
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => {
    const m = new Map<string, { label: string; url: string; n: number; first: string }>();
    const add = (srcs: [string, string][] | undefined | null, what: string) => { for (const [l, u] of srcs ?? []) { const e = m.get(u); if (e) e.n++; else m.set(u, { label: l, url: u, n: 1, first: what }); } };
    for (const e of EDGES) add(e.srcs as [string, string][] | undefined, e.lab ?? e.id ?? 'record');
    for (const n of FORCE_NODE_LIST) add(n.srcs as [string, string][] | undefined, n.label);
    for (const r of BUDGETS) add(r.srcs, r.head);
    for (const r of STRENGTH) add(r.srcs, r.body);
    for (const r of FOOTPRINT) add(r.srcs, r.label);
    return [...m.values()].sort((a, b) => classOf(a.url).localeCompare(classOf(b.url)) || a.label.localeCompare(b.label));
  }, []);
  return (
    <section id="sources" className="pt-12 scroll-mt-40" aria-labelledby="sec-src-h">
      <h2 id="sec-src-h" className={H2}>Source ledger</h2>
      <p data-page-copy="" className="text-[14px] text-text-secondary">{`${entries.length} distinct sources cited by the records and rows of the force register${slice ? `, and the open-market slice built from the CPPP scrape (inputs ${slice.provenance.inputs.map((i) => i.sha256_16).join(', ')})` : ''}. Every one is listed.`}</p>
      <details onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setOpen(true); }}>
        <summary className={`cursor-pointer text-[14px] py-1 ${FOCUS}`}>{`List all ${entries.length} sources, primary and Parliament first`}</summary>
      {open && <Roving label="Every source in the force register">
        {['primary or Parliament', 'secondary'].map((c) => (
          <div key={c}>
            <h3 className="text-[15px] font-semibold text-text mt-3 mb-1">{c}</h3>
            <ul className="list-none p-0 m-0 space-y-0.5 text-[12.5px]" data-quoted="">
              {entries.filter((e) => classOf(e.url) === c).map((e) => (
                <li key={e.url}><QuotedLink label={e.label} url={e.url} className={`underline underline-offset-2 decoration-border-light break-words ${FOCUS}`} /><span className="font-mono text-[12px] text-text-muted">{` ${hostOf(e.url)} · cited by ${e.n} records and rows, e.g. ${e.first.slice(0, 80)}`}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </Roving>}
      </details>
      <p data-page-copy="" className="text-[13px] text-text-muted mt-4 max-w-[80ch]">This page maps public budgets, lists, awards and court and audit records about the conduct of public offices. It asserts no guilt. Allegations are identified as allegations, attributed, and paired with the response of those they concern.</p>
    </section>
  );
});

export { TierWord, Denominator };
