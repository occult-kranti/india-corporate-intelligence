/** Exact reviewed holds; raw partners, citations and the retained registry stay immutable. */
import rawManifest from './jio-ownership-corrections.json';
import type { ForeignPartner, Group } from './conglomerates';
import type { DerivedGraph } from '../graph/build';
import type { InvestigationRegistry } from './investigation';

function freezeDeep<T>(value:T):T {
  if(value&&typeof value==='object'){
    for(const child of Object.values(value))freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}
export const JIO_OWNERSHIP_MANIFEST=freezeDeep(rawManifest);
export const JIO_OWNERSHIP_CORRECTIONS=JIO_OWNERSHIP_MANIFEST.corrections;
type Correction=typeof JIO_OWNERSHIP_CORRECTIONS[number];
type Manifest=typeof rawManifest;
const expectedTargets=[
  {relationshipId:'legacy:relationship:4d8d2645c8158165|for:meta-platforms|own|grp:reliance',recordId:'legacy:record:4d8d2645c8158165|for:meta-platforms|own|grp:reliance',sourceIds:['legacy:source:88f95f360cab64d','legacy:source:5ac4722579b9b603'],relationshipHash:'2e5a80bd886cf37c651a7494e8e5a08a63ae7146614ef3edac2a6b4e349a54c5',recordHash:'ad99f305d980796cfa5e3d5c44c667cf7f63ef7aa0a048e443ce85dbedd3149a'},
  {relationshipId:'legacy:relationship:46b943139aaf3743|for:google-alphabet-|own|grp:reliance',recordId:'legacy:record:46b943139aaf3743|for:google-alphabet-|own|grp:reliance',sourceIds:['legacy:source:88f95f360cab64d'],relationshipHash:'0488c839c21d468a5a07ff9c1c39fbfe754f05b5a52a65ee94688fad36adb258',recordHash:'c7730f1066b6c51ef8636b0583ad6b2fa23e850fa0d8153c91ce6739044bc048'},
];
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function requireEqual(actual:unknown,expected:unknown,context:string):void {
  if(!equal(actual,expected))throw new Error(`Jio exact-target ${context} drift; reviewed hold requires revalidation.`);
}
function exactOne<T extends {id:string}>(rows:T[],id:string,context:string):T {
  const found=rows.filter(row=>row.id===id);
  if(found.length!==1)throw new Error(`Jio exact-target ${context} drift: expected exactly one ${id}.`);
  return found[0];
}
/** Metadata and complete closure must match before any effective projection is admitted. */
export function assertJioCorrectionManifest(manifest:Manifest=JIO_OWNERSHIP_MANIFEST):void {
  requireEqual(manifest.schemaVersion,1,'schema');
  requireEqual(manifest.baselineSha256,'048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064','baseline hash');
  requireEqual(manifest.recommendationSha256,'e533a8ee7f9fc114fcfd1a3432b371820bdf72029f7e75170dc0999b0b51a36a','recommendation receipt');
  requireEqual(manifest.parentReviewSha256,'755a46a9e4e35a966b6e266f784a7bf94a7e3fffc872afee8c12893e5768f516','parent receipt');
  requireEqual(manifest.corrections.length,2,'target count');
  for(const [index,correction]of manifest.corrections.entries()){
    const expected=expectedTargets[index];
    requireEqual(correction.relationshipId,expected.relationshipId,'relationship ID');
    requireEqual(correction.recordId,expected.recordId,'record ID');
    requireEqual(correction.relationship.id,expected.relationshipId,'retained relationship ID');
    requireEqual(correction.record.id,expected.recordId,'retained record ID');
    requireEqual(correction.relationshipJsonStringifySha256,expected.relationshipHash,'relationship hash');
    requireEqual(correction.recordJsonStringifySha256,expected.recordHash,'record hash');
    requireEqual(correction.sourceIds,expected.sourceIds,'source closure');
    requireEqual(correction.relationship.sourceIds,expected.sourceIds,'relationship source closure');
    requireEqual(correction.record.sourceIds,expected.sourceIds,'record source closure');
    requireEqual(correction.sources.map(row=>row.original.id),expected.sourceIds,'source object closure');
    requireEqual(correction.graphEligible,false,'graph eligibility');
    requireEqual(correction.pathEligible,false,'path eligibility');
  }
  requireEqual(manifest,JIO_OWNERSHIP_MANIFEST,'correction sidecar');
}
/** Validate full rows, including source tuple order; there is no URL-wide hold. */
export function assertJioForeignPartnerTargets(groups:Group[]):void {
  assertJioCorrectionManifest();
  const group=exactOne(groups,'reliance','group');
  for(const correction of JIO_OWNERSHIP_CORRECTIONS){
    const rows=group.foreignPartners.filter(row=>row.name===correction.foreignPartner.name);
    requireEqual(rows.length,1,'foreign partner count');
    requireEqual(rows[0],correction.foreignPartner,'foreign partner object/source closure');
  }
}
const edgeKey=(edge:{s:string;t:string;pred:string})=>`${edge.s}|${edge.pred}|${edge.t}`;
/** National edges lack IDs; their exact structural identity is the retained builder's dedupe key. */
export function applyJioNationalOwnershipHolds(graph:DerivedGraph,groups:Group[]):DerivedGraph {
  assertJioForeignPartnerTargets(groups);
  const heldKeys=new Set<string>();
  for(const correction of JIO_OWNERSHIP_CORRECTIONS){
    const key=edgeKey(correction.nationalEdge),matches=graph.edges.filter(edge=>edgeKey(edge)===key);
    requireEqual(matches.length,1,'national edge count');
    requireEqual(matches[0],correction.nationalEdge,'national edge object/source closure');
    heldKeys.add(key);
  }
  return {...graph,edges:graph.edges.filter(edge=>!heldKeys.has(edgeKey(edge)))};
}
/** Audit-only validation never edits raw relationship, record, endpoint or source objects. */
export function assertJioRetainedRegistry(registry:InvestigationRegistry,manifest:Manifest=JIO_OWNERSHIP_MANIFEST):void {
  assertJioCorrectionManifest(manifest);
  for(const correction of manifest.corrections){
    requireEqual(exactOne(registry.relationships,correction.relationshipId,'relationship'),correction.relationship,'relationship object');
    requireEqual(exactOne(registry.records,correction.recordId,'record'),correction.record,'record object');
    for(const source of correction.sources)requireEqual(exactOne(registry.sources,source.original.id,'source'),source.original,'source object');
    for(const endpoint of correction.endpoints)requireEqual(exactOne(registry.entities,endpoint.original.id,'endpoint'),endpoint.original,'endpoint object');
  }
}
export interface ForeignPartnerPresentation {partner:ForeignPartner;correction:Correction|null}
/** Derived presentation only; all raw GROUPS and foreignPartners objects remain untouched. */
export function foreignPartnerPresentations(group:Group):ForeignPartnerPresentation[] {
  if(group.id!=='reliance')return group.foreignPartners.map(partner=>({partner,correction:null}));
  assertJioForeignPartnerTargets([group]);
  return group.foreignPartners.map(partner=>({partner,correction:JIO_OWNERSHIP_CORRECTIONS.find(row=>row.groupId===group.id&&row.foreignPartner.name===partner.name)??null}));
}
