import {createHash} from 'node:crypto';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const expectedPaths=['app.mjs','assets/world-paths-v1.json','data/projection-v2.json','index.html','model.mjs','styles.css'];
export async function verifyServingManifest(bytes,expectedManifestSHA,readBytes){
  if(!/^[0-9a-f]{64}$/.test(expectedManifestSHA||'')||hash(bytes)!==expectedManifestSHA)throw Error('Selected release manifest hash mismatch');
  const manifest=JSON.parse(bytes);
  if(manifest.schema_version!=='olympus-bitcoin-release-v2')throw Error('Unexpected release manifest version');
  if(JSON.stringify(manifest.files.map(f=>f.path).sort())!==JSON.stringify(expectedPaths))throw Error('Serving unit must contain exactly the six approved files');
  const results=[];
  for(const file of manifest.files){
    const body=await readBytes(file.path);
    if(body.length!==file.bytes||hash(body)!==file.sha256)throw Error(`Served file hash/length mismatch: ${file.path}`);
    results.push({path:file.path,bytes:body.length,sha256:hash(body)});
  }
  return results;
}
