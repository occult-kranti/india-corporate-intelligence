import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { loadSecurity, type SecurityFile } from '../data/cppp';
import type { StateCode } from '../graph/schema';
import {
  type Lens, parseFilters, PAGE_PARAMS, LENS_LABEL, EMPTY, BUDGETS, FOOTPRINT, EDGE_BY_ID, VENDOR_SET, parseCell, labelOf, stateName,
  DEFAULT_STAGE, lensPopulation,
} from '../data/securityView';
import { Page, useNarrow, useWide, FOCUS, TARGET, openTwinAndFocus, reveal, type PageCtx } from '../components/security/ui';
import {
  Head, EmptyCallout, Resolution, Strip, ReconLine, ActiveFilters, Notices, LensTabs, Find, FilterRail, ReadingKey, ControlCard, filterTerms,
} from '../components/security/Chrome';
import { BudgetsLens } from '../components/security/BudgetBlocks';
import { FootprintLens } from '../components/security/Footprint';
import { ProcurementLens } from '../components/security/Procurement';
import { Connections, Contested, Gaps, Refusals, SourceLedger } from '../components/security/Shared';
import { RecordCard, CellCard, FYReadout, VendorCard, BodyCard, CaseCard, StatePanel, FootprintStatePanel } from '../components/security/Panels';

/**
 * /security — the money India spends on force. Spec: docs/design/SECURITY_PAGE.md.
 *
 * The page owns the URL, focus, the one live region and the margin; every figure is read
 * from src/data/securityView.ts and every graphic has a table twin built from the same
 * rows. Nothing is fetched: the open-market slice is a code-split chunk read after mount.
 * Three lenses share one stage; the chrome (head, resolution statement, strip, tabs,
 * rail, graph, contested, gaps, refusals, sources) is constant and only the answer
 * sequence changes.
 */

// Below 640px no mono text is smaller than 12px and every target is at least 44px
// (spec §12–13). The resolution statement runs in at ≥ 640px so the head keeps the
// stack's pensions in the first screen at 1280 × 800 (D58); below 640 it stacks. A pinned
// table column stays readable while the rest scrolls. Reduced motion turns transitions
// off while this page is mounted.
const PAGE_CSS = `
.sec-page .sec-q { overflow-wrap: anywhere; }
.sec-page .sec-hatch, .sec-page .sec-hatch-swatch { background: repeating-linear-gradient(45deg, rgba(201,168,108,0.6) 0 1.5px, #101116 1.5px 7px); }
.sec-page .sec-cross-swatch { background: repeating-linear-gradient(45deg, rgba(232,228,220,0.55) 0 1.2px, transparent 1.2px 6px), repeating-linear-gradient(135deg, rgba(232,228,220,0.55) 0 1.2px, #3a3f4a 1.2px 6px); }
.sec-page .sec-stipple-swatch { background: radial-gradient(circle, rgba(232,228,220,0.5) 1.2px, #1b1d24 1.6px) 0 0 / 6px 6px; }
.sec-page .sec-zero, .sec-page .sec-zero-swatch { background: #15171c; box-shadow: inset 0 0 0 1px var(--color-text-muted); }
.sec-page .sec-hidden-slot { background: transparent; outline: 1px dotted var(--color-text-muted); outline-offset: -1px; }
@media (forced-colors: active) {
  .sec-page [data-q="B1"] figure [aria-hidden="true"], .sec-page [data-q="B3"] figure [aria-hidden="true"], .sec-page .sec-hatch, .sec-page .sec-hatch-swatch, .sec-page .sec-cross-swatch, .sec-page .sec-stipple-swatch, .sec-page .sec-zero-swatch { forced-color-adjust: none; }
}
.sec-page.sec-tables figure svg, .sec-page.sec-tables figure [data-column], .sec-page.sec-tables figure [data-dot], .sec-page.sec-tables figure [role="grid"] { display: none !important; }
.sec-page li, .sec-page dd, .sec-page [data-page-copy] { overflow-wrap: break-word; }
.sec-page .sec-pressed[aria-pressed="true"], .sec-page .sec-pressed[aria-selected="true"] { font-weight: 600; }
.sec-page .sec-sticky { position: sticky; left: 0; background: var(--color-bg); z-index: 1; }
@media (min-width: 640px) {
  .sec-page [data-q="B1"] > h3 { padding-right: 9rem; }
  .sec-page .sec-res { line-height: 0; }
  .sec-page .sec-res { display: block; }
  .sec-page .sec-res-h { display: inline; font-size: 11.5px; margin-right: .4em; }
  .sec-page .sec-res-h { line-height: 1.3; }
  .sec-page .sec-res-row, .sec-page .sec-res-dt, .sec-page .sec-res-dd { display: inline; font-size: 11.5px; line-height: 1.3; }
  .sec-page .sec-res-dt::after { content: ": "; }
  .sec-page .sec-res-mono { font-size: 10.5px; }
  .sec-page .sec-res-row + .sec-res-row::before { content: " ¶ "; color: var(--color-text-muted); }
}
@media (max-width: 639px) {
  .sec-page [data-caption] { line-height: 1.5; margin-top: .5rem; margin-bottom: .5rem; }
  .sec-page [class*="text-[9"], .sec-page [class*="text-[10"], .sec-page [class*="text-[11"] { font-size: 12px !important; }
  .sec-page .sec-res-row { display: block; margin-top: .5rem; }
  .sec-page .sec-res-mono { display: block; font-size: 12px; }
  .sec-page :is(a, summary, button:not(.sec-abs)) { position: relative; }
  .sec-page :is(a, summary, button, [role="tab"])::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 44px; transform: translateY(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  html, html *, html *::before, html *::after { transition-property: none !important; transition-duration: 0s !important; animation: none !important; scroll-behavior: auto !important; }
}`;

type PanelKind = 'rec' | 'cell' | 'fy' | 'vendor' | 'case' | 'body' | 'st';
const SLOT: Record<PanelKind, string> = { rec: 'find', cell: 'B3', fy: 'B1', vendor: 'P1', case: 'P4', body: 'B3', st: 'map' };

export default function Security() {
  const [routerParams, setRouterParams] = useSearchParams();
  const narrow = useNarrow();
  const wide = useWide();
  // The router commits inside a transition; a copy follows it for back/forward and is
  // written with it on every control, so a choice is on screen in the same event.
  const routerKey = routerParams.toString();
  const [key, setKey] = useState(routerKey);
  useEffect(() => { setKey(routerKey); }, [routerKey]);
  const params = useMemo(() => new URLSearchParams(key), [key]);
  const f = useMemo(() => parseFilters(params), [params]);
  const lens = f.lens;

  const [slice, setSlice] = useState<SecurityFile | null | undefined>(undefined);
  useEffect(() => { let live = true; loadSecurity().then((s) => { if (live) setSlice(s); }).catch(() => { if (live) setSlice(null); }); return () => { live = false; }; }, []);

  // One live region, debounced: two changes inside the window speak once (§3.5).
  const [live, setLive] = useState('');
  const liveTimer = useRef<number | null>(null);
  const liveSeq = useRef(0);
  // The debounce window starts after the change has painted: a long render must not let the
  // first of two quick changes speak before the second arrives (§3.5).
  const announce = useCallback((msg: string, delay = 150) => {
    const seq = ++liveSeq.current;
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    if (delay <= 0) { setLive(msg); return; }
    requestAnimationFrame(() => {
      if (seq !== liveSeq.current) return;
      liveTimer.current = window.setTimeout(() => { if (seq === liveSeq.current) setLive(msg); }, delay);
    });
  }, []);

  const keyRef = useRef(key);
  keyRef.current = key;
  const setParams = useCallback((next: URLSearchParams) => {
    const s = next.toString();
    keyRef.current = s;
    setKey(s);
    setRouterParams(next, { replace: true });
  }, [setRouterParams]);
  const patch = useCallback((kv: Record<string, string | null>) => {
    const next = new URLSearchParams(keyRef.current);
    for (const [k, v] of Object.entries(kv)) { if (v == null || v === '') next.delete(k); else next.set(k, v); }
    setParams(next);
  }, [setParams]);
  const absHref = useCallback((kv: Record<string, string | null> = {}) => {
    const next = new URLSearchParams(keyRef.current);
    for (const [k, v] of Object.entries(kv)) { if (v == null || v === '') next.delete(k); else next.set(k, v); }
    const s = next.toString();
    return `${location.origin}${location.pathname}#/security${s ? `?${s}` : ''}`;
  }, []);

  // ------------------------------------------------------------------ focus and panels
  const opener = useRef<HTMLElement | SVGElement | null>(null);
  const openerKind = useRef<PanelKind | null>(null);
  const panelH2 = useRef<HTMLHeadingElement>(null);
  const lensH2 = useRef<HTMLHeadingElement>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const focusNext = useRef<'panel' | 'lens' | 'conn' | 'opener' | null>(null);
  const [fyOpen, setFyOpen] = useState<string | null>(null);
  const [fyCurrent, setFyCurrent] = useState<string | null>(null);
  useEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    focusNext.current = null;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (want === 'panel') { panelH2.current?.focus({ preventScroll: true }); reveal(panelH2.current); }
      else if (want === 'lens') lensH2.current?.focus();
      else if (want === 'conn') { document.getElementById('connections')?.scrollIntoView({ block: 'start' }); document.getElementById('sec-conn-h')?.focus(); }
      else if (want === 'opener') {
        const el = opener.current;
        if (el && el.isConnected) { (el as HTMLElement).focus({ preventScroll: true }); reveal(el); }
        else fallbackFocus(openerKind.current);
      }
    }));
  });
  function fallbackFocus(kind: PanelKind | null) {
    const to = (el: HTMLElement | SVGElement | null | undefined) => { if (!el) return false; el.focus({ preventScroll: true }); reveal(el); return true; };
    if (kind === 'cell' && to(document.querySelector<HTMLElement>('[role="grid"] [aria-current="true"], [role="grid"] [tabindex="0"]'))) return;
    if (kind === 'st' && to(document.querySelector<SVGSVGElement>('svg[role="listbox"]'))) return;
    to(findRef.current);
  }

  const open = useCallback((kind: PanelKind, kv: Record<string, string | null>, el: HTMLElement | SVGElement | null, msg: string) => {
    opener.current = el;
    openerKind.current = kind;
    focusNext.current = 'panel';
    setFyOpen(null);
    patch(kv);
    announce(msg, 0);
  }, [patch, announce]);
  const openRecord = useCallback((id: string, el: HTMLElement | null) => open('rec', { rec: id }, el, `Record ${EDGE_BY_ID.get(id)?.lab ?? id} opened`), [open]);
  const openCell = useCallback((param: string, el: HTMLElement | null) => {
    const c = parseCell(param);
    open('cell', { cell: param, lens: null }, el, c ? `${labelOf(c.lane.body)} ${c.lane.line}, FY${c.fy} opened` : 'cell opened');
  }, [open]);
  const openBody = useCallback((id: string, el: HTMLElement | null) => {
    opener.current = el; openerKind.current = 'body'; focusNext.current = null;
    setFyOpen(null);
    patch({ body: id, lens: null });
    announce(`${labelOf(id)}: its budget lines are accented in the ledger`, 0);
    // The reader asked for the lines: they scroll into view; the BodyCard holds the way back.
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('[data-lane][aria-current="true"]')?.scrollIntoView({ block: 'center' })));
  }, [patch, announce]);
  const openVendor = useCallback((id: string, el: HTMLElement | null) => open('vendor', { vendor: id, lens: 'procurement' }, el, `${labelOf(id)} opened beside its comparators`), [open]);
  const openCase = useCallback((id: string, el: HTMLElement | null) => {
    opener.current = el; openerKind.current = 'case'; focusNext.current = 'panel';
    setFyOpen(null);
    patch({ case: id, lens: 'procurement' });
    announce(`${labelOf(id)}: its pair row is accented`, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('[data-pair][aria-current="true"]')?.scrollIntoView({ block: 'start' })));
  }, [patch, announce]);
  const selectState = useCallback((st: StateCode | null, via: 'pointer' | 'keyboard', el: HTMLElement | SVGElement | null) => {
    if (st) { opener.current = el; openerKind.current = 'st'; focusNext.current = 'panel'; }
    else if (via === 'keyboard') { focusNext.current = 'opener'; opener.current = el; openerKind.current = 'st'; }
    setFyOpen(null);
    patch({ st });
    const pop = lensPopulation(parseFilters(new URLSearchParams(keyRef.current)));
    announce(st ? `${stateName(st)} opened; from ${pop.n} to ${pop.k} ${pop.unit}` : 'state cleared', 0);
  }, [patch, announce]);
  const openFy = useCallback((fy: string, el: HTMLElement | null) => {
    opener.current = el; openerKind.current = 'fy'; focusNext.current = 'panel';
    setFyCurrent(fy);
    setFyOpen(fy);
    announce(`FY${fy} ${parseFilters(new URLSearchParams(keyRef.current)).stage}: the Union's force demands`, 0);
  }, [announce]);
  const showConnections = useCallback((id: string, el: HTMLElement | null) => {
    window.dispatchEvent(new Event('sec-conn-origin'));
    opener.current = el;
    focusNext.current = 'conn';
    patch({ focus: id, hops: '1', sel: id });
    announce(`connections for ${labelOf(id)}`, 0);
  }, [patch, announce]);
  const closePanel = useCallback((kind: PanelKind) => {
    focusNext.current = 'opener';
    openerKind.current = kind;
    // Focus goes back at once, before the panel unmounts, so it never falls to <body> in between;
    // the effect below re-checks it after the render and falls back if the opener is gone.
    const el = opener.current as HTMLElement | null;
    if (el && el.isConnected) el.focus({ preventScroll: true });
    if (kind === 'fy') { setFyOpen(null); announce('readout closed', 0); return; }
    patch({ [kind]: null });
    announce('panel closed', 0);
  }, [patch, announce]);
  const pickLens = useCallback((l: Lens) => {
    focusNext.current = 'lens';
    const next = new URLSearchParams(keyRef.current);
    if (l === 'budgets') next.delete('lens'); else next.set('lens', l);
    next.delete('rec'); next.delete('cell'); next.delete('tp');
    setFyOpen(null);
    setParams(next);
    announce(`${LENS_LABEL[l]} lens`, 0);
  }, [setParams, announce]);
  const reset = useCallback(() => {
    const next = new URLSearchParams(keyRef.current);
    for (const k of PAGE_PARAMS) if (k !== 'lens' && k !== 'view' && k !== 'sel') next.delete(k);
    setParams(next);
    announce('filters reset', 0);
  }, [setParams, announce]);

  // A record, cell or panel named by the URL alone: the opener is the thing it names.
  const firstLoad = useRef(true);
  useEffect(() => {
    if (!firstLoad.current) return;
    firstLoad.current = false;
    if (f.view === 'table') announce('shown as tables', 0);
    if (f.cell) openerKind.current = 'cell';
    else if (f.rec) openerKind.current = 'rec';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterWords = filterTerms(f).join(' · ');

  // At ≥ 1280px the open panel sits in the margin as a layer of its own, first in the
  // document's reading order: Close is the first stop after its heading, and no heading on
  // the page shares an ancestor with it (§5.0.5).
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement('div');
    el.setAttribute('data-sec-layer', '');
    document.body.prepend(el);
    setLayer(el);
    return () => { el.remove(); };
  }, []);

  // At ≥ 1280px the open panel is fixed over the margin. Its height is measured so the margin's
  // own controls (rail, key, control card) stick beneath it, in view, instead of taking focus
  // underneath it (A11Y-006 S3).
  const [panelBottom, setPanelBottom] = useState(0);
  const layerObs = useRef<ResizeObserver | null>(null);
  const layerBox = useCallback((el: HTMLDivElement | null) => {
    layerObs.current?.disconnect();
    layerObs.current = null;
    if (!el) { setPanelBottom(0); return; }
    const measure = () => setPanelBottom(Math.ceil(el.getBoundingClientRect().bottom));
    layerObs.current = new ResizeObserver(measure);
    layerObs.current.observe(el);
    measure();
  }, []);
  // The layer sits outside <main> (§5.0.5), so it is joined to the page's tab order by hand:
  // Shift+Tab from its first stop returns to the control that opened it, and Tab from its last
  // stop continues with the control after the opener, as if the panel followed it in the page.
  const tabbablesIn = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, summary, [tabindex]')]
    .filter((e) => e.tabIndex >= 0 && e.getClientRects().length > 0 && !e.closest('details:not([open]) > :not(summary)'));
  const onLayerKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const own = tabbablesIn(e.currentTarget);
    const a = document.activeElement;
    const back = opener.current && (opener.current as HTMLElement).isConnected ? opener.current as HTMLElement : findRef.current;
    if (e.shiftKey && (a === panelH2.current || a === own[0])) {
      e.preventDefault();
      back?.focus({ preventScroll: true });
      reveal(back);
    } else if (!e.shiftKey && a === own[own.length - 1]) {
      const main = document.querySelector('main');
      const page = main ? tabbablesIn(main) : [];
      const next = back ? page.find((x) => back.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING && !back.contains(x)) : page[0];
      if (!next) return;
      e.preventDefault();
      next.focus({ preventScroll: true });
      reveal(next);
    }
  };

  // ------------------------------------------------------------------ the margin
  const recKnown = !!(f.rec && EDGE_BY_ID.has(f.rec));
  const cellOk = !!(f.cell && lens === 'budgets');
  const vendorKnown = !!(f.vendor && VENDOR_SET.has(f.vendor));
  let kind: PanelKind | null = null;
  if (recKnown) kind = 'rec';
  else if (cellOk) kind = 'cell';
  else if (fyOpen && lens === 'budgets') kind = 'fy';
  else if (vendorKnown && lens === 'procurement') kind = 'vendor';
  else if (f.case && lens === 'procurement') kind = 'case';
  else if (f.body && lens === 'budgets') kind = 'body';
  else if (f.st && lens !== 'procurement') kind = 'st';
  const origin: Record<PanelKind, string> = { rec: 'the record list', cell: 'the ledger', fy: 'the chart', vendor: 'the vendor grid', case: 'the pair row', body: 'the ledger', st: 'the map' };
  const panelProps = (k: PanelKind) => ({ headingRef: panelH2, onClose: () => closePanel(k), origin: origin[k] });
  const panel: ReactNode = kind === 'rec' ? <RecordCard key={`rec-${f.rec}`} id={f.rec!} {...panelProps('rec')} />
    : kind === 'cell' ? <CellCard key={`cell-${f.cell}`} param={f.cell!} {...panelProps('cell')} />
      : kind === 'fy' ? <FYReadout key={`fy-${fyOpen}`} fy={fyOpen!} stage={f.stage} {...panelProps('fy')} />
        : kind === 'vendor' ? <VendorCard key={`v-${f.vendor}`} id={f.vendor!} {...panelProps('vendor')} />
          : kind === 'case' ? <CaseCard key={`c-${f.case}`} id={f.case!} {...panelProps('case')} />
            : kind === 'body' ? <BodyCard key={`b-${f.body}`} id={f.body!} {...panelProps('body')} />
              : kind === 'st' ? (lens === 'footprint' ? <FootprintStatePanel key={`fst-${f.st}`} st={f.st!} {...panelProps('st')} /> : <StatePanel key={`st-${f.st}`} st={f.st!} {...panelProps('st')} />)
                : null;
  const inlinePanel = useCallback((slot: string) => (!wide && kind && SLOT[kind] === slot ? panel : null), [wide, kind, panel]);

  const extra: string[] = [];
  if (f.rec && !recKnown) extra.push(`No record ${f.rec} in this register.`);
  if (f.vendor && !vendorKnown) extra.push(`${labelOf(f.vendor)} is not a vendor in this register`);
  if (f.mAsked === 'percap') extra.push('No population series in this build, so the per-person map is unavailable; the map shows % of GSDP.');

  const ctx: PageCtx = useMemo(() => ({
    f, narrow, empty: EMPTY, filterWords, announce, patch, absHref, openRecord, showConnections, openCell, openFy, openBody, openVendor, openCase, selectState, inlinePanel, reset,
  }), [f, narrow, filterWords, announce, patch, absHref, openRecord, showConnections, openCell, openFy, openBody, openVendor, openCase, selectState, inlinePanel, reset]);

  const notVendorLine = f.vendor && !vendorKnown && lens === 'procurement' ? (
    <p className="text-[13.5px] text-text mt-1">
      <button type="button" className={`underline underline-offset-2 ${FOCUS}`} onClick={(e) => showConnections(f.vendor!, e.currentTarget)}>{`Show connections for ${labelOf(f.vendor)}`}</button>
    </p>
  ) : null;

  const lensBody = lens === 'budgets'
    ? <BudgetsLens slice={slice} fyCurrent={fyCurrent} setFyCurrent={setFyCurrent} />
    : lens === 'footprint' ? <FootprintLens /> : <ProcurementLens slice={slice} />;

  const pop = lensPopulation(f);
  const noMatch = !EMPTY && pop.k === 0 && pop.n > 0;
  void DEFAULT_STAGE; void BUDGETS; void FOOTPRINT;

  return (
    <Page.Provider value={ctx}>
      <article className={`pb-20 sec-page${f.view === 'table' ? ' sec-tables' : ''}`}>
        {/* The page's styles live in <head>, not in <main>: a stylesheet is not page text (AC-144). */}
        {createPortal(<style data-security-page="">{PAGE_CSS}</style>, document.head)}
        <Head slice={slice} wideHead={!narrow} />
        {EMPTY && <EmptyCallout />}
        <Resolution />
        <div data-pinned-stack="" className={`sticky ${narrow ? 'top-14' : 'top-0'} z-30 bg-bg border-b border-border py-1.5 space-y-1`}>
          <Strip f={f} narrow={narrow} slice={slice} />
          {!narrow && !wide && <ReconLine lens={lens} slice={slice} />}
          {narrow && <LensTabs lens={lens} onPick={pickLens} narrow />}
        </div>
        {narrow && <Find f={f} inputRef={findRef} />}
        <Notices f={f} extra={extra} />
        {notVendorLine}
        <ActiveFilters f={f} onReset={reset} />
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-1.5">
          {!narrow && <LensTabs lens={lens} onPick={pickLens} narrow={false} />}
          <button type="button" className={`font-mono text-[12px] border border-border-light rounded px-2 min-h-[30px] ${FOCUS}`}
            onClick={async () => { try { await navigator.clipboard.writeText(location.href); announce('Link copied', 0); } catch { announce('The browser refused the copy: the address bar holds the link', 0); } }}>Copy link</button>
          <button type="button" aria-pressed={f.view === 'table'} className={`sec-pressed font-mono text-[12px] border rounded px-2 min-h-[30px] ${f.view === 'table' ? 'border-accent text-text' : 'border-border-light'} ${FOCUS}`}
            onClick={() => { const on = f.view !== 'table'; patch({ view: on ? 'table' : null }); announce(on ? 'shown as tables' : 'shown as stage', 0); }}>Table view</button>
          <a href="#twin-first" className={`font-mono text-[12px] underline text-text-secondary ${FOCUS}`}
            onClick={(e) => { e.preventDefault(); patch({ view: 'table' }); announce('shown as tables', 0); requestAnimationFrame(() => { const first = document.querySelector('details[data-twin]')?.getAttribute('data-twin'); if (first) openTwinAndFocus(first); }); }}>
            Every graphic on this lens has a table; show them all
          </a>
        </div>
        {!narrow && !wide && <Find f={f} inputRef={findRef} />}
        {inlinePanel('find')}
        {!wide && <FilterRail f={f} narrow={narrow} onReset={reset} />}

        {/* At ≥ 1280px Find sits at the head of the margin but first in reading order, before the lens it searches. */}
        <div className="mt-4 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr] xl:gap-x-6 items-start">
          {wide && <div className="min-w-0 xl:col-start-2 xl:row-start-1"><Find f={f} inputRef={findRef} /></div>}
          <div role="tabpanel" id={`sec-panel-${lens}`} aria-labelledby={`sec-tab-${lens}`} className="min-w-0 xl:col-start-1 xl:row-start-1 xl:row-span-2">
            <h2 ref={lensH2} tabIndex={-1} className={`text-[15px] font-semibold text-text mb-1 ${TARGET}`}>{LENS_LABEL[lens]}</h2>
            {noMatch && (
              <p data-page-copy="" className="text-[14px] text-text my-2">
                {`No record in this register matches ${filterWords || 'these filters'}. This is a statement about the register, not about India.`}
              </p>
            )}
            {lensBody}
            {narrow && <ReconLine lens={lens} slice={slice} />}
          </div>
          {wide && (
            <aside className="min-w-0 space-y-3 mt-3 xl:col-start-2 xl:row-start-2" aria-labelledby="sec-margin-name" data-margin=""
              style={panel && panelBottom ? { position: 'sticky', top: panelBottom + 12, maxHeight: `calc(100vh - ${panelBottom + 20}px)`, overflowY: 'auto' } : undefined}>
              <span id="sec-margin-name" hidden>Margin</span>
              <ReconLine lens={lens} slice={slice} />
              <FilterRail f={f} narrow={false} onReset={reset} />
              <ReadingKey />
              <ControlCard lens={lens} />
            </aside>
          )}
        </div>
        {!wide && <ControlCard lens={lens} />}
        {!wide && !narrow && <ReadingKey />}

        <Connections f={f} />
        <Contested f={f} />
        <Gaps />
        <Refusals slice={slice} />
        <SourceLedger slice={slice} />
        <div aria-live="polite" className="sr-only">{live}</div>
        {wide && panel && layer && createPortal(
          <div ref={layerBox} role="region" aria-label="Open panel" onKeyDown={onLayerKey} className="sec-page fixed right-4 top-16 z-40 w-[23rem] max-h-[60vh] overflow-y-auto bg-bg shadow-xl rounded-md">{panel}</div>,
          layer,
        )}
      </article>
    </Page.Provider>
  );
}
