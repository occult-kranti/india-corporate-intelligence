import raw from './catalog.json';
import { matchesRoute } from './model';
export interface TutorialSource { id: string; title: string; publisher: string; publication_date: string; url: string; locator: string; access_depth: string; limitations: string }
export interface TutorialStep { title: string; body: string; selector?: string; route?: string; sourceIds?: string[]; claimIds?: string[]; question?: string; answers?: string[]; correct?: number; explanation?: string; tryLabel?: string }
export interface PageGuide { id: string; path: string; title: string; group: string; modules?: string[]; aliases?: string[]; examplePath?: string; features: TutorialStep[] }
export interface Tour { id: string; title: string; steps: TutorialStep[]; kind: 'page' | 'intro' | 'case' | 'workspace' }
export const guides: PageGuide[] = raw.guides;
export const staticGuides: PageGuide[] = raw.staticGuides;
export const caseStudy = raw.caseStudy;
export const sources: TutorialSource[] = caseStudy.sources;
export const independentPaths = new Set(['/board', '/investigations', '/leads', '/game-theory', '/research-program', '/follow-the-money', '/money-trails', '/research-radar', '/model-lab', '/funding-investigations', '/hypothesis-lab', '/allegations']);
export const workspaceGuide: Tour = {
  id: 'workspace', title: 'Maps, records & your casebook', kind: 'workspace', steps: [
    { title: 'One scope, five ways to work', body: 'Map, Connections, Evidence, Casebook and Dossier share this investigation context. Dossier opens the specialist page’s original controls and records.', selector: '.iw-surfaces' },
    { title: 'Choose the evidence in view', body: 'Place, Topic scope and search narrow the retained record. More filters exposes source layers, evidence tier, event dates, undated records, geographic precision, national context and state coverage comparison.', selector: '.iw-control-bar' },
    { title: 'Read a source beside the selection', body: 'Select a map entry, relationship or Evidence row. The inspector keeps the source, date, amount stage, responses and limits together. Coverage counts do not measure spending, need or misconduct.', selector: '.iw-inspector, .atlas-evidence-dock' },
    { title: 'Trace a recorded path', body: 'Expand “Trace a recorded path”, choose Path start, Path end and Traversal. Search returns at most three paths within five steps and 1,500 entities. Reversing traversal does not reverse a payment; no path is not proof that no relationship exists.', selector: '.iw-trace' },
    { title: 'Keep a question and its falsifier', body: 'Casebook saves your title, question, what would disprove it, up to 250 evidence pins and 40 saved views. Analyst notes are user-entered. Export evidence JSON or a reading brief for backup; Import casebook adds supported items without silently replacing your current notes.', route: '/?iw_view=casebook', selector: '.iw-casebook-content' },
    { title: 'Share the scope, export the record', body: 'Copy investigation link preserves the URL view. Evidence offers Export records CSV. Browser-local casebook notes do not travel with a URL; export a copy to keep them. Clearing browser storage can remove local research.', selector: '.iw-command-actions' },
  ],
};
export const introTour: Tour = {
  id: 'intro', title: 'Your first investigation', kind: 'intro', steps: [
    { title: 'Begin with a question', body: 'This short tour moves across the board, entity search, a casefile and the evidence method. It does not add, edit or delete your research. Pause at any point; Help remembers your place.', route: '/board', selector: '[data-tour="board"]' },
    { title: 'Keep evidence and questions distinct', body: 'Use the board to arrange inspected sources and your own notes. A wool thread is an analyst’s question or proposed connection. Read the exact source before treating a link as documented.', selector: '[data-tour="board-tools"]', route: '/board' },
    { title: 'Find the right identity', body: 'Type at least two characters of a company, ticker, ISIN, person, group or state. Results keep entity types separate. Similar names alone never establish the same legal identity.', route: '/search?iw_view=dossier', selector: 'input[placeholder*="ticker"]' },
    { title: 'Follow a documented step', body: 'A casefile keeps the network, response and source inspection together. Select one relationship and read its direction, date, stage and limitations before following the next. A gap stays a gap.', route: '/follow-the-money', selector: '.fm-atlas, [aria-label="Money trail investigation atlas"]' },
    { title: 'Keep the standard beside the story', body: 'The method explains evidence tiers, source requirements and as-of dates. Structural integrity checks do not independently verify every claim. Revisit any page’s guide from Help whenever a control is unfamiliar.', route: '/method?iw_view=dossier' },
  ],
};
export const caseTour: Tour = { id: caseStudy.id, title: caseStudy.title, steps: caseStudy.steps, kind: 'case' };
export const tours: Tour[] = [introTour, workspaceGuide, caseTour, ...guides.map(g => ({ id: `page:${g.id}`, title: g.title, steps: g.features, kind: 'page' as const }))];
export const tourLengths = Object.fromEntries(tours.map(t => [t.id, t.steps.length]));
export const findTour = (id: string) => tours.find(tour => tour.id === id);
export function guideForPath(path: string) { return guides.find(guide => matchesRoute(guide.path, path) || guide.aliases?.some(alias => matchesRoute(alias, path))); }
