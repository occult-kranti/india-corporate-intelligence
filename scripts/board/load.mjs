import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const cache = new Map();
export async function loadModule(relativePath, fresh = false) {
  let code = cache.get(relativePath);
  if (!code) {
    const result = await build({ entryPoints: [fileURLToPath(new URL(`../../${relativePath}`, import.meta.url))], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20', external: ['react'], loader: { '.css': 'empty' } });
    code = result.outputFiles[0].text; cache.set(relativePath, code);
  }
  const module = { exports: {} };
  new Function('module', 'exports', 'require', code)(module, module.exports, require);
  return module.exports;
}
