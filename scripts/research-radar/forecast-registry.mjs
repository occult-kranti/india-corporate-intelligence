import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadRadarRaw } from './load.mjs';
import { buildForecastRegistry } from './forecast.mjs';
import { validateRadar } from './validate.mjs';

export async function assembleForecastRegistry() {
  const { regions, coverage } = await loadRadarRaw();
  const validation = validateRadar(regions, coverage);
  if (!validation.valid) throw new Error(validation.errors.join('\n'));
  return { schemaVersion: 1, cutoff: '2026-10-07', forecastStatus: 'untrained-uncalibrated', population: 'Retained research scenarios, a purposive sample rather than a statistical event population', rows: buildForecastRegistry(regions.flatMap(region => region.cases), '2026-10-07'),
    calibrationGate: { enabled: false, missing: ['Defined eligible event population', 'Prospectively adjudicated positive, negative, unknown and censored outcomes', 'Publication-time feature snapshots', 'Frozen temporal and entity-group holdout', 'Baseline comparison', 'Empirical calibration and uncertainty', 'Subgroup performance', 'Independent calibration-bundle review'] },
    interpretation: 'Every outcome and probability is unresolved/null. This is a prospective adjudication register, not a trained forecast or estimated likelihood of corruption.' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = `${JSON.stringify(await assembleForecastRegistry(), null, 2)}\n`;
  const location = fileURLToPath(new URL('../../research/research-radar/forecast-registry.json', import.meta.url));
  if (process.argv.includes('--verify')) {
    const existing = await readFile(location, 'utf8');
    if (existing !== output) throw new Error('Forecast registry differs from current reviewed research; regenerate deliberately');
    console.log('Forecast registry matches current source-backed scenarios; every probability remains null.');
  } else {
    await mkdir(fileURLToPath(new URL('../../research/research-radar', import.meta.url)), { recursive: true });
    await writeFile(location, output);
    console.log(`Wrote ${location}`);
  }
}
