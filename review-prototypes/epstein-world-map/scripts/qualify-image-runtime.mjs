// This trusted runner step is the sole writer of the private runtime descriptor.
import {spawnSync} from 'node:child_process';
import {constants, openSync, closeSync, fstatSync, writeSync} from 'node:fs';
import {dirname, isAbsolute, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {observeImageRuntime, requireImageRuntime, runtimeBindingSha256} from './image-runtime.mjs';

try {
  if (process.argv.length !== 2) throw Error('QUALIFICATION_ARGUMENTS');
  const binding = observeImageRuntime(process.env);
  const text = JSON.stringify(binding);
  const env = {...process.env, WORLD_IMAGE_RUNTIME_BINDING: text};
  const script = resolve(dirname(fileURLToPath(import.meta.url)), 'qualify-image-codec.py');
  const result = spawnSync('python3', ['-I', '-B', script], {
    env, cwd: binding.workspace, timeout: 120000, killSignal: 'SIGKILL',
    maxBuffer: 4096, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.signal || result.status !== 0 ||
      result.stdout !== 'WORLD_IMAGE_CODEC_QUALIFIED\n' || result.stderr !== '') {
    throw Error('QUALIFICATION_FAILED');
  }
  requireImageRuntime(env);
  const runtimeBindingSha = runtimeBindingSha256(env, binding.packageManifestSha256);
  if (typeof env.GITHUB_ENV !== 'string' || !isAbsolute(env.GITHUB_ENV)) throw Error('QUALIFICATION_ENV_FILE');
  const fd = openSync(env.GITHUB_ENV, constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile()) throw Error('QUALIFICATION_ENV_FILE');
    const line = Buffer.from(`WORLD_IMAGE_RUNTIME_BINDING=${text}\n`, 'ascii');
    let offset = 0;
    while (offset < line.length) {
      const written = writeSync(fd, line, offset, line.length - offset);
      if (written <= 0) throw Error('QUALIFICATION_ENV_WRITE');
      offset += written;
    }
  } finally { closeSync(fd); }
  console.log(JSON.stringify({status: 'PASS_IMAGE_RUNTIME_QUALIFIED', runtimeBindingSha256: runtimeBindingSha}));
} catch {
  // No descriptor, local path, subprocess output or raw image bytes reach logs.
  console.error('IMAGE_RUNTIME_QUALIFICATION_DENIED');
  process.exitCode = 1;
}
