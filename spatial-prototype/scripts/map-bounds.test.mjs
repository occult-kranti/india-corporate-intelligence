import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const temporary = await mkdtemp(join(tmpdir(), "felt-map-transform-"));
after(() => rm(temporary, { recursive: true, force: true }));
const outfile = join(temporary, "transform.mjs");
// Pure geographic maths from the exact installed engine. No DOM, browser or GPU.
await build({
  stdin: {
    contents: `export {MercatorTransform} from './node_modules/maplibre-gl/src/geo/projection/mercator_transform.ts'; export {LngLatBounds} from './node_modules/maplibre-gl/src/geo/lng_lat_bounds.ts'; export {WORLD_CAMERA_BOUNDS} from './src/mapBounds.ts';`,
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const { MercatorTransform, LngLatBounds, WORLD_CAMERA_BOUNDS } = await import(
  pathToFileURL(outfile).href
);
test("world camera bounds avoid antimeridian collapse in the actual map transform", () => {
  assert.ok(
    WORLD_CAMERA_BOUNDS[0][0] > -180 && WORLD_CAMERA_BOUNDS[1][0] < 180,
  );
  for (const [width, height] of [
    [1440, 1000],
    [800, 600],
    [400, 300],
  ]) {
    const transform = new MercatorTransform({
      renderWorldCopies: false,
      maxPitch: 70,
      minZoom: 0.6,
      maxZoom: 19,
    });
    transform.setMaxBounds(new LngLatBounds(...WORLD_CAMERA_BOUNDS));
    transform.resize(width, height);
    assert.ok(Number.isFinite(transform.zoom));
    assert.ok(Array.from(transform.projectionMatrix).every(Number.isFinite));
    assert.ok(Array.from(transform.cameraPosition).every(Number.isFinite));
  }
});
test("runtime map constructor uses the regression-tested camera bounds", async () => {
  const source = await readFile("src/scene.ts", "utf8");
  assert.match(source, /maxBounds:\s*WORLD_CAMERA_BOUNDS/);
});
