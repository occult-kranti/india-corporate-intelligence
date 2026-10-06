# Current administrative map

`india-current36.json` contains actual LGD/BharatMaps boundaries for the current 36 states and union territories, including separate Jammu and Kashmir / Ladakh and the merged Dadra and Nagar Haveli and Daman and Diu. It is separate from the legacy map asset; historical tags are not silently moved onto these boundaries.

- Upstream: [ramSeraph / indian_admin_boundaries, States release](https://github.com/ramSeraph/indian_admin_boundaries/releases/tag/states).
- Government source: [LGD/BharatMaps state-boundary service](https://mapservice.gov.in/gismapservice/rest/services/BharatMapService/Admin_Boundary_GramPanchayat/MapServer/0).
- Data licence: [CC0-1.0 with requested attribution to DataMeet and the government source](https://github.com/ramSeraph/indianopenmaps/blob/main/DATA_LICENSE.md), as explicitly linked by the LGD release description. This application preserves that attribution.
- Download: `LGD_States.geojsonl.7z`, 6,467,055 bytes; SHA256 `1b8a2f0bd908c10dc1229d2a7c5bcd3d433bb3fa013865163b21f4f61780e911`; retrieved 2026-10-06.
- Upstream snapshot date is not established from the original release. The administrative roster was verified directly against all 36 LGD identities. A rehost describes a 2024 snapshot; that secondary date is not asserted as an original survey date.
- Result: 36 paths, 832 retained polygon components, 324,874 bytes. No islands were replaced by invented circles or discarded to improve appearance.

The generator projects WGS84 coordinates to a Lambert conformal conic display (standard parallels 12°N / 35°N, latitude origin 24°N, central meridian 80°E). It simplifies each feature while preserving its topology at a tolerance of 0.18 display units and rounds coordinates to 0.01 units. Labels use the largest component's pole of inaccessibility. Small-state callout leaders refer to that location; they do not change the boundary.

The upstream boundary claims are preserved, including disputed areas. This map supports illustrative administrative coverage, not surveying or adjudication of territorial status. Evidence records retain their own geographic basis and observation period. A headquarters association is not a project location; national or unknown geography is not assigned an invented coordinate.

To regenerate in an isolated Python environment:

```sh
python -m venv /tmp/investigation-map-env
/tmp/investigation-map-env/bin/pip install shapely==2.1.2 py7zr==1.0.0
/tmp/investigation-map-env/bin/python scripts/investigation/build-map.py
```

The generator verifies the downloaded archive digest before processing. The application has no new mapping dependency or network tile requirement. Re-generation must not silently accept a changed upstream archive.
