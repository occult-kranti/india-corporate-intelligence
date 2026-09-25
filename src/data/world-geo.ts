/**
 * A schematic world land outline.
 *
 * THIS IS NOT A MAP OF THE WORLD. It is a hand-typed, deliberately coarse cartoon
 * of where the big landmasses roughly are, written directly as longitude/latitude
 * pairs so every vertex is auditable in the source. Nothing here was surveyed,
 * fetched, generalised from a real dataset, or checked against one. It exists so
 * that marks placed by real coordinates have *something* behind them, and for no
 * other purpose.
 *
 * The projection is plate carrée (equirectangular), which is the projection that
 * distorts everything a little and area very badly toward the poles. Do not measure
 * anything off this. Do not infer a border from it — there are no borders here, only
 * coastlines, and the coastlines are wrong by tens to hundreds of kilometres in
 * places. Antarctica is omitted entirely. Landmasses are cut at the antimeridian
 * because the viewBox stops there, so eastern Chukotka is truncated at 180°E.
 *
 * If a mark lands in the sea, the outline is at fault, not the coordinate.
 */

/** viewBox for the whole world in plate carrée: 2 units per degree. */
export const WORLD_VIEWBOX = '0 0 720 360';

/**
 * The honesty line. Any component drawing this geometry MUST render it.
 * Never describe this outline as accurate, and never call it a map.
 */
export const WORLD_OUTLINE_NOTE =
  'The land outline is a schematic, not a survey: a hand-typed, deliberately coarse ' +
  'cartoon of the continents at a few hundred vertices, on an equirectangular ' +
  'projection. It is wrong at the scale of tens to hundreds of kilometres, has no ' +
  'borders, omits Antarctica and most islands, and is cut at the antimeridian. It is ' +
  'a backdrop for locating marks, and carries no information of its own.';

/**
 * Equirectangular projection for `WORLD_VIEWBOX`.
 * x = (lon + 180) * 2, y = (90 - lat) * 2. No clamping — out-of-range input
 * produces out-of-range output, so callers must range-check rather than be
 * silently given a wrong-but-plausible point.
 */
export function project(lon: number, lat: number): { x: number; y: number } {
  return { x: (lon + 180) * 2, y: (90 - lat) * 2 };
}

/** True if a coordinate pair is finite and inside ±180 / ±90. */
export function inLonLatRange(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90
  );
}

export interface LandRing {
  id: string;
  name: string;
  /** Closed ring of [lon, lat] pairs. Coarse by design. */
  pts: [number, number][];
}

// ---------------------------------------------------------------------------
// The rings. Written by hand, west-to-east / clockwise-ish, no consistent
// winding required — the point-in-ring test below is even-odd per ring.
// ---------------------------------------------------------------------------

const AFRICA: [number, number][] = [
  [-5.9, 35.8], [8, 37], [10.8, 36.9], [11, 33.8], [15.5, 32], [19, 30.4], [20.5, 32.2],
  [25, 31.6], [31.5, 31.5], [34, 31.3], [34.4, 28], [32.6, 29.9], [35, 24], [37, 21],
  [39, 15.5], [43.3, 12.7], [44.5, 11.5], [48, 11.6], [51.3, 11.9], [51, 9], [44.5, 2],
  [41, -1], [40, -4.5], [39.5, -7.5], [40.5, -10.5], [40.6, -14], [35.5, -19.5],
  [35.3, -22], [32.6, -25.9], [31, -29], [27, -33.5], [25, -34.2], [20, -34.8],
  [18.4, -34], [17, -32], [15, -26.5], [11.7, -17.3], [13.4, -12.5], [12.5, -5.8],
  [9.3, -0.7], [9.7, 4], [8.5, 4.5], [5, 5.5], [3, 6.4], [0, 5.7], [-7.5, 4.4],
  [-13, 8.5], [-16, 12], [-17.5, 14.7], [-16.5, 19], [-13, 27.7], [-9.8, 31.5],
  [-6.9, 34], [-5.9, 35.8],
];

const EURASIA: [number, number][] = [
  // Iberia and the Atlantic seaboard
  [-5.6, 36], [-9, 37], [-9.5, 38.7], [-8.9, 43.5], [-1.8, 43.4], [-4.5, 48.5],
  [1.5, 50.9], [4.5, 52.5], [8, 53.7], [8.5, 57.5], [10.5, 57.6], [10.5, 54.6],
  [18.5, 54.5], [21, 56.2], [24.5, 59.5], [30.3, 60], [25.4, 62], [24.5, 65.6],
  [21.5, 64.5], [18.3, 59.4], [16.5, 56.5], [12.7, 55.4], [11, 59], [5.2, 60], [5, 62],
  [8.5, 63.5], [14, 67], [17.5, 68.8], [20.5, 70], [26, 71.1], [31.5, 70],
  // Russian Arctic, truncated at the antimeridian
  [40, 66], [44, 68], [52, 68.5], [60, 70], [69, 73], [73, 71], [80, 73], [90, 76],
  [100, 77], [108, 74], [115, 73], [129, 73], [147, 71], [156, 71], [175, 68.5],
  [180, 66.5],
  // Pacific seaboard, Kamchatka and the Sea of Okhotsk
  [178, 64], [172, 62], [163, 58], [162, 56], [158, 51.5], [156, 54], [153, 59],
  [150, 59.5], [138, 55], [140, 52], [141, 49], [140.5, 46], [135, 43], [130.5, 42.5],
  [129.5, 40], [129.4, 35.5], [126.5, 34.4], [126, 37.5], [125.5, 39.7], [121.5, 39.5],
  [118, 38], [122.5, 37], [120.5, 34.5], [121.8, 31], [118, 24.5], [113, 22],
  [110, 21.5], [108, 19], [109.5, 15], [109.5, 11.5], [106.5, 8.6], [103, 10.5],
  [101.5, 12.7], [100.5, 13.5], [100, 12], [99.5, 9.3], [101, 6.5], [102.5, 5.5],
  [103.5, 4], [104.3, 1.7], [104, 1.2], [103.4, 1.25], [100.4, 5.4], [98.7, 8],
  [98.3, 9.5], [98, 11], [97, 16], [94.5, 17.5], [92, 21],
  // Bay of Bengal, peninsular India, Arabian Sea
  [87, 21.5], [82, 17], [80.3, 15.8], [80.3, 13], [79.9, 10.3], [77.5, 8.1], [74, 14.5],
  [72.7, 20], [69, 22.5], [67, 24], [61.5, 25.2], [57.5, 25.5], [56.4, 26.6],
  [57.8, 22.5], [58, 20.5], [55, 17.5], [52.5, 16.5], [49, 14], [45.5, 12.7],
  [43.3, 12.5], [39, 21], [37, 24], [35.5, 27], [34.5, 28.5], [34.2, 31.3], [35.5, 34.5],
  [36, 36], [35.5, 36.6], [33, 36.2], [31, 36.8], [27, 37], [26.5, 38.5], [26, 40],
  [28.9, 40.9],
  // Black Sea, kept as a real hole in the coast rather than filled in
  [33, 42], [41.5, 41.5], [40, 43.5], [36.5, 45.2], [33.5, 45.3], [33.6, 46.2],
  [31.5, 46.6], [29.7, 45.3], [27.9, 42.7], [28, 41.5],
  // Aegean, Adriatic, the Italian peninsula, the Gulf of Lion
  [26.5, 40.5], [24.5, 40.7], [23.7, 38], [23, 36.4], [21.5, 37], [19.4, 40.2],
  [18.5, 42.4], [16, 43.5], [13.6, 45.5], [12.5, 44], [14.2, 42], [18.5, 40.1],
  [16.5, 38.9], [15.6, 38], [16, 38.7], [14.2, 40.8], [11, 42.4], [10, 44], [8.4, 44.4],
  [5.3, 43.3], [0, 39.5], [-0.7, 37.6], [-2.2, 36.7], [-5.6, 36],
];

const NORTH_AMERICA: [number, number][] = [
  [-168, 66], [-165, 68.5], [-156, 71], [-145, 70], [-128, 70], [-115, 68.5],
  [-105, 68.5], [-95, 68], [-88, 64], [-94, 63], [-94, 58], [-85, 55], [-79, 55],
  [-78, 58], [-77, 62], [-70, 60], [-64, 60], [-56, 54], [-56, 51], [-65, 50],
  [-61, 46], [-66, 44], [-70, 42], [-74, 40], [-76, 37], [-81, 32], [-80, 25], [-83, 28],
  [-84, 30], [-89, 29], [-94, 29], [-97, 26], [-97, 21], [-92, 19], [-90, 21], [-87, 21],
  [-88, 18], [-83, 15], [-79, 9], [-78, 8], [-83, 10], [-87, 13], [-92, 15], [-106, 23],
  [-110, 24], [-114, 31], [-117, 32.5], [-122, 37], [-124, 42], [-124, 48], [-128, 52],
  [-133, 57], [-140, 60], [-148, 60], [-155, 58], [-162, 55], [-162, 58], [-165, 60],
  [-164, 63], [-168, 66],
];

const SOUTH_AMERICA: [number, number][] = [
  [-77, 8], [-75, 11], [-71, 12], [-64, 10], [-60, 8], [-52, 5], [-50, 0], [-44, -2],
  [-38, -4], [-35, -6], [-39, -13], [-40, -20], [-44, -23], [-48, -25], [-52, -32],
  [-57, -35], [-62, -39], [-65, -45], [-68, -50], [-68, -53], [-73, -53], [-75, -48],
  [-74, -44], [-73, -37], [-71, -30], [-70, -23], [-71, -18], [-76, -14], [-79, -8],
  [-81, -6], [-80, -3], [-78, 1], [-77, 4], [-77, 8],
];

const AUSTRALIA: [number, number][] = [
  [113, -22], [114, -26], [115, -32], [118, -35], [124, -34], [129, -32], [134, -33],
  [136, -35], [138, -35], [140, -38], [146, -39], [150, -37], [153, -29], [153, -25],
  [149, -21], [146, -19], [142, -11], [140.5, -17.5], [137, -16], [136, -12], [133, -11],
  [130.8, -12.4], [129, -15], [127, -14], [125, -14], [122, -17], [118, -20], [114, -21],
  [113, -22],
];

const ISLANDS: LandRing[] = [
  {
    id: 'greenland',
    name: 'Greenland',
    pts: [
      [-45, 60], [-53, 67], [-56, 71], [-60, 76], [-68, 77], [-70, 80], [-60, 82],
      [-40, 83], [-20, 76], [-22, 70], [-38, 65], [-45, 60],
    ],
  },
  {
    id: 'iceland',
    name: 'Iceland',
    pts: [[-24, 65], [-22, 66.5], [-16, 66.5], [-14, 65.5], [-15, 64], [-20, 63.4], [-24, 65]],
  },
  {
    id: 'great-britain',
    name: 'Great Britain',
    pts: [
      [-5.7, 50.1], [0.5, 50.8], [1.7, 52.9], [-1.5, 55.8], [-3, 57.7], [-5, 58.6],
      [-5.5, 56.5], [-3, 53.4], [-4.7, 52.8], [-5.3, 51.7], [-4.2, 50.4], [-5.7, 50.1],
    ],
  },
  {
    id: 'ireland',
    name: 'Ireland',
    pts: [[-6, 52], [-6, 53.4], [-6.3, 54.4], [-8, 55.3], [-10, 54.3], [-9.8, 53.2], [-9.5, 51.6], [-8, 51.5], [-6, 52]],
  },
  {
    id: 'honshu',
    name: 'Japan (Honshu, Kyushu, Shikoku as one)',
    pts: [
      [130, 31], [135, 34], [137, 34.7], [140, 35], [141, 38], [141.5, 41], [140, 41.5],
      [139, 39], [133, 35.5], [131, 34.5], [130, 33], [130, 31],
    ],
  },
  {
    id: 'hokkaido',
    name: 'Hokkaido',
    pts: [[140, 42], [145, 43], [145, 45.5], [141, 45.5], [140, 42]],
  },
  {
    id: 'madagascar',
    name: 'Madagascar',
    pts: [[49, -12], [50, -15], [49.5, -18], [47.5, -24.5], [45, -25.5], [43.5, -22], [43.5, -17], [46, -15], [48, -13], [49, -12]],
  },
  {
    id: 'sri-lanka',
    name: 'Sri Lanka',
    pts: [[80, 9.8], [81.8, 7.5], [81.5, 6.3], [80, 5.9], [79.7, 8], [80, 9.8]],
  },
  {
    id: 'sumatra',
    name: 'Sumatra',
    pts: [[95.3, 5.6], [98, 3.5], [100.5, 0], [103, -1.5], [105.5, -5.9], [104, -5.9], [101, -3], [98.5, 0], [95.3, 5.6]],
  },
  {
    id: 'java',
    name: 'Java',
    pts: [[105, -6], [110, -6], [114, -8], [112, -8.5], [107, -7.5], [105.5, -6.9], [105, -6]],
  },
  {
    id: 'borneo',
    name: 'Borneo',
    pts: [[109, 2], [112, 3], [115, 5], [117, 4], [119, 5.5], [118, 1], [117, -3], [114, -4], [110, -3], [109, 0], [109, 2]],
  },
  {
    id: 'sulawesi-new-guinea',
    name: 'New Guinea',
    pts: [[131, -1], [135, -2], [140, -2.5], [146, -5], [150, -6], [147, -8], [143, -9], [138, -8], [133, -4], [131, -1]],
  },
  {
    id: 'luzon',
    name: 'Luzon',
    pts: [[120, 18], [122, 18], [122, 14], [124, 13], [122, 12], [120, 14], [120, 16], [120, 18]],
  },
  {
    id: 'mindanao',
    name: 'Mindanao',
    pts: [[122, 8], [126, 9], [126, 6], [124, 6], [122, 7], [122, 8]],
  },
  {
    id: 'tasmania',
    name: 'Tasmania',
    pts: [[145, -41], [148, -41], [148, -43.5], [145, -43], [145, -41]],
  },
  {
    id: 'nz-north',
    name: 'New Zealand (North Island)',
    pts: [[173, -35], [175, -37], [178, -38], [177, -40], [175, -41], [174, -39], [173, -35]],
  },
  {
    id: 'nz-south',
    name: 'New Zealand (South Island)',
    pts: [[172, -41], [174, -41.5], [174, -46], [170, -46.5], [167, -46], [168, -44], [171, -42], [172, -41]],
  },
  {
    id: 'cuba',
    name: 'Cuba',
    pts: [[-84.9, 21.9], [-80.5, 23.2], [-74.2, 20.3], [-77.5, 19.9], [-82, 22], [-84.9, 21.9]],
  },
];

export const WORLD_LAND: LandRing[] = [
  { id: 'africa', name: 'Africa', pts: AFRICA },
  { id: 'eurasia', name: 'Eurasia', pts: EURASIA },
  { id: 'north-america', name: 'North America', pts: NORTH_AMERICA },
  { id: 'south-america', name: 'South America', pts: SOUTH_AMERICA },
  { id: 'australia', name: 'Australia', pts: AUSTRALIA },
  ...ISLANDS,
];

/** Total hand-typed vertices. Quoted in the UI so the coarseness is a number, not an adjective. */
export const WORLD_OUTLINE_VERTEX_COUNT = WORLD_LAND.reduce((n, r) => n + r.pts.length, 0);

/** Landmasses deliberately left out. Named so the omission is visible, not silent. */
export const WORLD_OUTLINE_OMISSIONS =
  'Antarctica, the Arctic archipelagos, the Caribbean apart from Cuba, the Mediterranean ' +
  'islands, Sakhalin, the Aleutians, and every small island state';

function ringToPath(pts: [number, number][]): string {
  return (
    pts
      .map(([lon, lat], i) => {
        const { x, y } = project(lon, lat);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ') + ' Z'
  );
}

export interface LandPath {
  id: string;
  name: string;
  /** SVG path data in `WORLD_VIEWBOX` coordinates. */
  d: string;
}

/** The outline as SVG path data, one path per landmass. */
export const WORLD_LAND_PATHS: LandPath[] = WORLD_LAND.map((r) => ({
  id: r.id,
  name: r.name,
  d: ringToPath(r.pts),
}));

/** Even-odd ray cast in lon/lat space. */
function pointInRing(lon: number, lat: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Is this coordinate on the drawn land, within a tolerance?
 *
 * The tolerance exists because the outline is coarse: a real port sits on a real
 * coastline, and this coastline is in the wrong place by a degree or two, so a
 * strict test would report half the world's ports as being in the sea. A point
 * within `tolDeg` of the drawn land counts as on it. Anything failing even that is
 * genuinely far from the schematic — and the caller should say so out loud rather
 * than move the mark or drop it.
 */
export function isOnOutline(lon: number, lat: number, tolDeg = 2.5): boolean {
  if (!inLonLatRange(lon, lat)) return false;
  const probes: [number, number][] = [
    [lon, lat],
    [lon + tolDeg, lat],
    [lon - tolDeg, lat],
    [lon, lat + tolDeg],
    [lon, lat - tolDeg],
    [lon + tolDeg * 0.7, lat + tolDeg * 0.7],
    [lon - tolDeg * 0.7, lat + tolDeg * 0.7],
    [lon + tolDeg * 0.7, lat - tolDeg * 0.7],
    [lon - tolDeg * 0.7, lat - tolDeg * 0.7],
  ];
  for (const ring of WORLD_LAND) {
    for (const [plon, plat] of probes) {
      if (pointInRing(plon, plat, ring.pts)) return true;
    }
  }
  return false;
}

/** Graticule lines, every 30°, for the backdrop. */
export const GRATICULE = {
  meridians: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150],
  parallels: [-60, -30, 0, 30, 60],
};
