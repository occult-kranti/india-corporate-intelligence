/** Pure HTML transform shared by direct standalone exports and the root build.
 * Uses the shipped workbench assets, so copying the workbench does not require
 * the parent React source tree or a preceding root build.
 */
import fs from 'node:fs';
const readAsset = relative => fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

export function inlineTutorialAssets(html) {
  for (const name of ['archive', 'tutorial']) {
    const tag = `<link rel="stylesheet" href="./src/${name}.css">`;
    if (html.includes(tag)) html = html.replace(tag, () => `<style>${readAsset(`src/${name}.css`)}</style>`);
  }
  const tag = '<script type="module" src="./src/tutorial.js"></script>';
  if (!html.includes(tag)) return html; // Already embedded: post-processing is idempotent.
  const data = readAsset('src/tutorial-content.js');
  if (!/^export const tutorialContent = /m.test(data)) throw Error('Tutorial data export changed; review standalone embedding.');
  const script = readAsset('src/tutorial.js');
  const importLine = /^import \{ tutorialContent \} from ['"]\.\/tutorial-content\.js['"];\r?\n/;
  if (!importLine.test(script)) throw Error('Tutorial import changed; review standalone embedding.');
  const inline = data.replace(/^export const tutorialContent = /m, 'const tutorialContent = ') + '\n' + script.replace(importLine, '');
  return html.replace(tag, () => `<script type="module">${inline.replace(/<\/script/gi, '<\\/script')}</script>`);
}
