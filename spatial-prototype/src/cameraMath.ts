import { CatmullRomCurve3, Vector3 } from "three";
export const CAMERA_FLOOR = 2.4;
export function easedProgress(t: number) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  return clamped * clamped * (3 - 2 * clamped);
}
export function makeThreadCurve(a: Vector3, b: Vector3) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y += Math.min(2.7, a.distanceTo(b) * 0.13);
  return new CatmullRomCurve3([
    a.clone(),
    a.clone().lerp(mid, 0.55),
    mid,
    mid.clone().lerp(b, 0.45),
    b.clone(),
  ]);
}
export function safeCameraPosition(position: Vector3) {
  const next = position.clone();
  next.y = Math.max(CAMERA_FLOOR, next.y);
  return next;
}
export function fitCamera(points: Vector3[], aspect: number) {
  if (!points.length) return null;
  const min = points[0].clone(),
    max = points[0].clone();
  for (const point of points) {
    min.min(point);
    max.max(point);
  }
  const target = min.clone().add(max).multiplyScalar(0.5);
  const size = max.clone().sub(min);
  const distance = Math.max(10, size.x / Math.max(0.2, aspect), size.z) * 1.02;
  return {
    target,
    position: safeCameraPosition(
      target.clone().add(new Vector3(0, distance, distance * 0.67)),
    ),
  };
}
export function stepJourney(
  elapsed: number,
  delta: number,
  duration: number,
  paused = false,
) {
  if (!Number.isFinite(duration) || duration <= 0) return 1;
  if (paused) return Math.max(0, Math.min(1, elapsed / duration));
  return Math.max(
    0,
    Math.min(1, (elapsed + Math.max(0, Math.min(0.1, delta))) / duration),
  );
}
