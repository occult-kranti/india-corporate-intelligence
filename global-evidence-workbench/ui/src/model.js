// Exact retained-object correction; raw dataset and nested originals remain audit material.
export const PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED = {
  "id": "india-corporate-intelligence:edge-290870791c720e40b543",
  "source": "india-corporate-intelligence:tata",
  "target": "india-corporate-intelligence:progressive",
  "type": "trust",
  "description": "Tata Sons ₹308cr + TCS ₹218cr into the pool.",
  "label": "₹757.6cr → BJP FY25",
  "sourceIds": [
    "india-corporate-intelligence:bd67576b7786e917"
  ],
  "status": "IMPORTED",
  "evidenceGrade": "documented",
  "validFrom": null,
  "validTo": null,
  "temporalStatus": "UNKNOWN",
  "amountOriginal": 757.6,
  "amountUnit": "INR crore",
  "amountAggregable": false,
  "amountSemantics": "upstream-display-value-not-exact-transaction",
  "transactionStage": "UNKNOWN",
  "pathEligible": false,
  "pathBlockReason": "Original source and temporal compatibility require review",
  "innocentReading": null,
  "upgradeIf": null,
  "killIf": null,
  "supersededBy": null,
  "supersessionTargetOriginal": null,
  "supersessionTargetStatus": null,
  "provenance": {
    "repository": "occult-kranti/india-corporate-intelligence",
    "commit": "c49a5256217c76b8ab2866c5df7711ffbacbf6bf",
    "path": "src/graph/data.ts",
    "recordId": 54,
    "retrievedAt": "2026-10-14T23:09:32Z",
    "verification": "Imported upstream record; cited original not freshly reverified"
  },
  "original": {
    "s": "tata",
    "t": "progressive",
    "pred": "trust",
    "tier": "documented",
    "a": 757.6,
    "lab": "₹757.6cr → BJP FY25",
    "d": "Tata Sons ₹308cr + TCS ₹218cr into the pool.",
    "srcs": [
      [
        "Wire",
        "https://m.thewire.in/article/politics/in-2024-25-bjp-got-rs-959-crore-from-electoral-trusts-tata-group-alone-contributed-rs-757-crore"
      ]
    ]
  }
};
const expectedSources = [
  {
    "title": "Wire",
    "url": "https://m.thewire.in/article/politics/in-2024-25-bjp-got-rs-959-crore-from-electoral-trusts-tata-group-alone-contributed-rs-757-crore",
    "id": "india-corporate-intelligence:bd67576b7786e917",
    "accessDepth": "repository-retained-citation",
    "originalRechecked": false,
    "repositoryRetrievedAt": "2026-10-14T23:09:32Z",
    "sourceFamily": "UNKNOWN"
  }
];
export function applyProgressiveUpstreamScopeCorrection(data) {
 const expected=PROGRESSIVE_UPSTREAM_GLOBAL_EXPECTED;
 const relationAliases=['relations','edges'],recordAliases=['records','events'];
 const matches=[...relationAliases,...recordAliases].map(key=>(data[key]??[]).filter(row=>row.id===expected.id));
 const targets=matches.flat();
 if(!targets.length){
  if(data.meta?.repositoryPins?.['india-corporate-intelligence'])throw new Error('Progressive upstream global object drift: missing target in pinned full corpus');
  return data;
 }
 if(matches.some(rows=>rows.length>1)||targets.some(row=>canonical(row)!==canonical(expected)))throw new Error('Progressive upstream global object drift');
 for(const source of expectedSources){const actual=(data.sources??[]).filter(row=>row.id===source.id);if(actual.length!==1||canonical(actual[0])!==canonical(source))throw new Error('Progressive upstream global source drift');}
 const notice='The retained amount describes an onward distribution and does not establish the upstream receipt. Original text is superseded audit material; no zero or replacement aggregate is inferred.';
 const held={id:expected.id,label:'Tata / Progressive · upstream amount held',summary:"This retained Tata-to-Progressive record carries an amount labeled for an onward BJP distribution. It does not establish the upstream amount, which remains excluded from totals and money paths. The original record remains available for audit.",
 layer:'Source-scope corrections',type:'source-scope-review',country:'India',status:'HELD_SOURCE_SCOPE',evidenceGrade:'held-not-upstream-payment-evidence',
 pathEligible:false,pathBlockReason:notice,amountOriginal:null,amountAggregable:false,sourceIds:expected.sourceIds,outcome:'Upstream amount remains unresolved.',
 caveats:[notice],original:expected.original,sourceScopeCorrection:{id:'progressive-upstream-stage-2026-10-16',notice},
 provenance:{...expected.provenance,correctionId:'progressive-upstream-stage-2026-10-16',verification:notice}};
 // Match normalize's original base precedence so adding the held reader cannot
 // discard unrelated events or edge-as-record rows in accepted schema variants.
 const base=data.records??data.events??data.edges??[];
 const corrected={...data,records:[...base.filter(row=>row.id!==expected.id),held]};
 for(const key of relationAliases)if(Array.isArray(data[key]))corrected[key]=data[key].filter(row=>row.id!==expected.id);
 if(Array.isArray(data.events))corrected.events=data.events.map(row=>row.id===expected.id?held:row);
 return corrected;
}

// Exact retained-object selectors. Original dataset files and nested audit objects stay immutable.
export const INHERITED_ABSENCE_GLOBAL_SPECS = [
  {
    "kind": "records",
    "original": {
      "id": "india-corporate-intelligence:tata",
      "label": "Tata Group",
      "layer": "entities",
      "type": "company",
      "country": "UNKNOWN",
      "city": null,
      "date": null,
      "status": "IMPORTED",
      "evidenceGrade": "upstream-mixed-see-relations",
      "sector": "capital",
      "summary": "Never bought bonds — but Progressive Electoral Trust → BJP ₹757.6cr FY25 (Tata Sons ₹308cr + TCS ₹218cr). PM CARES ~₹500cr. #1 PM Surya Ghar rooftop installer.",
      "outcome": "UNKNOWN",
      "sourceIds": [
        "india-corporate-intelligence:bd67576b7786e917"
      ],
      "location": null,
      "aliases": [
        "Tata Sons",
        "TCS",
        "Tata Power",
        "Progressive Electoral Trust"
      ],
      "geographicHints": {
        "upstreamStateDisplayHint": "mh",
        "meaning": "Not an event, personal, or project location"
      },
      "provenance": {
        "repository": "occult-kranti/india-corporate-intelligence",
        "commit": "c49a5256217c76b8ab2866c5df7711ffbacbf6bf",
        "path": "src/graph/data.ts",
        "recordId": "tata",
        "retrievedAt": "2026-10-14T23:09:32Z",
        "verification": "Imported upstream record; cited original not freshly reverified"
      },
      "claimStatus": "INHERITED_UNVERIFIED",
      "original": {
        "id": "tata",
        "label": "Tata Group",
        "sub": "power · software",
        "ty": "company",
        "fam": "capital",
        "st": "mh",
        "sz": 3,
        "al": [
          "Tata Sons",
          "TCS",
          "Tata Power",
          "Progressive Electoral Trust"
        ],
        "d": [
          "Never bought bonds — but Progressive Electoral Trust → BJP ₹757.6cr FY25 (Tata Sons ₹308cr + TCS ₹218cr). PM CARES ~₹500cr. #1 PM Surya Ghar rooftop installer."
        ],
        "srcs": [
          [
            "Wire trust",
            "https://m.thewire.in/article/politics/in-2024-25-bjp-got-rs-959-crore-from-electoral-trusts-tata-group-alone-contributed-rs-757-crore"
          ]
        ]
      }
    },
    "changes": {
      "summary": "Progressive Electoral Trust → BJP ₹757.6cr FY25 (Tata Sons ₹308cr + TCS ₹218cr). PM CARES ~₹500cr. #1 PM Surya Ghar rooftop installer."
    }
  },
  {
    "kind": "records",
    "original": {
      "id": "india-corporate-intelligence:leap",
      "label": "Leap India",
      "layer": "entities",
      "type": "company",
      "country": "UNKNOWN",
      "city": null,
      "date": null,
      "status": "IMPORTED",
      "evidenceGrade": "upstream-mixed-see-relations",
      "sector": "capital",
      "summary": "Won 38/48 Phase-2 FCI silo bundles (~₹6,173cr) under Joshi. ZERO political footprint anywhere — the key negative: the 2nd-biggest silo winner paid nothing, pointing cause at policy design not donations.",
      "outcome": "UNKNOWN",
      "sourceIds": [
        "india-corporate-intelligence:a7b73ce4632fc2cf"
      ],
      "location": null,
      "aliases": [
        "Leap India Food & Logistics",
        "Happzee Technologies"
      ],
      "geographicHints": {
        "upstreamStateDisplayHint": "tg",
        "meaning": "Not an event, personal, or project location"
      },
      "provenance": {
        "repository": "occult-kranti/india-corporate-intelligence",
        "commit": "c49a5256217c76b8ab2866c5df7711ffbacbf6bf",
        "path": "src/graph/data.ts",
        "recordId": "leap",
        "retrievedAt": "2026-10-14T23:09:32Z",
        "verification": "Imported upstream record; cited original not freshly reverified"
      },
      "claimStatus": "INHERITED_UNVERIFIED",
      "original": {
        "id": "leap",
        "label": "Leap India",
        "sub": "FCI silo logistics",
        "ty": "company",
        "fam": "capital",
        "st": "tg",
        "sz": 3,
        "al": [
          "Leap India Food & Logistics",
          "Happzee Technologies"
        ],
        "d": [
          "Won 38/48 Phase-2 FCI silo bundles (~₹6,173cr) under Joshi. ZERO political footprint anywhere — the key negative: the 2nd-biggest silo winner paid nothing, pointing cause at policy design not donations."
        ],
        "srcs": [
          [
            "BS bidder counts",
            "https://www.business-standard.com/amp/industry/news/govt-defends-fci-silo-awards-says-contracts-were-bid-competitively-126060301218_1.html"
          ]
        ]
      }
    },
    "changes": {
      "summary": "Won 38/48 Phase-2 FCI silo bundles (~₹6,173cr) under Joshi. Political donation history is unverified; the cited procurement report does not establish non-donation."
    }
  },
  {
    "kind": "records",
    "original": {
      "id": "india-corporate-intelligence:sarda",
      "label": "Sarda Energy",
      "layer": "entities",
      "type": "company",
      "country": "UNKNOWN",
      "city": null,
      "date": null,
      "status": "IMPORTED",
      "evidenceGrade": "upstream-mixed-see-relations",
      "sector": "capital",
      "summary": "Won Gare Palma IV/7 at a record 66.75% revenue share. Electoral bonds: not found — a winner who didn't pay.",
      "outcome": "UNKNOWN",
      "sourceIds": [
        "india-corporate-intelligence:16ca88f529f5829a"
      ],
      "location": null,
      "aliases": [],
      "geographicHints": {
        "upstreamStateDisplayHint": "ct",
        "meaning": "Not an event, personal, or project location"
      },
      "provenance": {
        "repository": "occult-kranti/india-corporate-intelligence",
        "commit": "c49a5256217c76b8ab2866c5df7711ffbacbf6bf",
        "path": "src/graph/data.ts",
        "recordId": "sarda",
        "retrievedAt": "2026-10-14T23:09:32Z",
        "verification": "Imported upstream record; cited original not freshly reverified"
      },
      "claimStatus": "INHERITED_UNVERIFIED",
      "original": {
        "id": "sarda",
        "label": "Sarda Energy",
        "sub": "minerals",
        "ty": "company",
        "fam": "capital",
        "st": "ct",
        "sz": 1,
        "d": [
          "Won Gare Palma IV/7 at a record 66.75% revenue share. Electoral bonds: not found — a winner who didn't pay."
        ],
        "srcs": [
          [
            "T1 results",
            "https://coal.gov.in/sites/default/files/2020-12/Result-of-e-auction-for-coal-mines-under-11th-Tranche_0.pdf"
          ]
        ]
      }
    },
    "changes": {
      "summary": "The Ministry of Coal result lists Sarda Energy and Minerals Limited’s 66.75% revenue-share closing bid for Gare Palma IV/7 on 9 November 2020."
    }
  },
  {
    "kind": "records",
    "original": {
      "id": "india-corporate-intelligence:progressive",
      "label": "Progressive Electoral Trust",
      "layer": "entities",
      "type": "trust",
      "country": "UNKNOWN",
      "city": null,
      "date": null,
      "status": "IMPORTED",
      "evidenceGrade": "upstream-mixed-see-relations",
      "sector": "recipient",
      "summary": "Gave BJP ₹757.62cr FY25 (Tata Sons ₹308cr + TCS ₹218cr) — the Tata group never bought bonds.",
      "outcome": "UNKNOWN",
      "sourceIds": [
        "india-corporate-intelligence:bd67576b7786e917"
      ],
      "location": null,
      "aliases": [],
      "geographicHints": {
        "upstreamStateDisplayHint": null,
        "meaning": "Not an event, personal, or project location"
      },
      "provenance": {
        "repository": "occult-kranti/india-corporate-intelligence",
        "commit": "c49a5256217c76b8ab2866c5df7711ffbacbf6bf",
        "path": "src/graph/data.ts",
        "recordId": "progressive",
        "retrievedAt": "2026-10-14T23:09:32Z",
        "verification": "Imported upstream record; cited original not freshly reverified"
      },
      "claimStatus": "INHERITED_UNVERIFIED",
      "original": {
        "id": "progressive",
        "label": "Progressive Electoral Trust",
        "sub": "Tata vehicle",
        "ty": "trust",
        "fam": "recipient",
        "st": null,
        "sz": 3,
        "d": [
          "Gave BJP ₹757.62cr FY25 (Tata Sons ₹308cr + TCS ₹218cr) — the Tata group never bought bonds."
        ],
        "srcs": [
          [
            "Wire",
            "https://m.thewire.in/article/politics/in-2024-25-bjp-got-rs-959-crore-from-electoral-trusts-tata-group-alone-contributed-rs-757-crore"
          ]
        ]
      }
    },
    "changes": {
      "summary": "Gave BJP ₹757.62cr FY25 (Tata Sons ₹308cr + TCS ₹218cr)."
    }
  },
  {
    "kind": "relations",
    "original": {
      "id": "india-corporate-intelligence:edge-ba6b2c3e65e9cae88c94",
      "source": "india-corporate-intelligence:coal",
      "target": "india-corporate-intelligence:sarda",
      "type": "award",
      "description": "Gare Palma IV/7 — a winner who paid the highest share and gave no donations.",
      "label": "record 66.75% bid",
      "sourceIds": [
        "india-corporate-intelligence:16ca88f529f5829a"
      ],
      "status": "IMPORTED",
      "evidenceGrade": "documented",
      "validFrom": null,
      "validTo": null,
      "temporalStatus": "UNKNOWN",
      "amountOriginal": null,
      "amountUnit": null,
      "amountAggregable": false,
      "amountSemantics": "upstream-display-value-not-exact-transaction",
      "transactionStage": "UNKNOWN",
      "pathEligible": false,
      "pathBlockReason": "Original source and temporal compatibility require review",
      "innocentReading": null,
      "upgradeIf": null,
      "killIf": null,
      "supersededBy": null,
      "supersessionTargetOriginal": null,
      "supersessionTargetStatus": null,
      "provenance": {
        "repository": "occult-kranti/india-corporate-intelligence",
        "commit": "c49a5256217c76b8ab2866c5df7711ffbacbf6bf",
        "path": "src/graph/data.ts",
        "recordId": 12,
        "retrievedAt": "2026-10-14T23:09:32Z",
        "verification": "Imported upstream record; cited original not freshly reverified"
      },
      "original": {
        "s": "coal",
        "t": "sarda",
        "pred": "award",
        "tier": "documented",
        "lab": "record 66.75% bid",
        "d": "Gare Palma IV/7 — a winner who paid the highest share and gave no donations.",
        "m": [
          "M10"
        ],
        "srcs": [
          [
            "Results",
            "https://coal.gov.in/sites/default/files/2020-12/Result-of-e-auction-for-coal-mines-under-11th-Tranche_0.pdf"
          ]
        ]
      }
    },
    "held": false,
    "changes": {
      "label": "66.75% closing bid",
      "description": "The Ministry of Coal result lists Sarda Energy and Minerals Limited's 66.75% revenue-share closing bid for Gare Palma IV/7 on 9 November 2020. This procurement result makes no finding about political donations."
    }
  },
  {
    "kind": "relations",
    "original": {
      "id": "india-corporate-intelligence:edge-36a48e03e54bb6a90d95",
      "source": "india-corporate-intelligence:leap",
      "target": "india-corporate-intelligence:bjp",
      "type": "direct",
      "description": "The ₹6,173cr silo winner has no traceable political giving — the analytic key: benefit ≠ payment.",
      "label": "₹0 — no footprint",
      "sourceIds": [
        "india-corporate-intelligence:a7b73ce4632fc2cf"
      ],
      "status": "IMPORTED",
      "evidenceGrade": "documented",
      "validFrom": null,
      "validTo": null,
      "temporalStatus": "UNKNOWN",
      "amountOriginal": null,
      "amountUnit": null,
      "amountAggregable": false,
      "amountSemantics": "upstream-display-value-not-exact-transaction",
      "transactionStage": "UNKNOWN",
      "pathEligible": false,
      "pathBlockReason": "Original source and temporal compatibility require review",
      "innocentReading": null,
      "upgradeIf": null,
      "killIf": null,
      "supersededBy": null,
      "supersessionTargetOriginal": null,
      "supersessionTargetStatus": null,
      "provenance": {
        "repository": "occult-kranti/india-corporate-intelligence",
        "commit": "c49a5256217c76b8ab2866c5df7711ffbacbf6bf",
        "path": "src/graph/data.ts",
        "recordId": 59,
        "retrievedAt": "2026-10-14T23:09:32Z",
        "verification": "Imported upstream record; cited original not freshly reverified"
      },
      "original": {
        "s": "leap",
        "t": "bjp",
        "pred": "direct",
        "tier": "documented",
        "lab": "₹0 — no footprint",
        "d": "The ₹6,173cr silo winner has no traceable political giving — the analytic key: benefit ≠ payment.",
        "m": [
          "M10"
        ],
        "srcs": [
          [
            "BS",
            "https://www.business-standard.com/amp/industry/news/govt-defends-fci-silo-awards-says-contracts-were-bid-competitively-126060301218_1.html"
          ]
        ]
      }
    },
    "held": true,
    "changes": {}
  }
];
const sources = [
  {
    "title": "Wire",
    "url": "https://m.thewire.in/article/politics/in-2024-25-bjp-got-rs-959-crore-from-electoral-trusts-tata-group-alone-contributed-rs-757-crore",
    "id": "india-corporate-intelligence:bd67576b7786e917",
    "accessDepth": "repository-retained-citation",
    "originalRechecked": false,
    "repositoryRetrievedAt": "2026-10-14T23:09:32Z",
    "sourceFamily": "UNKNOWN"
  },
  {
    "title": "BS",
    "url": "https://www.business-standard.com/amp/industry/news/govt-defends-fci-silo-awards-says-contracts-were-bid-competitively-126060301218_1.html",
    "id": "india-corporate-intelligence:a7b73ce4632fc2cf",
    "accessDepth": "repository-retained-citation",
    "originalRechecked": false,
    "repositoryRetrievedAt": "2026-10-14T23:09:32Z",
    "sourceFamily": "UNKNOWN"
  },
  {
    "title": "Results",
    "url": "https://coal.gov.in/sites/default/files/2020-12/Result-of-e-auction-for-coal-mines-under-11th-Tranche_0.pdf",
    "id": "india-corporate-intelligence:16ca88f529f5829a",
    "accessDepth": "repository-retained-citation",
    "originalRechecked": false,
    "repositoryRetrievedAt": "2026-10-14T23:09:32Z",
    "sourceFamily": "UNKNOWN"
  }
];
const canonical = value => Array.isArray(value) ? '['+value.map(canonical).join(',')+']' : value && typeof value==='object' ? '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}' : JSON.stringify(value);
export function applyInheritedAbsenceScopeCorrections(d) {
  const present=INHERITED_ABSENCE_GLOBAL_SPECS.filter(spec=>(d[spec.kind]??[]).some(row=>row.id===spec.original.id));
  if(!present.length)return d;
  for(const spec of present) {
    const rows=d[spec.kind].filter(row=>row.id===spec.original.id);
    if(rows.length!==1 || canonical(rows[0])!==canonical(spec.original))throw new Error(`Inherited absence object drift: ${spec.original.id}`);
    for(const sourceId of spec.original.sourceIds) {
      const expected=sources.find(source=>source.id===sourceId),actual=(d.sources??[]).filter(source=>source.id===sourceId);
      if(!expected || actual.length!==1 || canonical(actual[0])!==canonical(expected))throw new Error(`Inherited absence source drift: ${sourceId}`);
    }
  }
  const held=present.find(spec=>spec.held);
  // A same-ID mirrored relation/record must match too; no unguarded duplicate export.
  if(held) for(const row of (d.records??[]).filter(row=>row.id===held.original.id)) {
    if(canonical(row)!==canonical(held.original))throw new Error(`Inherited absence mirror drift: ${row.id}`);
  }
  const notice='Source-scope qualification only. Nested original objects are superseded audit material; retained adjacent amounts and claims are not newly approved. No purchase or recipient relationship is admitted.';
  const rewrite=(row,kind)=>{
    const spec=present.find(spec=>spec.kind===kind&&spec.original.id===row.id);
    return spec ? {...row,...spec.changes,sourceScopeCorrection:{id:'inherited-absence-scope-2026-10-16',notice},provenance:{...row.provenance,correctionId:'inherited-absence-scope-2026-10-16',correctionNotice:notice}} : row;
  };
  const records=(d.records??[]).filter(row=>!held||row.id!==held.original.id).map(row=>rewrite(row,'records'));
  if(held)records.push({id:held.original.id,label:"Political donation history unverified",summary:"The cited report concerns competitive FCI silo bidding, not political-payment coverage. It does not establish zero donations or a BJP-specific funding relationship.",
    layer:'Source-scope corrections',type:'source-scope-review',country:'India',status:'HELD_SOURCE_SCOPE',evidenceGrade:'held-not-funding-evidence',
    pathEligible:false,pathBlockReason:'Procurement reporting does not establish zero political donations.',amountOriginal:null,amountAggregable:false,
    sourceIds:held.original.sourceIds,outcome:'Wider political donation history remains unresolved.',caveats:[notice],original:held.original.original,
    sourceScopeCorrection:{id:'inherited-absence-scope-2026-10-16',notice},provenance:{...held.original.provenance,correctionId:'inherited-absence-scope-2026-10-16',verification:notice}});
  return {...d,records,relations:(d.relations??[]).filter(row=>!held||row.id!==held.original.id).map(row=>rewrite(row,'relations'))};
}

export const human=x=>String(x??'Unknown').replaceAll('_',' ');
export const safeURL=x=>{try{const u=new URL(x);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}};
export const years=r=>{const t=r.temporal??{};const dates=r.dates;return [...new Set((dates?[dates.start,dates.end,dates.event,dates.observed]:[r.date,t.as_of,t.raw,t.valid_from,t.valid_to,...(t.known_dates??[])]).filter(Boolean).flatMap(x=>String(x).match(/\b(?:19|20)\d{2}\b/g)??[]))];};
export function normalize(d){d=applyDisclosureScopeCorrection(applyDonationScopeCorrection(applyProgressiveUpstreamScopeCorrection(applyInheritedAbsenceScopeCorrections(d))));const nodes=d.nodes??d.entities??[];const base=d.records??d.events??d.edges??[];const countryNames=new Map(base.filter(r=>r.country&&r.countryName).map(r=>[r.country,r.countryName]));const countryCodes=new Map([...countryNames].map(([code,name])=>[name,code]));const relations=d.relations??d.edges??[];const extra=relations.filter(e=>!base.some(r=>r.id===e.id)).map(e=>({...e,label:e.label??e.description??e.type,layer:'Documented relations',type:e.type??e.relationship,summary:e.description,sourceIds:e.sourceIds??e.source_ids??[],country:base.find(r=>r.id===e.source)?.country??'Unknown',sector:base.find(r=>r.id===e.source)?.sector,location:null,caveats:[...(Array.isArray(e.caveats)?e.caveats:e.caveats?[e.caveats]:[]),...(Array.isArray(e.limitations)?e.limitations:e.limitations?[e.limitations]:[]),e.innocentReading,e.upgradeIf?'Upgrade evidence needed: '+e.upgradeIf:null,e.killIf?'Reject if: '+e.killIf:null].filter(Boolean)}));const records=[...base,...extra].map(r=>{const a=nodes.find(n=>n.id===r.source),b=nodes.find(n=>n.id===r.target);const raw=r.location??r.geo;const location=raw&&Number.isFinite(raw.lat)&&Number.isFinite(raw.lon)&&Math.abs(raw.lat)<=90&&Math.abs(raw.lon)<=180?raw:null;return {...r,id:String(r.id),label:r.label??r.title??`${a?.label??r.source??'Record'} → ${b?.label??r.target??''}`,layer:r.layer??r.dataset??'Research',country:countryNames.get(r.country)??r.countryName??r.country??a?.country??'Unknown',countryCode:countryCodes.get(r.country)??r.country,city:r.city??'Unknown',sector:r.sector??a?.sector??'Unclassified',type:r.type??r.relationship??'record',evidenceGrade:r.evidenceGrade??r.evidence_grade??'Unclassified',status:r.status??r.event_status??'Not assessed',sourceIds:r.sourceIds??r.source_ids??[],summary:r.summary??r.description??r.claim??'',outcome:r.outcome??'No outcome assessment supplied.',location,date:r.dates?(Object.hasOwn(r.dates,'start')?r.dates.start:r.dates.event??r.date):r.date,observedAt:r.dates?.observed??r.observedAt,dateEnd:r.dates?.end??r.dateEnd};});return {...d,records,nodes,sources:d.sources??[],relations:d.relations??d.edges??[],researchQueue:d.researchQueue??d.research_queue??[],rejectedJoins:d.rejectedJoins??d.rejected_joins??[],documentChanges:d.documentChanges??d.document_changes??[],counterhypotheses:d.counterhypotheses??d.hypotheses??[],coverageGaps:d.coverageGaps??d.coverage_gaps??d.missing_joins??[]};}
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
