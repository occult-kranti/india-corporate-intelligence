/** Geographic display geometry only. Never creates or joins evidence edges. */
export type ThreadPoint = readonly [number, number, number];
export type ClipPoint = readonly [number, number, number, number];
export type ThreadSegment = { a: ThreadPoint; b: ThreadPoint; index: number };
export const THREAD_SEGMENTS = 48;
const mix = (a: ClipPoint, b: ClipPoint, t: number): ClipPoint =>
  a.map((value, i) => value + (b[i] - value) * t) as unknown as ClipPoint;

/** Clip before division. Two offscreen endpoints can enclose a visible segment. */
export function clipThreadSegment(
  a: ClipPoint,
  b: ClipPoint,
  marginX = 0,
  marginY = 0,
): readonly [ClipPoint, ClipPoint] | null {
  if (
    ![...a, ...b, marginX, marginY].every(Number.isFinite) ||
    marginX < 0 ||
    marginY < 0
  )
    return null;
  const planes = [
    (p: ClipPoint) => p[3] - 1e-9,
    (p: ClipPoint) => p[0] + p[3] * (1 + marginX),
    (p: ClipPoint) => p[3] * (1 + marginX) - p[0],
    (p: ClipPoint) => p[1] + p[3] * (1 + marginY),
    (p: ClipPoint) => p[3] * (1 + marginY) - p[1],
    (p: ClipPoint) => p[2] + p[3],
    (p: ClipPoint) => p[3] - p[2],
  ];
  let enter = 0,
    leave = 1;
  for (const plane of planes) {
    const start = plane(a),
      end = plane(b);
    if (start < 0 && end < 0) return null;
    if (start < 0) enter = Math.max(enter, start / (start - end));
    else if (end < 0) leave = Math.min(leave, start / (start - end));
    if (enter > leave) return null;
  }
  return [mix(a, b, enter), mix(a, b, leave)];
}

export function projectThreadSegments(
  points: readonly ThreadPoint[],
  matrix: readonly number[],
  width: number,
  height: number,
  lift: number,
  padding = 9,
): ThreadSegment[] {
  if (
    matrix.length !== 16 ||
    !matrix.every(Number.isFinite) ||
    ![width, height, lift, padding].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    lift < 0 ||
    padding < 0
  )
    return [];
  const transform = ([x, y, z]: ThreadPoint): ClipPoint => [
    matrix[0] * x + matrix[4] * y + matrix[8] * z * lift + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z * lift + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z * lift + matrix[14],
    matrix[3] * x + matrix[7] * y + matrix[11] * z * lift + matrix[15],
  ];
  const screen = (p: ClipPoint): ThreadPoint => [
    ((p[0] / p[3] + 1) * width) / 2,
    ((1 - p[1] / p[3]) * height) / 2,
    p[2] / p[3],
  ];
  const result: ThreadSegment[] = [];
  for (let i = 1; i < points.length; i++) {
    const clipped = clipThreadSegment(
      transform(points[i - 1]),
      transform(points[i]),
      (2 * padding) / width,
      (2 * padding) / height,
    );
    if (clipped)
      result.push({
        a: screen(clipped[0]),
        b: screen(clipped[1]),
        index: i - 1,
      });
  }
  return result;
}

export function threadSegmentDistance(
  x: number,
  y: number,
  { a, b }: ThreadSegment,
): number {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    square = dx * dx + dy * dy;
  const t =
    square > 0
      ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / square))
      : 0;
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
