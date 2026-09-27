import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Kicker } from '../components/Editorial';
import { useData } from '../context/DataContext';
import type { StateCode } from '../graph/schema';
import {
  type Lens, type Filters, LENS_LABEL, MODULES, parseFilters, activeTerms, PAGE_PARAMS, isEmpty, FLEET_NAME, RUN, ASOF_LABEL, FILES_TOTAL, VERDICTS_TOTAL,
  loanStateRows, LOANS, strictSt, loanPass, ACTIONS, isAggregateId, nodeOf, EDGE_BY_ID, LENS_OF_EDGE, holderLabel, stateName, STATE_CODES, CASE_TARGETS, derivedFor,
  LENDER_IDS, HOLDER_IDS, labelOf, pToken, CONTRACTS, OWN_IDX, hasRupee, fmtCr, NO_AMOUNT, isCensus, inYear, CENSUS, BAND_A, BAND_B,
} from '../data/financeView';
import { Page, useNarrow, openTwinAndFocus, TARGET_RING, type ListFocus } from '../components/finance/ui';
import { Strip, MovedFacts, ReconciliationLine, ActiveFilters, Notices, LensTabs, FilterRail, ReadingKey, ControlCard, lensPopulation } from '../components/finance/Control';
import LoanMap from '../components/finance/LoanMap';
import LoanFlow from '../components/finance/LoanFlow';
import LoanClock from '../components/finance/LoanClock';
import { RecordsStrip, ProjectList, ContractsSection, DebarmentsSection, ConditionsSection, DebtSection } from '../components/finance/LoansLens';
import { ReceiptsByYear, StateReceipts, ActionsTimeline, ActionsList, GrantsSection, WelfareJoinSection } from '../components/finance/AssociationsLens';
import { HolderMatrix, OutsideIndex, MandatesSection, LicencesSection, RulesSection } from '../components/finance/CapitalLens';
import { RecordCard, StatePanel, HolderCard } from '../components/finance/Panels';
import { BaseRatesSection, NarrativesSection, CannotShow, GapsSection, ContestedSection, RefusalsSection, SourceLedger, ConnectionsSection } from '../components/finance/Sections';

/**
 * /finance — foreign money: loans, associations, capital. Spec: docs/design/FINANCE_PAGE.md.
 *
 * The page owns the URL, focus, the one live region and the margin; every figure is
 * read from src/data/financeView.ts and every graphic has a table twin built from the
 * same rows. Nothing is fetched. Three lenses share one stage: the chrome (strip,
 * tabs, rail, graph, contested, gaps, refusals, sources) is constant and only the
 * centre and the lens sections change.
 */

// Below 640px no mono text is smaller than 12px (spec §12). Quoted research text reads in
// the body colour. The house greys (--color-text-secondary #9c9688, --color-text-muted
// #8a8477) are warm, i.e. they carry a hue, and on this page they would colour lines that
// name a party or a government (§8.1, AC-107); so the page declares two neutral grey
// tokens of its own and maps the house classes onto them. Reduced motion turns every
// transition in the document off while this page is mounted, the site chrome included:
// the house stylesheet has no reduced-motion rule of its own, and a reader who asked for
// no motion gets none anywhere on screen (§13, AC-103). A site-wide rule and neutral
// tokens in index.css would make both blocks redundant. Quoted research text can hold an
// unbroken URL, so it breaks anywhere rather than widen \`main\` past a phone (A11Y-005 S2).
// A selected tab and a pressed toggle carry weight and a 2 px bar, not only a hue, and the
// bar takes the system colour under forced colours (M2).
const PAGE_CSS = `
@media (max-width: 639px) {
  .fin-page [class*="text-[9"], .fin-page [class*="text-[10"], .fin-page [class*="text-[11"] { font-size: 12px !important; }
}
.fin-page { --fin-grey-secondary: rgb(176, 176, 176); --fin-grey-muted: rgb(150, 150, 150); }
.fin-page .fin-q { color: var(--color-text); }
.fin-page .text-text-secondary { color: var(--fin-grey-secondary); }
.fin-page .text-text-muted { color: var(--fin-grey-muted); }
@media (prefers-reduced-motion: reduce) {
  html, html *, html *::before, html *::after { transition-property: none !important; transition-duration: 0s !important; animation: none !important; scroll-behavior: auto !important; }
}
.fin-page .fin-q { overflow-wrap: anywhere; }
.fin-page li, .fin-page dd, .fin-page [data-page-copy] { overflow-wrap: break-word; }
.fin-page .fin-pressed[aria-pressed="true"], .fin-page .fin-pressed[aria-selected="true"] { position: relative; font-weight: 600; }
.fin-page .fin-pressed[aria-pressed="true"]::after, .fin-page .fin-pressed[aria-selected="true"]::after {
  content: ""; position: absolute; left: 6px; right: 6px; bottom: 2px; height: 0; border-bottom: 2px solid var(--color-accent); pointer-events: none;
}
@media (forced-colors: active) {
  .fin-page .fin-pressed[aria-pressed="true"]::after, .fin-page .fin-pressed[aria-selected="true"]::after { border-bottom-color: ButtonText; }
}`;

const WIDE = '(min-width: 1280px)';
function useWide() {
  const [w, setW] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);
  useEffect(() => { const mq = window.matchMedia(WIDE); const on = () => setW(mq.matches); mq.addEventListener('change', on); on(); return () => mq.removeEventListener('change', on); }, []);
  return w;
}

const STANDFIRST = 'Money from abroad reaches India in three ways this page records: loans to governments and public bodies, contributions to associations, and holdings in listed companies. Each is drawn from a register with sources and evidence tiers. Each total says which records it counts and which it cannot. Institutions are shown against their peers, never alone.';
const STANDING = 'Rothschild & Co and BlackRock Inc. appear here as companies, beside comparison companies. No family, religion or ethnicity is a node, an edge, a filter or a colour on this page.';
const LENS_H2: Record<Lens, string> = {
  loans: 'Loans: sovereign and sub-sovereign lending',
  associations: 'Associations: foreign contributions and the Home Ministry',
  capital: 'Capital: foreign holders, mandates and rules',
};

export default function Finance() {
  const [routerParams, setRouterParams] = useSearchParams();
  const { nodes: platformNodes } = useData();
  const narrow = useNarrow();
  const wide = useWide();
  // The router commits inside a transition; the copy here follows it for back/forward
  // and is written with it on every control, so a choice is on screen in the same event.
  const routerKey = routerParams.toString();
  const [key, setKey] = useState(routerKey);
  useEffect(() => { setKey(routerKey); }, [routerKey]);
  const params = useMemo(() => new URLSearchParams(key), [key]);
  const f = useMemo(() => parseFilters(params), [params]);
  const lens = f.lens;
  const empty = isEmpty(lens);

  const [live, setLive] = useState(() => {
    const p = new URLSearchParams(routerKey);
    const out: string[] = [];
    if (p.get('view') === 'table') out.push('shown as tables');
    return out.join('; ');
  });
  const announce = useCallback((m: string) => setLive(m), []);

  const setParams = useCallback((next: URLSearchParams) => {
    setKey(next.toString());
    setRouterParams(next, { replace: true });
  }, [setRouterParams]);
  const patch = useCallback((kv: Record<string, string | null>) => {
    const next = new URLSearchParams(key);
    for (const [k, v] of Object.entries(kv)) { if (v == null || v === '') next.delete(k); else next.set(k, v); }
    setParams(next);
    const nf = parseFilters(next);
    if (Object.keys(kv).some((k) => ['y', 'st', 'lender', 'inc'].includes(k))) {
      const pop = lensPopulation(nf.lens, nf);
      announce(`from ${pop.n} to ${pop.k} ${pop.unit}`);
    }
  }, [key, setParams, announce]);
  const hrefWith = useCallback((kv: Record<string, string | null>) => {
    const next = new URLSearchParams(key);
    for (const [k, v] of Object.entries(kv)) { if (v == null || v === '') next.delete(k); else next.set(k, v); }
    const s = next.toString();
    return s ? `?${s}` : '';
  }, [key]);

  // ------------------------------------------------------------------ focus
  const opener = useRef<HTMLElement | SVGElement | null>(null);
  const panelH2 = useRef<HTMLHeadingElement>(null);
  const lensH2 = useRef<HTMLHeadingElement>(null);
  const connH2 = useRef<HTMLHeadingElement>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const focusNext = useRef<'panel' | 'lens' | 'conn' | 'opener' | null>(null);
  useEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    focusNext.current = null;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (want === 'panel') panelH2.current?.focus();
      else if (want === 'lens') lensH2.current?.focus();
      else if (want === 'conn') { document.getElementById('connections')?.scrollIntoView({ block: 'start' }); connH2.current?.focus(); }
      else if (want === 'opener') { const el = opener.current; if (el && el.isConnected) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } }
    }));
  });

  const openRecord = useCallback((id: string, el: HTMLElement | null) => {
    opener.current = el;
    focusNext.current = 'panel';
    const home = LENS_OF_EDGE.get(id);
    const inFind = !!el?.closest('[role="search"]');
    patch(inFind && home && home !== lens ? { rec: id, lens: home === 'loans' ? null : home } : { rec: id });
    announce(`Record ${EDGE_BY_ID.get(id)?.lab ?? id} opened`);
  }, [patch, announce, lens]);
  const showConnections = useCallback((id: string, el: HTMLElement | null) => {
    opener.current = el;
    focusNext.current = 'conn';
    patch({ focus: id, hops: '1', sel: id });
    announce(`connections for ${labelOf(id)}`);
  }, [patch, announce]);
  const closePanel = useCallback((param: 'rec' | 'st' | 'holder') => {
    focusNext.current = 'opener';
    patch({ [param]: null });
    announce('panel closed');
  }, [patch, announce]);
  const selectState = useCallback((st: StateCode | null, via: 'pointer' | 'keyboard') => {
    if (st) { opener.current = mapRef.current; focusNext.current = 'panel'; }
    else if (via === 'keyboard') { focusNext.current = 'opener'; opener.current = mapRef.current; }
    patch({ st, tp: null });
    announce(st ? `${stateName(st)} opened` : 'state cleared');
  }, [patch, announce]);
  const pickLens = useCallback((l: Lens) => {
    focusNext.current = 'lens';
    const next = new URLSearchParams(key);
    if (l === 'loans') next.delete('lens'); else next.set('lens', l);
    next.delete('rec'); next.delete('tp'); next.delete('inc');
    setParams(next);
    announce(`${LENS_LABEL[l]} lens`);
  }, [key, setParams, announce]);
  const reset = useCallback(() => {
    const next = new URLSearchParams(key);
    for (const k of PAGE_PARAMS) if (k !== 'lens' && k !== 'view') next.delete(k);
    setParams(next);
    announce('filters reset');
  }, [key, setParams, announce]);

  // A band or the unplaced segment narrows the list in-page (§5.1.2, NotPlacedBox); a
  // lens change drops it, because the list it narrows belongs to the Loans lens.
  const [listFocus, setListFocus] = useState<ListFocus | null>(null);
  useEffect(() => { if (lens !== 'loans') setListFocus(null); }, [lens]);

  const filterText = activeTerms(params, f).filter((t) => !t.startsWith('lens=') && !t.startsWith('view=') && !t.startsWith('rec=') && !t.startsWith('tp=')).join(', ');
  const ctx = useMemo(() => ({ announce, lens, filters: filterText, openRecord, showConnections, patch, hrefWith, narrow, empty, listFocus, setListFocus }), [announce, lens, filterText, openRecord, showConnections, patch, hrefWith, narrow, empty, listFocus]);

  // ------------------------------------------------------------------ counts
  const stateCounts = useMemo(() => {
    const m = new Map<string, number>();
    const noSt: Filters = { ...f, st: null };
    for (const c of STATE_CODES) m.set(c, 0);
    if (lens === 'loans') for (const e of LOANS) { const s = strictSt(e); if (s && loanPass(noSt, e, { inc: true })) m.set(s, (m.get(s) ?? 0) + 1); }
    else if (lens === 'associations') for (const e of ACTIONS) { const s = nodeOf(e.t)?.st; if (s && !isAggregateId(e.t) && f.tiers.has(e.tier) && inYear(f, e.from)) m.set(s, (m.get(s) ?? 0) + 1); }
    return m;
  }, [f, lens]);
  const rows = useMemo(() => loanStateRows(f), [f]);
  const mapH = narrow ? Math.max(300, Math.min(420, (typeof window !== 'undefined' ? window.innerWidth : 390) * 0.7)) : Math.max(420, Math.min(560, (typeof window !== 'undefined' ? window.innerHeight : 800) - 380));

  // ------------------------------------------------------------------ chrome pieces
  const byline: ReactNode[] = [
    <span key="b">{(['loans', 'associations', 'capital'] as Lens[]).map((l) => (MODULES[l].meta.empty ? `${FLEET_NAME[l]}: register not yet promoted` : `${FLEET_NAME[l]} ${RUN[l]}`)).join(' · ')}{` · records read up to ${ASOF_LABEL}`}</span>,
    <span key="f">{`Built from ${FILES_TOTAL} research files to a published contract and cross-examined (${VERDICTS_TOTAL} audit verdicts). It asserts no offence by any named person.`}</span>,
  ];
  const standing = <p data-page-copy="" className="text-[13px] xl:text-[12.5px] text-text mt-1 max-w-[72ch]">{STANDING}</p>;
  // Where the fold is tightest (≥1280px) the byline sits at the head of the margin; a
  // phone reads it in the list under the first figcaption; in between, under the header.
  const bylineBlock = (
    <div className="font-mono text-[11px] text-text-muted tracking-wide space-y-1 my-2">
      <p>{byline[0]}</p>
      <p>{byline[1]}</p>
    </div>
  );
  const cannotCount = MODULES[lens].voids.length + MODULES[lens].gaps.length;
  const cannotLine = <p className="text-[13px] text-text-secondary"><a href="#cannot" className="underline" onClick={(e) => { e.preventDefault(); document.getElementById('cannot')?.scrollIntoView({ block: 'start' }); }}>{`${cannotCount} voids and gaps for this lens, and ${derivedFor(lens).length} derived by this page — see What this lens cannot show`}</a></p>;

  const recKnown = f.rec && EDGE_BY_ID.has(f.rec);
  const panel: ReactNode = f.rec ? (
    <RecordCard key={`rec-${f.rec}`} id={f.rec} lens={lens} origin={recKnown ? 'the list' : 'the page'} headingRef={panelH2} onClose={() => closePanel('rec')}
      onGo={(l, id) => `?${new URLSearchParams({ lens: l, rec: id }).toString()}`} />
  ) : f.st && lens !== 'capital' ? (
    <StatePanel key={`st-${f.st}`} st={f.st} lens={lens} f={f} origin="the map" headingRef={panelH2} onClose={() => closePanel('st')} />
  ) : f.holder && lens === 'capital' ? (
    <HolderCard key={`h-${f.holder}`} id={f.holder} origin="the matrix" headingRef={panelH2} onClose={() => closePanel('holder')} />
  ) : null;

  const keyAndMoved = (
    <>
      {!wide && !(narrow && lens === 'loans') && <ReadingKey />}
      {narrow && <MovedFacts lens={lens} f={f} byline={byline} />}
      {narrow && <ReconciliationLine lens={lens} f={f} asList />}
    </>
  );

  // ------------------------------------------------------------------ lens centres
  let centre: ReactNode;
  let sections: ReactNode;
  if (lens === 'loans') {
    centre = (
      <>
        <LoanMap f={f} rows={rows} captionIds={{ c1: 'fin-c1', c2: MODULES.loans.baseRates.some((r) => r.domain === 'worldbank-projects') ? 'fin-c2' : null }} onSelect={selectState} mapRef={mapRef} narrow={narrow} height={mapH} afterCaption={keyAndMoved} afterBar={narrow ? <ReadingKey /> : null} />
        <LoanFlow f={f} captionId="fin-c3" narrow={narrow} />
        <LoanClock f={f} captionId="fin-c4" narrow={narrow} />
        <RecordsStrip f={f} captionId="fin-c5" />
        <ProjectList f={f} onPage={(tp) => { patch({ tp: tp <= 1 ? null : String(tp) }); requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLElement>('details[data-twin="project-list"] caption')?.focus())); }} />
      </>
    );
    sections = (
      <>
        <ContractsSection f={f} captionId="fin-c6" />
        <DebarmentsSection f={f} captionId="fin-c7" />
        <ConditionsSection f={f} />
        <DebtSection />
      </>
    );
  } else if (lens === 'associations') {
    centre = (
      <>
        <ReceiptsByYear f={f} captionId="fin-c8" />
        {keyAndMoved}
        <StateReceipts f={f} />
        <ActionsTimeline f={f} captionId="fin-c9" />
        <ActionsList f={f} />
      </>
    );
    sections = (
      <>
        <GrantsSection f={f} />
        <WelfareJoinSection f={f} captionId="fin-c10" />
      </>
    );
  } else {
    centre = (
      <>
        <HolderMatrix f={f} captionId="fin-c11" />
        {keyAndMoved}
        <OutsideIndex f={f} />
      </>
    );
    sections = (
      <>
        <MandatesSection f={f} captionId="fin-c12" />
        <LicencesSection f={f} />
        <RulesSection f={f} captionId="fin-c13" />
      </>
    );
  }

  const pop = lensPopulation(lens, f);
  const noMatch = !empty && f.tiers.size === 0;

  return (
    <Page.Provider value={ctx}>
      <article className="pb-20 fin-page">
        <style>{PAGE_CSS}</style>
        <header className="xl:grid xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:gap-x-8">
          <div>
            <Kicker>Foreign money · loans, foreign contributions, foreign capital</Kicker>
            <h1 className="heading-editorial font-bold text-3xl sm:text-4xl xl:text-[1.9rem] text-balance mb-2">Who lent, who gave, who holds, and what the record can show</h1>
          </div>
          <div>
            <p data-page-copy="" className="text-[14px] xl:text-[13px] xl:leading-[1.5] text-text-secondary leading-relaxed max-w-[72ch]">{STANDFIRST}</p>
            {standing}
          </div>
        </header>
        {!narrow && !wide && bylineBlock}
        {empty && (
          // The house Callout upper-cases its label; this one keeps the words as written,
          // so the label a reader and a screen reader meet is the label in the spec.
          <div role="note" className="border border-amber/40 bg-amber/[0.06] rounded-lg my-4 overflow-hidden">
            <p className="font-mono text-[12px] tracking-wide px-4 py-2 border-b border-border text-text">Register not yet promoted</p>
            <p className="px-4 py-3 text-[14px] text-text-secondary max-w-[72ch]">{`The ${MODULES[lens].fleet} register has not been promoted into this build: every surface on this lens says so, and nothing below is a zero.`}</p>
          </div>
        )}
        <div data-pinned-stack="" className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border py-1.5 mt-3 space-y-1">
          <Strip lens={lens} f={f} narrow={narrow} />
          {!narrow && <ReconciliationLine lens={lens} f={f} asList={false} />}
          {narrow && <LensTabs lens={lens} onPick={pickLens} />}
        </div>
        <Notices f={f} />
        <ActiveFilters params={params} f={f} onReset={reset} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
          {!narrow && <LensTabs lens={lens} onPick={pickLens} />}
          <button type="button" className="font-mono text-[12px] border border-border-light rounded px-2 min-h-[32px]"
            onClick={async () => { try { await navigator.clipboard.writeText(location.href); announce('Link copied'); } catch { announce('Copy refused by the browser: the address bar holds the link'); } }}>Copy link</button>
          <button type="button" aria-pressed={f.view === 'table'} className={`fin-pressed font-mono text-[12px] border rounded px-2 min-h-[32px] ${f.view === 'table' ? 'border-accent text-text' : 'border-border-light'}`}
            onClick={() => { const on = f.view !== 'table'; patch({ view: on ? 'table' : null }); announce(on ? 'shown as tables' : 'shown as stage'); }}>Table view</button>
          <a href="#twin-first" className="font-mono text-[12px] underline text-text-secondary"
            onClick={(e) => { e.preventDefault(); patch({ view: 'table' }); announce('shown as tables'); const first = document.querySelector('details[data-twin]')?.getAttribute('data-twin'); if (first) openTwinAndFocus(first); }}>
            Every graphic on this lens has a table; show them all
          </a>
        </div>
        <Find f={f} lens={lens} patch={patch} announce={announce} openRecord={openRecord} showConnections={showConnections} pickLens={pickLens} />
        {!wide && panel}

        <div className="mt-4 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-x-6">
          <div className="xl:col-start-2 xl:row-start-1 min-w-0 mb-4">
            <FilterRail lens={lens} f={f} stateCounts={stateCounts} narrow={narrow} />
          </div>
          <div role="tabpanel" id={`fin-panel-${lens}`} aria-labelledby={`fin-tab-${lens}`} className="xl:col-start-1 xl:row-start-1 xl:row-span-2 min-w-0">
            <h2 ref={lensH2} tabIndex={-1} className={`sr-only focus-visible:not-sr-only focus-visible:block focus-visible:text-[15px] focus-visible:text-text focus-visible:mb-2 ${TARGET_RING}`}>{LENS_H2[lens]}</h2>
            {noMatch && (
              <p className="text-[14px] text-text my-2">
                {`No record in this register matches ${filterText || 'these filters'}. This is a statement about the register, not about India. `}
                <button type="button" className="underline" onClick={() => patch({ tier: null })}>reset tier</button>
              </p>
            )}
            {!noMatch && pop.k === 0 && !empty && lens !== 'capital' && <p className="text-[14px] text-text my-2">{`No record in this register matches ${filterText || 'these filters'}. This is a statement about the register, not about India.`}</p>}
            {centre}
            {!wide && <ControlCard lens={lens} />}
            {!wide && cannotLine}
            {sections}
          </div>
          {wide && (
            <aside className="xl:col-start-2 xl:row-start-2 min-w-0" aria-label="Margin">
              {bylineBlock}
              {panel}
              <ReadingKey />
              <ControlCard lens={lens} />
              {cannotLine}
            </aside>
          )}
        </div>

        <BaseRatesSection lens={lens} />
        <NarrativesSection lens={lens} withHook={lens === 'loans'} />
        <CannotShow lens={lens} />
        <ConnectionsSection f={f} extraNodes={platformNodes} headingRef={connH2} withHook={lens === 'loans'}
          onShowProjects={(id) => { const n = nodeOf(id); if (n?.st) patch({ st: n.st }); document.getElementById('twin-project-list')?.scrollIntoView({ block: 'start' }); }} />
        <ContestedSection lens={lens} f={f} />
        <GapsSection lens={lens} />
        <RefusalsSection />
        <SourceLedger lens={lens} f={f} />
        <div aria-live="polite" className="sr-only">{live}</div>
      </article>
    </Page.Provider>
  );
}

// ---------------------------------------------------------------------------
// Find (§5.0.5): the journalist's entry; filters nothing, never auto-selects
// ---------------------------------------------------------------------------

interface Hit { kind: 'entity' | 'record'; id: string; label: string; rank: number; lens: Lens; token: string | null; sub?: string | null }

const ALL_RECORDS = [...LOANS, ...CONTRACTS, ...ACTIONS, ...OWN_IDX];
const ENTITY_NODES = (() => {
  const m = new Map<string, { id: string; label: string; al: string[]; sub: string | null; lens: Lens }>();
  for (const l of ['loans', 'associations', 'capital'] as Lens[]) for (const n of MODULES[l].nodes) if (!m.has(n.id)) m.set(n.id, { id: n.id, label: n.label, al: n.al ?? [], sub: n.sub ?? null, lens: l });
  return [...m.values()];
})();

function search(q: string): Hit[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const out: Hit[] = [];
  for (const n of ENTITY_NODES) {
    const lab = n.label.toLowerCase();
    const rank = lab === s ? 0 : n.al.some((a) => a.toLowerCase() === s) ? 1 : lab.includes(s) || n.al.some((a) => a.toLowerCase().includes(s)) ? 2 : (n.sub ?? '').toLowerCase().includes(s) ? 3 : -1;
    if (rank >= 0) out.push({ kind: 'entity', id: n.id, label: n.label, rank, lens: n.lens, token: null, sub: n.sub });
  }
  for (const e of ALL_RECORDS) {
    const lab = (e.lab ?? '').toLowerCase();
    const rank = lab === s ? 0 : lab.includes(s) ? 3 : -1;
    if (rank >= 0 && e.id) out.push({ kind: 'record', id: e.id, label: e.lab ?? e.id, rank, lens: LENS_OF_EDGE.get(e.id) ?? 'loans', token: e.pred === 'loan' || e.pred === 'award' ? pToken(e.lab) : null });
  }
  return out.sort((a, b) => a.rank - b.rank || (a.label < b.label ? -1 : a.label > b.label ? 1 : a.id < b.id ? -1 : 1));
}

function Find({ f, lens, patch, announce, openRecord, showConnections, pickLens }: {
  f: Filters; lens: Lens; patch: (kv: Record<string, string | null>) => void; announce: (m: string) => void;
  openRecord: (id: string, el: HTMLElement | null) => void; showConnections: (id: string, el: HTMLElement | null) => void; pickLens: (l: Lens) => void;
}) {
  const [draft, setDraft] = useState(f.find);
  const [all, setAll] = useState(false);
  const timer = useRef<number | null>(null);
  const first = useRef(true);
  useEffect(() => { setDraft(f.find); }, [f.find]);
  const hits = useMemo(() => search(draft), [draft]);
  useEffect(() => {
    if (first.current) { first.current = false; if (f.find) announce(`${hits.length} matches for ${f.find}`); return; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onChange = (v: string) => {
    setDraft(v);
    setAll(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      patch({ find: v || null });
      if (v) announce(`${search(v).length} matches for ${v}`);
    }, 300);
  };
  const entities = hits.filter((h) => h.kind === 'entity');
  const records = hits.filter((h) => h.kind === 'record');
  const recordRow = (h: Hit) => {
    const e = EDGE_BY_ID.get(h.id)!;
    const amt = e.pred === 'loan' ? (hasRupee(e) ? `₹${fmtCr(e.a as number)} cr` : NO_AMOUNT) : hasRupee(e) ? `₹${fmtCr(e.a as number)} cr` : 'no amount in the record';
    const pop = e.pred === 'loan' ? (isCensus(e) ? 'census' : 'researched') : LENS_LABEL[h.lens].toLowerCase();
    return (
      <li key={h.id} className="text-[13px]">
        <button type="button" aria-label={`Open record: ${h.label}`} className="underline mr-1" onClick={(ev) => openRecord(h.id, ev.currentTarget)}>Open record</button>
        {`${h.label} — ${e.from ?? 'undated'} · ${labelOf(e.s)} · ${amt} · ${e.tier} · ${pop}`}
      </li>
    );
  };
  const cap = (list: Hit[]) => (all ? list : list.slice(0, 8));
  const refine = (list: Hit[]) => (list.length > 8 && !all ? (
    <li className="font-mono text-[12px] text-text-muted">{`${list.length} matches — refine by year or lender, or `}<button type="button" className="underline" onClick={() => setAll(true)}>{`list all ${list.length}`}</button></li>
  ) : null);
  const grouped = (() => {
    const list = cap(records);
    const byToken = new Map<string, Hit[]>();
    for (const h of list) if (h.token) { if (!byToken.has(h.token)) byToken.set(h.token, []); byToken.get(h.token)!.push(h); }
    const seen = new Set<string>();
    const out: ReactNode[] = [];
    for (const h of list) {
      if (h.token && (byToken.get(h.token)?.length ?? 0) > 1) {
        if (seen.has(h.token)) continue;
        seen.add(h.token);
        const g = byToken.get(h.token)!;
        out.push(<li key={`g-${h.token}`}><span className="font-mono text-[12px] text-text-muted">{`${h.token}: ${g.length} records (census and researched)`}</span><ul className="list-none pl-3 m-0">{g.map(recordRow)}</ul></li>);
      } else out.push(recordRow(h));
    }
    return out;
  })();
  const occurrences = (id: string) => {
    const lenses = new Set<string>();
    let k = 0;
    for (const l of ['loans', 'associations', 'capital'] as Lens[]) for (const e of MODULES[l].edges) if (e.s === id || e.t === id) { k++; lenses.add(LENS_LABEL[l]); }
    return `appears in ${k} records across ${[...lenses].join(', ') || 'no lens'}`;
  };
  return (
    <div role="search" aria-label="Find in the three registers" className="mt-3 max-w-[60rem]">
      <label htmlFor="fin-find" className="font-mono text-[11px] text-text-muted block">Find</label>
      <input id="fin-find" type="search" value={draft} placeholder="name, alias, project or place" onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') e.preventDefault(); }}
        className="w-full sm:w-[28rem] bg-bg-elevated border border-border-light rounded px-2 min-h-[36px] text-[14px]" />
      {draft.trim() && (
        <div className="mt-2 text-[13px]">
          {!hits.length && <p>{`No entity or record in the three registers matches "${draft}". This is a statement about the register, not about the world.`}</p>}
          {entities.length > 0 && (
            <>
              <p className="font-mono text-[11px] text-text-muted">Entities</p>
              <ul className="list-none p-0 m-0 space-y-1">
                {cap(entities).map((h) => {
                  const n = nodeOf(h.id);
                  return (
                    <li key={h.id}>
                      <span className="text-text">{h.label}</span>{h.sub ? <span className="text-text-muted">{` — ${h.sub}`}</span> : null}<span className="font-mono text-[12px] text-text-muted">{` · ${LENS_LABEL[h.lens].toLowerCase()} · ${occurrences(h.id)} `}</span>
                      <button type="button" aria-label={`Show connections for ${h.label}`} className="underline mr-2" onClick={(ev) => showConnections(h.id, ev.currentTarget)}>Show connections</button>
                      {LENDER_IDS.has(h.id) && <button type="button" aria-label={`Use ${h.label} as lender filter`} className="underline mr-2" onClick={() => patch({ lender: h.id, lens: null })}>Use as lender filter</button>}
                      {(HOLDER_IDS.has(h.id) && (BAND_A.some((r) => r.id === h.id) || BAND_B.some((r) => r.id === h.id))) && <button type="button" aria-label={`Highlight ${holderLabel(h.id)}`} className="underline mr-2" onClick={() => patch({ holder: h.id, lens: 'capital' })}>Highlight holder</button>}
                      {CASE_TARGETS.has(h.id) && <button type="button" aria-label={`Go to case file: ${h.label}`} className="underline mr-2" onClick={() => { if (lens !== 'associations') pickLens('associations'); requestAnimationFrame(() => requestAnimationFrame(() => { const s = document.getElementById(`case-${h.id}`); s?.scrollIntoView({ block: 'start' }); s?.querySelector<HTMLElement>('h4')?.focus(); announce(`case file ${h.label}`); })); }}>Go to case file</button>}
                      {n?.ty === 'state' && n.st && <button type="button" aria-label={`Show loans placed in ${stateName(n.st)}`} className="underline mr-2" onClick={() => patch({ st: n.st!, lens: null })}>Show loans placed here</button>}
                    </li>
                  );
                })}
                {refine(entities)}
              </ul>
            </>
          )}
          {records.length > 0 && (
            <>
              <p className="font-mono text-[11px] text-text-muted mt-2">Records</p>
              <ul className="list-none p-0 m-0 space-y-1">
                {grouped}
                {refine(records)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { CENSUS };
