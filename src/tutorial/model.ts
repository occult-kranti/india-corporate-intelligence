/** Tutorial progress is deliberately separate from research, casebooks and filters. */
export const STORAGE_KEY = 'fieldwork-tutorial:v1';
export type TutorialStatus = 'active' | 'paused' | 'skipped' | 'completed';
export interface ProgressEntry { step: number; status: TutorialStatus; updatedAt: string; route?: string }
export interface TutorialProgress { version: 1; lastTour: string | null; tours: Record<string, ProgressEntry> }
export const emptyProgress = (): TutorialProgress => ({ version: 1, lastTour: null, tours: {} });
export function readProgress(raw: string | null, lengths: Record<string, number>): TutorialProgress {
  if (!raw) return emptyProgress();
  try {
    const input = JSON.parse(raw);
    if (!input || input.version !== 1 || !input.tours || typeof input.tours !== 'object') return emptyProgress();
    const tours: Record<string, ProgressEntry> = {};
    for (const [id, value] of Object.entries(input.tours)) {
      if (!Object.prototype.hasOwnProperty.call(lengths, id) || lengths[id] < 1 || !value || typeof value !== 'object') continue;
      const row = value as ProgressEntry;
      if (!Number.isInteger(row.step) || !['active', 'paused', 'skipped', 'completed'].includes(row.status)) continue;
      tours[id] = { step: Math.max(0, Math.min(lengths[id] - 1, row.step)), status: row.status === 'active' ? 'paused' : row.status, updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '', ...(typeof row.route === 'string' && row.route.startsWith('/') && !row.route.startsWith('//') ? { route: row.route } : {}) };
    }
    return { version: 1, tours, lastTour: typeof input.lastTour === 'string' && Object.prototype.hasOwnProperty.call(tours, input.lastTour) ? input.lastTour : null };
  } catch { return emptyProgress(); }
}
export function updateProgress(progress: TutorialProgress, id: string, step: number, status: TutorialStatus, length: number, now = new Date().toISOString(), route?: string): TutorialProgress {
  if (!id || !Number.isFinite(step) || length < 1) return progress;
  return { version: 1, lastTour: id, tours: { ...progress.tours, [id]: { step: Math.max(0, Math.min(length - 1, Math.trunc(step))), status, updatedAt: now, ...(route || progress.tours[id]?.route ? { route: route ?? progress.tours[id].route } : {}) } } };
}
export function matchesRoute(pattern: string, pathname: string) {
  const a = pattern.replace(/\/$/, '').split('/');
  const b = pathname.replace(/\/$/, '').split('/');
  return a.length === b.length && a.every((part, i) => part.startsWith(':') ? Boolean(b[i]) : part === b[i]);
}
export function searchableText(value: unknown): string {
  if (Array.isArray(value)) return value.map(searchableText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(searchableText).join(' ');
  return typeof value === 'string' ? value.toLowerCase() : '';
}
export function matchesHelpQuery(value: unknown, query: string) {
  const haystack = searchableText(value);
  return query.toLowerCase().trim().split(/\s+/).every(word => haystack.includes(word));
}
/** A source filename is never used as a guessed entity ID. */
export function guideDestination(guide: { path: string; examplePath?: string }, currentPath: string, search = '', dossier = true): string {
  const path = matchesRoute(guide.path, currentPath) ? currentPath : guide.examplePath ?? guide.path;
  const params = new URLSearchParams(matchesRoute(guide.path, currentPath) ? search : '');
  if (dossier && path !== '/board') params.set('iw_view', 'dossier');
  return path + (params.size ? `?${params}` : '');
}
