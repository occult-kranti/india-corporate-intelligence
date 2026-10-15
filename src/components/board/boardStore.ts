import type { CasebookSelection } from '../investigation/casebookStore';

export const BOARD_LAYOUT_KEY = 'icip.investigation.board-layout.v1';
export const THREAD_TYPES = ['question', 'compare', 'counter-evidence', 'follow-up'] as const;
export type ThreadType = typeof THREAD_TYPES[number];
export interface BoardPoint { x: number; y: number }
export interface BoardThread { id: string; from: string; to: string; type: ThreadType; note: string }
export interface BoardLayout { version: 1; positions: Record<string, BoardPoint>; threads: BoardThread[] }
export const emptyBoardLayout = (): BoardLayout => ({ version: 1, positions: {}, threads: [] });
export const boardPinKey = (pin: CasebookSelection) => `${pin.kind}:${pin.id}`;
export const clampPoint = (p: BoardPoint, width = 1200): BoardPoint => ({ x: Math.max(16, Math.min(Math.max(16, width - 292), p.x)), y: Math.max(24, Math.min(90000, p.y)) });
const validPinKey = (key: unknown): key is string => typeof key === 'string' && /^(entity|relationship|record):.+/u.test(key) && key.length < 1200;
const threadSignature = (t: BoardThread) => JSON.stringify([t.from, t.to, t.type]);
export function parseBoardLayout(raw: unknown): BoardLayout | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== 1 || !row.positions || typeof row.positions !== 'object' || Array.isArray(row.positions) || !Array.isArray(row.threads) || row.threads.length > 500) return null;
  const entries = Object.entries(row.positions);
  if (entries.length > 250) return null;
  const positions: Record<string, BoardPoint> = {};
  for (const [key, value] of entries) {
    if (!validPinKey(key) || !value || typeof value !== 'object') continue;
    const p = value as BoardPoint;
    if (Number.isFinite(p.x) && Number.isFinite(p.y)) positions[key] = clampPoint(p, 8000);
  }
  const seen = new Set<string>(), pairs = new Set<string>();
  const threads: BoardThread[] = [];
  for (const value of row.threads) {
    if (!value || typeof value !== 'object') continue;
    const t = value as BoardThread;
    if (typeof t.id !== 'string' || !t.id || t.id.length > 180 || seen.has(t.id) || !validPinKey(t.from) || !validPinKey(t.to) || t.from === t.to || !THREAD_TYPES.includes(t.type)) continue;
    const signature = threadSignature(t);
    if (pairs.has(signature)) continue;
    threads.push({ id: t.id, from: t.from, to: t.to, type: t.type, note: typeof t.note === 'string' ? t.note.slice(0, 2000) : '' }); seen.add(t.id); pairs.add(signature);
  }
  return { version: 1, positions, threads };
}
export function addBoardThread(layout: BoardLayout, thread: BoardThread): BoardLayout {
  if (layout.threads.length >= 500) throw new Error('This board has 500 analyst threads. Remove one before adding another.');
  if (thread.from === thread.to) throw new Error('Choose two different pinned records.');
  if (layout.threads.some(t => threadSignature(t) === threadSignature(thread))) throw new Error('This typed analyst thread is already on your board.');
  const parsed = parseBoardLayout({ ...layout, threads: [...layout.threads, thread] });
  if (!parsed || parsed.threads.length !== layout.threads.length + 1) throw new Error('The thread is not valid.');
  return parsed;
}

/** Additive restoration never replaces current arrangements or annotations. */
export function mergeBoardLayouts(current: BoardLayout, incoming: BoardLayout): BoardLayout {
  const threads = [...current.threads];
  const ids = new Set([...current.threads, ...incoming.threads].map(thread => thread.id));
  const assigned = new Set(current.threads.map(thread => thread.id));
  for (const thread of incoming.threads) {
    if (threads.some(row => threadSignature(row) === threadSignature(thread))) continue;
    let id = thread.id;
    if (assigned.has(id)) {
      let sequence = 1;
      do { id = `${thread.id.slice(0, 150)}-import-${sequence++}`; } while (ids.has(id));
    }
    ids.add(id); assigned.add(id); threads.push({ ...thread, id });
  }
  const positions = { ...incoming.positions, ...current.positions };
  if (threads.length > 500 || Object.keys(positions).length > 250) throw new Error('Import would exceed 500 analyst threads or 250 pin positions. Nothing was imported.');
  return { version: 1, positions, threads };
}
