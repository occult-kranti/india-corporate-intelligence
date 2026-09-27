import { useId, useMemo } from 'react';
import { TIERS, type GEdge, type NodeFamily, type Tier } from '../../graph/schema';
import { FAMILY_COLOR } from '../viz/ForceGraph';
import {
  type Filters, censusInView, hasRupee, rupeeTotal, fmtCr, labelOf, instrumentOf, sectorOf, strictSt, fetcherSt, stateName, weakest, G1, nodeOf,
} from '../../data/financeView';
import { Caption, Twin, Table, Exports, usePage, SkipLinks, captionLine, openTwinAndFocus, type Row } from './ui';
import { Segmented } from './Control';

/**
 * The census as a flow (spec §5.1.2): lender → sector (or instrument) → place. Band
 * width is ₹ crore of census-counted records only; the researched sample is never in
 * it. Left to right is the order money moved, never influence. Every ribbon is a real
 * button inside a role="group" drawing, so its words are reachable; the drawing itself
 * is aria-hidden. Below 640px the same bands are two ranked lists.
 */

export const FLOW_H3 = 'Lender, instrument and place';
const W = 960;
const NODE_W = 12;
const GAP = 3;
const PAD_T = 18;

/** `fam: null` is a lender id no register resolves: drawn unfilled and titled so, never given a guessed hue. */
interface FNode { id: string; label: string; col: 0 | 1 | 2; fam: NodeFamily | null; value: number; y0: number; y1: number }
export interface Band { key: string; from: string; to: string; fromLabel: string; toLabel: string; name: string; a: number; recs: GEdge[]; tier: Tier; col: 0 | 1 }

export function midOf(e: GEdge, mid: Filters['mid']): string {
  return mid === 'sector' ? sectorOf(e) ?? 'sector not in the record' : instrumentOf(e) ?? 'instrument not in the record';
}
function placeOf(e: GEdge): { id: string; label: string } {
  const s = strictSt(e);
  if (s) return { id: `place:${s}`, label: stateName(s) };
  const fs = fetcherSt(e);
  if (fs) return { id: `place:f:${fs}`, label: `${stateName(fs)}, by the fetcher's rule` };
  return { id: 'place:union', label: 'Union body or not placed' };
}

export function flowParts(f: Filters) {
  const rows = censusInView(f).filter(hasRupee);
  const bands = new Map<string, Band>();
  const add = (col: 0 | 1, from: string, fromLabel: string, to: string, toLabel: string, e: GEdge) => {
    const key = `${col}|${from}|${to}`;
    let b = bands.get(key);
    if (!b) { b = { key, from, to, fromLabel, toLabel, name: '', a: 0, recs: [], tier: e.tier, col }; bands.set(key, b); }
    b.a += e.a as number;
    b.recs.push(e);
  };
  const lendersBy = new Map<string, Set<string>>();
  for (const e of rows) {
    const m = midOf(e, f.mid);
    const p = placeOf(e);
    add(0, e.s, labelOf(e.s), `mid:${m}`, m, e);
    add(1, `mid:${m}`, m, p.id, p.label, e);
    const k = `1|mid:${m}|${p.id}`;
    if (!lendersBy.has(k)) lendersBy.set(k, new Set());
    lendersBy.get(k)!.add(labelOf(e.s));
  }
  const list = [...bands.values()].map((b) => {
    b.a = Math.round(b.a * 100) / 100;
    b.tier = weakest(b.recs.map((r) => r.tier));
    // A middle-to-place band names the lenders whose money forms it, so a lender filter
    // reads in every ribbon, not only the first column's.
    const from = b.col === 1 ? `${b.fromLabel} (${[...(lendersBy.get(b.key) ?? [])].sort().join(', ')})` : b.fromLabel;
    b.name = `${from} to ${b.toLabel}: ₹${fmtCr(b.a)} cr across ${b.recs.length} records, ${b.tier}; filters the project list`;
    return b;
  }).sort((x, y) => x.col - y.col || y.a - x.a || (x.key < y.key ? -1 : 1));
  const total = rupeeTotal(rows);
  const excluded = censusInView(f).filter((e) => !hasRupee(e)).length;
  return { rows, bands: list, total, excluded };
}

function layout(bands: Band[], mid: Filters['mid']) {
  const nodes = new Map<string, FNode>();
  // Synthetic middle nodes take the family of what they stand for (§8.2-2): instruments
  // are instrument, sectors are market. Lenders are real nodes and keep their own family.
  const midFam: NodeFamily = mid === 'sector' ? 'market' : 'instrument';
  const touch = (id: string, label: string, col: 0 | 1 | 2, fam: NodeFamily | null, v: number) => {
    const n = nodes.get(id) ?? { id, label, col, fam, value: 0, y0: 0, y1: 0 };
    n.value += v;
    nodes.set(id, n);
  };
  for (const b of bands) {
    if (b.col === 0) { touch(b.from, b.fromLabel, 0, nodeOf(b.from)?.fam ?? null, b.a); touch(b.to, b.toLabel, 1, midFam, 0); }
    else touch(b.to, b.toLabel, 2, 'state', b.a);
  }
  for (const b of bands) if (b.col === 0) nodes.get(b.to)!.value += b.a;
  const cols = [0, 1, 2].map((c) => [...nodes.values()].filter((n) => n.col === c).sort((a, b) => b.value - a.value || (a.label < b.label ? -1 : 1)));
  const maxN = Math.max(...cols.map((c) => c.length), 1);
  const H = Math.max(420, maxN * 7 + PAD_T * 2);
  const total = Math.max(...cols.map((c) => c.reduce((s, n) => s + n.value, 0)), 1);
  for (const c of cols) {
    const avail = H - PAD_T * 2 - GAP * Math.max(0, c.length - 1);
    let y = PAD_T;
    for (const n of c) { const h = Math.max(1.5, (n.value / total) * avail); n.y0 = y; n.y1 = y + h; y += h + GAP; }
  }
  return { nodes, H, total };
}

const X = [16, W / 2 - NODE_W / 2, W - 16 - NODE_W];

export default function LoanFlow({ f, captionId, narrow }: { f: Filters; captionId: string; narrow: boolean }) {
  const { patch, announce, filters: filterText, empty, setListFocus } = usePage();
  const uid = useId().replace(/:/g, '');
  const parts = useMemo(() => flowParts(f), [f]);
  const { bands, total, rows, excluded } = parts;
  const lay = useMemo(() => layout(bands, f.mid), [bands, f.mid]);
  const allDocumented = rows.every((e) => e.tier === 'documented');
  const midSentence = f.mid === 'sector'
    ? "Sector is the Bank's single major-sector field as the API names it; the taxonomy changed in 2017, so older and newer labels sit apart."
    : "The instrument is the Bank's own name for the lending type; conditions attach to the development-policy and programme types.";
  const descId = `${uid}-d`;
  const offset = new Map<string, { out: number; in: number }>();
  const off = (id: string) => { let o = offset.get(id); if (!o) { o = { out: 0, in: 0 }; offset.set(id, o); } return o; };
  const scale = (a: number) => (lay.total > 0 ? (a / lay.total) * (lay.H - PAD_T * 2 - GAP * 10) : 0);
  const drawn = bands.map((b) => {
    const s = lay.nodes.get(b.from)!;
    const t = lay.nodes.get(b.to)!;
    const h = Math.max(0.8, scale(b.a));
    const so = off(b.from); const to = off(b.to);
    const sy = s.y0 + so.out; so.out += h;
    const ty = t.y0 + to.in; to.in += h;
    const x0 = X[s.col] + NODE_W; const x1 = X[t.col];
    const mx = (x0 + x1) / 2;
    const d = `M${x0},${sy} C${mx},${sy} ${mx},${ty} ${x1},${ty} L${x1},${ty + h} C${mx},${ty + h} ${mx},${sy + h} ${x0},${sy + h} Z`;
    return { b, d, cx: mx, cy: (sy + ty + h) / 2 };
  });
  // A band narrows the project list in-page to its own records (§5.1.2: no URL param),
  // shown there as a removable chip, so the button's name "filters the project list" is true.
  const pick = (b: Band) => {
    setListFocus({ label: `${b.fromLabel} to ${b.toLabel}`, ids: new Set(b.recs.map((e) => e.id ?? '')) });
    announce(`the project list is narrowed to the ${b.recs.length} records of ${b.fromLabel} to ${b.toLabel}`);
    requestAnimationFrame(() => document.getElementById('twin-project-list')?.scrollIntoView({ block: 'start' }));
  };
  const twinRows: Row[] = empty || f.tiers.size === 0 ? [] : bands.map((b) => ({
    cells: [b.col === 1 ? b.name.split(' to ')[0] : b.fromLabel, b.toLabel, fmtCr(b.a), `${b.recs.length} records`, b.tier],
    out: [b.from, b.to, b.a, b.recs.length, b.tier],
  }));

  return (
    <>
    <figure className="m-0 mt-10 min-w-0">
      <h3 id={`${uid}-h`} className="text-[16px] font-semibold text-text mb-1">{FLOW_H3}</h3>
      <div className="flex flex-wrap items-center gap-2 my-1">
        <span className="font-mono text-[11px] text-text-muted">middle column:</span>
        <Segmented param="mid" value={f.mid} onPick={(v) => patch({ mid: v === (G1 ? 'sector' : 'instrument') ? null : v })} options={[
          { v: 'sector', label: 'Sector', note: G1 ? `${rows.filter((e) => sectorOf(e)).length} of ${rows.length} records` : undefined, disabled: G1 ? undefined : 'sector is not exported in this build (G1)' },
          { v: 'instrument', label: 'Instrument', note: `${rows.filter((e) => instrumentOf(e)).length} of ${rows.length} records` },
        ]} />
      </div>
      <SkipLinks twins={[{ twin: 'loan-flow', title: FLOW_H3 }]} />
      {!narrow && <p className="font-mono text-[12px] my-1"><a href="#twin-loan-flow" className="text-text-muted underline" onClick={(e) => { e.preventDefault(); openTwinAndFocus('loan-flow'); }}>Skip the diagram to its table</a></p>}
      <p id={descId} className="sr-only">{`${bands.length} bands, ₹${fmtCr(total)} crore across ${rows.length} records; ${excluded} records without ₹ not drawn`}</p>
      {empty ? <p className="text-[14px] text-text-secondary">{'Nothing recorded yet.'}</p>
        : !bands.length ? <p className="text-[14px] text-text-secondary">No census record with a ₹ amount matches these filters.</p>
          : narrow ? (
            <div className="space-y-4">
              <p className="text-[13px] text-text-secondary">the flow diagram needs a wider screen; these are the same bands as lists</p>
              {[0, 1].map((col) => (
                <ul key={col} className="list-none p-0 m-0 space-y-1" aria-label={col === 0 ? 'Lender to middle column, by declared ₹' : 'Middle column to place, by declared ₹'}>
                  {/* Every band, never the first dozen: the lists are paged by the page, not truncated. */}
                  {bands.filter((b) => b.col === col).map((b) => (
                    <li key={b.key} className="text-[13px]">
                      <span className="block truncate">{b.name.split(':')[0]}</span>
                      <span className="flex items-center gap-2"><svg width="100%" height="10" aria-hidden="true" className="max-w-[60%]" style={{ overflow: 'visible' }}><rect x="0.7" y="0.7" width={`${Math.max(1, (100 * b.a) / Math.max(total, 1))}%`} height="8.6" fill="#8aa1a4" fillOpacity={0.35 * TIERS[b.tier].weight + 0.08} stroke="#8aa1a4" strokeWidth={1.4} strokeDasharray={TIERS[b.tier].dash || undefined} /></svg><span className="font-mono text-[12px]">{`₹${fmtCr(b.a)} cr · ${b.tier}`}</span></span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${lay.H}`} role="group" aria-labelledby={`${uid}-h`} aria-describedby={`${descId} ${captionId}`}
                style={{ width: '100%', minWidth: 640, height: 'auto', display: 'block' }}>
                <g aria-hidden="true">
                  {drawn.map(({ b, d }) => (
                    <path key={b.key} d={d} fill="#8aa1a4" fillOpacity={0.35 * TIERS[b.tier].weight + 0.08} stroke="#8aa1a4" strokeOpacity={0.5}
                      strokeWidth={0.6} strokeDasharray={TIERS[b.tier].dash || undefined} onClick={() => pick(b)} style={{ cursor: 'pointer' }} />
                  ))}
                  {[...lay.nodes.values()].map((n) => (
                    <g key={n.id} data-node="">
                      <title>{n.label}</title>
                      {n.fam
                        ? <rect x={X[n.col]} y={n.y0} width={NODE_W} height={Math.max(1, n.y1 - n.y0)} fill={FAMILY_COLOR[n.fam]} />
                        : <rect x={X[n.col] + 0.5} y={n.y0} width={NODE_W - 1} height={Math.max(1, n.y1 - n.y0)} fill="none" stroke="rgb(200,200,200)"><title>{`${n.label}: not in the register, so no family hue`}</title></rect>}
                      {(n.y1 - n.y0 >= 7 || n.col !== 1) && (
                        <text x={n.col === 2 ? X[n.col] - 4 : X[n.col] + NODE_W + 4} y={(n.y0 + n.y1) / 2} dominantBaseline="central" textAnchor={n.col === 2 ? 'end' : 'start'}
                          fontSize="9" fill="rgb(220,220,220)" fontFamily="var(--font-sans)">{n.fam ? n.label : `${n.label} (not in the register)`}</text>
                      )}
                    </g>
                  ))}
                </g>
                {drawn.map(({ b, cx, cy }) => (
                  <foreignObject key={`fo-${b.key}`} x={cx - 5} y={cy - 5} width={10} height={10}>
                    <button type="button" aria-label={b.name} onClick={() => pick(b)}
                      className="block w-[10px] h-[10px] rounded-full bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" />
                  </foreignObject>
                ))}
              </svg>
            </div>
          )}
      <Caption id={captionId} cap="C3" as="figcaption">
        {`The World Bank census only: ${rows.length} records, ₹${fmtCr(total)} cr. Other lenders' records were researched rather than enumerated, and some describe the same money twice (a facility and its tranches; one loan in two research files), so they are drawn one mark each below and never added here. ${allDocumented ? "Every census record is documented from the Bank's own API, so every ribbon is solid." : 'A ribbon takes the weakest tier among its records, drawn in that tier’s dash.'} ${midSentence} Band position is flow order, not influence. ${excluded} records without a ₹ amount are not drawn.`}
      </Caption>
    </figure>
      <Twin twin="loan-flow" title={FLOW_H3} rowCount={twinRows.length} open={f.view === 'table'}>
        {() => (
          <div className="overflow-x-auto">
            <Exports name={FLOW_H3} twin="loan-flow" meta={{ table: FLOW_H3, population: 'bands of census-counted records in view; each record in two bands', lens: 'loans', filters: filterText, rows: twinRows.length, amounts: true }}
              header={['from', 'to', 'a_cr', 'records', 'tier']} rows={() => twinRows.map((r) => r.out)} />
            <Table caption={captionLine(twinRows.length, 'bands of census-counted records in view; each record is in one lender band and one place band', 'loans', filterText)}
              cols={[{ key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'a', label: '₹ cr' }, { key: 'n', label: 'Records merged' }, { key: 'tier', label: 'Tier' }]}
              rows={twinRows.length ? twinRows : [{ cells: ['Nothing recorded yet.'], out: [] }]} />
          </div>
        )}
      </Twin>
    </>
  );
}
