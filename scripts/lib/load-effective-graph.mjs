import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute this trusted repository's data-only TS module after erasing its types.
// Runtime imports are deliberately unsupported: graph/data.ts has type-only imports.
// Fail closed if a future dependency or malformed export requires a new loader contract.
export function evaluateEffectiveGraph(source, filename = 'src/graph/data.ts') {
  const result = ts.transpileModule(source, {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; '));
  const exports = {};
  runInNewContext(result.outputText, { exports }, { filename, timeout: 5000 });
  for (const name of ['NODES', 'EDGES', 'MOTIFS']) {
    if (!Array.isArray(exports[name])) throw new Error(`Missing effective array export: ${name}`);
  }
  return { nodes: exports.NODES, edges: exports.EDGES, motifs: exports.MOTIFS };
}
export const loadEffectiveGraph = filename => evaluateEffectiveGraph(readFileSync(filename, 'utf8'), String(filename));
