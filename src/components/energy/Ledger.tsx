import { useMemo } from 'react';
import { Callout, TierChip } from '../Editorial';
import type { GEdge, Tier } from '../../graph/schema';
import type { BenefitRow } from '../../graph/fleet';
import {
  ASOF_TEXT,
  BENEFIT_OF,
  CONSTITUENTS,
  ENERGY_SECTORS,
  ENERGY_SECTOR_RULE,
  INDEX_KEYS,
  NODES,
  RUN_ID,
  cmp,
  constituentIdsOf,
  labelOf,
  membershipWords,
  responsesOf,
  viaGroupOf,
  type ConstituentRow,
} from '../../data/energy';
import { indexCoverage } from '../../data/indices';
import StackTable, { DownloadButton, NODATA_STYLE, type Cell } from './StackTable';
import { Btn, SourceLines, TierCounts, benefitAmount, claimLabel, openClaimName } from './Cards';
import { FOCUS, type Patch } from './hooks';

// ---------------------------------------------------------------------------
// Who is recorded as benefiting
// ---------------------------------------------------------------------------

export interface BenefitGroup {
  who: string;
  isNode: boolean;
  label: string;
  rows: { b: BenefitRow; e: GEdge }[];
  largestDocumented: { b: BenefitRow; e: GEdge } | null;
  tiers: Record<Tier, number>;
}

export function benefitGroups(visible: GEdge[], sort: 'name' | 'amount' | 'count'): BenefitGroup[] {
  const m = new Map<string, BenefitGroup>();
  for (const e of visible) {
    const b = BENEFIT_OF(e.id ?? '');
    if (!b) continue;
    const g =
      m.get(b.who) ??
      m
        .set(b.who, {
          who: b.who,
          isNode: NODES.has(b.who),
          label: NODES.has(b.who) ? labelOf(b.who) : b.who,
          rows: [],
          largestDocumented: null,
          tiers: { documented: 0, reported: 0, alleged: 0, analytic: 0 },
        })
        .get(b.who)!;
    g.rows.push({ b, e });
    g.tiers[e.tier]++;
    if (b.confidence === 'documented' && b.amountCr && (!g.largestDocumented || b.amountCr > (g.largestDocumented.b.amountCr ?? 0)))
      g.largestDocumented = { b, e };
  }
  const groups = [...m.values()];
  for (const g of groups) g.rows.sort((a, b) => cmp(a.e.from ?? '9999', b.e.from ?? '9999') || cmp(a.e.id ?? '', b.e.id ?? ''));
  const byName = (a: BenefitGroup, b: BenefitGroup) => cmp(a.label, b.label) || cmp(a.who, b.who);
  if (sort === 'amount')
    return groups.sort((a, b) => (b.largestDocumented?.b.amountCr ?? -1) - (a.largestDocumented?.b.amountCr ?? -1) || byName(a, b));
  if (sort === 'count') return groups.sort((a, b) => b.rows.length - a.rows.length || byName(a, b));
  return groups.sort(byName);
}

export function ledgerDenominator(visible: GEdge[]) {
  const rows = visible.map((e) => BENEFIT_OF(e.id ?? '')).filter((b): b is BenefitRow => !!b);
  const doc = rows.filter((b) => b.confidence === 'documented' && b.amountCr).length;
  const est = rows.filter((b) => b.confidence === 'estimated' && b.amountCr).length;
  const who = new Set(rows.map((b) => b.who));
  const notNodes = [...who].filter((w) => !NODES.has(w)).length;
  return `${rows.length} of ${visible.length} visible claims name a beneficiary · ${doc} documented amount · ${est} estimated · ${rows.length - doc - est} unknown · ${who.size} distinct beneficiaries (${notNodes} not nodes in this graph)`;
}

const LEDGER_COLUMNS = ['date', 'claim', 'how', 'amount', 'confidence', 'responses', 'source', 'note'];

export function BenefitLedger({
  groups,
  sort,
  patch,
  onSelectNode,
  onSelectClaim,
  onHover,
  cannotShow,
  words,
}: {
  groups: BenefitGroup[];
  sort: 'name' | 'amount' | 'count';
  patch: Patch;
  onSelectNode: (id: string) => void;
  onSelectClaim: (id: string) => void;
  onHover: (h: { nodes: Set<string>; edges: Set<string> } | null) => void;
  cannotShow: string;
  words: string;
}) {
  const hoverOf = (g: BenefitGroup) => {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    for (const { e } of g.rows) {
      nodes.add(e.s);
      nodes.add(e.t);
      edges.add(e.id ?? '');
    }
    if (g.isNode) nodes.add(g.who);
    return { nodes, edges };
  };
  const download = {
    filename: `energy-benefit-ledger-${RUN_ID}.csv`,
    comments: [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, words, `Nothing is summed; amount kinds differ. What this cannot show: ${cannotShow}`],
    columns: ['beneficiary', 'is a node', 'claim id', 'date', 'claim', 'tier', 'how', 'amount', 'confidence', 'responses', 'sources'],
    rows: () =>
      groups.flatMap((g) =>
        g.rows.map(({ b, e }) => [
          g.label,
          g.isNode ? 'yes' : 'no',
          e.id ?? '',
          e.from ?? 'undated',
          claimLabel(e),
          e.tier,
          b.how ?? '',
          benefitAmount(b),
          b.confidence ?? '',
          String(responsesOf(e).length),
          b.srcs.map(([l, u]) => `${l} <${u}>`).join(' | '),
        ]),
      ),
  };
  return (
    <div>
      <p className="flex flex-wrap gap-3 items-center font-mono text-[11px] text-text-muted">
        <label>
          sort{' '}
          <select
            aria-label="Sort the ledger"
            value={sort}
            onChange={(e) => patch({ bsort: e.target.value === 'name' ? null : e.target.value })}
            className={`bg-bg-elevated border border-border rounded px-1 py-0.5 text-text ${FOCUS}`}
          >
            <option value="name">name</option>
            <option value="amount">amount</option>
            <option value="count">count</option>
          </select>
        </label>
        <span>amount = largest documented single figure; nothing is summed</span>
      </p>
      <Callout label="A beneficiary is not an allegation" tone="bottomline">
        <p>
          An award has a winner by construction. A tariff order has a party whose tariff changed. Naming who gained is arithmetic. Whether the gain
          was intended, improper or ordinary is a separate claim, which appears in the graph as alleged with its response beside it, or not at all.
        </p>
      </Callout>
      {groups.length === 0 && <p className="text-[14px] text-text-secondary">No visible claim names a beneficiary under the filters in force.</p>}
      {groups.map((g) => (
        <div
          key={g.who}
          className="mt-6 [overflow-wrap:anywhere]"
          onMouseEnter={() => onHover(hoverOf(g))}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(hoverOf(g))}
          onBlur={() => onHover(null)}
        >
          <h3 className="text-[16px] text-text font-semibold">
            {g.isNode ? <Btn onClick={() => onSelectNode(g.who)}>{g.label}</Btn> : g.label}
          </h3>
          <p className="font-mono text-[11px] text-text-muted">
            {g.isNode ? (NODES.get(g.who)?.sub ? `${NODES.get(g.who)!.sub} · ` : '') : 'not a node in this graph · '}
            {g.isNode ? membershipWords(g.who) : ''}
          </p>
          <p className="text-[12.5px] text-text-secondary mt-1 flex flex-wrap gap-2 items-center">
            {g.rows.length === 1 ? '1 claim' : `${g.rows.length} claims`} <TierCounts tiers={g.tiers} /> ·{' '}
            {g.largestDocumented ? (
              <span>
                largest documented single figure: ₹{g.largestDocumented.b.amountCr!.toLocaleString('en-IN')} cr —{' '}
                <Btn onClick={() => onSelectClaim(g.largestDocumented!.e.id ?? '')}>{claimLabel(g.largestDocumented.e)}</Btn>
              </span>
            ) : (
              'no documented amount'
            )}
          </p>
          <StackTable
            columns={LEDGER_COLUMNS}
            minWidth="44rem"
            rows={g.rows.map(({ b, e }) => {
              const n = responsesOf(e).length;
              return [
                <span className="font-mono text-[11.5px]">{e.from ?? 'undated'}</span>,
                <span>
                  <Btn onClick={() => onSelectClaim(e.id ?? '')} label={openClaimName(e)}>
                    {claimLabel(e)}
                  </Btn>{' '}
                  <TierChip tier={e.tier} />
                </span>,
                b.how ?? 'mechanism not recorded',
                benefitAmount(b),
                b.confidence ?? 'not recorded',
                <span className={n ? 'text-rose' : ''}>{n === 1 ? '1 response' : `${n} responses`}</span>,
                // Every source, each with its URL as visible text: a ledger row showing one
                // label and hiding the rest reads as thinly sourced (interface-design).
                <SourceLines srcs={b.srcs} />,
                b.who === e.s || b.who === e.t ? '' : 'not a party to this edge',
              ] as Cell[];
            })}
          />
        </div>
      ))}
      <div className="mt-4">
        <DownloadButton d={download} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// From the benchmark
// ---------------------------------------------------------------------------

export interface BenchRow extends ConstituentRow {
  direct: Record<Tier, number>;
  directN: number;
  via: { group: string; n: number }[];
}

export function benchRows(visible: GEdge[]): BenchRow[] {
  const touch = new Map<string, Record<Tier, number>>();
  for (const e of visible) {
    for (const id of new Set([e.s, e.t])) {
      const t = touch.get(id) ?? touch.set(id, { documented: 0, reported: 0, alleged: 0, analytic: 0 }).get(id)!;
      t[e.tier]++;
    }
  }
  const count = (id: string) => Object.values(touch.get(id) ?? {}).reduce((a, b) => a + b, 0);
  return CONSTITUENTS.map((c) => {
    const direct = (c.id && touch.get(c.id)) || { documented: 0, reported: 0, alleged: 0, analytic: 0 };
    const via = c.id
      ? viaGroupOf(c.id)
          .map((g) => ({ group: g.group, n: count(g.group) }))
          .filter((g) => g.n > 0)
      : [];
    return { ...c, direct, directN: Object.values(direct).reduce((a, b) => a + b, 0), via };
  });
}

export function benchDenominator(rows: BenchRow[], sourceLabel: string, asOf: string): string {
  const lines = INDEX_KEYS.map((k) => {
    const rs = rows.filter((r) => r.member[k]);
    const direct = rs.filter((r) => r.id && r.directN > 0).length;
    const via = rs.filter((r) => r.id && r.directN === 0 && r.via.length > 0).length;
    const nd = rs.filter((r) => !r.id).length;
    return `${k}: ${direct} of ${rs.length} with ≥ 1 direct claim · ${via} via group only · ${rs.length - direct - via - nd} none · ${nd} not in platform dataset`;
  });
  return `${lines.join('\n')}\nlists as of ${asOf} · ${sourceLabel}`;
}

export function ConstituentTable({
  rows,
  isec,
  ixf,
  patch,
  onOpen,
  cannotShow,
}: {
  rows: BenchRow[];
  isec: boolean;
  ixf: string | null;
  patch: Patch;
  onOpen: (r: ConstituentRow) => void;
  cannotShow: string;
}) {
  const shown = useMemo(
    () => rows.filter((r) => (!isec || (r.sector != null && ENERGY_SECTORS.includes(r.sector))) && (!ixf || r.member[ixf])),
    [rows, isec, ixf],
  );
  const sectorOnly = rows.filter((r) => r.sector != null && ENERGY_SECTORS.includes(r.sector)).length;
  const memberOnly = ixf ? rows.filter((r) => r.member[ixf]).length : rows.length;
  const cols = ['Symbol', 'Company', ...INDEX_KEYS, 'Direct claims', 'Via group', ''];
  const table = shown.map((r) => {
    const nodata = !r.id;
    return [
      <span className="font-mono">{r.symbol}</span>,
      <span>
        {r.name}
        <span className="block text-[12px] text-text-muted">{r.sector ?? 'sector unknown'}</span>
      </span>,
      ...INDEX_KEYS.map((k) => (
        <span role="img" aria-label={r.member[k] ? 'member' : 'not a member'}>
          {r.member[k] ? '●' : '—'}
        </span>
      )),
      nodata
        ? { node: 'not in platform dataset — cannot be joined', nodata: true }
        : r.directN > 0
          ? <TierCounts tiers={r.direct} />
          : '0',
      nodata ? { node: '—', nodata: true } : r.via.length ? r.via.map((v) => `${v.n} via ${labelOf(v.group)}`).join('; ') : '—',
      <button type="button" onClick={() => onOpen(r)} className={`btn-ghost !px-2 !py-0.5 !text-[12px] whitespace-nowrap ${FOCUS}`}>
        open in graph
      </button>,
    ] as Cell[];
  });
  const csv = {
    filename: `energy-constituents-${RUN_ID}.csv`,
    comments: [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, `${shown.length} constituents shown${isec ? ' · energy sectors only' : ''}${ixf ? ` · members of ${ixf}` : ''}`, `What this cannot show: ${cannotShow}`],
    columns: ['symbol', 'company', 'sector', ...INDEX_KEYS, 'direct claims', 'via group', 'company id'],
    rows: () =>
      shown.map((r) => [
        r.symbol,
        r.name,
        r.sector ?? 'sector unknown',
        ...INDEX_KEYS.map((k) => (r.member[k] ? 'member' : 'not a member')),
        r.id ? String(r.directN) : 'not in platform dataset',
        r.via.map((v) => `${v.n} via ${labelOf(v.group)}`).join('; '),
        r.id ?? '',
      ]),
  };
  // A list shorter than its index is a gap the file declares; the count is printed,
  // never rounded up to the index's name.
  const coverage = indexCoverage().filter((c) => (INDEX_KEYS as string[]).includes(c.key));
  return (
    <div>
      <p className="font-mono text-[11px] text-text-muted mb-3">
        lists in this build: {coverage.map((c) => `${c.key} ${c.confirmed} of ${c.expected} constituents listed`).join(' · ')}
        {coverage.some((c) => c.confirmed < c.expected) ? ' — a shorter list is a gap declared by the index file, not a smaller index' : ''}
      </p>
      <div className="flex flex-wrap gap-5 items-center text-[13px] text-text-secondary">
        <label className="flex items-center gap-2">
          <input type="checkbox" aria-label="energy sectors only" checked={isec} onChange={(e) => patch({ isec: e.target.checked ? 'energy' : null })} className={FOCUS} />
          energy sectors only <span className="font-mono text-[10.5px] text-text-muted">({ENERGY_SECTOR_RULE})</span>
          <span className="font-mono text-[10.5px] text-amber">
            {rows.length} → {sectorOnly} companies
          </span>
        </label>
        <label className="flex items-center gap-2">
          membership
          <select
            aria-label="membership filter"
            value={ixf ?? ''}
            onChange={(e) => patch({ ixf: e.target.value || null })}
            className={`bg-bg-elevated border border-border rounded px-1 py-0.5 text-text ${FOCUS}`}
          >
            <option value="">every index</option>
            {INDEX_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <span className="font-mono text-[10.5px] text-amber">
            {rows.length} → {memberOnly} companies
          </span>
        </label>
      </div>
      <StackTable columns={cols} rows={table} caption={`${shown.length} rows · alphabetical by symbol, never by claim count`} download={csv} minWidth="48rem" />
      <h3 className="text-[15px] text-text mt-8">The expected result: an energy register touches energy companies. Read the 'other sector' row first.</h3>
      {INDEX_KEYS.map((k) => {
        const rs = rows.filter((r) => r.member[k]);
        const cell = (pred: (r: BenchRow) => boolean) => {
          const g = rs.filter(pred);
          const hit = g.filter((r) => r.directN > 0).length;
          return [hit, g.length - hit, g.length];
        };
        const band = [
          ['in ENERGY_SECTORS', (r: BenchRow) => r.sector != null && ENERGY_SECTORS.includes(r.sector)],
          ['other sector', (r: BenchRow) => r.sector != null && !ENERGY_SECTORS.includes(r.sector)],
          ['sector unknown', (r: BenchRow) => r.sector == null],
        ] as const;
        const data = band.map(([l, p]) => [l, ...cell(p)] as [string, number, number, number]);
        return (
          <StackTable
            key={k}
            columns={[`${k}`, '≥ 1 direct claim', 'none', 'total']}
            caption={`${k} · ${rs.length} constituents`}
            minWidth="30rem"
            rows={data.map((d) => [d[0], String(d[1]), String(d[2]), String(d[3])])}
            download={{
              filename: `energy-sector-${k}-${RUN_ID}.csv`,
              comments: [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, `${k} constituents by sector and claim`, `What this cannot show: ${cannotShow}`],
              columns: ['sector band', '≥ 1 direct claim', 'none', 'total'],
              rows: () => data.map((d) => d.map(String)),
            }}
          />
        );
      })}
      {rows.some((r) => !r.id) && (
        <p className="text-[13px] text-text-muted" style={NODATA_STYLE} data-nodata="">
          Hatched rows are constituents the platform has no company record for.
        </p>
      )}
    </div>
  );
}

export const constituentIds = constituentIdsOf;
