#!/usr/bin/env python3
"""Compare public-water observations with archived original PDF tables and J3 extract.

Requires pypdf. Accepts an evidence directory containing the 4-page JJM excerpt,
original AMRUT PDF and indexed J3 snapshot. No network or inference is used.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from pypdf import PdfReader


def main():
    repo = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--evidence', type=Path, default=repo / 'research/raw/water/evidence/public')
    ap.add_argument('--raw', type=Path, default=repo / 'research/raw/water/public-research.json')
    ap.add_argument('--data', type=Path, default=repo / 'src/data/water-research.json')
    args = ap.parse_args()
    raw = json.loads(args.raw.read_text())
    curated = json.loads(args.data.read_text())
    obs = {row['id']: row for row in curated['observations']}
    comparisons = 0
    for row in raw['observations']:
        imported = obs[row['id']]
        for key in ['value', 'unit', 'period', 'sourceIds', 'scope', 'stateCodes']:
            assert imported[key] == row[key], (row['id'], key)
        assert all(item in imported['limitations'] for item in row['limitations']), row['id']
        comparisons += 1

    j3 = {}
    for line in (args.evidence / 'jjm-administrative-j3-2026-exa.txt').read_text().splitlines():
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) == 11 and cells[0].isdigit() and not cells[1].isdigit():
            j3[cells[1]] = [float(c) for c in cells[2:10]]
    fields = ['villages', 'ruralHouseholdsLakh', 'pendingTapConnectionsLakh',
              'pendingTapConnectionsPercent', 'pwsVillages', 'pwsHouseholdsLakh',
              'pwsHouseholdsWithTapLakh', 'pwsPendingTapConnectionsLakh']
    assert len(j3) == 34, len(j3)
    for row in raw['jjmAdministrativeRows']:
        assert [row[f] for f in fields] == j3[row['state']], row['state']
    assert sum(r[0] for r in j3.values()) == 586054

    survey_path = args.evidence / 'jjm-functionality-2024-selected-pages.pdf'
    survey = PdfReader(survey_path)
    assert len(survey.pages) == 4
    table = {}
    for line in survey.pages[3].extract_text().splitlines():
        m = re.match(r'^(.*?)\s+(\d+\.\d+)%\s+(\d+\.\d+)%\s+(\d+\.\d+)%\s+(\d+\.\d+)%$', line.strip())
        if m:
            name = m[1].replace('Rajas than', 'Rajasthan').replace('Wes t Bengal', 'West Bengal')
            table[name] = [float(v) for v in m.groups()[1:]]
    assert len(table) == 35, len(table)
    fields = ['regularityPct', 'testedMicrobiologicalAndPhQualityPassPct',
              'quantityAtLeast55LpcdPct', 'reportedMinimumFunctionalityPct']
    for row in raw['jjmFunctionalityRows']:
        vals = table[row['state']]
        assert [row[f] for f in fields] == vals, row['state']
        assert vals[3] == min(vals[:3]), row['state']
        code = row['stateCode'] or 'IN'
        assert obs[f'wp-fa-{code}-reportedMinimumFunctionalityPct']['measure'] == 'other'
        assert obs[f'wp-fa-{code}-regularityPct']['measure'] == 'supply-regularity'
        assert obs[f'wp-fa-{code}-quantityAtLeast55LpcdPct']['measure'] == 'supply-quantity'
    methods = survey.pages[2].extract_text()
    assert 'minimum of the three' in methods and 'simultaneously' in methods

    amrut_path = args.evidence / 'amrut-outcomes-2026.pdf'
    amrut = PdfReader(amrut_path)
    city_names = {'port-blair': 'PORT BLAIR', 'visakhapatnam': 'GVMC VISAKHAPATNAM',
                  'ahmedabad': 'AHMEDABAD', 'kochi': 'KOCHI', 'kollam': 'KOLLAM',
                  'thiruvananthapuram': 'THIRUVANANTHAPURAM', 'bhopal': 'BHOPAL',
                  'gwalior': 'GWALIOR', 'aizawl': 'AIZAWL', 'amritsar': 'AMRITSAR',
                  'ludhiana': 'LUDHIANA', 'lucknow': 'LUCKNOW', 'varanasi': 'VARANASI',
                  'dehradun': 'DEHRADUN', 'bhubaneswar': 'BHUBANESWAR'}
    city_count = 0
    for row in raw['observations']:
        if row['sourceIds'] != ['wp-amrut-outcomes']:
            continue
        page = int(re.search(r'PDF page (\d+)', row['locator'])[1])
        name = city_names[row['id'].removeprefix('wp-amrut-')]
        lines = [line for line in amrut.pages[page - 1].extract_text(extraction_mode='layout').splitlines() if name in line]
        assert len(lines) == 1, (name, lines)
        assert int(re.search(r'(\d+)\s*$', lines[0])[1]) == row['value'], row['id']
        city_count += 1
    assert city_count == 15
    assert 4946 + 758 + 201 + 730 + 127 == 6762
    print(json.dumps({'curated_observations_exact': comparisons,
        'J3_original_snapshot_values': len(j3) * 8,
        'survey_original_PDF_percentages': len(table) * 4,
        'AMRUT_original_PDF_city_values': city_count,
        'survey_excerpt_sha256': hashlib.sha256(survey_path.read_bytes()).hexdigest(),
        'AMRUT_sha256': hashlib.sha256(amrut_path.read_bytes()).hexdigest(),
        'result': 'PASS'}, indent=2))


if __name__ == '__main__':
    main()
