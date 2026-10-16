import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CaseController } from '../case-scene/controller';
import type { CameraPose, CaseSceneState, SceneAction } from '../case-scene/state';
import type { CaseFrame } from '../case-scene/CaseSceneLayer';
import type { CaseGraphicsHost, CaseSession } from './graphics-contract';
import cases from './case-index.json';
import { observeRoleLabels } from './role-label-layout';
import './workspace.css';

type Reader = typeof import('./reader-runtime');
type ActiveCase = { reader: Reader; controller: CaseController };
export interface CaseWorkspaceProps {
  graphics: CaseGraphicsHost | null;
  reducedMotion: boolean;
  onClose: () => void;
  onRecreateGraphics: () => void;
}
const focusable = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])';
const wall = () => performance.now();
const compactViewport = () => typeof window !== 'undefined' && (window.innerWidth <= 900 || window.innerHeight <= 650);
const compactNotice = 'This viewport is too small for the case scene and its evidence rail. Use a larger desktop viewport for Case scene; the complete reader and all sources remain available here.';
function boardFits(graphics: CaseGraphicsHost, board: HTMLElement) {
  const box = board.getBoundingClientRect(), canvas = graphics.map.getCanvas().getBoundingClientRect();
  return box.width >= 240 && box.height >= 180 && box.left >= canvas.left - .5 && box.top >= canvas.top - .5
    && box.right <= canvas.right + .5 && box.bottom <= canvas.bottom + .5;
}

/** Semantic ownership deliberately sits outside the disposable shared-graphics session. */
export default function CaseWorkspace({ graphics, reducedMotion, onClose, onRecreateGraphics }: CaseWorkspaceProps) {
  const title = useId(), sourceTitle = useId(), help = useId();
  const root = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null), sourceOpener = useRef<HTMLElement | null>(null);
  const session = useRef<CaseSession | null>(null), owner = useRef<ActiveCase | null>(null);
  const request = useRef(0), closing = useRef(false);
  const [active, setActive] = useState<ActiveCase | null>(null);
  const [state, setState] = useState<CaseSceneState | null>(null);
  const [chooser, setChooser] = useState(true), [loadingCase, setLoadingCase] = useState<string | null>(null);
  const [notice, setNotice] = useState(''), [sceneRequested, setSceneRequested] = useState(false);
  const [frame, setFrame] = useState<CaseFrame | null>(null), [panZoom, setPanZoom] = useState(false);
  const [paused, setPaused] = useState<CameraPose | null>(null), [ambiguous, setAmbiguous] = useState<string[]>([]);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [compact, setCompact] = useState(compactViewport), [sceneFailed, setSceneFailed] = useState(false);
  const [quality, setQuality] = useState<1 | 0.65>(1);
  const closeRef = useRef<() => void>(() => {}), sourceCloseRef = useRef<() => boolean>(() => false);
  const scene = !chooser && state?.view === 'scene';

  useLayoutEffect(() => {
    if (labels.current && frame) return observeRoleLabels(labels.current);
  }, [frame, state?.navigation.nodeId, state?.navigation.edgeId]);

  function closeSources(): boolean {
    if (!dialog.current?.open && !claimId) return false;
    dialog.current?.close();
    setClaimId(null);
    const target = sourceOpener.current;
    sourceOpener.current = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
    else if (target) heading.current?.focus({ preventScroll: true });
    return true;
  }
  function closeWorkspace() {
    if (closing.current) return;
    closing.current = true;
    request.current++;
    owner.current?.controller.dispatch({ type: 'interrupt' }, wall());
    session.current?.dispose();
    session.current = null;
    onClose();
  }
  closeRef.current = closeWorkspace;
  sourceCloseRef.current = closeSources;

  // Modal focus ownership is independent of the map, reader and graphics session.
  useEffect(() => {
    closing.current = false;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    heading.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!sourceCloseRef.current()) closeRef.current();
      } else if (event.key === 'Tab') {
        // Keep sequential focus inside the active modal scope. Native dialog
        // modality stays intact; wrap only endpoints and leave every interior
        // Tab/Shift+Tab move to the browser.
        const scope = dialog.current?.open ? dialog.current : root.current;
        const items = [...(scope?.querySelectorAll<HTMLElement>(focusable) ?? [])]
          .filter(el => !el.closest('[hidden],[inert],dialog:not([open])') && el.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); scope?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !scope?.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const contain = (event: FocusEvent) => {
      const scope = dialog.current?.open ? dialog.current : root.current;
      if (!closing.current && !scope?.contains(event.target as Node)) {
        (dialog.current?.open ? dialog.current.querySelector<HTMLElement>('button') : heading.current)?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', key, true);
    document.addEventListener('focusin', contain);
    return () => {
      closing.current = true;
      request.current++;
      owner.current?.controller.dispatch({ type: 'interrupt' }, wall());
      session.current?.dispose(); session.current = null;
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('focusin', contain);
      document.body.style.overflow = previousOverflow;
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const resize = () => {
      const small = compactViewport();
      setCompact(small);
      const controller = owner.current?.controller;
      if (controller?.state.view === 'scene' && (small || (graphics && surface.current && !boardFits(graphics, surface.current)))) {
        // Interrupt and update the layer synchronously, before a resize-triggered draw.
        const action: SceneAction = { type: 'set-view', view: 'list' };
        if (session.current) session.current.dispatch(action);
        else setState(controller.dispatch(action, wall()));
        setSceneRequested(false); setFrame(null); setPaused(null); setPanZoom(false);
        setSceneFailed(false); setNotice(compactNotice);
      }
    };
    window.addEventListener('resize', resize, true);
    resize();
    return () => window.removeEventListener('resize', resize, true);
  }, [graphics]);

  useEffect(() => {
    const controller = active?.controller;
    if (!controller) return;
    if (session.current) session.current.dispatch({ type: 'reduced-motion', enabled: reducedMotion });
    else setState(controller.dispatch({ type: 'reduced-motion', enabled: reducedMotion }, wall()));
    setPaused(null);
  }, [active, reducedMotion]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [active, chooser]);
  useEffect(() => {
    if (claimId && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [claimId]);

  // Reachable only after an explicit Case scene action. Graphics replacement removes
  // only the session; controller, selection, history, reader and source dialog survive.
  useEffect(() => {
    if (!active || !sceneRequested || !scene || !surface.current) return;
    const controller = active.controller;
    let cancelled = false, failed = false;
    let attached: CaseSession | null = null;
    setFrame(null); setPanZoom(false);
    const failure = () => {
      if (cancelled || closing.current) return;
      failed = true; setSceneFailed(true);
      setSceneRequested(false); setFrame(null); setPaused(null);
      setState(controller.dispatch({ type: 'graphics-lost' }, wall()));
      setNotice('Case graphics are unavailable. Your selection, history and complete reader are retained.');
    };
    if (!graphics?.isUsable()) { failure(); return; }
    if (compactViewport() || !boardFits(graphics, surface.current)) {
      setState(controller.dispatch({ type: 'set-view', view: 'list' }, wall()));
      setSceneRequested(false); setSceneFailed(false); setNotice(compactNotice);
      return;
    }
    void import('./attachScene').then(module => {
      if (cancelled || closing.current || !surface.current) return;
      attached = module.attachCaseScene({
        graphics, controller, surface: surface.current, opener: null,
        onState: next => { if (!cancelled && !closing.current) { setState(next); setPaused(null); setAmbiguous([]); } },
        onFrame: next => { if (!cancelled && !failed && !closing.current) setFrame(next); },
        onMetrics: metrics => {
          if (cancelled || failed || !surface.current) return;
          Object.assign(surface.current.dataset, {
            caseTargetWidth: String(metrics.targetWidth), caseTargetHeight: String(metrics.targetHeight),
            caseEstimatedGpuBytes: String(metrics.estimatedGpuBytes),
            caseSceneDraws: String(metrics.scene.calls), caseCompositeDraws: String(metrics.composite.calls),
          });
        },
        onAmbiguousEdges: ids => { if (!cancelled) setAmbiguous(ids); },
        onFailure: failure,
        onClose: () => closeRef.current(),
        closeSourceDialog: () => sourceCloseRef.current(),
      });
      if (cancelled || failed || closing.current) attached.dispose();
      else { session.current = attached; attached.setQuality(quality); }
    }).catch(failure);
    return () => {
      cancelled = true;
      if (session.current === attached) session.current = null;
      attached?.dispose();
    };
  }, [active, graphics, sceneRequested, scene]);

  async function choose(profileId: string) {
    const token = ++request.current;
    if (owner.current?.controller.file.profileId === profileId) { setLoadingCase(null); setChooser(false); return; }
    setLoadingCase(profileId); setNotice(''); setSceneFailed(false);
    try {
      const reader = await import('./reader-runtime');
      if (token !== request.current || closing.current) return;
      const file = reader.getCase(profileId);
      if (!file) throw new Error('Reviewed case unavailable');
      const controller = new reader.CaseController(file, reducedMotion);
      const initial = controller.dispatch({ type: 'set-view', view: 'list' }, wall());
      owner.current?.controller.dispatch({ type: 'interrupt' }, wall());
      session.current?.dispose(); session.current = null;
      const next = { reader, controller };
      owner.current = next;
      setActive(next); setState(initial); setSceneRequested(false); setChooser(false);
      setClaimId(null); setFrame(null); setPaused(null); setAmbiguous([]); setPanZoom(false);
    } catch {
      if (token === request.current && !closing.current) setNotice('The reviewed reader could not load. Choose the case again to retry.');
    } finally {
      if (token === request.current && !closing.current) setLoadingCase(null);
    }
  }

  function act(action: SceneAction) {
    const controller = owner.current?.controller;
    if (!controller) return;
    setPaused(null); setAmbiguous([]);
    if (action.type === 'set-view' && action.view === 'scene') {
      if (compactViewport()) {
        setNotice(compactNotice); setSceneFailed(false);
        setState(controller.dispatch({ type: 'set-view', view: 'list' }, wall()));
        return;
      }
      if (!graphics?.isUsable()) {
        setSceneFailed(true); setNotice('Case graphics are unavailable. The complete reader remains available.');
        setState(controller.dispatch({ type: 'graphics-lost' }, wall()));
        return;
      }
      setNotice(''); setSceneFailed(false); setSceneRequested(true);
    } else if (action.type === 'set-view') { setSceneRequested(false); setFrame(null); }
    if (session.current) session.current.dispatch(action);
    else setState(controller.dispatch(action, wall()));
  }
  function openSources(id: string) {
    sourceOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setClaimId(id);
  }
  function recreate() {
    act({ type: 'graphics-lost' }); setSceneRequested(false); setFrame(null);
    setNotice('Recreating graphics. The reader and source evidence remain available; choose Case scene when graphics are ready.');
    onRecreateGraphics();
  }
  const file = active?.controller.file;
  const selected = file?.claims.find(claim => claim.claimId === (state?.navigation.factId ?? file.edges.find(edge => edge.id === state?.navigation.edgeId)?.claimId));
  const sourceClaim = file?.claims.find(claim => claim.claimId === claimId);
  const Evidence = active?.reader.CaseSceneEvidence, Details = active?.reader.CaseEvidenceDetails;

  return <section ref={root} className="cw-workspace" role="dialog" aria-modal="true" aria-labelledby={title} tabIndex={-1}
    data-case-workspace="" data-case-compact={compact} data-case-quality={quality} data-case-view={chooser ? 'chooser' : state?.view} data-case-selection={state?.navigation.edgeId ?? state?.navigation.factId ?? state?.navigation.nodeId ?? ''} data-case-motion={Boolean(state?.motion)}
    data-view={scene ? 'scene' : 'list'} data-case-id={file?.id} data-public-graph-eligible="false" data-path-eligible="false">
    <header className="cw-header">
      <div><p className="cw-kicker">Reviewed case workspace</p><h1 id={title} ref={heading} tabIndex={-1}>{chooser ? 'Choose a reviewed case' : file?.label}</h1></div>
      <div className="cw-controls">
        {active && !chooser && <button type="button" onClick={() => { act({ type: 'set-view', view: 'list' }); setChooser(true); }}>Choose another case</button>}
        <button type="button" onClick={closeWorkspace}>Close workspace</button>
      </div>
    </header>
    {chooser ? <div className="cw-chooser cw-scroll" tabIndex={0} aria-label="Reviewed case chooser">
      <p>19 reviewed, dated cases · 72 core claims. Choose a case to load its complete reader.</p>
      <p>These are bounded source records, not complete profiles or wealth rankings. Research jurisdiction is a case-grouping label, not citizenship, residence or personal location.</p>
      {active && <button type="button" onClick={() => { request.current++; setLoadingCase(null); setChooser(false); }}>Return to current case</button>}
      {notice && <p role="status">{notice}</p>}
      <ul className="cw-case-list">{cases.map(item => <li key={item.id}>
        <button type="button" data-profile-id={item.profileId} aria-current={file?.id === item.id ? 'true' : undefined} onClick={() => void choose(item.profileId)}>
          <strong>{item.label}</strong><span>{item.claimCount} core claims · Research jurisdiction: {item.researchJurisdiction.label}</span>
        </button>
        <p>{item.researchJurisdiction.qualification}</p>
      </li>)}</ul>
      <p role="status" aria-live="polite">{loadingCase ? 'Loading the reviewed case…' : ''}</p>
    </div> : active && state && file && Evidence ? <div className={`cw-body ${scene ? 'cw-split' : ''}`}>
      {scene && <section className="cw-scene" aria-label="Case-local scene">
        <div className="cw-scene-band">
          <h2>Case layout · no geographic locations</h2>
          <p id={help}>Select a node or relation. Selection moves only this case view. Enable Pan/zoom for dragging and wheel zoom; ordinary touch scrolling is the default. Focus the board for arrow keys, +/− and Home. Browser zoom shortcuts stay available.</p>
          <div className="cw-controls" role="group" aria-label="Case camera controls">
            <button type="button" disabled={!frame} aria-pressed={quality < 1} onClick={() => {
              const next = quality === 1 ? 0.65 : 1; session.current?.setQuality(next); setQuality(next);
            }}>Low quality {quality < 1 ? 'on' : 'off'}</button>
            <button type="button" onClick={() => act({ type: 'fit' })}>Fit case</button>
            <button type="button" disabled={!state.motion} onClick={() => {
              const target = active.controller.state.motion?.to;
              act({ type: 'interrupt' }); if (target) setPaused(target);
            }}>Pause travel</button>
            <button type="button" disabled={!paused} onClick={() => { if (paused) act({ type: 'camera', patch: paused }); }}>Resume travel</button>
            <button type="button" disabled={!frame} aria-pressed={panZoom} onClick={() => { const enabled = !panZoom; session.current?.setInteractionMode(enabled); setPanZoom(enabled); }}>Pan/zoom {panZoom ? 'on' : 'off'}</button>
            <button type="button" onClick={() => act({ type: 'set-view', view: 'list' })}>Complete reader</button>
          </div>
          <p className="cw-kicker" role="status">{reducedMotion ? 'Reduced motion: camera changes are immediate.' : 'Travel occurs only after a deliberate selection or camera action.'}</p>
        </div>
        <div ref={surface} data-case-surface="" data-case-frame-nodes={frame?.nodes.length ?? 0} data-case-frame-roles={frame?.roles.length ?? 0} className="cw-surface" tabIndex={0} role="group" aria-label={`${file.label}: nongeographic case board`} aria-describedby={help}>
          {!frame && <p className="cw-scene-loading" role="status">Loading the case scene. Complete source evidence is available in the reader.</p>}
          <div ref={labels} className="cw-labels" aria-hidden="true" data-case-visible-node-ids={JSON.stringify(frame?.nodes.filter(node => node.visible).map(node => node.id) ?? [])} data-case-visible-role-ids={JSON.stringify(frame?.roles.filter(role => role.visible).map(role => role.id) ?? [])}>
            <svg className="cw-label-leaders" aria-hidden="true">{frame?.roles.filter(role => role.visible).map(role => <line key={role.id} data-case-label-leader={role.id} x1={role.x} y1={role.y} x2={role.x} y2={role.y}/>)}</svg>
            {frame?.nodes.filter(node => node.visible).map(node => <span key={node.id} className="cw-node-label" data-case-node-id={node.id} data-case-label-x={node.x} data-case-label-y={node.y} data-selected={state.navigation.nodeId === node.id} style={{ left: node.x, top: node.y }}>{node.label}</span>)}
            {frame?.roles.filter(role => role.visible).map(role => <span key={role.id} className="cw-role-label" data-case-edge-id={role.id} data-case-label-x={role.x} data-case-label-y={role.y} data-selected={state.navigation.edgeId === role.id} style={{ left: role.x, top: role.y }}>{role.label}</span>)}
          </div>
        </div>
      </section>}
      <div className="cw-rail cw-scroll" data-reader-scroll="workspace-evidence" data-reader-body="" tabIndex={0} aria-label="Complete case evidence and sources">
        {notice && <p className="cw-notice" role="status">{notice}</p>}
        {!graphics?.isUsable() && <p>The reader works without WebGL. <button type="button" onClick={recreate}>Recreate graphics</button></p>}
        {sceneFailed && graphics?.isUsable() && <button type="button" onClick={recreate}>Recreate graphics</button>}
        {ambiguous.length > 0 && <section aria-label="Overlapping case relations"><h2>Choose an exact relation</h2><ul>{ambiguous.map(id => {
          const edge = file.edges.find(item => item.id === id);
          return edge && <li key={id}><button type="button" onClick={() => act({ type: 'select-edge', id })}>{file.nodes.find(n => n.id === edge.from)?.label} → {file.nodes.find(n => n.id === edge.to)?.label}: {edge.role}</button></li>;
        })}</ul></section>}
        <section className="cw-sources" aria-label="Source dialog controls">
          <h2>Source evidence</h2>
          {selected ? <button type="button" aria-haspopup="dialog" onClick={() => openSources(selected.claimId)}>Inspect selected claim {selected.number}: {selected.proposedLabel}</button> : <p>Select a relation or reader-only fact, or inspect any case claim below.</p>}
          <details><summary>Inspect sources for any of the {file.claims.length} core claims</summary><ul>{file.claims.map(claim => <li key={claim.claimId}><button type="button" aria-haspopup="dialog" onClick={() => openSources(claim.claimId)}>Claim {claim.number}: {claim.proposedLabel}</button></li>)}</ul></details>
        </section>
        <Evidence caseFile={file} model={active.controller.model} state={state} onAction={act}/>
      </div>
    </div> : null}
    <dialog ref={dialog} data-case-source-dialog="" className="cw-source-dialog" aria-labelledby={sourceTitle}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); closeSources(); }}
      onClose={() => { if (!dialog.current?.open && sourceOpener.current) closeSources(); }}>
      {sourceClaim && file && Details && <>
        <div className="cw-source-band" data-source-controls="" data-reader-controls=""><h2 id={sourceTitle}>Source evidence · claim {sourceClaim.number}</h2><button type="button" onClick={closeSources}>Close sources</button></div>
        <div className="cw-source-body cw-scroll" data-reader-scroll="case-evidence" data-reader-body="" tabIndex={0} role="region" aria-label={`Complete source evidence for claim ${sourceClaim.number}`}>
          <Details caseFile={file} claimId={sourceClaim.claimId}/>
        </div>
      </>}
    </dialog>
  </section>;
}
