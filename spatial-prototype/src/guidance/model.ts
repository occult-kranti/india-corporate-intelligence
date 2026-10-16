export interface TutorialStep { id: string; title: string; body: string; target?: string; prerequisite?: string }
export interface TutorialGuide { id: string; title: string; steps: TutorialStep[] }
export type Status = 'active' | 'paused' | 'skipped' | 'completed';
export interface Progress { version: 2; step: number; status: Status }
export type Action = 'next' | 'back' | 'finish' | 'skip' | 'pause' | 'restart' | 'resume';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const progressKey = (id: string) => `fieldwork-guide:v2:${encodeURIComponent(id)}`;
export const initialProgress = (): Progress => ({ version: 2, step: 0, status: 'paused' });
export function readProgress(storage: StoragePort | null, id: string, length: number): Progress {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(progressKey(id)) ?? 'null');
    if (!raw || typeof raw !== 'object') return initialProgress();
    const p = raw as Partial<Progress>;
    if (p.version !== 2 || !Number.isInteger(p.step) || !['active', 'paused', 'skipped', 'completed'].includes(p.status ?? '')) return initialProgress();
    return { version: 2, step: Math.max(0, Math.min(Math.max(0, length - 1), p.step!)), status: p.status === 'active' ? 'paused' : p.status! };
  } catch { return initialProgress(); }
}
export function saveProgress(storage: StoragePort | null, id: string, p: Progress): boolean {
  try { if (!storage) return false; storage.setItem(progressKey(id), JSON.stringify(p)); return true; } catch { return false; }
}
export function transition(p: Progress, action: Action, length: number): Progress {
  const last = Math.max(0, length - 1);
  const step = Math.max(0, Math.min(last, p.step));
  switch (action) {
    case 'next': return { version: 2, step: Math.min(last, step + 1), status: 'active' };
    case 'back': return { version: 2, step: Math.max(0, step - 1), status: 'active' };
    case 'finish': return { version: 2, step, status: length > 0 && step === last ? 'completed' : 'active' };
    case 'skip': return { version: 2, step, status: 'skipped' };
    case 'pause': return { version: 2, step, status: 'paused' };
    case 'restart': return { version: 2, step: 0, status: 'active' };
    case 'resume': return { version: 2, step, status: 'active' };
  }
}
export function browserStorage(): StoragePort | null { try { return window.localStorage; } catch { return null; } }
export function trapIndex(key: string, shift: boolean, index: number, count: number): number | null {
  if (key !== 'Tab' || count < 1) return null;
  if (shift && index <= 0) return count - 1;
  if (!shift && (index < 0 || index === count - 1)) return 0;
  return null;
}
export function focusDestination(previous: HTMLElement | null, fallback: HTMLElement | null): HTMLElement | null {
  return previous?.isConnected && previous.getClientRects().length > 0 && !previous.closest('[inert], [hidden], [aria-hidden="true"]') && !previous.matches(':disabled') ? previous : fallback?.isConnected ? fallback : null;
}
export type TargetState = 'available' | 'absent' | 'ambiguous' | 'unanchored';
export function inspectTarget(selector: string | undefined, root: Pick<Document, 'querySelectorAll'>, visible: (element: Element) => boolean): TargetState {
  if (!selector) return 'unanchored';
  try {
    const candidates = Array.from(root.querySelectorAll(selector)).filter(visible);
    return candidates.length === 1 ? 'available' : candidates.length ? 'ambiguous' : 'absent';
  } catch { return 'absent'; }
}
