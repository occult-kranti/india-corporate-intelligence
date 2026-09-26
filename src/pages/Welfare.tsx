import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Kicker, PageTitle, Standfirst, Byline, Section, TierLegend, Footnote } from '../components/Editorial';
import { SourceLedger } from '../components/Domain';
import type { StateCode, Tier } from '../graph/schema';
import { TIERS } from '../graph/schema';
import {
  type Metric, type StateYearRow,
  EMPTY, RUN_ID, AS_OF, AS_OF_LABEL, AS_OF_YEAR, FIRST_YEAR, LAST_YEAR, YEAR_COUNT, STATE_COUNT, TOTAL_SCHEMES,
  METRICS, METRIC_SHORT, METRIC_UNIT, MONEY, CATEGORIES, TIER_LIST, PARTY_LABELS, BINS, ASSEMBLY, LOK_SABHA,
  parseFilters, activeFilterString, selectionString, metricBlocker, metricLabel, metricCoverage, inView, stateYear, classCounts,
  electionRows, controlWindow, yearElections, electionTitle, WINDOWS, laneOf, coverageByYear, fyOf,
  stripFacts, derivedGaps, RECORDED_GAPS, ledgerSources, PRIMARY, schemeById, stateName, coverageReachesView,
  declaredYearsFor, nextElection, monthsBetweenSafe, annualPerHead, amountInForce, fmtNum, canon,
  WELFARE_NARRATIVE_LIST, yearsCovered, scrubberRows, bylineFacts, launchesSplit, fmtMoney,
} from '../data/welfareView';
import WelfareMap, { type MapBallot, type WelfareMapHandle, ZERO_FILL, TextureSwatch } from '../components/welfare/WelfareMap';
import TimeLanes, { GLYPH, BALLOT_GLYPH } from '../components/welfare/TimeLanes';
import { ControlCard, YearElectionList } from '../components/welfare/Control';
import { StatePanel, SchemeCard, StateMoneyBlock, ROSE_KEY } from '../components/welfare/Panels';
import StageTwins from '../components/welfare/StageTwins';
import NarrativeLadder from '../components/welfare/NarrativeLadder';
import { ControlSection, MinistersSection, AfterSection, BenefitsSection, FindingsSection, GraphSection, MissingSection, Voids } from '../components/welfare/Sections';
import { Caption, Src, useNarrow, HashLink, QLink, Go, type TableCtx } from '../components/welfare/ui';

/**
 * /welfare — distribution funds, 2000–2026. Spec: docs/design/WELFARE_PAGE.md.
 *
 * The page owns URL state, focus and layout; every figure comes from
 * src/data/welfareView.ts, and every graphic has its table twin built from the same
 * array, so the two cannot disagree. The data is compiled in: nothing is fetched.
 */

// Below 640px no mono text may be smaller than 12px (spec §7.2 rule 10). The shared
// editorial primitives set 9.5–11px mono labels; this lifts them on this page only.
//
// A table twin is the accessible equivalent of its graphic, so a closed twin is kept
// rendered for assistive technology (off screen, like any visually hidden text) rather
// than removed from the reading of the page; opening it shows it to everyone. Nothing
// inside a closed twin takes keyboard focus (see Tabbable in components/welfare/ui).
// Under review: spec U2 prefers closed twins closed to assistive technology too (the
// skip link and ?view=table open them). Removing this rule waits on the acceptance tests,
// which read closed twins through innerText (AC-30, 31, 57–61) and must first open them
// via #stage-tables or read textContent.
const PAGE_CSS = `@media (max-width: 639px) {
  .wf-page [class*="text-[9"], .wf-page [class*="text-[10"], .wf-page [class*="text-[11"] { font-size: 12px; }
}
.wf-page details[data-twin]:not([open])::details-content {
  content-visibility: visible; display: block; position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%);
}`;


export default function Welfare() {
  const [routerParams, setRouterParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const narrow = useNarrow();
  // The router commits navigation inside a transition, so the view would trail the URL
  // by a render. Controls write the URL and this copy together, so what a reader just
  // chose is on screen (and focus can move to it) in the same event; the copy follows
  // the router for every other navigation (back, a pasted link).
  const routerKey = routerParams.toString();
  const [key, setKey] = useState(routerKey);
  useEffect(() => { setKey(routerKey); }, [routerKey]);
  const params = useMemo(() => new URLSearchParams(key), [key]);
  const setParams = useCallback((next: URLSearchParams, opts: { replace: boolean }) => {
    setKey(next.toString());
    setRouterParams(next, opts);
  }, [setRouterParams]);
  const [forceTables, setForceTables] = useState(false);
  const f = useMemo(() => parseFilters(new URLSearchParams(key)), [key]);
  const afs = useMemo(() => activeFilterString(new URLSearchParams(key)), [key]);
  const sel = useMemo(() => selectionString(new URLSearchParams(key)), [key]);

  const [live, setLive] = useState('');
  const announce = useCallback((m: string) => setLive(m), []);
  const [hoverSt, setHoverSt] = useState<StateCode | null>(null);
  const [focusSt, setFocusSt] = useState<StateCode | null>(null);
  const [qDraft, setQDraft] = useState(f.q);
  const qTimer = useRef<number | null>(null);
  const mapRef = useRef<WelfareMapHandle>(null);
  const panelH2 = useRef<HTMLHeadingElement>(null);
  const tablesH3 = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [vh, setVh] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 800));

  useEffect(() => {
    const on = () => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => { setQDraft(f.q); }, [f.q]);

  // ------------------------------------------------------------------ URL state
  const patch = useCallback((kv: Record<string, string | null>) => {
    const next = new URLSearchParams(key);
    for (const [k, v] of Object.entries(kv)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
    return next;
  }, [setParams, key]);

  const effectText = (p: URLSearchParams) => {
    const ff = parseFilters(p);
    return `${TOTAL_SCHEMES} → ${inView(ff).length} schemes`;
  };
  const set = useCallback((kv: Record<string, string | null>) => {
    const next = patch(kv);
    announce(effectText(next));
  }, [patch, announce]);

  const goSearch = useCallback((s: string) => {
    setParams(new URLSearchParams(s.startsWith('?') ? s.slice(1) : s), { replace: true });
  }, [setParams]);

  /** Search strings for links: the current view with some params changed. */
  const search = useCallback((kv: Record<string, string | null>) => {
    const next = new URLSearchParams(key);
    for (const [k, v] of Object.entries(kv)) {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return s ? `?${s}` : '';
  }, [key]);

  // ------------------------------------------------------------------ derived
  const all = useMemo(() => inView(f), [f]);
  const rows = useMemo(() => stateYear(f), [f]);
  const byCode = useMemo(() => new Map<StateCode, StateYearRow>(rows.map((r) => [r.st, r])), [rows]);
  const counts = useMemo(() => classCounts(rows), [rows]);
  const eRows = useMemo(() => electionRows(f), [f]);
  const lsRows = useMemo(() => electionRows(f, 'lok sabha'), [f]);
  const windows = useMemo(() => WINDOWS.map((w) => controlWindow(eRows, w)), [eRows]);
  const yRows = useMemo(() => (f.y != null ? yearElections(eRows, f.y) : []), [eRows, f.y]);
  const facts = useMemo(() => stripFacts(f), [f]);
  const gaps = useMemo(() => [...RECORDED_GAPS, ...derivedGaps()], []);
  const selected = f.s ? schemeById.get(f.s) ?? null : null;
  const money = MONEY.includes(f.m);
  const fy = f.y != null ? fyOf(f.y) : null;
  const label = metricLabel(f.m, f.y);
  const withValue = counts.value + counts.zero;
  const narrowCtx = narrow;

  const ballots: MapBallot[] = yRows.map((r) => ({ key: r.key, st: r.e.st as StateCode, outcome: r.outcome, lid: r.exposedBy[12].length > 0, muted: r.muted, title: electionTitle(r) }));

  const ctxFor = (filters: string, yearText: string): TableCtx => ({ filters, yearText, asOfLabel: AS_OF_LABEL, asOf: AS_OF ?? 'unpromoted', runId: RUN_ID, announce });
  const ctx = ctxFor(afs, f.y != null ? String(f.y) : 'all years');
  const controlCtx = ctxFor(activeFilterString(new URLSearchParams(key), ['y', 'm', 'party', 'tier', 'q']), 'all years');
  // The control's pool is shaped by category and level; say which, from the URL, on the card itself.
  const scopeText = activeFilterString(new URLSearchParams(key), ['y', 'm', 'party', 'tier', 'q']);
  const scope = { text: scopeText || 'none', noStateSchemes: f.lvl === 'central' };

  // ------------------------------------------------------------------ readout
  const readoutLines = useCallback((st: StateCode): string[] => {
    const r = byCode.get(st);
    if (!r) return [];
    const value = r.cls === 'hatch' ? 'none recorded in this file' : r.cls === 'zero' ? 'searched, none live' : r.valueText;
    const lines = [`${r.name}: ${label}: ${value}${money && fy ? ` · FY ${fy}` : ''}`, r.detail];
    if (f.y != null) {
      for (const e of yRows.filter((x) => x.e.st === st)) lines.push(`${e.e.date}: ${e.e.incumbentRaw ?? 'incumbent not recorded'} → ${e.e.winnerRaw ?? 'winner not recorded'} · fresh scheme within 12 m: ${e.exposedBy[12].length ? 'yes' : 'no'}`);
    }
    return lines.filter(Boolean);
  }, [byCode, label, money, fy, f.y, yRows]);

  const onFocusState = useCallback((st: StateCode | null) => {
    setFocusSt(st);
    // Written straight to the one live region, not debounced: the arrow key and the
    // announcement belong to the same moment.
    if (st) setLive(readoutLines(st).join(' '));
  }, [readoutLines]);

  const readSt = hoverSt ?? focusSt ?? f.st;

  // ------------------------------------------------------------------ focus on open and close (U18)
  const prev = useRef<{ st: StateCode | null; s: string | null; first: boolean }>({ st: f.st, s: f.s, first: true });
  useLayoutEffect(() => {
    const p = prev.current;
    prev.current = { st: f.st, s: f.s, first: false };
    if (p.first) return;
    if (p.st === f.st && p.s === f.s) return;
    const act = document.activeElement as HTMLElement | null;
    const openedScheme = f.s && f.s !== p.s;
    const openedState = !f.s && f.st && (f.st !== p.st || p.s);
    if (openedScheme || openedState) {
      if (act && !act.closest('[data-panel]')) opener.current = act;
      const h2 = panelH2.current;
      if (h2) {
        if (window.innerWidth < 1280) h2.closest('section')?.scrollIntoView({ block: 'start', behavior: 'auto' });
        h2.focus({ preventScroll: true });
      }
      if (openedScheme) announce(`${selected?.name ?? `Scheme ${f.s}`} opened`);
      else if (f.st) {
        const k = all.filter((s) => s.level === 'state' && s.st === f.st).length;
        const e = eRows.filter((r) => r.e.st === f.st).length;
        announce(`${stateName(f.st)} opened: ${k} state schemes, ${e} elections in the file`);
      }
    } else if (!f.s && !f.st) {
      const back = opener.current && opener.current.isConnected ? opener.current : mapRef.current?.el();
      back?.focus();
      announce('Panel closed');
    }
  }, [f.st, f.s]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------ twins open under view=table or #stage-tables
  const twinsOpen = f.view === 'table' || location.hash === '#stage-tables' || forceTables;
  useEffect(() => {
    if (location.hash === '#stage-tables') {
      const el = document.getElementById('stage-tables');
      el?.scrollIntoView({ block: 'start', behavior: 'auto' });
      tablesH3.current?.focus({ preventScroll: true });
    }
  }, [location.hash]);

  // ------------------------------------------------------------------ controls
  const setYear = (y: number | null) => set({ y: y == null ? null : String(y) });
  const toggleCat = (c: string) => {
    const cur = new Set(f.cat ?? []);
    if (cur.has(c as never)) cur.delete(c as never); else cur.add(c as never);
    set({ cat: CATEGORIES.filter((x) => cur.has(x)).join(',') || null });
  };
  const toggleTier = (t: Tier) => {
    const cur = new Set(f.tier);
    if (cur.has(t)) cur.delete(t); else cur.add(t);
    const list = TIER_LIST.filter((x) => cur.has(x));
    patch({ tier: list.length === TIER_LIST.length ? null : list.join(',') || 'none' });
  };
  const onQ = (v: string) => {
    setQDraft(v);
    if (qTimer.current) window.clearTimeout(qTimer.current);
    qTimer.current = window.setTimeout(() => {
      const next = patch({ q: v || null });
      announce(effectText(next));
    }, 280);
  };
  const reset = () => {
    const v = params.get('view');
    setParams(v ? new URLSearchParams({ view: v }) : new URLSearchParams(), { replace: true });
    announce(`${TOTAL_SCHEMES} → ${TOTAL_SCHEMES} schemes`);
  };
  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      announce(msg);
    } catch {
      announce('Copy failed: the browser refused clipboard access');
    }
  };
  const selectState = (st: StateCode | null) => set({ st, s: st ? null : f.s });
  const closePanel = () => {
    if (f.s) patch({ s: null });
    else patch({ st: null });
  };
  const openPerson = (labelText: string) => {
    patch({ q: labelText });
    setQDraft(labelText);
    document.getElementById('ministers')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  const skip = () => {
    setForceTables(true);
    navigate({ pathname: location.pathname, search: key ? `?${key}` : '', hash: '#stage-tables' }, { replace: true });
    requestAnimationFrame(() => {
      document.getElementById('stage-tables')?.scrollIntoView({ block: 'start', behavior: 'auto' });
      tablesH3.current?.focus({ preventScroll: true });
    });
  };

  // ------------------------------------------------------------------ metric options
  const metricOpt = (m: Metric) => {
    const block = metricBlocker(m, f.y, f.cat);
    const cov = metricCoverage(f, m);
    const name = m === 'live' ? METRIC_SHORT.live
      : block ? `${METRIC_SHORT[m]}, unavailable: ${block}`
      : `${METRIC_SHORT[m]}: ${cov?.k ?? 0} of ${cov?.n ?? 0} live state schemes have a figure for FY ${fy}`;
    return { m, block, name };
  };
  const metricOpts = METRICS.map(metricOpt);
  const catCounts = useMemo(() => {
    const pool = inView(f, { ignoreCat: true });
    return CATEGORIES.map((c) => ({ c, n: pool.filter((s) => s.category === c).length }));
  }, [f]);
  const partyCounts = useMemo(() => {
    const pool = inView(f, { ignoreParty: true });
    return PARTY_LABELS.map((p) => ({ p, n: pool.filter((s) => canon(s.party) === p).length }));
  }, [f]);
  const activeCount = ['y', 'm', 'cat', 'party', 'lvl', 'tier', 'q'].filter((k) => params.get(k)).length;
  const findingsAll = all.flatMap((s) => s.results);
  const findingsIn = findingsAll.filter((r) => f.tier.has(r.tier));
  const benefitAll = all.flatMap((s) => s.whoElseBenefits);
  const benefitIn = benefitAll.filter((w) => w.tier == null || f.tier.has(w.tier));
  const allegedInView = f.tier.has('alleged') && (findingsIn.some((r) => r.tier === 'alleged') || benefitIn.some((w) => w.tier === 'alleged'));

  const mapHeight = narrow ? 420 : Math.max(420, Math.min(620, vh - 380));
  const mapAria = EMPTY
    ? `Map of India, ${label}, ${f.y ?? `${FIRST_YEAR}–${AS_OF_YEAR}`}, 0 of ${STATE_COUNT} states with a value; nothing recorded yet`
    : `Map of India, ${label}, ${f.y ?? `${FIRST_YEAR}–${AS_OF_YEAR}`}, ${withValue} of ${STATE_COUNT} states with a value; arrow keys move between states, Enter opens one; a table version follows`;

  // ------------------------------------------------------------------ pieces
  const btn = 'font-mono text-[12px] px-2 py-1 border rounded';
  const pressedCls = (on: boolean) => (on ? 'border-accent text-accent' : 'border-border-light text-text-secondary hover:text-text');
  const dimCls = (off: boolean) => (off ? 'opacity-50 cursor-not-allowed' : '');

  const searchInput = (
    <input
      type="search"
      aria-label="Search schemes by name, alias or person"
      placeholder="scheme, alias or person"
      value={qDraft}
      onChange={(e) => onQ(e.target.value)}
      className="bg-bg-elevated border border-border-light rounded px-2 py-1 text-[14px] w-full sm:w-56"
    />
  );

  const chips = (
    <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1" role="group" aria-label="Category">
      {catCounts.map(({ c, n }) => {
        const on = !!f.cat?.has(c);
        const off = n === 0 && !on;
        return (
          <button key={c} type="button" aria-pressed={on} aria-disabled={off ? 'true' : undefined}
            onClick={() => { if (!off) toggleCat(c); }}
            className={`${btn} whitespace-nowrap ${pressedCls(on)} ${dimCls(off)}`}>{`${c} (${n})`}</button>
        );
      })}
    </div>
  );

  const tierToggles = (
    <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Evidence tier">
      {TIER_LIST.map((t) => (
        <button key={t} type="button" aria-pressed={f.tier.has(t)} onClick={() => toggleTier(t)} className={`${btn} inline-flex items-center gap-1.5 ${pressedCls(f.tier.has(t))}`}>
          <svg width="18" height="6" aria-hidden="true"><line x1="1" x2="17" y1="3" y2="3" stroke="currentColor" strokeWidth="1.4" strokeDasharray={TIERS[t].dash || undefined} /></svg>
          {t}
        </button>
      ))}
    </div>
  );

  const partySelect = (
    <div className="flex items-start gap-2">
      <select multiple aria-label="Party" size={3} value={[...(f.party ?? [])]}
        onChange={(e) => set({ party: [...e.target.selectedOptions].map((o) => o.value).join(',') || null })}
        className="bg-bg-elevated border border-border-light rounded text-[13px] min-w-[8rem]">
        {PARTY_LABELS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <p className="font-mono text-[12px] text-text-muted max-w-[26rem] leading-4">{`schemes by party: ${partyCounts.map((x) => `${x.p} ${x.n}`).join(' · ')}`}</p>
    </div>
  );

  const filterBody = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 items-start">
        {searchInput}
        {narrow ? (
          <select aria-label="Metric" value={f.m} onChange={(e) => { const o = metricOpts.find((x) => x.m === e.target.value); if (o && !o.block) set({ m: o.m === 'live' ? null : o.m }); }} className="bg-bg-elevated border border-border-light rounded px-2 py-1 text-[13px] max-w-full">
            {metricOpts.map((o) => <option key={o.m} value={o.m} disabled={!!o.block} aria-disabled={o.block ? 'true' : undefined}>{o.block ? o.name : METRIC_SHORT[o.m]}</option>)}
          </select>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Metric">
            {metricOpts.map((o) => (
              <button key={o.m} type="button" aria-pressed={f.m === o.m} aria-disabled={o.block ? 'true' : undefined} aria-label={o.name}
                onClick={() => { if (!o.block) set({ m: o.m === 'live' ? null : o.m }); }}
                className={`${btn} ${pressedCls(f.m === o.m)} ${dimCls(!!o.block)}`}>{METRIC_SHORT[o.m]}</button>
            ))}
          </div>
        )}
      </div>
      {!narrow && chips}
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-start">
        {partySelect}
        {narrow ? (
          <select aria-label="Level" value={f.lvl} onChange={(e) => set({ lvl: e.target.value === 'all' ? null : e.target.value })} className="bg-bg-elevated border border-border-light rounded px-2 py-1 text-[13px]">
            <option value="all">All</option><option value="state">State</option><option value="central">Central</option>
          </select>
        ) : (
          <div className="flex gap-1.5" role="group" aria-label="Level">
            {(['all', 'state', 'central'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={f.lvl === l} onClick={() => set({ lvl: l === 'all' ? null : l })} className={`${btn} ${pressedCls(f.lvl === l)}`}>{l === 'all' ? 'All' : l === 'state' ? 'State' : 'Central'}</button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1">
          {tierToggles}
          <p className="font-mono text-[12px] text-text-muted">{`${findingsIn.length} of ${findingsAll.length} findings · ${benefitIn.length} of ${benefitAll.length} benefit rows · filters findings, not schemes`}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={reset} className={`${btn} border-border-light hover:text-accent`}>Reset</button>
          <button type="button" onClick={() => copy(window.location.href, 'Link copied')} className={`${btn} border-border-light hover:text-accent`}>Copy link</button>
          <div className="flex gap-1.5" role="group" aria-label="View">
            <button type="button" aria-pressed={f.view === 'map'} onClick={() => patch({ view: null })} className={`${btn} ${pressedCls(f.view === 'map')}`}>Map</button>
            <button type="button" aria-pressed={f.view === 'table'} onClick={() => patch({ view: 'table' })} className={`${btn} ${pressedCls(f.view === 'table')}`}>Table</button>
          </div>
        </div>
      </div>
    </div>
  );

  const qLinks = f.q && all.length <= 8 ? all : null;
  const effect = (
    <p data-effect="" className="font-mono text-[12px] text-text-secondary mt-2">
      {`${TOTAL_SCHEMES} → ${all.length} schemes`}
      {f.lvl !== 'all' ? ' · the map shows state schemes only' : ''}
      {qLinks && qLinks.length > 0 && <>{' · '}{qLinks.map((s, i) => <span key={s.id}>{i > 0 ? ' · ' : ''}<QLink search={search({ s: s.id })} className="underline underline-offset-2 hover:text-accent">{s.name}</QLink></span>)}</>}
    </p>
  );

  // Strip: six facts on a desktop, two on a phone — the rest move under the byline, never hidden.
  const factText = (x: { n: number; of?: number; label: string }) => `${x.n.toLocaleString('en-IN')}${x.of != null ? ` of ${x.of.toLocaleString('en-IN')}` : ''} ${x.label}`;
  const stripFactsShown = EMPTY ? [] : narrow ? facts.slice(0, 2) : facts;
  const filtered = all.length !== TOTAL_SCHEMES;

  const prevDisabled = f.y === FIRST_YEAR;
  const nextDisabled = f.y === LAST_YEAR;
  const readoutId = 'wf-year-readout';
  const prevY = f.y != null ? f.y - 1 : AS_OF_YEAR;
  const nextY = f.y != null ? f.y + 1 : FIRST_YEAR;
  const scrubber = (
    <div className={`flex items-center gap-x-1.5 sm:gap-x-2 gap-y-1 mt-1.5 ${narrow ? 'flex-nowrap' : 'flex-wrap'}`}>
      <button type="button" aria-label="All years" onClick={() => setYear(null)} className={`${btn} shrink-0 ${pressedCls(f.y == null)}`}>{narrow ? 'All' : 'All years'}</button>
      <button type="button" aria-disabled={prevDisabled ? 'true' : undefined}
        aria-label={prevDisabled ? `Previous year, none before ${FIRST_YEAR}: this is the first year` : `Previous year, ${prevY}`}
        onClick={() => { if (!prevDisabled) setYear(prevY); }}
        className={`${btn} shrink-0 border-border-light ${dimCls(prevDisabled)}`}>{prevDisabled || narrow ? '‹' : `‹ ${prevY}`}</button>
      <p id={readoutId} className="font-mono text-[12px] sm:text-2xl text-text tabular-nums leading-none shrink-0 whitespace-nowrap">{f.y == null ? 'All years' : `${f.y}${money && fy ? ` · money: FY ${fy}` : ''}`}</p>
      <button type="button" aria-disabled={nextDisabled ? 'true' : undefined}
        aria-label={nextDisabled ? `Next year, none after ${LAST_YEAR}: this is the last year` : `Next year, ${nextY}`}
        onClick={() => { if (!nextDisabled) setYear(nextY); }}
        className={`${btn} shrink-0 border-border-light ${dimCls(nextDisabled)}`}>{nextDisabled || narrow ? '›' : `${nextY} ›`}</button>
      <input type="range" min={FIRST_YEAR} max={LAST_YEAR} step={1} value={f.y ?? LAST_YEAR}
        aria-label="Year" aria-describedby={readoutId}
        aria-valuetext={f.y == null ? `All years, ${FIRST_YEAR} to ${AS_OF_YEAR}` : `${f.y}${money && fy ? `, money: FY ${fy}` : ''}`}
        onChange={(e) => setYear(Number(e.target.value))}
        className={`flex-1 min-w-0 sm:min-w-[10rem] h-11 accent-[var(--color-accent)] ${f.y == null ? 'opacity-40' : ''}`} />
    </div>
  );

  // ------------------------------------------------------------------ legend
  const bins = BINS[f.m];
  const legendLines: ReactNode[] = [];
  legendLines.push(<p key="t" className="text-text-secondary">{`${label}${METRIC_UNIT[f.m] ? `, ${METRIC_UNIT[f.m]}` : ''} · fixed classes, the same in every year`}</p>);
  if (!('disabled' in bins)) {
    bins.labels.forEach((l, i) => {
      const n = rows.filter((r) => r.cls === 'value' && r.fill === bins.ramp[i]).length;
      legendLines.push(<p key={`b${i}`}><span className="inline-block w-4 h-3 mr-2 align-middle" style={{ background: bins.ramp[i] }} aria-hidden="true" />{n ? `${l} (${n} in ${f.y ?? 'all years'})` : `${l} (empty)`}</p>);
    });
  }
  const coverageHere = coverageReachesView(f.cat);
  legendLines.push(
    <p key="z"><span className="inline-block w-4 h-3 mr-2 align-middle" style={{ background: ZERO_FILL }} aria-hidden="true" />
      {coverageHere
        ? `searched, none live (${counts.zero})`
        : 'searched, none live (empty: no research file declares its coverage, so no state-year is shown as none) · declarations exist only per category; choose a category a file searched to see them'}
    </p>,
  );
  const stipReasons = [...new Set(rows.filter((r) => r.cls === 'stipple').map((r) => r.reason))].map((x) => `${x} ${rows.filter((r) => r.cls === 'stipple' && r.reason === x).length}`);
  legendLines.push(<p key="s"><TextureSwatch kind="stipple" />{`live, no comparable figure (${counts.stipple})${stipReasons.length ? ` · ${stipReasons.join(' · ')}` : ''}`}</p>);
  legendLines.push(<p key="h"><TextureSwatch kind="hatch" />{`no value (${counts.hatch} of ${STATE_COUNT}), not zero · none recorded in this file ${counts.hatch}`}</p>);
  legendLines.push(<p key="k" className="text-text-secondary">{f.y == null ? 'choose a year to see its elections'
    : yRows.length ? `${BALLOT_GLYPH.retained} incumbent kept power · ${BALLOT_GLYPH.lost} lost · ${BALLOT_GLYPH.unclassified} coalition / unclassified · lid = the incumbent's party launched or raised a state scheme there within 12 months before`
      : `no assembly election recorded in ${f.y}`}</p>);

  // ------------------------------------------------------------------ status line (figcaption)
  const parties = f.party ? [...f.party].join(', ') : '';
  const clauses: string[] = [
    `${label} · ${f.y ?? `${FIRST_YEAR}–${AS_OF_YEAR}`}${money && fy ? ` · FY ${fy}` : ''}`,
    `${counts.hatch} of ${STATE_COUNT}: none recorded (hatched)`,
    `${counts.stipple}: live, no comparable figure (stippled)`,
    `${counts.zero}: searched, none live (flat)`,
    'central schemes not painted (band below)',
    f.party ? `party filter on: every painted scheme is ${parties}'s; the map is one side · the control below measures every party` : 'party not encoded',
    ...(afs ? [`filters: ${afs}`] : []),
    ...(sel ? [`selected: ${sel}`] : []),
    ...(f.y != null ? [`ballots: every assembly election in ${f.y}; lid = timing, not cause; elections entered this file largely because a scheme preceded them`] : []),
    `as of ${AS_OF_LABEL}`,
    `run ${RUN_ID}`,
  ];

  const partialMoney = money ? rows.filter((r) => r.cls === 'stipple' && r.reason === 'partial').length : 0;
  const aboveMap: ReactNode[] = [];
  if (!EMPTY && all.length === 0) {
    aboveMap.push(<p key="zero" className="text-[14px] text-amber">{`No scheme in this file matches ${afs || 'these filters'}. This is a statement about the file, not about India. `}<button type="button" onClick={reset} className="underline underline-offset-2">Reset</button></p>);
  }
  if (partialMoney) aboveMap.push(<p key="pm" className="text-[14px] text-text-secondary">{`${partialMoney} states with live schemes have a figure for only some of them. They are stippled, with lower bounds in the readout.`}</p>);
  if (money && fy && !rows.some((r) => r.cls === 'value')) aboveMap.push(<p key="nf" className="text-[14px] text-text-secondary">{`No ${METRIC_SHORT[f.m]} figure located for FY ${fy} in any state in view.`}</p>);

  // ------------------------------------------------------------------ clock inputs
  const lanesCentral = f.lvl === 'state' ? [] : all.filter((s) => s.level === 'central').map(laneOf);
  const centralHidden = f.lvl === 'state' ? inView(f, { ignoreLvl: true }).filter((s) => s.level === 'central').length : null;
  const lanesState = f.st ? all.filter((s) => s.level === 'state' && s.st === f.st).map(laneOf) : [];
  const stateElect = f.st ? eRows.filter((r) => r.e.st === f.st) : [];
  const cov = coverageByYear(f);
  const unplaced = all.filter((s) => !s.launched?.date).length;
  const coverageLabel = cov
    ? `${METRIC_SHORT[f.m]}: figures for ${cov.reduce((a, c) => a + c.k, 0)} of ${cov.reduce((a, c) => a + c.n, 0)} scheme-years · ${cov.filter((c) => c.state === 'full').length} of ${YEAR_COUNT} years complete`
    : unplaced ? `${unplaced} schemes have no launch date and are not placed on the clock` : null;
  const statePool = inView(f, { ignoreLvl: true }).filter((s) => s.level === 'state');
  const preview = !narrow && hoverSt ? {
    label: stateName(hoverSt),
    launches: statePool.filter((s) => s.st === hoverSt && s.launched?.date).map((s) => s.launched!.date!),
    elections: eRows.filter((r) => r.e.st === hoverSt),
  } : null;
  const lanesAll = [...lanesCentral, ...lanesState];
  const scrub = scrubberRows(f);
  const yScrub = f.y != null ? scrub.find((r) => r.year === f.y) : null;

  // ------------------------------------------------------------------ margin
  let margin: ReactNode;
  if (f.s && !selected) {
    margin = (
      <section data-panel="" className="border border-border-light rounded-lg p-3 bg-bg-elevated/70 text-[14px]">
        <p className="text-text-secondary">{`No scheme \`${f.s}\` in this file. `}<QLink search={search({ s: null })} className="underline underline-offset-2 hover:text-accent">clear the scheme</QLink></p>
      </section>
    );
  } else if (selected) {
    const ne = nextElection(selected);
    margin = (
      <div data-panel="">
        <SchemeCard ref={panelH2} scheme={selected} year={f.y} tiers={f.tier}
          nextElection={ne ? { date: ne.date, label: `${stateName(ne.st)} ${ne.election}`, months: monthsBetweenSafe(selected.launched?.date, ne.date), result: `${ne.incumbentRaw ?? 'not recorded'} → ${ne.winnerRaw ?? 'not recorded'}` } : null}
          backTo={f.st ? { label: stateName(f.st), onClick: () => patch({ s: null }) } : null}
          onClose={closePanel}
          onCopy={(t) => copy(t, 'Citation copied')}
          citeBase={`file as of ${AS_OF_LABEL} · run ${RUN_ID} · ${window.location.href}`} />
      </div>
    );
  } else if (f.st) {
    const st = f.st;
    const r = byCode.get(st);
    const inState = inView(f, { ignoreLvl: true }).filter((s) => s.level === 'state' && s.st === st);
    const allState = [...schemeById.values()].filter((s) => s.level === 'state' && s.st === st);
    let moneyBlock: ReactNode = null;
    if (r && f.y != null) {
      if (money && fy) {
        // The addends and the sum come from the same array the readout's figure was built
        // from (StateYearRow.addends), so the panel cannot print a figure the readout lacks.
        const adds = r.addends;
        const k = adds.filter((a) => a.v != null).length;
        const n = adds.length;
        const sum = adds.reduce((acc, a) => acc + (a.v ?? 0), 0);
        const m = f.m;
        moneyBlock = <StateMoneyBlock title={`${METRIC_SHORT[m]} in FY ${fy}`}
          items={adds.map((a) => ({ key: a.scheme.id, node: <>{`${a.scheme.name} · ${a.v != null ? fmtMoney(m, a.v) : a.row ? `not located (the FY ${fy} row has no ${METRIC_SHORT[m]} figure)` : `not located (no FY ${fy} row)`} `}{a.row ? <Src srcs={a.row.srcs} /> : null}</> }))}
          foot={!n ? 'no live state scheme' : k === n
            ? `sum ${fmtMoney(m, sum)} · computed here from ${k} of ${n} rows · not a figure any source states`
            : k > 0 ? `partial sum ${fmtMoney(m, sum)} · computed here from ${k} of ${n} rows · a lower bound, not shaded on the map`
              : `not located in any of ${n} rows · nothing summed`} />;
      } else if (f.m === 'perhead') {
        moneyBlock = <StateMoneyBlock title={`Entitlement per beneficiary in ${f.y}`}
          items={r.contributing.map((s) => { const a = amountInForce(s, f.y!).amount; const ann = annualPerHead(a, s.benefit?.unit ?? null); return { key: s.id, node: <>{`${s.name} · ${a != null ? `₹${fmtNum(a)} as recorded` : 'amount not located'} · ${ann.value != null ? `₹${fmtNum(ann.value)} / yr ×${ann.factor}, computed here` : ann.reason}`}</> }; })}
          foot="amounts are not added: two schemes may reach the same person" />;
      } else {
        moneyBlock = <StateMoneyBlock title={`State schemes counted in ${f.y}`}
          items={r.contributing.map((s) => ({ key: s.id, node: <QLink search={search({ s: s.id })} className="underline underline-offset-2 hover:text-accent">{s.name}</QLink> }))}
          foot={`${r.contributing.length} counted`} />;
      }
    }
    const nameLower = stateName(st).toLowerCase();
    margin = (
      <div data-panel="">
        <StatePanel ref={panelH2} st={st} year={f.y} readout={readoutLines(st)} moneyBlock={moneyBlock}
          allSchemes={allState} schemes={inState} elections={stateElect}
          declared={declaredYearsFor(st)}
          gaps={gaps.map((g) => g.what).filter((w) => w.toLowerCase().includes(nameLower))}
          search={search} onClose={closePanel} onPerson={openPerson} />
      </div>
    );
  } else {
    const key6 = allegedInView;
    margin = (
      <div className="space-y-4">
        <ul className="text-[13px] text-text-secondary space-y-1.5 border-l-2 border-border-light pl-3">
          <li>Fill is one metric for state schemes recorded in this file, in the chosen year.</li>
          <li>Hatch is none recorded. Stipple is live with no comparable figure. Flat is searched and none live. None of the three means zero.</li>
          <li>Ballots mark every assembly election that year, including those no scheme preceded.</li>
          <li>Central schemes run in the band under the map; they are not painted. The Union is measured in the control card below and in the band.</li>
          <li>Colour never encodes party.</li>
          {key6 && <li>{ROSE_KEY}</li>}
        </ul>
        <ControlCard
          empty={ASSEMBLY.length ? null : 'No elections recorded, so the control cannot run.'}
          windows={windows}
          n={eRows.length}
          union={LOK_SABHA.length ? { w: controlWindow(lsRows, 12), count: lsRows.length } : null}
          partyLines={f.party ? [...f.party].map((p) => ({ party: p, w: controlWindow(eRows.filter((r) => r.incumbent === p), 12) })) : []}
          year={f.y != null ? { y: f.y, rows: yRows } : null}
          scope={scope}
          runId={RUN_ID}
          search={search}
          onCopy={(t) => copy(t, 'Citation copied')} />
        <section>
          <h3 className="text-[15px] text-text font-medium mb-2">What the record does not contain</h3>
          <Voids />
        </section>
      </div>
    );
  }

  // Derived, not asserted: how the register's launches split either side of 2014.
  const ls = launchesSplit(2014);
  const launchText = `The file records ${ls.before} launches before 2014 and ${ls.from} from 2014${ls.undated ? `, and ${ls.undated} schemes with no launch date` : ''}.`;
  const yrs = yearsCovered(all);
  const c7partial = yrs.length < YEAR_COUNT && yrs.length > 0
    ? ` The file records a live scheme in ${yrs.length} of the ${YEAR_COUNT} years, first in ${yrs[0]}. Before that the map is hatched because nothing was recorded, not because nothing was paid.`
    : yrs.length === 0 ? ` The file records no live scheme in any of the ${YEAR_COUNT} years.` : '';

  const ledger = useMemo(() => ledgerSources().map(([l, url]) => ({ label: l, url, establishes: 'See per-row citations above.', primary: PRIMARY.test(url), retrieved: AS_OF_LABEL })), []);
  const bf = bylineFacts();
  const byline = EMPTY
    ? 'register not yet promoted · nothing below is zero'
    : `${bf.schemes} schemes · ${bf.states} of ${STATE_COUNT} states & UTs with a recorded state scheme · ${bf.parties} parties · ${bf.elections} assembly elections recorded · as of ${AS_OF_LABEL} · run ${RUN_ID}`;
  const glyphRow = (
    <p className="text-[13px] text-text-muted mt-2 leading-relaxed max-w-[90ch]">
      {`ballots: ${BALLOT_GLYPH.retained} incumbent kept power · ${BALLOT_GLYPH.lost} lost · ${BALLOT_GLYPH.unclassified} coalition or unclassified · a bar above = launched or raised within 12 months before · scheme events: ${GLYPH.raised} raised · ${GLYPH.cut} cut · ${GLYPH.tightened} eligibility tightened (filled diamond) · ${GLYPH.paused} paused · ${GLYPH.discontinued} discontinued · ${GLYPH.renamed} renamed · ${GLYPH.promised} promised, not enacted (hollow diamond) · the pale band before each election is the 12-month window, the page's own construct, edged with the analytic dash · coverage ribbon, in the map's textures: ramp floor = every live scheme has the figure, stipple = some do, hatch = none do, hairline = no live scheme`}
      {narrow ? ' · amount labels are omitted on narrow screens; they are in the scheme card' : ' · amount labels at change points on central lanes and the selected lane, as recorded'}
    </p>
  );

  return (
    <>
      <style>{PAGE_CSS}</style>
      <div aria-live="polite" className="sr-only">{live}</div>
      <Go.Provider value={goSearch}>
      <article className="pb-20 wf-page">
        <header className="pt-2 pb-5">
          <Kicker>{`Distribution funds · cash, grain and goods schemes · ${FIRST_YEAR}–${LAST_YEAR}`}</Kicker>
          <PageTitle>Who announced the money, when, and what the voters did next</PageTitle>
          <Standfirst>
            Some say India&apos;s cash-transfer schemes buy elections. Others say they are welfare that happens to be popular. This page
            does not choose. Scrub the years to see where state schemes ran and where elections fell, including every election no scheme
            preceded. Then click a state or a scheme to see who announced it, what it paid and what became of it. Every party is measured
            in the same columns.
          </Standfirst>
          {EMPTY && (
            // Not the shared Callout: its label is upper-cased by CSS, and the words a reader
            // (and a screen reader) meet should be the words written here.
            <div className="border border-border-light bg-bg-elevated rounded-lg overflow-hidden my-6">
              <p className="font-mono text-[12px] tracking-wide px-4 py-2 border-b border-border text-text-muted">Register not yet promoted</p>
              <p className="px-4 py-4 text-[15px] leading-relaxed text-text-secondary max-w-[70ch]">The distribution-funds research has not been promoted into this build. Nothing below is zero. It is unmeasured.</p>
            </div>
          )}
          <Byline>{byline}</Byline>
          {narrow && !EMPTY && <p className="font-mono text-[12px] text-text-muted mt-2">{facts.slice(2).map(factText).join(' · ')}</p>}
        </header>

        <div data-pinned-stack="" className="sticky top-0 z-30 -mx-4 px-4 py-1.5 bg-bg/95 border-b border-border-light">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 font-mono text-[12px] leading-4">
            {EMPTY ? <span className="text-text">0 schemes</span> : stripFactsShown.map((x) => <span key={x.label} className="text-text-secondary">{factText(x)}</span>)}
            {filtered && <span className="text-amber">{`filtered ${TOTAL_SCHEMES} → ${all.length}`}</span>}
            <span className="text-text-muted sm:ml-auto max-sm:order-first">{`as of ${AS_OF_LABEL}`}</span>
          </div>
          {scrubber}
        </div>
        {(afs || sel || f.view === 'table') && (
          // Filters, the selection and the view are three different things, printed as three
          // clauses: only the first changes a population, so only it offers a reset.
          <p className="font-mono text-[12px] text-text-secondary mt-1.5">
            {afs && <>{`filters: ${afs} · `}<button type="button" onClick={reset} className="underline underline-offset-2 hover:text-accent">reset</button></>}
            {sel && `${afs ? ' · ' : ''}selected: ${sel}`}
            {f.view === 'table' && `${afs || sel ? ' · ' : ''}shown as: view=table`}
          </p>
        )}

        {f.ignored.map((p) => <p key={p} className="font-mono text-[12px] text-amber mt-1">{`ignored an unrecognised ${p} value`}</p>)}
        {f.unavailable && <p className="font-mono text-[12px] text-amber mt-1">{`m=${f.mRequested} needs this: ${f.unavailable}; showing Schemes live`}</p>}
        {yScrub && <p className="font-mono text-[12px] text-text-secondary mt-1">{`${yScrub.stateLive} state schemes live of ${statePool.length} in view · ${yScrub.elections} assembly elections`}</p>}

        <div className="mt-3">
          {narrow ? (
            <details>
              <summary className="cursor-pointer font-mono text-[12px] text-text py-1">{`Filters (${activeCount}) · ${TOTAL_SCHEMES} → ${all.length} schemes`}</summary>
              <div className="mt-2">{filterBody}</div>
            </details>
          ) : filterBody}
          {narrow && <div className="mt-2">{chips}</div>}
          {effect}
          {f.party && <p className="text-[14px] text-text-secondary mt-1">Showing one side. The control and the by-party tables below always measure every party. <HashLink to="control">Go to the control</HashLink></p>}
        </div>

        <div className="mt-4 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-x-6">
          <p className="xl:col-start-1"><a href="#stage-tables" onClick={(e) => { e.preventDefault(); skip(); }} className="text-[13px] underline underline-offset-2 hover:text-accent">{EMPTY ? 'Skip to tables (empty: register not yet promoted)' : 'Skip to this stage as tables'}</a></p>
          {f.view === 'map' && (
            <figure className="m-0 xl:col-start-1 min-w-0">
              {aboveMap}
              <div className="relative">
                <WelfareMap ref={mapRef} rows={byCode} ballots={ballots} selected={f.st} height={mapHeight} ariaLabel={mapAria} describedBy="wf-status wf-legend"
                  onSelect={(st) => selectState(st)} onHover={setHoverSt} onFocusState={onFocusState} />
                {!narrow && readSt && (
                  <div className="pointer-events-none absolute top-2 left-2 max-w-[18rem] rounded-lg border border-border-light bg-bg-elevated/95 px-3 py-2 text-[12.5px] text-text-secondary space-y-1">
                    {readoutLines(readSt).map((l, i) => <p key={i} className={i === 0 ? 'text-text' : ''}>{l}</p>)}
                  </div>
                )}
              </div>
              <figcaption id="wf-status" className="mt-2">
                <ul className="text-[14px] text-text-secondary leading-relaxed sm:[&>li]:inline sm:[&>li:not(:last-child)]:after:content-['_·']">
                  {clauses.map((c, i) => <Fragment key={i}>{i > 0 ? ' ' : ''}<li>{c}</li></Fragment>)}
                </ul>
              </figcaption>
              {narrow && f.y != null && <YearElectionList y={f.y} rows={yRows} search={search} />}
            </figure>
          )}
          {f.view === 'map' && <div className="xl:col-start-2 xl:row-start-1 xl:row-span-4 xl:self-start xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto mt-4 xl:mt-0 min-w-0">{margin}</div>}
          {f.view === 'map' && (
            <div id="wf-legend" className="xl:col-start-1 mt-3 text-[13px] text-text-muted space-y-1">
              {legendLines}
            </div>
          )}
          {f.view === 'map' && (
            <div className="xl:col-start-1 min-w-0">
              <TimeLanes asOf={AS_OF} runId={RUN_ID} year={f.y} onYear={setYear} coverage={cov} coverageLabel={coverageLabel}
                allStates={scrub.map((r) => ({ year: r.year, launches: r.launches, elections: eRows.filter((x) => x.e.date.startsWith(String(r.year))) }))}
                preview={preview}
                central={{ lanes: lanesCentral, elections: lsRows, hidden: centralHidden }}
                state={f.st ? { label: stateName(f.st), lanes: lanesState, elections: stateElect } : null}
                selected={f.s}
                onLane={(id) => patch({ s: id })}
                narrow={narrowCtx}
                summary={`The clock: ${lanesCentral.length} central lanes, ${lanesState.length} state lanes, ${eRows.length} assembly and ${lsRows.length} Lok Sabha elections · run ${RUN_ID}`}
                footer={glyphRow} />
            </div>
          )}
        </div>

        <div className="mt-6">
          <Caption id="C1">{`Colour is ${label.charAt(0).toLowerCase()}${label.slice(1)} for state schemes recorded in this file, not every scheme in India. Central schemes apply to every state and run in the band under the map. Painting them would shift every state by the same amount. Colour never encodes party.`}</Caption>
          {f.m === 'live' && (
            <Caption id="C2">
              {`With no year chosen, the count is cumulative and includes schemes since discontinued. A count measures the research sweep as much as the state. A state with more schemes here may have been researched more closely. ${launchText}${coverageHere ? '' : ' No research file declares which state-years it searched completely, so the map cannot show any state as having had no scheme. It can only show that none is recorded.'}`}

            </Caption>
          )}
          {money && <Caption id="C3">{`Financial year ${fy ?? ''}, nominal rupees, not adjusted for inflation, so do not compare shades across decades. Budgeted and actual are never combined. Where only some live schemes have a figure, the state is stippled, because a partial sum is a lower bound. Share of state budget is as each source states it, and sources differ on the base (total or revenue expenditure).`}</Caption>}
          {f.m === 'perhead' && <Caption id="C4">This is the amount one eligible beneficiary was entitled to per year, computed here from the recorded monthly or annual amount. It divides nothing by enrolment; enrolment snapshots are in the scheme card and are not a series. It is converted only from monthly or annual amounts. Per-acre, per-season, one-time and in-kind benefits are stippled, not converted. This is what one person was entitled to, not what reached them. Some schemes pay per person, others per household or per farmer family. Where a state runs two schemes in the category, the larger is shown and both are named, because adding them would count one person twice. Not per capita: the file has no population denominator.</Caption>}
          {f.y != null && <Caption id="C5">Every assembly election in the file is marked, not only those a scheme preceded. The file holds the elections the research needed, not every Indian election. The lid marks timing, not cause. Anti-incumbency, alliances, challenger promises, national swings, delimitation and candidates are not controlled. Coalition outcomes are not forced into kept or lost.</Caption>}
          <Caption id="C6">Current boundaries. Before 2014, Telangana shows undivided Andhra Pradesh. Jammu &amp; Kashmir is drawn including Ladakh. From 2020, Dadra &amp; Nagar Haveli and Daman &amp; Diu carry the merged UT&apos;s value. Chhattisgarh, Jharkhand and Uttarakhand, formed in November 2000, are drawn for all of 2000.</Caption>
          <Caption id="C7">{`Every election carries the same 12-month band, whether or not a scheme falls in it. There is an assembly election somewhere in India almost every year, so a launch in an election year is the base case, not a signal. Bars run from launch to a dated discontinuation, and an undated end is drawn to the file's as-of date and labelled.${c7partial}`}</Caption>
        </div>

        <StageTwins ref={tablesH3} f={f} rows={rows} ballots={yRows} lanes={lanesAll}
          elections={[...eRows, ...lsRows].sort((a, b) => (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : (a.e.st ?? '') < (b.e.st ?? '') ? -1 : 1))}
          open={twinsOpen} ctx={ctx} search={search} filtersText={afs} asOfLabel={AS_OF_LABEL} />

        <ControlSection f={f} empty={EMPTY || !ASSEMBLY.length} rows={eRows} windows={windows} ctx={controlCtx} narrow={narrow} search={search} />
        <MinistersSection f={f} empty={EMPTY} ctx={ctx} search={search} onPerson={openPerson} twinsOpen={twinsOpen} />
        <AfterSection f={f} empty={EMPTY} ctx={ctx} search={search} />
        <BenefitsSection f={f} empty={EMPTY} ctx={ctx} search={search} />
        <FindingsSection f={f} empty={EMPTY} search={search} />
        <Section id="narratives" title="Narratives, rated">
          {EMPTY && <p className="text-[14px] text-text-secondary mb-4">Nothing recorded yet.</p>}
          <NarrativeLadder rows={WELFARE_NARRATIVE_LIST} />
          <Caption id="C14">The rating is the research file&apos;s judgement of the evidence under the tier rules, not a verdict on anyone&apos;s intent. &lsquo;Cash buys votes&rsquo; and &lsquo;cash is welfare&rsquo; are rated the same way.</Caption>
        </Section>
        <GraphSection ctx={ctx} narrow={narrow} twinsOpen={twinsOpen} />
        <MissingSection empty={EMPTY} gaps={gaps} />

        <Section id="sources" title="Sources">
          {ledger.length ? <SourceLedger entries={ledger} /> : <p className="text-[14px] text-text-secondary">No source recorded yet.</p>}
          <TierLegend />
        </Section>
        <Footnote>
          <p>This page records public schemes, public offices and published claims. It asserts no motive and no offence. Allegations are attributed and paired with the response of those they concern. Persons appear only in public roles. Beneficiaries appear only as classes.</p>
          <p>{`run ${RUN_ID}`}</p>
        </Footnote>
      </article>
      </Go.Provider>
    </>
  );
}

