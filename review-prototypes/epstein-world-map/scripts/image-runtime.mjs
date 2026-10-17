// Private, invocation-scoped consistency binding. This is not process authentication.
import {createHash} from 'node:crypto';
import {openSync, closeSync, readSync, fstatSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const KEY = 'WORLD_IMAGE_RUNTIME_BINDING';
const SCHEMA = 'world-image-runtime-binding-v1';
const MAX_BINDING = 8192;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CODEC_SHA = '580f571bf063e2256b51b3946a035bc452fc0e22808d5547b198baea39923a32';
const WORKER_SHA = '4ab0daec585aa9884b6111a9183e49568405680ef5002bef9bc4da29e16b6b5d';
const FIELDS = ['schema', 'nodeExecutable', 'nodeExecutableSha256', 'nodeVersion', 'v8Version',
  'platform', 'arch', 'workspace', 'codecSha256', 'workerSha256', 'repository', 'branch',
  'runId', 'runAttempt', 'invocationId', 'headCommit', 'packageManifestSha256'];
const HEX = /^[a-f0-9]{64}$/;
const need = (value, code) => { if (!value) throw new Error(code); };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function hashFile(path, maximum) {
  const fd = openSync(path, 'r');
  try {
    const before = fstatSync(fd, {bigint: true});
    need(before.isFile() && before.size > 0n && before.size <= BigInt(maximum), 'IMAGE_RUNTIME_FILE_BOUND');
    const hash = createHash('sha256'), buffer = Buffer.alloc(65536);
    let total = 0, count;
    while ((count = readSync(fd, buffer, 0, buffer.length, null)) !== 0) {
      total += count;
      need(total <= maximum, 'IMAGE_RUNTIME_FILE_BOUND');
      hash.update(buffer.subarray(0, count));
    }
    const after = fstatSync(fd, {bigint: true});
    need(BigInt(total) === before.size && ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']
      .every(field => before[field] === after[field]), 'IMAGE_RUNTIME_FILE_CHANGED');
    return hash.digest('hex');
  } finally { closeSync(fd); }
}

function validateShape(value) {
  need(value !== null && typeof value === 'object' && !Array.isArray(value), 'IMAGE_RUNTIME_BINDING_OBJECT');
  need(Object.keys(value).join(',') === FIELDS.join(','), 'IMAGE_RUNTIME_BINDING_FIELDS');
  need(FIELDS.every(field => typeof value[field] === 'string' && value[field].length > 0 &&
    value[field].length <= 4096 && /^[\x20-\x7e]+$/.test(value[field])), 'IMAGE_RUNTIME_BINDING_VALUES');
  need(value.schema === SCHEMA && value.platform === 'linux' && value.arch === 'x64', 'IMAGE_RUNTIME_PLATFORM');
  need(isAbsolute(value.nodeExecutable) && isAbsolute(value.workspace), 'IMAGE_RUNTIME_ABSOLUTE_PATH');
  need(/^v24\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value.nodeVersion) &&
    /^[0-9A-Za-z.-]{1,100}$/.test(value.v8Version), 'IMAGE_RUNTIME_VERSION');
  need(['nodeExecutableSha256', 'packageManifestSha256'].every(field => HEX.test(value[field])) &&
    value.codecSha256 === CODEC_SHA && value.workerSha256 === WORKER_SHA, 'IMAGE_RUNTIME_PINS');
  need(/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(value.repository) &&
    /^[\x21-\x7e]{1,255}$/.test(value.branch), 'IMAGE_RUNTIME_REPOSITORY');
  need(/^[1-9]\d{0,19}$/.test(value.runId) && /^[1-9]\d{0,9}$/.test(value.runAttempt) &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.invocationId) &&
    /^[a-f0-9]{40}$/.test(value.headCommit), 'IMAGE_RUNTIME_INVOCATION');
  need(Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_BINDING, 'IMAGE_RUNTIME_BINDING_SIZE');
  return value;
}

function parseBinding(env) {
  const text = env[KEY];
  need(typeof text === 'string' && text.length > 0, 'IMAGE_RUNTIME_BINDING_REQUIRED');
  need(Buffer.byteLength(text, 'utf8') <= MAX_BINDING && /^[\x20-\x7e]+$/.test(text), 'IMAGE_RUNTIME_BINDING_SIZE');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('IMAGE_RUNTIME_BINDING_JSON'); }
  validateShape(value);
  // Exact serialization rejects duplicate keys, reordered fields, escapes and whitespace.
  need(JSON.stringify(value) === text, 'IMAGE_RUNTIME_BINDING_CANONICAL');
  return value;
}

function observe(env) {
  need(process.platform === 'linux' && process.arch === 'x64', 'IMAGE_RUNTIME_PLATFORM');
  need(typeof env.GITHUB_WORKSPACE === 'string' && isAbsolute(env.GITHUB_WORKSPACE), 'IMAGE_RUNTIME_WORKSPACE_REQUIRED');
  const workspace = realpathSync(env.GITHUB_WORKSPACE);
  need(workspace === realpathSync(resolve(SCRIPT_DIR, '../../..')), 'IMAGE_RUNTIME_WORKSPACE_MISMATCH');
  const nodeExecutable = realpathSync(process.execPath);
  const base = resolve(workspace, 'spatial-prototype');
  for (const [name, expected, maximum] of [
    ['package.json', 'a6e52ae408cbf957e3726601864d149703f1be96e13c607f16cdf8fd9f383134', 2 * 1024 ** 2],
    ['package-lock.json', '01e715955bbde6e3b4baf72ecfaaab25be89503fda4a992d8cd9b2e16c3c1926', 2 * 1024 ** 2],
    ['node_modules/playwright-core/lib/utilsBundle.js', CODEC_SHA, 32 * 1024 ** 2],
  ]) need(hashFile(resolve(base, name), maximum) === expected, 'IMAGE_RUNTIME_CODEC_PIN');
  need(hashFile(resolve(SCRIPT_DIR, 'persistent-image-worker.mjs'), 65536) === WORKER_SHA, 'IMAGE_RUNTIME_WORKER_PIN');
  return validateShape({
    schema: SCHEMA,
    nodeExecutable,
    nodeExecutableSha256: hashFile(nodeExecutable, 256 * 1024 ** 2),
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
    workspace,
    codecSha256: CODEC_SHA,
    workerSha256: WORKER_SHA,
    repository: env.GITHUB_REPOSITORY,
    branch: env.REVIEW_BRANCH,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
    invocationId: env.NATIVE_INVOCATION_ID,
    headCommit: env.REVIEW_HEAD_SHA,
    packageManifestSha256: hashFile(resolve(SCRIPT_DIR, '../manifest.json'), 8 * 1024 ** 2),
  });
}

function checked(action) {
  try { return action(); }
  catch (error) {
    if (error instanceof Error && /^IMAGE_RUNTIME_[A-Z_]+$/.test(error.message)) throw error;
    throw new Error('IMAGE_RUNTIME_BINDING_IO_DENIED');
  }
}

// Only the trusted qualifier creates descriptors. Never publish this object.
export function observeImageRuntime(env = process.env) {
  return checked(() => Object.freeze(observe(env)));
}

export function requireImageRuntime(env = process.env) {
  return checked(() => {
    const binding = parseBinding(env), current = observe(env);
    need(JSON.stringify(binding) === JSON.stringify(current), 'IMAGE_RUNTIME_BINDING_MISMATCH');
    return Object.freeze(current);
  });
}

export function runtimeBindingSha256(env, manifestSha256) {
  return checked(() => {
    const binding = requireImageRuntime(env);
    need(typeof manifestSha256 === 'string' && HEX.test(manifestSha256) &&
      binding.packageManifestSha256 === manifestSha256, 'IMAGE_RUNTIME_MANIFEST_MISMATCH');
    return sha(JSON.stringify(binding));
  });
}
