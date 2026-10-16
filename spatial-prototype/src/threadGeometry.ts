import * as THREE from "three";
import { THREAD_SEGMENTS } from "./threadProjection";
export const THREAD_REFERENCE_RADIUS = 0.001;
export const THREAD_OPACITY = 0.9;
const RADIAL_SEGMENTS = 5;
const RING_SIZE = RADIAL_SEGMENTS + 1;
/** Capped display width only; source accuracy/independence is never inferred. */
export function threadRadiusPixels(sourceCount: number) {
  return 0.85 + Math.min(5, Math.max(1, sourceCount)) * 0.25;
}
export function threadProjectionScale(zoom: number) {
  const unit = 1 / (512 * 2 ** zoom);
  return {
    radius: unit / THREAD_REFERENCE_RADIUS,
    lift: Math.min(1, unit / 0.0007),
  };
}
/** Read-only draw provenance; no evidence, camera control or admission state. */
export type ThreadProjectionFrame = Readonly<{
  matrix: readonly number[];
  radius: number;
  lift: number;
  revision: number;
}>;
type PrecisionTube = {
  centers: Float64Array;
  normals: Float32Array;
  projected: Float64Array;
  pad: Float64Array;
  radius: number;
  lastFrame: ThreadProjectionFrame | null;
};
const precisionTubes = new WeakMap<THREE.BufferGeometry, PrecisionTube>();

export function makeScreenThreadGeometry(
  curve: THREE.CatmullRomCurve3,
  sourceCount: number,
) {
  const radius = THREAD_REFERENCE_RADIUS * threadRadiusPixels(sourceCount);
  const geometry = new THREE.TubeGeometry(
    curve,
    THREAD_SEGMENTS,
    radius,
    RADIAL_SEGMENTS,
    false,
  );
  const original = {
    position: geometry.getAttribute("position"),
    normal: geometry.getAttribute("normal"),
    uv: geometry.getAttribute("uv"),
  };
  const centers = new Float64Array((THREAD_SEGMENTS + 1) * 3);
  for (let ring = 0; ring <= THREAD_SEGMENTS; ring++) {
    const p = curve.getPointAt(ring / THREAD_SEGMENTS);
    centers.set([p.x, p.y, p.z], ring * 3);
  }
  // Independent segment rings permit clipping an offscreen-to-offscreen crossing.
  // Triangle count and original source curve stay unchanged: 48 * 5 * 2.
  const count = THREAD_SEGMENTS * 2 * RING_SIZE;
  const positions = new Float32Array(count * 3),
    normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2),
    tubeCenters = new Float32Array(count * 3);
  const indices: number[] = [];
  for (let segment = 0; segment < THREAD_SEGMENTS; segment++) {
    for (let end = 0; end < 2; end++) {
      for (let radial = 0; radial < RING_SIZE; radial++) {
        const from = (segment + end) * RING_SIZE + radial;
        const to = (segment * 2 + end) * RING_SIZE + radial;
        for (let axis = 0; axis < 3; axis++) {
          positions[to * 3 + axis] = original.position.array[from * 3 + axis];
          normals[to * 3 + axis] = original.normal.array[from * 3 + axis];
          tubeCenters[to * 3 + axis] = centers[(segment + end) * 3 + axis];
        }
        uvs[to * 2] = original.uv.getX(from);
        uvs[to * 2 + 1] = original.uv.getY(from);
      }
    }
    for (let radial = 0; radial < RADIAL_SEGMENTS; radial++) {
      const a = segment * 2 * RING_SIZE + radial,
        b = a + RING_SIZE;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute(
    "aTubeCenter",
    new THREE.BufferAttribute(tubeCenters, 3),
  );
  geometry.setAttribute(
    "aThreadClip",
    new THREE.BufferAttribute(new Float32Array(count * 4), 4).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  geometry.setAttribute(
    "aThreadRadial",
    new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  precisionTubes.set(geometry, {
    centers,
    normals: new Float32Array(original.normal.array),
    radius,
    projected: new Float64Array((THREAD_SEGMENTS + 1) * 4),
    pad: new Float64Array(7),
    lastFrame: null,
  });
  return geometry;
}

/**
 * Full-precision MapLibre matrix -> clipped centers, then Float32 upload.
 * Small radial vectors are projected separately with w=0 in the shader, never
 * added to absolute Mercator coordinates. This also preserves GPU depth clipping.
 */
export function projectScreenThreadGeometry(
  geometry: THREE.BufferGeometry,
  frame: ThreadProjectionFrame,
) {
  const tube = precisionTubes.get(geometry);
  if (!tube) throw new Error("Missing original thread precision geometry");
  if (tube.lastFrame === frame) return;
  const m = frame.matrix;
  if (
    m.length !== 16 ||
    !m.every(Number.isFinite) ||
    !Number.isFinite(frame.radius) ||
    !Number.isFinite(frame.lift) ||
    frame.radius <= 0 ||
    frame.lift < 0
  )
    throw new Error("Invalid thread projection");
  if (
    tube.lastFrame &&
    tube.lastFrame.radius === frame.radius &&
    tube.lastFrame.lift === frame.lift &&
    m.every((value, index) => value === tube.lastFrame!.matrix[index])
  ) {
    tube.lastFrame = frame;
    return;
  }
  const clip = geometry.getAttribute("aThreadClip") as THREE.BufferAttribute;
  const radial = geometry.getAttribute(
    "aThreadRadial",
  ) as THREE.BufferAttribute;
  const p = tube.projected;
  for (let ring = 0; ring <= THREAD_SEGMENTS; ring++) {
    const x = tube.centers[ring * 3],
      y = tube.centers[ring * 3 + 1];
    const z = tube.centers[ring * 3 + 2] * frame.lift;
    for (let axis = 0; axis < 4; axis++)
      p[ring * 4 + axis] =
        m[axis] * x + m[axis + 4] * y + m[axis + 8] * z + m[axis + 12];
  }
  // Conservative tube support on each homogeneous clip plane. Clipping only
  // center points at the viewport boundary would lose visible peripheral wool.
  const worldRadius = tube.radius * frame.radius;
  const pad = tube.pad;
  pad[0] = worldRadius * Math.hypot(m[3], m[7], m[11]);
  for (let axis = 0; axis < 3; axis++) {
    pad[axis * 2 + 1] =
      worldRadius *
      Math.hypot(m[3] + m[axis], m[7] + m[axis + 4], m[11] + m[axis + 8]);
    pad[axis * 2 + 2] =
      worldRadius *
      Math.hypot(m[3] - m[axis], m[7] - m[axis + 4], m[11] - m[axis + 8]);
  }
  for (let segment = 0; segment < THREAD_SEGMENTS; segment++) {
    const a = segment * 4,
      b = a + 4;
    let enter = 0,
      leave = 1;
    for (let plane = 0; plane < 7; plane++) {
      const axis = (plane - 1) >> 1,
        sign = plane % 2 ? 1 : -1;
      const start =
        plane === 0
          ? p[a + 3] - 1e-9 + pad[0]
          : p[a + 3] + sign * p[a + axis] + pad[plane];
      const end =
        plane === 0
          ? p[b + 3] - 1e-9 + pad[0]
          : p[b + 3] + sign * p[b + axis] + pad[plane];
      if (start < 0 && end < 0) {
        enter = 1;
        leave = 0;
        break;
      }
      if (start < 0) enter = Math.max(enter, start / (start - end));
      else if (end < 0) leave = Math.min(leave, start / (start - end));
      if (enter > leave) break;
    }
    for (let end = 0; end < 2; end++) {
      const t = end === 0 ? enter : leave;
      for (let side = 0; side < RING_SIZE; side++) {
        const to = (segment * 2 + end) * RING_SIZE + side;
        if (enter > leave) {
          // Degenerate triangle outside the far plane; never connects segments.
          clip.setXYZW(to, 0, 0, 2, 1);
          radial.setXYZ(to, 0, 0, 0);
          continue;
        }
        for (let axis = 0; axis < 4; axis++)
          clip.array[to * 4 + axis] =
            p[a + axis] + (p[b + axis] - p[a + axis]) * t;
        for (let axis = 0; axis < 3; axis++) {
          const first = (segment * RING_SIZE + side) * 3 + axis;
          const n =
            tube.normals[first] +
            (tube.normals[first + RING_SIZE * 3] - tube.normals[first]) * t;
          radial.array[to * 3 + axis] = n * tube.radius;
        }
      }
    }
  }
  clip.needsUpdate = true;
  radial.needsUpdate = true;
  tube.lastFrame = frame;
}

export function constrainThreadMaterial(
  material: THREE.MeshStandardMaterial,
  radius: { value: number },
  lift: { value: number },
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThreadRadius = radius;
    shader.uniforms.uThreadLift = lift;
    shader.vertexShader =
      "attribute vec3 aTubeCenter; attribute vec4 aThreadClip; attribute vec3 aThreadRadial; uniform float uThreadRadius; uniform float uThreadLift;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed = vec3(aTubeCenter.xy, aTubeCenter.z * uThreadLift) + (position - aTubeCenter) * uThreadRadius;",
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\ngl_Position = aThreadClip + projectionMatrix * modelViewMatrix * vec4(aThreadRadial * uThreadRadius, 0.0);",
      );
  };
  material.customProgramCacheKey = () => "felt-screen-thread-clipped-v2";
}
