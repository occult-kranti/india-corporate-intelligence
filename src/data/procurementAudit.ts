import type {InvestigationRawSlice} from './investigation';
export interface ProcurementAuditMetric {label:string;value:number;unit:string;denominator?:number;denominatorLabel?:string}
export interface ProcurementAuditFinding {id:string;recordId:string;title:string;summary:string;scope:string;sourceIds:string[];queryIds:string[];metrics:ProcurementAuditMetric[]}
import compact from './procurement-audit.json';
export const PROCUREMENT_AUDIT_STATUS=compact.status;
export const PROCUREMENT_AUDIT_FINDINGS=compact.findings as ProcurementAuditFinding[];
export const PROCUREMENT_AUDIT_SLICE=compact.slice as unknown as InvestigationRawSlice;
