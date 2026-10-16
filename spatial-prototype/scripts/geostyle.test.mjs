import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const temporary = await mkdtemp(join(tmpdir(), "felt-style-test-"));
after(() => rm(temporary, { recursive: true, force: true }));
const outfile = join(temporary, "style.mjs");
await build({
  entryPoints: ["src/geoStyle.ts"],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const { feltMapStyle, TILE_SOURCE, MAP_CREDITS } = await import(
  pathToFileURL(outfile).href
);
test("felt geographic style passes the current installed MapLibre validator", () => {
  const errors = validateStyleMin(feltMapStyle());
  assert.deepEqual(
    errors.map((e) => e.message),
    [],
  );
});
test("worldwide building layer is a coordinate-native extrusion with qualified provider heights", () => {
  const style = feltMapStyle();
  const layer = style.layers.find((l) => l.id === "buildings-3d");
  assert.equal(layer.type, "fill-extrusion");
  assert.equal(layer["source-layer"], "building");
  assert.equal(layer.minzoom, 14);
  assert.equal(TILE_SOURCE, "https://tiles.openfreemap.org/planet");
  assert.deepEqual(layer.filter, ["!=", ["get", "hide_3d"], true]);
  assert.match(
    JSON.stringify(layer.paint["fill-extrusion-height"]),
    /render_height/,
  );
  assert.match(MAP_CREDITS, /OpenMapTiles/);
  assert.match(MAP_CREDITS, /openstreetmap\.org\/copyright/);
});
test("a source-backed static world remains when optional remote map tiles fail", () => {
  const style = feltMapStyle();
  const source = style.sources["country-base"];
  assert.equal(source.type, "geojson");
  assert.equal(source.data.type, "FeatureCollection");
  assert.ok(source.data.features.length >= 240);
  assert.ok(
    style.layers.some((l) => l.source === "country-base" && l.type === "fill"),
  );
});
test("geographic renderer contains no arbitrary city placements or tabletop wings", async () => {
  const renderer = await readFile("src/scene.ts", "utf8");
  assert.ok(!renderer.includes("placements:"));
  assert.ok(!renderer.includes("buildCityLayer"));
  assert.ok(!renderer.includes("buildRoom"));
  assert.match(renderer, /getNodeAnchor/);
  assert.match(renderer, /renderWorldCopies:\s*false/);
  assert.match(renderer, /MercatorCoordinate/);
  assert.match(renderer, /defaultProjectionData\.mainMatrix/);
});
