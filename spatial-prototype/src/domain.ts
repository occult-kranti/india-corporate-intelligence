/** Original investigation schema, retained as types only. No legacy runtime graph is imported. */
export type InvestigationNodeFamily =
  "state" | "capital" | "recipient" | "instrument" | "enforce" | "market";
export type InvestigationTier =
  "documented" | "reported" | "alleged" | "analytic" | "self-reported";
export type InvestigationLayer =
  | "people"
  | "organisations"
  | "funding"
  | "procurement"
  | "legal"
  | "welfare"
  | "services"
  | "policy"
  | "review";
export type InvestigationGeoBasis =
  | "project-location"
  | "programme-coverage"
  | "headquarters"
  | "constituency"
  | "institution-location"
  | "state-association"
  | "national-context"
  | "country-context"
  | "unknown";
export interface InvestigationGeography {
  scope:
    | "national"
    | "country"
    | "state"
    | "multi-state"
    | "district"
    | "city"
    | "village"
    | "block"
    | "project"
    | "unknown";
  countryCodes?: string[];
  stateCodes: string[];
  localityIds: string[];
  basis: InvestigationGeoBasis;
  note: string;
  sourceIds: string[];
}
export interface InvestigationSource {
  id: string;
  originalId: string;
  namespace: string;
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  retrievedAt: string | null;
  locator: string;
  summary: string;
  tier: InvestigationTier;
  limitations: string[];
}
export interface InvestigationDimensions {
  domains: string[];
  layers: InvestigationLayer[];
  geography: InvestigationGeography[];
  route: string;
  sourceIds: string[];
  limitations: string[];
}
export interface InvestigationEntity extends InvestigationDimensions {
  id: string;
  originalId: string;
  namespace: string;
  label: string;
  type: string;
  family?: InvestigationNodeFamily;
  resolved: boolean;
  identityBasis: string;
  summary: string;
}
export interface InvestigationAmount {
  value: number;
  currency: string;
  unit: string;
  stage: string;
  period: string;
}
export interface InvestigationRelationship extends InvestigationDimensions {
  id: string;
  originalId: string;
  namespace: string;
  from: string;
  to: string;
  kind: string;
  label: string;
  tier: InvestigationTier;
  status: string;
  statusAsOf: string | null;
  fromDate: string | null;
  toDate: string | null;
  dateBasis: string;
  summary: string;
  alternativeExplanations: string[];
  falsifier: string | null;
  responseIds: string[];
  recordIds: string[];
  amounts: InvestigationAmount[];
}
export interface InvestigationRecord extends InvestigationDimensions {
  id: string;
  originalId: string;
  namespace: string;
  title: string;
  summary: string;
  kind: string;
  tier: InvestigationTier;
  status: string;
  statusAsOf: string | null;
  fromDate: string | null;
  toDate: string | null;
  dateBasis: string;
  entityIds: string[];
  relationshipIds: string[];
  period: string;
  response: string;
  alternativeExplanations: string[];
  falsifier: string | null;
  amounts: InvestigationAmount[];
}
export interface InvestigationLocality {
  id: string;
  originalId: string;
  namespace: string;
  name: string;
  stateCode: string;
  kind: string;
  aliases: string[];
  districtName?: string;
}
export interface InvestigationHeldRecord {
  id: string;
  namespace: string;
  kind: string;
  reason: string;
  sourceIds: string[];
  route: string;
}
export interface InvestigationCoverage {
  namespace: string;
  label: string;
  route: string;
  entities: number;
  relationships: number;
  records: number;
  sources: number;
  held: number;
  limitations: string[];
}
export interface InvestigationRegistry {
  updatedAt: string;
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  records: InvestigationRecord[];
  sources: InvestigationSource[];
  states: { code: string; name: string }[];
  localities: InvestigationLocality[];
  coverage: InvestigationCoverage[];
  held: InvestigationHeldRecord[];
  methodology: string[];
}
export interface InvestigationFilters {
  stateCode?: string;
  compareStateCode?: string;
  q?: string;
  domains?: string[];
  layers?: InvestigationLayer[];
  tiers?: InvestigationTier[];
  from?: string;
  to?: string;
  includeUndated?: boolean;
  includeNational?: boolean;
  geographyMode?: "coverage" | "associations" | "all";
}
export interface InvestigationCounts {
  entities: number;
  relationships: number;
  records: number;
  sources: number;
}
export interface InvestigationView {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  records: InvestigationRecord[];
  sources: InvestigationSource[];
  totals: InvestigationCounts;
  denominator: InvestigationCounts;
  nationalRecords: number;
  internationalRecords: number;
  unknownRecords: number;
  heldCount: number;
  filters: InvestigationFilters;
}
export interface InvestigationStateCoverage {
  stateCode: string;
  name: string;
  records: number;
  entities: number;
  relationships: number;
  coverageRecords: number;
  associationRecords: number;
  nationalContextRecords: number;
  unknownRecords: number;
  domains: string[];
}
export interface InvestigationNeighborhood {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  sources: InvestigationSource[];
  truncated: boolean;
  totalEntities: number;
  totalRelationships: number;
  depth: number;
}
export interface InvestigationPathResult {
  paths: { entityIds: string[]; relationshipIds: string[] }[];
  searchedEntities: number;
  truncated: boolean;
  reason: string;
}
export interface InvestigationReviewQuestion {
  id: string;
  title: string;
  summary: string;
  kind: string;
  numerator: number;
  denominator: number;
  denominatorLabel: string;
  entityIds: string[];
  relationshipIds: string[];
  recordIds: string[];
  sourceIds: string[];
  alternativeExplanations: string[];
  falsifier: string;
  limitations: string[];
}
export interface InvestigationRawSlice {
  sources: Omit<InvestigationSource, "namespace" | "originalId">[];
  entities: (Omit<InvestigationEntity, "namespace" | "originalId"> & {
    canonicalId?: string;
  })[];
  relationships: Omit<InvestigationRelationship, "namespace" | "originalId">[];
  records: Omit<InvestigationRecord, "namespace" | "originalId">[];
  localities: Omit<InvestigationLocality, "namespace" | "originalId">[];
}
