/** Narrative-only types. No sector entry implements any InvestigationRegistry row. */
export const SECTOR_HELD_STATUS = 'awaiting-parent-content-review' as const;
export const SECTOR_READER_STATUS = 'READER_ADMITTED' as const;
export const SECTOR_GRAPH_STATUS = 'PUBLIC_GRAPH_BLOCKED' as const;
export type DateValue = string | null | boolean | string[];
export type DateFields = Record<string, DateValue>;
export interface SourceReference { sourceId: string; locator: string }
export interface SectorSource {
  id: string; url: string; sha256: string; bytes: number;
  sourceFamily: string; dates: DateFields; independence: string;
}
export interface RetainedHold {
  graphEligible: false; pathEligible: false; publicationStatus: typeof SECTOR_HELD_STATUS;
}
export interface SectorPacket extends RetainedHold {
  id: string; reviewDate: string; reviewStatus: 'documentary support with qualifications; public hold preserved';
  correctionReceiptPresent: boolean;
}
export interface MoneyStage {
  stage: string; amount: number | null; currency: 'USD' | null;
  overlapGroup: string; notAuditedCashProof: true;
  valueAsReported?: string; exactTransferDate?: null; dateBasis?: string; announcementDate?: string;
}
export interface PayerAttribution {
  financier: 'IDA'; reportedRoute: 'World Bank to designated agency account';
  financierToPayerInferred: true; originatingAccountIdentified: false;
}
export interface SectorEntry extends RetainedHold {
  id: string; packet: string; claimText: string;
  claimTextType: 'qualified_reader_paraphrase_not_verbatim_source_quote';
  sources: SourceReference[]; dates: DateFields; qualifications: string[]; unresolved: string[];
  moneyStages: MoneyStage[]; aggregationPermitted: false; criticismResponseIds: string[];
  sourceRecordPointer: { file: string; id: string };
  directLegalParentAtSnapshot?: null; notEstablished?: string; payerAttribution?: PayerAttribution;
}
export interface SectorCriticismResponse extends SourceReference {
  id: string; packet: string; criticism: string; response: string; status: string;
  additionalSources?: SourceReference[];
}
export interface SectorFinancialContext extends SourceReference {
  packet: string; text: string; additionalSources?: SourceReference[];
}
export interface SectorProjection extends RetainedHold {
  schemaVersion: 1; mode: 'local-reader-stage'; aggregationPermitted: false;
  packets: SectorPacket[]; sources: SectorSource[]; entries: SectorEntry[];
  criticismResponses: SectorCriticismResponse[]; financialContext: SectorFinancialContext[];
}
export interface SectorReaderAdmission {
  schemaVersion: 1; admissionId: 'sector-2026-10-reader-v1'; surface: 'explicit-opt-in-sector-reader';
  readerStatus: typeof SECTOR_READER_STATUS; graphStatus: typeof SECTOR_GRAPH_STATUS;
  publicGraphEligible: false; publicPathEligible: false; aggregationPermitted: false;
  payloadSha256: { base: string; projection: string }; packetIds: string[];
  claims: { id: string; packet: string; sourceIds: string[]; criticismResponseIds: string[] }[];
  sources: { sourceId: string; retainedContentSha256: string }[];
  criticismResponses: { id: string; packet: string; sourceIds: string[] }[];
  financialContext: { packet: string; sourceIds: string[] }[];
}
