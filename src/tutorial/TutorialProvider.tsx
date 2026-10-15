import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, ExternalLink, Play, RotateCcw, Search, X } from 'lucide-react';
import { caseStudy, caseTour, findTour, guideForPath, guides, independentPaths, introTour, sources, staticGuides, tourLengths, workspaceGuide, type PageGuide, type TutorialStep } from './catalog';
import { emptyProgress, guideDestination, matchesHelpQuery, readProgress, STORAGE_KEY, updateProgress, type TutorialProgress, type TutorialStatus } from './model';
import { getTutorialPlacement, watchTutorialPosition } from './placement.mjs';
import './tutorial.css';

type Mode = 'closed' | 'help' | 'tour' | 'complete';
interface TutorialContextValue { openHelp: () => void; startTour: (id: string, replay?: boolean) => void; startPageGuide: (guide: PageGuide) => void; close: () => void; progress: TutorialProgress; registerLauncher: () => () => void }
const TutorialContext = createContext<TutorialContextValue | null>(null);
export function useTutorial() { const context = useContext(TutorialContext); if (!context) throw new Error('useTutorial must be inside TutorialProvider, within the router.'); return context; }

function visibleTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  try { return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(node => !node.closest('[data-tutorial-ui]') && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0) ?? null; } catch { return null; }
}
function SourceLinks({ step }: { step: TutorialStep }) {
  const selected = sources.filter(source => step.sourceIds?.includes(source.id));
  if (!selected.length) return null;
  return <details className="tutorial-sources"><summary>Read the source trail · {selected.length}</summary><p>Existing retained sources, not newly re-audited for this tutorial. Open the original to verify a later status.</p>{selected.map(source => <article key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={13} aria-hidden="true" /></a><span>{source.id} · {source.publisher} · {source.publication_date}</span><p>{source.locator}</p><p>{source.limitations}</p></article>)}{step.claimIds?.length ? <p>Retained claims: {step.claimIds.join(', ')}</p> : null}</details>;
}
function KnowledgeCheck({ step }: { step: TutorialStep }) {
  const [answer, setAnswer] = useState<number | null>(null);
  if (!step.question || !step.answers) return null;
  return <fieldset className="tutorial-check"><legend>{step.question}</legend>{step.answers.map((value, index) => <label key={value}><input type="radio" name="tutorial-check" checked={answer === index} onChange={() => setAnswer(index)} /><span>{value}</span></label>)}{answer !== null && <p role="status"><strong>{answer === step.correct ? 'That keeps the claim bounded.' : 'Look again at the source boundary.'}</strong> {step.explanation}</p>}</fieldset>;
}

/** Mount once inside HashRouter. It never opens automatically on first load. */
export function TutorialProvider({ children, floatingLauncher = true }: { children: ReactNode; floatingLauncher?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('closed');
  const [tourId, setTourId] = useState('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [launcherCount, setLauncherCount] = useState(0);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [progress, setProgress] = useState<TutorialProgress>(() => { try { return readProgress(localStorage.getItem(STORAGE_KEY), tourLengths); } catch { return emptyProgress(); } });
  const [targetAvailable, setTargetAvailable] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const originRef = useRef('');
  const originLabelRef = useRef('');
  const skipRestoreRef = useRef(false);
  const tour = findTour(tourId) ?? introTour;
  const step = tour.steps[Math.min(stepIndex, tour.steps.length - 1)];
  const pageGuide = guideForPath(location.pathname);
  const inWorkspace = !independentPaths.has(location.pathname) && new URLSearchParams(location.search).get('iw_view') !== 'dossier';
  const lastTour = progress.lastTour ? findTour(progress.lastTour) : undefined;
  const lastEntry = lastTour && progress.tours[lastTour.id];
  const resumable = lastEntry && ['paused', 'active', 'skipped'].includes(lastEntry.status);
  const filtered = useMemo(() => guides.filter(guide => matchesHelpQuery(guide, query)), [query]);
  const filteredExtras = useMemo(() => query.trim() ? [introTour, workspaceGuide, caseTour].filter(item => matchesHelpQuery(item, query)) : [], [query]);
  const filteredStatic = useMemo(() => staticGuides.filter(guide => matchesHelpQuery(guide, query)), [query]);
  const save = useCallback((id: string, index: number, status: TutorialStatus, route?: string) => {
    setProgress(previous => {
      const next = updateProgress(previous, id, index, status, tourLengths[id] ?? 1, undefined, route);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setStorageUnavailable(true); }
      return next;
    });
  }, []);
  const rememberOpener = useCallback(() => {
    if (mode !== 'closed') return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    originRef.current = `${location.pathname}${location.search}${location.hash}`;
    originLabelRef.current = pageGuide?.title ?? 'your research';
  }, [mode, location.pathname, location.search, location.hash, pageGuide?.title]);
  const openHelp = useCallback(() => { rememberOpener(); setQuery(''); setMode('help'); }, [rememberOpener]);
  const close = useCallback(() => { if (mode === 'tour') save(tourId, stepIndex, 'paused'); setMode('closed'); }, [mode, save, tourId, stepIndex]);
  const startTour = useCallback((id: string, replay = false) => {
    const selected = findTour(id); if (!selected) return;
    rememberOpener();
    const saved = progress.tours[id];
    const index = !replay && saved && saved.status !== 'completed' ? saved.step : 0;
    setTourId(id); setStepIndex(index); setMode('tour'); save(id, index, 'active');
    const route = selected.steps[index]?.route ?? saved?.route; if (route) navigate(route);
  }, [rememberOpener, progress, save, navigate]);
  const startPageGuide = useCallback((guide: PageGuide) => {
    rememberOpener(); const route = guideDestination(guide, location.pathname, location.search, !independentPaths.has(guide.path)); navigate(route);
    setTourId(`page:${guide.id}`); setStepIndex(0); setMode('tour'); save(`page:${guide.id}`, 0, 'active', route);
  }, [rememberOpener, navigate, location.pathname, location.search, save]);
  const registerLauncher = useCallback(() => { setLauncherCount(value => value + 1); return () => setLauncherCount(value => Math.max(0, value - 1)); }, []);

  // Native dialog gives background inertness and focus containment. Restore to the
  // actual initiator only if it survives a cross-page tour; otherwise use Help.
  useLayoutEffect(() => {
    const dialog = dialogRef.current; if (!dialog) return;
    if (mode !== 'closed') {
      if (!dialog.open) dialog.showModal();
      const frame = requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(frame);
    }
    if (!dialog.open) return;
    dialog.close();
    if (skipRestoreRef.current) { skipRestoreRef.current = false; return; }
    const opener = openerRef.current;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    else document.querySelector<HTMLElement>('[data-tutorial-launcher]')?.focus({ preventScroll: true });
  }, [mode, stepIndex, tourId]);

  // Route modules load lazily. Observe only while showing a step and remove every
  // highlight on dismissal; absence of a target never blocks reading the guide.
  useLayoutEffect(() => {
    if (mode !== 'tour') { setTargetAvailable(false); return; }
    let target: HTMLElement | null = null;
    let positioner: ReturnType<typeof watchTutorialPosition> | undefined;
    const check = () => {
      const next = visibleTarget(step.selector);
      if (target !== next) { target?.removeAttribute('data-tutorial-highlight'); target = next; target?.setAttribute('data-tutorial-highlight', 'true'); }
      setTargetAvailable(Boolean(next));
      positioner?.update();
    };
    check();
    if (dialogRef.current) positioner = watchTutorialPosition(dialogRef.current, () => target, getTutorialPlacement);
    const observer = new MutationObserver(check); observer.observe(document.body, { subtree: true, childList: true });
    return () => { observer.disconnect(); positioner?.stop(); target?.removeAttribute('data-tutorial-highlight'); };
  }, [mode, step.selector, stepIndex, location.pathname, location.search]);

  const move = (delta: number) => {
    const next = stepIndex + delta;
    if (next >= tour.steps.length) { save(tourId, stepIndex, 'completed'); setMode('complete'); return; }
    if (next < 0) return;
    setStepIndex(next); save(tourId, next, 'active');
    const route = tour.steps[next]?.route; if (route) navigate(route);
  };
  const tryControl = () => {
    const target = visibleTarget(step.selector); if (!target) return;
    save(tourId, stepIndex, 'paused'); skipRestoreRef.current = true; setMode('closed');
    requestAnimationFrame(() => {
      const hadTabindex = target.hasAttribute('tabindex'); if (!hadTabindex) target.setAttribute('tabindex', '-1');
      target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      target.focus({ preventScroll: true });
      if (!hadTabindex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    });
  };
  const context = useMemo(() => ({ openHelp, startTour, startPageGuide, close, progress, registerLauncher }), [openHelp, startTour, startPageGuide, close, progress, registerLauncher]);
  const backToResearch = () => { if (originRef.current) navigate(originRef.current); setMode('closed'); };
  return <TutorialContext.Provider value={context}>{children}
    {floatingLauncher && launcherCount === 0 && <button type="button" className="tutorial-floating" data-tutorial-launcher="" onClick={openHelp} aria-label={resumable ? 'Help and resume tutorial' : 'Help and page guides'}><CircleHelp size={19} aria-hidden="true" /><span>{resumable ? 'Help · resume' : 'Help'}</span></button>}
    {createPortal(<dialog ref={dialogRef} className="tutorial-dialog" data-tutorial-ui="" data-mode={mode} aria-labelledby="tutorial-heading" aria-describedby={mode === 'tour' ? 'tutorial-description' : undefined} onCancel={event => { event.preventDefault(); close(); }}>
      <div className="tutorial-shell"><header className="tutorial-header"><div><p>{mode === 'tour' ? tour.kind === 'case' ? 'Evidence exercise · retained snapshot' : tour.title : mode === 'complete' ? 'Guide finished' : 'Field guide'}</p><h2 ref={headingRef} id="tutorial-heading" tabIndex={-1}>{mode === 'tour' ? step.title : mode === 'complete' ? 'Take the next step in your research.' : 'What would you like to do?'}</h2></div><button type="button" className="tutorial-icon-button" onClick={close} aria-label={mode === 'tour' ? 'Pause and close tutorial' : 'Close help'}><X size={20} aria-hidden="true" /></button></header>
      {mode === 'help' && <div className="tutorial-body">
        {resumable && lastTour && lastEntry && <div className="tutorial-resume"><div><strong>{lastTour.title}</strong><span>Saved at step {lastEntry.step + 1} of {lastTour.steps.length}</span></div><button type="button" onClick={() => startTour(lastTour.id)}><Play size={14} aria-hidden="true" /> Resume</button></div>}
        <section className="tutorial-current"><p className="tutorial-eyebrow">Here, on this page</p><h3>{inWorkspace ? `${pageGuide?.title ?? 'Investigation'} workspace` : pageGuide?.title ?? 'Explore the research'}</h3><p>{inWorkspace ? 'Learn the shared map, evidence, filters and local casebook, or open this topic’s complete dossier guide.' : pageGuide?.features[0]?.body ?? 'Browse the guides below to choose a research tool.'}</p><div className="tutorial-action-row">{inWorkspace && <button type="button" className="tutorial-primary" onClick={() => startTour('workspace', true)}>Guide this workspace</button>}{pageGuide && <button type="button" className={inWorkspace ? '' : 'tutorial-primary'} onClick={() => startPageGuide(pageGuide)}>{inWorkspace ? 'Guide the dossier' : 'Guide this page'}</button>}</div></section>
        <div className="tutorial-starts"><button type="button" onClick={() => startTour('intro', true)}><BookOpen size={18} aria-hidden="true" /><span><strong>Your first investigation</strong><small>A short cross-page tour · 5 steps</small></span><ArrowRight size={18} aria-hidden="true" /></button><button type="button" onClick={() => startTour(caseTour.id, true)}><Search size={18} aria-hidden="true" /><span><strong>Fairfax / IDBI evidence exercise</strong><small>Approval, votes, funding & valuation · 7 steps</small></span><ArrowRight size={18} aria-hidden="true" /></button></div>
        <label className="tutorial-search"><Search size={16} aria-hidden="true" /><span className="tutorial-sr-only">Search all page guides and features</span><input type="search" placeholder="Find a page or feature, e.g. export, casebook, voting…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p className="tutorial-result-count" role="status">{filtered.length + filteredStatic.length + filteredExtras.length} guides{query ? ` matching “${query}”` : ' across the application'}</p>
        <div className="tutorial-index">{filteredExtras.map(item => <button type="button" key={item.id} onClick={() => startTour(item.id, true)}><span><strong>{item.title}</strong><small>{item.kind === 'case' ? 'Evidence exercise' : 'Guided workflow'} · {item.steps.length} steps</small></span><ArrowRight size={16} aria-hidden="true" /></button>)}{filtered.map(guide => <button type="button" key={guide.id} onClick={() => startPageGuide(guide)}><span><strong>{guide.title}</strong><small>{guide.group} · {guide.features.length} steps{progress.tours[`page:${guide.id}`]?.status === 'completed' ? ' · Completed' : ''}</small></span><ArrowRight size={16} aria-hidden="true" /></button>)}{filteredStatic.map(guide => <a key={guide.id} href={`${guide.path}?help=1`}><span><strong>{guide.title}</strong><small>Connected workbench · opens its own help</small></span><ExternalLink size={15} aria-hidden="true" /></a>)}{!filtered.length && !filteredStatic.length && !filteredExtras.length && <p>No guide matches that wording. Try a page name or a control such as “source”, “map” or “export”.</p>}</div>
        <p className="tutorial-storage-note">Tutorial progress stays in this browser. Help never adds evidence or submits your research.</p>
      </div>}
      {mode === 'tour' && <div className="tutorial-body"><div className="tutorial-progress"><span>Step {stepIndex + 1} of {tour.steps.length}</span><progress value={stepIndex + 1} max={tour.steps.length} aria-label="Tutorial progress" /></div><p id="tutorial-description" className="tutorial-description">{step.body}</p>{tour.kind === 'case' && <p className="tutorial-case-scope">Already-reported findings · status {caseStudy.statusAsOf} · source record {caseStudy.caseId}</p>}<KnowledgeCheck key={`${tourId}:${stepIndex}`} step={step} /><SourceLinks step={step} />{targetAvailable && <button type="button" className="tutorial-try" onClick={tryControl}>Try this control · pause guide <ArrowRight size={15} aria-hidden="true" /></button>}{tour.kind === 'case' && <a className="tutorial-case-link" href="./global-workbench/finance.html?tutorial=fairfax-idbi">Open this exercise in the finance workbench <ExternalLink size={14} aria-hidden="true" /></a>}<p className="tutorial-hint">{targetAvailable ? 'The related control is outlined behind this guide. Pause to use it, then reopen Help to resume.' : 'Read at your pace. You can pause, skip or replay this guide at any time.'}</p></div>}
      {mode === 'complete' && <div className="tutorial-body"><p>You’ve reached the end of “{tour.title}”. The page guides stay available from Help.</p>{tour.kind === 'case' && <p>The exercise leaves the missing records open. It does not make a new claim about ownership, a completed sale or wrongdoing.</p>}<div className="tutorial-action-row"><button type="button" className="tutorial-primary" onClick={backToResearch}>Return to {originLabelRef.current || 'research'}</button><button type="button" onClick={() => startTour(tourId, true)}><RotateCcw size={15} aria-hidden="true" />Replay</button></div></div>}
      {storageUnavailable && <p className="tutorial-storage-warning" role="status">This browser blocked saving tutorial progress. You can keep using the guide, but resume may not survive a reload.</p>}
      <footer className="tutorial-footer">{mode === 'tour' ? <><button type="button" className="tutorial-quiet" onClick={() => { save(tourId, stepIndex, 'skipped'); setMode('closed'); }}>Skip tour</button><div><button type="button" onClick={() => move(-1)} disabled={stepIndex === 0}><ArrowLeft size={15} aria-hidden="true" />Back</button><button type="button" className="tutorial-primary" onClick={() => move(1)}>{stepIndex + 1 === tour.steps.length ? 'Finish' : 'Next'}<ArrowRight size={15} aria-hidden="true" /></button></div></> : <><span>Escape closes help{mode === 'complete' ? '' : ' · no research changes'}</span>{mode === 'complete' && <button type="button" onClick={() => setMode('help')}>All guides</button>}</>}</footer>
      </div></dialog>, document.body)}
  </TutorialContext.Provider>;
}

/** An integrated launcher hides the provider’s optional floating fallback. */
export function TutorialLauncher({ className = '', label = 'Help' }: { className?: string; label?: string }) {
  const { openHelp, registerLauncher } = useTutorial();
  useEffect(registerLauncher, [registerLauncher]);
  return <button type="button" className={`tutorial-launcher ${className}`} data-tutorial-launcher="" aria-label="Open help, page guides and tutorials" onClick={openHelp}><CircleHelp size={17} aria-hidden="true" /><span>{label}</span></button>;
}
