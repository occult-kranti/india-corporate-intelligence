import { readFileSync, existsSync } from 'node:fs';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { loadInvestigation } from '../investigation/load.mjs';

export const FILES = ['political-funding.json', 'resources-welfare.json', 'justice-procurement.json', 'proven-cases.json', 'methods.json'];
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = readFileSync(`${root}src/data/researchProgramSchema.ts`, 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2022 } });
export const schema = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
export async function loadProgram() {
  const inputs = {}, missing = [];
  for (const file of FILES) { const path = `${root}research/investigation-program/${file}`; if (!existsSync(path)) missing.push(file); else inputs[file] = JSON.parse(readFileSync(path, 'utf8')); }
  const { INVESTIGATION_REGISTRY } = await loadInvestigation();
  const result = await build({ entryPoints: [`${root}src/data/investigations.ts`], bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent', target: 'node20' });
  const module = { exports: {} }; new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
  return { ...schema.assembleResearchProgram(inputs, { resolvedEntityIds: INVESTIGATION_REGISTRY.entities.filter(entity => entity.resolved === true).map(entity => entity.id), existingCases: module.exports.INVESTIGATION_CASES }), missing };
}
