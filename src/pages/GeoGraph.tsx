import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable, TierChip, Footnote, Prose, Cite,
} from '../components/Editorial';
import GeoNetwork, {
  aggregateStateFlows, datedSpan, dateKind, directionOf, filterGeoEdges, geoViewStats, isDirected, linkDenials, samePair,
  scopeGeoEdges, topByAmount, type DenialLinks, type GeoFilter, type GeoInspect, type GeoMode, type GeoScope, type StateFlow,
} from '../components/viz/GeoNetwork';
import { useData } from '../context/DataContext';
import { NODES, EDGES } from '../graph/data';
import { buildNationalGraph } from '../graph/build';
import { TIER_ORDER, type NodeFamily, type StateCode, type GNode, type GEdge } from '../graph/schema';
import { FAMILY_COLOR, FAMILY_LABEL } from '../components/viz/ForceGraph';
import { STATE_BY_ID, STATE_NAMES } from '../data/geo';
import { rollupByState } from '../data/companies';

/**
 * The geographic network.
 *
 * The map and the graph as one object, rather than two views that have to be
 * mentally joined. Everything the map cannot honestly show — un-geocoded positions,
 * non-geographic entities, intra-state relationships — is stated on the page rather
 * than quietly handled.
 */

type Layer = 'atlas' | 'capital' | 'all';

const LAYERS: { id: Layer; label: string; note: string }[] = [
  { id: 'atlas', label: 'Case study', note: 'The tiered, sourced subgraph. Small enough that every arc is legible.' },
  { id: 'capital', label: 'Capital', note: 'Conglomerate groups, listed entities, promoters and foreign capital.' },
  { id: 'all', label: 'Everything', note: 'Dense — use the filters, or the state-flow mode.' },
];

const STATE_METRICS: { id: string; label: string; note: string }[] = [
  { id: 'entities', label: 'Entities in graph', note: 'How many entities in the current view are registered in each state.' },
  { id: 'mcap', label: 'Listed market cap', note: 'Recorded market cap of listed companies registered in each state.' },
  { id: 'companies', label: 'Listed companies', note: 'Count of listed companies registered in each state.' },
  { id: 'none', label: 'None', note: 'Plain ground, so the network carries the whole signal.' },
];

export default function GeoGraph() {
  const { nodes: allNodes, edges: allEdges } = useData();
  const [params, setParams] = useSearchParams();
  const [showTable, setShowTable] = useState(false);

  // Callbacks read the live params through a ref, so the ones handed to the map
  // stay referentially stable and a hover on the map never re-renders its layers.
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const setMany = useCallback(
    (kv: Record<string, string | null>) => {
      const next = new URLSearchParams(paramsRef.current);
      for (const [k, v] of Object.entries(kv)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [setParams],
  );
  const setParam = useCallback((k: string, v: string | null) => setMany({ [k]: v }), [setMany]);

  const layer = (params.get('layer') ?? 'atlas') as Layer;
  const mode = (params.get('mode') ?? 'entities') as GeoMode;
  const metric = params.get('metric') ?? 'entities';
  const query = params.get('q') ?? '';
  const minAmount = Number(params.get('min') ?? 0);
  const selected = params.get('sel');
  const focusParam = params.get('focus');
  const hops = Math.min(3, Math.max(1, Number(params.get('hops') ?? 1) || 1));
  // Codes are lower-case; a hand-typed `state=MH` is read as `mh`, and anything
  // still unrecognised is reported in the caption rather than silently dropped.
  const stateParam = params.get('state');
  const stateLower = stateParam?.trim().toLowerCase() ?? '';
  const stateCode = stateLower && STATE_BY_ID.has(stateLower) ? (stateLower as StateCode) : null;
  const unknownState = stateParam && !stateCode ? stateParam : null;

  const national = useMemo(() => buildNationalGraph(), []);

  const { nodes, edges } = useMemo((): { nodes: GNode[]; edges: GEdge[] } => {
    if (layer === 'atlas') return { nodes: NODES, edges: EDGES };
    if (layer === 'capital') {
      const keep = new Set(national.nodes.filter((n) => n.fam === 'capital').map((n) => n.id));
      return {
        nodes: national.nodes.filter((n) => keep.has(n.id)),
        edges: national.edges.filter((e) => keep.has(e.s) && keep.has(e.t)),
      };
    }
    return { nodes: allNodes, edges: allEdges };
  }, [layer, national, allNodes, allEdges]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const families = useMemo(() => [...new Set(nodes.map((n) => n.fam))] as NodeFamily[], [nodes]);
  const preds = useMemo(() => [...new Set(edges.map((e) => e.pred))].sort(), [edges]);

  const listParam = <T extends string>(k: string, fallback: T[]): Set<T> => {
    const raw = params.get(k);
    if (raw == null) return new Set(fallback);
    return new Set(raw.split(',').filter(Boolean) as T[]);
  };
  // Keyed on the raw strings, so selecting an entity (which also writes the URL)
  // does not hand the map a "new" filter and re-run everything downstream of it.
  const tierRaw = params.get('tier');
  const famRaw = params.get('fam');
  const predRaw = params.get('pred');
  const tiers = useMemo(() => listParam('tier', TIER_ORDER), [tierRaw]);
  const fams = useMemo(() => listParam('fam', families), [famRaw, families]);
  const activePreds = useMemo(() => listParam<string>('pred', []), [predRaw]);

  const toggle = <T extends string>(set: Set<T>, v: T, key: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setParam(key, [...next].join(','));
  };

  /**
   * The dated span actually present in this layer, at year resolution. The Atlas
   * layer carries no dates at all, and the control says so rather than offering
   * a slider that moves nothing.
   */
  const span = useMemo(() => datedSpan(edges), [edges]);
  const fromParam = params.get('from');
  const toParam = params.get('to');
  const years = useMemo((): [number, number] | null => {
    if (!span || (fromParam == null && toParam == null)) return null;
    const clamp = (v: number) => Math.min(span[1], Math.max(span[0], v));
    const a = clamp(Number(fromParam ?? span[0]) || span[0]);
    const b = clamp(Number(toParam ?? span[1]) || span[1]);
    return [Math.min(a, b), Math.max(a, b)];
  }, [span, fromParam, toParam]);

  const filter: GeoFilter = useMemo(
    () => ({ tiers, families: fams, preds: activePreds, query, minAmount, years }),
    [tiers, fams, activePreds, query, minAmount, years],
  );
  const scope: GeoScope = useMemo(
    () => ({ focus: focusParam, hops, state: stateCode, unknownState }),
    [focusParam, hops, stateCode, unknownState],
  );

  // The same functions the map runs — so the table twin and the panel counts cannot drift from it.
  const filtered = useMemo(() => filterGeoEdges(nodes, edges, filter), [nodes, edges, filter]);
  const scoped = useMemo(() => scopeGeoEdges(nodes, filtered.edges, scope), [nodes, filtered.edges, scope]);
  const stats = useMemo(() => geoViewStats(nodes, edges, filter, scope, filtered, scoped), [nodes, edges, filter, scope, filtered, scoped]);
  /** Over the whole layer, so a card can show a denial the filters hide. */
  const denialLinks = useMemo(() => linkDenials(edges), [edges]);
  const tierCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of edges) c.set(e.tier, (c.get(e.tier) ?? 0) + 1);
    return c;
  }, [edges]);
  const hasAmounts = useMemo(() => edges.some((e) => (e.a ?? 0) > 0), [edges]);

  const stateRollup = useMemo(() => rollupByState(), []);

  const stateWeight = useMemo((): Partial<Record<StateCode, number>> | undefined => {
    if (metric === 'none') return undefined;
    const out: Partial<Record<StateCode, number>> = {};
    if (metric === 'entities') {
      for (const n of nodes) if (n.st) out[n.st] = (out[n.st] ?? 0) + 1;
    } else if (metric === 'mcap') {
      for (const [code, r] of stateRollup) if (r.totalMcapCr) out[code] = r.totalMcapCr;
    } else {
      for (const [code, r] of stateRollup) out[code] = r.count;
    }
    return out;
  }, [metric, nodes, stateRollup]);

  const flows = useMemo(() => aggregateStateFlows(nodes, scoped.edges), [nodes, scoped.edges]);

  // ---- map callbacks (stable) ---------------------------------------------

  const onSelect = useCallback((id: string | null) => setParam('sel', id), [setParam]);
  const onStateClick = useCallback(
    (code: StateCode) => setParam('state', paramsRef.current.get('state')?.toLowerCase() === code ? null : code),
    [setParam],
  );
  const onClearFocus = useCallback(() => setMany({ focus: null, hops: null }), [setMany]);
  const onClearState = useCallback(() => setParam('state', null), [setParam]);

  /** Hovered arc or flow, else the pinned one — pinned so its source links can be reached. */
  const [hovered, setHovered] = useState<GeoInspect | null>(null);
  const [pinned, setPinned] = useState<{ item: GeoInspect; view: string } | null>(null);
  /** A pinned card belongs to the view it was pinned in; any filter change retires it. */
  const viewKey = useMemo(() => {
    const p = new URLSearchParams(params);
    p.delete('sel');
    return p.toString();
  }, [params]);
  const viewKeyRef = useRef(viewKey);
  viewKeyRef.current = viewKey;
  const onInspect = useCallback((item: GeoInspect | null, pin: boolean) => {
    if (pin) setPinned(item ? { item, view: viewKeyRef.current } : null);
    else setHovered(item);
  }, []);
  const livePinned = pinned && pinned.view === viewKey ? pinned.item : null;
  const inspect = hovered ?? livePinned;

  /** Escape peels one layer: focus, then state, then selection, then a pinned card. */
  const onEscape = useCallback(() => {
    const p = paramsRef.current;
    if (p.has('focus')) setMany({ focus: null, hops: null });
    else if (p.has('state')) setMany({ state: null });
    else if (p.has('sel')) setMany({ sel: null });
    else setPinned(null);
  }, [setMany]);

  const selectedEdges = useMemo(
    () => (selected ? scoped.edges.filter((e) => e.s === selected || e.t === selected) : []),
    [selected, scoped.edges],
  );

  /** The WCAG twin. Memoised: hovering the map re-renders this page, and must not rebuild 300 rows. */
  const tableTwin = useMemo(() => {
    if (!showTable) return null;
    const scopeNote = [
      stateCode ? `${STATE_NAMES[stateCode]} + first-degree neighbours` : null,
      focusParam && !scoped.focusMissing ? `${hops} hop${hops === 1 ? '' : 's'} from ${byId.get(focusParam)?.label ?? focusParam}` : null,
      years ? `${years[0]}–${years[1]} (undated kept)` : null,
    ].filter(Boolean);
    const ROW_CAP = 300;
    return (
      <Section
        title={mode === 'state-flows' ? 'State-flow ledger' : 'Relationship ledger'}
        note={`The accessible twin of the graphic — same data, same filters${scopeNote.length ? `, same scope: ${scopeNote.join(' · ')}` : ''}`}
      >
        {mode === 'state-flows' ? (
          <DataTable
            columns={['From', 'To', 'Relationships', '₹ cr', 'Weakest tier', 'Predicates']}
            rows={flows.map((f) => [
              <Link key="f" to={`/states/${f.from}`} className="text-text hover:text-accent">
                {STATE_NAMES[f.from]}
              </Link>,
              <Link key="t" to={`/states/${f.to}`} className="text-text hover:text-accent">
                {STATE_NAMES[f.to]}
              </Link>,
              String(f.count),
              <span key="a" className="font-mono text-[12px]">
                {f.amount ? f.amount.toLocaleString('en-IN') : '—'}
              </span>,
              f.count ? <TierChip key="w" tier={[...TIER_ORDER].reverse().find((t) => f.tiers.has(t)) ?? 'documented'} /> : '—',
              <span key="p" className="text-[12px] text-text-muted">
                {[...new Set(f.edges.map((e) => e.pred))].join(', ')}
                {f.aside.length ? ` · ${f.aside.length} denial or fact update, not counted` : ''}
              </span>,
            ])}
          />
        ) : (
          <>
            {scoped.edges.length > ROW_CAP && (
              <p className="font-mono text-[11px] text-amber">
                Showing the first {ROW_CAP} of {scoped.edges.length} relationships in this view. Narrow the filters, click a
                state or focus on an entity to see the rest — nothing beyond row {ROW_CAP} is summarised here.
              </p>
            )}
            <DataTable
              columns={['From', 'From state', 'Relationship', 'To', 'To state', 'Tier', '₹ cr', 'Window']}
              rows={scoped.edges.slice(0, ROW_CAP).map((e, i) => [
                byId.get(e.s)?.label ?? e.s,
                <span key="ss" className="text-[12px] text-text-muted">
                  {byId.get(e.s)?.st ? STATE_NAMES[byId.get(e.s)!.st as string] : '—'}
                </span>,
                <span key="p" className="text-[12.5px]">
                  {e.pred}
                  {isDirected(directionOf(e, byId)) ? ' →' : ''}
                </span>,
                byId.get(e.t)?.label ?? e.t,
                <span key="ts" className="text-[12px] text-text-muted">
                  {byId.get(e.t)?.st ? STATE_NAMES[byId.get(e.t)!.st as string] : '—'}
                </span>,
                <TierChip key={`t${i}`} tier={e.tier} />,
                <span key="a" className="font-mono text-[12px]">
                  {e.a ? e.a.toLocaleString('en-IN') : '—'}
                </span>,
                <span key="w" className="font-mono text-[11.5px] text-text-muted">
                  {windowText(e)}
                </span>,
              ])}
            />
          </>
        )}
      </Section>
    );
  }, [showTable, mode, flows, scoped, byId, stateCode, focusParam, hops, years]);

  // Memoised: the page re-renders on every arc hover (the detail card lives here).
  const { geoNodes, statesTouched } = useMemo(
    () => ({ geoNodes: nodes.filter((n) => n.st).length, statesTouched: new Set(nodes.map((n) => n.st).filter(Boolean)).size }),
    [nodes],
  );
  const nonGeo = nodes.length - geoNodes;

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Geographic network · the map and the graph as one object</Kicker>
        <PageTitle>Relationships, drawn in place</PageTitle>
        <Standfirst>
          A force-directed graph tells you who connects to whom and destroys geography. A choropleth tells
          you where things are and destroys the connections. This draws the relationships on real boundary
          geometry — and states, in the three places where that is dishonest, exactly how it is dishonest.
        </Standfirst>
        <Byline>
          {nodes.length} entities · {edges.length} relationships · {statesTouched} of 36 states and UTs
          touched · marks are placed within a state, never geocoded
        </Byline>
      </header>

      <StatGrid
        items={[
          { value: String(geoNodes), label: 'entities with a registered state — drawn when they have a relationship in view' },
          { value: String(nonGeo), label: 'with no location at all — people, rules, parties, sectors', tone: 'muted' },
          { value: String(flows.filter((f) => f.count > 0).length), label: 'distinct state-to-state pairs in the current view', tone: 'accent' },
          { value: `${statesTouched}/36`, label: 'states and UTs the graph reaches' },
        ]}
      />

      <Callout label="The three honest problems with drawing a network on a map" tone="bottomline">
        <p>
          <strong>1. Nothing here is geocoded.</strong> A mark sits on a golden-angle spiral inside its
          registered state. Its position within that state carries no information whatsoever — it is a
          packing algorithm, not a location.
        </p>
        <p>
          <strong>2. Most of the graph has no place.</strong> {nonGeo} of {nodes.length} entities in this
          view are people, rules, parties or sectors, which are not geographic. Dropping them would
          silently delete most of the network; scattering them across the map would invent locations they
          do not have. They sit in a labelled side column instead.
        </p>
        <p>
          <strong>3. Registered ≠ operational.</strong> An arc between two states records where two
          registered offices are, not where anything happened. Coal India is Kolkata-registered though the
          coal is in Jharkhand and Chhattisgarh.
        </p>
      </Callout>

      {/* ---- controls ---- */}
      <div className="grid gap-5 lg:grid-cols-[15rem_1fr] mt-8">
        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">View</legend>
            <div className="flex flex-wrap gap-1.5">
              {(['entities', 'state-flows'] as GeoMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setParam('mode', m)}
                  className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                    mode === m ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {m === 'entities' ? 'Entities' : 'State flows'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-2 leading-snug">
              {mode === 'entities'
                ? 'Every entity drawn individually, in its state.'
                : 'Relationships aggregated into arcs between registered states.'}
            </p>
          </fieldset>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Focus</legend>
            {selected && byId.get(selected) ? (
              <>
                <p className="text-[12px] text-text-secondary leading-snug mb-2">
                  Neighbourhood of <strong className="text-text">{byId.get(selected)!.label}</strong>
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Focus hops">
                  {[1, 2, 3].map((k) => {
                    const on = focusParam === selected && hops === k;
                    return (
                      <button
                        key={k}
                        aria-pressed={on}
                        onClick={() => setMany({ focus: selected, hops: String(k) })}
                        className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                          on ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                        }`}
                      >
                        {k} hop{k === 1 ? '' : 's'}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-text-muted leading-snug">Select an entity on the map to focus on its neighbourhood.</p>
            )}
            {focusParam && (
              <button onClick={onClearFocus} className="btn-ghost mt-2 !py-1 !px-2 !text-[11px]">
                clear focus{byId.get(focusParam) && focusParam !== selected ? ` on ${byId.get(focusParam)!.label}` : ''} (Esc)
              </button>
            )}
          </fieldset>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">State</legend>
            {unknownState && (
              <p className="text-[11px] text-amber leading-snug mb-2">
                “{unknownState}” is not a state or UT code this map knows — no state filter is applied.
              </p>
            )}
            {stateCode ? (
              <>
                <p className="text-[12px] text-text-secondary leading-snug">
                  <strong className="text-text">{STATE_NAMES[stateCode]}</strong> — entities registered there and their
                  first-degree neighbours anywhere.
                </p>
                <button onClick={onClearState} className="btn-ghost mt-2 !py-1 !px-2 !text-[11px]">
                  clear state
                </button>
              </>
            ) : (
              <p className="text-[11px] text-text-muted leading-snug">Click a state (or Tab to it and press Enter) to filter to it.</p>
            )}
          </fieldset>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Layer</legend>
            <div className="flex flex-wrap gap-1.5">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setParam('layer', l.id)}
                  title={l.note}
                  className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                    layer === l.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-2 leading-snug">{LAYERS.find((l) => l.id === layer)!.note}</p>
          </fieldset>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Ground</legend>
            <select value={metric} onChange={(e) => setParam('metric', e.target.value)} className="input-field !py-1.5 !text-[12px]">
              {STATE_METRICS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted mt-2 leading-snug">
              {STATE_METRICS.find((m) => m.id === metric)!.note}
            </p>
          </fieldset>

          <div>
            <label htmlFor="geoq" className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
              Search
            </label>
            <input
              id="geoq"
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="entity name…"
              className="input-field"
            />
          </div>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Evidence tier</legend>
            <div className="space-y-1.5">
              {TIER_ORDER.filter((t) => tierCounts.has(t)).map((t) => (
                <label key={t} className="flex items-center gap-2.5 cursor-pointer text-[13px]">
                  <input type="checkbox" checked={tiers.has(t)} onChange={() => toggle(tiers, t, 'tier')} className="accent-accent" />
                  <TierChip tier={t} />
                  <span className="ml-auto font-mono text-[10.5px] text-text-muted">
                    {tierCounts.get(t)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">Family</legend>
            <div className="space-y-1.5">
              {families.map((f) => (
                <label key={f} className="flex items-center gap-2.5 cursor-pointer text-[13px]">
                  <input type="checkbox" checked={fams.has(f)} onChange={() => toggle(fams, f, 'fam')} className="accent-accent" />
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
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {preds.map((p) => (
                <label key={p} className="flex items-center gap-2.5 cursor-pointer text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={activePreds.has(p)}
                    onChange={() => toggle(activePreds, p, 'pred')}
                    className="accent-accent"
                  />
                  <span className="text-text-secondary">{p}</span>
                </label>
              ))}
            </div>
            {activePreds.size > 0 && (
              <button onClick={() => setParam('pred', null)} className="btn-ghost mt-2 !py-1 !px-2 !text-[11px]">
                clear
              </button>
            )}
          </fieldset>

          {hasAmounts && (
            <div>
              <label htmlFor="geomin" className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
                Minimum ₹ crore — {minAmount || 'any'}
              </label>
              <input
                id="geomin"
                type="range"
                min={0}
                max={500}
                step={25}
                value={minAmount}
                onChange={(e) => setParam('min', e.target.value === '0' ? null : e.target.value)}
                className="w-full accent-accent"
              />
              <p className="text-[11px] text-text-muted mt-1 leading-snug">
                {minAmount
                  ? `${filtered.edges.length} of ${edges.length} relationships pass. Unpriced relationships fall below any minimum${mode === 'state-flows' ? '; flows are re-aggregated from what passes' : ''}.`
                  : 'Applies to arcs and to state flows alike.'}
              </p>
            </div>
          )}

          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
              Years {span && span[0] < span[1] ? `— ${(years ?? span)[0]}–${(years ?? span)[1]}` : ''}
            </legend>
            {!span ? (
              <p className="text-[11px] text-text-muted leading-snug">
                No relationship in this layer carries a date, so there is nothing for a time control to act on.
              </p>
            ) : span[0] === span[1] ? (
              <p className="text-[11px] text-text-muted leading-snug">Every dated relationship in this layer falls in {span[0]}.</p>
            ) : (
              <>
                <YearRange
                  span={span}
                  value={years ?? span}
                  onChange={([a, b]) => setMany({ from: a === span[0] ? null : String(a), to: b === span[1] ? null : String(b) })}
                />
                <div className="flex justify-between font-mono text-[10px] text-text-muted mt-1">
                  <span>{span[0]}</span>
                  <span>{span[1]}</span>
                </div>
                <p className="text-[11px] text-text-muted mt-1 leading-snug">
                  {stats.undated} undated relationship{stats.undated === 1 ? '' : 's'} in view — never hidden by this range.
                  {years ? ` ${stats.hiddenByTime} dated one${stats.hiddenByTime === 1 ? '' : 's'} in this view outside it hidden.` : ''}{' '}
                  {stats.openEnded} with a start and no recorded end are treated as ongoing; single-dated transfers, awards and
                  denials count as events in their year. Year resolution: the sources mix years, months and days.
                </p>
              </>
            )}
          </fieldset>

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
                  reset
                </button>
              </>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="card-surface !p-3 overflow-hidden">
            <GeoNetwork
              nodes={nodes}
              edges={edges}
              filter={filter}
              mode={mode}
              selected={selected}
              onSelect={onSelect}
              stateWeight={stateWeight}
              height={760}
              scope={scope}
              onStateClick={onStateClick}
              onInspect={onInspect}
              onClearFocus={onClearFocus}
              onClearState={onClearState}
              onEscape={onEscape}
            />
          </div>

          {/* ---- detail area: the hovered or pinned arc / flow. Not a live region: the
              one-line hover line under the map already announces each hover, and
              announcing the whole card as well doubled every sweep of the mouse. ---- */}
          <div className="mt-4">
            {inspect?.kind === 'edge' ? (
              <EdgeCard
                e={inspect.edge}
                byId={byId}
                links={denialLinks}
                pinned={!hovered && !!livePinned}
                onClose={() => setPinned(null)}
              />
            ) : inspect?.kind === 'flow' ? (
              <FlowCard f={inspect.flow} byId={byId} pinned={!hovered && !!livePinned} onClose={() => setPinned(null)} />
            ) : (
              <p className="font-mono text-[11px] text-text-muted">
                Hover or Tab to an {mode === 'state-flows' ? 'inter-state flow' : 'arc'} for its details; click or Enter pins
                them here so the sources can be followed.
              </p>
            )}
          </div>

          {selected && byId.get(selected) && (
            <div className="card-surface mt-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="heading-editorial font-bold text-xl">{byId.get(selected)!.label}</h3>
                  {byId.get(selected)!.sub && <p className="text-[13px] text-text-muted mt-0.5">{byId.get(selected)!.sub}</p>}
                  <p className="font-mono text-[10.5px] text-text-muted mt-1">
                    {byId.get(selected)!.st ? `registered in ${STATE_NAMES[byId.get(selected)!.st as string]}` : 'no location — non-geographic entity'}
                  </p>
                </div>
                <button onClick={() => onSelect(null)} className="btn-ghost !py-1 !px-2 !text-[11px]">
                  close
                </button>
              </div>
              {byId.get(selected)!.d?.length ? (
                <ul className="mt-4 space-y-2">
                  {byId.get(selected)!.d!.map((f, i) => (
                    <li key={i} className="text-[14px] text-text-secondary leading-relaxed border-l-2 border-border-light pl-3">
                      {f}
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul className="mt-4 space-y-1.5">
                {selectedEdges.slice(0, 14).map((e, i) => (
                  <li key={i} className="text-[13px] flex flex-wrap items-baseline gap-2">
                    <TierChip tier={e.tier} />
                    <span className="text-text-muted">{e.s === selected ? '→' : '←'}</span>
                    <strong className="text-text">{byId.get(e.s === selected ? e.t : e.s)?.label ?? '?'}</strong>
                    <span className="text-text-muted">{e.pred}</span>
                    {e.a ? <span className="font-mono text-[11.5px] text-accent">₹{e.a.toLocaleString('en-IN')} cr</span> : null}
                  </li>
                ))}
              </ul>
              {selectedEdges.length > 14 && (
                <p className="font-mono text-[11px] text-text-muted mt-2">
                  {selectedEdges.length - 14} more in the current view — all of them are in the table view.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {showTable && tableTwin}

      <Section title="What the geography does and does not tell you" note="">
        <Prose>
          <p>
            The dominant feature of this map in almost every view is <strong>Delhi</strong> — because
            ministries, central agencies and a large share of PSU registered offices are there. That is an
            artefact of where the Union government sits. It is not a finding about Delhi, and reading a
            concentration of arcs into or out of it as evidence of anything would be the geographic version
            of the hub artefact.
          </p>
          <p>
            The second feature is <strong>Maharashtra</strong>, which carries a large plurality of listed
            corporate headquarters. Any relationship involving a Maharashtra-registered company is
            therefore close to expected, which is exactly why co-location is never drawn as an edge
            anywhere in this platform.{' '}
            <Link to="/patterns" className="underline underline-offset-2">
              The general form of this error
            </Link>
            .
          </p>
        </Prose>
      </Section>

      <Footnote>
        <p>
          <strong>Geometry.</strong> 36 real state and UT boundaries at viewBox 612×696, with anchors at
          the pole of inaccessibility of each state's largest sub-polygon. Arcs are quadratic Béziers that
          always bulge the same way relative to travel direction, so an A→B relationship and a B→A
          relationship separate rather than overprint.
        </p>
        <p>
          <strong>What is excluded, and counted.</strong> In state-flow mode, relationships inside a single
          state cannot be drawn as an arc, and relationships involving a non-geographic entity have no
          endpoint to draw from. Both are excluded from the map and reported in the caption beneath it.
          Nothing is silently dropped.
        </p>
      </Footnote>
    </article>
  );
}

// ---------------------------------------------------------------------------

function windowText(e: GEdge): string {
  const k = dateKind(e);
  if (k === 'undated') return 'undated';
  if (k === 'point') return `${e.from} (event)`;
  if (k === 'open') return e.from ? `${e.from} – no end recorded` : `… – ${e.to}`;
  return `${e.from} – ${e.to}`;
}

/**
 * Two handles on one track. Each is a native range input — keyboard, screen
 * reader and focus ring come for free — overlaid so only the thumbs take the
 * pointer.
 */
function YearRange({ span, value, onChange }: { span: [number, number]; value: [number, number]; onChange: (v: [number, number]) => void }) {
  const [lo, hi] = span;
  const pct = (y: number) => ((y - lo) / (hi - lo)) * 100;
  const thumb =
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-bg [&::-webkit-slider-thumb]:cursor-pointer ' +
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-bg [&::-moz-range-track]:bg-transparent';
  const input = `absolute inset-0 w-full h-5 m-0 appearance-none bg-transparent pointer-events-none rounded focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${thumb}`;
  return (
    <div className="relative h-5">
      <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-border-light" />
      <div
        className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded bg-accent/70"
        style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }}
      />
      <input
        type="range"
        min={lo}
        max={hi}
        step={1}
        value={value[0]}
        aria-label="Earliest year"
        aria-valuetext={String(value[0])}
        onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
        className={input}
        // When both handles meet at the top, the lower one must stay grabbable.
        style={{ zIndex: value[0] >= value[1] ? 3 : 1 }}
      />
      <input
        type="range"
        min={lo}
        max={hi}
        step={1}
        value={value[1]}
        aria-label="Latest year"
        aria-valuetext={String(value[1])}
        onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
        className={input}
        style={{ zIndex: 2 }}
      />
    </div>
  );
}

function CardShell({ pinned, onClose, children }: { pinned: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        {pinned && (
          <button onClick={onClose} className="btn-ghost !py-1 !px-2 !text-[11px] flex-shrink-0">
            unpin
          </button>
        )}
      </div>
    </div>
  );
}

/** The arc card: predicate, tier, amount, window, sources, and the boring reading. */
function EdgeCard({
  e,
  byId,
  links,
  pinned,
  onClose,
}: {
  e: GEdge;
  byId: Map<string, GNode>;
  links: DenialLinks;
  pinned: boolean;
  onClose: () => void;
}) {
  const s = byId.get(e.s);
  const t = byId.get(e.t);
  const dir = directionOf(e, byId);
  // A claim shows the denials touching its entities; a denial shows the claims
  // touching its entities. Same-pair first — and the card says which is which,
  // because only a same-pair link is anything more than a shared entity.
  const related = e.pred === 'contra' ? links.claimsOf.get(e) ?? [] : links.denialsOf.get(e) ?? [];
  const exact = related.filter((x) => samePair(x, e));
  const shared = related.filter((x) => !samePair(x, e));
  const SHOW = 6;
  return (
    <CardShell pinned={pinned} onClose={onClose}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
        Relationship {pinned ? '· pinned' : '· hovered'}
      </p>
      <h3 className="heading-editorial font-bold text-lg mt-1 leading-snug">
        {s?.label ?? e.s} <span className="text-text-muted font-normal">{isDirected(dir) ? '→' : '—'}</span> {t?.label ?? e.t}
      </h3>
      <div className="flex flex-wrap items-center gap-2 mt-2 text-[13px]">
        <TierChip tier={e.tier} />
        <span className={`font-mono text-[12px] ${e.pred === 'contra' ? 'text-rose' : 'text-text-secondary'}`}>{e.pred}</span>
        {e.lab && <span className="text-text-secondary">· {e.lab}</span>}
        <span className="font-mono text-[12px] text-accent">{e.a ? `₹${e.a.toLocaleString('en-IN')} cr` : 'no amount recorded'}</span>
        <span className="font-mono text-[11.5px] text-text-muted">{windowText(e)}</span>
      </div>
      <p className="font-mono text-[10.5px] text-text-muted mt-1">
        {dir === 'transfer'
          ? `recorded as ${s?.label ?? e.s} → ${t?.label ?? e.t}: payer → payee — the endpoint types agree`
          : dir === 'award'
            ? `recorded as ${s?.label ?? e.s} → ${t?.label ?? e.t}: awarding body → winner — which is not always the way money moves`
            : dir === 'unconfirmed'
              ? `recorded as ${s?.label ?? e.s} → ${t?.label ?? e.t}; direction not established — the endpoint types do not confirm who paid whom`
              : `recorded with ${s?.label ?? e.s} as subject and ${t?.label ?? e.t} as object — ${e.pred === 'contra' ? 'a denial' : `a ${e.pred} relationship`} moves no money, so no direction is drawn`}
      </p>
      {e.d && <p className="text-[14px] text-text-secondary leading-relaxed mt-3 max-w-[72ch]">{e.d}</p>}
      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Sources</p>
        {e.srcs?.length ? (
          <Cite srcs={e.srcs} />
        ) : (
          <p className="text-[12.5px] text-amber mt-1">
            None — permitted only because this edge is tier {e.tier}, which is the platform's label for an
            unsourced {e.tier === 'alleged' ? 'attributed assertion' : 'comparison of our own'}.
          </p>
        )}
      </div>
      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Innocent reading</p>
        <p className="text-[13.5px] text-text-secondary leading-relaxed mt-1 max-w-[72ch]">
          {e.innocentReading ?? 'None recorded on this edge. Only analytic edges are required to carry one; its absence is not a finding.'}
        </p>
      </div>
      {(e.upgradeIf || e.killIf) && (
        <dl className="mt-3 grid gap-1 text-[12.5px] text-text-secondary max-w-[72ch]">
          {e.upgradeIf && (
            <div>
              <dt className="inline font-mono text-[10.5px] text-text-muted">upgrade if · </dt>
              <dd className="inline">{e.upgradeIf}</dd>
            </div>
          )}
          {e.killIf && (
            <div>
              <dt className="inline font-mono text-[10.5px] text-text-muted">kill if · </dt>
              <dd className="inline">{e.killIf}</dd>
            </div>
          )}
        </dl>
      )}
      {e.supersededBy && <p className="text-[12.5px] text-amber mt-3">Superseded by {e.supersededBy} — retained, not deleted.</p>}
      {related.length > 0 && (
        <div className="mt-3 border-l-2 border-rose pl-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose">
            {e.pred === 'contra' ? 'Claims touching the entities this denial concerns' : 'Denials touching these entities'}
          </p>
          <p className="text-[11.5px] text-text-muted mt-0.5 max-w-[72ch]">
            The data records who denies what about whom, not which edge a denial answers.{' '}
            {exact.length ? `${exact.length} ${exact.length === 1 ? 'sits' : 'sit'} on the same pair of entities; ` : 'None sits on the same pair of entities; '}
            {shared.length ? `${shared.length} only share${shared.length === 1 ? 's' : ''} one entity with it.` : ''}
          </p>
          {[...exact, ...shared].slice(0, SHOW).map((x, i) => (
            <p key={i} className="text-[13px] text-text-secondary mt-1">
              <TierChip tier={x.tier} /> <span className="font-mono text-[12px]">{x.pred}</span>{' '}
              {byId.get(x.s)?.label ?? x.s} — {byId.get(x.t)?.label ?? x.t}
              {x.lab ? ` · ${x.lab}` : ''}
              {samePair(x, e) ? '' : <span className="text-text-muted"> (shared entity)</span>}
            </p>
          ))}
          {related.length > SHOW && <p className="font-mono text-[11px] text-text-muted mt-1">{related.length - SHOW} more</p>}
        </div>
      )}
    </CardShell>
  );
}

/** The flow card: the five largest relationships inside an aggregated state-to-state arc. */
function FlowCard({ f, byId, pinned, onClose }: { f: StateFlow; byId: Map<string, GNode>; pinned: boolean; onClose: () => void }) {
  const top = topByAmount(f.edges, 5);
  const unpriced = f.edges.filter((e) => !e.a).length;
  return (
    <CardShell pinned={pinned} onClose={onClose}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
        State flow {pinned ? '· pinned' : '· hovered'}
      </p>
      <h3 className="heading-editorial font-bold text-lg mt-1">
        {STATE_NAMES[f.from]} <span className="text-text-muted font-normal">{f.directional ? '→' : '—'}</span> {STATE_NAMES[f.to]}
      </h3>
      <p className="font-mono text-[11.5px] text-text-muted mt-1">
        {f.count} relationship{f.count === 1 ? '' : 's'} · {f.amount ? `₹${f.amount.toLocaleString('en-IN')} cr` : 'no amounts'}
        {unpriced ? ` · ${unpriced} carry no amount` : ''} · registered offices, not where anything happened
        {f.directional ? '' : ' · no single direction: the pair mixes relationships that carry none, or whose recorded direction is not confirmed'}
      </p>
      {f.count > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mt-3">
          Top {Math.min(5, f.count)} by amount
        </p>
      )}
      <ul className="mt-1.5 space-y-1.5">
        {top.map((e, i) => (
          <li key={i} className="text-[13px] flex flex-wrap items-baseline gap-2">
            <TierChip tier={e.tier} />
            <strong className="text-text">{byId.get(e.s)?.label ?? e.s}</strong>
            <span className="text-text-muted">{isDirected(directionOf(e, byId)) ? '→' : '—'}</span>
            <strong className="text-text">{byId.get(e.t)?.label ?? e.t}</strong>
            <span className="text-text-muted">{e.pred}</span>
            <span className="font-mono text-[11.5px] text-accent">{e.a ? `₹${e.a.toLocaleString('en-IN')} cr` : 'no amount'}</span>
          </li>
        ))}
      </ul>
      {f.count > 5 && (
        <p className="font-mono text-[11px] text-text-muted mt-2">{f.count - 5} more in this flow — every one is in the table view.</p>
      )}
      {f.aside.length > 0 && (
        <div className="mt-3 border-l-2 border-rose pl-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose">
            Denials and fact updates between these states — not counted as relationships
          </p>
          {f.aside.map((e, i) => (
            <p key={i} className="text-[13px] text-text-secondary mt-1">
              <TierChip tier={e.tier} /> <span className="font-mono text-[12px]">{e.pred}</span> {byId.get(e.s)?.label ?? e.s} —{' '}
              {byId.get(e.t)?.label ?? e.t}
              {e.lab ? ` · ${e.lab}` : ''}
            </p>
          ))}
        </div>
      )}
    </CardShell>
  );
}
