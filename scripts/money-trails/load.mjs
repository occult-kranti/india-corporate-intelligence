import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

export async function loadMoneyTrails() {
  const result = await build({ stdin: { contents: "export * from './src/data/moneyTrails';", resolveDir: fileURLToPath(new URL('../..', import.meta.url)), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20' });
  const module = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
  return module.exports;
}
