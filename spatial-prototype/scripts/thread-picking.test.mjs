import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fixture = JSON.parse(await readFile(new URL('./fixtures/thread-picking-native.json', import.meta.url), 'utf8'));
const projectionPath = fileURLToPath(new URL('../src/threadProjection.ts', import.meta.url));
const sceneSource = await readFile(new URL('../src/scene.ts', import.meta.url), 'utf8');
const sceneStart = sceneSource.indexOf('    const threadHits: ThreadHit[] = [];');
const sceneEndText = '    if (threadHit) this.cb.onSelect(threadHit.id, "edge");';
const sceneEnd = sceneSource.indexOf(sceneEndText, sceneStart) + sceneEndText.length;
assert.ok(sceneStart >= 0 && sceneEnd > sceneStart, 'Test must execute the production thread-pick body');
const dir = await mkdtemp(join(tmpdir(), 'thread-picking-'));
after(() => rm(dir, { recursive: true, force: true }));
const out = join(dir, 'picking.mjs');
await build({
  stdin: {
    contents: `import { projectThreadSegments, threadSegmentDistance, selectThreadHit, THREAD_SEGMENTS, type ThreadPoint, type ThreadHit } from ${JSON.stringify(projectionPath)};
export * from ${JSON.stringify(projectionPath)};
export * from 'three';
export function runScenePick(event: any) {${sceneSource.slice(sceneStart, sceneEnd)}}`,
    resolveDir: process.cwd(), loader: 'ts',
  },
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
});
const { CatmullRomCurve3, Vector3, projectThreadSegments, threadSegmentDistance, selectThreadHit,
  THREAD_SEGMENTS, THREAD_HIT_RADIUS_PX, THREAD_HIT_TIE_PX, runScenePick } = await import(pathToFileURL(out));
const originalIds = fixture.originals.map(o => o.edgeId);
const curves = new Map(fixture.originals.map(o => [o.edgeId,
  new CatmullRomCurve3(o.controlPoints.map(p => new Vector3(...p)))]));
const sampledPoints = new Map([...curves].map(([id, curve]) => [id,
  curve.getSpacedPoints(THREAD_SEGMENTS).map(p => [p.x, p.y, p.z])]));
const frames = fixture.poses.map(pose => ({ ...pose, paths: new Map([...sampledPoints].map(([id, points]) =>
  [id, projectThreadSegments(points, pose.matrix, pose.width, pose.height, pose.lift)])) }));
const distanceAt = (segments, point) => Math.min(...segments.map(s => threadSegmentDistance(...point, s)));
const hitsAt = (frame, point, order) => order.map(id => ({ id, distance: distanceAt(frame.paths.get(id), point) }));
const selectedFirst = (selected, order = originalIds) => [selected, ...order.filter(id => id !== selected)];
function scenePick(frame, point, order) {
  const selected = [];
  runScenePick.call({ curves: new Map(order.map(id => [id, curves.get(id)])),
    camera: { projectionMatrix: { elements: frame.matrix } },
    container: { clientWidth: frame.width, clientHeight: frame.height },
    threadLiftUniform: { value: frame.lift }, cb: { onSelect: (...args) => selected.push(args) } },
  { point: { x: point[0], y: point[1] } });
  return selected;
}
function probes(frame) {
  const result = [[frame.width / 2, frame.height / 2]];
  for (const { a, b } of frame.paths.get(originalIds[0])) {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    for (const t of [0, .25, .5, .75, 1])
      for (const offset of [-9, -8.999, -1, -.001, 0, .001, 1, 8.999, 9])
        result.push([a[0] + t * dx - offset * dy / length, a[1] + t * dy + offset * dx / length]);
  }
  return result;
}

test('native fixture retains four independent original IDs and source trails', async () => {
  assert.equal(fixture.headCommit, 'cf7b63c44f4d935e07464eae8c2a27206ce2ac55');
  assert.equal(fixture.poses.length, 17);
  assert.equal(new Set(originalIds).size, 4);
  assert.equal(fixture.originals.filter(o => o.direction === 'forward').length, 2);
  assert.equal(fixture.originals.filter(o => o.direction === 'reverse').length, 2);
  const sourceIds = fixture.originals.flatMap(o => o.sourceIds);
  assert.equal(new Set(sourceIds).size, 4);
  assert.deepEqual([...new Set(fixture.poses.map(p => p.pose.zoom))].sort((a, b) => a - b),
    [4.5, 5.9, 6.0001, 6.0171508146508605, 8, 16, 17, 18, 19]);
  assert.equal(THREAD_SEGMENTS, 48);
  assert.equal(THREAD_HIT_RADIUS_PX, 9);
  assert.equal(THREAD_HIT_TIE_PX, 1e-8);
  assert.ok(fixture.poses.some(p => p.pose.pitch > 0 && p.pose.bearing !== 0));
  assert.ok(fixture.poses.some(p => p.width === 390));
});

test('reproduces the strict-numeric z6 wrong-original hit before applying the tie rule', () => {
  const frame = frames.find(f => f.name === 'atlas-z6.png');
  const hits = hitsAt(frame, [frame.width / 2, frame.height / 2], frame.retainedOrder);
  const strict = hits.reduce((best, hit) => hit.distance < 9 && (!best || hit.distance < best.distance) ? hit : best, null);
  assert.equal(strict.id, 'legacy:relationship:88925b74a92265a2|coal|award|jsw');
  assert.equal(hits[0].id, 'legacy:relationship:9e7654ec6cc7ec18|joshi|role|coal');
  assert.ok(hits[0].distance > strict.distance);
  assert.ok(hits[0].distance - strict.distance < 3e-13);
  assert.equal(selectThreadHit(hits), hits[0]);
  assert.deepEqual(scenePick(frame, [frame.width / 2, frame.height / 2], frame.retainedOrder), [[hits[0].id, 'edge']]);
});

test('production scene preserves each selected original at every recorded center/pose', () => {
  for (const frame of frames) for (const selected of originalIds) {
    const order = selectedFirst(selected, frame.retainedOrder);
    const center = [frame.width / 2, frame.height / 2];
    assert.deepEqual(scenePick(frame, center, order), [[selected, 'edge']], `${frame.name}/${selected}`);
  }
});

test('12,572 center/segment/normal probes bound forward/reverse numerical ambiguity', () => {
  let count = 0, maximum = 0;
  const before = JSON.stringify([...curves].map(([id, curve]) => [id, curve.points]));
  for (const frame of frames) for (const point of probes(frame)) {
    count++;
    const hits = hitsAt(frame, point, originalIds);
    const spread = Math.max(...hits.map(h => h.distance)) - Math.min(...hits.map(h => h.distance));
    maximum = Math.max(maximum, spread);
    assert.ok(spread < 2.23e-9, `Unexpected numerical spread at ${frame.name}: ${spread}`);
    // Strict radius wins even when originals are numerically tied across the boundary.
    const eligible = hits.filter(h => h.distance < 9);
    assert.equal(selectThreadHit(hits), eligible[0] ?? null);
    if (hits.every(h => h.distance < 9)) for (const selected of originalIds) {
      const ordered = selectedFirst(selected).map(id => hits.find(h => h.id === id));
      assert.equal(selectThreadHit(ordered), ordered[0]);
    }
  }
  assert.equal(count, 12572);
  assert.ok(maximum > 2.2e-9 && maximum < THREAD_HIT_TIE_PX);
  assert.equal(JSON.stringify([...curves].map(([id, curve]) => [id, curve.points])), before);
});

test('ties are selected-first only inside the fixed 1e-8 CSS-pixel bound', () => {
  for (const delta of [0, Number.EPSILON, 2.23e-9, .999 * THREAD_HIT_TIE_PX]) {
    const hits = [{ id: 'selected-original', distance: 1 + delta }, { id: 'other-original', distance: 1 }];
    assert.equal(selectThreadHit(hits), hits[0]);
    assert.equal(selectThreadHit([...hits].reverse()), hits[1]);
  }
  for (const delta of [1.001 * THREAD_HIT_TIE_PX, 1e-7, .001, .01, .25, 1]) {
    const hits = [{ id: 'selected-original', distance: 1 + delta }, { id: 'genuinely-closer', distance: 1 }];
    assert.equal(selectThreadHit(hits), hits[1], `Must not prefer selection over ${delta}px closer hit`);
  }
});

test('ties use global minimum without accumulating across a distance chain', () => {
  const hits = [{ id: 'outside-nearest-tie', distance: 1.8e-8 },
    { id: 'first-nearest-tie', distance: .9e-8 }, { id: 'exact-minimum', distance: 0 }];
  assert.equal(selectThreadHit(hits), hits[1]);
  assert.equal(selectThreadHit([...hits].reverse()), hits[2]);
});

test('nine-pixel eligibility is strictly unchanged, including boundary outsiders', () => {
  assert.equal(selectThreadHit([]), null);
  for (const distance of [-1, NaN, Infinity, -Infinity, 9, 9 + 1e-12, 9 + THREAD_HIT_TIE_PX])
    assert.equal(selectThreadHit([{ id: 'outside', distance }]), null);
  const inside = { id: 'inside', distance: 9 - 1e-12 };
  assert.equal(selectThreadHit([{ id: 'selected-but-outside', distance: 9 }, inside]), inside);
  assert.equal(selectThreadHit([{ id: 'selected-but-outside', distance: 9 + 1e-12 }, inside]), inside);
});

test('actual screen segments preserve genuinely closer picks and reject radius outsiders', () => {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const segmentAt = y => projectThreadSegments([[-.5, -y / 250, 0], [.5, -y / 250, 0]], identity, 800, 500, 1);
  const point = [400, 250];
  const hits = [
    { id: 'selected-original', distance: distanceAt(segmentAt(1.001), point) },
    { id: 'genuinely-closer', distance: distanceAt(segmentAt(1), point) },
    { id: 'not-in-radius', distance: distanceAt(segmentAt(9.01), point) },
  ];
  assert.equal(selectThreadHit(hits), hits[1]);
  assert.equal(selectThreadHit([hits[2]]), null);
  const edge = { id: 'exact-radius', distance: distanceAt([{ a: [200, 259, 0], b: [600, 259, 0], index: 0 }], point) };
  assert.equal(edge.distance, 9);
  assert.equal(selectThreadHit([edge]), null);
});
