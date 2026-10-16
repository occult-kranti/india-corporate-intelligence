/** Read-only runner/runtime receipt; deliberately no environment or hostname dump. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpus, freemem, totalmem, loadavg, platform, arch, release } from 'node:os';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASELINE_RUNTIME_SHA = '85702ec5f553415e009a37e89d7333c96c952c66';
export const CANDIDATE_RUNTIME_SHA = '6ea92299d21ac5ab92686b714420d363de08fa99';
export const RESOURCE_HARNESS_FILES = Object.freeze([
  'browser-review-mode.mjs', 'browser-review.mjs', 'case-graphics-browser.mjs',
  'case-label-coverage.mjs', 'case-label-policy.mjs', 'case-label-readability.mjs',
  'case-lifecycle-observation.mjs', 'case-role-label-semantics.mjs', 'case-workspace-browser.mjs',
  'inherited-absence-browser.mjs', 'jio-hold-browser.mjs', 'progressive-browser.mjs',
  'reader-layout-review.mjs', 'resource-lifecycle-profile.mjs', 'sector-browser-review.mjs',
  'source-correction-browser.mjs', 'resource-lifecycle-environment.mjs', 'partition-browser-artifacts.mjs',
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export async function hashRuntimeTree(root, relativePaths) {
  const files = [];
  async function visit(path) {
    const absolute = join(root, path), info = await lstat(absolute);
    assert.equal(info.isSymbolicLink(), false, `Runtime receipt refuses symbolic links: ${path}`);
    if (info.isDirectory()) for (const name of (await readdir(absolute)).sort()) await visit(`${path}/${name}`);
    else {
      assert.ok(info.isFile(), `Runtime receipt requires regular files: ${path}`);
      const bytes = await readFile(absolute);
      files.push({ path, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  for (const path of relativePaths) await visit(path);
  return { files, manifestSha256: hash(JSON.stringify(files)) };
}

export async function recordResourceEnvironment({ root, role, output, stage }) {
  assert.ok(['baseline', 'candidate'].includes(role), 'Unknown pinned runtime role');
  assert.ok(['before', 'after'].includes(stage), 'Unknown runner receipt stage');
  const pinnedCommit = role === 'baseline' ? BASELINE_RUNTIME_SHA : CANDIDATE_RUNTIME_SHA;
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  assert.equal(git(['rev-parse', 'HEAD']), pinnedCommit, 'Runtime checkout is not the pinned diagnostic revision');
  const runtimePaths = ['src', 'public', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json'];
  assert.equal(git(['status', '--porcelain', '--', ...runtimePaths]), '', 'Pinned runtime sources/settings/dependencies were modified');
  const cpu = cpus();
  const receipt = { diagnosticOnly: true, fullSuiteAcceptance: false, role, stage, pinnedCommit,
    harnessCommit: process.env.SPATIAL_HARNESS_SHA ?? null, at: new Date().toISOString(),
    runner: { platform: platform(), arch: arch(), kernelRelease: release(), cpuCount: cpu.length,
      cpuModels: [...new Set(cpu.map(row => row.model))], totalMemoryBytes: totalmem(), freeMemoryBytes: freemem(),
      loadAverage: loadavg(), node: process.version, v8: process.versions.v8 },
    sources: await hashRuntimeTree(root, runtimePaths), build: await hashRuntimeTree(root, ['dist']),
    harness: await hashRuntimeTree(root, RESOURCE_HARNESS_FILES.map(file => `scripts/${file}`)),
    limitations: ['Same runner, sequential baseline then candidate; order, cache, load and profiler overhead remain confounders.',
      'Read-only pinned source and build hashes identify bytes, not full-suite acceptance.'] };
  await writeFile(join(output, `runtime-${stage}.json`), JSON.stringify(receipt, null, 2) + '\n');
  if (stage === 'after') {
    const driverBytes = await readFile(join(output, 'driver.cpuprofile'));
    const driver = JSON.parse(driverBytes);
    assert.ok(Array.isArray(driver.nodes), 'Node process-exit CPU profile is missing');
    await writeFile(join(output, 'driver-profile-metadata.json'), JSON.stringify({
      diagnosticOnly: true, fullSuiteAcceptance: false, pinnedCommit, role,
      samplingIntervalUs: 1000, profileFile: 'driver.cpuprofile',
      profileStartTimeUs: driver.startTime, profileEndTimeUs: driver.endTime,
      sampleCount: driver.samples?.length ?? 0, nodeCount: driver.nodes.length,
      bytes: driverBytes.length, sha256: hash(driverBytes),
      scope: 'Entire Node process from startup to exit; includes setup, scenario, uncancelled post-deadline work, evidence preservation and cleanup. All post-deadline/cleanup samples are diagnostic only.',
    }, null, 2) + '\n');
    const before = JSON.parse(await readFile(join(output, 'runtime-before.json'), 'utf8'));
    for (const key of ['sources', 'build', 'harness']) assert.equal(receipt[key].manifestSha256, before[key].manifestSha256, `${key} changed during diagnostic`);
  }
  return receipt;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Runtime receipts belong to the GitHub diagnostic only');
  const [stage, ...extra] = process.argv.slice(2);
  assert.equal(extra.length, 0);
  await recordResourceEnvironment({ root: process.cwd(), role: process.env.SPATIAL_RUNTIME_ROLE,
    output: join(process.cwd(), 'browser-review/resource-lifecycle-diagnostic'), stage });
}
