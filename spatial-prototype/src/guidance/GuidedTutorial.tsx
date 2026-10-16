import { useEffect, useId, useRef, useState } from 'react';
import { browserStorage, focusDestination, inspectTarget, readProgress, saveProgress, transition, trapIndex, type Action, type Progress, type TargetState, type TutorialGuide } from './model';
import './guidance.css';
export type { TutorialGuide, TutorialStep } from './model';
export interface GuidedTutorialProps { guide: TutorialGuide; open: boolean; onClose: () => void; onPause?: () => void }
/** Reading notes only. This renderer receives no app setters, navigator, camera or speech ports. */
export function GuidedTutorial({ guide, open, onClose, onPause }: GuidedTutorialProps) {
  const [progress, setProgress] = useState<Progress>(() => readProgress(browserStorage(), guide.id, guide.steps.length));
  const [storageWarning, setStorageWarning] = useState(false);
  const [targetState, setTargetState] = useState<TargetState>('unanchored');
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const invoker = useRef<HTMLElement | null>(null);
  const fallback = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const id = useId();
  const step = guide.steps[Math.min(progress.step, guide.steps.length - 1)];
  // A changed guide must not inherit another guide's step or completion state.
  useEffect(() => { setProgress(readProgress(browserStorage(), guide.id, guide.steps.length)); }, [guide.id, guide.steps.length]);
  useEffect(() => {
    if (!open || !dialog.current) return;
    invoker.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fallback.current = document.querySelector<HTMLElement>('[data-guide-launcher], .help-button');
    wasOpen.current = true;
    if (!dialog.current.open) dialog.current.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      dialog.current?.close();
      if (wasOpen.current) { focusDestination(invoker.current, fallback.current)?.focus({ preventScroll: true }); wasOpen.current = false; }
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const refresh = () => setTargetState(inspectTarget(step?.target, document, element => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const inViewport = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      return inViewport && element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('[hidden], [aria-hidden="true"]');
    }));
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open'] });
    window.addEventListener('resize', refresh);
    document.addEventListener('scroll', refresh, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', refresh); document.removeEventListener('scroll', refresh, true); };
  }, [open, step?.target]);
  function act(action: Action) {
    const next = transition(progress, action, guide.steps.length);
    setProgress(next);
    setStorageWarning(!saveProgress(browserStorage(), guide.id, next));
    if (['finish', 'skip', 'pause'].includes(action)) { if (action === 'pause') onPause?.(); onClose(); }
    else heading.current?.focus({ preventScroll: true });
  }
  if (!guide.steps.length) return null;
  return <dialog ref={dialog} className="field-guide" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); act('pause'); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); act('pause'); return; }
      // Do not let application camera shortcuts react to a tour key.
      event.stopPropagation();
      const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      const next = trapIndex(event.key, event.shiftKey, buttons.indexOf(document.activeElement as HTMLButtonElement), buttons.length);
      if (next !== null) { event.preventDefault(); buttons[next]?.focus({ preventScroll: true }); }
    }}>
    <button className="field-guide-close" type="button" aria-label="Close field guide" onClick={() => act('pause')}>Close</button>
    <p className="field-guide-kicker">{guide.title} · {progress.step + 1} of {guide.steps.length}</p>
    <h2 ref={heading} tabIndex={-1} id={`${id}-title`}>{step.title}</h2>
    <p id={`${id}-body`}>{step.body}</p>
    <p className="field-guide-target" role="status">{targetState === 'available'
      ? 'This section is present. Pause to try it, then reopen Help to continue.'
      : targetState === 'ambiguous'
        ? 'Several matching sections are visible. This note is not pointing at any one of them. Pause to choose the intended section yourself.'
        : targetState === 'absent' ? step.prerequisite ?? 'This section is not visible in the current view. Continue reading or pause to open it yourself.'
          : 'This is a reading note. You can continue without changing the page.'}</p>
    {storageWarning && <p role="status">Tutorial progress could not be saved. It remains available in this tab.</p>}
    <div className="field-guide-actions">
      <button type="button" disabled={progress.step === 0} onClick={() => act('back')}>Back</button>
      {progress.step < guide.steps.length - 1 ? <button type="button" onClick={() => act('next')}>Next</button> : <button type="button" onClick={() => act('finish')}>Finish</button>}
      <button type="button" onClick={() => act('pause')}>Pause to try this</button>
      <button type="button" onClick={() => act('skip')}>Skip</button>
      <button type="button" onClick={() => act('restart')}>Restart</button>
    </div>
    <p className="field-guide-footnote">These notes never move the map, start audio, open links, change filters or save research. All actions on the page are yours.</p>
  </dialog>;
}
