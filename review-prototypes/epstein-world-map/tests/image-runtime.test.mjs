// Portable contract checks only: no codec worker, native capture, or qualification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireImageRuntime, runtimeBindingSha256} from '../scripts/image-runtime.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = resolve(root, 'scripts');
const source = name => readFileSync(resolve(scripts, name), 'utf8');
const workerSha = '4ab0daec585aa9884b6111a9183e49568405680ef5002bef9bc4da29e16b6b5d';
const codecSha = '580f571bf063e2256b51b3946a035bc452fc0e22808d5547b198baea39923a32';
function ordered(text, ...tokens) {
  let previous = -1;
  for (const token of tokens) {
    const next = text.indexOf(token, previous + 1);
    assert(next > previous, `Missing or out-of-order contract token: ${token}`);
    previous = next;
  }
}

test('runtime qualification precedes capture and each consumer validates its binding', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/epstein-world-board-native.yml'), 'utf8');
  ordered(workflow, 'node-version: \'24\'', 'npm ci --ignore-scripts',
    'scripts/qualify-image-runtime.mjs', 'scripts/native-review.mjs', 'scripts/artifact-audit.mjs',
    'scripts/release-check.mjs', 'uses: actions/upload-artifact@v4');
  ordered(source('native-review.mjs'), 'requireNativeCI();', 'await requireImageRuntime();',
    'await readInputs()', "require('playwright')", 'await mkdir(output');
  ordered(source('artifact-audit.mjs'), 'requireNativeCI();', 'await requireImageRuntime();',
    'const rows=await inventory(', "scripts/audit-raw.py");
  ordered(source('release-check.mjs'), 'requireNativeCI(env);', 'await requireImageRuntime(env);',
    'binding=runBinding(env,', 'for(const [k,v]of Object.entries(binding))assert.equal(m[k],v)');
  ordered(source('qualify-image-runtime.mjs'), 'const binding = observeImageRuntime(',
    "spawnSync('python3'", 'requireImageRuntime(env);', 'runtimeBindingSha256(env,',
    'constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW', 'writeSync(');
});

test('the original auditor deadline covers binding, fork, readiness, parsing and completion', () => {
  const decoder = source('persistent_decoder.py');
  ordered(decoder, 'self.started=time.monotonic();self.deadline=self.started+GLOBAL_SECONDS',
    'self.deadline=min(self.deadline,deadline)', 'self._check(self.deadline)',
    'signal.setitimer(signal.ITIMER_REAL,self.deadline-time.monotonic())',
    'self.runtime=load_binding()', 'self._launch()', 'ready=self._line(min(self.deadline,self.started+IMAGE_SECONDS))');
  for (const [name, budget, operation] of [
    ['audit-raw.py', 'budget=trace.budget_module.Budget()', 'result=inspect('],
    ['audit-trace.py', 'budget=budget_module.Budget()', 'result=audit('],
  ]) {
    const main = source(name).split("if __name__=='__main__':")[1];
    ordered(main, budget, 'with Decoder(deadline=budget.deadline) as decoder:',
      operation, 'decoder.finish();budget.check()', 'print(json.dumps(result');
  }
  assert(source('audit-trace.py').includes("decoder.deadline==budget.deadline,'SHARED_DECODER_DEADLINE_REQUIRED'"));
  assert(decoder.includes('deadline=min(self.deadline,time.monotonic()+IMAGE_SECONDS)'));
  ordered(decoder.slice(decoder.indexOf(' def finish(self):')), 'self._check(deadline);returncode=',
    "need(returncode==0,'WORKER_EXIT')", 'self._check(deadline)', 'self.accepted=True');
});

test('20/115/120-second limits and 512/768 MiB parent versus 2 GiB child remain fixed', () => {
  const policy = JSON.parse(source('EVIDENCE-BUDGET-PROPOSAL.json'));
  for (const [key, value] of Object.entries({imageTimeoutSeconds: 20, validatorDeadlineSeconds: 115,
    outerAuditTimeoutMilliseconds: 120000, pythonAddressSpaceBytes: 512 * 1024 ** 2,
    pythonHardAddressSpaceBytes: 768 * 1024 ** 2, decoderAddressSpaceBytes: 2 * 1024 ** 3})) {
    assert.equal(policy[key], value, key);
  }
  const decoder = source('persistent_decoder.py');
  assert(decoder.includes('PARENT_SOFT=512*MIB; PARENT_HARD=768*MIB; CHILD_AS=2048*MIB'));
  assert(decoder.includes('GLOBAL_SECONDS=115; CPU_SECONDS=115; IMAGE_SECONDS=20; OUTER_SECONDS=120'));
  assert(decoder.includes('resource.setrlimit(resource.RLIMIT_AS,(CHILD_AS,CHILD_AS))'));
  ordered(decoder.slice(decoder.indexOf(' def _launch(self):')), 'pid=os.fork()',
    'child_setup(expected_parent)', 'self.process.pid=pid',
    'resource.setrlimit(resource.RLIMIT_AS,(PARENT_SOFT,PARENT_HARD))');
  assert(source('artifact-audit.mjs').includes('timeout:120000'));
  assert(source('qualify-image-runtime.mjs').includes('timeout: 120000'));
});

// Shape-valid synthetic descriptor used only to exercise pre-observation rejection.
const descriptor = {schema: 'world-image-runtime-binding-v1', nodeExecutable: process.execPath,
  nodeExecutableSha256: '0'.repeat(64), nodeVersion: 'v24.0.0', v8Version: '1.0',
  platform: 'linux', arch: 'x64', workspace: resolve(root, '../..'), codecSha256: codecSha,
  workerSha256: workerSha, repository: 'example/review', branch: 'review', runId: '1',
  runAttempt: '1', invocationId: '11111111-1111-4111-8111-111111111111',
  headCommit: '0'.repeat(40), packageManifestSha256: '0'.repeat(64)};
const canonical = JSON.stringify(descriptor);
const negatives = [
  ['missing', null, 'REQUIRED'], ['empty', '', 'REQUIRED'], ['malformed', '{', 'JSON'],
  ['non-object', '[]', 'OBJECT'], ['missing-fields', '{}', 'FIELDS'],
  ['extra-field', JSON.stringify({...descriptor, extra: 'no'}), 'FIELDS'],
  ['reordered', JSON.stringify(Object.fromEntries(Object.entries(descriptor).reverse())), 'FIELDS'],
  ['whitespace', ` ${canonical}`, 'CANONICAL'],
  ['escaped', canonical.replace('world-image', '\\u0077orld-image'), 'CANONICAL'],
  ['duplicate', canonical.replace('{', '{"schema":"world-image-runtime-binding-v1",'),
    'CANONICAL', 'DUPLICATE_KEY'],
  ['oversize', 'x'.repeat(8193), 'SIZE'], ['non-ascii', 'é', 'SIZE'],
];

test('JavaScript rejects missing, malformed and noncanonical bindings before runtime observation', () => {
  for (const [name, text, code] of negatives) {
    const env = text === null ? {} : {WORLD_IMAGE_RUNTIME_BINDING: text};
    assert.throws(() => requireImageRuntime(env), {message: `IMAGE_RUNTIME_BINDING_${code}`}, name);
  }
  assert.throws(() => runtimeBindingSha256({}, '0'.repeat(64)),
    {message: 'IMAGE_RUNTIME_BINDING_REQUIRED'});
});

test('Python rejects the same malformed descriptors without hashing or starting a codec', {timeout: 10000}, () => {
  const program = `import json, os, sys
sys.path.insert(0, sys.argv[1])
import image_runtime_binding as binding
def forbidden_hash(*args):
    raise AssertionError('negative binding reached file hashing')
binding.hash_file = forbidden_hash
for name, text, js_code, *python_code in json.loads(sys.stdin.read()):
    os.environ.pop(binding.KEY, None)
    if text is not None: os.environ[binding.KEY] = text
    expected = 'IMAGE_RUNTIME_BINDING_' + (python_code[0] if python_code else js_code)
    try: binding.load_binding()
    except ValueError as error:
        assert str(error) == expected, (name, str(error), expected)
    else: raise AssertionError('negative binding accepted: ' + name)
assert 'persistent_decoder' not in sys.modules
print('PASS_BINDING_NEGATIVES')
`;
  const result = spawnSync('python3', ['-I', '-B', '-c', program, scripts], {
    input: JSON.stringify(negatives), encoding: 'utf8', timeout: 5000, maxBuffer: 8192,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'PASS_BINDING_NEGATIVES\n');
});

test('runtime digest binds receipts while the reviewed worker bytes remain unchanged', () => {
  const actual = createHash('sha256').update(readFileSync(resolve(scripts, 'persistent-image-worker.mjs'))).digest('hex');
  assert.equal(actual, workerSha);
  for (const name of ['image-runtime.mjs', 'image_runtime_binding.py', 'persistent_decoder.py']) {
    assert(source(name).includes(workerSha), name);
  }
  for (const name of ['image-runtime.mjs', 'image_runtime_binding.py']) {
    assert(source(name).includes('packageManifestSha256'), name);
  }
  assert(source('image-runtime.mjs').includes('return sha(JSON.stringify(binding));'));
  assert(source('evidence-binding.mjs').includes('runtimeBindingSha256:runtimeBindingSha256(env,manifestSha256)'));
  assert(source('evidence-binding.mjs').includes('for(const [k,v]of Object.entries(binding))assert.equal(p[k],v'));
  assert(source('artifact-audit.mjs').includes('decision={...decision,...binding}'));
});


function runPythonControl(program) {
  const result = spawnSync('python3', ['-I', '-B', '-c', program, scripts], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 8192,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('real runtime-hash alarm preserves GLOBAL_DEADLINE and first teardown state', () => {
  const row = runPythonControl(`import json,sys,time,signal,pathlib
sys.path.insert(0,sys.argv[1])
import image_runtime_binding as binding
import persistent_decoder as p
held=[]
class Observed(p.Decoder):
 def __new__(cls,*args,**kwargs):
  instance=super().__new__(cls);held.append(instance);return instance
original=binding.hash_file
def delayed_hash(*args):
 time.sleep(.1)
 return original(*args)
binding.hash_file=delayed_hash
# A deterministic scheduling pause within the actual binding hash call. No
# worker, raw artifact, external fixture or runtime qualification is needed.
binding._load_binding=lambda: binding.hash_file(pathlib.Path(sys.argv[1])/'image_runtime_binding.py',65536)
try:Observed(deadline=time.monotonic()+.02)
except p.DecoderDenied as error:
 d=held[0]
 row={'code':str(error),'deadlineExpired':d.deadline_expired,'closed':d.closed,'accepted':d.accepted,'alarmOwned':d.alarm_owned,'selectorClosed':d.selector.get_map() is None,'workerStarted':d.process is not None,'cleanupFailed':d.cleanup_failed,'timer':signal.getitimer(signal.ITIMER_REAL)}
 assert type(error) is p.DecoderDenied and str(error)=='GLOBAL_DEADLINE',row
 assert d.deadline_expired and d.closed and not d.accepted and not d.alarm_owned and d.selector.get_map() is None and d.process is None and not d.cleanup_failed,row
 assert signal.getitimer(signal.ITIMER_REAL)==(0.0,0.0),row
 print(json.dumps(row))
else:raise AssertionError('shared startup deadline accepted')
`);
  assert.equal(row.code, 'GLOBAL_DEADLINE');
  assert.equal(row.accepted, false);
});

test('duplicate and nonfinite responses retain their specific typed denials', () => {
  const rows = runPythonControl(`import sys,json
sys.path.insert(0,sys.argv[1])
import persistent_decoder as p
assert not issubclass(p.DecoderDenied,ValueError)
rows=[]
for raw,expected in [(b'{"x":1,"x":1}\\n','DUPLICATE_RESPONSE_KEY'),(b'{"x":NaN}\\n','NONFINITE_RESPONSE'),(b'{\\n','RESPONSE_JSON')]:
 d=p.Decoder.__new__(p.Decoder);d.buffer=bytearray(raw)
 try:d._line(1)
 except p.DecoderDenied as error:
  assert str(error)==expected,(str(error),expected)
  rows.append(str(error))
 else:raise AssertionError('invalid response accepted')
print(json.dumps(rows))
`);
  assert.deepEqual(rows, ['DUPLICATE_RESPONSE_KEY', 'NONFINITE_RESPONSE', 'RESPONSE_JSON']);
});

test('raw CLI formatters recognize typed decoder denials without a ValueError subtype', () => {
  const result = runPythonControl(`import pathlib,sys,re,json
sys.path.insert(0,sys.argv[1])
from persistent_decoder import DecoderDenied
for name in ['audit-raw.py','audit-trace.py']:
 text=(pathlib.Path(sys.argv[1])/name).read_text()
 main=text.split("if __name__=='__main__':",1)[1]
 assert main.index('from persistent_decoder import Decoder,DecoderDenied')<main.index(' try:')
 expression=next(line.strip()[5:] for line in main.splitlines() if line.strip().startswith('code='))
 for expected in ['GLOBAL_DEADLINE','DUPLICATE_RESPONSE_KEY','NONFINITE_RESPONSE']:
  assert eval(expression,{'e':DecoderDenied(expected),'ValueError':ValueError,'DecoderDenied':DecoderDenied,'re':re,'str':str,'isinstance':isinstance})==expected
print(json.dumps({'typedDenialFormatters':2}))
`);
  assert.equal(result.typedDenialFormatters, 2);
});

test('all runtime checks are wired before qualification, native capture and upload', () => {
  const workflow = readFileSync(resolve(root, '../../.github/workflows/epstein-world-board-native.yml'), 'utf8');
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert(pkg.scripts['test:portable'].split(/\s+/).includes('tests/image-runtime.test.mjs'));
  ordered(workflow, 'tests/image-runtime.test.mjs', 'scripts/qualify-image-runtime.mjs',
    'scripts/native-review.mjs', 'scripts/artifact-audit.mjs', 'uses: actions/upload-artifact@v4');
});
