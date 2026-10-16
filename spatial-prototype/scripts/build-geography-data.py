"""Rebuild source-bound display geography from reviewed local inputs only.

No network, geocoding, boundary repair, label matching or source evidence edits.
Use --check to verify the checked-in artifacts without rewriting them.
"""
import argparse
import hashlib
import json
import math
import os
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORLD_SOURCE_SHA256 = '3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb'
WORLD_ARTIFACT_SHA256 = 'a97bd58679079eae2bd0c86ec122537dde9c0958bd812eb07c5e60fe13ab690c'
STATES_SOURCE_SHA256 = '7ae52226dde1e67884903819d48579305d100615bdad54712bbe5991332fe76d'
REPRESENTATIVE_METHOD_ID = 'surface-scanline-v1'
REPRESENTATIVE_METHOD = ('Validated point on surface: midpoint of the widest interior horizontal segment '
                         'near the vertical midpoint of the largest planar-area polygon component; '
                         'holes excluded, longitude/latitude coordinates, deterministic tie-breaking. '
                         'Display representative only, not a verified site or address.')

# Each namespace is explicitly imported by the reviewed India registry. Its national
# scope has the India meaning stated by AtlasCaseFeed.tsx, not the place of the
# publisher, regulator, lender, headquarters or an international counterparty.
# Future namespaces require review; do not replace this list with a prefix/default.
NATIONAL_CONTEXT = {
    'allegations-policy': ('research/raw/allegations-map/policy.json', 'Explicit India institutional or investor-scheme context in the retained geography note.'),
    'atlas-institutions': ('research/raw/atlas-expansion/institutions.json', 'Explicit India public-interest context in the retained geography note, including foreign correspondents; no residence or payment destination.'),
    'atlas-international-finance': ('research/raw/atlas-expansion/international-finance.json', 'India sovereign borrowing, social-protection, IFC and IMF national case context; foreign country contexts remain explicit.'),
    'atlas-oversight': ('research/raw/atlas-expansion/oversight.json', 'India audit and programme remit for the retained Uttarakhand, Telangana and Bihar cases; no lender address.'),
    'atlas-policy': ('research/raw/atlas-expansion/policy.json', 'Indian national legislation, institutions and policy case context.'),
    'deep-corporate': ('research/raw/deep-investigation/corporate.json', 'Indian public-asset sales and policy case context, including foreign counterparties; no company address.'),
    'deep-governance': ('research/raw/deep-investigation/governance.json', 'India solar-financing case context under the original national-scope adapter; foreign court/regulator jurisdiction and investor location are not asserted.'),
    'deep-procurement': ('research/raw/deep-investigation/procurement.json', 'India public-project financing and procurement case context; no international lender or investor headquarters.'),
    'deep-services': ('research/raw/deep-investigation/services.json', 'Indian national programmes, ministries, insolvency and court case context; mixed national/project records remain unplaced.'),
    'education': ('src/data/education-research.json', 'India education register consumed by geoFor; IN school series become national and state arrays remain separate.'),
    'finance-research': ('research/raw/investigation/finance-research.json', 'India national funds, RBI regulation and insolvency aggregates.'),
    'justice-research': ('research/raw/investigation/justice-research.json', 'Union of India institutions and nationwide Indian legal context; publication location is not project geography.'),
    'metro-defence': ('research/raw/metro-spending/defence.json', 'Indian national defence and central procurement programme context; not spending in the capital.'),
    'metro-delhi-security': ('research/raw/metro-spending/delhi-security.json', 'Indian national institutions and funding frameworks explicitly distinguished from Delhi allocation.'),
    'metro-mumbai-security': ('research/raw/metro-spending/mumbai-security.json', 'Indian central procurement and shipyard payment context explicitly distinguished from Mumbai or Maharashtra allocation.'),
    'metro-public-finance': ('research/raw/metro-spending/public-finance.json', 'India CPPP source collection context, not Delhi/Mumbai allocation.'),
    'metro-tender-scan': ('research/raw/metro-spending/tender-scan.json', 'India national buyer-name cohorts; parent-office names do not locate projects or spending.'),
    'money-trails-corporate': ('research/raw/money-trails/corporate/slice.json', 'Indian corporate/electoral-bond legal and financial context; no recipient residence or state allocation.'),
    'money-trails-djb': ('research/raw/money-trails/djb/slice.json', 'Indian company/institutional annual-report context, with project payment location explicitly unasserted.'),
    'pmcares': ('src/data/pmcares.ts', 'India PM CARES national fund statements via national(sourceIds); not state spending inferred from PMO address.'),
    'procurement-audit': ('src/data/procurement-audit.json', 'India CPPP corpus-wide collection context; no supplier, asset or delivery geography.'),
    'procurement-trails': ('src/data/procurementTrails.ts', 'procurementTrailGeography uses central India CPPP buyer collection context, not supplier/work location.'),
    'public-works': ('src/data/public-works-research.json', 'India public-works register consumed by geoFor; national jurisdiction does not become a project pin.'),
    'water': ('src/data/water-research.json', 'India water/food register consumed by geoFor; multi-state source rows remain unplaced.'),
    'welfare': ('src/data/welfare.generated.ts', 'Central Indian programme jurisdiction via national(sourceIds), distinct from delivery and a minister constituency.'),
    'welfare-research': ('research/raw/investigation/welfare-research.json', 'Indian national welfare programme/audit context, not inferred from a publisher address.'),
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def json_bytes(value, compact=False):
    return (json.dumps(value, separators=(',', ':') if compact else None,
                       indent=None if compact else 2) + '\n').encode()


def polygons(geometry):
    return [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']


def ring_area(ring):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


def in_ring(point, ring):
    inside = False
    x, y = point
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]):
            inside = not inside
    return inside


def in_geometry(point, geometry):
    return any(in_ring(point, polygon[0]) and not any(in_ring(point, hole) for hole in polygon[1:])
               for polygon in polygons(geometry))


def representative(geometry):
    # Stable source-order tie breaking. All components remain in the geometry.
    polygon = max(polygons(geometry), key=lambda p: ring_area(p[0]) - sum(map(ring_area, p[1:])))
    ys = sorted(set(point[1] for ring in polygon for point in ring))
    midpoint = (ys[0] + ys[-1]) / 2
    # A scan line strictly between consecutive vertex levels cannot cross a vertex.
    low, high = min(zip(ys, ys[1:]), key=lambda pair: (abs((pair[0] + pair[1]) / 2 - midpoint), pair[0]))
    y = (low + high) / 2
    xs = sorted(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
                for ring in polygon for a, b in zip(ring, ring[1:] + ring[:1])
                if (a[1] > y) != (b[1] > y))
    if len(xs) < 2 or len(xs) % 2:
        raise ValueError('Invalid polygon intersections; no geometry repair is permitted')
    intervals = [(a, b) for a, b in zip(xs[::2], xs[1::2]) if b > a]
    a, b = max(intervals, key=lambda segment: (segment[1] - segment[0], -segment[0]))
    point = [round((a + b) / 2, 9), round(y, 9)]
    if not in_geometry(point, geometry):
        raise ValueError('Rounded representative is not strictly on the source polygon surface')
    return point


def distance(a, b):
    dlat, dlng = math.radians(b[1] - a[1]), math.radians(b[0] - a[0])
    p = math.sin(dlat / 2) ** 2 + math.cos(math.radians(a[1])) * math.cos(math.radians(b[1])) * math.sin(dlng / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(min(1, max(0, p))), math.sqrt(max(0, 1 - p)))


def area(feature, precision, code, source):
    center = representative(feature['geometry'])
    coordinates = [p for poly in polygons(feature['geometry']) for ring in poly for p in ring]
    return {'code': code, 'name': feature['properties']['name'], 'precision': precision,
            'lng': center[0], 'lat': center[1], 'bounds': feature['bbox'],
            'uncertaintyKm': math.ceil(max(distance(center, p) for p in coordinates)),
            'geometrySourceId': source, 'geometryFeatureId': feature['id'],
            'centerMethod': REPRESENTATIVE_METHOD_ID}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--world-source', type=Path, default=Path('/tmp/ne_50m_admin_0_countries.geojson'))
    parser.add_argument('--source-root', type=Path, default=Path(os.environ.get('FIELDWORK_SOURCE_ROOT', str(ROOT.parent if (ROOT.parent / 'src/data/investigation.ts').exists() else Path('/workspace/shared/investigation-board-redesign/app')))))
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'src/assets/geography')
    parser.add_argument('--verified-assets', type=Path, default=ROOT / 'src/assets/geography')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    old_metadata = json.loads((args.verified_assets / 'geography-sources.json').read_text())
    world_source = next(source for source in old_metadata['sources'] if source['id'] == 'natural-earth-50m-countries')
    if world_source['sha256'] != WORLD_SOURCE_SHA256:
        raise ValueError('Reviewed world source hash changed; review required')
    if args.world_source.exists():
        if sha256(args.world_source) != WORLD_SOURCE_SHA256:
            raise ValueError('World source bytes differ from reviewed snapshot')
        original_world = json.loads(args.world_source.read_text())
        features = [{'type': 'Feature', 'id': f['properties']['ADM0_A3'],
                     'properties': {'name': f['properties']['ADMIN'], 'iso2': f['properties']['ISO_A2'], 'iso3': f['properties']['ADM0_A3']},
                     'bbox': f['bbox'], 'geometry': f['geometry']} for f in original_world['features']]
        world = {'type': 'FeatureCollection', 'features': features}
    else:
        # Regeneration remains offline/reproducible with the audited extraction.
        world_path = args.verified_assets / 'world-countries-50m.json'
        if sha256(world_path) != WORLD_ARTIFACT_SHA256:
            raise ValueError('Verified world extraction hash changed')
        world = json.loads(world_path.read_text())
    world_bytes = json_bytes(world, compact=True)
    if hashlib.sha256(world_bytes).hexdigest() != WORLD_ARTIFACT_SHA256:
        raise ValueError('World extraction changed; no reinterpretation of source codes is permitted')
    state_path = args.source_root / 'src/components/investigation/assets/india-current36-wgs84.json'
    if sha256(state_path) != STATES_SOURCE_SHA256:
        raise ValueError('India state source bytes differ from reviewed snapshot')
    states = json.loads(state_path.read_text())
    if len(states['features']) != 36:
        raise ValueError('Expected all 36 source administrative units')
    tamil_nadu = next(f for f in states['features'] if f['id'] == 'TN')
    iso_counts = Counter(f['properties']['iso2'] for f in world['features'])
    supported = [f for f in world['features'] if re.fullmatch('[A-Z]{2}', f['properties']['iso2']) and iso_counts[f['properties']['iso2']] == 1]
    anchors = [area(f, 'country', f['properties']['iso2'], 'natural-earth-50m-countries') for f in supported]
    anchors += [area(f, 'state', 'IN-' + f['id'], 'lgd-bharatmaps-india-states') for f in states['features']]
    anchors.sort(key=lambda value: value['code'])
    semantic_paths = ['src/data/investigation.ts', 'src/data/atlasInvestigation.ts', 'src/components/investigation/AtlasCaseFeed.tsx']
    crosswalk = {
        'scope': 'Only scope=national and basis=national-context in these exact reviewed India-registry namespaces. Explicit foreign/multiple country or state codes are never overwritten.',
        'semanticEvidence': [{'path': p, 'sha256': sha256(args.source_root / p)} for p in semantic_paths],
        'semanticStatement': 'AtlasCaseFeed.tsx labels the atlasInvestigation.ts national-scope count as Indian national context. investigation.ts imports these exact source slices and preserves geography qualifiers.',
        'entries': [{'namespace': name, 'countryCode': 'IN', 'sourcePath': path,
                     'sourceSha256': sha256(args.source_root / path), 'rationale': rationale}
                    for name, (path, rationale) in NATIONAL_CONTEXT.items()],
    }
    artifacts = {
        'world-countries-50m.json': world_bytes,
        'india-states-wgs84.json': json_bytes(states, compact=True),
        'tamil-nadu-wgs84.json': json_bytes({'type': 'FeatureCollection', 'features': [tamil_nadu], 'provenance': states['provenance']}, compact=True),
        'evidence-area-anchors.json': json_bytes(anchors),
        'national-context-crosswalk.json': json_bytes(crosswalk),
    }
    # Keep existing source records exactly, including all original qualifications.
    old_tn = next(source for source in old_metadata['sources'] if source['id'] == 'lgd-bharatmaps-tamil-nadu')
    metadata = {'sources': [world_source, old_tn,
        {'id': 'lgd-bharatmaps-india-states', 'title': 'India 36-unit retained WGS84 administrative geometry',
         **states['provenance'], 'sha256': STATES_SOURCE_SHA256, 'featureCount': 36,
         'extraction': 'All original 36 state/UT features and source provenance retained unchanged; no state aliases, boundary repair or historical reallocation.'}],
        'representativeMethodId': REPRESENTATIVE_METHOD_ID,
        'representativeMethod': REPRESENTATIVE_METHOD,
        'coverage': {'worldFeatures': len(world['features']), 'supportedCountryAnchors': len(supported), 'stateAnchors': len(states['features']),
                     'unsupportedWorldFeatures': [{'id': f['id'], 'sourceCode': f['properties']['iso2']} for f in world['features'] if f not in supported],
                     'limitation': 'Only unique two-letter codes explicitly retained in the verified world extraction are supported. Non-ISO or ambiguous source codes remain render-only; no country name is geocoded or reassigned.'},
        'artifactSha256': {name: hashlib.sha256(data).hexdigest() for name, data in artifacts.items()}}
    artifacts['geography-sources.json'] = json_bytes(metadata)
    for name, data in artifacts.items():
        target = args.output_dir / name
        if args.check:
            if not target.exists() or target.read_bytes() != data:
                raise ValueError(f'{name} differs from deterministic regeneration')
        else:
            args.output_dir.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    print(json.dumps({'mode': 'check' if args.check else 'write', 'countryAnchors': len(supported), 'stateAnchors': 36, 'nationalNamespaces': len(NATIONAL_CONTEXT)}))


if __name__ == '__main__':
    main()
