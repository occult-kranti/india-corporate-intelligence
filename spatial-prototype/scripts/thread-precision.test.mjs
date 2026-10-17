import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "thread-precision-"));
after(() => rm(dir, { recursive: true, force: true }));
const file = join(dir, "precision.mjs");
await build({
  stdin: {
    contents: `export * from './src/threadGeometry.ts'; export * from 'three';`,
    resolveDir: process.cwd(),
  },
  outfile: file,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const {
  CatmullRomCurve3,
  Vector3,
  Matrix4,
  PerspectiveCamera,
  MeshStandardMaterial,
  makeScreenThreadGeometry,
  projectScreenThreadGeometry,
  threadProjectionScale,
  constrainThreadMaterial,
  threadRadiusPixels,
} = await import(pathToFileURL(file));
const curve = new CatmullRomCurve3([
  new Vector3(0.4, 0.5, 0),
  new Vector3(0.6, 0.5, 0.002),
  new Vector3(0.8, 0.5, 0),
]);
const float = Math.fround;
function frameAt(zoom, width = 1440, height = 1000, pitch = 0, bearing = 0) {
  const unit = 1 / (512 * 2 ** zoom),
    center = curve.getPointAt(0.5);
  const angle = (pitch * Math.PI) / 180,
    turn = (bearing * Math.PI) / 180;
  const distance = (height / 2 / Math.tan(Math.PI / 8)) * unit;
  const camera = new PerspectiveCamera(
    45,
    width / height,
    distance / 1000,
    distance * 1000,
  );
  camera.up.set(Math.sin(turn), -Math.cos(turn), 0);
  camera.position.set(
    center.x + Math.sin(angle) * distance * Math.sin(turn),
    center.y - Math.sin(angle) * distance * Math.cos(turn),
    Math.cos(angle) * distance,
  );
  camera.lookAt(center.x, center.y, 0);
  camera.updateMatrixWorld();
  return Object.freeze({
    matrix: Object.freeze(
      new Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ).elements,
    ),
    ...threadProjectionScale(zoom),
    revision: zoom,
  });
}
function vertex(g, frame, index, width = 1440, height = 1000) {
  const c = g.getAttribute("aThreadClip"),
    r = g.getAttribute("aThreadRadial"),
    m = frame.matrix.map(float);
  const radial = [
    float(r.getX(index) * float(frame.radius)),
    float(r.getY(index) * float(frame.radius)),
    float(r.getZ(index) * float(frame.radius)),
  ];
  const p = [c.getX(index), c.getY(index), c.getZ(index), c.getW(index)].map(
    (v, axis) =>
      float(
        v +
          float(
            float(m[axis] * radial[0]) +
              float(
                float(m[axis + 4] * radial[1]) + float(m[axis + 8] * radial[2]),
              ),
          ),
      ),
  );
  return [
    ((p[0] / p[3] + 1) * width) / 2,
    ((1 - p[1] / p[3]) * height) / 2,
    p[2] / p[3],
    p[3],
  ];
}
test("same 48 original segments and 480 triangles survive the precision representation", () => {
  const g = makeScreenThreadGeometry(curve, 1);
  assert.equal(g.parameters.path, curve);
  assert.equal(g.parameters.tubularSegments, 48);
  assert.equal(g.parameters.radialSegments, 5);
  assert.equal(g.index.count / 3, 480);
  assert.equal(g.getAttribute("position").count, 576);
  assert.equal(g.getAttribute("aThreadClip").count, 576);
  const original = g.getAttribute("position").array.slice();
  for (const zoom of [0.6, 5.9, 6, 8, 16, 17, 18, 19])
    projectScreenThreadGeometry(g, frameAt(zoom));
  assert.deepEqual(
    g.getAttribute("position").array,
    original,
    "Projection must not mutate original tube positions",
  );
  g.dispose();
});
test("actual Float32 clip/radial arithmetic retains finite width through zoom 19", () => {
  for (const [width, height, pitch, bearing] of [
    [1440, 1000, 0, 0],
    [680, 760, 0, 0],
    [1440, 1000, 35, 25],
  ])
    for (const count of [1, 5]) {
      const g = makeScreenThreadGeometry(curve, count);
      for (const zoom of [4.5, 5.9, 6.0001, 8, 16, 17, 18, 19]) {
        const f = frameAt(zoom, width, height, pitch, bearing);
        projectScreenThreadGeometry(g, f);
        let insideTriangles = 0,
          maximumWidth = 0;
        for (let ring = 0; ring < 96; ring++) {
          const points = Array.from({ length: 6 }, (_, j) =>
            vertex(g, f, ring * 6 + j, width, height),
          );
          assert.ok(
            points.flat().every(Number.isFinite),
            `Nonfinite GPU projection z${zoom}`,
          );
          if (points.every((p) => p[2] > 1)) continue;
          const dx =
            Math.max(...points.map((p) => p[0])) -
            Math.min(...points.map((p) => p[0]));
          const dy =
            Math.max(...points.map((p) => p[1])) -
            Math.min(...points.map((p) => p[1]));
          maximumWidth = Math.max(maximumWidth, Math.hypot(dx, dy));
        }
        for (let i = 0; i < g.index.count; i += 3) {
          const [a, b, c] = [0, 1, 2].map((j) =>
            vertex(g, f, g.index.array[i + j], width, height),
          );
          const area = Math.abs(
            (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
          );
          if (
            area > 0.001 &&
            [a, b, c].some(
              (p) =>
                p[2] >= -1 &&
                p[2] <= 1 &&
                p[0] >= -8 &&
                p[0] <= width + 8 &&
                p[1] >= -8 &&
                p[1] <= height + 8,
            )
          )
            insideTriangles++;
        }
        assert.ok(
          insideTriangles > 0,
          `No visible nondegenerate triangles z${zoom}/${width}/${pitch}`,
        );
        assert.ok(
          maximumWidth >= threadRadiusPixels(count),
          `Collapsed width ${maximumWidth} z${zoom}`,
        );
        assert.ok(
          maximumWidth < threadRadiusPixels(count) * 4,
          `Unbounded width ${maximumWidth} z${zoom}`,
        );
      }
      g.dispose();
    }
});
test("crossing center clips before Float32, including both endpoints offscreen", () => {
  const g = makeScreenThreadGeometry(curve, 1),
    f = frameAt(19);
  projectScreenThreadGeometry(g, f);
  const c = g.getAttribute("aThreadClip");
  let kept = 0,
    rejected = 0,
    minX = Infinity,
    maxX = -Infinity;
  for (let segment = 0; segment < 48; segment++) {
    const index = segment * 12;
    if (c.getZ(index) === 2 && c.getW(index) === 1) {
      rejected++;
      continue;
    }
    kept++;
    for (const i of [index, index + 6]) {
      const x = c.getX(i) / c.getW(i);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      assert.ok(
        Math.abs(x) < 1.02,
        "Center must be viewport-local before conversion",
      );
    }
  }
  assert.ok(kept >= 1 && kept <= 2);
  assert.equal(kept + rejected, 48);
  assert.ok(minX <= -1 && maxX >= 1);
  g.dispose();
});
test("rejected segments stay separate and invalid projection fails closed", () => {
  const g = makeScreenThreadGeometry(curve, 1),
    f = frameAt(19),
    m = [...f.matrix];
  m[13] += 100;
  projectScreenThreadGeometry(
    g,
    Object.freeze({ ...f, matrix: Object.freeze(m) }),
  );
  const c = g.getAttribute("aThreadClip"),
    r = g.getAttribute("aThreadRadial");
  assert.ok(
    Array.from(
      { length: c.count },
      (_, i) => c.getZ(i) === 2 && c.getW(i) === 1,
    ).every(Boolean),
  );
  assert.ok([...r.array].every((v) => v === 0));
  assert.throws(
    () => projectScreenThreadGeometry(g, { ...f, matrix: [] }),
    /Invalid/,
  );
  assert.throws(
    () => projectScreenThreadGeometry(g, { ...f, lift: NaN }),
    /Invalid/,
  );
  g.dispose();
});
test("radial projection has w=0 and complete double draw provenance", async () => {
  const material = new MeshStandardMaterial(),
    radius = { value: 1 },
    lift = { value: 1 };
  constrainThreadMaterial(material, radius, lift);
  const shader = {
    uniforms: {},
    vertexShader: "#include <begin_vertex>\n#include <project_vertex>",
  };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uThreadRadius, radius);
  assert.equal(shader.uniforms.uThreadLift, lift);
  assert.match(
    shader.vertexShader,
    /gl_Position = aThreadClip \+ projectionMatrix \* modelViewMatrix \* vec4\(aThreadRadial \* uThreadRadius, 0\.0\)/,
  );
  const source = await readFile("src/scene.ts", "utf8");
  assert.match(
    source,
    /matrix: Object\.freeze\(\[\.\.\.this\.camera\.projectionMatrix\.elements\]\)/,
  );
  assert.match(source, /mesh\.userData\.threadProjection = threadFrame/);
  material.dispose();
});

test("near/far/behind-camera rejection and peripheral tube support remain bounded", () => {
  const g = makeScreenThreadGeometry(curve, 1);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const f = Object.freeze({
    matrix: Object.freeze(identity),
    radius: 1,
    lift: 1,
    revision: 1,
  });
  const positions = g.getAttribute("position").array.slice();
  for (const [slot, value] of [
    [14, 3],
    [14, -3],
    [15, -1],
  ]) {
    const matrix = [...identity];
    matrix[slot] = value;
    projectScreenThreadGeometry(g, { ...f, matrix, revision: 2 });
    const c = g.getAttribute("aThreadClip");
    assert.ok(
      Array.from(
        { length: c.count },
        (_, i) => c.getZ(i) === 2 && c.getW(i) === 1,
      ).every(Boolean),
    );
  }
  // Center just outside the top plane, but its circular cross-section touches it.
  const matrix = [...identity];
  matrix[13] = 0.5005;
  projectScreenThreadGeometry(g, { ...f, matrix, revision: 3 });
  const c = g.getAttribute("aThreadClip");
  assert.ok(
    Array.from(
      { length: c.count },
      (_, i) => c.getZ(i) !== 2 || c.getW(i) !== 1,
    ).some(Boolean),
  );
  assert.deepEqual(g.getAttribute("position").array, positions);
  const version = c.version;
  projectScreenThreadGeometry(g, { ...f, matrix: [...matrix], revision: 4 });
  assert.equal(
    c.version,
    version,
    "Identical camera projection must not re-upload attributes",
  );
  g.dispose();
});

test('negative control reproduces old sub-ULP Mercator width loss', () => {
  const g=makeScreenThreadGeometry(curve,1),scale=threadProjectionScale(19);
  const p=g.getAttribute('position'),center=g.getAttribute('aTubeCenter');
  const ring=48; // One original middle ring, with six independent radial vertices.
  const ys=Array.from({length:6},(_,j)=>{
    const i=ring*6+j;
    return Math.fround(center.getY(i)+Math.fround(Math.fround(p.getY(i)-center.getY(i))*Math.fround(scale.radius)));
  });
  assert.equal(new Set(ys).size,1,'Old float32 center-plus-radius arithmetic collapses the cross-section');
  projectScreenThreadGeometry(g,frameAt(19));
  const y=[];
  for(let i=0;i<g.getAttribute('aThreadClip').count;i++) {
    const q=vertex(g,frameAt(19),i);
    if(q[2]>=-1&&q[2]<=1)y.push(q[1]);
  }
  assert.ok(Math.max(...y)-Math.min(...y)>1,'The new separate radial projection must retain actual width');
  g.dispose();
});
