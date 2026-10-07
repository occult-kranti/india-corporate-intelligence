# Money trails — evidence contract

Each research topic owns `research/raw/money-trails/<topic>/slice.json` (the existing `InvestigationRawSlice`, local IDs) and `trails.json` (this contract, **fully namespaced IDs**). Topics are `djb`, `mumbai`, `corporate`; namespace is `money-trails-<topic>`. A trail is an editorial sequence of evidenced steps, never an algorithmically inferred cash route. A person’s role, ownership, political donation and tender award must remain separate facts unless a source establishes a transaction connecting them.

```ts
interface MoneyTrailCatalog {
  schemaVersion: 1;
  namespace: string;
  cutoff: string; // YYYY-MM-DD review cutoff, not a claim of current procedural status
  trails: MoneyTrail[];
  hops: MoneyTrailHop[];
  hypotheses: MoneyTrailHypothesis[];
}
interface MoneyTrail {
  id: string; // money-trails-djb:trail:example; stable URL identifier
  title: string;
  city: 'delhi' | 'mumbai' | 'national' | 'multi-city';
  caseRecordId: string;
  question: string;
  conclusion: string; // bounded result, including where the trace stops
  sourceStatus: string; // distinguish source text, allegation, judgment and missing records
  cutoff: string;
  hopIds: string[]; // explicit editorial order; chronology is stated per hop
  hypothesisIds: string[];
  limitations: string[];
}
type MoneyTrailBasis =
  | 'documented-financial-disclosure'
  | 'court-recorded-agency-allegation'
  | 'agency-published-allegation'
  | 'judicial-procedural-finding'
  | 'accounting-reconciliation'
  | 'contract-commitment'
  | 'ownership-role-context'
  | 'unresolved-cash-path-stop';
type MoneyTrailFlowState = 'documented-transfer' | 'reported-transfer' | 'alleged-transfer' | 'commitment' | 'context' | 'gap';
interface EvidenceRef { kind: 'entity' | 'relationship' | 'record' | 'source'; id: string }
interface MoneyTrailHop {
  id: string; // namespace:hop:slug
  title: string;
  summary: string;
  basis: MoneyTrailBasis;
  flowState: MoneyTrailFlowState;
  fromEntityId: string | null;
  toEntityId: string | null;
  entityIds: string[];
  relationshipIds: string[]; // exact existing relationships only; a gap MUST have []
  recordIds: string[];
  sourceIds: string[];
  sourceLocators: {sourceId: string; locator: string; role: 'supports' | 'counterevidence' | 'response' | 'limitation'; sourceFamily?: string}[];
  date: string | null; // only exact YYYY-MM-DD; null for inexact event dates
  dateBasis: string; // event date vs source date vs stated period
  financialStage: string;
  amountRefs: {kind: 'record' | 'relationship'; id: string; amountIndex: number}[];
  responseRecordIds: string[];
  counterEvidenceRecordIds: string[];
  response: string; // substantive response OR explicit absence, never silence = agreement
  alternatives: string[];
  missingNextDocument: string; // exact next document; 'None required for this bounded fact' allowed
  documentHolder: string;
  limitations: string[];
  eventPeriod?: string;
  identityStatus?: string;
  overlapGroup?: string;
  stopReason?: string;
}
interface MoneyTrailHypothesis {
  id: string; // namespace:hypothesis:slug
  question: string;
  observation: string;
  expectedDocumentaryFootprints: string[];
  supportingEvidence: EvidenceRef[];
  refutingEvidence: EvidenceRef[];
  disconfirmationTest: string;
  documentHolder: string;
  neededRecords: string[];
  status: 'open' | 'supported-with-limits' | 'weakened' | 'refuted';
  limitations: string[];
}
```

Amounts are resolved by index from the original registry record or relationship, retaining currency, unit, stage and period. No totals are calculated across hops. `documented-transfer` requires an explicit sourced financial relationship; an award/commitment is not payment. `court-recorded-agency-allegation` retains allegation status even when its container is a court order. Context hops cannot become money-flow arrows. Gap hops have no financial relationships and no amount references. A missing next document is not evidence that misconduct occurred.

For every referenced source, archive its public evidence and include `sha256-manifest.json` in the topic directory. `artifacts` entries have repository-relative `path`, `sha256`, and mandatory `bytes`. A source-to-artifact map is required: `sourceArtifacts: [{sourceId: '<fully namespaced source ID>', paths: ['research/raw/...']}]`. Retained extracts are acceptable when accurately labeled with retrieval limitations; archive receipts must not pretend a failed PDF download succeeded. Do not include bank-account numbers, personal addresses, identity-document numbers or non-public contact details.

Hypotheses are testable investigative questions and disconfirmation plans. They must not contain operational instructions for concealment or evasion. A useful question names the observed discrepancy, the records that would distinguish lawful from unlawful explanations, and the department/corporation holding them. No association, shared surname, official role, donor record or temporal proximity alone establishes a transaction or quid pro quo.

The UI helpers return a provenance-closed packet retaining all explicitly selected records, sources, entities, exact relationships, responses, alternatives and hypothesis counterevidence. The graph projection includes only the trail's explicitly referenced relationships; recursively retained context is separately labeled. Counts describe hop bases and missing-document stops, never a completeness percentage or corruption count. Empty input produces an empty view.

`reported-transfer` retains a described financial transaction whose retained source is indirect (for example, a disclosed-document mirror); it does not imply illegality or upgrade the source to primary. `agency-published-allegation` distinguishes an agency press release from a court document. `judicial-procedural-finding` with `flowState: context` records a tribunal or court’s own procedural holding separately from the allegations quoted inside the same document. Optional `sourceFamily` records derivative/common document origin without pretending each URL is independent corroboration; `overlapGroup` marks shared economic bases that must never be added.

## Application API and display projections

`getMoneyTrailsView(registry, options, catalogs?)` returns authored trails, a search/city-filtered view and descriptive record counts. `getMoneyTrailDetail(registry, id, catalogs?)` resolves ordered hops, exact original amounts, hypotheses, a complete evidence packet, and two separately scoped graph registries. An unknown ID returns `null`; empty authored input creates no substitute allegations. The default catalog order is Delhi, Mumbai, then corporate financing trails; this is navigation order, not an accusation ranking.

`pathRegistry` admits only explicitly authored financial and commitment steps. `contextRegistry` additionally retains authored contextual steps plus a maximum of two edges of exactly joined identity, ownership and role context. No name-matching inference or general adjacency becomes a payment. `pathMapRegistry` narrows only the displayed participant and relationship reference lists on selected source records so geographic map admission remains consistent with the financial selection. It preserves the original record ID, geography, sources and prose, and appends an explicit map-projection limitation. `contextMapRegistry` retains the wider documented context. The source record itself is never changed: readers use the full shared registry, and exports retain the original participant and relationship lists.

`exportMoneyTrailEvidence(registry, id, catalogs?)` includes the unchanged source records, all recursively linked responses, source-only counterevidence, amounts with their original stages, hypotheses and a separate context packet. `missingIds` must be empty for publication. Amounts are never summed by the helper. `metrics.byBasis` and `metrics.byFlowState` count evidence steps, with gaps separately counted; they do not claim independent corroboration or completed tracing.

Run `node scripts/money-trails/validate.mjs` for source hashes, bindings, direction/stage admission and complete integrated joins. Run `node --test scripts/money-trails/evidence.test.mjs scripts/money-trails/challenge.test.mjs` for hostile fixtures and independently authored factual challenges. The archive validator checks actual retained artifact bytes, rather than merely trusting a manifest's declarations.
