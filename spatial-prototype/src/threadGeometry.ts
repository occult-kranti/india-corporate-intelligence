import * as THREE from "three";
export const THREAD_REFERENCE_RADIUS = 0.001;
export const THREAD_HIDE_ZOOM = 6;
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
export function makeScreenThreadGeometry(
  curve: THREE.CatmullRomCurve3,
  sourceCount: number,
) {
  const geometry = new THREE.TubeGeometry(
    curve,
    48,
    THREAD_REFERENCE_RADIUS * threadRadiusPixels(sourceCount),
    5,
    false,
  );
  const centers: number[] = [];
  for (let ring = 0; ring <= 48; ring++) {
    const center = curve.getPointAt(ring / 48);
    for (let radial = 0; radial <= 5; radial++)
      centers.push(center.x, center.y, center.z);
  }
  geometry.setAttribute(
    "aTubeCenter",
    new THREE.Float32BufferAttribute(centers, 3),
  );
  return geometry;
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
      "attribute vec3 aTubeCenter; uniform float uThreadRadius; uniform float uThreadLift;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed = vec3(aTubeCenter.xy, aTubeCenter.z * uThreadLift) + (position - aTubeCenter) * uThreadRadius;",
    );
  };
  material.customProgramCacheKey = () => "felt-screen-thread-v1";
}
