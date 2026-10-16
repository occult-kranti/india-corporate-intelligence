/** Offline source-geometry validation helper; runtime buildings come from geographic vector tiles. */
import * as THREE from "three";
import data from "./assets/city-buildings.json";
export const CITY_DATA = data;
export function buildingGeometry(
  building: (typeof data.cities)[number]["buildings"][number],
) {
  const points = building.footprint.map(([x, z]) => new THREE.Vector2(x, -z));
  const shape = new THREE.Shape(points);
  for (const hole of building.holes)
    shape.holes.push(
      new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))),
    );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: building.heightMeters,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}
