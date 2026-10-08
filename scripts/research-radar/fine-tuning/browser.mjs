#!/usr/bin/env node
/** Verify the published local-training receipt without running model inference. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const model = JSON.parse(readFileSync('research/research-radar/fine-tuning/model-status.json', 'utf8'));
const out = resolve(process.env.RADAR_FINE_TUNING_ARTIFACTS ?? '/tmp/research-radar-fine-tuning-browser');
mkdirSync(out, { recursive: true });
let server;
let base = process.env.INVESTIGATION_BASE_URL;
if (!base) {
  const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(`${dist}/`)) return response.writeHead(403).end();
    try { response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file)); }
    catch { response.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/u, '');
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch(existsSync(binary) ? { executablePath: binary } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(45000);
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (condition, meaning) => { assert.ok(condition, meaning); checks.push(meaning); };
const panel = page.locator('[data-local-model-panel]');
const systems = {
  bm25: 'BM25 · lexical baseline',
  base_fp32: 'MiniLM · original FP32',
  base_onnx_uint8: 'MiniLM · original ONNX uint8',
  candidate: 'MiniLM · fine-tuned adapter',
};
try {
  await page.goto(`${base}/#/research-radar`, { waitUntil: 'domcontentloaded' });
  await panel.waitFor();
  check(model.trained === true && model.objective === 'source-retrieval' && model.forecastProbabilitiesEstimated === false, 'Published receipt records actual source-retrieval training with forecasts still unestimated');
  check(await panel.getAttribute('data-model-status') === model.status, 'Rendered release status matches the actual evaluation receipt');
  check(await panel.getAttribute('data-default-retriever') === model.defaultRetriever, 'Rendered CLI default matches the recorded gating decision');
  check((await panel.locator('[data-model-default]').innerText()).includes(systems[model.defaultRetriever]), 'Default retriever is named in visible text, not just an attribute');
  const promoted = model.status === 'promoted-retrieval-only';
  check((await panel.locator('[data-model-promotion]').innerText()) === (promoted ? 'Trained · retrieval promoted' : 'Trained · experimental'), 'Visible badge distinguishes completed training from promotion');
  if (!promoted) check(model.defaultRetriever !== 'candidate', 'Experimental candidate has not silently replaced the CLI default');
  const text = await panel.innerText();
  check(text.includes(model.modelLabel), 'Exact trained-model label is visible');
  check(text.includes('Forecast probabilities remain unestimated') && text.includes("not the truth of allegations or a person's likelihood of offending"), 'Retrieval results do not imply verified accusations or calibrated personal forecasts');
  check(text.includes('Model inference runs through the local CLI, not in your browser'), 'Saved website report does not claim browser inference');
  check((await page.locator('.rr-stat-note').innerText()).includes('Numeric forecasts are not estimated'), 'Existing institutional forecast limitation remains visible');
  for (const key of ['trainableParameters', 'trainingQueries', 'holdoutQueries', 'indexedDocuments']) {
    check((await panel.locator(`[data-model-count="${key}"]`).innerText()).startsWith(model[key].toLocaleString('en-US')), `${key}: count matches the executed run`);
  }
  check(await panel.locator('tbody tr').count() === 4, 'All four actual retrieval systems remain in the comparison');
  for (const [key, label] of Object.entries(systems)) {
    const row = panel.locator(`[data-model-system="${key}"]`);
    check((await row.locator('th').innerText()) === label, `${key}: precision/runtime variant is explicit`);
    for (const metric of ['ndcgAt5', 'recallAt5']) check(await row.locator(`[data-model-metric="${metric}"]`).innerText() === model.scores[key][metric].toFixed(3), `${key}/${metric}: displayed score equals the recorded holdout evaluation at three decimals`);
  }
  const caption = await panel.locator('caption').innerText();
  check(caption.includes('Held-out') && caption.includes('0 to 1') && caption.includes('Neither is a probability or a factual-accuracy score'), 'Accessible table caption explains scope, scale and meaning of ranking metrics');
  const root = 'https://github.com/occult-kranti/india-corporate-intelligence/blob/codex/education-funding-intelligence/';
  for (const [key, file] of Object.entries({ 'model-card': 'docs/research-radar/fine-tuning/MODEL-CARD.md', evaluation: 'docs/research-radar/fine-tuning/EVALUATION.md', adapter: 'research/research-radar/fine-tuning/adapter.safetensors' })) {
    const link = panel.locator(`[data-model-link="${key}"]`);
    check(await link.getAttribute('href') === root + file && existsSync(file), `${key}: exact repository link has a real authored artifact`);
    check(await link.getAttribute('rel') === 'noopener noreferrer', `${key}: new-tab link has safe relationship attributes`);
  }
  check(await panel.locator('time').getAttribute('datetime') === model.completedAt && text.includes('America/New_York'), 'Run completion preserves exact machine timestamp and the stated display timezone');
  const details = panel.locator('.rr-model-details');
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  check(await details.getAttribute('open') !== null, 'Keyboard opens the training details');
  const detailText = await details.innerText();
  check(detailText.includes(`${model.trainingDocuments} documents`) && detailText.includes(`${model.developmentQueries} queries`) && detailText.includes(`Epoch ${model.selectedEpoch}`) && detailText.includes(`${model.holdoutCases} cases`), 'Expanded scope distinguishes training documents, development selection and held-out cases');
  check(model.failedCriteria.every(item => detailText.includes(item)) && await details.locator('[data-model-failed-criteria] li').count() === model.failedCriteria.length, 'Every failed promotion criterion survives rendering');
  check(model.limitations.every(item => detailText.includes(item)) && await details.locator('[data-model-limitations] li').count() === model.limitations.length, 'Every retained evaluation limitation survives rendering');
  check(await details.locator('[data-model-hash="adapter"]').innerText() === model.adapterSha256 && await details.locator('[data-model-hash="evaluation"]').innerText() === model.evaluationSha256, 'Weights and evaluation hashes bind the visible report to exact artifacts');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1050 });
    await panel.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('.site-main, .research-radar, [data-local-model-panel]')].every(element => element.scrollWidth <= element.clientWidth + 1)), `${width}px: page and local model panel have no horizontal overflow`);
    const spacing = await details.evaluate(element => ({ summaryBottom: element.querySelector('summary').getBoundingClientRect().bottom, paragraphTop: element.querySelector('p').getBoundingClientRect().top }));
    check(spacing.paragraphTop - spacing.summaryBottom >= 10, `${width}px: expanded training text clears the keyboard focus outline and disclosure control`);
    const bounds = await panel.boundingBox();
    check(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${width}px: entire model panel stays within the viewport width`);
    for (const key of Object.keys(systems)) {
      const row = panel.locator(`[data-model-system="${key}"]`);
      const cells = await row.locator('th,td').evaluateAll(elements => elements.map(element => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, scroll: element.scrollWidth, width: element.clientWidth }; }));
      check(cells.every((cell, i) => cell.scroll <= cell.width + 1 && cell.left >= 0 && cell.right <= width + 1 && (!i || cells[i - 1].right <= cell.left + 1)), `${width}px/${key}: all table labels and metrics remain readable without overlap or clipped text`);
    }
    // The app scrolls inside .site-main. Element screenshots taller than that
    // viewport can contain clipped areas; retain two real viewport slices.
    await panel.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: resolve(out, `local-model-${width}.png`) });
    await details.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: resolve(out, `local-model-${width}-details.png`) });
  }
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  check(await details.getAttribute('open') === null, 'Keyboard closes the training details');
  check(errors.length === 0, 'No browser runtime exceptions');
  writeFileSync(resolve(out, 'acceptance.json'), JSON.stringify({ base, adapterSha256: model.adapterSha256, evaluationSha256: model.evaluationSha256, status: model.status, defaultRetriever: model.defaultRetriever, checks, errors }, null, 2) + '\n');
  console.log(`Local fine-tuning browser: ${checks.length} checks passed; ${out}`);
} finally {
  await browser.close();
  if (server) await new Promise(done => server.close(done));
}
