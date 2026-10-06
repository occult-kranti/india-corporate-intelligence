import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import { dossierRoute } from './dossier-navigation.mjs';

const source = readFileSync(new URL('../../src/lib/dossierNavigation.ts', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
const { preserveWorkspaceParams } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('a dossier reset removes its filters while retaining the selected workspace and place', () => {
  const current = new URLSearchParams('state=UP&q=school&saved=1&iw_view=dossier&iw_state=KA&iw_q=water&iw_layers=legal,review');
  const reset = preserveWorkspaceParams(new URLSearchParams(), current);
  assert.deepEqual([...reset], [...current].filter(([key]) => key.startsWith('iw_')));
  assert.equal(current.get('state'), 'UP', 'reset must not mutate router state');
  assert.equal(reset.has('state'), false);
  assert.equal(reset.get('iw_view'), 'dossier');
});

test('replacement record links and table resets preserve workspace without carrying old dossier filters', () => {
  const current = new URLSearchParams('lens=loans&st=KL&iw_view=dossier&iw_state=TN');
  const record = preserveWorkspaceParams(new URLSearchParams('lens=capital&rec=reviewed-record'), current);
  assert.equal(record.get('lens'), 'capital');
  assert.equal(record.get('rec'), 'reviewed-record');
  assert.equal(record.has('st'), false);
  assert.equal(record.get('iw_state'), 'TN');
  assert.equal(record.get('iw_view'), 'dossier');
  assert.equal(preserveWorkspaceParams(new URLSearchParams('view=table'), current).get('view'), 'table');
});

test('explicit target workspace choices survive and ordinary legacy links do not acquire a surface', () => {
  const target = new URLSearchParams('iw_state=KA');
  assert.equal(preserveWorkspaceParams(target, new URLSearchParams('iw_state=TN')).get('iw_state'), 'KA');
  assert.equal(preserveWorkspaceParams(new URLSearchParams('q=school'), new URLSearchParams('state=UP')).toString(), 'q=school');
});

test('browser navigation retains original query encoding and in-page anchors', () => {
  assert.equal(dossierRoute('/finance'), '/finance?iw_view=dossier');
  assert.equal(dossierRoute('/tenders?section=national&x=a%2Cb#cppp-rates'), '/tenders?section=national&x=a%2Cb&iw_view=dossier#cppp-rates');
  assert.equal(dossierRoute('/water?iw_view=map&state=KA'), '/water?iw_view=dossier&state=KA');
});
