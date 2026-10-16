import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const temporary = await mkdtemp(join(tmpdir(), "felt-screen-thread-"));
after(() => rm(temporary, { recursive: true, force: true }));
const outfile = join(temporary, "thread.mjs");
await build({
  stdin: {
    contents: `export * from './src/threadGeometry.ts'; export {CatmullRomCurve3,Vector3} from 'three';`,
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const {
  makeScreenThreadGeometry,
  threadProjectionScale,
  threadRadiusPixels,
  THREAD_OPACITY,
  CatmullRomCurve3,
  Vector3,
} = await import(pathToFileURL(outfile).href);
test("geographic thread width stays bounded across overview and country zoom", () => {
  const curve = new CatmullRomCurve3([
    new Vector3(0.4, 0.5, 0),
    new Vector3(0.5, 0.55, 0.02),
    new Vector3(0.7, 0.6, 0),
  ]);
  for (const count of [1, 2, 3, 4, 5, 100]) {
    const geometry = makeScreenThreadGeometry(curve, count),
      position = geometry.getAttribute("position"),
      centers = geometry.getAttribute("aTubeCenter");
    assert.equal(position.count, centers.count);
    for (const zoom of [0.6, 1.5, 3, 4, 5.9, 6, 7, 12, 16, 17, 18, 19]) {
      const scale = threadProjectionScale(zoom);
      assert.ok(scale.lift > 0 && scale.lift <= 1);
      for (let i = 0; i < position.count; i++) {
        const rawRadius = Math.hypot(
          position.getX(i) - centers.getX(i),
          position.getY(i) - centers.getY(i),
          position.getZ(i) - centers.getZ(i),
        );
        const pixels = rawRadius * scale.radius * 512 * 2 ** zoom;
        assert.ok(
          Math.abs(pixels - threadRadiusPixels(count)) < 0.001,
          `Radius drift: ${pixels}`,
        );
        assert.ok(pixels <= 2.101);
      }
    }
    geometry.dispose();
  }
  assert.equal(THREAD_OPACITY, 0.9);
});
test("camera destination refreshes labels and geographic threads have no zoom cutoff", async () => {
  const source = await readFile("src/scene.ts", "utf8");
  assert.match(
    source,
    /\.on\("moveend",\s*\(\) => this\.updateLabels\(true\)\)/,
  );
  assert.doesNotMatch(source, /THREAD_HIDE_ZOOM/);
  assert.match(source, /material\.opacity = THREAD_OPACITY/);
  assert.match(source, /projectThreadSegments/);
  assert.match(source, /threadSegmentDistance/);
  assert.match(source, /constrainThreadMaterial/);
});
