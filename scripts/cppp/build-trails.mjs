#!/usr/bin/env node
/** Compact, exact-key projection of reviewed public-body cohorts. No supplier names. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const files={reviewed:'src/data/public-works-research.json',rates:'research/raw/cppp/rates.json',concentration:'research/raw/cppp/concentration.json',provenance:'research/raw/cppp/provenance.json'};
const sha=value=>createHash('sha256').update(value).digest('hex');
const key=(portal,buyer)=>JSON.stringify([portal,buyer]);
export function trailId(portal,buyer,snapshot,buyerRule){return `cppp-buyer-${sha(JSON.stringify([portal,buyer,snapshot,buyerRule])).slice(0,20)}`;}
function uniqueIndex(rows,buyerField){const result=new Map();for(const row of rows){const id=key(row.portal,row[buyerField]);if(result.has(id))throw new Error(`Duplicate exact buyer key: ${id}`);result.set(id,row);}return result;}

export function buildTrails({reviewed,rates,concentration,provenance},inputs=[]){
 const p=provenance.provenance;
 if(!p.buyerRule||!p.asOf||!p.inputs?.length)throw new Error('Complete buyer rule and input snapshot required');
 const snapshot=`cppp:${p.asOf}:${p.inputs.map(row=>row.sha256_16).join('.')}`;
 for(const [label,source] of [['rates',rates],['concentration',concentration]]){
  if(source.provenance.buyerRule!==p.buyerRule||source.provenance.asOf!==p.asOf||JSON.stringify(source.provenance.inputs)!==JSON.stringify(p.inputs))throw new Error(`${label} snapshot or buyer rule mismatch`);
 }
 const rateIndex=uniqueIndex(rates.byOrganisation,'key'), concentrationIndex=uniqueIndex(concentration.byBuyer,'buyer');
 const seen=new Set();
 const buyers=reviewed.buyers.map(row=>{
  if(!['central','state'].includes(row.portal))throw new Error('Unsupported portal');
  const exact=key(row.portal,row.buyer),rate=rateIndex.get(exact),c=concentrationIndex.get(exact);
  if(seen.has(exact))throw new Error(`Duplicate reviewed buyer: ${exact}`);seen.add(exact);
  if(!rate)throw new Error(`Reviewed buyer missing rate: ${exact}`);
  for(const field of ['n','singleBidder','singleBidderPct'])if(row[field]!==rate[field])throw new Error(`Reviewed rate differs: ${exact}/${field}`);
  if(JSON.stringify(row.wilson95)!==JSON.stringify(rate.wilson95))throw new Error(`Reviewed interval differs: ${exact}`);
  if(row.portal==='central'&&(row.scope!=='national'||row.stateCodes.length||row.localityIds.length))throw new Error('Central buyer cannot imply work-site geography');
  return {id:trailId(row.portal,row.buyer,snapshot,p.buyerRule),reviewedBuyerId:row.id,buyer:row.buyer,portal:row.portal,sectors:row.sectors,stateCodes:row.portal==='state'?row.stateCodes:[],scope:row.portal==='central'?'national':row.stateCodes.length?'state':'unknown',classificationBasis:row.classificationBasis,bidRate:{n:rate.n,singleBidder:rate.singleBidder,pct:rate.singleBidderPct,wilson95:rate.wilson95},concentration:c?{namedPlausibleAwards:c.awards,namedPlausibleValueInr:c.valueSumInr,markedAwards:c.markedAwards,unmarkedAwards:c.unmarkedAwards,markedSharePct:Math.round(10000*c.markedAwards/c.awards)/100,unmarkedShareOfValuePct:c.unmarkedShareOfValuePct,distinctMarkedLabels:c.distinctMarkedWinners,hhiMarkedCount:c.hhiMarkedCount,hhiMarkedValue:c.hhiMarkedValue,topMarkedShareOfValuePct:c.topMarkedWinnerSharePct,topMarkedShareOfCountPct:c.topMarkedWinnerShareOfCountPct}:null};
 }).sort((a,b)=>a.portal.localeCompare(b.portal,'en')||a.buyer.localeCompare(b.buyer,'en'));
 if(new Set(buyers.map(row=>row.id)).size!==buyers.length)throw new Error('Trail ID collision');
 return {schemaVersion:1,assembledAt:'2026-10-06',snapshot,computedAt:p.asOf,generatedBy:p.generatedBy,buyerRule:p.buyerRule,dedupRule:p.dedupRule,arrowInputs:p.inputs,inputs,scope:`${buyers.length} reviewed public-works buyer cohorts; a selected subset, not every buyer in the scrape. All ${concentration.byBuyer.length} concentration rows remain in the national tender tables.`,rateDenominator:rates.denominator,concentrationFamily:concentration.family,concentrationNamingRule:concentration.namingRule,concentrationInnocentReading:concentration.innocentReading,buyers};
}

export function generateTrails(){
 const inputs=Object.entries(files).map(([name,file])=>{const bytes=readFileSync(`${ROOT}${file}`);return {name,file,sha256:sha(bytes),bytes:bytes.length};});
 const data=Object.fromEntries(Object.entries(files).map(([name,file])=>[name,JSON.parse(readFileSync(`${ROOT}${file}`,'utf8'))]));
 const result=buildTrails(data,inputs);
 writeFileSync(`${ROOT}src/data/procurement-trails.json`,`${JSON.stringify(result)}\n`);
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=generateTrails();console.log(`Retained ${result.buyers.length} reviewed procurement cohorts; ${result.buyers.filter(row=>row.concentration).length} exact concentration joins.`);}
