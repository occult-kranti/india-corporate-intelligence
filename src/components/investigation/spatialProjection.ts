/** Exact LCC and affine transform used by build-map.py. Bounds recomputed from
 * the pinned LGD archive (SHA256 1b8a2f0bd908c10dc1229d2a7c5bcd3d433bb3fa013865163b21f4f61780e911), not calibrated to city labels. */
export function projectAtlasCoordinate(lon: number, lat: number): [number, number] {
  const n = 0.4014740602712093;
  const r = 2.651760452109443 / Math.tan(Math.PI / 4 + lat * Math.PI / 360) ** n;
  const theta = n * (lon - 80) * Math.PI / 180;
  const x = r * Math.sin(theta);
  const y = 2.229794672767035 - r * Math.cos(theta);
  return [41.42047644188949 + (x + 0.18504717385856492) * 1243.4441859429385, 30 + (0.227414644774949 - y) * 1243.4441859429385];
}
