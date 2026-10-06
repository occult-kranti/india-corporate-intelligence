#!/usr/bin/env python3
"""Read-only reproducible review of retained CPPP aggregates; no raw-row or portal verification."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / 'research/raw/cppp'
names = ['quality', 'rates', 'timing', 'redflags', 'concentration', 'sample-verification']
data = {name: json.loads((INPUT / f'{name}.json').read_text()) for name in names}
rates, quality, timing = data['rates'], data['quality'], data['timing']
years = rates['byPortalYear']
n = sum(row['n'] for row in years)
singles = sum(row['singleBidder'] for row in years)
assert n == data['redflags']['indicators'][0]['familySize']
assert singles == data['redflags']['indicators'][0]['count']

def fraction(numerator, denominator):
    return {'numerator': numerator, 'denominator': denominator, 'pct': 100 * numerator / denominator if denominator else None}

def year_comparison(year):
    rows = [row for row in years if row['year'] == str(year)]
    total = sum(row['n'] for row in rows)
    central = next(row for row in rows if row['portal'] == 'central')
    return {'year': year, 'pooledSingleBid': fraction(sum(row['singleBidder'] for row in rows), total),
            'centralPortalShare': fraction(central['n'], total),
            'equalPortalWeightPct': sum(50 * row['singleBidder'] / row['n'] for row in rows),
            'note': '50:50 portal reweighting is descriptive sensitivity, not adjustment for buyer/category/value composition or evidence of causation.'}

def suspect_group(table, label):
    row = next(row for row in rates[table] if row['key'] == label)
    return {'group': label, 'singleBidRate': fraction(row['singleBidder'], row['n']),
            'shareOfRatedRows': fraction(row['n'], n), 'shareOfAllSingles': fraction(row['singleBidder'], singles),
            'complementSingleBidRate': fraction(singles - row['singleBidder'], n - row['n']),
            'note': 'Not a recommendation to silently discard this group. Publish both populations and investigate the missingness mechanism.'}

buyers = data['concentration']['byBuyer']
report = {
    'scope': 'Derived from retained aggregate JSON only. Same underlying scrape, not independent corroboration; no new raw-data execution or portal verification.',
    'inputs': [{'path': str((INPUT/f'{name}.json').relative_to(ROOT)), 'sha256': hashlib.sha256((INPUT/f'{name}.json').read_bytes()).hexdigest()} for name in names],
    'aggregateAsOf': rates['provenance']['asOf'],
    'rawRows': quality['raw']['rows'],
    'dedupRows': quality['afterDedup']['rows'],
    'allRatedSingleBid': fraction(singles, n),
    'portalYearMismatchRawRows': fraction(quality['dates']['portalYearDiffersFromAocYear'], quality['raw']['rows']),
    'yearComparisons': [year_comparison(year) for year in [2015, 2021, 2025, 2026]],
    'fiveCalendarYears2021Through2025': [
        {'portal': portal, 'singleBid': fraction(sum(row['singleBidder'] for row in years if row['portal']==portal and row['year'] in ['2021','2022','2023','2024','2025']), sum(row['n'] for row in years if row['portal']==portal and row['year'] in ['2021','2022','2023','2024','2025'])),
         'note': 'Whole AOC calendar years; not the exact rolling five-year window and not proof of complete coverage.'}
        for portal in ['central', 'state']],
    'missingnessSensitivity': [suspect_group('byValueBand', 'value missing or implausible'), suspect_group('byTenderType', 'Other/unknown')],
    'outOfRangeOrFutureYearRatedRows': [{key: row[key] for key in ['portal','year','n','singleBidder']} for row in years if row['year']=='out-of-range year' or int(row['year'])>2026],
    'sameDayShareOfLeTwoDayRecords': fraction(next(row['n'] for row in timing['daysClosingToAoc'] if row['bin']=='0'), timing['shareLe2Days']['count']),
    'timingWarning': 'Current timing SQL excludes negative gaps but does not require realistic event years or event dates before original scrape cutoff. AOC publication is not necessarily the contract decision date.',
    'concentrationSubset': {
        'buyers': len(buyers),
        'markedAwardsBelow50': sum(row['markedAwards']<50 for row in buyers),
        'markedAwardsBelow10': sum(row['markedAwards']<10 for row in buyers),
        'markedAwardCoverageBelow50Pct': sum(row['markedAwards']*2<row['awards'] for row in buyers),
        'countHhi10000Cases': [{'markedAwards': row['markedAwards'], 'allNamedAwards': row['awards']} for row in buyers if row['hhiMarkedCount']==10000],
        'valueCountHhiAbsoluteDifferenceAtLeast2500': sum(row['hhiMarkedValue'] is not None and row['hhiMarkedCount'] is not None and abs(row['hhiMarkedValue']-row['hhiMarkedCount'])>=2500 for row in buyers),
        'note': 'All-named >=50 threshold does not ensure >=50 observations in the marked subset used for HHI. No supplier names emitted.'},
    'verification': {'sample': len(data['sample-verification']['rows']), 'pageGone': data['sample-verification']['pageGone'], 'note': '40 unavailable stored detail URLs do not establish agreement, disagreement or national missing-record rates.'},
    'notComputed': ['raw dedup collision frequency','exact rolling five-year window','notice-to-award row match','any contractor identity or political match','actual payments or physical delivery','causal effect or wrongdoing score']
}
output = Path(__file__).with_name('aggregate-review.json')
output.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(output)
