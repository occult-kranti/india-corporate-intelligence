/** Browser-local research plans. These records are not independent registrations. */
export const WORKSHEET_FIELDS = ['question', 'prediction', 'alternative', 'falsifier', 'records', 'notes', 'links'] as const;
export type Worksheet = Record<typeof WORKSHEET_FIELDS[number], string>;
export const PLAN_FIELDS = ['population', 'timeWindow', 'alternativeObservation', 'analysisMethod'] as const;
export type TestPlan = Record<typeof PLAN_FIELDS[number], string> & { timing: 'exploratory' | 'before-new-search' };
export const DEFAULT_TEST_PLAN: Readonly<TestPlan> = Object.freeze({ population: '', timeWindow: '', alternativeObservation: '', analysisMethod: '', timing: 'exploratory' });
export const TEST_PLAN_BOUNDARY = 'Browser-local, self-reported planning record. Timing and timestamps are not independently registered or validated. Read-only revisions in this interface can still be changed or cleared through browser storage; they are not evidence that a hypothesis is true.';
export interface PlanRevision {
  readonly revision: number;
  readonly capturedAt: string;
  readonly worksheet: Readonly<Worksheet>;
  readonly plan: Readonly<TestPlan>;
}
export type PlanHistory = Record<string, readonly PlanRevision[]>;
export interface ResearchState { drafts: Record<string, Worksheet>; plans: Record<string, TestPlan>; revisions: PlanHistory }

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function worksheet(value: unknown): Worksheet | null {
  if (!record(value) || !WORKSHEET_FIELDS.every(key => typeof value[key] === 'string')) return null;
  return Object.fromEntries(WORKSHEET_FIELDS.map(key => [key, value[key]])) as Worksheet;
}
function plan(value: unknown): TestPlan | null {
  if (!record(value) || !PLAN_FIELDS.every(key => typeof value[key] === 'string') || !['exploratory', 'before-new-search'].includes(String(value.timing))) return null;
  return { ...Object.fromEntries(PLAN_FIELDS.map(key => [key, value[key]])), timing: value.timing } as TestPlan;
}
function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function freezeRevision(revision: number, capturedAt: string, draft: Worksheet, testPlan: TestPlan): PlanRevision {
  return Object.freeze({ revision, capturedAt, worksheet: Object.freeze({ ...draft }), plan: Object.freeze({ ...testPlan }) });
}

/** Retains valid v1 worksheets even if a new section is malformed. */
export function readResearchState(raw: unknown, allowedKeys: readonly string[]): ResearchState {
  if (!record(raw)) return { drafts: {}, plans: {}, revisions: {} };
  const keys = new Set(allowedKeys);
  const drafts = Object.fromEntries(record(raw.drafts) ? Object.entries(raw.drafts).flatMap(([key, value]) => {
    const parsed = worksheet(value); return keys.has(key) && parsed ? [[key, parsed]] : [];
  }) : []);
  const plans = Object.fromEntries(record(raw.plans) ? Object.entries(raw.plans).flatMap(([key, value]) => {
    const parsed = plan(value); return keys.has(key) && parsed ? [[key, parsed]] : [];
  }) : []);
  const revisions = Object.fromEntries(record(raw.revisions) ? Object.entries(raw.revisions).flatMap(([key, value]) => {
    if (!keys.has(key) || !Array.isArray(value)) return [];
    let previous = 0;
    const parsed = value.flatMap(item => {
      if (!record(item) || typeof item.revision !== 'number' || !Number.isSafeInteger(item.revision) || item.revision <= previous || !validTimestamp(item.capturedAt)) return [];
      const draft = worksheet(item.worksheet), testPlan = plan(item.plan);
      if (!draft || !testPlan) return [];
      previous = item.revision;
      return [freezeRevision(item.revision, item.capturedAt, draft, testPlan)];
    });
    return [[key, Object.freeze(parsed)]];
  }) : []);
  return { drafts, plans, revisions };
}

/** Copies every field so subsequent draft editing cannot mutate earlier snapshots. */
export function capturePlanRevision(history: PlanHistory, key: string, draft: Worksheet, testPlan: TestPlan, capturedAt: string): PlanHistory {
  const parsedDraft = worksheet(draft), parsedPlan = plan(testPlan);
  if (!key || !parsedDraft || !parsedPlan || !validTimestamp(capturedAt)) throw new TypeError('A valid worksheet, test plan and ISO timestamp are required.');
  const previous = history[key] ?? [];
  const nextNumber = (previous[previous.length - 1]?.revision ?? 0) + 1;
  if (!Number.isSafeInteger(nextNumber)) throw new RangeError('Revision number is outside the supported range.');
  const revision = freezeRevision(nextNumber, capturedAt, parsedDraft, parsedPlan);
  return { ...history, [key]: Object.freeze([...previous, revision]) };
}

export function resolveWorksheetLink(cases: readonly { id: string; hypotheses: readonly unknown[] }[], caseId: string | null, index: string | null): { caseId: string; hypothesisIndex: number } | null {
  const selected = cases.find(item => item.id === caseId);
  if (!selected || (index !== null && !/^\d+$/.test(index))) return null;
  const hypothesisIndex = index === null ? 0 : Number(index);
  if (!Number.isSafeInteger(hypothesisIndex) || hypothesisIndex < 0 || hypothesisIndex >= selected.hypotheses.length) return null;
  return { caseId: selected.id, hypothesisIndex };
}
