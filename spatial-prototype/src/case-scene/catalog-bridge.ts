/** Explicit scene compatibility only. The source catalog and its historical legacy hold stay unchanged. */
import { getVerifiedCaseFile } from '../case-data/adapter';
import { THREAD_STYLES } from './contract';
import type { CaseFile } from './contract';
/** Counts are [nodes, authored spokes, retained claims, reader-only claims]. */
export const REVIEWED_SCENE_CASES:Readonly<Record<string,readonly number[]>>=freezeSceneData({
  "case:india-ambani": [4, 3, 3, 0],
  "case:france-arnault": [4, 3, 3, 0],
  "case:usa-koch": [4, 3, 3, 0],
  "case:china-zhong": [4, 3, 3, 0],
  "case:nigeria-dangote": [3, 3, 3, 0],
  "case:japan-son": [4, 3, 3, 0],
  "case:mexico-slim": [6, 3, 3, 0],
  "case:brazil-batista": [4, 3, 3, 0],
  "case:india-adani": [5, 4, 4, 2],
  "case:usa-musk": [8, 6, 7, 3],
  "case:usa-trump": [5, 5, 5, 1],
  "case:australia-rinehart": [4, 2, 3, 1],
  "case:russia-potanin": [7, 4, 3, 0],
  "case:public-office%2Findia-modi": [7, 5, 4, 2],
  "case:usa-thiel": [3, 2, 3, 1],
  "case:usa-bezos": [5, 4, 3, 0],
  "case:usa-zuckerberg": [4, 3, 3, 0],
  "case:usa-ellison": [5, 3, 3, 0],
  "case:usa-alphabet-founders": [5, 11, 10, 3],
});
export function freezeSceneData<T>(value:T):T {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)) {for(const child of Object.values(value))freezeSceneData(child);Object.freeze(value);}return value;
}
/** Never use the legacy fourteen-case adapter, cast predicates, edit source hold metadata,
 * join source-named entities or convert financial stages into ownership/payment facts. */
export function getSceneCase(input:unknown):CaseFile {
  const file=getVerifiedCaseFile(input),expected=REVIEWED_SCENE_CASES[file.id];
  if(!expected||[file.nodes.length,file.edges.length,file.claims.length,file.readerFactIds.length].some((n,i)=>n!==expected[i]))throw new Error('Case is outside reviewed scene compatibility');
  for(const edge of file.edges)if(!THREAD_STYLES[edge.kind]||(edge.v2&&edge.v2.predicate!==edge.kind))throw new Error('No exact predicate style; keep complete reader');
  return file;
}
export { getCase, getCaseCatalog } from '../case-data/adapter';
