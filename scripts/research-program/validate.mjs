import { loadProgram } from './load.mjs';
const program = await loadProgram();
const errors = [...program.errors, ...program.missing.map(file => `Missing required research slice: ${file}`)];
for (const collection of ['sources', 'entities', 'connections', 'leads', 'coverage', 'cases', 'methods']) if (!program[collection].length) errors.push(`Research program requires nonempty ${collection}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(JSON.stringify({ gate: 'research-program-schema-and-references', ...Object.fromEntries(['sources', 'entities', 'connections', 'leads', 'coverage', 'cases', 'methods'].map(key => [key, program[key].length])), sourceFamilies: new Set(program.sources.map(source => source.sourceFamily)).size, accessDepth: Object.fromEntries([...new Set(program.sources.map(source => source.accessDepth))].map(depth => [depth, program.sources.filter(source => source.accessDepth === depth).length])), boundary: 'Inspected inventory only; no population, identity or coordination inference.' }, null, 2));
