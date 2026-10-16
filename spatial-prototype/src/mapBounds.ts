/**
 * A single non-wrapping geographic world. Keep longitude strictly inside the
 * antimeridian: MapLibre 6.13 wraps exact -180/+180 to one x coordinate when
 * applying maxBounds, producing a zero-width range and infinite zoom.
 * This sub-metre camera constraint does not alter any source geometry.
 */
export const WORLD_CAMERA_BOUNDS: [[number, number], [number, number]] = [
  [-179.999999, -85.0511],
  [179.999999, 85.0511],
];
