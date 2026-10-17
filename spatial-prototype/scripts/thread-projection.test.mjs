import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "thread-projection-"));
after(() => rm(dir, { recursive: true, force: true }));
const out = join(dir, "projection.mjs");
await build({
  entryPoints: ["src/threadProjection.ts"],
  outfile: out,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const {
  clipThreadSegment,
  projectThreadSegments,
  threadSegmentDistance,
  THREAD_SEGMENTS,
} = await import(pathToFileURL(out));
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
test("both offscreen endpoints retain the whole visible crossing", () => {
  const rows = projectThreadSegments(
    [
      [-3, 0, 0],
      [3, 0, 0],
    ],
    I,
    800,
    500,
    1,
    0,
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { a: [0, 250, 0], b: [800, 250, 0], index: 0 });
  assert.equal(threadSegmentDistance(400, 250, rows[0]), 0);
  assert.equal(threadSegmentDistance(400, 270, rows[0]), 20);
});
test("clip outside, partial and behind-camera segments without fabricated joins", () => {
  assert.equal(clipThreadSegment([2, 0, 0, 1], [3, 0, 0, 1]), null);
  assert.equal(clipThreadSegment([0, 0, 0, -1], [0, 1, 0, -1]), null);
  const near = clipThreadSegment([0, 0, -2, 1], [0, 0, 0, 1]);
  assert.deepEqual(near, [
    [0, 0, -1, 1],
    [0, 0, 0, 1],
  ]);
  const far = clipThreadSegment([0, 0, 0, 1], [0, 0, 2, 1]);
  assert.deepEqual(far, [
    [0, 0, 0, 1],
    [0, 0, 1, 1],
  ]);
  assert.ok(
    clipThreadSegment([0, 0, 0, -1], [0, 0, 0, 1])
      .flat()
      .every(Number.isFinite),
  );
  assert.equal(clipThreadSegment([NaN, 0, 0, 1], [0, 0, 0, 1]), null);
});
test("screen width, perspective lift and tolerance use the current matrix", () => {
  const m = [...I];
  m[9] = 0.5;
  m[11] = 0.25;
  const a = projectThreadSegments(
    [
      [-0.2, 0, 0.4],
      [0.2, 0, 0.4],
    ],
    m,
    800,
    500,
    0.5,
    0,
  )[0];
  assert.ok(Math.abs(a.a[1] - (1 - 0.1 / 1.05) * 250) < 1e-10);
  const b = projectThreadSegments(
    [
      [-2, 0, 0],
      [2, 0, 0],
    ],
    I,
    800,
    500,
    1,
    9,
  )[0];
  assert.ok(Math.abs(b.a[0] + 9) < 1e-9);
  assert.ok(Math.abs(b.b[0] - 809) < 1e-9);
});
test("point-sample gaps no longer discard an intervening segment", () => {
  const rows = projectThreadSegments(
    [
      [-0.25, 0, 0],
      [0.25, 0, 0],
    ],
    I,
    800,
    500,
    1,
    0,
  );
  assert.equal(Math.hypot(rows[0].a[0] - 400, rows[0].a[1] - 250), 100);
  assert.equal(threadSegmentDistance(400, 250, rows[0]), 0);
  assert.equal(THREAD_SEGMENTS, 48);
});
test("off-view segment indices stay original and no line bridges a rejected segment", () => {
  const rows = projectThreadSegments(
    [
      [-3, 0, 0],
      [-2, 0, 0],
      [0, 0, 0],
      [3, 0, 0],
    ],
    I,
    800,
    500,
    1,
    0,
  );
  assert.deepEqual(
    rows.map((s) => s.index),
    [1, 2],
  );
  assert.ok(rows.every((s) => [...s.a, ...s.b].every(Number.isFinite)));
  assert.equal(
    projectThreadSegments(
      [
        [0, 0, 0],
        [1, 1, 0],
      ],
      I,
      0,
      100,
      1,
    ).length,
    0,
  );
});
