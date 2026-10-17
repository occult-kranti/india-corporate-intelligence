// Version 3 named resource contract. Package/producer/schema checks and external publication authorization remain separate.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const expected=Object.freeze({"schema":"world-evidence-budget-v3-persistent-decoder","approval":"RESOURCE_CONTRACT_ACCEPTED_PENDING_PACKAGE_REVIEW","outerMemberDefaultBytes":134217728,"outerTraceZipBytes":268435456,"outerTotalBytes":536870912,"traceMemberDefaultBytes":134217728,"traceEventStreamBytes":402653184,"traceExpandedTotalBytes":536870912,"streamChunkBytes":65536,"traceLineBytes":16777216,"maxEvents":500000,"maxCalls":100000,"pythonAddressSpaceBytes":536870912,"decoderAddressSpaceBytes":2147483648,"validatorDeadlineSeconds":115,"outerAuditTimeoutMilliseconds":120000,"imageTimeoutSeconds":20,"pythonHardAddressSpaceBytes":805306368});
export const PROPOSED_BUDGET=Object.freeze(JSON.parse(readFileSync(new URL('./EVIDENCE-BUDGET-PROPOSAL.json',import.meta.url),'utf8')));
assert.deepEqual(PROPOSED_BUDGET,expected,'UNREVIEWED_BUDGET_CONFIGURATION');
export function proposedOuterLimit(path){return path==='trace.zip'?PROPOSED_BUDGET.outerTraceZipBytes:PROPOSED_BUDGET.outerMemberDefaultBytes;}
export function assertProposedOuterBudgets(rows){
 assert(rows.every(r=>Number.isSafeInteger(r.bytes)&&r.bytes>=0),'EVIDENCE_SIZE_TYPE');
 assert(rows.reduce((sum,r)=>sum+r.bytes,0)<=PROPOSED_BUDGET.outerTotalBytes,'EVIDENCE_BUDGET');
 assert(rows.every(r=>r.bytes<=proposedOuterLimit(r.path)),'EVIDENCE_MEMBER_BUDGET');
}
export function requireApprovedEvidenceBudget(){assert.deepEqual(PROPOSED_BUDGET,expected,'UNREVIEWED_BUDGET_CONFIGURATION');return PROPOSED_BUDGET;}
