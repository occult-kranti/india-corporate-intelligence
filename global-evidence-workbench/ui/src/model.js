export const human=x=>String(x??'Unknown').replaceAll('_',' ');
export const safeURL=x=>{try{const u=new URL(x);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
export const years=r=>{const t=r.temporal??{};const dates=r.dates;return [...new Set((dates?[dates.start,dates.end,dates.event,dates.observed]:[r.date,t.as_of,t.raw,t.valid_from,t.valid_to,...(t.known_dates??[])]).filter(Boolean).flatMap(x=>String(x).match(/\b(?:19|20)\d{2}\b/g)??[]))];};
export function normalize(d){d=applyDisclosureScopeCorrection(applyDonationScopeCorrection(d));const nodes=d.nodes??d.entities??[];const base=d.records??d.events??d.edges??[];const countryNames=new Map(base.filter(r=>r.country&&r.countryName).map(r=>[r.country,r.countryName]));const countryCodes=new Map([...countryNames].map(([code,name])=>[name,code]));const relations=d.relations??d.edges??[];const extra=relations.filter(e=>!base.some(r=>r.id===e.id)).map(e=>({...e,label:e.label??e.description??e.type,layer:'Documented relations',type:e.type??e.relationship,summary:e.description,sourceIds:e.sourceIds??e.source_ids??[],country:base.find(r=>r.id===e.source)?.country??'Unknown',sector:base.find(r=>r.id===e.source)?.sector,location:null,caveats:[...(Array.isArray(e.caveats)?e.caveats:e.caveats?[e.caveats]:[]),...(Array.isArray(e.limitations)?e.limitations:e.limitations?[e.limitations]:[]),e.innocentReading,e.upgradeIf?'Upgrade evidence needed: '+e.upgradeIf:null,e.killIf?'Reject if: '+e.killIf:null].filter(Boolean)}));const records=[...base,...extra].map(r=>{const a=nodes.find(n=>n.id===r.source),b=nodes.find(n=>n.id===r.target);const raw=r.location??r.geo;const location=raw&&Number.isFinite(raw.lat)&&Number.isFinite(raw.lon)&&Math.abs(raw.lat)<=90&&Math.abs(raw.lon)<=180?raw:null;return {...r,id:String(r.id),label:r.label??r.title??`${a?.label??r.source??'Record'} → ${b?.label??r.target??''}`,layer:r.layer??r.dataset??'Research',country:countryNames.get(r.country)??r.countryName??r.country??a?.country??'Unknown',countryCode:countryCodes.get(r.country)??r.country,city:r.city??'Unknown',sector:r.sector??a?.sector??'Unclassified',type:r.type??r.relationship??'record',evidenceGrade:r.evidenceGrade??r.evidence_grade??'Unclassified',status:r.status??r.event_status??'Not assessed',sourceIds:r.sourceIds??r.source_ids??[],summary:r.summary??r.description??r.claim??'',outcome:r.outcome??'No outcome assessment supplied.',location,date:r.dates?(Object.hasOwn(r.dates,'start')?r.dates.start:r.dates.event??r.date):r.date,observedAt:r.dates?.observed??r.observedAt,dateEnd:r.dates?.end??r.dateEnd};});return {...d,records,nodes,sources:d.sources??[],relations:d.relations??d.edges??[],researchQueue:d.researchQueue??d.research_queue??[],rejectedJoins:d.rejectedJoins??d.rejected_joins??[],documentChanges:d.documentChanges??d.document_changes??[],counterhypotheses:d.counterhypotheses??d.hypotheses??[],coverageGaps:d.coverageGaps??d.coverage_gaps??d.missing_joins??[]};}
export function filterRecords(d,f){return d.records.filter(r=>['layer','country','sector','status','evidenceGrade'].every(k=>!f[k]||r[k]===f[k])&&(!f.city||r.city===f.city||(r.cities??[]).some(c=>(typeof c==='string'?c:c.name)===f.city))&&(!f.year||years(r).includes(f.year)||(!years(r).length&&f.undated))&&(!f.search||[r.label,r.summary,r.country,r.city,r.type,r.id].join(' ').toLowerCase().includes(f.search.toLowerCase())));}
export function project(lat,lon,rotation=0){const a=lat*Math.PI/180,b=(lon-rotation)*Math.PI/180;return {x:Math.cos(a)*Math.sin(b),y:Math.sin(a),z:Math.cos(a)*Math.cos(b)};}
export function visibleRelations(d,records){const ids=new Set(records.map(r=>r.id));return d.relations.filter(e=>ids.has(e.id)||ids.has(e.source)&&ids.has(e.target));}

// Exact retained-source correction; raw dataset and original objects remain unchanged.
export function applyDonationScopeCorrection(d) {
  const sourceId = 'india-corporate-intelligence:4acf7f78f1e2a50d';
  const sourceURL = "https://www.oneindia.com/india/adani-reliance-tata-missing-from-electoral-bonds-list-who-are-the-top-donors-3774513.html";
  if (!(d.sources ?? []).some(s => s.id === sourceId && s.url === sourceURL)) return d;
  const summary = "A 15 March 2024 report said Adani Group’s name was absent from the electoral-bond data released at that time. It does not establish total political donations, a BJP-specific funding relationship, or payments through other channels.";
  const reason = "Citation supports a narrow reported name-absence observation, not the retained universal zero-donation claim.";
  const matches = e => e.id === 'india-corporate-intelligence:edge-e7605f62f7476da5f3e1'
    && e.source === 'india-corporate-intelligence:adani' && e.target === 'india-corporate-intelligence:bjp'
    && e.type === 'direct' && e.sourceIds?.includes(sourceId)
    && e.label === "₹0 — documented void"
    && e.description === "No disclosed political donation anywhere FY13–25. A verified ABSENCE — reads as either no quid pro quo OR untraceable payment; the graph asserts neither.";
  const held = (d.relations ?? []).filter(matches);
  const records = (d.records ?? []).filter(r => !matches(r)).map(r =>
    r.id === 'india-corporate-intelligence:adani' && r.sourceIds?.includes(sourceId)
      ? {...r, summary: r.summary?.replace("ZERO disclosed political donations anywhere FY13–FY25 — the 'documented void' [documented absence]. Denies wrongdoing.", summary + "\nDenies wrongdoing.\n")} : r);
  for (const e of held) records.push({
    id: e.id, label: "Electoral-bond name absence reported; wider donation history unverified", summary,
    layer: 'Source-scope corrections', type: 'source-scope-review', country: 'India',
    status: 'HELD_SOURCE_SCOPE', evidenceGrade: 'held-not-funding-evidence',
    pathEligible: false, pathBlockReason: reason, amountOriginal: null, amountAggregable: false,
    sourceIds: e.sourceIds, outcome: reason, caveats: [reason], original: e.original,
    provenance: {...e.provenance, correctionId: "adani-zero-donation-scope-correction-2026-10-16", verification: reason},
  });
  return {...d, records, relations: (d.relations ?? []).filter(e => !matches(e))};
}

// Separately reviewed citation-scope mismatch, limited to this retained disclosure claim.
export function applyDisclosureScopeCorrection(d) {
  const sourceId = 'india-corporate-intelligence:24f8ed8219f004a0';
  if (!(d.sources ?? []).some(s => s.id === sourceId && s.url === "https://www.business-standard.com/markets/news/only-8-sensex-firms-disclosed-making-political-contribution-in-last-5-years-124032201044_1.html")) return d;
  const matches = e => e.id === 'india-corporate-intelligence:edge-b3d60e32fb42932af025'
    && e.source === 'india-corporate-intelligence:sec182' && e.target === 'india-corporate-intelligence:adani'
    && e.type === 'law' && e.sourceIds?.includes(sourceId)
    && e.label === "disclosure gap"
    && e.description === "No non-zero §182 political line found across FY20–25; consistent with a genuine nil OR concealment — indistinguishable on the face of a report.";
  const held = (d.relations ?? []).filter(matches);
  const records = (d.records ?? []).filter(r => !matches(r));
  for (const e of held) records.push({
    id: e.id, label: "Adani-specific disclosure claim unverified", summary: "The inherited citation does not establish a company-by-company Adani political-contribution disclosure review for FY20–FY25. This claim is held pending suitable entity- and year-specific evidence; no conclusion about donation amounts or concealment is supported.",
    layer: 'Source-scope corrections', type: 'source-scope-review', country: 'India',
    status: 'HELD_SOURCE_SCOPE', evidenceGrade: 'held-not-disclosure-evidence',
    pathEligible: false, pathBlockReason: "Material entity-population and period mismatch; unsupported insinuation remains in a distinct legacy claim.", amountOriginal: null, amountAggregable: false,
    sourceIds: e.sourceIds, outcome: "Material entity-population and period mismatch; unsupported insinuation remains in a distinct legacy claim.", caveats: ["Material entity-population and period mismatch; unsupported insinuation remains in a distinct legacy claim."], original: e.original,
    provenance: {...e.provenance, correctionId: "adani-section182-source-scope-audit-2026-10-16", verification: "Material entity-population and period mismatch; unsupported insinuation remains in a distinct legacy claim."},
  });
  return {...d, records, relations: (d.relations ?? []).filter(e => !matches(e))};
}
