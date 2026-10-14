import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
export async function loadResearchRadar() {
  const result = await build({ stdin: { contents: "export * from './src/data/researchRadar';", resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20' });
  const module = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
  return module.exports;
}
export async function loadRadarRaw() {
  const regionNames = ['north', 'west', 'south-east', 'national'];
  const regions = await Promise.all(regionNames.map(region => readFile(`${root}/research/raw/research-radar/${region}.json`, 'utf8').then(JSON.parse)));
  const coverage = JSON.parse(await readFile(`${root}/research/raw/research-radar/coverage.json`, 'utf8'));
  return { regions, coverage };
}
