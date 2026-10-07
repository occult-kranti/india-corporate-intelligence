import { useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { StateCode } from '../../graph/schema';
import {
  type BudgetRow, type BudgetStage, EDGE_BY_ID, labelOf, fileOf, finite, fmtCr, ASOF, rowCitation, parseCell, rowTier, defenceStack, defenceDemands, publishedTotal,
  payBracketAt, policeAt, policeDrawn, delhiLineAt, vacancyPct, LANES, LANE_BY_SLUG, comparatorsOf, vendorClass, vendorsOf, CLASS_WORDS, caseFile, firstRecord,
  responsesTo, pairOf, stateName, STATE_SERIES, STATE_ROWS, STATE_SERIES_HEAD, STRENGTH_ST, isDerivedStrength, derivedSentence, stateRecords, FOOTPRINT, KINDS,
  fmtInt, kindWord, COMMISSIONERATES, CITY_POLICE_TEXT, GRANT_ROWS, LAKH_NOTE, UNION_ROWS, fileOf as fileOfEdge,
} from '../../data/securityView';
import { usePage, Cr, ReadTo, Src, Quote, Tx, TierWord, Anchor, FOCUS, TARGET } from './ui';
import { Responses } from './Shared';
import { VendorFieldsDl } from './Procurement';

/**
 * The margin panels (§5.0.5): one at a time, each an h2 with Close first after it and
 * "Back to {origin}" at its foot; Escape closes only when focus is inside. Below 1280px
 * the page renders the same panel inline under the control that opened it.
 */

interface PanelProps { headingRef: RefObject<HTMLHeadingElement>; onClose: () => void; origin: string }

function Shell({ title, headingRef, onClose, origin, children }: PanelProps & { title: string; children: ReactNode }) {
  const onKey = (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
  return (
    <section data-margin="" aria-labelledby="sec-panel-h" onKeyDown={onKey} style={{ scrollMarginTop: 180 }}
      className="border border-border rounded-md bg-surface/60 p-3 my-3 text-[14px] text-text-secondary min-w-0">
      <h2 id="sec-panel-h" ref={headingRef} tabIndex={-1} className={`text-[16px] font-semibold text-text m-0 mb-1 leading-snug break-words ${TARGET}`}>{title}</h2>
      <button type="button" onClick={onClose} className={`font-mono text-[12px] underline underline-offset-2 mb-2 ${FOCUS}`}>Close</button>
      <div className="space-y-2 min-w-0">{children}</div>
      <button type="button" onClick={onClose} className={`mt-3 font-mono text-[12px] underline underline-offset-2 ${FOCUS}`}>{`Back to ${origin}`}</button>
    </section>
  );
}

/** Copy citation: the button and the pasteable text, which stays visible in an <output>. */
function Citation({ text, label }: { text: string; label: string }) {
  const { announce } = usePage();
  const [shown, setShown] = useState(text);
  return (
    <span className="block mt-1">
      <button type="button" aria-label={`Copy citation — ${label}`} className={`font-mono text-[12px] underline underline-offset-2 ${FOCUS}`}
        onClick={async () => { setShown(text); try { await navigator.clipboard.writeText(text); announce('Citation copied', 0); } catch { announce('The browser refused the copy: the citation is printed beneath the button', 0); } }}>Copy citation</button>
      <output className="block font-mono text-[12px] text-text-muted break-words mt-0.5">{shown}</output>
    </span>
  );
}

/** One budget row in a panel: its ₹ with denominator and comparison, note, tier, sources, read-to and citation. */
function RowBlock({ r, lead, cellParam }: { r: BudgetRow; lead?: string; cellParam?: string }) {
  const { absHref } = usePage();
  const href = absHref(cellParam ? { cell: cellParam } : {});
  return (
    <li className="border-l border-border-light pl-2 min-w-0">
      <Cr row={r} lead={lead ? `${lead} ` : undefined} />
      <span className="block text-[13px]">{r.head}</span>
      <span className="block text-[13px]">{'note: '}{r.note ? <Quote declared={[r.cr]}>{r.note}</Quote> : 'no note'}{' · '}<TierWord tier={rowTier(r)} /></span>
      <Src srcs={r.srcs} of={`${r.head} ${r.fy} ${r.stage}`} inline declared={[r.cr]} record={{ s: r.body }} />
      <ReadTo srcs={r.srcs} />
      <Citation text={rowCitation(r, href)} label={`${r.stage} FY${r.fy}, ${r.head.slice(0, 60)}`} />
    </li>
  );
}

// ---------------------------------------------------------------------------

export function RecordCard({ id, ...p }: PanelProps & { id: string }) {
  const { absHref, showConnections } = usePage();
  const e = EDGE_BY_ID.get(id);
  if (!e) return null;
  const urls = (e.srcs ?? []).map(([, u]) => u).join(' ');
  const cite = `${e.lab ?? e.id} — ${labelOf(e.s)} → ${labelOf(String(e.t).replace(/^claim:/, ''))} — ${e.pred} — ${e.tier} — ${e.from ?? 'undated'} — ${urls || 'no source in file'} — ICIP ${absHref({ rec: id })}, read to ${ASOF}`;
  return (
    <Shell title={e.lab ?? id} {...p}>
      <p className="m-0 font-mono text-[12px] text-text-muted">{`${labelOf(e.s)} → ${labelOf(String(e.t).replace(/^claim:/, ''))} · ${e.pred} · ${e.from ?? 'undated'} · ${fileOfEdge(e)} research file`} <TierWord tier={e.tier} /></p>
      {e.d && <Quote as="p" className="m-0" record={e} declared={[e.a]}>{e.d}</Quote>}
      {e.innocentReading && <p className="m-0"><Tx>the reading in which nothing is wrong: </Tx><Quote record={e} declared={[e.a]}>{e.innocentReading}</Quote></p>}
      {finite(e.a) && <p className="m-0" data-cr={e.a}>{`₹${fmtCr(e.a)} cr — as the record states it; no denominator published for this line; previous year not applicable`}</p>}
      <div><p className="m-0 font-mono text-[12px] text-text-muted">Responses</p><Responses claim={e} /></div>
      <div><p className="m-0 font-mono text-[12px] text-text-muted">Sources</p><Src srcs={e.srcs} of={e.lab ?? id} record={e} declared={[e.a]} /></div>
      <p className="m-0"><button type="button" className={`underline underline-offset-2 ${FOCUS}`} onClick={(ev) => showConnections(e.s, ev.currentTarget)}>Show connections</button></p>
      <Citation text={cite} label="this record" />
    </Shell>
  );
}

export function CellCard({ param, ...p }: PanelProps & { param: string }) {
  const c = parseCell(param);
  if (!c) return null;
  const cell = c.lane.cells.get(c.fy);
  const rows = cell ? (['BE', 'RE', 'actual'] as BudgetStage[]).flatMap((s) => cell[s]) : [];
  return (
    <Shell title={`${labelOf(c.lane.body)} — ${c.lane.line} (${c.lane.component}), FY${c.fy}`} {...p}>
      {!rows.length && <p className="m-0">{`no row in this register for FY${c.fy} in this lane`}</p>}
      <ul className="list-none p-0 m-0 space-y-2">{rows.map((r, i) => <RowBlock key={i} r={r} lead={`${r.stage}:`} cellParam={param} />)}</ul>
      <p className="m-0 font-mono text-[12px] text-text-muted">{`lane max ₹${fmtCr(c.lane.max)} cr (FY${c.lane.maxRow.fy} ${c.lane.maxRow.stage}) — the lane's own scale`}</p>
    </Shell>
  );
}

export function FYReadout({ fy, stage, ...p }: PanelProps & { fy: string; stage: BudgetStage }) {
  const col = defenceStack(stage).find((x) => x.fy === fy);
  const rows = defenceDemands(fy, stage);
  const pub = publishedTotal(fy, stage);
  const pb = payBracketAt(fy, stage);
  const pays = pb.rows;
  const pol = policeAt(fy, stage);
  const d = delhiLineAt(fy, stage);
  const lane = (r: BudgetRow) => LANES.find((l) => l.rows.includes(r)) ?? null;
  const cp = (r: BudgetRow) => { const l = lane(r); return l ? `${l.slug}@${r.fy}` : undefined; };
  return (
    <Shell title={`FY${fy} ${stage}: the Union's force demands`} {...p}>
      {!col || col.missing ? <p className="m-0">{`no ${stage} rows recorded for FY${fy}: the column is hatched, not zero`}</p> : (
        <>
          <p className="m-0 text-text">{`${rows.length} demands; ${col.pension != null ? `pensions ${col.pensionWords}` : 'no pension demand in this year'}; ${col.partial ? 'partial, no sum printed' : `stack ₹${fmtCr(col.sum)} cr, computed here`}`}</p>
          <ul className="list-none p-0 m-0 space-y-2">{rows.map((r) => <RowBlock key={r.head} r={r} cellParam={cp(r)} />)}</ul>
        </>
      )}
      <p className="m-0 font-mono text-[12px] text-text-muted">The published total</p>
      {pub ? <ul className="list-none p-0 m-0"><RowBlock r={pub} lead="published total:" /></ul> : <p className="m-0">no published all-demands total for this FY</p>}
      <p className="m-0">{`${pays.length} pay lines inside the revenue demands: a bracket, not added on top`}</p>
      {pays.length > 0 && <ul className="list-none p-0 m-0 space-y-2">{pays.map((r) => <RowBlock key={r.head} r={r} cellParam={cp(r)} />)}</ul>}
      {pb.other.length > 0 && (
        <>
          <p className="m-0">{`${pb.other.length} pay row(s) from another document, with another definition of pay: a tick of its own, not in the bracket`}</p>
          <ul className="list-none p-0 m-0 space-y-2">{pb.other.map((r) => <RowBlock key={r.head} r={r} cellParam={cp(r)} />)}</ul>
        </>
      )}
      <p className="m-0 font-mono text-[12px] text-text-muted">The police demand</p>
      {policeDrawn(pol) ? (
        <>
          <ul className="list-none p-0 m-0 space-y-2">{(['revenue', 'capital', 'total'] as const).map((k) => pol![k] ? <RowBlock key={k} r={pol![k]!} lead={`police ${k}:`} /> : null)}</ul>
          <p className="m-0">{pol!.check !== 'incomplete' && pol!.sum != null ? `police check: revenue + capital, computed here, ${pol!.check === 'equal' ? 'equals' : 'differs from'} the published total (₹${fmtCr(pol!.sum)} cr)` : 'police check: not all three parts are printed for this year'}</p>
        </>
      ) : <p className="m-0">{`no police demand rows recorded for FY${fy} ${stage}`}</p>}
      <p className="m-0 font-mono text-[12px] text-text-muted">Delhi Police, inside the Police demand</p>
      {d?.total ? <ul className="list-none p-0 m-0"><RowBlock r={d.total} lead="Delhi Police:" cellParam={cp(d.total)} /></ul> : <p className="m-0">{`no Delhi Police row for FY${fy} ${stage}`}</p>}
    </Shell>
  );
}

export function BodyCard({ id, ...p }: PanelProps & { id: string }) {
  const { showConnections } = usePage();
  const lanes = LANES.filter((l) => l.body === id);
  const rows = UNION_ROWS.filter((r) => r.body === id);
  const fys = [...new Set(rows.map((r) => r.fy))].sort();
  const go = () => {
    const el = document.querySelector<HTMLElement>('[data-lane][aria-current="true"]');
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  };
  return (
    <Shell title={labelOf(id)} {...p}>
      <p className="m-0">{`${rows.length} budget rows in ${lanes.length} lanes, FY${fys[0] ?? 'none'}–FY${fys[fys.length - 1] ?? 'none'}; its lanes are accented in the ledger, and no other lane is removed.`}</p>
      <p className="m-0"><a href="#sec-B3-h" onClick={(e) => { e.preventDefault(); go(); }} className={`underline underline-offset-2 ${FOCUS}`}>{`Go to its ${lanes.length} lanes in the ledger`}</a></p>
      <ul className="list-none p-0 m-0 text-[13px]">{lanes.map((l) => <li key={l.key}>{`${l.component} — ${l.line} · lane max ₹${fmtCr(l.max)} cr, FY${l.maxRow.fy} ${l.maxRow.stage}`}</li>)}</ul>
      <p className="m-0"><button type="button" className={`underline underline-offset-2 ${FOCUS}`} onClick={(e) => showConnections(id, e.currentTarget)}>Show connections</button></p>
    </Shell>
  );
}

export function VendorCard({ id, ...p }: PanelProps & { id: string }) {
  const comps = comparatorsOf(id);
  const cls = vendorClass(id);
  const others = comps.length ? comps : vendorsOf(cls === 'public' ? 'private' : 'public');
  const names = others.map(labelOf);
  const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? 'no other vendor';
  const title = comps.length ? `${labelOf(id)} beside ${joined}` : `${labelOf(id)} beside the ${CLASS_WORDS[cls === 'public' ? 'private' : 'public']} band: ${joined}`;
  const go = () => {
    const el = document.querySelector<HTMLElement>(`[data-vendor-card="${CSS.escape(id)}"] h4 button`);
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  };
  return (
    <Shell title={title} {...p}>
      <p className="m-0"><a href="#sec-P1-h" onClick={(e) => { e.preventDefault(); go(); }} className={`underline underline-offset-2 ${FOCUS}`}>Go to the card in the grid</a></p>
      <p className="m-0 text-[13px]">{comps.length ? 'The comparison the research declared, field by field, at the same size.' : 'No head-to-head is declared; the vendor sits beside the other class band, field by field.'}</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
        {[id, ...others].map((v) => (
          <div key={v} className="min-w-0 border-t border-border pt-1">
            <h3 className="text-[14px] font-semibold text-text m-0">{labelOf(v)}</h3>
            <VendorFieldsDl v={v} scope="margin" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function CaseCard({ id, ...p }: PanelProps & { id: string }) {
  const { showConnections } = usePage();
  const file = caseFile(id);
  const pair = pairOf(id);
  const ctl = pair ? (pair.a === id ? pair.b : pair.a) : null;
  const go = () => {
    const h = document.querySelector<HTMLElement>('[data-pair][aria-current="true"] h4');
    h?.scrollIntoView({ block: 'start' });
    h?.focus();
  };
  return (
    <Shell title={labelOf(id)} {...p}>
      <p className="m-0"><a href="#sec-P4-h" onClick={(e) => { e.preventDefault(); go(); }} className={`underline underline-offset-2 ${FOCUS}`}>Go to the pair row</a></p>
      <p className="m-0">{`${file.length} records · first ${firstRecord(id) ?? 'not dated'} · ${file.filter((e) => responsesTo(e.id).length).length} with a recorded response · ${ctl ? `recorded beside ${labelOf(ctl)} as its control` : 'No control pairing recorded for this case in the register.'}`}</p>
      <ul className="list-none p-0 m-0 space-y-1 text-[13px]">{file.map((e) => <li key={e.id}>{`${e.from ?? 'undated'} · ${labelOf(e.s)} · ${e.tier}: `}<Quote>{e.lab}</Quote>{` (${fileOf(e)})`}</li>)}</ul>
      <p className="m-0"><button type="button" className={`underline underline-offset-2 ${FOCUS}`} onClick={(e) => showConnections(id, e.currentTarget)}>Show connections</button></p>
    </Shell>
  );
}

export function StatePanel({ st, ...p }: PanelProps & { st: StateCode }) {
  const name = stateName(st);
  const series = STATE_SERIES.filter((r) => r.payer === st).sort((a, b) => (a.fy < b.fy ? -1 : a.fy > b.fy ? 1 : 0));
  const other = STATE_ROWS.filter((r) => r.payer === st && r.head !== STATE_SERIES_HEAD);
  const str = STRENGTH_ST.filter((r) => r.st === st).sort((a, b) => a.year - b.year);
  const recs = stateRecords(st);
  const inst = FOOTPRINT.filter((r) => r.st === st);
  const comms = COMMISSIONERATES.filter((r) => r.st === st);
  const grants = GRANT_ROWS.filter((r) => r.head.includes(name));
  return (
    <Shell title={name} {...p}>
      {st === 'dl' && <p className="m-0 text-text">Delhi&apos;s police is a Union demand line — see Q7 · <Anchor to="sec-B7-h">the Delhi line</Anchor></p>}
      <p className="m-0 font-mono text-[12px] text-text-muted">{`Police head MH 2055 (revenue): ${series.length} rows`}</p>
      {series.length ? <ul className="list-none p-0 m-0 space-y-2">{series.map((r, i) => <RowBlock key={i} r={r} lead={`${r.fy} ${r.stage}:`} />)}</ul> : <p className="m-0">no row in this register</p>}
      {other.length > 0 && (
        <>
          <p className="m-0 font-mono text-[12px] text-text-muted">other heads, not comparable across states</p>
          <ul className="list-none p-0 m-0 space-y-2">{other.map((r, i) => <RowBlock key={i} r={r} lead={`${r.fy} ${r.stage}:`} />)}</ul>
        </>
      )}
      <p className="m-0 font-mono text-[12px] text-text-muted">{`Strength: ${str.length} rows`}</p>
      {str.length ? (
        <ul className="list-none p-0 m-0 space-y-1 text-[13px]">
          {str.map((r, i) => (
            <li key={i}>
              {`${r.year}: ${r.perLakh != null ? `${r.perLakh} per lakh` : 'no per-lakh printed'}; ${r.sanctioned != null ? `sanctioned ${fmtInt(r.sanctioned)}` : 'sanctioned not recorded'}; ${r.actual != null ? `actual ${fmtInt(r.actual)}` : 'actual not recorded'}${isDerivedStrength(r) ? ` (derived by the research from per-lakh: ${derivedSentence(r.note)})` : ''}; women ${r.womenPct != null ? `${r.womenPct}%` : 'not recorded'}${vacancyPct(r) != null ? `; vacancy ${vacancyPct(r)}%, computed here` : ''} · `}
              <TierWord tier={rowTier(r)} />{' '}<Src srcs={r.srcs} of={`${name} strength ${r.year}`} inline />
            </li>
          ))}
        </ul>
      ) : <p className="m-0">no row in this register</p>}
      {recs.length > 0 && (
        <>
          <p className="m-0 font-mono text-[12px] text-text-muted">What the research recorded about this state, quoted</p>
          <ul className="list-none p-0 m-0 space-y-2">
            {recs.map((e) => (
              <li key={e.id} className="text-[14px]">
                <Quote record={e}>{e.lab}</Quote>{' '}<TierWord tier={e.tier} />
                {e.innocentReading && <span className="block"><Tx>the reading in which nothing is wrong: </Tx><Quote record={e}>{e.innocentReading}</Quote></span>}
                <Src srcs={e.srcs} of={e.lab ?? e.id ?? 'record'} inline record={e} />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="m-0 font-mono text-[12px] text-text-muted">{`Installations: ${inst.length}`}</p>
      <p className="m-0 text-[13px]">{inst.length ? KINDS.map((k) => [k, inst.filter((r) => r.kind === k).length] as const).filter(([, n]) => n).map(([k, n]) => `${n} ${kindWord(k)}`).join(', ') : 'no installation in this register'}</p>
      {comms.length > 0 && (
        <ul className="list-none p-0 m-0 space-y-1 text-[13px]">
          {comms.map((c) => <li key={c.id}>{`${c.city}: `}<span data-city-body={c.body}>{CITY_POLICE_TEXT(name)}</span></li>)}
        </ul>
      )}
      {grants.length > 0 && (
        <>
          <p className="m-0 font-mono text-[12px] text-text-muted">Union grant lines naming this state</p>
          <ul className="list-none p-0 m-0 space-y-2">{grants.map((r, i) => <RowBlock key={i} r={r} lead={`${r.fy} ${r.stage}:`} />)}</ul>
        </>
      )}
      <p className="m-0 font-mono text-[12px] text-text-muted">{`RBI rows converted from ₹ lakh carry the note "${LAKH_NOTE}"`}</p>
    </Shell>
  );
}

export function FootprintStatePanel({ st, ...p }: PanelProps & { st: StateCode }) {
  const name = stateName(st);
  const inst = FOOTPRINT.filter((r) => r.st === st);
  const cities = [...new Set(inst.map((r) => r.city))].sort();
  const comms = COMMISSIONERATES.filter((r) => r.st === st);
  return (
    <Shell title={name} {...p}>
      <p className="m-0">{inst.length ? `${inst.length} installations in ${cities.length} cities — positioned within the state, not at their address` : 'no installation in this register'}</p>
      <ul className="list-none p-0 m-0 space-y-1 text-[13px]">
        {cities.map((c) => <li key={c}>{`${c}: ${[...new Set(inst.filter((r) => r.city === c).map((r) => kindWord(r.kind)))].join(', ')}`}</li>)}
      </ul>
      {comms.length > 0 && (
        <ul className="list-none p-0 m-0 space-y-1 text-[13px]">
          {comms.map((c) => <li key={c.id}>{`${c.city}: `}<span data-city-body={c.body}>{CITY_POLICE_TEXT(name)}</span></li>)}
        </ul>
      )}
    </Shell>
  );
}

export { LANE_BY_SLUG };
