import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "map-local-boundary-"));
after(() => rm(dir, { recursive: true, force: true }));
const outfile = join(dir, "boundary.mjs");
await build({
  entryPoints: ["src/MapBoundary.tsx"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { default: MapBoundary } = await import(pathToFileURL(outfile));
test("map-local boundary reports a rejected graphics chunk and removes only its scene child", () => {
  const failures = [];
  const child = { marker: "scene" };
  const boundary = new MapBoundary({
    children: child,
    onFailure: (r) => failures.push(r),
  });
  assert.equal(boundary.render(), child);
  boundary.state = MapBoundary.getDerivedStateFromError(
    new Error("Graphics chunk unavailable"),
  );
  boundary.componentDidCatch(new Error("Graphics chunk unavailable"));
  assert.equal(boundary.render(), null);
  assert.deepEqual(failures, ["Graphics chunk unavailable"]);
});
test("App keeps registry reader outside the map boundary and handles the lazy map failure", async () => {
  const source = await readFile("src/App.tsx", "utf8");
  const start = source.indexOf("<MapBoundary"),
    end = source.indexOf("</MapBoundary>");
  assert.ok(start >= 0 && end > start);
  const scope = source.slice(start, end);
  assert.match(scope, /<Suspense/);
  assert.match(scope, /<SpatialWorld/);
  assert.match(scope, /setFailure\(reason\)/);
  assert.match(scope, /enterReading\(\)/);
  assert.ok(!scope.includes("<RegistryReader"));
  assert.ok(source.indexOf("<RegistryReader") > end);
});
