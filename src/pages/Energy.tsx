import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Kicker, PageTitle, Standfirst, Byline, Callout, TierLegend, Footnote } from '../components/Editorial';
import { TIER_ORDER, type GEdge, type NodeFamily, type Tier } from '../graph/schema';
import type { NarrativeStatus } from '../graph/fleet';
import { shortestPath, pathLengthProfile, medianDegreeSeparation } from '../graph/nullModel';
import type { ShapeClass } from '../components/viz/ForceGraph';
import {
  ABSENT,
  ALL_SHAPES,
  ASOF,
  ASOF_TEXT,
  BENEFIT_OF,
  CONSTITUENTS,
  D,
  DEFAULT_FILTER,
  DRAWABLE,
  DRAWABLE_IDS,
  EDGE_BY_ID,
  EMPTY,
  ENERGY_BASE_RATES,
  ENERGY_META,
  ENERGY_NARRATIVES,
  ENERGY_VOIDS,
  INDEX_ASOF,
  INDEX_KEYS,
  INDEX_SOURCES,
  INDICES_LOADED,
  JURISDICTION_OF,
  LADDER,
  NODES,
  NODE_LIST,
  ORPHANS,
  PLANNED,
  PRESENT_FAMILIES,
  PRESENT_PREDS,
  RESEARCHED,
  RUN_ID,
  SWEEPS,
  SWEEP_OF,
  cmp,
  constituentIdsOf,
  countWithout,
  dateTestOf,
  filtersInWords,
  indexLabel,
  labelOf,
  membershipWords,
  mostRemovingFilter,
  responsesOf,
  sweepLabel,
  tenureLanes,
  visibleSet,
  voidsIn,
  type ConstituentRow,
  type EnergyFilter,
} from '../data/energy';
import EnergyStrip, { type StripFact } from '../components/energy/EnergyStrip';
import SweepStrip, { CompanyBox, type SweepChip } from '../components/energy/SweepStrip';
import EnergyGraph, { type Lit } from '../components/energy/EnergyGraph';
import EnergyAside, { ReadingKey, type AsideActions, type AsideState, type PathResult } from '../components/energy/EnergyAside';
import { Rail, ShapeLegend, DashKey, FamilyKey, PathHistogram, Twin, Overlay } from '../components/energy/Stage';
import TenureLanes from '../components/energy/TenureLanes';
import { BenefitLedger, ConstituentTable, benchDenominator, benchRows, benefitGroups, ledgerDenominator } from '../components/energy/Ledger';
import {
  BaseRateTable,
  ContestedList,
  Narratives,
  SymmetryPanel,
  baseRateDenominator,
  contestedClaims,
  contestedDenominator,
  narrativeDenominator,
} from '../components/energy/Calibration';
import { Missing, Sources, missingDenominator } from '../components/energy/Missing';
import EvidenceSection from '../components/energy/EvidenceSection';
import { EdgeCard, NodeHoverCard, claimLabel, edgeName, nodeName } from '../components/energy/Cards';
import { FOCUS, VH, focusMarginHeading, requestMarginFocus, useMedia, useNarrow, usePatch } from '../components/energy/hooks';
import { NODATA_STYLE } from '../components/energy/StackTable';

/**
 * /energy — who decides over energy, and who is recorded as gaining.
 *
 * Spec: docs/design/ENERGY_PAGE.md. The graph is the page; the margin beside it
 * answers who benefits, by what mechanism, for how much, who held the office on the
 * date and what the party concerned said — and, at rest, what the record does not
 * contain. Every figure below is derived from src/data/energy.ts at module scope or
 * from the URL; none is written by hand.
 */

// ---------------------------------------------------------------------------
// Verbatim captions (spec §8)
// ---------------------------------------------------------------------------

const STAGE_CAPTION =
  'An edge is a sourced claim, not a measure of influence. Public power is pulled left and private capital right; otherwise where a node sits is produced by the layout and means nothing. Size was declared by a researcher, not computed from connections. Edge width is the ₹ recorded on the claim, and that figure\'s kind varies — a contract value, a tariff, a bond, an outlay — so widths compare only within one kind of claim. A thin edge may have no amount recorded. A dense cluster usually shows where research effort went. The dash is the evidence tier and survives greyscale; read it before the colour.';
const EMPTY_SENTENCE = 'The energy register has not been promoted in this build. Nothing below is zero — it is absent.';
const CANNOT = {
  offices: (statesPresent: boolean) =>
    `Tenures are drawn only where a dated role claim exists. A gap in a lane is a gap in the record, not a vacancy in the office. Being in office when a decision was dated does not show that the office-holder made it, signed it, or knew of it. ${
      statesPresent
        ? 'State offices appear only where the state-layer sweep recorded a dated role.'
        : 'State governments — which sign most discom PPAs and grant most mining leases — are not in this build.'
    }`,
  benefit:
    "Amounts are not added up, and there is no chart here for the same reason. Two claims can describe the same money, and a contract value, a tariff saving, an outlay and a market-cap move are different quantities. 'Estimated' is the researcher's estimate as recorded; 'unknown' is unknown, not zero. What the beneficiary would have got under the previous rule is not in the record, so no benefit here is net of it.",
  benchmark: (asOf: string, source: string) =>
    `Membership is as of ${asOf} from ${source}. It says nothing about membership on the date of any claim, and nothing about index weight. A constituent with no claim was not necessarily examined: banks and IT firms are absent because this register did not research them, not because they were cleared. 'Via group' means a group that owns the company appears; the company itself does not.`,
  contested: 'A response is recorded as given. Its presence does not make the claim false, and its absence does not make it true.',
  narratives: (asOf: string) => `Status is the research sweep's calibration on the evidence it found as of ${asOf}, not the verdict of any court, regulator or auditor.`,
  baserates:
    "A property shared by most comparables is a fact about the category, not about any one member. A base rate is only as good as its denominator's definition, which is printed beside it. A symmetry check is the sweep's own account of running the same lens on a control; this page has not re-run it.",
  missing: 'This lists only what was looked for. What nobody thought to look for leaves no trace here.',
  twin: 'The table lists exactly what the canvas draws under the filters in force, plus superseded rows when asked for and orphans at the end; it cannot show what was never recorded.',
};
const STANDFIRST =
  'Every line is one sourced claim with its evidence tier. Click one and the margin shows who it benefits, who held the office, and what they said in reply.';
const COVERAGE_NONE = 'no sweep declares its search years — sparse is not clean';
const STATES_LINE = 'states searched: not declared';

/** What reset may clear. Page-level controls below the stage keep their state. */
const OWN_KEYS = ['q', 'tier', 'fam', 'pred', 'ty', 'min', 'from', 'to', 'sel', 'focus', 'hops', 'path', 'claim', 'idx', 'via', 'table', 'tp'];
const GRAPH_FILTER_KEYS = ['dom', 'tier', 'fam', 'pred', 'ty', 'min', 'from', 'to', 'idx', 'via', 'focus', 'hops'];
const NOT_A_LINK = new Set(['contra', 'supersede', 'analytic']);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MEDIAN_SEEDS = 40;

const listOf = (raw: string | null) => (raw == null ? null : raw === 'none' || raw === '' ? [] : raw.split(',').filter(Boolean));

// ---------------------------------------------------------------------------
// Sweep chips (module scope: they describe the register, not the view)
// ---------------------------------------------------------------------------

const yearsOf = (es: GEdge[]): [number, number] | null => {
  const ys = es.flatMap((e) => [e.from, e.to]).filter((d): d is string => !!d).map((d) => Number(d.slice(0, 4))).sort((a, b) => a - b);
  return ys.length ? [ys[0], ys[ys.length - 1]] : null;
};
const tiersOf = (es: GEdge[]) => {
  const t: Record<Tier, number> = { documented: 0, reported: 0, alleged: 0, analytic: 0 };
  for (const e of es) t[e.tier]++;
  return t;
};
const CHIPS: SweepChip[] = SWEEPS.map((s) => {
  const es = DRAWABLE.filter((e) => SWEEP_OF(e.id ?? '') === s.slug);
  const researched = RESEARCHED.has(s.slug);
  return {
    slug: s.slug,
    label: s.label,
    claims: researched ? es.length : null,
    tiers: tiersOf(es),
    voids: ENERGY_VOIDS.filter((v) => v.domain === s.slug).length,
    span: yearsOf(es),
    asOf: ENERGY_META.files.find((f) => f.domain === s.slug)?.asOf ?? null,
    extra: s.slug === 'states' ? STATES_LINE : undefined,
  };
});
const CHIP_ROWS = [
  { heading: 'Sector sweeps' as const, chips: CHIPS.filter((c) => SWEEPS.find((s) => s.slug === c.slug)?.row === 'sector') },
  { heading: 'Cross-cutting sweeps' as const, chips: CHIPS.filter((c) => SWEEPS.find((s) => s.slug === c.slug)?.row === 'lens') },
];
const ALL_BREAKDOWN = { tiers: tiersOf(DRAWABLE), voids: ENERGY_VOIDS.length, span: yearsOf(DRAWABLE) };
const SWEEPS_SUFFIX = ABSENT.length ? ` · ${RESEARCHED.size} of ${PLANNED} sweeps` : '';
const INDEX_SOURCE_LABEL = INDEX_SOURCES[0]?.[0] ?? 'source not recorded';
const COMPANY_ROWS = CONSTITUENTS;

const HEADER = (byline: string) => (
  // Compact below 640 so the canvas starts on the phone's first screen (spec §10).
  <header className="pt-2 pb-5 max-sm:pb-3 border-b-2 border-border-light max-sm:[&>p:first-child]:mb-2 max-sm:[&_h1]:text-[1.55rem] max-sm:[&_h1]:mb-1">
    <Kicker>Energy &amp; natural resources · the power map</Kicker>
    <PageTitle>Who decides over energy, and who is recorded as gaining</PageTitle>
    <Byline>{byline}</Byline>
    <div className="mt-3 max-sm:mt-1.5 max-sm:[&_p]:text-[14.5px] max-sm:[&_p]:leading-snug">
      <Standfirst>{STANDFIRST}</Standfirst>
    </div>
  </header>
);

const LINKS_OUT = (
  <p className="text-[14px] text-text-secondary mt-8 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-accent">
    Located assets such as coal and mineral blocks are mapped on <Link to="/resources">/resources</Link> · tenders on <Link to="/tenders">/tenders</Link> ·
    allocation registers on <Link to="/allocation">/allocation</Link> · PM CARES on <Link to="/pmcares">/pmcares</Link> · group deep-dives on{' '}
    <Link to="/conglomerates">/conglomerates</Link> · motif significance on <Link to="/motifs">/motifs</Link>.
  </p>
);

const FOOT = (
  <>
    <section className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-4">Sources</h2>
      <Sources />
    </section>
    <TierLegend />
    {LINKS_OUT}
    <Footnote>
      <p>
        This platform maps public records and published claims about the conduct of public offices, and is a matter of legitimate public interest. It
        asserts no guilt. Allegations are identified as allegations, attributed, and paired with the response of those they concern. No node
        adjudicates a quid pro quo.
      </p>
      <p>Nothing on this page asserts that any named person committed an offence.</p>
    </Footnote>
  </>
);

export default function Energy() {
  return EMPTY ? <EmptyEnergy /> : <EnergyPage />;
}

// ---------------------------------------------------------------------------
// The scaffold state: the fleet has not been promoted
// ---------------------------------------------------------------------------

function EmptyEnergy() {
  return (
    <article className="pb-20 [overflow-wrap:anywhere]">
      {HEADER('0 research sweeps · as of —')}
      <EnergyStrip
        facts={[
          { id: 1, text: '0 claims' },
          { id: 5, text: `0 of ${PLANNED} sweeps researched` },
        ]}
        asOf="—"
        filtered={null}
      />
      <SweepStrip rows={CHIP_ROWS} active={new Set()} onToggle={() => {}} effect={null} all={ALL_BREAKDOWN} statesLine={STATES_LINE} />
      {/* Amber, and not Editorial's Callout tone="warn": that tone is rose, and rose is
          reserved for a response or denial. The first screen a reader meets must not
          teach them that rose means "something is wrong". Same structure as Callout
          (mono uppercase label first), so it reads as one. */}
      <div className="border rounded-lg my-6 border-amber/40 bg-amber/[0.07] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted mb-2">Not promoted</p>
        <p className="text-[15px] text-text-secondary">{EMPTY_SENTENCE}</p>
      </div>
      <section aria-label="The power map — not loaded" className="border border-border rounded grid place-items-center p-6 text-center" style={{ height: 'min(440px, 65vh)', ...NODATA_STYLE }} data-nodata="">
        <p className="text-[15px] text-text-secondary max-w-[40ch]">{EMPTY_SENTENCE}</p>
      </section>
      <EvidenceSection id="missing" title="What is missing" denominator={missingDenominator()} cannotShow={CANNOT.missing}>
        <Missing onOpen={() => {}} cannotShow={CANNOT.missing} />
      </EvidenceSection>
      {FOOT}
    </article>
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

function EnergyPage() {
  const [params, patch, patchQuiet] = usePatch();
  const narrow = useNarrow();
  const lg = useMedia('(min-width: 1024px)');

  // --- parse the URL -------------------------------------------------------
  const raw = params.toString();
  const f: EnergyFilter = useMemo(() => {
    const p = new URLSearchParams(raw);
    const pick = <T extends string>(k: string, all: readonly T[], dflt: Set<T>) => {
      const l = listOf(p.get(k));
      return l == null ? new Set(dflt) : new Set(l.filter((x): x is T => (all as readonly string[]).includes(x)));
    };
    const focus = p.get('focus');
    const hops = Math.min(3, Math.max(1, Number.parseInt(p.get('hops') ?? '1', 10) || 1));
    const idx = p.get('idx');
    return {
      dom: pick('dom', [...RESEARCHED], new Set()),
      q: p.get('q') ?? '',
      tiers: pick<Tier>('tier', TIER_ORDER, DEFAULT_FILTER.tiers),
      fams: pick<NodeFamily>('fam', PRESENT_FAMILIES, DEFAULT_FILTER.fams),
      preds: pick<string>('pred', PRESENT_PREDS, new Set()),
      types: pick<ShapeClass>('ty', ALL_SHAPES, DEFAULT_FILTER.types),
      min: Math.max(0, Number(p.get('min') ?? 0) || 0),
      from: ISO.test(p.get('from') ?? '') ? p.get('from')! : '',
      to: ISO.test(p.get('to') ?? '') ? p.get('to')! : '',
      idx: idx && (INDEX_KEYS as string[]).includes(idx) ? idx : null,
      via: p.get('via') === 'group',
      focus: focus && NODES.has(focus) ? focus : null,
      hops,
    };
  }, [raw]);

  // Unknown values inside a list are dropped from the URL, so the link shows the
  // canonical set that applied (spec §3.3).
  useEffect(() => {
    const fix: Record<string, string | null> = {};
    const lists: [string, readonly string[]][] = [
      ['tier', TIER_ORDER],
      ['fam', PRESENT_FAMILIES],
      ['pred', PRESENT_PREDS],
      ['ty', ALL_SHAPES],
      ['dom', [...RESEARCHED]],
      ['nar', LADDER],
    ];
    for (const [k, all] of lists) {
      const l = listOf(params.get(k));
      if (!l || params.get(k) === 'none') continue;
      const good = l.filter((x) => all.includes(x));
      if (good.length !== l.length) fix[k] = good.length ? good.join(',') : null;
    }
    if (Object.keys(fix).length) patchQuiet(fix);
  }, [params, patchQuiet]);

  const selRaw = params.get('sel');
  const claimRaw = params.get('claim');
  const pathRaw = params.get('path');
  const sel = selRaw && NODES.has(selRaw) ? selRaw : null;
  const selNoData = selRaw?.startsWith('name:') ? CONSTITUENTS.find((c) => c.key === selRaw) ?? null : null;
  const claimEdge = claimRaw ? EDGE_BY_ID.get(claimRaw) ?? null : null;
  const pathPair = useMemo(() => {
    const p = (pathRaw ?? '').split(',').filter(Boolean);
    return p.length === 2 && p[0] !== p[1] && NODES.has(p[0]) && NODES.has(p[1]) ? (p as [string, string]) : null;
  }, [pathRaw]);
  const tableOn = params.get('table') === '1';
  const tp = Math.max(1, Number.parseInt(params.get('tp') ?? '1', 10) || 1);
  const sup = params.get('sup') === '1';
  const isec = params.get('isec') === 'energy';
  const ixfRaw = params.get('ixf');
  const ixf = ixfRaw && (INDEX_KEYS as string[]).includes(ixfRaw) ? ixfRaw : null;
  const bsortRaw = params.get('bsort');
  const bsort: 'name' | 'amount' | 'count' = bsortRaw === 'amount' || bsortRaw === 'count' ? bsortRaw : 'name';
  const nar = useMemo(() => new Set((listOf(params.get('nar')) ?? []).filter((x): x is NarrativeStatus => (LADDER as string[]).includes(x))), [params]);

  // --- the visible set -----------------------------------------------------
  const vis = useMemo(() => visibleSet(f, sel), [f, sel]);
  const v = vis.edges.length;
  const idxEffect = useMemo(() => ({ from: countWithout(f, { idx: null, via: false }, sel), to: v }), [f, sel, v]);
  const noAmountHidden = useMemo(() => (f.min > 0 ? countWithout(f, { min: 0 }, sel) - v : 0), [f, sel, v]);
  const undated = useMemo(() => vis.edges.filter((e) => !e.from && !e.to).length, [vis]);
  const windowOn = !!(f.from || f.to);
  const voids = useMemo(() => voidsIn(f.dom), [f.dom]);
  const alleged = vis.edges.filter((e) => e.tier === 'alleged');
  const answered = alleged.filter((e) => responsesOf(e).length > 0).length;
  const withBenefit = vis.edges.filter((e) => BENEFIT_OF(e.id ?? '')).length;
  const words = filtersInWords(f);

  // --- path ----------------------------------------------------------------
  const pathCalc = useMemo(() => {
    if (!pathPair) return null;
    const [a, b] = pathPair;
    const links = vis.edges.filter((e) => !NOT_A_LINK.has(e.pred)).map((e) => ({ s: e.s, t: e.t, pred: e.pred }));
    const missing = [a, b].filter((x) => !vis.nodeIds.has(x));
    const dist = pathLengthProfile(links, a);
    if (missing.length) return { result: { status: 'hidden', missing } as PathResult, dist, lit: null };
    const sp = shortestPath(links, a, b);
    if (!sp) return { result: { status: 'none' } as PathResult, dist, lit: null };
    const steps = sp.path.slice(0, -1).map((x, i) => {
      const y = sp.path[i + 1];
      return vis.edges.filter((e) => !NOT_A_LINK.has(e.pred) && ((e.s === x && e.t === y) || (e.s === y && e.t === x)));
    });
    const ids = vis.nodes.map((n) => n.id).sort(cmp);
    const step = Math.max(1, Math.floor(ids.length / MEDIAN_SEEDS));
    const seeds = ids.filter((_, i) => i % step === 0).slice(0, MEDIAN_SEEDS);
    const median = seeds.length ? { hops: medianDegreeSeparation(links, seeds), seeds: seeds.length } : null;
    const lit: Lit = { nodes: new Set(sp.path), edges: new Set(steps.flat().map((e) => e.id ?? '')) };
    return {
      result: { status: 'found', seq: sp.path, hops: sp.path.length - 1, count: sp.count, steps, median } as PathResult,
      dist,
      lit,
    };
  }, [pathPair, vis]);

  // --- the lit set: path > claim > ledger hover ----------------------------
  const [ledgerHover, setLedgerHover] = useState<Lit | null>(null);
  const claimCtx = useMemo(() => {
    if (!claimEdge || !DRAWABLE_IDS.has(claimEdge.id ?? '')) return null;
    const e = claimEdge;
    const b = BENEFIT_OF(e.id ?? '');
    // The same date test the claim card prints, so the canvas lights exactly the
    // office-holders the margin names (for a rule, its recorded issuers').
    const dt = dateTestOf(e);
    const holders = dt.holders;
    const insts = dt.subjects.length ? dt.subjects.map(labelOf).join(', ') : `the issuer of ${labelOf(dt.rule ?? e.t)} (not recorded)`;
    const nodes = new Set([e.s, e.t, ...responsesOf(e).map((r) => r.s), ...holders.map((h) => h.s)]);
    const tags: { id: string; text: string }[] = [];
    if (b && NODES.has(b.who)) {
      nodes.add(b.who);
      if (b.who !== e.s && b.who !== e.t) tags.push({ id: b.who, text: `named beneficiary of "${claimLabel(e)}"` });
    }
    return { e, b, insts, holders, lit: { nodes, edges: new Set([e.id ?? '', ...holders.map((h) => h.id ?? '')]) } as Lit, tags };
  }, [claimEdge]);
  const lit = pathCalc?.lit ?? claimCtx?.lit ?? ledgerHover ?? null;

  // --- actions -------------------------------------------------------------
  const openClaim = useCallback(
    (id: string, outside = true) => {
      if (outside) requestMarginFocus();
      patch({ claim: id });
    },
    [patch],
  );
  const act: AsideActions = useMemo(
    () => ({
      openClaim: (id) => openClaim(id),
      selectNode: (id) => {
        requestMarginFocus();
        patch({ sel: id, claim: null, path: null });
      },
      focusNode: (id, h) => patch({ focus: id, hops: String(h), sel: id }),
      pathTo: (a, b) => {
        requestMarginFocus();
        patch({ path: `${a},${b}`, claim: null });
      },
      setVia: (on) => patch({ via: on ? 'group' : null }),
      clearFilters: () => patch(Object.fromEntries(GRAPH_FILTER_KEYS.map((k) => [k, null]))),
      goToOffices: () => document.getElementById('offices')?.scrollIntoView({ block: 'start' }),
    }),
    [openClaim, patch],
  );
  const openCompany = (r: ConstituentRow) => {
    requestMarginFocus();
    if (r.id) patch({ sel: r.id, focus: r.id, hops: '1', claim: null, path: null });
    else patch({ sel: r.key, claim: null, path: null });
  };
  const toStage = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('stage')?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };
  const ask = (kv: Record<string, string | null>) => {
    patch(kv);
    toStage();
  };

  // --- the aside -----------------------------------------------------------
  const asideState: AsideState = pathPair && pathCalc
    ? { kind: 'path', a: pathPair[0], b: pathPair[1], result: pathCalc.result }
    : claimEdge
      ? { kind: 'claim', edge: claimEdge }
      : sel
        ? sel.startsWith('co:') || NODES.get(sel)?.ty === 'group'
          ? { kind: 'company', id: sel }
          : { kind: 'node', id: sel }
        : selNoData
          ? { kind: 'nodata', name: selNoData.name, keys: INDEX_KEYS.filter((k) => selNoData.member[k]) }
          : { kind: 'rest' };

  // The bottom sheet: below 1024, while something is selected or searched and the
  // stage is on screen. It docks into the flow when the stage scrolls away, so it
  // never covers the sections below.
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [stageInView, setStageInView] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setStageInView(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const opener = !!(sel || claimRaw || pathPair || selNoData);
  const sheetOn = !lg && (opener || !!f.q) && stageInView;
  const opened = useRef(false);
  useEffect(() => {
    if (lg || !opener) {
      opened.current = false;
      return;
    }
    if (opened.current) return;
    opened.current = true;
    // On opening, the canvas top goes just under the sticky strip, so the canvas and
    // the top of the card are both in view. Measured, because the strip wraps.
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollIntoView({ block: 'start', behavior: 'auto' });
    const strip = document.querySelector('[data-strip-fact="1"]')?.parentElement?.parentElement;
    const scroller = canvas.closest('main');
    if (strip && scroller) {
      const d = strip.getBoundingClientRect().bottom + 6 - canvas.getBoundingClientRect().top;
      if (d > 0) scroller.scrollTop -= d;
    }
  }, [lg, opener]);

  // --- stale links -----------------------------------------------------------
  const stale: string[] = [];
  const killed = claimRaw ? ENERGY_META.killed.find((k) => k.id === claimRaw) : undefined;
  for (const [k, id] of [
    ['sel', selRaw],
    ['focus', params.get('focus')],
  ] as const) {
    if (id && !NODES.has(id) && !(k === 'sel' && selNoData)) stale.push(id);
  }
  if (pathRaw && !pathPair) for (const id of pathRaw.split(',').filter(Boolean)) if (!NODES.has(id)) stale.push(id);
  if (claimRaw && !claimEdge && !killed) stale.push(claimRaw);

  // --- strip -----------------------------------------------------------------
  const facts: StripFact[] = [
    { id: 1, text: `${v} of ${D} claims` },
    { id: 2, text: `${vis.nodes.length} of ${NODES.size} entities`, show: 'max-sm:hidden' },
    { id: 3, text: `${answered} of ${alleged.length} allegations answered` },
    { id: 4, text: `${withBenefit} of ${v} name a beneficiary`, show: 'max-sm:hidden' },
    { id: 5, text: `${RESEARCHED.size} of ${PLANNED} sweeps researched`, show: 'max-sm:hidden' },
    { id: 6, text: `${voids.length} documented voids` },
    ...INDEX_KEYS.map((k) => {
      const ids = constituentIdsOf(k);
      const touched = [...ids].filter((id) => vis.edges.some((e) => e.s === id || e.t === id)).length;
      return { id: 7, text: `${touched} of ${CONSTITUENTS.filter((c) => c.member[k]).length} ${k} touched`, show: 'max-sm:hidden' };
    }),
    ...(windowOn ? [{ id: 8, text: `${undated} of ${v} undated — shown in any window`, show: 'max-sm:hidden' }] : []),
    ...(ORPHANS.length ? [{ id: 9, text: `${ORPHANS.length} of ${D + ORPHANS.length} not drawn — endpoint not in platform`, show: 'max-sm:hidden' }] : []),
    ...(windowOn ? [{ id: 10, text: COVERAGE_NONE }] : []),
  ];

  // --- status: in the frame (for screenshots) and in the DOM (for screen readers)
  const pathCaption =
    pathCalc?.result.status === 'found'
      ? `path: ${pathCalc.result.hops} hops · one of ${pathCalc.result.count} equally short paths${pathCalc.result.median ? ` · median in this view ${pathCalc.result.median.hops} hops` : ''} · direction ignored`
      : pathCalc?.result.status === 'none'
        ? 'path: none in the current view'
        : pathCalc?.result.status === 'hidden'
          ? 'path: an end is outside the current filters'
          : null;
  const claimLine = claimCtx
    ? `lit: claim ${claimCtx.e.id} · ${responsesOf(claimCtx.e).length} responses · office-holders on ${claimCtx.e.from ?? 'undated'}`
    : null;
  const litCaveat = claimCtx
    ? `Lit: the claim, the responses to it, its beneficiary, and whoever held office at ${claimCtx.insts} on ${claimCtx.e.from ?? 'an undated day'}. Holding office on the date is what the date test requires; it is not evidence that the office-holder made or influenced the decision.${
        claimCtx.tags.length ? ` The claim names ${labelOf(claimCtx.tags[0].id)} as beneficiary. No edge in the record joins them to it, and none is drawn.` : ''
      }`
    : null;
  const inFrame = (
    <>
      <p>
        {v} of {D} claims · {vis.nodes.length} entities · as of {ASOF.oldest ?? '—'}
      </p>
      <DashKey />
      <FamilyKey className="max-sm:hidden" />
      {claimLine && <p className="text-text">{claimLine}</p>}
      {pathCaption && <p className="text-text">{pathCaption}</p>}
      {windowOn && <p>{undated} undated claims shown regardless of the window</p>}
      {f.focus && (
        <p>
          focus: {labelOf(f.focus)}, {f.hops} {f.hops === 1 ? 'hop' : 'hops'} · {vis.nodes.length} entities in the neighbourhood
        </p>
      )}
      {windowOn && <p>coverage: {COVERAGE_NONE.replace('no sweep declares its search years', 'no sweep declares its search years for this window')}</p>}
      {f.q && <p>search "{f.q}": {vis.searchHits} claims match</p>}
      {vis.nodes.length > 220 && <p className="text-amber">{vis.nodes.length} entities drawn — filter, focus or search to read it</p>}
      <p>drag to pan · +/− or scroll to zoom · 0 fits · f maximises · shift-click a second entity for the shortest path</p>
    </>
  );
  const statusText = [
    `${v} of ${D} claims shown · ${vis.nodes.length} entities.`,
    `Filters: ${D} → ${v} claims.`,
    v === 0 ? `0 of ${D} claims match. ${words}.` : '',
    sel ? `Opened ${labelOf(sel)} in the margin.` : '',
    claimCtx ? `Lit: claim ${claimLabel(claimCtx.e)}, ${responsesOf(claimCtx.e).length} responses, ${claimCtx.holders.length} office-holders on ${claimCtx.e.from ?? 'no date'}. ${litCaveat}` : '',
    pathCaption ?? '',
    windowOn ? `${undated} undated claims shown regardless of the window. Coverage: ${COVERAGE_NONE}.` : '',
    f.q ? `Search "${f.q}": ${vis.searchHits} claims match.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const most = v === 0 ? mostRemovingFilter(f) : null;
  const reset = () => patch(Object.fromEntries(OWN_KEYS.map((k) => [k, null])));
  const overlay =
    v === 0 ? (
      <Overlay>
        <p className="text-text">0 of {D} claims match.</p>
        <p>{words}</p>
        {most && (
          <p>
            The filter that removed the most is {most.label}: without it, {most.count} claims show.{' '}
            <button type="button" onClick={() => patch(most.params)} className={`btn-ghost !px-2 !py-0.5 !text-[12px] ${FOCUS}`}>
              clear {most.label}
            </button>
          </p>
        )}
        <button type="button" onClick={reset} className={`btn-ghost !px-2 !py-0.5 !text-[12px] ${FOCUS}`}>
          reset graph filters
        </button>
      </Overlay>
    ) : null;

  const pathCandidates = useMemo(() => NODE_LIST.filter((n) => DRAWABLE.some((e) => e.s === n.id || e.t === n.id)), []);

  // The sections below the stage render one frame after the stage, so the canvas and
  // its margin are interactive before the ledger, the tables and the bibliography
  // are built. Deferred by a frame, never hidden: nothing waits on a scroll or a click.
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBelow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const aside = (
    <EnergyAside
      state={asideState}
      act={act}
      sel={sel}
      focusHops={f.focus && sel === f.focus ? f.hops : null}
      via={f.via}
      q={f.q}
      visible={vis.edges}
      voids={voids}
      domLabel={f.dom.size ? [...f.dom].map(sweepLabel).join(', ') : 'any researched sweep'}
      pathCandidates={pathCandidates}
      showReadingKey={!narrow}
      showVoids
      sheet={sheetOn ? { on: true, expanded: sheetExpanded, toggle: () => setSheetExpanded((x) => !x), close: () => patch({ sel: null, claim: null, path: null }) } : null}
    />
  );

  const height = narrow ? 'min(440px, 65vh)' : lg ? 'clamp(560px, calc(100vh - 15rem), 820px)' : '560px';
  const fitKey = useMemo(() => vis.nodes.map((n) => n.id).join('|'), [vis.nodes]);

  // --- sections ---------------------------------------------------------------
  const lanes = useMemo(() => tenureLanes(vis.edges), [vis.edges]);
  // Counted from the lanes actually drawn, so the sentence under them cannot claim a
  // lane, a state or a government that the SVG above does not show. States come from
  // the recorded jurisdiction only, never from `st` (the registered office — spec A6).
  const laneJurisdiction = useMemo(() => {
    const js = lanes.lanes.map((l) => JURISDICTION_OF.get(l.id)).filter((j): j is string => !!j);
    return {
      withJ: js.length,
      states: new Set(js.filter((j) => j !== 'central')).size,
      govRoles: lanes.lanes.filter((l) => NODES.get(l.id)?.ty === 'state').reduce((n, l) => n + l.spans.length, 0),
    };
  }, [lanes]);
  const groups = useMemo(() => benefitGroups(vis.edges, bsort), [vis.edges, bsort]);
  const bench = useMemo(() => benchRows(vis.edges), [vis.edges]);
  const contested = useMemo(() => contestedClaims(vis.edges), [vis.edges]);
  const narratives = useMemo(() => ENERGY_NARRATIVES.filter((n) => !f.dom.size || f.dom.has(n.domain)), [f.dom]);
  const rates = useMemo(() => ENERGY_BASE_RATES.filter((r) => !f.dom.size || f.dom.has(r.domain)), [f.dom]);
  const statesPresent = RESEARCHED.has('states');
  const coverageLead = windowOn ? `${COVERAGE_NONE}\n` : '';
  const askEffect = (kv: Partial<EnergyFilter>) => ({ from: v, to: countWithout(f, kv, sel) });

  const skip = (
    <p className={`${VH} focus-within:h-auto focus-within:[clip-path:none] focus-within:mb-2 font-mono text-[12px] text-text-secondary`}>
      Skip the graph:{' '}
      <a
        href="#stage"
        className={`underline ${FOCUS}`}
        onClick={(e) => {
          e.preventDefault();
          focusMarginHeading();
        }}
      >
        go to the margin
      </a>{' '}
      ·{' '}
      <a
        href="#twin"
        className={`underline ${FOCUS}`}
        onClick={(e) => {
          e.preventDefault();
          if (!tableOn) patch({ table: '1' });
          window.setTimeout(() => document.getElementById('twin')?.focus(), 120);
        }}
      >
        go to the table
      </a>{' '}
      ·{' '}
      <a
        href="#energy-rail"
        className={`underline ${FOCUS}`}
        onClick={(e) => {
          e.preventDefault();
          const d = document.querySelector<HTMLDetailsElement>('#energy-rail details');
          if (d) d.open = true;
          document.querySelector<HTMLElement>('#energy-rail input')?.focus();
        }}
      >
        go to filters
      </a>
    </p>
  );

  const companyBox = (
    <CompanyBox
      rows={COMPANY_ROWS}
      words={(r) => (r.id ? membershipWords(r.id) : INDEX_KEYS.filter((k) => r.member[k]).map(indexLabel).join(' · '))}
      disabled={INDICES_LOADED ? null : 'index lists not loaded in this build'}
      onChoose={openCompany}
    />
  );

  const search = (
    <div className="mb-2 max-sm:mb-1.5">
      <input
        id="gq"
        aria-label="Search entities, claims and source titles"
        type="search"
        value={f.q}
        onChange={(e) => patch({ q: e.target.value || null })}
        placeholder="search entities, claims and source titles"
        className={`input-field !py-1.5 !text-[13px] ${FOCUS}`}
      />
    </div>
  );

  return (
    <article className="pb-20 [overflow-wrap:anywhere]">
      {HEADER(`${RESEARCHED.size} research sweeps · ${NODES.size} entities · ${D} claims · run ${RUN_ID} · as of ${ASOF_TEXT}`)}
      <EnergyStrip facts={facts} asOf={ASOF_TEXT} filtered={{ from: D, to: v }} />
      {narrow && (
        <p className="mt-1.5">
          <button
            type="button"
            onClick={() => document.getElementById('energy-voids')?.scrollIntoView({ block: 'start' })}
            className={`text-[13px] text-text underline underline-offset-2 text-left ${FOCUS}`}
          >
            What the record does not show: {voids.length} documented voids
          </button>
        </p>
      )}
      <SweepStrip
        rows={CHIP_ROWS}
        active={f.dom}
        onToggle={(slug) => {
          const next = new Set(f.dom);
          if (next.has(slug)) next.delete(slug);
          else next.add(slug);
          const on = SWEEPS.map((s) => s.slug).filter((s) => next.has(s));
          patch({ dom: on.length ? on.join(',') : null });
        }}
        effect={{ from: D, to: v }}
        all={ALL_BREAKDOWN}
        statesLine={STATES_LINE}
        footer={narrow ? null : companyBox}
      />
      {ABSENT.length > 0 && (
        <p className="text-[13px] text-amber mt-3">
          {RESEARCHED.size} of {PLANNED} planned sweeps are researched: {[...RESEARCHED].map(sweepLabel).join(', ')}. The graph covers only these.
        </p>
      )}
      {/* The backticks are the acceptance document's wording (AC-42 matches them
          verbatim), so they stay visible; they are hidden from assistive technology so
          a screen reader does not read "backtick" around the id. */}
      {stale.length > 0 && (
        <p role="status" className="text-[13px] text-amber mt-3">
          The linked item <code className="font-mono"><span aria-hidden="true">`</span>{stale[0]}<span aria-hidden="true">`</span></code> is not in this version of the register (as of {ASOF.oldest ?? '—'}). It may have been renamed, superseded or withdrawn —
          the table with superseded rows on lists what changed.
        </p>
      )}
      {killed && (
        <p role="status" className="text-[13px] text-amber mt-3">
          Claim <code className="font-mono"><span aria-hidden="true">`</span>{killed.id}<span aria-hidden="true">`</span></code> was killed in audit: {killed.killedReason}. It is listed under Killed in audit.
        </p>
      )}

      <section id="stage" ref={stageRef} aria-label="The power map" className="mt-5 max-sm:mt-3">
        {skip}
        <div className="flex flex-col lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] min-[1440px]:grid-cols-[13.5rem_minmax(0,1fr)_21rem] gap-4 max-sm:gap-1.5">
          <div id="energy-rail" className="order-1 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
            <Rail
              f={f}
              params={params}
              patch={patch}
              visible={vis.edges}
              drawable={DRAWABLE}
              indexEffect={idxEffect}
              noAmountHidden={noAmountHidden}
              undated={undated}
              open={!narrow}
              onReset={reset}
              tableOn={tableOn}
              sup={sup}
            />
          </div>
          {!narrow && (
            <div className="order-3 lg:col-start-2 lg:row-start-2 min-[1440px]:col-start-3 min-[1440px]:row-start-1 min-[1440px]:row-span-2 min-[1440px]:sticky min-[1440px]:top-12 min-[1440px]:self-start min-[1440px]:max-h-[calc(100vh-4rem)] min-[1440px]:overflow-y-auto">
              {aside}
            </div>
          )}
          <div className="order-2 lg:col-start-2 lg:row-start-1 min-w-0">
            <div role="status" className={VH}>
              {statusText}
            </div>
            {search}
            {narrow && (
              <details className="mb-1.5">
                <summary className={`font-mono text-[11px] text-text-secondary cursor-pointer ${FOCUS}`}>How to read this graph</summary>
                <ReadingKey />
              </details>
            )}
            <div ref={canvasRef} className="scroll-mt-24 border border-border rounded">
              <EnergyGraph
                nodes={vis.nodes}
                edges={vis.edges}
                selected={sel}
                pathEnds={pathPair ?? []}
                lit={lit}
                tags={claimCtx?.tags ?? []}
                onSelect={(id) => patch({ sel: sel === id ? null : id })}
                onPathEnd={(id) => (sel && sel !== id ? patch({ path: `${sel},${id}` }) : patch({ sel: id }))}
                onEdgeClick={(e) => openClaim(e.id ?? '', false)}
                nodeName={nodeName}
                edgeName={edgeName}
                responsesOf={responsesOf}
                hoverCard={(n) => <NodeHoverCard n={n} />}
                edgeCard={(e) => <EdgeCard e={e} />}
                status={inFrame}
                overlay={overlay}
                height={height}
                fitKey={fitKey}
                expandedAside={aside}
                // Connectors follow the claim only while the claim is what is lit; a path
                // outranks it, and then its responders are not drawn to.
                connectorClaim={claimCtx && lit === claimCtx.lit ? (claimCtx.e.id ?? null) : null}
              />
            </div>
            {narrow && companyBox}
            {narrow && <div className="mt-4">{aside}</div>}
            <ShapeLegend f={f} patch={patch} nodes={vis.nodes} />
            <p className="text-[13px] text-text-secondary mt-3 max-w-[80ch] leading-relaxed">{STAGE_CAPTION}</p>
            {windowOn && (
              <p className="text-[13px] text-text-secondary mt-2">
                {undated} undated claims are shown regardless of the window, because an undated claim cannot be placed inside or outside it.
              </p>
            )}
            {litCaveat && <p className="text-[13px] text-text-secondary mt-2">{litCaveat}</p>}
            {pathPair && pathCalc && <PathHistogram from={pathPair[0]} to={pathPair[1]} dist={pathCalc.dist} visibleCount={vis.nodes.length} />}
          </div>
        </div>
      </section>

      {tableOn && (
        <Twin visible={vis.edges} sup={sup} page={tp} patch={patch} patchQuiet={patchQuiet} words={words} onOpen={(id) => openClaim(id)} cannotShow={CANNOT.twin} />
      )}

      {below && (
      <>
      <EvidenceSection
        id="offices"
        title="Who held the office on the date"
        denominator={`${coverageLead}${STATES_LINE}\n${lanes.lanes.length} institutions with a recorded office-holder · ${lanes.placed} of ${lanes.dated} dated decisions fall inside a recorded tenure · ${lanes.gap} fall between tenures · ${lanes.undated} undated, not placed${SWEEPS_SUFFIX}`}
        cannotShow={CANNOT.offices(statesPresent)}
        ask={{ label: 'Show offices and their decisions', effect: askEffect({ preds: new Set(['role', 'award', 'law']) }), onAsk: () => ask({ pred: 'role,award,law' }) }}
      >
        <TenureLanes
          lanes={lanes.lanes}
          events={lanes.events}
          range={lanes.range}
          selectedClaim={claimEdge}
          onSelectClaim={(id) => openClaim(id)}
          onSelectNode={act.selectNode}
          words={words}
        />
        <p className="text-[14px] text-text-secondary mt-3">
          <strong className="text-text">{lanes.noHolder.length} institutions appear in claims with no recorded office-holder</strong>
          {lanes.noHolder.length ? `: ${lanes.noHolder.join(', ')}` : '.'}
        </p>
        <p className="text-[13px] text-text-muted mt-2">
          {laneJurisdiction.withJ === 0
            ? `Jurisdiction is not recorded for any lane, so lanes are not grouped by union or state and no count of states is given. `
            : `${laneJurisdiction.states} states have at least one lane; ${laneJurisdiction.withJ} of ${lanes.lanes.length} lanes record a jurisdiction, and lanes are not yet grouped by it. `}
          States searched by the Offices sweep: not declared. This build does not type which offices are heads of government, so changes of government
          are not drawn;{' '}
          {laneJurisdiction.govRoles > 0
            ? `${laneJurisdiction.govRoles} dated role claims into state or territorial governments are drawn as tenures above.`
            : 'no dated role claim into a state or territorial government is drawn in this view.'}
        </p>
      </EvidenceSection>

      <EvidenceSection
        id="benefit"
        title="Who is recorded as benefiting"
        denominator={`${ledgerDenominator(vis.edges)}${SWEEPS_SUFFIX}`}
        cannotShow={CANNOT.benefit}
        ask={{ label: 'Show awards in the graph', effect: askEffect({ preds: new Set(['award']) }), onAsk: () => ask({ pred: 'award' }) }}
      >
        <BenefitLedger
          groups={groups}
          sort={bsort}
          patch={patch}
          onSelectNode={act.selectNode}
          onSelectClaim={(id) => openClaim(id)}
          onHover={(h) => setLedgerHover(h)}
          cannotShow={CANNOT.benefit}
          words={words}
        />
      </EvidenceSection>

      {INDICES_LOADED ? (
        <EvidenceSection
          id="benchmark"
          title="From the benchmark"
          denominator={`${benchDenominator(bench, INDEX_SOURCE_LABEL, INDEX_ASOF)}${SWEEPS_SUFFIX}`}
          cannotShow={CANNOT.benchmark(INDEX_ASOF, INDEX_SOURCE_LABEL)}
          ask={{
            label: `Show only claims touching ${INDEX_KEYS[0]} constituents`,
            effect: askEffect({ idx: INDEX_KEYS[0], via: false }),
            onAsk: () => ask({ idx: INDEX_KEYS[0] }),
          }}
        >
          <ConstituentTable rows={bench} isec={isec} ixf={ixf} patch={patch} onOpen={openCompany} cannotShow={CANNOT.benchmark(INDEX_ASOF, INDEX_SOURCE_LABEL)} />
        </EvidenceSection>
      ) : (
        <Callout label="Index lists not loaded" tone="note">
          <p>
            Index membership lists are not loaded in this build; the route from a Nifty 50 / Sensex stock into this graph cannot be drawn. This is absent,
            not empty.
          </p>
        </Callout>
      )}

      <div id="contested">
        <EvidenceSection
          id="contested-allegations"
          title="Contested — allegations beside their responses"
          denominator={`${contestedDenominator(vis.edges)}${SWEEPS_SUFFIX}`}
          cannotShow={CANNOT.contested}
          ask={{ label: 'Show allegations and their responses', effect: askEffect({ tiers: new Set<Tier>(['alleged']) }), onAsk: () => ask({ tier: 'alleged' }) }}
        >
          <ContestedList claims={contested} onOpen={(id) => openClaim(id)} />
        </EvidenceSection>
        <EvidenceSection
          id="contested-narratives"
          title="Narratives, and how each stands"
          denominator={`${narrativeDenominator(narratives)}${SWEEPS_SUFFIX}`}
          cannotShow={CANNOT.narratives(ASOF_TEXT)}
        >
          <Narratives all={narratives} active={nar} patch={patch} />
        </EvidenceSection>
      </div>

      <EvidenceSection
        id="baserates"
        title="Would the same lens alarm us elsewhere?"
        denominator={`${baseRateDenominator(rates)}${SWEEPS_SUFFIX}`}
        cannotShow={CANNOT.baserates}
      >
        <BaseRateTable rows={rates} cannotShow={CANNOT.baserates} />
        <SymmetryPanel dom={f.dom} />
      </EvidenceSection>

      <EvidenceSection id="missing" title="What is missing" denominator={`${missingDenominator()}${SWEEPS_SUFFIX}`} cannotShow={CANNOT.missing}>
        <Missing onOpen={(id) => openClaim(id)} cannotShow={CANNOT.missing} />
      </EvidenceSection>

      {FOOT}
      </>
      )}
    </article>
  );
}

