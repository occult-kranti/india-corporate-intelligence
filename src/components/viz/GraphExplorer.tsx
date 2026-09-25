import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import ForceGraph, {
  FAMILY_COLOR,
  FAMILY_LABEL,
  PRED_LABEL,
  SHAPE_CLASSES,
  shapeClassOf,
  isDirected,
  filterGraph,
  denialIndex,
  type GraphFilter,
  type GraphPath,
  type ShapeClass,
  type DenialIndex,
} from './ForceGraph';
import { TIERS, TIER_ORDER, type GNode, type GEdge, type NodeFamily } from '../../graph/schema';
import { pathLengthProfile, shortestPath, medianDegreeSeparation } from '../../graph/nullModel';
import { TierChip, DataTable } from '../Editorial';
import { STATE_NAMES } from '../../data/geo';

/**
 * The connection graph with its filter rail, detail panel and table twin.
 *
 * The table is the WCAG-clean twin of the graphic and is kept in sync with the
 * same filter state — it is not a fallback, it is the accessible equivalent. It
 * reads the same filtered set as the layout (`filterGraph`), the same ego focus and
 * the same path, so whatever the picture shows the table lists, and nothing else.
 *
 * URL STATE. Every view-changing control round-trips through the search params:
 *   q · tier · fam · pred · ty · amt · from · to   — the filters
 *   sel                                          — the entity in the detail panel
 *   focus · hops                                 — the ego neighbourhood
 *   path=<a>,<b>                                 — the shortest-path question
 * so the exact view — including "these two, three hops apart" — can be sent on.
 * The layout is a pure function of the filters, so the same URL also draws the
 * same picture; what it does not carry is the camera (pan and zoom) and any nodes
 * the reader has dragged and pinned.
 *
 * `amt`, not `min`: the explorer is embedded in host pages that own their own
 * params, and /allocation's `min` register threshold used to be read here as a ₹
 * floor — silently hiding every unamounted edge, denials included.
 *
 * An explicitly empty list is written as `none` (`ty=none`), because an absent
 * key means "all" — and unticking the last box used to bring everything back.
 */

const SHAPE_IDS = SHAPE_CLASSES.map((s) => s.id);

/** How many sources the median separation is sampled from. Deterministic, not random. */
const MEDIAN_SEEDS = 40;

/** Rows per page of the table twin. Paged, never truncated. */
const TABLE_PAGE = 250;

const NONE = 'none';

/**
 * Predicates the path finder will not walk. A denial disputes a claim, a fact
 * update replaces one, and an analytic edge is our own comparison: none of them is
 * a relationship between the two entities, and letting a path run through one
 * turns a rebuttal into a link.
 */
const NOT_A_LINK = new Set<string>(['contra', 'supersede', 'analytic']);

function parseList<T extends string>(raw: string | null, fallback: readonly T[]): Set<T> {
  if (raw == null) return new Set(fallback);
  if (raw === '' || raw === NONE) return new Set();
  return new Set(raw.split(',').filter(Boolean) as T[]);
}

interface Props {
  nodes: GNode[];
  edges: GEdge[];
  title?: string;
  /** Predicates offered in the rail. Defaults to whatever appears in the data. */
  height?: number;
  defaultQuery?: string;
}

type PathResult =
  | { status: 'unknown' | 'unresolved' | 'hidden'; ids: string[] }
  | { status: 'none' }
  | {
      status: 'found';
      hops: number;
      count: number;
      seq: string[];
      stepOf: Map<GEdge, number>;
      /** Denials in view answering a step's claim, keyed to that step. */
      deniesStep: Map<GEdge, number>;
      graphPath: GraphPath;
    };

export default function GraphExplorer({ nodes, edges, height = 620, defaultQuery = '' }: Props) {
  const families = useMemo(() => [...new Set(nodes.map((n) => n.fam))] as NodeFamily[], [nodes]);
  const preds = useMemo(() => [...new Set(edges.map((e) => e.pred))].sort(), [edges]);

  // Filter state lives in the URL so a view can be shared or cited. Anything the
  // reader can see, they can hand to someone else exactly as they saw it.
  const [params, setParams] = useSearchParams();
  const patch = useCallback(
    (kv: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(kv)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );
  const setParam = useCallback((k: string, v: string | null) => patch({ [k]: v }), [patch]);

  // Keyed on the raw strings, NOT on `params`: that object is new on every URL
  // change, and `sel`, `focus` and `path` live in the URL too. Keyed on it, every
  // click rebuilt the filter, re-ran the layout, moved the nodes and threw away
  // the reader's pan and zoom.
  const tierRaw = params.get('tier');
  const famRaw = params.get('fam');
  const predRaw = params.get('pred');
  const tyRaw = params.get('ty');
  const tiers = useMemo(() => parseList(tierRaw, TIER_ORDER), [tierRaw]);
  const fams = useMemo(() => parseList(famRaw, families), [famRaw, families]);
  const activePreds = useMemo(() => parseList<string>(predRaw, []), [predRaw]);
  const types = useMemo(() => parseList<ShapeClass>(tyRaw, SHAPE_IDS), [tyRaw]);
  const query = params.get('q') ?? defaultQuery;
  const minAmount = Number(params.get('amt') ?? 0) || 0;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const label = (id: string) => byId.get(id)?.label ?? id;

  const selParam = params.get('sel');
  const selected = selParam && byId.has(selParam) ? selParam : null;
  const setSelected = (id: string | null) => setParam('sel', id);

  const focusRoot = params.get('focus');
  const hopsRaw = params.get('hops');
  const hops = Math.min(3, Math.max(1, Number.parseInt(hopsRaw ?? '1', 10) || 1));
  const pathRaw = params.get('path');
  const pathPair = useMemo(() => {
    const p = (pathRaw ?? '').split(',').filter(Boolean);
    // One end, or both ends the same, is not a path question.
    return p.length === 2 && p[0] !== p[1] ? (p as [string, string]) : null;
  }, [pathRaw]);

  /**
   * The URL says what the screen shows. An out-of-range `hops` is clamped for
   * display, so it is clamped in the link too; a degenerate `path` is dropped
   * rather than answered with "0 hops".
   */
  useEffect(() => {
    const fix: Record<string, string | null> = {};
    if (hopsRaw != null && (!focusRoot || hopsRaw !== String(hops))) fix.hops = focusRoot ? String(hops) : null;
    if (pathRaw != null && !pathPair) fix.path = null;
    if (Object.keys(fix).length) patch(fix);
  }, [hopsRaw, hops, focusRoot, pathRaw, pathPair, patch]);

  const [showTable, setShowTable] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  /** The edge on the card. Transient — hover state is not view state, so not in the URL. */
  const [activeEdge, setActiveEdge] = useState<GEdge | null>(null);

  // The date span actually present in the data, so the slider cannot promise a
  // range the graph does not cover.
  const dated = useMemo(() => {
    const ds = edges.flatMap((e) => [e.from, e.to].filter(Boolean) as string[]).sort();
    return ds.length ? { min: ds[0].slice(0, 10), max: ds[ds.length - 1].slice(0, 10), count: ds.length } : null;
  }, [edges]);

  const filter: GraphFilter = useMemo(
    () => ({
      tiers,
      families: fams,
      preds: activePreds,
      types,
      query,
      minAmount,
      from: from || undefined,
      to: to || undefined,
    }),
    [tiers, fams, activePreds, types, query, minAmount, from, to],
  );

  /** Toggle one member of a list param. All ticked writes nothing; none ticked writes `none`. */
  const toggle = <T extends string>(set: Set<T>, v: T, key: string, all: readonly T[]) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    const on = all.filter((x) => next.has(x));
    setParam(key, on.length === all.length ? null : on.length ? on.join(',') : NONE);
  };

  /** Predicates are the other way round: none ticked means no predicate filter. */
  const togglePred = (p: string) => {
    const next = new Set(activePreds);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setParam('pred', preds.filter((x) => next.has(x)).join(',') || null);
  };

  const denials = useMemo(() => denialIndex(edges), [edges]);
  /** The filtered graph: what the layout runs over. Denials whose claims survive are kept. */
  const layout = useMemo(() => filterGraph(nodes, edges, filter, denials), [nodes, edges, filter, denials]);
  const layoutIds = useMemo(() => new Set(layout.nodes.map((n) => n.id)), [layout]);
  const focusOn = !!focusRoot && layoutIds.has(focusRoot);

  /**
   * The drawn graph: the layout, cut to the ego neighbourhood when focus is on.
   *
   * One addition beyond k hops, and the caption counts it: when a claim inside the
   * neighbourhood is ANSWERED by a denial whose other end sits outside it, that end
   * is kept. A neighbourhood is not allowed to show a claim without its denial.
   * Denials joined only on the entity do not expand the focus.
   */
  const view = useMemo(() => {
    if (!focusOn) return { nodes: layout.nodes, edges: layout.edges, shown: null as Set<string> | null, extra: 0 };
    const shown = new Set<string>([focusRoot!]);
    for (const [id, d] of pathLengthProfile(layout.edges, focusRoot!)) if (d <= hops) shown.add(id);
    const inLayout = new Set(layout.edges);
    let extra = 0;
    for (const e of layout.edges) {
      if (e.pred !== 'contra' || (shown.has(e.s) && shown.has(e.t))) continue;
      const answersInside = denials.answers.get(e)?.some((c) => inLayout.has(c) && shown.has(c.s) && shown.has(c.t));
      if (!answersInside) continue;
      for (const id of [e.s, e.t]) {
        if (!shown.has(id)) {
          shown.add(id);
          extra++;
        }
      }
    }
    return {
      nodes: layout.nodes.filter((n) => shown.has(n.id)),
      edges: layout.edges.filter((e) => shown.has(e.s) && shown.has(e.t)),
      shown,
      extra,
    };
  }, [layout, focusOn, focusRoot, hops, denials]);

  const viewIds = useMemo(() => new Set(view.nodes.map((n) => n.id)), [view]);
  const viewEdgeSet = useMemo(() => new Set(view.edges), [view]);
  /** The edges a path may walk: every visible relationship that is a relationship. */
  const links = useMemo(() => view.edges.filter((e) => !NOT_A_LINK.has(e.pred)), [view]);

  /**
   * The path, over the VISIBLE links only — the reader's question is about the
   * graph in front of them. Direction ignored; every parallel link between two
   * consecutive path entities is highlighted, since choosing one would be choosing
   * the evidence. Denials are not steps, but a denial answering a step is lit with
   * it and listed beside it.
   */
  const pathResult = useMemo((): PathResult | null => {
    if (!pathPair) return null;
    const [a, b] = pathPair;
    const unknown = pathPair.filter((id) => !byId.has(id));
    if (unknown.length) return { status: 'unknown', ids: unknown };
    const unresolved = pathPair.filter((id) => byId.get(id)?.resolved === false);
    if (unresolved.length) return { status: 'unresolved', ids: unresolved };
    const missing = pathPair.filter((id) => !viewIds.has(id));
    if (missing.length) return { status: 'hidden', ids: missing };
    const r = shortestPath(links, a, b);
    if (!r) return { status: 'none' };
    const step = new Map<string, number>();
    for (let i = 1; i < r.path.length; i++) {
      const [x, y] = [r.path[i - 1], r.path[i]];
      step.set(x < y ? `${x}|${y}` : `${y}|${x}`, i);
    }
    const stepOf = new Map<GEdge, number>();
    for (const e of links) {
      const s = step.get(e.s < e.t ? `${e.s}|${e.t}` : `${e.t}|${e.s}`);
      if (s != null) stepOf.set(e, s);
    }
    const deniesStep = new Map<GEdge, number>();
    for (const [c, s] of stepOf) {
      for (const d of denials.answeredBy.get(c) ?? []) if (viewEdgeSet.has(d) && !deniesStep.has(d)) deniesStep.set(d, s);
    }
    const graphPath: GraphPath = { nodes: new Set(r.path), edges: new Set(stepOf.keys()), ends: [a, b] };
    return { status: 'found', hops: r.path.length - 1, count: r.count, seq: r.path, stepOf, deniesStep, graphPath };
  }, [pathPair, byId, links, viewIds, viewEdgeSet, denials]);

  /**
   * The baseline any path has to be read against, over the same links the path may
   * walk. Sampled from evenly spaced entities in id order — deterministic, so the
   * same view always prints the same number — and computed only while a path
   * question is open.
   */
  const median = useMemo(() => {
    if (!pathPair) return null;
    const ids = [...new Set(links.flatMap((e) => [e.s, e.t]))].sort();
    if (!ids.length) return { hops: 0, seeds: 0 };
    const every = Math.max(1, Math.ceil(ids.length / MEDIAN_SEEDS));
    const seeds = ids.filter((_, i) => i % every === 0);
    return { hops: medianDegreeSeparation(links, seeds), seeds: seeds.length };
  }, [pathPair, links]);

  const addPathEnd = (id: string) => {
    const start = selected ?? pathPair?.[0];
    if (!start || start === id) {
      setSelected(id);
      return;
    }
    patch({ path: `${start},${id}` });
  };

  const sel = selected ? byId.get(selected) : null;
  const selEdges = useMemo(
    () => (selected ? edges.filter((e) => e.s === selected || e.t === selected) : []),
    [selected, edges],
  );

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of edges) c[e.tier] = (c[e.tier] ?? 0) + 1;
    return c;
  }, [edges]);

  const typeCounts = useMemo(() => {
    const c: Partial<Record<ShapeClass, number>> = {};
    for (const n of nodes) {
      const k = shapeClassOf(n.ty);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [nodes]);

  /** Over what is DRAWN — the focus included — since the caption says "in view". */
  const undatedShown = useMemo(() => view.edges.filter((e) => !e.from && !e.to).length, [view]);

  /** Relationships per year of first date — context for the scrubber, not a filter. */
  const years = useMemo(() => {
    if (!dated) return [];
    const y0 = Number(dated.min.slice(0, 4));
    const y1 = Number(dated.max.slice(0, 4));
    const bins = Array.from({ length: y1 - y0 + 1 }, (_, i) => ({ year: y0 + i, n: 0 }));
    for (const e of edges) {
      const d = e.from ?? e.to;
      if (d) bins[Number(d.slice(0, 4)) - y0].n++;
    }
    return bins;
  }, [edges, dated]);

  /** The "path to…" choices, sorted once per view rather than on every edge hover. */
  const pathOptions = useMemo(
    () =>
      [...view.nodes]
        .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
        .map((n) => (
          <option key={n.id} value={n.id}>
            {n.label}
            {n.sub ? ` — ${n.sub}` : ''}
          </option>
        )),
    [view.nodes],
  );

  // ---- captions: what the picture is, and what it is not ----

  const focusCaption: string | null = focusRoot
    ? focusOn
      ? `${view.nodes.length} of ${layout.nodes.length} entities shown — ${hops} hop${hops === 1 ? '' : 's'} from ${label(focusRoot)}` +
        (view.extra
          ? ` (+${view.extra} kept because a denial answers a claim inside the neighbourhood)`
          : '')
      : byId.has(focusRoot)
        ? `Focus entity ${label(focusRoot)} is hidden by the current filters — the whole filtered graph is shown.`
        : `No entity "${focusRoot}" in this graph — the whole filtered graph is shown.`
    : null;

  const restoredCaption: string | null = layout.restored
    ? `${layout.restored} denial${layout.restored === 1 ? '' : 's'} drawn although the filters exclude ${layout.restored === 1 ? 'it' : 'them'}: a claim ${layout.restored === 1 ? 'it answers, or may relate to,' : 'they answer, or may relate to,'} is still drawn, and a claim is never shown without its denial.`
    : null;

  const medianText = median
    ? `median separation in this view: ${median.hops} hop${median.hops === 1 ? '' : 's'} (${median.seeds} sampled sources)`
    : '';
  const pathBasis = 'direction ignored · denials, fact updates and analytic comparisons are not counted as links';

  const pathCaption = ((): string | null => {
    if (!pathPair || !pathResult) return null;
    const r = pathResult;
    switch (r.status) {
      case 'unknown':
        return `No path shown: ${r.ids.map((id) => `"${id}"`).join(' and ')} ${r.ids.length === 1 ? 'is' : 'are'} not an entity in this graph.`;
      case 'unresolved':
        return `No path shown: ${r.ids.map(label).join(' and ')} ${r.ids.length === 1 ? 'is' : 'are'} unresolved — identity not confirmed, so by design ${r.ids.length === 1 ? 'it takes' : 'they take'} no edges. That is a rule of this graph, not a finding about the network.`;
      case 'hidden':
        return `No path shown: ${r.ids.map(label).join(' and ')} ${r.ids.length === 1 ? 'is' : 'are'} not in this view — the filters or the focus hide ${r.ids.length === 1 ? 'it' : 'them'}.`;
      case 'none':
        return `No path between ${label(pathPair[0])} and ${label(pathPair[1])} over the ${links.length} visible links · ${medianText} · ${pathBasis}`;
      case 'found':
        return (
          `shortest path: ${r.hops} hop${r.hops === 1 ? '' : 's'} · ${medianText}` +
          (r.count > 1 ? ` · one of ${r.count >= 1e6 ? 'over a million' : r.count} equally short paths` : '') +
          ` · ${pathBasis}`
        );
    }
  })();

  const status: ReactNode = (focusCaption || pathCaption || restoredCaption) && (
    <>
      {focusCaption && <p className="text-accent">{focusCaption}</p>}
      {pathCaption && <p className="text-accent">{pathCaption}</p>}
      {restoredCaption && <p className="text-rose">{restoredCaption}</p>}
    </>
  );

  /**
   * Escape peels one layer at a time — path, then focus — and only then lets the
   * camera have it to leave the maximised view. Stopping propagation here is what
   * keeps one keypress from doing two things.
   */
  const onRootKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'Escape') return;
    if ((ev.target as Element).closest?.('input, select, textarea')) return;
    if (pathPair) patch({ path: null });
    else if (focusRoot) patch({ focus: null, hops: null });
    else return;
    ev.stopPropagation();
    ev.preventDefault();
  };

  const focusOnSelected = (h: number) => patch({ focus: selected ?? focusRoot, hops: String(h) });

  const pathOn = pathResult?.status === 'found' ? pathResult : null;

  // The table twin: exactly the drawn edges; path steps first and numbered, each
  // followed by any denial that answers it.
  const tableEdges = useMemo(() => {
    if (!pathOn) return view.edges;
    const rank = (e: GEdge) => pathOn.stepOf.get(e) ?? (pathOn.deniesStep.has(e) ? pathOn.deniesStep.get(e)! + 0.5 : Infinity);
    const on = view.edges.filter((e) => rank(e) !== Infinity).sort((a, b) => rank(a) - rank(b));
    return [...on, ...view.edges.filter((e) => rank(e) === Infinity)];
  }, [view, pathOn]);

  useEffect(() => setTablePage(0), [tableEdges]);
  const tablePages = Math.max(1, Math.ceil(tableEdges.length / TABLE_PAGE));
  const page = Math.min(tablePage, tablePages - 1);
  const pageRows = tableEdges.slice(page * TABLE_PAGE, (page + 1) * TABLE_PAGE);

  const card = (compact: boolean) =>
    activeEdge && (
      <EdgeCard
        e={activeEdge}
        label={label}
        denials={denials}
        inView={viewEdgeSet.has(activeEdge)}
        onClose={() => setActiveEdge(null)}
        compact={compact}
      />
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_1fr]" onKeyDown={onRootKeyDown}>
      {/* ---- filter rail ---- */}
      <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
        <div>
          <label htmlFor="gq" className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
            Search entities & aliases
          </label>
          <input
            id="gq"
            value={query}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="name, ticker, alias…"
            className="input-field"
          />
        </div>

        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
            Evidence tier
          </legend>
          <div className="space-y-1.5">
            {TIER_ORDER.filter((t) => tierCounts[t]).map((t) => (
              <label key={t} className="flex items-center gap-2.5 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={tiers.has(t)}
                  onChange={() => toggle(tiers, t, 'tier', TIER_ORDER)}
                  className="accent-accent"
                />
                <TierChip tier={t} />
                <svg width="26" height="8" aria-hidden className="text-text-secondary">
                  <line x1="1" y1="4" x2="25" y2="4" stroke="currentColor" strokeWidth="1.4" strokeDasharray={TIERS[t].dash || undefined} />
                </svg>
                <span className="ml-auto font-mono text-[10.5px] text-text-muted">{tierCounts[t]}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-text-muted mt-2 leading-snug">
            Line style carries the tier. It is semantic and is never restyled for looks. Line weight carries the ₹
            amount; red lines are denials. Arrowheads mark money and award flows only — every other relationship is
            drawn without a direction, because none is recorded.
          </p>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Family</legend>
          <div className="space-y-1.5">
            {families.map((f) => (
              <label key={f} className="flex items-center gap-2.5 cursor-pointer text-[13px]">
                <input type="checkbox" checked={fams.has(f)} onChange={() => toggle(fams, f, 'fam', families)} className="accent-accent" />
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: FAMILY_COLOR[f] }} />
                <span className="text-text-secondary">{FAMILY_LABEL[f]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
            Relationship {activePreds.size > 0 && <span className="text-accent">({activePreds.size})</span>}
          </legend>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {preds.map((p) => (
              <label key={p} className="flex items-center gap-2.5 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={activePreds.has(p)}
                  onChange={() => togglePred(p)}
                  className="accent-accent"
                />
                <span className="text-text-secondary">{PRED_LABEL[p] ?? p}</span>
              </label>
            ))}
          </div>
          {activePreds.size > 0 && (
            <button onClick={() => setParam('pred', null)} className="btn-ghost mt-2 !py-1 !px-2 !text-[11px]">
              clear — show all
            </button>
          )}
        </fieldset>

        {edges.some((e) => (e.a ?? 0) > 0) && (
          <div>
            <label htmlFor="amt" className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
              Minimum ₹ crore — {minAmount || 'any'}
            </label>
            <input
              id="amt"
              type="range"
              min={0}
              max={1000}
              step={25}
              value={minAmount}
              onChange={(e) => setParam('amt', e.target.value === '0' ? null : e.target.value)}
              className="w-full accent-accent"
            />
            {minAmount > 0 && (
              <p className="text-[11px] text-text-muted mt-1 leading-snug">
                Hides every relationship without a recorded amount — ownership, office, proceedings — except denials
                whose claim is still drawn.
              </p>
            )}
          </div>
        )}

        {dated && (
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
              Time range
            </legend>
            <TimeScrubber
              min={dated.min}
              max={dated.max}
              from={from}
              to={to}
              years={years}
              onCommit={(f, t) => patch({ from: f, to: t })}
            />
            <div className="space-y-2 mt-3">
              <label className="block">
                <span className="text-[11px] text-text-muted">from</span>
                <input
                  type="date"
                  value={from}
                  min={dated.min}
                  max={dated.max}
                  onChange={(e) => setParam('from', e.target.value)}
                  className="input-field !py-1.5 !text-[12px]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-text-muted">to</span>
                <input
                  type="date"
                  value={to}
                  min={dated.min}
                  max={dated.max}
                  onChange={(e) => setParam('to', e.target.value)}
                  className="input-field !py-1.5 !text-[12px]"
                />
              </label>
            </div>
            <p className="text-[11px] text-text-muted mt-2 leading-snug">
              {dated.count} of {edges.length * 2} possible date fields are populated. Undated relationships
              are <strong>never</strong> hidden by this filter — absence of a date is not evidence about
              when something happened. {undatedShown} of the {view.edges.length} relationships now in view are
              undated and shown whatever the range.
            </p>
          </fieldset>
        )}

        <div className="space-y-1.5">
          <button onClick={() => setShowTable((s) => !s)} className="btn-ghost w-full !text-[12px]">
            {showTable ? 'Hide' : 'Show'} table view
          </button>
          {[...params.keys()].length > 0 && (
            <>
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="btn-ghost w-full !text-[12px]"
              >
                copy link to this view
              </button>
              <button onClick={() => setParams(new URLSearchParams(), { replace: true })} className="btn-ghost w-full !text-[12px]">
                reset filters
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ---- graph + detail ---- */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2 font-mono text-[10.5px] text-text-muted">
          <span>
            {view.nodes.length} of {nodes.length} entities · {view.edges.length} of {edges.length} relationships shown
          </span>
          <span className="ml-auto">
            click a node for its provenance · shift-click another for the path · <strong className="text-text-secondary">⤢ maximise</strong> or{' '}
            <kbd className="px-1 border border-border rounded">f</kbd> for the whole window
          </span>
        </div>

        {/* Focus control. A graph this dense is a texture, not a picture, until you
            can ask it "what is attached to THIS" — so the control sits above the
            canvas rather than in the filter rail, and says what it will hide. */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">focus</span>
          {[0, 1, 2, 3].map((h) => {
            const active = h === 0 ? !focusRoot : !!focusRoot && hops === h && (!selected || selected === focusRoot);
            const disabled = h > 0 && !selected && !focusRoot;
            return (
              <button
                key={h}
                onClick={() => (h === 0 ? patch({ focus: null, hops: null }) : focusOnSelected(h))}
                disabled={disabled}
                aria-pressed={active}
                className={`font-mono text-[10.5px] px-2 py-0.5 rounded border transition-colors ${
                  active
                    ? 'border-accent text-accent'
                    : disabled
                      ? 'border-border text-text-muted/40 cursor-not-allowed'
                      : 'border-border text-text-muted hover:border-border-light'
                }`}
                title={
                  h === 0
                    ? 'Draw the whole filtered graph (Escape)'
                    : `Show only what is within ${h} hop${h === 1 ? '' : 's'} of ${selected ? label(selected) : focusRoot ? label(focusRoot) : 'the selected entity'}`
                }
              >
                {h === 0 ? 'whole graph' : `${h} hop${h === 1 ? '' : 's'}`}
              </button>
            );
          })}
          {!selected && !focusRoot && (
            <span className="font-mono text-[10px] text-text-muted">select an entity to focus on it</span>
          )}
          {selected && focusRoot && selected !== focusRoot && (
            <span className="font-mono text-[10px] text-text-muted">
              focused on {label(focusRoot)} — pick a radius to refocus on {label(selected)}
            </span>
          )}
          {pathPair && (
            <button
              onClick={() => patch({ path: null })}
              className="font-mono text-[10px] text-text-muted hover:text-accent underline underline-offset-2"
            >
              clear path
            </button>
          )}
        </div>

        {(focusCaption || pathCaption || restoredCaption) && (
          <div className="mb-2 space-y-1 text-[12.5px] leading-snug max-w-[80ch]" aria-live="polite">
            {focusCaption && <p className="text-accent font-mono text-[11.5px]">{focusCaption}</p>}
            {pathCaption && <p className="text-accent font-mono text-[11.5px]">{pathCaption}</p>}
            {pathOn && (
              <p className="text-text-muted">
                Each step is a separately sourced claim: a short chain describes how dense this network is, not a
                relationship between its ends. The median is over connected pairs from {median?.seeds ?? 0} evenly
                spaced sources, over the same links the path may use.
              </p>
            )}
            {restoredCaption && <p className="text-rose font-mono text-[11.5px]">{restoredCaption}</p>}
          </div>
        )}

        {layout.nodes.length > 220 && !focusOn && (
          <p className="text-[12.5px] text-amber mb-2 max-w-[70ch] leading-snug">
            {layout.nodes.length} entities and {layout.edges.length} relationships are drawn at once here.
            That is more than a single frame can separate — select an entity and focus on one or
            two hops, or narrow the filters, before reading anything off the shape of it.
          </p>
        )}

        <div className="card-surface !p-0 overflow-hidden">
          <ForceGraph
            nodes={layout.nodes}
            edges={layout.edges}
            shown={view.shown}
            focusKey={focusOn ? `${focusRoot}:${hops}` : ''}
            path={pathOn ? pathOn.graphPath : null}
            denials={denials}
            selected={selected}
            onSelect={setSelected}
            onPathEnd={addPathEnd}
            activeEdge={activeEdge}
            onEdgeActive={setActiveEdge}
            status={status}
            card={card(true)}
            caption={[
              `${view.nodes.length} entities · ${view.edges.length} relationships · filters stay applied`,
              focusCaption,
              pathCaption,
              restoredCaption,
            ]
              .filter(Boolean)
              .join(' · ')}
            height={height}
          />
        </div>

        {/* Shape legend — also the node-type filter. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-3 font-mono text-[10px] text-text-muted" role="group" aria-label="Filter by entity type">
          {SHAPE_CLASSES.filter((s) => typeCounts[s.id]).map((s) => {
            const on = types.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(types, s.id, 'ty', SHAPE_IDS)}
                aria-pressed={on}
                title={`${on ? 'Hide' : 'Show'} ${s.label} — ${s.types}`}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  on ? 'border-border-light text-text-secondary' : 'border-border text-text-muted/60 line-through'
                }`}
              >
                {s.glyph} {s.label} <span className="text-text-muted">{typeCounts[s.id]}</span>
              </button>
            );
          })}
          <span className="italic ml-2">shape = type (click to filter) · hue = family · size = weight · dashed outline = identity unconfirmed</span>
        </div>

        {card(false)}

        {sel && (
          <div className="card-surface mt-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="heading-editorial font-bold text-xl">{sel.label}</h3>
                {sel.sub && <p className="text-[13px] text-text-muted mt-0.5">{sel.sub}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost !py-1 !px-2 !text-[11px]">
                close
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 font-mono text-[10.5px] text-text-muted">
              <span>focus here:</span>
              {[1, 2, 3].map((h) => (
                <button key={h} onClick={() => focusOnSelected(h)} className="btn-ghost !py-0.5 !px-2 !text-[10.5px]">
                  {h} hop{h === 1 ? '' : 's'}
                </button>
              ))}
              <label className="flex items-center gap-2 ml-2">
                <span>path to…</span>
                <select
                  value={pathPair && pathPair[0] === selected ? pathPair[1] : ''}
                  onChange={(e) => patch({ path: e.target.value ? `${selected},${e.target.value}` : null })}
                  className="input-field !w-56 !py-1 !text-[12px]"
                >
                  <option value="">— choose an entity in view —</option>
                  {pathOptions.filter((o) => o.key !== selected)}
                </select>
              </label>
            </div>

            {pathOn && pathPair?.[0] === selected && (
              <ol className="mt-3 space-y-1 text-[13px] text-text-secondary">
                {pathOn.seq.slice(1).map((id, i) => {
                  const steps = links.filter((e) => pathOn.stepOf.get(e) === i + 1);
                  const denied = view.edges.filter((e) => pathOn.deniesStep.get(e) === i + 1);
                  return (
                    <li key={id} className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-[10.5px] text-text-muted">{i + 1}.</span>
                      <span>{label(pathOn.seq[i])}</span>
                      <span className="text-text-muted">—</span>
                      {steps.map((e, j) => (
                        <span key={j} className="inline-flex items-baseline gap-1">
                          <TierChip tier={e.tier} />
                          <span className="text-text-muted">{PRED_LABEL[e.pred] ?? e.pred}</span>
                        </span>
                      ))}
                      <span className="text-text-muted">—</span>
                      <strong className="text-text">{label(id)}</strong>
                      {denied.length > 0 && (
                        <span className="font-mono text-[10.5px] text-rose">
                          denied: {denied.map((d) => `${label(d.s)}${d.lab ? ` — ${d.lab}` : ''}`).join('; ')}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {sel.al?.length ? (
              <p className="font-mono text-[10.5px] text-text-muted mt-3">
                <span className="uppercase tracking-wider">Aliases</span> — {sel.al.join(' · ')}
              </p>
            ) : null}

            {sel.resolved === false && (
              <p className="mt-3 text-[13px] text-rose border border-rose/40 bg-rose/[0.07] rounded px-3 py-2">
                Identity not confirmed. {sel.collisionRisk} This node takes no edges.
              </p>
            )}

            {sel.d?.length ? (
              <ul className="mt-4 space-y-2.5">
                {sel.d.map((f, i) => (
                  <li key={i} className="text-[14px] text-text-secondary leading-relaxed border-l-2 border-border-light pl-3">
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}

            {sel.srcs?.length ? (
              <p className="font-mono text-[10.5px] text-text-muted mt-4 leading-relaxed">
                {sel.srcs.map(([l, u], i) => (
                  <span key={u + i}>
                    {i > 0 && ' · '}
                    <a href={u} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent">
                      {l}
                    </a>
                  </span>
                ))}
              </p>
            ) : null}

            {selEdges.length > 0 && (
              <div className="mt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
                  {selEdges.length} relationship{selEdges.length === 1 ? '' : 's'} · hover or focus one to inspect it
                </p>
                <ul className="space-y-2.5">
                  {selEdges.slice(0, 24).map((e, i) => {
                    const other = byId.get(e.s === selected ? e.t : e.s);
                    return (
                      <li
                        key={i}
                        className="text-[13.5px] leading-snug"
                        onMouseEnter={() => setActiveEdge(e)}
                        onFocus={() => setActiveEdge(e)}
                      >
                        <span className="flex flex-wrap items-baseline gap-2">
                          <TierChip tier={e.tier} />
                          <span className="text-text-muted">{isDirected(e.pred) ? (e.s === selected ? '→' : '←') : '—'}</span>
                          <strong className="text-text">{other?.label ?? (e.s === selected ? e.t : e.s)}</strong>
                          <span className="text-text-muted">{PRED_LABEL[e.pred] ?? e.pred}</span>
                          {e.a ? <span className="font-mono text-[11px] text-accent">₹{e.a.toLocaleString('en-IN')} cr</span> : null}
                          {!viewEdgeSet.has(e) && <span className="font-mono text-[10px] text-text-muted">(not in this view)</span>}
                        </span>
                        {e.d && <span className="block text-text-muted mt-1 pl-1">{e.d}</span>}
                        {e.innocentReading && (
                          <span className="block text-[12.5px] text-text-muted mt-1.5 pl-3 border-l-2 border-border-light italic">
                            Innocent reading: {e.innocentReading}
                          </span>
                        )}
                        {e.srcs?.length ? (
                          <span className="block font-mono text-[10px] text-text-muted mt-1 pl-1">
                            {e.srcs.map(([l, u], j) => (
                              <span key={j}>
                                {j > 0 && ' · '}
                                <a href={u} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                                  {l}
                                </a>
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="block font-mono text-[10px] text-text-muted mt-1 pl-1">
                            no source — {TIERS[e.tier].label.toLowerCase()} tier
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {selEdges.length > 24 && (
                  <p className="font-mono text-[10.5px] text-text-muted mt-2">
                    …and {selEdges.length - 24} more, shown in the table view.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {showTable && (
          <div className="mt-6">
            <DataTable
              caption={
                `Table view — the accessible twin of the graph above. ${view.edges.length} relationships drawn under the current filters` +
                (focusOn ? `, focus (${hops} hop${hops === 1 ? '' : 's'} from ${label(focusRoot!)})` : '') +
                (layout.restored ? `, including ${layout.restored} denial${layout.restored === 1 ? '' : 's'} kept despite the filters` : '') +
                (pathOn ? '; shortest-path steps are listed first and numbered, each followed by any denial answering it' : '') +
                (tablePages > 1
                  ? `. Rows ${page * TABLE_PAGE + 1}–${page * TABLE_PAGE + pageRows.length} of ${tableEdges.length}, page ${page + 1} of ${tablePages}.`
                  : '.')
              }
              columns={[...(pathOn ? ['Path step'] : []), 'From', 'Relationship', 'To', 'Tier', '₹ cr', 'Window', 'Source']}
              rows={pageRows.map((e) => [
                ...(pathOn
                  ? [
                      <span key="p" className="font-mono text-[12px]">
                        {pathOn.stepOf.get(e) ?? (pathOn.deniesStep.has(e) ? `denies ${pathOn.deniesStep.get(e)}` : '')}
                      </span>,
                    ]
                  : []),
                label(e.s),
                PRED_LABEL[e.pred] ?? e.pred,
                label(e.t),
                <TierChip key="t" tier={e.tier} />,
                e.a ? e.a.toLocaleString('en-IN') : '—',
                <span key="w" className="font-mono text-[11.5px] text-text-muted">{edgeWindow(e)}</span>,
                e.srcs?.length ? (
                  <a
                    key="s"
                    href={e.srcs[0][1]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 text-[12px]"
                  >
                    {e.srcs[0][0]}
                  </a>
                ) : (
                  <span key="s" className="text-[12px] text-text-muted">
                    {TIERS[e.tier].label.toLowerCase()} — no source by design
                  </span>
                ),
              ])}
            />
            {tablePages > 1 && (
              <nav className="flex items-center gap-2 font-mono text-[10.5px] text-text-muted" aria-label="Table pages">
                <button
                  onClick={() => setTablePage(page - 1)}
                  disabled={page === 0}
                  className="btn-ghost !py-0.5 !px-2 !text-[10.5px] disabled:opacity-40"
                >
                  ← previous {TABLE_PAGE}
                </button>
                <span className="tabular-nums">
                  rows {page * TABLE_PAGE + 1}–{page * TABLE_PAGE + pageRows.length} of {tableEdges.length}
                </span>
                <button
                  onClick={() => setTablePage(page + 1)}
                  disabled={page >= tablePages - 1}
                  className="btn-ghost !py-0.5 !px-2 !text-[10.5px] disabled:opacity-40"
                >
                  next {TABLE_PAGE} →
                </button>
              </nav>
            )}
          </div>
        )}

        <p className="font-mono text-[10px] text-text-muted mt-4 leading-relaxed max-w-[70ch]">
          States referenced: {[...new Set(nodes.map((n) => n.st).filter(Boolean))].map((s) => STATE_NAMES[s as string]).slice(0, 8).join(' · ')}
          {[...new Set(nodes.map((n) => n.st).filter(Boolean))].length > 8 ? ' …' : ''}
        </p>
      </div>
    </div>
  );
}

function edgeWindow(e: GEdge): string {
  if (!e.from && !e.to) return 'undated';
  return `${e.from?.slice(0, 10) ?? '…'} – ${e.to?.slice(0, 10) ?? '…'}`;
}

/**
 * The edge card: everything the schema knows about one claim, in the order a
 * sceptical reader needs it — what, how sure, how much, when, says who, and what
 * would change the reading. A denial names the claims it answers; a claim names
 * the denials that answer it. A denial joined only on the entity is shown on both
 * sides as "may relate", never as an answer.
 */
function EdgeCard({
  e,
  label,
  denials,
  inView,
  onClose,
  compact = false,
}: {
  e: GEdge;
  label: (id: string) => string;
  denials: DenialIndex;
  inView: boolean;
  onClose: () => void;
  /** The in-frame version while maximised: same content, tighter box. */
  compact?: boolean;
}) {
  const answers = e.pred === 'contra' ? denials.answers.get(e) ?? [] : [];
  const mayRelate = e.pred === 'contra' ? denials.mayRelate.get(e) ?? [] : [];
  const answeredBy = denials.answeredBy.get(e) ?? [];
  const mayRelateBy = denials.mayRelateBy.get(e) ?? [];
  const claimLine = (c: GEdge, i: number) => (
    <li key={i} className="flex flex-wrap items-baseline gap-2">
      <TierChip tier={c.tier} />
      <span>{label(c.s)}</span>
      <span className="text-text-muted">{PRED_LABEL[c.pred] ?? c.pred}</span>
      <span>{label(c.t)}</span>
      {c.lab && <span className="text-text-muted">— {c.lab}</span>}
    </li>
  );
  const heading = 'font-mono text-[10px] uppercase tracking-[0.14em] mb-1.5';
  return (
    <div
      // Not a live region: it changes on every hover, and a focused edge already
      // announces its own label.
      className={`card-surface border-l-2 ${compact ? '!p-3 !bg-bg/95 text-[12.5px]' : 'mt-4 p-4'} ${e.pred === 'contra' ? '!border-l-rose' : '!border-l-border-light'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
            Relationship{inView ? '' : ' · not in the current view'}
          </p>
          <h4 className={`${compact ? 'text-[13.5px]' : 'text-[15px]'} text-text leading-snug`}>
            <strong>{label(e.s)}</strong>{' '}
            <span className="text-text-muted">
              {isDirected(e.pred) ? `→ ${PRED_LABEL[e.pred] ?? e.pred} →` : `— ${PRED_LABEL[e.pred] ?? e.pred} —`}
            </span>{' '}
            <strong>{label(e.t)}</strong>
          </h4>
        </div>
        <button onClick={onClose} className="btn-ghost !py-1 !px-2 !text-[11px]">
          close
        </button>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2 font-mono text-[11px] text-text-muted">
        <TierChip tier={e.tier} />
        <span className={e.a ? 'text-accent' : ''}>{e.a ? `₹${e.a.toLocaleString('en-IN')} cr` : 'no amount recorded'}</span>
        <span>{edgeWindow(e)}</span>
        {e.supersededBy && <span className="text-amber">superseded by {e.supersededBy} — retained, not deleted</span>}
      </div>

      {e.lab && <p className="text-[13.5px] text-text-secondary mt-2">{e.lab}</p>}
      {e.d && <p className="text-[13.5px] text-text-muted mt-1 leading-relaxed">{e.d}</p>}

      <p className="font-mono text-[10.5px] text-text-muted mt-2 leading-relaxed">
        {e.srcs?.length
          ? e.srcs.map(([l, u], j) => (
              <span key={j}>
                {j > 0 && ' · '}
                <a href={u} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent">
                  {l}
                </a>
              </span>
            ))
          : `no source — ${TIERS[e.tier].label.toLowerCase()} tier, by design`}
      </p>

      {e.innocentReading && (
        <p className="text-[12.5px] text-text-muted mt-2 pl-3 border-l-2 border-border-light italic">
          Innocent reading: {e.innocentReading}
        </p>
      )}
      {e.upgradeIf && <p className="text-[12.5px] text-text-muted mt-1.5"><span className="font-mono text-[10px] uppercase tracking-wider">Upgrade if</span> — {e.upgradeIf}</p>}
      {e.killIf && <p className="text-[12.5px] text-text-muted mt-1.5"><span className="font-mono text-[10px] uppercase tracking-wider">Kill if</span> — {e.killIf}</p>}

      {e.pred === 'contra' && (
        <div className="mt-3 text-[13px]">
          <p className={`${heading} text-rose`}>
            {answers.length
              ? `Answers ${answers.length === 1 ? 'the claim' : `${answers.length} claims`} ${e.t.startsWith('claim:') ? 'it names' : 'between these two entities'}`
              : mayRelate.length
                ? `Answers no claim on this pair. May relate — joined on ${label(e.t)} only, which is not evidence that it answers any of these (${mayRelate.length})`
                : 'No claim in this dataset matches this denial'}
          </p>
          <ul className="space-y-1">{(answers.length ? answers : mayRelate).slice(0, 8).map(claimLine)}</ul>
          {(answers.length || mayRelate.length) > 8 && (
            <p className="font-mono text-[10.5px] text-text-muted mt-1">…and {(answers.length || mayRelate.length) - 8} more.</p>
          )}
        </div>
      )}
      {answeredBy.length > 0 && (
        <div className="mt-3 text-[13px]">
          <p className={`${heading} text-rose`}>
            Answered by {answeredBy.length} denial{answeredBy.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-1">{answeredBy.map(claimLine)}</ul>
        </div>
      )}
      {mayRelateBy.length > 0 && (
        <div className="mt-3 text-[13px]">
          <p className={`${heading} text-text-muted`}>
            {mayRelateBy.length} denial{mayRelateBy.length === 1 ? '' : 's'} may relate — joined on the entity only, not
            an answer to this claim
          </p>
          <ul className="space-y-1">{mayRelateBy.map(claimLine)}</ul>
        </div>
      )}
    </div>
  );
}

const DAY = 86_400_000;
const dayOf = (iso: string) => Math.round(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DAY);
const isoOf = (d: number) => new Date(d * DAY).toISOString().slice(0, 10);

/**
 * Dual-handle scrubber over the dated span.
 *
 * A pointer drag writes to a local draft and commits to the URL on release — every
 * commit re-runs the layout, and doing that per pixel of drag would make the graph
 * boil. The keyboard commits per step. A handle at either end of the span writes
 * nothing, so "the whole span" and "no date filter" are the same URL.
 */
function TimeScrubber({
  min,
  max,
  from,
  to,
  years,
  onCommit,
}: {
  min: string;
  max: string;
  from: string;
  to: string;
  years: { year: number; n: number }[];
  onCommit: (from: string | null, to: string | null) => void;
}) {
  const lo = dayOf(min);
  const hi = dayOf(max);
  const span = Math.max(1, hi - lo);
  const clamp = (d: number) => Math.min(hi, Math.max(lo, d));
  const committed: [number, number] = [from ? clamp(dayOf(from)) : lo, to ? clamp(dayOf(to)) : hi];
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const [a, b] = draft ?? committed;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<0 | 1 | null>(null);

  const pct = (d: number) => `${((d - lo) / span) * 100}%`;
  const commit = ([x, y]: [number, number]) => onCommit(x <= lo ? null : isoOf(x), y >= hi ? null : isoOf(y));
  const place = (which: 0 | 1, d: number): [number, number] => (which === 0 ? [Math.min(clamp(d), b), b] : [a, Math.max(clamp(d), a)]);
  const dayAt = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || !r.width) return lo;
    return Math.round(lo + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * span);
  };

  const maxN = Math.max(1, ...years.map((y) => y.n));
  const y0 = years[0]?.year ?? 0;

  return (
    <div>
      {years.length > 1 && (
        <svg
          viewBox={`0 0 ${years.length} 1`}
          preserveAspectRatio="none"
          className="w-full h-7 block"
          role="img"
          aria-label={`Relationships by year of first date, ${years[0].year} to ${years[years.length - 1].year}`}
        >
          {years.map((y, i) => {
            const inRange = Date.UTC(y.year, 11, 31) / DAY >= a && Date.UTC(y.year, 0, 1) / DAY <= b;
            const h = y.n / maxN;
            return (
              <rect key={y.year} x={i + 0.08} y={1 - h} width={0.84} height={h} fill={inRange ? '#c9a86c' : '#6b6558'}>
                <title>{`${y.year}: ${y.n} relationship${y.n === 1 ? '' : 's'}`}</title>
              </rect>
            );
          })}
        </svg>
      )}
      <div ref={trackRef} className="relative h-5 mx-1.5">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border-light" />
        <div className="absolute top-1/2 h-[3px] -mt-px bg-accent/70" style={{ left: pct(a), width: `calc(${pct(b)} - ${pct(a)})` }} />
        {([0, 1] as const).map((which) => {
          const v = which === 0 ? a : b;
          return (
            <div
              key={which}
              role="slider"
              tabIndex={0}
              aria-label={which === 0 ? 'Time range start' : 'Time range end'}
              aria-valuemin={lo}
              aria-valuemax={hi}
              aria-valuenow={v}
              aria-valuetext={isoOf(v)}
              className="absolute top-1/2 w-3 h-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-accent bg-bg cursor-ew-resize touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ left: pct(v) }}
              onPointerDown={(e) => {
                dragging.current = which;
                e.currentTarget.setPointerCapture(e.pointerId);
                e.preventDefault();
              }}
              onPointerMove={(e) => {
                if (dragging.current !== which) return;
                setDraft(place(which, dayAt(e.clientX)));
              }}
              onPointerUp={() => {
                dragging.current = null;
                if (draft) commit(draft);
                setDraft(null);
              }}
              onKeyDown={(e) => {
                const step = e.shiftKey || e.key === 'PageUp' || e.key === 'PageDown' ? 365 : 30;
                let d: number | null = null;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') d = v - step;
                else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') d = v + step;
                else if (e.key === 'Home') d = which === 0 ? lo : a;
                else if (e.key === 'End') d = which === 0 ? b : hi;
                if (d == null) return;
                e.preventDefault();
                commit(place(which, d));
              }}
            />
          );
        })}
      </div>
      <p className="flex justify-between font-mono text-[10.5px] text-text-muted tabular-nums mt-0.5">
        <span>{isoOf(a)}</span>
        <span>{isoOf(b)}</span>
      </p>
      <p className="text-[10.5px] text-text-muted leading-snug mt-0.5">
        bars: relationships by year of first date{years.length ? `, ${y0}–${years[years.length - 1].year}` : ''} · gold = inside the range
      </p>
    </div>
  );
}
