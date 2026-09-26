import { Callout, TierChip } from '../Editorial';
import { TIERS, type GEdge } from '../../graph/schema';
import type { BaseRateRow, Narrative, NarrativeStatus } from '../../graph/fleet';
import {
  ASOF_TEXT,
  ENERGY_SYMMETRY,
  LADDER,
  RESEARCHED,
  RUN_ID,
  SWEEPS,
  SWEEP_OF,
  cmp,
  labelOf,
  responsesOf,
  sweepLabel,
} from '../../data/energy';
import StackTable, { DownloadButton, NODATA_STYLE, type Cell } from './StackTable';
import { SourceLines, claimLabel } from './Cards';
import { FOCUS, type Patch } from './hooks';

const sweepOrder = (slug: string) => {
  const i = SWEEPS.findIndex((s) => s.slug === slug);
  return i < 0 ? SWEEPS.length : i;
};

// ---------------------------------------------------------------------------
// Allegations beside their responses
// ---------------------------------------------------------------------------

export function contestedClaims(visible: GEdge[]): GEdge[] {
  return visible
    .filter((e) => e.pred !== 'contra' && (e.tier === 'alleged' || responsesOf(e).length > 0))
    .sort((a, b) => sweepOrder(SWEEP_OF(a.id ?? '')) - sweepOrder(SWEEP_OF(b.id ?? '')) || cmp(a.from ?? '9999', b.from ?? '9999') || cmp(a.id ?? '', b.id ?? ''));
}

export function contestedDenominator(visible: GEdge[]): string {
  const alleged = visible.filter((e) => e.tier === 'alleged');
  const answered = alleged.filter((e) => responsesOf(e).length > 0).length;
  const other = visible
    .filter((e) => e.tier === 'documented' || e.tier === 'reported')
    .reduce((n, e) => n + responsesOf(e).length, 0);
  return `${answered} of ${alleged.length} alleged claims carry a recorded response · ${other} responses to documented or reported claims`;
}

export function ContestedList({ claims, onOpen }: { claims: GEdge[]; onOpen: (id: string) => void }) {
  if (!claims.length) return <p className="text-[14px] text-text-secondary">No alleged or answered claim is visible under the filters in force.</p>;
  let last = '';
  return (
    <div className="space-y-4">
      {claims.map((e) => {
        const sweep = SWEEP_OF(e.id ?? '');
        const head = sweep !== last ? <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mt-6">{sweepLabel(sweep)}</p> : null;
        last = sweep;
        const resp = responsesOf(e);
        return (
          <div key={e.id}>
            {head}
            {/* One grid, no inner wrapper: the claim, the response and "open in graph" are
                siblings, so every part of the block belongs to the block and nothing else. */}
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border border-border rounded-lg overflow-hidden [overflow-wrap:anywhere]">
              <div className="sm:col-span-2 px-4 py-2.5 border-b border-border bg-bg-elevated">
                <p className="text-[15px] text-text">{`${claimLabel(e)} · ${e.from ?? 'undated'} · ${TIERS[e.tier].label}`}</p>
              </div>
              <div className="p-4 max-sm:border-b sm:border-r border-border">
                <p className="font-mono text-[10.5px] text-accent tracking-wide mb-1.5">The claim — {labelOf(e.s)}</p>
                <p className="text-[14px] leading-relaxed text-text-secondary">{e.d ?? claimLabel(e)}</p>
                <SourceLines srcs={e.srcs} className="mt-2" />
              </div>
              <div className="p-4 border-l-2 border-l-rose">
                {resp.length ? (
                  resp.map((r, i) => (
                    <div key={(r.id ?? '') + i} className="mb-3">
                      <p className="font-mono text-[10.5px] text-rose tracking-wide mb-1.5">The response — {labelOf(r.s)}</p>
                      <p className="text-[14px] leading-relaxed text-text-secondary">{r.d}</p>
                      <p className="mt-1">
                        <TierChip tier={r.tier} />
                      </p>
                      <SourceLines srcs={r.srcs} className="mt-2" />
                    </div>
                  ))
                ) : (
                  <>
                    <p className="font-mono text-[10.5px] text-rose tracking-wide mb-1.5">No response recorded</p>
                    <p className="text-[14px] leading-relaxed text-text-secondary">
                      The build gate requires one for an alleged claim; its absence is listed in Gaps. The register does not record whether {labelOf(e.s)} or{' '}
                      {labelOf(e.t)} was asked.
                    </p>
                  </>
                )}
              </div>
              <div className="sm:col-span-2 px-4 py-2.5 border-t border-border bg-bg-elevated flex flex-wrap gap-3 items-center justify-between">
                <p className="text-[13px] text-text-muted leading-relaxed">
                  Would settle it: {e.upgradeIf ?? 'no upgrade condition recorded'} / {e.killIf ?? 'no kill condition recorded'}
                </p>
                <button type="button" onClick={() => onOpen(e.id ?? '')} className={`btn-ghost !px-2 !py-0.5 !text-[12px] ${FOCUS}`}>
                  open in graph
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Narratives on the six-step ladder
// ---------------------------------------------------------------------------

export function narrativeDenominator(ns: Narrative[]): string {
  const c = (s: NarrativeStatus) => ns.filter((n) => n.status === s).length;
  return `${ns.length} narratives · ${LADDER.map((s) => `${s} ${c(s)}`).join(' · ')}`;
}

export function Narratives({ all, active, patch }: { all: Narrative[]; active: Set<NarrativeStatus>; patch: Patch }) {
  const shown = all
    .filter((n) => !active.size || active.has(n.status))
    .sort((a, b) => LADDER.indexOf(a.status) - LADDER.indexOf(b.status) || sweepOrder(a.domain) - sweepOrder(b.domain) || cmp(a.claim, b.claim));
  const toggle = (s: NarrativeStatus) => {
    const next = new Set(active);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    const on = LADDER.filter((x) => next.has(x));
    patch({ nar: on.length && on.length < LADDER.length ? on.join(',') : null });
  };
  const csv = {
    filename: `energy-narratives-${RUN_ID}.csv`,
    comments: [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, `${shown.length} narratives shown`, 'Status is the research sweep\'s calibration, not the verdict of any court, regulator or auditor.'],
    columns: ['narrative', 'status', 'sweep', 'strongest case', 'strongest counter', 'what would change this', 'sources'],
    rows: () => shown.map((n) => [n.claim, n.status, sweepLabel(n.domain), n.strongestCase ?? '', n.strongestCounter ?? '', n.whatWouldChangeThis ?? '', n.srcs.map(([l, u]) => `${l} <${u}>`).join(' | ')]),
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {LADDER.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={active.has(s)}
            onClick={() => toggle(s)}
            className={`font-mono text-[11px] px-2 py-0.5 rounded border ${active.has(s) ? 'border-accent text-text' : 'border-border-light text-text-secondary'} ${FOCUS}`}
          >
            {s} {all.filter((n) => n.status === s).length}
          </button>
        ))}
        <span className="font-mono text-[10.5px] text-amber" data-effect="">
          {all.length} → {shown.length} narratives
        </span>
      </div>
      <div className="mt-2">
        <DownloadButton d={csv} />
      </div>
      {shown.length === 0 && <p className="text-[14px] text-text-secondary mt-3">None recorded for this selection.</p>}
      <div className="space-y-5 mt-4">
        {shown.map((n, i) => (
          <div key={i} className="border border-border rounded-lg p-4 [overflow-wrap:anywhere]">
            <p className="text-[16px] text-text leading-snug">{n.claim}</p>
            <p className="font-mono text-[10.5px] text-text-muted mt-1">{sweepLabel(n.domain)}</p>
            <div className="flex items-center gap-2 mt-2" aria-hidden="true">
              <span className="font-mono text-[10px] text-text-muted">established</span>
              {LADDER.map((s) => (
                <span key={s} className={`inline-block w-5 h-2.5 border border-text-secondary ${s === n.status ? 'bg-text-secondary' : ''}`} />
              ))}
              <span className="font-mono text-[10px] text-text-muted">debunked</span>
            </div>
            <p className="font-mono text-[11px] text-text-secondary mt-1">status: {n.status}</p>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 mt-3">
              <div>
                <p className="font-mono text-[10.5px] text-accent mb-1">Strongest case</p>
                <p className="text-[14px] text-text-secondary">{n.strongestCase ?? 'not recorded'}</p>
              </div>
              <div>
                <p className="font-mono text-[10.5px] text-accent mb-1">Strongest counter</p>
                <p className="text-[14px] text-text-secondary">{n.strongestCounter ?? 'not recorded'}</p>
              </div>
            </div>
            <p className="text-[15px] text-text mt-3">What would change this: {n.whatWouldChangeThis ?? 'not recorded'}</p>
            <SourceLines srcs={n.srcs} className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Base rates and the symmetry control
// ---------------------------------------------------------------------------

export function baseRateDenominator(rows: BaseRateRow[]): string {
  const sweeps = new Set(rows.map((r) => r.domain));
  const k = [...RESEARCHED].filter((s) => ENERGY_SYMMETRY.some((x) => x.domain === s && x.text.trim())).length;
  return `${rows.length} base rates across ${sweeps.size} sweeps · symmetry check recorded for ${k} of ${RESEARCHED.size} sweeps`;
}

export function BaseRateTable({ rows, cannotShow }: { rows: BaseRateRow[]; cannotShow: string }) {
  const sorted = [...rows].sort((a, b) => sweepOrder(a.domain) - sweepOrder(b.domain) || cmp(a.property, b.property));
  // A base rate counts comparable entities. A denominator that is not a whole
  // number (a ₹ total, a capacity) makes the row a share of an amount, which is a
  // different kind of figure; it is printed as recorded but not drawn as a rate.
  const whole = (x: number | null) => x != null && Number.isInteger(x);
  const valid = (r: BaseRateRow) => whole(r.numerator) && whole(r.denominator) && r.denominator! > 0;
  const cells: Cell[][] = sorted.map((r) => {
    const ok = valid(r);
    const rate = ok ? r.numerator! / r.denominator! : null;
    return [
      r.property,
      ok ? (
        <span className="font-mono">{`${r.numerator} of ${r.denominator}`}</span>
      ) : (
        <span className="font-mono text-amber">
          not a rate (denominator {r.denominator == null ? 'not recorded' : r.denominator === 0 ? '0' : `${r.denominator} is not a count`}
          {r.numerator == null ? '; numerator not recorded' : whole(r.numerator) ? '' : `; ${r.numerator} of ${r.denominator} as recorded`})
        </span>
      ),
      rate != null ? <span className="font-mono">{Math.round(rate * 100)}%</span> : '—',
      // One shared 0–100% scale: 96px is 100%, so bars compare across rows and sweeps.
      rate != null ? (
        <span className="inline-block h-2 bg-text-secondary/60 align-middle" style={{ width: `${Math.round(Math.min(1, rate) * 96)}px` }} aria-hidden="true" />
      ) : (
        '—'
      ),
      r.label ?? 'definition not recorded',
      sweepLabel(r.domain),
      r.srcs.length ? <SourceLines srcs={r.srcs} /> : 'no source recorded',
    ];
  });
  return (
    <StackTable
      columns={['property', 'numerator of denominator', 'rate', 'on one 0–100% scale', 'what the denominator is', 'sweep', 'sources']}
      rows={cells}
      caption={`${rows.length} rows · base rates recorded by the sweeps in scope`}
      minWidth="56rem"
      download={{
        filename: `energy-base-rates-${RUN_ID}.csv`,
        comments: [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, `${rows.length} base rates in scope`, `What this cannot show: ${cannotShow}`],
        columns: ['property', 'numerator', 'denominator', 'what the denominator is', 'sweep', 'sources'],
        rows: () => sorted.map((r) => [r.property, r.numerator == null ? '' : String(r.numerator), r.denominator == null ? '' : String(r.denominator), r.label ?? '', sweepLabel(r.domain), r.srcs.map(([l, u]) => `${l} <${u}>`).join(' | ')]),
      }}
    />
  );
}

export function SymmetryPanel({ dom }: { dom: Set<string> }) {
  const sweeps = SWEEPS.filter((s) => !dom.size || dom.has(s.slug));
  return (
    <div>
      {sweeps.map((s) => {
        if (!RESEARCHED.has(s.slug))
          return (
            <div key={s.slug} data-nodata="" style={NODATA_STYLE} className="border border-border rounded-lg p-4 my-4 text-[14px] text-text-muted">
              Not yet researched — {s.label}
            </div>
          );
        const texts = ENERGY_SYMMETRY.filter((x) => x.domain === s.slug && x.text.trim());
        if (!texts.length)
          return (
            <Callout key={s.slug} label={`No symmetry check — ${s.label}`} tone="warn">
              <p>The contract makes this mandatory. Its absence is a defect in that sweep, and its claims should be read with that in mind.</p>
            </Callout>
          );
        return (
          <Callout key={s.slug} label={`Symmetry check — ${s.label}`} tone="note">
            {texts.map((t, i) => (
              <p key={i}>{t.text}</p>
            ))}
            <p className="text-[13px] text-text-muted">Written by the {s.label} sweep about its own work; not independently re-run.</p>
          </Callout>
        );
      })}
    </div>
  );
}
