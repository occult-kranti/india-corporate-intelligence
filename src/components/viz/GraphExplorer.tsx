import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ForceGraph, { FAMILY_COLOR, FAMILY_LABEL, type GraphFilter } from './ForceGraph';
import { TIERS, TIER_ORDER, type GNode, type GEdge, type NodeFamily } from '../../graph/schema';
import { TierChip, DataTable } from '../Editorial';
import { STATE_NAMES } from '../../data/geo';

/**
 * The connection graph with its filter rail, detail panel and table twin.
 *
 * The table is the WCAG-clean twin of the graphic and is kept in sync with the
 * same filter state — it is not a fallback, it is the accessible equivalent.
 */

const PRED_LABEL: Record<string, string> = {
  award: 'Award / contract',
  bond: 'Electoral bond',
  trust: 'Electoral trust',
  direct: 'Direct donation',
  pmin: 'Into a fund',
  pmout: 'Out of a fund',
  csr: 'CSR disbursement',
  own: 'Ownership',
  family: 'Family',
  role: 'Office / directorship',
  law: 'Rule or regulatory reach',
  enforce: 'Proceeding / audit',
  hq: 'Headquartered in',
  listed: 'Listed on',
  sector: 'Operates in',
  contra: 'Denial / counter-evidence',
  supersede: 'Fact update',
  analytic: 'Analytic comparison',
};

interface Props {
  nodes: GNode[];
  edges: GEdge[];
  title?: string;
  /** Predicates offered in the rail. Defaults to whatever appears in the data. */
  height?: number;
  defaultQuery?: string;
}

export default function GraphExplorer({ nodes, edges, height = 620, defaultQuery = '' }: Props) {
  const families = useMemo(() => [...new Set(nodes.map((n) => n.fam))] as NodeFamily[], [nodes]);
  const preds = useMemo(() => [...new Set(edges.map((e) => e.pred))].sort(), [edges]);

  // Filter state lives in the URL so a view can be shared or cited. Anything the
  // reader can see, they can hand to someone else exactly as they saw it.
  const [params, setParams] = useSearchParams();
  const setParam = useCallback(
    (k: string, v: string | null) => {
      const next = new URLSearchParams(params);
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const listParam = <T extends string>(k: string, fallback: T[]): Set<T> => {
    const raw = params.get(k);
    if (raw == null) return new Set(fallback);
    return new Set(raw.split(',').filter(Boolean) as T[]);
  };

  const tiers = useMemo(() => listParam('tier', TIER_ORDER), [params]);
  const fams = useMemo(() => listParam('fam', families), [params, families]);
  const activePreds = useMemo(() => listParam<string>('pred', []), [params]);
  const query = params.get('q') ?? defaultQuery;
  const minAmount = Number(params.get('min') ?? 0);
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const [selected, setSelected] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  // Default to a 2-hop ego view once something is selected: the whole graph is the
  // wrong default at this density, and 2 hops is the radius at which a corporate
  // relationship still means something.
  const [focusHops, setFocusHops] = useState(2);

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
      query,
      minAmount,
      from: from || undefined,
      to: to || undefined,
    }),
    [tiers, fams, activePreds, query, minAmount, from, to],
  );

  const toggle = <T extends string>(set: Set<T>, v: T, key: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setParam(key, [...next].join(','));
  };

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const sel = selected ? byId.get(selected) : null;
  const selEdges = useMemo(
    () => (selected ? edges.filter((e) => e.s === selected || e.t === selected) : []),
    [selected, edges],
  );

  const visibleEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          tiers.has(e.tier) &&
          (!activePreds.size || activePreds.has(e.pred)) &&
          (e.a ?? 0) >= minAmount &&
          fams.has(byId.get(e.s)?.fam ?? 'market') &&
          fams.has(byId.get(e.t)?.fam ?? 'market'),
      ),
    [edges, tiers, activePreds, minAmount, fams, byId],
  );

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of edges) c[e.tier] = (c[e.tier] ?? 0) + 1;
    return c;
  }, [edges]);

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
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
                  onChange={() => toggle(tiers, t, 'tier')}
                  className="accent-accent"
                />
                <TierChip tier={t} />
                <span className="ml-auto font-mono text-[10.5px] text-text-muted">{tierCounts[t]}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-text-muted mt-2 leading-snug">
            Line style carries the tier. It is semantic and is never restyled for looks.
          </p>
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
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {preds.map((p) => (
              <label key={p} className="flex items-center gap-2.5 cursor-pointer text-[13px]">
                <input
                  type="checkbox"
                  checked={activePreds.has(p)}
                  onChange={() => toggle(activePreds, p, 'pred')}
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
              onChange={(e) => setParam('min', e.target.value === '0' ? null : e.target.value)}
              className="w-full accent-accent"
            />
          </div>
        )}

        {dated && (
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-2">
              Time range
            </legend>
            <div className="space-y-2">
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
              when something happened.
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
            {nodes.length} entities · {visibleEdges.length} of {edges.length} relationships shown
          </span>
          <span className="ml-auto">
            click a node for its provenance · <strong className="text-text-secondary">⤢ maximise</strong> or{' '}
            <kbd className="px-1 border border-border rounded">f</kbd> for the whole window
          </span>
        </div>

        {/* Focus control. A graph this dense is a texture, not a picture, until you
            can ask it "what is attached to THIS" — so the control sits above the
            canvas rather than in the filter rail, and says what it will hide. */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            focus
          </span>
          {[0, 1, 2, 3].map((h) => (
            <button
              key={h}
              onClick={() => setFocusHops(h)}
              disabled={h > 0 && !selected}
              className={`font-mono text-[10.5px] px-2 py-0.5 rounded border transition-colors ${
                focusHops === h
                  ? 'border-accent text-accent'
                  : h > 0 && !selected
                    ? 'border-border text-text-muted/40 cursor-not-allowed'
                    : 'border-border text-text-muted hover:border-border-light'
              }`}
              title={h === 0 ? 'Draw the whole filtered graph' : `Show only what is within ${h} hop${h === 1 ? '' : 's'} of the selected entity`}
            >
              {h === 0 ? 'whole graph' : `${h} hop${h === 1 ? '' : 's'}`}
            </button>
          ))}
          {!selected && (
            <span className="font-mono text-[10px] text-text-muted">
              select an entity to focus on it
            </span>
          )}
          {selected && focusHops > 0 && (
            <button
              onClick={() => setSelected(null)}
              className="font-mono text-[10px] text-text-muted hover:text-accent underline underline-offset-2"
            >
              clear selection
            </button>
          )}
        </div>

        {nodes.length > 220 && focusHops === 0 && (
          <p className="text-[12.5px] text-amber mb-2 max-w-[70ch] leading-snug">
            {nodes.length} entities and {visibleEdges.length} relationships are drawn at once here.
            That is more than a single frame can separate — select an entity and focus on one or
            two hops, or narrow the filters, before reading anything off the shape of it.
          </p>
        )}

        <div className="card-surface !p-0 overflow-hidden">
          <ForceGraph
            nodes={nodes}
            edges={edges}
            filter={filter}
            selected={selected}
            onSelect={setSelected}
            height={height}
            focusHops={focusHops}
          />
        </div>

        {/* shape legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 font-mono text-[10px] text-text-muted">
          <span>◯ company</span>
          <span>▢ institution</span>
          <span>◇ recipient of funds</span>
          <span>△ rule or mechanism</span>
          <span>⌒ person</span>
          <span className="italic">shape = type · hue = family · size = weight</span>
        </div>

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
                  {selEdges.length} relationship{selEdges.length === 1 ? '' : 's'}
                </p>
                <ul className="space-y-2.5">
                  {selEdges.slice(0, 24).map((e, i) => {
                    const other = byId.get(e.s === selected ? e.t : e.s);
                    return (
                      <li key={i} className="text-[13.5px] leading-snug">
                        <span className="flex flex-wrap items-baseline gap-2">
                          <TierChip tier={e.tier} />
                          <span className="text-text-muted">{e.s === selected ? '→' : '←'}</span>
                          <strong className="text-text">{other?.label ?? (e.s === selected ? e.t : e.s)}</strong>
                          <span className="text-text-muted">{PRED_LABEL[e.pred] ?? e.pred}</span>
                          {e.a ? <span className="font-mono text-[11px] text-accent">₹{e.a.toLocaleString('en-IN')} cr</span> : null}
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
              caption={`Table view — the accessible twin of the graph above. ${visibleEdges.length} relationships under the current filters.`}
              columns={['From', 'Relationship', 'To', 'Tier', '₹ cr', 'Source']}
              rows={visibleEdges.slice(0, 400).map((e) => [
                byId.get(e.s)?.label ?? e.s,
                PRED_LABEL[e.pred] ?? e.pred,
                byId.get(e.t)?.label ?? e.t,
                <TierChip key="t" tier={e.tier} />,
                e.a ? e.a.toLocaleString('en-IN') : '—',
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
            {visibleEdges.length > 400 && (
              <p className="font-mono text-[10.5px] text-text-muted">
                Showing the first 400 of {visibleEdges.length}. Narrow the filters to see the rest — nothing
                is silently dropped from the count.
              </p>
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
