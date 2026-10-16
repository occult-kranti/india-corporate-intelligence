/** Effective display projection; the generated fleet and retained audit builder stay unchanged. */
export * from './energy.generated';
import { ENERGY_NODES, ENERGY_EDGES as RETAINED_ENERGY_EDGES, ENERGY_META } from './energy.generated';
import type { GEdge } from './schema';
const expected: GEdge = {
  "id": "money:c040",
  "s": "progressive",
  "t": "bjp",
  "pred": "direct",
  "tier": "documented",
  "a": 757.6205,
  "lab": "Progressive → BJP ₹757.62 cr (Apr 2024)",
  "d": "Progressive Electoral Trust gave ₹757.62 cr to BJP (₹834.97 cr in two donations per BJP's report) in April 2024, weeks after the Cabinet's 29 Feb 2024 approval of two Tata semiconductor units with ~₹44,203 cr central subsidy.",
  "from": "2024-04-01",
  "to": "2025-03-31",
  "srcs": [
    [
      "ADR — Analysis of Contribution Reports of Electoral Trusts FY 2024-25 (13 Feb 2026, updated PDF)",
      "https://adrindia.org/sites/default/files/Updated_Eng_Analysis_of_Contribution_reports_of_Electoral_trusts_FY_2024-25_0.pdf"
    ],
    [
      "ADR — Analysis of donations declared by National Parties FY 2024-25 (26 Mar 2026, PDF)",
      "https://adrindia.org/sites/default/files/English_Analysis_of_donations_declared_by_National_Parties_FY_2024-25.pdf"
    ],
    [
      "Scroll, 27 Nov 2025, 'How Tata Group became BJP's biggest donor weeks after Modi cabinet cleared its semiconductor units' (Progressive Electoral Trust ₹758 cr to BJP, Apr 2024)",
      "https://scroll.in/article/1088771/how-tata-group-became-bjps-biggest-donor-weeks-after-modi-cabinet-cleared-its-semiconductor-units"
    ]
  ]
};
const canonical=(value:unknown):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}':JSON.stringify(value);
export const PROGRESSIVE_REPORTED_LABEL = "Progressive → BJP: reported FY2024–25 donation";
export const PROGRESSIVE_REPORTED_SUMMARY = "Retained reporting describes approximately ₹757.62 crore from Progressive Electoral Trust to BJP in FY2024–25. Exact payment dates and the adjacent subsidy chronology have not been independently verified in this review. This record does not establish company-to-party earmarking or causation.";
export function qualifyProgressiveEnergyEdges(edges:GEdge[]):GEdge[] {
  const targets=edges.filter(row=>row.id===expected.id);
  if(targets.length!==1||canonical(targets[0])!==canonical(expected))throw new Error('Progressive c040 object/source drift');
  return edges.map(row=>row.id===expected.id?{...row,lab:PROGRESSIVE_REPORTED_LABEL,d:PROGRESSIVE_REPORTED_SUMMARY}:row);
}
// The assembler deliberately emits an empty optional fleet when research is absent.
// Only that declared, wholly empty graph may omit c040; every populated projection
// still requires the exact retained object, even if its metadata says empty.
export const ENERGY_EDGES = ENERGY_META.fleet === 'energy' && ENERGY_META.empty === true
  && ENERGY_NODES.length === 0 && RETAINED_ENERGY_EDGES.length === 0
  ? RETAINED_ENERGY_EDGES
  : qualifyProgressiveEnergyEdges(RETAINED_ENERGY_EDGES);
