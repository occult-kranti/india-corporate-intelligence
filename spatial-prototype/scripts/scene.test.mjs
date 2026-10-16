import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { Vector3 } from "three";
const temporary = await mkdtemp(join(tmpdir(), "spatial-scene-test-"));
after(() => rm(temporary, { recursive: true, force: true }));
async function load(entry, name) {
  const outfile = join(temporary, `${name}.mjs`);
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}
const math = await load("src/cameraMath.ts", "camera");
const city = await load("src/cityLayer.ts", "city");
test("thread curve preserves exact source endpoint positions without mutating them", () => {
  const a = new Vector3(-4, 0.8, 3),
    b = new Vector3(9, 1.2, -3);
  const curve = math.makeThreadCurve(a, b);
  assert.ok(curve.getPoint(0).distanceTo(a) < 1e-10);
  assert.ok(curve.getPoint(1).distanceTo(b) < 1e-10);
  assert.deepEqual(a.toArray(), [-4, 0.8, 3]);
  for (const point of curve.getPoints(100)) {
    assert.ok(point.toArray().every(Number.isFinite));
    assert.ok(point.y >= 0.79);
  }
});
test("travel time is bounded and pausing cannot advance it", () => {
  assert.equal(math.stepJourney(4, 0.1, 9, true), 4 / 9);
  assert.equal(math.stepJourney(9, 5, 9), 1);
  assert.equal(math.stepJourney(0, -8, 9), 0);
  assert.equal(math.stepJourney(0, 4, 9), 0.1 / 9);
  assert.equal(math.easedProgress(-3), 0);
  assert.equal(math.easedProgress(4), 1);
  assert.equal(math.easedProgress(NaN), 0);
});
test("camera pose never enters the felt and fit accounts for tall viewport", () => {
  assert.equal(
    math.safeCameraPosition(new Vector3(3, -9, 8)).y,
    math.CAMERA_FLOOR,
  );
  const points = [new Vector3(-20, 0, -12), new Vector3(20, 1, 12)];
  const portrait = math.fitCamera(points, 0.5),
    wide = math.fitCamera(points, 2);
  assert.ok(portrait.position.y > wide.position.y);
  assert.deepEqual(portrait.target.toArray(), [0, 0.5, 0]);
  assert.equal(math.fitCamera([], 1), null);
});
test("city meshes preserve source footprint heights and courtyard holes", () => {
  let parts = 0,
    triangles = 0;
  for (const c of city.CITY_DATA.cities)
    for (const b of c.buildings) {
      const geometry = city.buildingGeometry(b);
      geometry.computeBoundingBox();
      assert.ok(Math.abs(geometry.boundingBox.max.y - b.heightMeters) < 1e-3);
      assert.ok(Math.abs(geometry.boundingBox.min.y) < 1e-3);
      assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
      const positions = geometry.attributes.position;
      let roofArea = 0;
      for (let i = 0; i < positions.count; i += 3) {
        const a = new Vector3().fromBufferAttribute(positions, i),
          v = new Vector3().fromBufferAttribute(positions, i + 1),
          w = new Vector3().fromBufferAttribute(positions, i + 2);
        if ([a, v, w].every((p) => Math.abs(p.y - b.heightMeters) < 1e-3))
          roofArea += v.clone().sub(a).cross(w.clone().sub(a)).length() / 2;
      }
      const area = (ring) =>
        Math.abs(
          ring.reduce((sum, p, i) => {
            const next = ring[(i + 1) % ring.length];
            return sum + p[0] * next[1] - next[0] * p[1];
          }, 0) / 2,
        );
      const expected =
        area(b.footprint) - b.holes.reduce((sum, h) => sum + area(h), 0);
      assert.ok(
        Math.abs(roofArea - expected) < Math.max(0.1, expected * 1e-4),
        `${b.id}: hole area changed ${roofArea} vs ${expected}`,
      );
      triangles += positions.count / 3;
      parts++;
      geometry.dispose();
    }
  assert.equal(parts, 25);
  assert.ok(triangles < 15000);
});
test("city attribution and derivative data remain independently downloadable", async () => {
  const visible = JSON.parse(
    await readFile("src/assets/city-buildings.json", "utf8"),
  );
  const downloadable = JSON.parse(
    await readFile("public/data/city-buildings.json", "utf8"),
  );
  assert.deepEqual(visible, downloadable);
  assert.match(
    await readFile("public/data/CITY-LICENSE-NOTICE.txt", "utf8"),
    /OpenStreetMap/,
  );
  for (const c of visible.cities)
    for (const b of c.buildings) {
      assert.ok(
        ["source-reported", "levels-derived", "assumed"].includes(
          b.heightBasis,
        ),
      );
      assert.ok(b.contextOnly);
      assert.ok(b.sourceUrl.startsWith("https://www.openstreetmap.org/"));
    }
});
test("narration only opts into local browser voices and never auto-plays on record or camera change", async () => {
  const voice = await readFile("src/useNarration.ts", "utf8");
  assert.match(voice, /filter\(\(?v\)?\s*=>\s*v\.localService\)/);
  assert.match(voice, /if\s*\(\s*!available\s*\|\|\s*!voices\.length\s*\)\s*return/);
  const app = await readFile("src/App.tsx", "utf8");
  assert.match(app, /onClick=\{\(\)\s*=>\s*narration\.speak\(transcript\(\)\)\}/);
  assert.ok(!voice.includes("fetch("));
  assert.ok(!voice.includes("XMLHttpRequest"));
});
