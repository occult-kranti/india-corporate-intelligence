import { useId, useLayoutEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TierChip } from '../Editorial';
import { PRED_LABEL } from '../viz/ForceGraph';
import { TIER_ORDER, type GEdge, type GNode, type Tier } from '../../graph/schema';
import type { Void } from '../../graph/fleet';
import {
  ASOF,
  BENEFIT_OF,
  DRAWABLE,
  EDGE_BY_ID,
  ENERGY_BASE_RATES,
  ENERGY_IDENTITY,
  ENERGY_META,
  NODES,
  RUN_ID,
  SUPERSEDED,
  SWEEP_OF,
  cmp,
  companyOf,
  dateTestOf,
  fileAsOf,
  isConglomerate,
  isInstitution,
  labelOf,
  membershipWords,
  responsesOf,
  rolesInto,
  sweepLabel,
  sweepsOf,
  viaGroupOf,
  voidsIn,
  voidsNaming,
} from '../../data/energy';
import {
  Btn,
  SourceLines,
  amountText,
  benefitAmount,
  claimLabel,
  dateText,
  openClaimName,
  touchOf,
  TierCounts,
  tyWord,
} from './Cards';
import { FOCUS, MARGIN_HEADING_ID, focusMarginHeading, marginFocus } from './hooks';

export type PathResult =
  | { status: 'hidden'; missing: string[] }
  | { status: 'none' }
  | { status: 'found'; seq: string[]; hops: number; count: number; steps: GEdge[][]; median: { hops: number; seeds: number } | null };

export type AsideState =
  | { kind: 'rest' }
  | { kind: 'node'; id: string }
  | { kind: 'company'; id: string }
  | { kind: 'nodata'; name: string; keys: string[] }
  | { kind: 'claim'; edge: GEdge }
  | { kind: 'path'; a: string; b: string; result: PathResult };

export interface AsideActions {
  openClaim: (id: string) => void;
  selectNode: (id: string) => void;
  focusNode: (id: string, hops: number) => void;
  pathTo: (a: string, b: string) => void;
  setVia: (on: boolean) => void;
  clearFilters: () => void;
  goToOffices: () => void;
}

export const VOIDS_CAPTION_1 = 'Voids have no line in the graph because an absence has no endpoints.';

const H3 = 'font-mono text-[11px] tracking-[0.06em] text-text-muted mt-5 mb-1.5';

export default function EnergyAside({
  state,
  act,
  sel,
  focusHops,
  via,
  q,
  visible,
  voids,
  domLabel,
  pathCandidates,
  restExtra,
  showReadingKey,
  showVoids,
  sheet,
}: {
  state: AsideState;
  act: AsideActions;
  sel: string | null;
  focusHops: number | null;
  via: boolean;
  q: string;
  visible: GEdge[];
  voids: Void[];
  domLabel: string;
  pathCandidates: GNode[];
  restExtra?: ReactNode;
  showReadingKey: boolean;
  showVoids: boolean;
  sheet: { on: boolean; expanded: boolean; toggle: () => void; close: () => void } | null;
}) {
  const heading =
    state.kind === 'rest'
      ? 'Margin'
      : state.kind === 'claim'
        ? claimLabel(state.edge)
        : state.kind === 'path'
          ? `Path: ${labelOf(state.a)} to ${labelOf(state.b)}`
          : state.kind === 'nodata'
            ? state.name
            : labelOf(state.id);

  // Focus follows an answer written from outside the canvas (spec §3.4); the flag is
  // consumed here, after the new heading has rendered.
  useLayoutEffect(() => {
    if (!marginFocus.pending) return;
    marginFocus.pending = false;
    focusMarginHeading();
  }, [heading, state.kind]);

  const H = (
    <h2 id={MARGIN_HEADING_ID} tabIndex={-1} className={`heading-editorial font-bold text-xl text-text mb-2 ${FOCUS}`}>
      {heading}
    </h2>
  );

  let body: ReactNode;
  switch (state.kind) {
    case 'claim':
      body = <ClaimCard e={state.edge} act={act} heading={H} />;
      break;
    case 'path':
      body = (
        <>
          {H}
          <PathCard a={state.a} b={state.b} r={state.result} act={act} />
        </>
      );
      break;
    case 'company':
      body = (
        <>
          {H}
          <CompanyTrail id={state.id} act={act} via={via} />
        </>
      );
      break;
    case 'node':
      body = (
        <>
          {H}
          <NodeCard id={state.id} act={act} visible={visible} candidates={pathCandidates} focusHops={focusHops} />
        </>
      );
      break;
    case 'nodata':
      body = (
        <>
          {H}
          <p className="text-[15px] text-text-secondary">
            {state.name} is a {state.keys.join(' / ')} constituent the platform has no company record for, so nothing can be joined to it.
            Listed in Gaps.
          </p>
        </>
      );
      break;
    default:
      body = (
        <>
          {H}
          {q && <MatchingClaims q={q} visible={visible} act={act} />}
          {showReadingKey && <ReadingKey />}
          {restExtra}
          {showVoids && <VoidList voids={voids} domLabel={domLabel} />}
        </>
      );
  }

  const alsoSelected =
    sel && state.kind === 'claim' && NODES.has(sel) ? (
      <div className="mt-6 border-t border-border pt-3">
        <p className="font-mono text-[11px] text-text-muted">also selected: {labelOf(sel)}</p>
        <NodeActions id={sel} act={act} candidates={pathCandidates} focusHops={focusHops} />
      </div>
    ) : null;

  const sheetCls = sheet?.on
    ? `fixed inset-x-0 bottom-0 z-40 bg-bg-elevated border-t border-border-light px-4 pb-4 overflow-y-auto ${sheet.expanded ? 'max-h-[80vh]' : 'max-h-[40vh]'}`
    : '';

  return (
    <aside aria-labelledby={MARGIN_HEADING_ID} className={`[overflow-wrap:anywhere] text-[14px] ${sheetCls}`}>
      {sheet?.on && (
        <div className="sticky top-0 bg-bg-elevated flex justify-between items-center py-2 -mx-4 px-4 border-b border-border mb-2">
          <button type="button" aria-expanded={sheet.expanded} onClick={sheet.toggle} className={`font-mono text-[11px] text-text-muted ${FOCUS}`}>
            {sheet.expanded ? 'collapse' : 'expand'}
          </button>
          <button type="button" onClick={sheet.close} className={`font-mono text-[11px] text-text-muted ${FOCUS}`}>
            close
          </button>
        </div>
      )}
      {body}
      {alsoSelected}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Rest state
// ---------------------------------------------------------------------------

export function ReadingKey() {
  return (
    <div className="text-[13px] text-text-secondary space-y-1.5 mb-5 leading-snug">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">How to read this graph</p>
      <p>Each line is one claim with a source, or an allegation or analysis marked as such.</p>
      <p>Line style is the evidence tier. Rose is a response from the party concerned.</p>
      <p>Colour is the kind of actor. Shape is the type of entity. Size was declared by a researcher, not computed.</p>
      <p>Public power is pulled to the left and private capital to the right. Beyond that, position means nothing.</p>
      <p>An edge between two entities is not an accusation. A beneficiary is not an allegation.</p>
    </div>
  );
}

export function VoidList({ voids, domLabel }: { voids: Void[]; domLabel: string }) {
  const bySweep = useMemo(() => {
    const m = new Map<string, Void[]>();
    for (const v of voids) (m.get(v.domain) ?? m.set(v.domain, []).get(v.domain)!).push(v);
    return [...m.entries()];
  }, [voids]);
  return (
    <div id="energy-voids" className="mt-2">
      <h3 className="heading-editorial font-bold text-lg text-text">What the record does not show</h3>
      <p className="font-mono text-[11px] text-text-muted mb-3">{voids.length} documented voids — absences that were looked for</p>
      {voids.length === 0 ? (
        <p className="text-[15px] text-text">
          No void was recorded for {domLabel}. That means none was written down, not that none exists.
        </p>
      ) : (
        <ul className="space-y-3">
          {bySweep.map(([sweep, vs]) =>
            vs.map((v, i) => (
              <li key={sweep + i} className="border-l-2 border-border-light pl-3">
                {i === 0 && <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">{sweepLabel(sweep)}</p>}
                <p className="text-[15px] text-text leading-snug">{v.what}</p>
                {v.whyItMatters && <p className="text-[14px] text-text-secondary mt-1 leading-snug">{v.whyItMatters}</p>}
                <SourceLines srcs={v.srcs} className="mt-1" />
              </li>
            )),
          )}
        </ul>
      )}
      <p className="text-[13px] text-text-muted mt-4 leading-snug">
        <span>{VOIDS_CAPTION_1}</span> They are listed here, beside it, because a graph that can only draw what exists overstates the
        case.
      </p>
    </div>
  );
}

function matches(e: GEdge, q: string): boolean {
  const b = BENEFIT_OF(e.id ?? '');
  const hay = [e.lab, e.d, ...(e.srcs ?? []).map((s) => s[0]), b?.who, b?.how, labelOf(e.s), labelOf(e.t)]
    .map((x) => (x ?? '').toLowerCase())
    .join('\n');
  return hay.includes(q);
}

function MatchingClaims({ q, visible, act }: { q: string; visible: GEdge[]; act: AsideActions }) {
  const s = q.trim().toLowerCase();
  const drawnAll = DRAWABLE.filter((e) => matches(e, s));
  const vis = new Set(visible);
  const shown = drawnAll.filter((e) => vis.has(e)).sort((a, b) => cmp(a.from ?? '9999', b.from ?? '9999') || cmp(claimLabel(a), claimLabel(b)));
  const sup = SUPERSEDED.filter((e) => matches(e, s));
  const held = (h: { lab: string | null; d: string | null; s: string; t: string; srcs: [string, string][] }) =>
    [h.lab, h.d, labelOf(h.s), labelOf(h.t), ...h.srcs.map((x) => x[0])].some((x) => (x ?? '').toLowerCase().includes(s));
  const killed = ENERGY_META.killed.filter(held);
  const excluded = ENERGY_META.excluded.filter(held);
  const hidden = drawnAll.length - shown.length;
  const none = !drawnAll.length && !sup.length && !killed.length && !excluded.length;
  return (
    <div className="mb-6">
      <h3 className="heading-editorial font-bold text-lg text-text">Matching claims</h3>
      <p className="font-mono text-[11px] text-text-muted">
        {drawnAll.length} drawn claims match "{q}" · {sup.length} superseded · {killed.length} killed in audit · {excluded.length} held out
      </p>
      {hidden > 0 && (
        <p className="font-mono text-[11px] text-amber mt-1">
          {hidden} further matches are hidden by the filters in force ·{' '}
          <Btn onClick={act.clearFilters}>clear filters</Btn>
        </p>
      )}
      {none ? (
        <p className="text-[14px] text-text-secondary mt-2">
          No claim, superseded record or killed record matches "{q}". Search reads claim text and source titles, not the sources themselves.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {shown.map((e) => (
            <li key={e.id} className="text-[13px]">
              <TierChip tier={e.tier} /> <span className="font-mono text-[11px] text-text-muted">{e.from ?? 'undated'}</span>{' '}
              <Btn onClick={() => act.openClaim(e.id ?? '')} label={openClaimName(e)}>
                {claimLabel(e)}
              </Btn>{' '}
              <span className="text-text-muted">
                {amountText(e.a) ?? ''} · {labelOf(e.s)} → {labelOf(e.t)} · {responsesOf(e).length} responses
              </span>
            </li>
          ))}
          {sup.map((e) => (
            <li key={e.id} className="text-[13px] text-text-muted">
              <TierChip tier={e.tier} />{' '}
              <Btn onClick={() => act.openClaim(e.id ?? '')} label={openClaimName(e)}>
                {claimLabel(e)}
              </Btn>{' '}
              — superseded by {e.supersededBy}
            </li>
          ))}
          {killed.map((k) => (
            <li key={k.id} className="text-[13px] text-text-muted">
              {k.lab ?? k.id} — killed in audit: {k.killedReason} (listed under What is missing)
            </li>
          ))}
          {excluded.map((k) => (
            <li key={k.id} className="text-[13px] text-text-muted">
              {k.lab ?? k.id} — held out: {k.excludedReason} (listed under What is missing)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node card, company trail
// ---------------------------------------------------------------------------

/** The "path to…" combobox: the touch and keyboard equivalent of shift-click. */
function PathTo({ from, candidates, onPick }: { from: string; candidates: GNode[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [act, setAct] = useState(-1);
  const uid = useId().replace(/:/g, '');
  const list = `energy-path-${uid}`;
  const opts = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return candidates.filter((n) => n.id !== from && n.label.toLowerCase().includes(s)).slice(0, 40);
  }, [q, candidates, from]);
  const open = opts.length > 0;
  const onKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setAct((a) => Math.min(opts.length - 1, a + 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setAct((a) => Math.max(0, a - 1));
    } else if (ev.key === 'Enter') {
      const n = opts[act >= 0 ? act : 0];
      if (n) {
        ev.preventDefault();
        onPick(n.id);
      }
    }
  };
  return (
    <div className="relative mt-2">
      <label htmlFor={`${list}-in`} className="font-mono text-[10.5px] text-text-muted">
        path to…
      </label>
      <input
        id={`${list}-in`}
        role="combobox"
        aria-expanded={open}
        aria-controls={list}
        aria-autocomplete="list"
        aria-activedescendant={open && act >= 0 ? `${list}-${act}` : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAct(-1);
        }}
        onKeyDown={onKey}
        placeholder="type an entity"
        className={`input-field !py-1 !text-[12.5px] ${FOCUS}`}
      />
      <ul id={list} role="listbox" aria-label="Entities" hidden={!open} className="mt-1 max-h-48 overflow-y-auto border border-border rounded bg-bg">
        {opts.map((n, i) => (
          <li
            key={n.id}
            id={`${list}-${i}`}
            role="option"
            aria-selected={i === act}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(n.id);
            }}
            className={`px-2 py-1 text-[12.5px] cursor-pointer ${i === act ? 'bg-accent/15 text-text' : 'text-text-secondary'}`}
          >
            {n.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NodeActions({ id, act, candidates, focusHops }: { id: string; act: AsideActions; candidates: GNode[]; focusHops: number | null }) {
  return (
    <div className="mt-2">
      <p className="font-mono text-[11px] text-text-muted flex flex-wrap gap-2 items-center">
        focus
        {[1, 2, 3].map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={focusHops === h}
            onClick={() => act.focusNode(id, h)}
            className={`px-1.5 rounded border ${focusHops === h ? 'border-accent text-accent' : 'border-border-light'} ${FOCUS}`}
          >
            {h} {h === 1 ? 'hop' : 'hops'}
          </button>
        ))}
      </p>
      <PathTo from={id} candidates={candidates} onPick={(b) => act.pathTo(id, b)} />
    </div>
  );
}

/** Voids as a plain list — the rest-state VoidList's rows without its id or caption. */
function VoidItems({ voids }: { voids: Void[] }) {
  return (
    <ul className="space-y-3">
      {voids.map((v, i) => (
        <li key={v.domain + i} className="border-l-2 border-border-light pl-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">{sweepLabel(v.domain)}</p>
          <p className="text-[14px] text-text leading-snug">{v.what}</p>
          {v.whyItMatters && <p className="text-[13.5px] text-text-secondary mt-1 leading-snug">{v.whyItMatters}</p>}
          <SourceLines srcs={v.srcs} className="mt-1" />
        </li>
      ))}
    </ul>
  );
}

function ClaimRow({ e, other, act }: { e: GEdge; other?: string; act: AsideActions }) {
  const n = responsesOf(e).length;
  return (
    <li className="text-[13px] leading-snug">
      <TierChip tier={e.tier} /> <span className="font-mono text-[11px] text-text-muted">{e.from ?? 'undated'}</span>{' '}
      {other && <span className="text-text-secondary">{labelOf(other)} · </span>}
      <Btn onClick={() => act.openClaim(e.id ?? '')} label={openClaimName(e)}>
        {claimLabel(e)}
      </Btn>
      <span className="text-text-muted"> · {amountText(e.a) ?? 'no amount recorded'}</span>
      {n > 0 ? <span className="text-rose"> · {n === 1 ? '1 response' : `${n} responses`}</span> : <span className="text-text-muted"> · 0 responses</span>}
    </li>
  );
}

const identityLines = (id: string) => {
  const rec = (ENERGY_IDENTITY as Record<string, { identity: Record<string, string | null> | null; publicRole: string | null }>)[id];
  if (!rec) return { lines: [] as [string, string][], role: null as string | null };
  // DOB is never shown: identity keys appear only when they are an office, a CIN, a DIN or an NSE code.
  const keep = ['office', 'cin', 'din', 'nse'];
  const lines = Object.entries(rec.identity ?? {}).filter((kv): kv is [string, string] => keep.includes(kv[0]) && !!kv[1]);
  return { lines, role: rec.publicRole };
};

function NodeCard({ id, act, visible, candidates, focusHops }: { id: string; act: AsideActions; visible: GEdge[]; candidates: GNode[]; focusHops: number | null }) {
  const n = NODES.get(id)!;
  const { lines, role } = identityLines(id);
  const touching = DRAWABLE.filter((e) => e.s === id || e.t === id);
  const vis = new Set(visible);
  const order = Object.keys(PRED_LABEL);
  const byPred = [...new Set(touching.map((e) => e.pred))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const roles = isInstitution(id) ? rolesInto(id) : [];
  const t = touchOf(id);
  const nodeSweeps = sweepsOf(id);
  const nodeVoids = nodeSweeps.length ? voidsIn(new Set(nodeSweeps)) : [];
  return (
    <div className="space-y-2">
      {n.sub && <p className="text-text-secondary">{n.sub}</p>}
      <p className="font-mono text-[11px] text-text-muted">{tyWord(n.ty)} · {membershipWords(id)}</p>
      {lines.length > 0 && (
        <ul className="font-mono text-[11.5px] text-text-secondary">
          {lines.map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      )}
      {role && <p className="text-text-secondary">{role}</p>}
      {n.resolved === false && (
        <p className="text-amber text-[13px]">Identity not confirmed. {n.collisionRisk ?? ''} This entity takes no edges.</p>
      )}
      {(n.d ?? []).length > 0 && (
        <ul className="space-y-1">
          {(n.d ?? []).map((f, i) => {
            const m = f.match(/\[(documented|reported|alleged|analytic)[^\]]*\]\s*$/);
            return (
              <li key={i} className="text-[13.5px] text-text-secondary">
                {m ? f.slice(0, m.index).trim() : f} {m && <TierChip tier={m[1] as Tier} />}
              </li>
            );
          })}
        </ul>
      )}
      <SourceLines srcs={n.srcs} />
      <NodeActions id={id} act={act} candidates={candidates} focusHops={focusHops} />
      <h3 className={H3}>
        Claims touching it — {touching.length} ({vis.size ? touching.filter((e) => vis.has(e)).length : 0} in view)
      </h3>
      <p className="text-[12px]">
        <TierCounts tiers={t.tiers} />
      </p>
      {byPred.map((p) => (
        <div key={p}>
          <p className="font-mono text-[10.5px] text-text-muted mt-2">{PRED_LABEL[p] ?? p}</p>
          <ul className="space-y-1">
            {touching
              .filter((e) => e.pred === p)
              .map((e) => (
                <ClaimRow key={e.id} e={e} other={e.s === id ? e.t : e.s} act={act} />
              ))}
          </ul>
        </div>
      ))}
      {roles.length > 0 && (
        <>
          <h3 className={H3}>Who held this office</h3>
          <ul className="space-y-1">
            {roles.map((r) => (
              <li key={r.id} className="text-[13px]">
                <Btn onClick={() => act.selectNode(r.s)}>{labelOf(r.s)}</Btn>{' '}
                <span className="font-mono text-[11px] text-text-muted">
                  {r.from ?? 'undated'}–{r.to ?? `in office as of ${ASOF.oldest ?? '—'}`}
                </span>{' '}
                <TierChip tier={r.tier} />
              </li>
            ))}
          </ul>
          <Btn onClick={act.goToOffices} className="text-[12px] mt-1">
            see the lanes →
          </Btn>
        </>
      )}
      {/* Absences at the same size as the claims above them (evidence-tiering: the
          absence rule). Scoped to the sweeps this entity's claims came from. */}
      <h3 className={H3}>
        What the record does not show — voids recorded by {nodeSweeps.length ? nodeSweeps.map(sweepLabel).join(', ') : 'no sweep'}: {nodeVoids.length}
      </h3>
      {nodeVoids.length ? (
        <VoidItems voids={nodeVoids} />
      ) : (
        <p className="text-[13.5px] text-text-secondary">
          {nodeSweeps.length
            ? 'No void was recorded by these sweeps. That means none was written down, not that none exists.'
            : 'No claim places this entity in a research sweep, so no sweep’s voids apply.'}
        </p>
      )}
      <LinksOut id={id} />
    </div>
  );
}

function LinksOut({ id }: { id: string }) {
  const links: ReactNode[] = [];
  if (companyOf(id)) links.push(<Link key="co" to={`/company/${id.replace(/^co:/, '')}`}>company profile</Link>);
  const g = id.replace(/^grp:/, '');
  if (isConglomerate(g)) links.push(<Link key="grp" to={`/conglomerates/${g}`}>group deep-dive</Link>);
  if (DRAWABLE.some((e) => (e.s === id || e.t === id) && e.pred === 'award'))
    links.push(<Link key="res" to={`/resources?q=${encodeURIComponent(labelOf(id))}`}>located blocks on /resources</Link>);
  if (DRAWABLE.some((e) => (e.pred === 'pmin' || e.pred === 'pmout') && (e.s === id || e.t === id)))
    links.push(<Link key="pm" to="/pmcares">PM CARES</Link>);
  if (!links.length) return null;
  return (
    <p className="font-mono text-[11px] text-text-muted mt-4 space-x-3 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-accent">
      {links}
    </p>
  );
}

const DECISION = new Set(['award', 'law', 'enforce', 'pmout', 'role']);
const MONEY = new Set(['bond', 'trust', 'direct', 'csr', 'pmin']);

function CompanyTrail({ id, act, via }: { id: string; act: AsideActions; via: boolean }) {
  const n = NODES.get(id);
  const co = companyOf(id);
  const groups = viaGroupOf(id);
  const parties = new Set([id, ...(via ? groups.map((g) => g.group) : [])]);
  const touching = DRAWABLE.filter((e) => parties.has(e.s) || parties.has(e.t));
  const viaTag = (e: GEdge) => (parties.has(e.s) && e.s !== id && e.t !== id ? `via ${labelOf(e.s)} · ` : parties.has(e.t) && e.t !== id && e.s !== id ? `via ${labelOf(e.t)} · ` : '');
  const decisions = touching.filter((e) => {
    const other = parties.has(e.s) ? e.t : e.s;
    const fam = NODES.get(other)?.fam;
    return DECISION.has(e.pred) && (fam === 'state' || fam === 'enforce');
  });
  const byInst = new Map<string, GEdge[]>();
  for (const e of decisions) {
    const inst = parties.has(e.s) ? e.t : e.s;
    (byInst.get(inst) ?? byInst.set(inst, []).get(inst)!).push(e);
  }
  const insts = [...byInst.keys()].sort((a, b) => cmp(labelOf(a), labelOf(b)) || cmp(a, b));
  const money = touching
    .filter((e) => parties.has(e.s) && MONEY.has(e.pred))
    .sort((a, b) => cmp(a.from ?? '9999', b.from ?? '9999') || cmp(a.id ?? '', b.id ?? ''));
  const alleged = touching.filter((e) => e.tier === 'alleged');
  // Claims in neither list A nor B (a sector, an ownership, a role…). Listed, so the
  // trail can never say "nothing touches it" while the register holds claims that do.
  const listed = new Set([...decisions, ...money]);
  // Alleged claims are left out here only because the Allegations list above already has them.
  const otherClaims = touching.filter((e) => !listed.has(e) && e.tier !== 'alleged');
  const named = voidsNaming(id);
  const label = n?.label ?? co?.name ?? id;
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] text-text-muted">
        {co ? `NSE ${co.nse ?? '—'} · BSE ${co.bse ?? '—'} · ${co.sector} · ` : n ? `${tyWord(n.ty)} · ` : ''}
        {membershipWords(id)}
      </p>
      {groups.map((g) => (
        <p key={g.claimId} className="text-[13px] text-text-secondary">
          Held by {labelOf(g.group)} — claim {g.claimId}, <TierChip tier={g.tier} />
        </p>
      ))}
      {groups.length > 0 && (
        <label className="flex items-center gap-2 text-[13px] text-text-secondary">
          <input type="checkbox" checked={via} onChange={(e) => act.setVia(e.target.checked)} className={FOCUS} />
          include the group's claims
        </label>
      )}
      <div>
        <h3 className={H3}>Public decisions touching it</h3>
        {insts.length === 0 ? (
          <p className="text-[13px] text-text-muted">No public decision in this register touches it.</p>
        ) : (
          insts.map((inst) => (
            <div key={inst} className="mb-2">
              <p className="text-[13px] text-text">{labelOf(inst)}</p>
              <ul className="space-y-1">
                {byInst
                  .get(inst)!
                  .sort((a, b) => cmp(a.from ?? '9999', b.from ?? '9999') || cmp(a.id ?? '', b.id ?? ''))
                  .map((e) => (
                    <li key={e.id} className="text-[13px] leading-snug">
                      <span className="font-mono text-[11px] text-text-muted">{e.from ?? 'undated'} · {PRED_LABEL[e.pred] ?? e.pred}</span>{' '}
                      {viaTag(e)}
                      <Btn onClick={() => act.openClaim(e.id ?? '')} label={openClaimName(e)}>
                        {claimLabel(e)}
                      </Btn>{' '}
                      <TierChip tier={e.tier} /> <span className="text-text-muted">{amountText(e.a) ?? 'no amount recorded'}</span>
                      <span className={responsesOf(e).length ? 'text-rose' : 'text-text-muted'}> · {responsesOf(e).length} responses</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <p className="text-[13px] text-text-secondary border-l-2 border-amber/50 pl-3">
        These two lists are kept apart on purpose. Putting a company's payments and the decisions that touched it on one timeline invites a
        reading — that one bought the other — which this register cannot test. Testing it needs every award set against every donor with a
        date-shuffled control, and that has not been run (see Gaps). Decisions are listed where the company or its group is a party to the
        claim; sharing a state or a sector is never a connection.
      </p>
      <div>
        <h3 className={H3}>Money it sent</h3>
        {money.length === 0 ? (
          <p className="text-[13px] text-text-muted">No payment from it is recorded in this register.</p>
        ) : (
          <ul className="space-y-1">
            {money.map((e) => (
              <li key={e.id} className="text-[13px] leading-snug">
                <span className="font-mono text-[11px] text-text-muted">{e.from ?? 'undated'}</span> {viaTag(e)}
                {labelOf(e.t)} · {PRED_LABEL[e.pred] ?? e.pred} · {amountText(e.a) ?? 'no amount recorded'} <TierChip tier={e.tier} />{' '}
                <Btn onClick={() => act.openClaim(e.id ?? '')} label={openClaimName(e)}>
                  open
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className={H3}>Allegations</h3>
        {alleged.length === 0 ? (
          <p className="text-[13px] text-text-muted">No alleged claim touches it.</p>
        ) : (
          <ul className="space-y-1">
            {alleged.map((e) => (
              <ClaimRow key={e.id} e={e} act={act} />
            ))}
          </ul>
        )}
      </div>
      {otherClaims.length > 0 && (
        <div>
          <h3 className={H3}>Other claims touching it — {otherClaims.length}</h3>
          <ul className="space-y-1">
            {otherClaims.map((e) => (
              <ClaimRow key={e.id} e={e} other={parties.has(e.s) ? e.t : e.s} act={act} />
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className={H3}>Voids that name it — {named.length}</h3>
        <p className="font-mono text-[10.5px] text-text-muted mb-1.5">
          a text match on its id, name and aliases in each void's text and sources — a place to read, not a link
        </p>
        {named.length ? <VoidItems voids={named} /> : <p className="text-[13px] text-text-muted">No void's text or sources in this register mention it.</p>}
      </div>
      {touching.length === 0 ? (
        <p className="text-[14px] text-text">
          No claim in this register touches {label}. This register researched energy and resources, so absence here is not clearance.
        </p>
      ) : (
        decisions.length === 0 &&
        money.length === 0 && (
          <p className="text-[14px] text-text">
            No public decision or payment in this register touches {label}; {touching.length} other{' '}
            {touching.length === 1 ? 'claim does' : 'claims do'}, listed above. This register researched energy and resources, so absence here is
            not clearance.
          </p>
        )
      )}
      <LinksOut id={id} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claim card
// ---------------------------------------------------------------------------

function ClaimCard({ e, act, heading }: { e: GEdge; act: AsideActions; heading: ReactNode }) {
  const id = e.id ?? '';
  const sweep = SWEEP_OF(id);
  const asOf = fileAsOf(sweep);
  const b = BENEFIT_OF(id);
  const resp = responsesOf(e);
  const supersedes = [...SUPERSEDED, ...DRAWABLE].filter((x) => x.supersededBy === id);
  const dt = dateTestOf(e);
  const holders = dt.holders;
  const rates = ENERGY_BASE_RATES.filter((r) => r.domain === sweep);
  const [copied, setCopied] = useState<string | null>(null);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const citeLines = [
    `claim ${id} · ${claimLabel(e)} · ${e.d ?? ''}`,
    e.a ? `₹${e.a} cr as recorded on the claim — its kind is stated in the claim text` : 'no amount recorded',
    e.from ? `dated ${dateText(e)}` : 'undated',
    `tier ${e.tier} · research file dated ${asOf ?? 'not recorded'} · run ${RUN_ID}`,
    ...(e.srcs ?? []).map(([l, u]) => `${l} — ${u}`),
    url,
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(citeLines.join('\n'));
      setCopied('copied');
    } catch {
      const el = document.getElementById('energy-cite-as');
      if (el) {
        const r = document.createRange();
        r.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(r);
      }
      setCopied('select and copy');
    }
  };
  const col = 'min-w-0 border-l-2 pl-3';
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] text-text-muted">
        {PRED_LABEL[e.pred] ?? e.pred} · <TierChip tier={e.tier} /> · {dateText(e)} · {sweepLabel(sweep)} · file {asOf ?? 'not dated'} ·{' '}
        {resp.length === 1 ? '1 response' : `${resp.length} responses`}
      </p>
      {heading}
      {e.supersededBy && <p className="text-amber text-[13px]">Superseded by {e.supersededBy}; retained and addressable, not drawn.</p>}
      <p className="text-[13px] text-text-secondary">
        From: <Btn onClick={() => act.selectNode(e.s)}>{labelOf(e.s)}</Btn> → To: <Btn onClick={() => act.selectNode(e.t)}>{labelOf(e.t)}</Btn>
      </p>
      {e.d && <p className="text-[15px] text-text leading-relaxed">{e.d}</p>}
      <SourceLines srcs={e.srcs} />
      <p className="text-[13px] text-text-secondary">
        {e.a ? `₹${e.a.toLocaleString('en-IN')} cr — the amount recorded on the claim; its kind is stated in the text above` : 'no amount recorded'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 mt-3">
        <div className={`${col} border-transparent`}>
          <h3 className="font-mono text-[11px] text-text-muted mb-1">Who gained</h3>
          {b ? (
            <>
              <p className="text-[15px] text-text">
                {NODES.has(b.who) ? <Btn onClick={() => act.selectNode(b.who)}>{labelOf(b.who)}</Btn> : <>{b.who} — not a node in this graph</>}
              </p>
              {b.how && <p className="text-[15px] text-text">{b.how}</p>}
              <p className="text-[15px] text-text">{benefitAmount(b)}</p>
              <p className="text-[13px] text-text-secondary">confidence: {b.confidence ?? 'not recorded'}</p>
            </>
          ) : (
            <p className="text-[15px] text-text">No beneficiary recorded for this claim.</p>
          )}
        </div>
        <div className={`${col} border-rose`}>
          <h3 className="font-mono text-[11px] text-text-muted mb-1">The response</h3>
          {resp.length ? (
            resp.map((r, i) => (
              <div key={(r.id ?? '') + i} className="mb-2">
                <p className="text-[15px] text-text">{labelOf(r.s)}</p>
                {r.d && <p className="text-[15px] text-text">{r.d}</p>}
                <p className="mt-1">
                  <TierChip tier={r.tier} /> <span className="font-mono text-[11px] text-text-muted">{r.from ?? 'undated response'}</span>
                </p>
                <SourceLines srcs={r.srcs} className="mt-1" />
              </div>
            ))
          ) : (
            <>
              <p className="text-[15px] text-text">
                No response recorded. The register does not record whether {labelOf(e.s)} or {labelOf(e.t)} was asked.
              </p>
              {e.tier === 'alleged' && <p className="text-[15px] text-amber">Under this platform's rules this claim should not have shipped.</p>}
            </>
          )}
        </div>
      </div>
      <h3 className={H3}>The date test</h3>
      <p className="text-[13.5px] text-text-secondary">
        {dt.rule && dt.subjects.length === 0 ? (
          // A rule's issuer is read only from a recorded edge into it (spec §5.5), never
          // from the rule's name — so with none, the test has no office to read.
          `Issuer not recorded: no public-power entity in this register has an edge into ${labelOf(dt.rule)}, so the date test cannot be run from this record.${e.from ? '' : ' The claim is also undated.'}`
        ) : !e.from ? (
          'Undated — the date test cannot be run.'
        ) : holders.length ? (
          holders.map((h) => (
            <span key={h.id} className="block">
              On {e.from}, {labelOf(h.t)} was held by {labelOf(h.s)} ({h.from}–{h.to ?? `in office as of ${ASOF.oldest ?? '—'}`}){' '}
              <TierChip tier={h.tier} />.{' '}
            </span>
          ))
        ) : (
          `No dated office claim covers ${e.from}${
            dt.rule ? ` at the recorded issuer${dt.subjects.length === 1 ? '' : 's'} of ${labelOf(dt.rule)} (${dt.subjects.map(labelOf).join(', ')})` : ''
          }. The date test cannot be run from this record.`
        )}{' '}
        {e.from && (
          <Btn onClick={act.goToOffices} className="text-[12px]">
            see the office-holders table
          </Btn>
        )}
      </p>
      {(['innocentReading', 'upgradeIf', 'killIf'] as const).map((k) =>
        e[k] ? (
          <p key={k} className="text-[13.5px] text-text-secondary">
            <span className="font-mono text-[11px] text-text-muted">{k === 'innocentReading' ? 'innocent reading' : k === 'upgradeIf' ? 'upgrade if' : 'kill if'}: </span>
            {e[k]}
          </p>
        ) : null,
      )}
      {supersedes.map((s) => (
        <p key={s.id} className="text-[13px]">
          Supersedes <Btn onClick={() => act.openClaim(s.id ?? '')}>{s.id}</Btn> (retained, not drawn)
        </p>
      ))}
      {e.supersededBy && EDGE_BY_ID.has(e.supersededBy) && (
        <p className="text-[13px]">
          Superseded by <Btn onClick={() => act.openClaim(e.supersededBy!)}>{e.supersededBy}</Btn>
        </p>
      )}
      {rates.length > 0 && (
        <>
          <h3 className={H3}>Base rates recorded by the {sweepLabel(sweep)} sweep — from the same research sweep, not matched to this claim</h3>
          <ul className="space-y-1">
            {rates.map((r, i) => (
              <li key={i} className="text-[13px] text-text-secondary">
                <span className="font-mono">
                  {r.numerator ?? '—'} of {r.denominator ?? '—'}
                </span>{' '}
                — {r.property}
                {r.label ? ` (${r.label})` : ''}
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className={H3}>Cite as</h3>
      <div id="energy-cite-as" className="font-mono text-[11.5px] text-text-secondary whitespace-pre-wrap border border-border rounded p-2 select-text">
        {citeLines.join('\n')}
      </div>
      <p className="flex gap-2 items-center">
        <button type="button" onClick={copy} className={`btn-ghost !px-2 !py-1 !text-[12px] ${FOCUS}`}>
          copy citation
        </button>
        {copied && (
          <span role="status" className="font-mono text-[11px] text-text-muted">
            {copied}
          </span>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Path card
// ---------------------------------------------------------------------------

function PathCard({ a, b, r, act }: { a: string; b: string; r: PathResult; act: AsideActions }) {
  if (r.status === 'hidden')
    return <p className="text-[14px] text-text-secondary">{r.missing.map(labelOf).join(' and ')} {r.missing.length > 1 ? 'are' : 'is'} outside the current filters.</p>;
  if (r.status === 'none') return <p className="text-[14px] text-text-secondary">No path exists between these two in the current view.</p>;
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {r.seq.slice(0, -1).map((id, i) => (
          <li key={id + i} className="text-[13px]">
            <Btn onClick={() => act.selectNode(id)}>{labelOf(id)}</Btn>
            <span className="block pl-3 text-text-muted">
              {r.steps[i].map((e) => (
                <span key={e.id} className="mr-2">
                  → <Btn onClick={() => act.openClaim(e.id ?? '')} label={openClaimName(e)}>{PRED_LABEL[e.pred] ?? e.pred}</Btn> <TierChip tier={e.tier} />
                </span>
              ))}
            </span>
          </li>
        ))}
        <li className="text-[13px]">
          <Btn onClick={() => act.selectNode(b)}>{labelOf(b)}</Btn>
        </li>
      </ol>
      <p className="font-mono text-[12px] text-text">
        {r.hops} hops · one of {r.count} equally short paths
      </p>
      {r.median && (
        <p className="font-mono text-[12px] text-text">
          median separation in this view: {r.median.hops} hops (from {r.median.seeds} evenly spaced entities)
        </p>
      )}
      {r.count > 1 && <p className="text-[13px] text-text-secondary">The chain shown was picked by edge order. Its particular intermediaries mean nothing.</p>}
      <p className="text-[13px] text-text-secondary">
        Direction is ignored: the path answers how far apart {labelOf(a)} and {labelOf(b)} sit in this view, not who acted on whom.
        {r.median ? ` A path this short is ${r.hops <= r.median.hops ? 'at or below' : 'above'} the median for this view.` : ''} The
        distribution is drawn under the graph.
      </p>
    </div>
  );
}

export const tierCountsOf = (es: GEdge[]) => {
  const t: Record<Tier, number> = { documented: 0, reported: 0, alleged: 0, analytic: 0 };
  for (const e of es) t[e.tier]++;
  return t;
};
export { TIER_ORDER };
