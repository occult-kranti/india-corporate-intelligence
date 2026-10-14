import funding from '../../research/investigations/funding.json';
import procurement from '../../research/investigations/procurement.json';
import institutions from '../../research/investigations/institutions.json';

export type InvestigationStatus = 'documented' | 'allegation' | 'open-question';
export interface InvestigationSource { id: string; title: string; url: string; publisher: string; date: string; access: string; supports: string; accessedAt?: string; caution?: string; }
export interface InvestigationHypothesis { question: string; prediction: string; alternative: string; falsifier: string; records: string; }
export interface InvestigationCase { id: string; title: string; sector: string; status: InvestigationStatus; summary: string; finding: string; limitation: string; response?: string; sources: string[]; entities: string[]; hypotheses: InvestigationHypothesis[]; }
export const INVESTIGATION_CASES = [...funding.cases, ...procurement.cases, ...institutions.cases] as InvestigationCase[];
export const INVESTIGATION_SOURCES = [...funding.sources, ...procurement.sources, ...institutions.sources] as InvestigationSource[];
export const INVESTIGATION_DATE = '2026-10-14';
export const INVESTIGATION_STATUS_LABELS: Record<InvestigationStatus, string> = { documented: 'Documented record', allegation: 'Attributed allegation', 'open-question': 'Open question' };
