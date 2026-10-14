#!/usr/bin/env python3
"""Rebuild the Places map's WGS84 boundaries from the pinned LGD archive.
Development only: pip install shapely==2.1.2 py7zr==1.0.0
Usage: python scripts/atlas-expansion/build-places-boundaries.py LGD_States.geojsonl.7z
The application requires neither Python nor a geospatial runtime service.
"""
import hashlib, json, pathlib, sys, tempfile
import py7zr
from shapely.geometry import shape, mapping
ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'src/components/investigation/assets'
SHA = '1b8a2f0bd908c10dc1229d2a7c5bcd3d433bb3fa013865163b21f4f61780e911'
archive = pathlib.Path(sys.argv[1])
assert hashlib.sha256(archive.read_bytes()).hexdigest() == SHA, 'Source digest changed; review before regeneration'
svg = json.loads((ASSETS / 'india-current36.json').read_text())
roster = {row['lgdCode']: row for row in svg['states']}
features = []
with tempfile.TemporaryDirectory() as temporary:
    with py7zr.SevenZipFile(archive) as compressed:
        compressed.extractall(temporary)
    for line in (pathlib.Path(temporary) / 'LGD_States.geojsonl').read_text().splitlines():
        row = json.loads(line)
        state = roster[row['properties']['State_LGD']]
        original = shape(row['geometry'])
        simplified = original.simplify(0.001, preserve_topology=True)
        assert len(getattr(simplified, 'geoms', [simplified])) == state['parts'], 'Polygon component lost'
        features.append({'type': 'Feature', 'id': state['code'], 'properties': {'code': state['code'], 'name': state['name'], 'lgdCode': state['lgdCode']}, 'bbox': list(original.bounds), 'geometry': mapping(simplified)})
assert len(features) == 36
features.sort(key=lambda row: row['properties']['name'])
data = {'type': 'FeatureCollection', 'features': features, 'provenance': {**svg['provenance'], 'projection': 'WGS84 longitude/latitude (EPSG:4326), from original LGD geometry.', 'transformation': 'Topology-preserving geographic simplification at 0.001 degrees; all polygon components retained. Illustrative state boundaries, not surveyed parcel edges.'}}
target = ASSETS / 'india-current36-wgs84.json'
target.write_text(json.dumps(data, separators=(',', ':')) + '\n')
def schematic_hub(row):
    geometry = shape(row['geometry'])
    largest = max(geometry.geoms, key=lambda part: part.area) if hasattr(geometry, 'geoms') else geometry
    point = largest.representative_point()
    return [round(point.x, 7), round(point.y, 7)]
(ASSETS / 'india-current36-bounds.json').write_text(json.dumps([dict(code=row['properties']['code'], name=row['properties']['name'], bbox=row['bbox'], schematicHub=schematic_hub(row)) for row in features], separators=(',', ':')) + '\n')
print(json.dumps({'states': len(features), 'polygonComponents': sum(row['parts'] for row in svg['states']), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}))
