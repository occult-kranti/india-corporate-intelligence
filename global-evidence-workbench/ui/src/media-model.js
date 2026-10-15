export const human=x=>String(x??'Unknown').replaceAll('_',' ');
export const list=x=>Array.isArray(x)?x:x==null?[]:[x];
export const safeURL=x=>{try{const u=new URL(x);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
const codes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
// The ISO list is a filter catalogue, not a claim of research coverage or political recognition.
const names=new Intl.DisplayNames(['en'],{type:'region'});
export const COUNTRIES=codes.map(code=>({code,name:names.of(code)})).sort((a,b)=>a.name.localeCompare(b.name));
export const countryName=code=>COUNTRIES.find(c=>c.code===code)?.name??code??'Unknown';
export const LOCATION_BASES=['headquarters','jurisdiction','domicile'];
export const RELATION_TYPES=['ownership','control','investment','acquisition','contract','donation','service','leadership','founding','endorsement','employment','fund_management'];
export const project=(lat,lon,rotation=0)=>{const a=lat*Math.PI/180,b=(lon-rotation)*Math.PI/180;return {x:Math.cos(a)*Math.sin(b),y:Math.sin(a),z:Math.cos(a)*Math.cos(b)};};
export function dateRange(date){
 if(typeof date!=='string'||!/^\d{4}(-\d{2})?(-\d{2})?$/.test(date))return null;
 const [year,month,day]=date.split('-').map(Number);
 if(year<1800||year>2100||month!==undefined&&(month<1||month>12))return null;
 if(day!==undefined&&(day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()))return null;
 const pad=n=>String(n).padStart(2,'0');
 return {start:`${year}-${pad(month??1)}-${pad(day??1)}`,end:`${year}-${pad(month??12)}-${pad(day??new Date(Date.UTC(year,month??12,0)).getUTCDate())}`};
}
export function normalizeMedia(data){
 const entities=(data.entities??[]).map(e=>({...e,name:e.name??e.label??e.id,countries:list(e.countries??e.country).filter(Boolean),sectors:list(e.sectors??e.sector).filter(Boolean),source_ids:list(e.source_ids??e.sourceIds),location:e.location??null}));
 const entityById=new Map(entities.map(e=>[e.id,e]));
 const edges=(data.edges??[]).map(e=>({...e,date:e.date??null,source_ids:list(e.source_ids??e.sourceIds),fromEntity:entityById.get(e.from),toEntity:entityById.get(e.to)}));
 return {...data,entities,entityById,edges,sources:data.sources??[],sourceById:new Map((data.sources??[]).map(s=>[s.id,s])),gaps:data.gaps??[],claims:data.claims??[],cases:data.cases??[]};
}
export function filterMedia(d,f={}){
 return d.edges.filter(e=>{
  const endpoints=[e.fromEntity,e.toEntity];
  if(f.country&&!endpoints.some(n=>n?.countries.includes(f.country))&&!list(e.countries??e.country).includes(f.country))return false;
  if(f.sector&&!endpoints.some(n=>n?.sectors.includes(f.sector))&&!list(e.sector).includes(f.sector))return false;
  if(f.type&&e.type!==f.type||f.status&&e.status!==f.status)return false;
  const r=dateRange(e.date),isDateFiltered=f.year||f.fromDate||f.toDate;
  if(f.fromDate&&f.toDate&&f.fromDate>f.toDate)return false;
  if(isDateFiltered&&!r&&!f.undated)return false;
  if(r&&f.year&&e.date.slice(0,4)!==f.year)return false;
  if(r&&f.fromDate&&r.end<f.fromDate||r&&f.toDate&&r.start>f.toDate)return false;
  if(f.search&&!([e.id,e.type,e.status,e.summary,e.caveat,...endpoints.flatMap(n=>[n?.name,...list(n?.aliases),n?.summary,...list(n?.countries).map(countryName)])].join(' ').toLowerCase().includes(f.search.toLowerCase())))return false;
  return true;
 });
}
export function visibleEntities(d,edges,f={}){
 const ids=new Set(edges.flatMap(e=>[e.from,e.to]));
 const anyFilter=['country','sector','type','status','year','fromDate','toDate','search'].some(k=>f[k]);
 return d.entities.filter(n=>ids.has(n.id)||!anyFilter);
}
export function coverageFor(d,code){
 const entities=d.entities.filter(n=>n.countries.includes(code));
 const ids=new Set(entities.map(n=>n.id));
 const edges=d.edges.filter(e=>ids.has(e.from)||ids.has(e.to)||list(e.countries??e.country).includes(code));
 const supplied=(d.coverage??[]).find(c=>(c.country??c.countryCode)===code);
 return {code,name:countryName(code),entityCount:entities.length,edgeCount:edges.length,status:edges.length?'selected_records':'not_researched',scope:supplied?.scope??(edges.length?'Selected source-supported entities and dated links. No national ownership or political-activity census.':'No reviewed relationships are included for this country or jurisdiction.'),gaps:list(supplied?.gaps).length?list(supplied.gaps):['Current ownership continuity, beneficial ownership and cross-border operations are not comprehensively established.']};
}
export function isUncertain(e){return /propos|announc|pend|offer|report|unverified|unknown|disput|alleg|negotiat|conditional/i.test(e.status??'');}
export function formatValue(value){return value==null?'Not established':typeof value==='object'?JSON.stringify(value):String(value);}
export function mediaValidation(d){
 const errors=[];
 if(!d||typeof d!=='object')return ['Invalid dataset'];
 for(const key of ['entities','edges','sources','gaps'])if(!Array.isArray(d[key]))errors.push(`${key}: missing collection`);
 const unique=(items,kind)=>{const ids=new Set();for(const o of items??[]){if(!o.id||ids.has(o.id))errors.push(`${kind}: missing or duplicate ID ${o.id}`);ids.add(o.id);}return ids;};
 const entities=unique(d.entities,'entity'),sources=unique(d.sources,'source'),edges=unique(d.edges,'edge'),claims=unique(d.claims??[],'claim'),cases=unique(d.cases??[],'case');unique(d.gaps,'gap');
 const refs=(o,kind,required=true)=>{const ids=list(o.source_ids??o.sourceIds);if(required&&!ids.length)errors.push(`${kind}: no source references`);for(const id of ids)if(!sources.has(id))errors.push(`${kind}: unresolved source ${id}`);};
 for(const n of d.entities??[]){if(!n.name)errors.push(`${n.id}: missing entity name`);refs(n,n.id);if(n.location){const p=n.location;if(!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lon)||Math.abs(p.lon)>180)errors.push(`${n.id}: invalid location`);if(!LOCATION_BASES.includes(p.basis))errors.push(`${n.id}: unsupported location basis`);if(!p.label)errors.push(`${n.id}: location needs explicit label`);if(p.source_ids)refs(p,n.id+' location');}}
 for(const e of d.edges??[]){if(!entities.has(e.from)||!entities.has(e.to))errors.push(`${e.id}: unresolved entity endpoint`);if(!e.type||!e.status||!e.summary)errors.push(`${e.id}: missing type, status or assertion`);if(!Object.hasOwn(e,'date'))errors.push(`${e.id}: explicit date or null required`);if(e.date!=null&&!dateRange(e.date))errors.push(`${e.id}: invalid date`);refs(e,e.id);for(const k of ['ownership_pct','voting_pct'])if(e[k]!=null&&(typeof e[k]!=='number'||e[k]<0||e[k]>100))errors.push(`${e.id}: invalid ${k}`);if((e.amount!=null||e.round_amount!=null)&&!e.currency)errors.push(`${e.id}: amount needs original currency`);for(const a of e.amounts??[]){if(!a.currency&&!e.currency)errors.push(`${e.id}: amount needs original currency`);if(a.source_ids||a.sourceIds)refs(a,e.id+' amount');}}
 for(const s of d.sources??[])if(!s.title||!s.url)errors.push(`${s.id}: incomplete source metadata`);
 for(const g of d.gaps??[])refs(g,g.id,false);
 for(const c of d.claims??[]){refs(c,c.id);for(const id of list(c.edge_ids))if(!edges.has(id))errors.push(`${c.id}: unresolved claim edge ${id}`);}for(const e of d.edges??[]){for(const id of list(e.claim_ids??e.claimIds))if(!claims.has(id))errors.push(`${e.id}: unresolved claim ${id}`);if(e.case_id&&!cases.has(e.case_id))errors.push(`${e.id}: unresolved case ${e.case_id}`);}for(const c of d.cases??[]){refs(c,c.id);for(const a of c.amounts??[]){refs(a,c.id+' amount');if(!a.currency||!a.stage)errors.push(`${c.id}: case amount needs currency and stage`);}}
 return errors;
}
