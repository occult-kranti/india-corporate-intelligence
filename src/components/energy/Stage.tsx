import { useEffect, useState, type ReactNode } from 'react';
import { TierChip } from '../Editorial';
import { FAMILY_COLOR, FAMILY_LABEL, PRED_LABEL, SHAPE_CLASSES, shapeClassOf, type ShapeClass } from '../viz/ForceGraph';
import { TIERS, TIER_ORDER, type GEdge, type GNode, type NodeFamily, type Tier } from '../../graph/schema';
import {
  BENEFIT_OF,
  INDEX_ASOF,
  INDEX_KEYS,
  INDICES_LOADED,
  NODES,
  ORPHANS,
  PRESENT_FAMILIES,
  PRESENT_PREDS,
  RUN_ID,
  ASOF_TEXT,
  SUPERSEDED,
  SWEEP_OF,
  fileAsOf,
  indexLabel,
  labelOf,
  responsesOf,
  sweepLabel,
  type EnergyFilter,
} from '../../data/energy';
import StackTable, { DownloadButton, type Cell, type Download } from './StackTable';
import { amountText, benefitAmount, dateText, encodingShort, openClaimName } from './Cards';
import { FOCUS, type Patch } from './hooks';

const FIELD = 'border-t border-border pt-3 mt-3';
const LEGEND = 'font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5';
const NOTE = 'font-mono text-[10.5px] text-text-muted leading-snug mt-1';

/**
 * The filter rail. A <details>: open by default from 640px, closed below, so the
 * phone reader meets the graph first and the filters one tap away. Every control
 * writes the URL and nothing else, so the view it produces can be sent on.
 */
export function Rail({
  f,
  params,
  patch,
  visible,
  drawable,
  indexEffect,
  noAmountHidden,
  undated,
  open,
  onReset,
  tableOn,
  sup,
}: {
  f: EnergyFilter;
  params: URLSearchParams;
  patch: Patch;
  visible: GEdge[];
  drawable: GEdge[];
  indexEffect: { from: number; to: number };
  noAmountHidden: number;
  undated: number;
  open: boolean;
  onReset: () => void;
  tableOn: boolean;
  sup: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const active = ['dom', 'q', 'tier', 'fam', 'pred', 'ty', 'min', 'from', 'to', 'idx', 'via', 'focus'].filter((k) => params.has(k)).length;
  const tierCount = (t: Tier) => drawable.filter((e) => e.tier === t).length;
  const toggleTier = (t: Tier) => {
    const next = new Set(f.tiers);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    const on = TIER_ORDER.filter((x) => next.has(x));
    patch({ tier: on.length === TIER_ORDER.length ? null : on.length ? on.join(',') : 'none' });
  };
  const toggleFam = (x: NodeFamily) => {
    const next = new Set(f.fams);
    if (next.has(x)) next.delete(x);
    else next.add(x);
    const on = PRESENT_FAMILIES.filter((y) => next.has(y));
    patch({ fam: on.length === PRESENT_FAMILIES.length ? null : on.length ? on.join(',') : 'none' });
  };
  const togglePred = (p: string) => {
    const next = new Set(f.preds);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    patch({ pred: next.size ? [...next].sort().join(',') : null });
  };
  return (
    <details open={open} className="[overflow-wrap:anywhere]">
      <summary className={`cursor-pointer font-mono text-[11px] text-text-secondary py-1 lg:hidden ${FOCUS}`}>
        Filters · {active} active · {drawable.length} → {visible.length} claims
      </summary>
      <nav aria-label="Graph filters" className="text-[12.5px] text-text-secondary">
        <fieldset className="mt-1">
          <legend className={LEGEND}>Evidence tier</legend>
          {TIER_ORDER.map((t) => (
            <label key={t} className="flex items-center gap-2 py-0.5">
              <input type="checkbox" value={t} aria-label={TIERS[t].label} checked={f.tiers.has(t)} onChange={() => toggleTier(t)} className={FOCUS} />
              <TierChip tier={t} title={false} />
              <span className="font-mono text-[10.5px] text-text-muted">{tierCount(t)}</span>
            </label>
          ))}
          <p className={NOTE}>responses to visible claims are never hidden</p>
        </fieldset>
        <fieldset className={FIELD}>
          <legend className={LEGEND}>Kind of actor</legend>
          {PRESENT_FAMILIES.map((x) => (
            <label key={x} className="flex items-center gap-2 py-0.5">
              <input type="checkbox" value={x} aria-label={FAMILY_LABEL[x]} checked={f.fams.has(x)} onChange={() => toggleFam(x)} className={FOCUS} />
              {/* The swatch is the hue key: without it nothing on the page maps node colour to family. */}
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: FAMILY_COLOR[x] }} aria-hidden="true" />
              {FAMILY_LABEL[x]}
            </label>
          ))}
        </fieldset>
        <fieldset className={FIELD}>
          <legend className={LEGEND}>Relationship</legend>
          {PRESENT_PREDS.map((p) => (
            <label key={p} className="flex items-center gap-2 py-0.5">
              <input type="checkbox" value={p} aria-label={PRED_LABEL[p] ?? p} checked={f.preds.has(p)} onChange={() => togglePred(p)} className={FOCUS} />
              {PRED_LABEL[p] ?? p}
            </label>
          ))}
          <p className={NOTE}>none ticked = every relationship · responses follow their claim</p>
        </fieldset>
        <fieldset className={FIELD}>
          <legend className={LEGEND}>₹ minimum (crore)</legend>
          <input
            id="amt"
            type="number"
            min={0}
            step={1}
            value={f.min || ''}
            placeholder="0"
            onChange={(e) => patch({ min: e.target.value && Number(e.target.value) > 0 ? String(Number(e.target.value)) : null })}
            className={`input-field !py-1 !text-[12.5px] ${FOCUS}`}
            aria-label="Minimum amount in crore"
          />
          {f.min > 0 && <p className={NOTE}>{noAmountHidden} claims have no amount and are hidden</p>}
        </fieldset>
        <fieldset className={FIELD}>
          <legend className={LEGEND}>Time window</legend>
          <label className="block">
            from{' '}
            <input type="date" value={f.from} onChange={(e) => patch({ from: e.target.value || null })} className={`input-field !py-1 !text-[12px] ${FOCUS}`} />
          </label>
          <label className="block mt-1">
            to{' '}
            <input type="date" value={f.to} onChange={(e) => patch({ to: e.target.value || null })} className={`input-field !py-1 !text-[12px] ${FOCUS}`} />
          </label>
          <p className={NOTE}>undated claims are never hidden by the window{f.from || f.to ? ` · ${undated} shown regardless` : ''}</p>
        </fieldset>
        <fieldset className={FIELD} disabled={!INDICES_LOADED}>
          <legend className={LEGEND}>Index</legend>
          {!INDICES_LOADED ? (
            <p className={NOTE}>index lists not loaded in this build</p>
          ) : (
            <>
              <label className="flex items-center gap-2 py-0.5">
                <input type="radio" name="energy-idx" value="none" checked={!f.idx} onChange={() => patch({ idx: null, via: null })} className={FOCUS} />
                none
              </label>
              {INDEX_KEYS.map((k) => (
                <label key={k} className="flex items-center gap-2 py-0.5">
                  <input type="radio" name="energy-idx" value={k} checked={f.idx === k} onChange={() => patch({ idx: k })} className={FOCUS} />
                  {k} <span className="text-text-muted">({indexLabel(k)})</span>
                </label>
              ))}
              <label className="flex items-center gap-2 py-0.5">
                <input type="checkbox" aria-label="include via group" checked={f.via} onChange={(e) => patch({ via: e.target.checked ? 'group' : null })} className={FOCUS} />
                include via group
              </label>
              <p className="font-mono text-[10.5px] text-amber mt-1">
                <span data-effect="">
                  {indexEffect.from} → {indexEffect.to} claims
                </span>
              </p>
              <p className={NOTE}>
                keeps claims with an endpoint that is a constituent; via group also keeps claims touching a group with an ownership claim into one ·
                membership as of {INDEX_ASOF}, not as of each claim's date
              </p>
            </>
          )}
        </fieldset>
        {f.focus && (
          <fieldset className={FIELD}>
            <legend className={LEGEND}>Focus: {labelOf(f.focus)}</legend>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={f.hops === h}
                  onClick={() => patch({ hops: String(h) })}
                  className={`px-1.5 rounded border font-mono text-[11px] ${f.hops === h ? 'border-accent text-accent' : 'border-border-light'} ${FOCUS}`}
                >
                  {h} {h === 1 ? 'hop' : 'hops'}
                </button>
              ))}
              <button type="button" onClick={() => patch({ focus: null, hops: null })} className={`px-1.5 rounded border border-border-light font-mono text-[11px] ${FOCUS}`}>
                clear focus
              </button>
            </div>
          </fieldset>
        )}
        <div className={`${FIELD} flex flex-col gap-1.5`}>
          <button type="button" onClick={() => patch({ table: tableOn ? null : '1', tp: null })} className={`btn-ghost !py-1 !text-[12px] ${FOCUS}`}>
            {tableOn ? 'Hide table' : 'Show table'}
          </button>
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" aria-label="include superseded" checked={sup} onChange={(e) => patch({ sup: e.target.checked ? '1' : null })} className={FOCUS} />
            include superseded in the table
          </label>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className={`btn-ghost !py-1 !text-[12px] ${FOCUS}`}
          >
            {copied ? 'link copied' : 'copy link to this view'}
          </button>
          <button type="button" onClick={onReset} className={`btn-ghost !py-1 !text-[12px] ${FOCUS}`}>
            reset
          </button>
          <p className={NOTE}>reset clears the graph's filters and selection; the sweep chips and the section controls below keep theirs</p>
        </div>
      </nav>
    </details>
  );
}

/** The shape legend, which is also the entity-type filter. */
export function ShapeLegend({ f, patch, nodes }: { f: EnergyFilter; patch: Patch; nodes: GNode[] }) {
  const counts = new Map<ShapeClass, number>();
  for (const n of nodes) counts.set(shapeClassOf(n.ty), (counts.get(shapeClassOf(n.ty)) ?? 0) + 1);
  const toggle = (c: ShapeClass) => {
    const next = new Set(f.types);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    const on = SHAPE_CLASSES.map((s) => s.id).filter((x) => next.has(x));
    patch({ ty: on.length === SHAPE_CLASSES.length ? null : on.length ? on.join(',') : 'none' });
  };
  return (
    <div role="group" aria-label="Filter by entity type" className="flex flex-wrap gap-1.5 mt-2">
      {SHAPE_CLASSES.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={f.types.has(s.id)}
          title={s.types}
          onClick={() => toggle(s.id)}
          className={`font-mono text-[11px] px-2 py-0.5 rounded border ${f.types.has(s.id) ? 'border-border-light text-text-secondary' : 'border-border text-text-muted line-through'} ${FOCUS}`}
        >
          {s.glyph} {s.label} {counts.get(s.id) ?? 0}
        </button>
      ))}
    </div>
  );
}

/** The dash key in the in-frame status: real SVG samples, so it survives a screenshot. */
export function DashKey() {
  return (
    <p className="flex flex-wrap items-center gap-x-2">
      line style = evidence tier
      {TIER_ORDER.map((t) => (
        <span key={t} className="inline-flex items-center gap-1">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="18" y2="3" stroke="rgba(232,228,220,0.8)" strokeWidth="1.4" strokeDasharray={TIERS[t].dash || undefined} />
          </svg>
          {t}
        </span>
      ))}
      · rose tick = a response, one tick per response tier
    </p>
  );
}

/**
 * The hue key in the in-frame status, beside the dash key, so the family channel is
 * decodable in a screenshot and under maximise, where the rail is not visible. Only
 * families present in the build, so the key never lists a colour the canvas cannot show.
 * The regulators hue shares its hex with the response rose (spec §6, known collision),
 * and the key says so rather than leave a regulator node to read as a response.
 * Below 640 the page hides it in the frame (six families would cover a phone canvas);
 * the rail's swatches carry the key there.
 */
export function FamilyKey({ className = '' }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 ${className}`}>
      colour = kind of actor
      {PRESENT_FAMILIES.map((x) => (
        <span key={x} className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: FAMILY_COLOR[x] }} aria-hidden="true" />
          {FAMILY_LABEL[x]}
          {x === 'enforce' ? ' (a node; a rose line or tick is a response)' : ''}
        </span>
      ))}
    </p>
  );
}

/**
 * The separation histogram, drawn while a path is set. One rect per bin and nothing
 * else, so the twin below has exactly one row per bar.
 *
 * The bar holding the path's far end is outlined, and a rule marks the median of the
 * bars, so the reader sees where this path falls among every distance from the same
 * entity — the denominator for "a short path". The median is these bars' own, not the
 * margin's sampled "median separation": that is a different distribution (pairs of
 * evenly spaced entities) and would be misread against these bars.
 */
export function PathHistogram({ from, to, dist, visibleCount }: { from: string; to: string; dist: Map<string, number>; visibleCount: number }) {
  const bins = new Map<number, number>();
  for (const [id, d] of dist) if (id !== from && d > 0) bins.set(d, (bins.get(d) ?? 0) + 1);
  const hops = [...bins.keys()].sort((a, b) => a - b);
  const reached = [...bins.values()].reduce((a, b) => a + b, 0);
  const pathHops = dist.get(to) ?? null;
  // Lower median over reached entities: walk the sorted bins to the middle entity.
  const median = (() => {
    if (!reached) return null;
    const mid = Math.floor((reached - 1) / 2);
    let seen = 0;
    for (const h of hops) {
      seen += bins.get(h)!;
      if (seen > mid) return h;
    }
    return null;
  })();
  const unreachable = Math.max(0, visibleCount - 1 - reached);
  const max = Math.max(1, ...bins.values());
  const W = 720;
  const H = 150;
  const bw = hops.length ? Math.min(80, (W - 40) / hops.length) : 0;
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full max-w-[720px]" role="img" aria-label={`Distribution of entities by hops from ${labelOf(from)}`}>
        <title>{`Distribution of entities by hops from ${labelOf(from)}`}</title>
        {hops.map((h, i) => {
          const n = bins.get(h)!;
          const bh = (n / max) * (H - 10);
          const mine = h === pathHops;
          return (
            <rect
              key={h}
              x={20 + i * bw}
              y={H - bh}
              width={bw - 4}
              height={bh}
              fill="rgba(232,228,220,0.45)"
              stroke={mine ? '#e8e4dc' : undefined}
              strokeWidth={mine ? 2 : undefined}
            />
          );
        })}
        {median != null && hops.includes(median) && (
          <line
            x1={20 + hops.indexOf(median) * bw + (bw - 4) / 2}
            x2={20 + hops.indexOf(median) * bw + (bw - 4) / 2}
            y1={0}
            y2={H}
            stroke="rgba(232,228,220,0.8)"
            strokeWidth={1}
          />
        )}
        {hops.map((h, i) => (
          <text key={h} x={20 + i * bw + (bw - 4) / 2} y={H + 16} textAnchor="middle" fontSize="12" fill="rgba(232,228,220,0.7)">
            {h}
          </text>
        ))}
      </svg>
      <p className="font-mono text-[11px] text-text-muted">
        hops from {labelOf(from)} · outlined: the bar holding {labelOf(to)}
        {pathHops != null ? ` (${pathHops} hops)` : ' (not reached)'} · rule: median of these bars{median != null ? `, ${median} hops` : ''}
      </p>
      <p className="text-[13px] text-text-secondary mt-1">
        {unreachable} entities in this view cannot be reached from {labelOf(from)} and are not binned. Short paths between large Indian entities are the
        norm in any researched graph.
      </p>
      <StackTable
        columns={['hops', 'entities', 'share']}
        caption={`${hops.length} rows · entities by hops from ${labelOf(from)} in the current filtered view`}
        minWidth="16rem"
        rows={hops.map((h) => [
          `${h}${h === pathHops ? ' · this path' : ''}${h === median ? ' · median' : ''}`,
          String(bins.get(h)),
          `${((bins.get(h)! / Math.max(1, reached)) * 100).toFixed(1)}%`,
        ])}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The table twin
// ---------------------------------------------------------------------------

export const TWIN_COLUMNS = [
  'claim id', 'sweep', 'file asOf', 's → pred → t', 'lab', 'd', 'tier', '₹', 'from – to',
  'beneficiary', 'how', 'benefit ₹', 'confidence', 'innocent reading', 'upgradeIf', 'killIf',
  'responses', 'superseded by', 'sources',
];
const PAGE = 400;

type RowKind = 'drawn' | 'superseded' | 'orphan';

/**
 * An endpoint's id plus the two channels the canvas shows only as hue and size
 * (WCAG 1.4.1, audit A11Y-001 M3), so a reader who takes the table instead of the
 * canvas loses neither. Inside the existing "s → pred → t" cell because the twin's
 * columns are fixed by spec §5.7. An endpoint that is not a node has no encoding and
 * says nothing extra — never a made-up family.
 */
function endpointNote(id: string): string {
  const n = NODES.get(id);
  return n ? `${id}; ${encodingShort(n)}` : id;
}

function textRow(e: GEdge, kind: RowKind): string[] {
  const id = e.id ?? '';
  const b = BENEFIT_OF(id);
  const r = responsesOf(e);
  return [
    id,
    sweepLabel(SWEEP_OF(id)),
    fileAsOf(SWEEP_OF(id)) ?? '',
    `${labelOf(e.s)} (${endpointNote(e.s)}) → ${e.pred} → ${labelOf(e.t)} (${endpointNote(e.t)})`,
    e.lab ?? '',
    e.d ?? '',
    e.tier,
    e.a ? String(e.a) : '',
    dateText(e),
    b ? `${NODES.has(b.who) ? labelOf(b.who) : b.who}${NODES.has(b.who) ? '' : ' (not a node)'}` : '',
    b?.how ?? '',
    b ? benefitAmount(b) : '',
    b?.confidence ?? '',
    e.innocentReading ?? '',
    e.upgradeIf ?? '',
    e.killIf ?? '',
    `${r.length} responses${r.length ? ': ' + r.map((x) => `${labelOf(x.s)} — ${x.d ?? ''}`).join(' | ') : ''}`,
    kind === 'superseded' ? `superseded by ${e.supersededBy}` : kind === 'orphan' ? `endpoint not in platform — not drawn` : '',
    (e.srcs ?? []).map(([l, u]) => `${l} <${u}>`).join(' | '),
  ];
}

function cells(e: GEdge, kind: RowKind, onOpen: (id: string) => void): Cell[] {
  const id = e.id ?? '';
  const b = BENEFIT_OF(id);
  const r = responsesOf(e);
  const missing = [e.s, e.t].filter((x) => !NODES.has(x));
  return [
    kind === 'orphan' ? (
      <span className="font-mono text-[11.5px]">{id}</span>
    ) : (
      <button type="button" aria-label={openClaimName(e)} onClick={() => onOpen(id)} className={`font-mono text-[11.5px] underline underline-offset-2 hover:text-accent text-left ${FOCUS}`}>
        {id}
      </button>
    ),
    sweepLabel(SWEEP_OF(id)),
    <span className="font-mono text-[11.5px]">{fileAsOf(SWEEP_OF(id)) ?? '—'}</span>,
    <span>
      {labelOf(e.s)} <span className="font-mono text-[10.5px] text-text-muted">({endpointNote(e.s)})</span> → {e.pred} → {labelOf(e.t)}{' '}
      <span className="font-mono text-[10.5px] text-text-muted">({endpointNote(e.t)})</span>
    </span>,
    e.lab ?? '—',
    e.d ?? '—',
    <TierChip tier={e.tier} />,
    e.a ? amountText(e.a) : { node: '—', title: 'no amount recorded' },
    dateText(e),
    b ? `${NODES.has(b.who) ? labelOf(b.who) : b.who}${NODES.has(b.who) ? ' (node)' : ' (not a node in this graph)'}` : 'no beneficiary recorded',
    b?.how ?? '—',
    b ? benefitAmount(b) : '—',
    b?.confidence ?? '—',
    e.innocentReading ?? '—',
    e.upgradeIf ?? '—',
    e.killIf ?? '—',
    <span>
      {r.length === 1 ? '1 response' : `${r.length} responses`}
      {r.map((x, i) => (
        <span key={i} className="block text-text-muted mt-1">
          {labelOf(x.s)}: {x.d}
        </span>
      ))}
    </span>,
    kind === 'superseded' ? `superseded by ${e.supersededBy}` : kind === 'orphan' ? `endpoint ${missing.join(', ')} not in platform — not drawn` : '—',
    <span className="space-y-1 block">
      {(e.srcs ?? []).map(([l, u], i) => (
        <span key={i} className="block">
          {l}
          <br />
          <a href={u} target="_blank" rel="noopener noreferrer" className={`font-mono text-[11px] underline underline-offset-2 ${FOCUS}`}>
            {u}
          </a>
        </span>
      ))}
    </span>,
  ];
}

export function Twin({
  visible,
  sup,
  page,
  patch,
  patchQuiet,
  words,
  onOpen,
  cannotShow,
}: {
  visible: GEdge[];
  sup: boolean;
  page: number;
  patch: Patch;
  patchQuiet: Patch;
  words: string;
  onOpen: (id: string) => void;
  cannotShow: string;
}) {
  const rows: [GEdge, RowKind][] = [...visible.map((e) => [e, 'drawn'] as [GEdge, RowKind]), ...(sup ? SUPERSEDED.map((e) => [e, 'superseded'] as [GEdge, RowKind]) : [])];
  const n = rows.length;
  const pages = Math.max(1, Math.ceil(n / PAGE));
  const p = Math.min(Math.max(1, page), pages);
  const a = n ? (p - 1) * PAGE + 1 : 0;
  const b = Math.min(n, p * PAGE);
  const slice = rows.slice(a ? a - 1 : 0, b);
  // Orphans close the table on its last page. They cannot be drawn, so they are not
  // part of the "of n" that matches the canvas; they are listed so none is dropped.
  const withOrphans: [GEdge, RowKind][] = p === pages ? [...slice, ...ORPHANS.map((e) => [e, 'orphan'] as [GEdge, RowKind])] : slice;
  useEffect(() => {
    if (page > pages) patchQuiet({ tp: pages > 1 ? String(pages) : null });
  }, [page, pages, patchQuiet]);
  const download: Download = {
    filename: `energy-claims-${RUN_ID}.csv`,
    comments: [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, words, `what this cannot show: ${cannotShow}`],
    columns: TWIN_COLUMNS,
    rows: () => [...rows, ...ORPHANS.map((e) => [e, 'orphan'] as [GEdge, RowKind])].map(([e, k]) => textRow(e, k)),
    count: n,
  };
  const caption = `${n} rows${sup ? ` (${SUPERSEDED.length} superseded included)` : ''} · ${words}${ORPHANS.length ? ` · ${ORPHANS.length} orphan rows follow on the last page, not counted` : ''}`;
  return (
    <section id="twin" tabIndex={-1} className="pt-8 outline-none">
      <h2 className="heading-editorial font-bold text-xl border-b border-border-light pb-2 mb-2">Every drawn claim, as a table</h2>
      <p className="font-mono text-[11px] text-text-muted flex flex-wrap gap-3 items-center">
        <span>
          with superseded records: <span data-effect="">{visible.length} → {visible.length + SUPERSEDED.length} rows</span>
        </span>
        <DownloadButton d={download} />
      </p>
      <StackTable
        columns={TWIN_COLUMNS}
        rows={withOrphans.map(([e, k]) => cells(e, k, onOpen))}
        caption={caption}
        minWidth="120rem"
        rowProps={(i) => ({ 'data-claim': withOrphans[i][0].id })}
      />
      <p className="font-mono text-[11px] text-text-muted flex gap-3 items-center">
        rows {a}–{b} of {n}
        <button type="button" disabled={p <= 1} onClick={() => patch({ tp: p - 1 > 1 ? String(p - 1) : null })} className={`underline disabled:opacity-40 disabled:no-underline ${FOCUS}`}>
          ← previous
        </button>
        <button type="button" disabled={p >= pages} onClick={() => patch({ tp: String(p + 1) })} className={`underline disabled:opacity-40 disabled:no-underline ${FOCUS}`}>
          next →
        </button>
      </p>
    </section>
  );
}

export function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6 pointer-events-none">
      <div className="pointer-events-auto max-w-[32rem] bg-bg/95 border border-border-light rounded p-4 text-[14px] text-text-secondary space-y-2">{children}</div>
    </div>
  );
}
