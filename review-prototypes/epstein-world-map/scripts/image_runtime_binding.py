"""Validate the private Node-observed binding without creating another process.

The exact executable hash binds Node/V8 observations under the immutable,
isolated-runner trust model. This descriptor is not process authentication.
"""
import hashlib
import json
import os
import pathlib
import re
import stat
import sys

KEY = 'WORLD_IMAGE_RUNTIME_BINDING'
SCHEMA = 'world-image-runtime-binding-v1'
MAX_BINDING = 8192
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
CODEC_SHA = '580f571bf063e2256b51b3946a035bc452fc0e22808d5547b198baea39923a32'
WORKER_SHA = '4ab0daec585aa9884b6111a9183e49568405680ef5002bef9bc4da29e16b6b5d'
FIELDS = ('schema', 'nodeExecutable', 'nodeExecutableSha256', 'nodeVersion', 'v8Version',
          'platform', 'arch', 'workspace', 'codecSha256', 'workerSha256', 'repository',
          'branch', 'runId', 'runAttempt', 'invocationId', 'headCommit', 'packageManifestSha256')


def need(value, code):
    if not value:
        raise ValueError(code)


def matches(pattern, value):
    return re.fullmatch(pattern, value, flags=re.ASCII) is not None


def canonical(value):
    return json.dumps(value, ensure_ascii=True, separators=(',', ':'))


def strict_object(pairs):
    result = {}
    for key, value in pairs:
        need(key not in result, 'IMAGE_RUNTIME_BINDING_DUPLICATE_KEY')
        result[key] = value
    return result


def hash_file(path, maximum):
    with open(path, 'rb', buffering=0) as source:
        before = os.fstat(source.fileno())
        need(stat.S_ISREG(before.st_mode) and 0 < before.st_size <= maximum,
             'IMAGE_RUNTIME_FILE_BOUND')
        digest = hashlib.sha256()
        total = 0
        while True:
            chunk = source.read(65536)
            if not chunk:
                break
            total += len(chunk)
            need(total <= maximum, 'IMAGE_RUNTIME_FILE_BOUND')
            digest.update(chunk)
        after = os.fstat(source.fileno())
        need(total == before.st_size and all(getattr(before, field) == getattr(after, field)
             for field in ('st_dev', 'st_ino', 'st_size', 'st_mtime_ns', 'st_ctime_ns')),
             'IMAGE_RUNTIME_FILE_CHANGED')
        return digest.hexdigest()


def _load_binding():
    text = os.environ.get(KEY)
    need(isinstance(text, str) and len(text) > 0, 'IMAGE_RUNTIME_BINDING_REQUIRED')
    need(len(text) <= MAX_BINDING and matches(r'[\x20-\x7e]+', text), 'IMAGE_RUNTIME_BINDING_SIZE')
    try:
        binding = json.loads(text, object_pairs_hook=strict_object)
    except json.JSONDecodeError:
        raise ValueError('IMAGE_RUNTIME_BINDING_JSON') from None
    need(type(binding) is dict, 'IMAGE_RUNTIME_BINDING_OBJECT')
    need(tuple(binding) == FIELDS, 'IMAGE_RUNTIME_BINDING_FIELDS')
    need(all(type(binding[field]) is str and 0 < len(binding[field]) <= 4096 and
             matches(r'[\x20-\x7e]+', binding[field]) for field in FIELDS), 'IMAGE_RUNTIME_BINDING_VALUES')
    need(canonical(binding) == text, 'IMAGE_RUNTIME_BINDING_CANONICAL')
    need(binding['schema'] == SCHEMA and binding['platform'] == sys.platform == 'linux' and
         binding['arch'] == 'x64' and os.uname().machine == 'x86_64', 'IMAGE_RUNTIME_PLATFORM')
    need(matches(r'v24\.(0|[1-9]\d*)\.(0|[1-9]\d*)', binding['nodeVersion']) and
         matches(r'[0-9A-Za-z.-]{1,100}', binding['v8Version']), 'IMAGE_RUNTIME_VERSION')
    need(all(matches(r'[a-f0-9]{64}', binding[field]) for field in
             ('nodeExecutableSha256', 'packageManifestSha256')) and
         binding['codecSha256'] == CODEC_SHA and binding['workerSha256'] == WORKER_SHA,
         'IMAGE_RUNTIME_PINS')
    need(matches(r'[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}', binding['repository']) and
         matches(r'[\x21-\x7e]{1,255}', binding['branch']), 'IMAGE_RUNTIME_REPOSITORY')
    need(matches(r'[1-9]\d{0,19}', binding['runId']) and matches(r'[1-9]\d{0,9}', binding['runAttempt']) and
         matches(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', binding['invocationId']) and
         matches(r'[a-f0-9]{40}', binding['headCommit']), 'IMAGE_RUNTIME_INVOCATION')
    for field, variable in (
        ('repository', 'GITHUB_REPOSITORY'), ('branch', 'REVIEW_BRANCH'),
        ('runId', 'GITHUB_RUN_ID'), ('runAttempt', 'GITHUB_RUN_ATTEMPT'),
        ('invocationId', 'NATIVE_INVOCATION_ID'), ('headCommit', 'REVIEW_HEAD_SHA'),
    ):
        need(binding[field] == os.environ.get(variable), 'IMAGE_RUNTIME_BINDING_MISMATCH')
    workspace_env = os.environ.get('GITHUB_WORKSPACE')
    need(isinstance(workspace_env, str) and os.path.isabs(workspace_env), 'IMAGE_RUNTIME_WORKSPACE_REQUIRED')
    workspace = pathlib.Path(workspace_env).resolve(strict=True)
    need(str(workspace) == binding['workspace'] and workspace == SCRIPT_DIR.parent.parent.parent,
         'IMAGE_RUNTIME_WORKSPACE_MISMATCH')
    executable = pathlib.Path(binding['nodeExecutable'])
    need(executable.is_absolute() and str(executable.resolve(strict=True)) == binding['nodeExecutable'],
         'IMAGE_RUNTIME_ABSOLUTE_PATH')
    need(hash_file(executable, 256 * 1024 ** 2) == binding['nodeExecutableSha256'], 'IMAGE_RUNTIME_NODE_PIN')
    base = workspace / 'spatial-prototype'
    for name, expected, maximum in (
        ('package.json', 'a6e52ae408cbf957e3726601864d149703f1be96e13c607f16cdf8fd9f383134', 2 * 1024 ** 2),
        ('package-lock.json', '01e715955bbde6e3b4baf72ecfaaab25be89503fda4a992d8cd9b2e16c3c1926', 2 * 1024 ** 2),
        ('node_modules/playwright-core/lib/utilsBundle.js', CODEC_SHA, 32 * 1024 ** 2),
    ):
        need(hash_file(base / name, maximum) == expected, 'IMAGE_RUNTIME_CODEC_PIN')
    need(hash_file(SCRIPT_DIR / 'persistent-image-worker.mjs', 65536) == WORKER_SHA,
         'IMAGE_RUNTIME_WORKER_PIN')
    need(hash_file(SCRIPT_DIR.parent / 'manifest.json', 8 * 1024 ** 2) == binding['packageManifestSha256'],
         'IMAGE_RUNTIME_MANIFEST_MISMATCH')
    return binding


def load_binding():
    """Return the exact validated descriptor; never log or publish its contents."""
    try:
        return _load_binding()
    except ValueError as error:
        if matches(r'IMAGE_RUNTIME_[A-Z_]+', str(error)):
            raise
        raise ValueError('IMAGE_RUNTIME_BINDING_JSON') from None
    except (OSError, TypeError, OverflowError, RecursionError):
        raise ValueError('IMAGE_RUNTIME_BINDING_IO_DENIED') from None
