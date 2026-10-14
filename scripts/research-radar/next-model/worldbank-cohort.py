#!/usr/bin/env python3
"""Freeze a complete India Projects API cohort and resolve observable metadata transitions.

No model fit, inferred ownership, inferred disbursement, or misconduct labels. Baseline
capture is explicit; --verify is offline; --resolve requires independently archived
official endpoint pages in the preregistered resolution window.
"""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'research/research-radar/next-model'
COHORT = OUT / 'prospective-worldbank-cohort.json'
UI_SUMMARY = OUT / 'temporal-ui-summary.json'
FIELDS = 'id,project_name,boardapprovaldate,closingdate,status,borrower,impagency,curr_total_commitment,curr_ibrd_commitment,curr_ida_commitment,totalcommamt,url'
API = 'https://search.worldbank.org/api/v3/projects?format=json&countrycode_exact=IN&rows=500&os={offset}&fl=' + FIELDS


def digest(data):
    return hashlib.sha256(data).hexdigest()


def number(value):
    if value is None or value == '':
        return None
    try:
        result = float(str(value).replace(',', ''))
        return result if result >= 0 and result < float('inf') else None
    except (ValueError, TypeError):
        return None


def capture(destination):
    destination.mkdir(parents=True, exist_ok=False)
    pages, records, total = [], {}, None
    offset = 0
    try:
        while total is None or offset < total:
            url = API.format(offset=offset)
            request = urllib.request.Request(url, headers={'User-Agent': 'IndiaPublicFinanceResearch/1.0 public-source-audit'})
            with urllib.request.urlopen(request, timeout=45) as response:
                body = response.read()
                headers = {k: response.headers[k] for k in ['Date', 'ETag', 'Last-Modified'] if k in response.headers}
                status = response.status
            captured = dt.datetime.now(dt.timezone.utc).isoformat()
            payload = json.loads(body)
            found_total = int(payload['total'])
            if total is not None and found_total != total:
                raise ValueError('API population changed during pagination; discard incomplete capture and retry independently.')
            total = found_total
            objects = payload['projects']
            selected = {key: value for key, value in objects.items() if isinstance(value, dict) and value.get('id')}
            if not selected:
                raise ValueError('Empty page before complete cohort capture.')
            if set(records) & set(selected):
                raise ValueError('Repeated project IDs across pages; unstable paging is not an eligible denominator.')
            records.update(selected)
            path = destination / f'projects-{offset}.json'
            path.write_bytes(body)
            pages.append({'url': url, 'path': str(path.relative_to(ROOT)), 'sha256': digest(body),
                          'bytes': len(body), 'records': len(selected), 'total': total,
                          'retrievedAt': captured, 'httpStatus': status, 'responseHeaders': headers})
            offset += 500
        if len(records) != total:
            raise ValueError(f'Incomplete API population: {len(records)} != {total}')
        receipt = {'schemaVersion': 1, 'countryFilter': 'IN', 'total': total, 'pages': pages,
                   'capturedFrom': pages[0]['retrievedAt'], 'capturedThrough': pages[-1]['retrievedAt'],
                   'atomicSnapshotGuaranteed': False,
                   'limitation': 'Three paginated public API responses checked for stable total and unique IDs; the API does not promise transactional consistency.'}
        (destination / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
        return records, receipt
    except Exception:
        # Retain failed bytes for diagnosis, but no success receipt or cohort is written.
        raise


def read_capture(receipt_path):
    receipt = json.loads(receipt_path.read_text())
    assert receipt['countryFilter'] == 'IN', 'Only the preregistered India population is eligible.'
    start = dt.datetime.fromisoformat(receipt['capturedFrom'])
    end = dt.datetime.fromisoformat(receipt['capturedThrough'])
    assert start.tzinfo and end.tzinfo and start <= end, 'Invalid capture interval.'
    assert isinstance(receipt['total'], int) and receipt['total'] > 0
    assert len(receipt['pages']) == (receipt['total'] + 499) // 500, 'Incomplete pagination receipt.'
    records = {}
    previous = start
    for index, page in enumerate(receipt['pages']):
        offset = index * 500
        assert page['url'] == API.format(offset=offset), 'Unexpected API endpoint, filter or page order.'
        assert page['httpStatus'] == 200, 'A failed request is not an observed population.'
        captured = dt.datetime.fromisoformat(page['retrievedAt'])
        assert captured.tzinfo and start <= previous <= captured <= end, 'Invalid page capture chronology.'
        previous = captured
        assert Path(page['path']).name == f'projects-{offset}.json'
        body = (ROOT / page['path']).read_bytes()
        assert len(body) == page['bytes'], 'Page byte count mismatch.'
        assert digest(body) == page['sha256'], f"Source bytes changed: {page['path']}"
        payload = json.loads(body)
        assert int(payload['total']) == receipt['total']
        assert page['total'] == receipt['total']
        assert int(payload['os']) == offset, 'API payload offset differs from requested page.'
        selected = {k: v for k, v in payload['projects'].items() if isinstance(v, dict) and v.get('id')}
        assert all(key == row['id'] for key, row in selected.items()), 'Project ID differs from source key.'
        assert len(selected) == page['records'] == min(500, receipt['total'] - offset), 'Page record count mismatch.'
        assert not set(records) & set(selected)
        records.update(selected)
    assert len(records) == receipt['total']
    assert receipt['pages'][0]['retrievedAt'] == receipt['capturedFrom']
    assert receipt['pages'][-1]['retrievedAt'] == receipt['capturedThrough']
    return records, receipt


def build(records, receipt):
    baseline_at = receipt['capturedThrough']
    rows = []
    for key, record in sorted(records.items()):
        if record.get('status') != 'Active':
            continue
        rows.append({
            'id': key, 'projectName': record.get('project_name'),
            'sourceUrl': f'https://projects.worldbank.org/en/projects-operations/project-detail/{key}',
            'borrower': record.get('borrower'), 'implementingAgency': record.get('impagency'),
            'baseline': {'status': record.get('status'), 'closingDate': record.get('closingdate'),
                         'currentCommitmentUSD': number(record.get('curr_total_commitment'))},
            'firstAvailableAt': baseline_at, 'registeredAt': baseline_at,
            'eventAt': None, 'publishedAt': None,
            'targetIds': ['status-closed-at-checkpoint', 'later-closing-date-at-checkpoint', 'larger-commitment-at-checkpoint'],
            'outcomes': {'status-closed-at-checkpoint': None, 'later-closing-date-at-checkpoint': None,
                         'larger-commitment-at-checkpoint': None},
            'probabilities': {'status-closed-at-checkpoint': None, 'later-closing-date-at-checkpoint': None,
                              'larger-commitment-at-checkpoint': None},
            'outcomeObservedAt': None, 'resolutionStatus': 'unresolved',
        })
    return {
        'schemaVersion': 1, 'kind': 'preregistered-prospective-public-metadata-cohort',
        'registeredAt': baseline_at,
        'baselineReceipt': 'research/research-radar/next-model/worldbank-baseline/receipt.json',
        'population': {'rule': 'Every unique India project returned by the paginated official API whose baseline status is exactly Active.',
                       'apiProjects': len(records), 'eligibleProjects': len(rows),
                       'targetCount': len(rows) * 3, 'geography': 'India; project reach may cover multiple states.',
                       'exclusions': 'Closed, Dropped and Pipeline projects are outside this baseline cohort; new projects are not silently added.'},
        'resolutionWindow': {'opensAt': '2027-04-06T00:00:00+00:00', 'closesAt': '2027-04-20T23:59:59+00:00',
                             'selection': 'First complete independently archived official API capture whose first retained page retrieval is on or after opensAt and whose last retained page retrieval is no later than closesAt.',
                             'interpretation': 'Outcome is the metadata state at that capture, not proof of an event before April 6 or of any transition that occurred and was reversed between captures.'},
        'targets': [
            {'id': 'status-closed-at-checkpoint', 'positive': 'Observed status is exactly Closed.',
             'negative': 'Observed recognized status is Active, Dropped or Pipeline.',
             'meaning': 'API lifecycle status; not verified physical completion or service quality.'},
            {'id': 'later-closing-date-at-checkpoint', 'positive': 'Observed valid closing date is later than baseline closing date.',
             'negative': 'Both dates exist and observed date is equal to or earlier than baseline.',
             'meaning': 'Recorded closing-date revision; not itself evidence of construction delay or wrongdoing.'},
            {'id': 'larger-commitment-at-checkpoint', 'positive': 'Observed current total commitment exceeds baseline current total commitment.',
             'negative': 'Both nonnegative amounts exist and observed amount is equal to or lower than baseline.',
             'meaning': 'Metadata commitment revision; not a payment, loss, cash receipt or beneficiary identification.'},
        ],
        'missingness': 'Failed fetch, missing project, unrecognized status, missing required field or no eligible capture means unknown, never a negative outcome.',
        'forecastStatus': 'no-trained-forecast-no-numeric-probability',
        'scoringStatus': 'blocked-until-observed-outcomes-and-preregistered-model-probabilities-exist',
        'scheduleStatus': 'collector and resolver implemented; no recurring job or future collection execution is claimed',
        'rows': rows,
    }


def resolve(cohort, future, receipt):
    opens = dt.datetime.fromisoformat(cohort['resolutionWindow']['opensAt'])
    closes = dt.datetime.fromisoformat(cohort['resolutionWindow']['closesAt'])
    captured_from = dt.datetime.fromisoformat(receipt['capturedFrom'])
    captured_through = dt.datetime.fromisoformat(receipt['capturedThrough'])
    assert captured_from <= captured_through, 'Invalid capture interval'
    assert captured_from >= opens, 'Too early for resolution'
    assert captured_through <= closes, 'Outside resolution window'
    results = []
    for row in cohort['rows']:
        observed = future.get(row['id'])
        outputs = dict.fromkeys(row['targetIds'])
        if observed:
            if observed.get('status') in ['Closed', 'Active', 'Dropped', 'Pipeline']:
                outputs['status-closed-at-checkpoint'] = observed['status'] == 'Closed'
            try:
                prior = dt.date.fromisoformat(row['baseline']['closingDate'])
                next_date = dt.date.fromisoformat(observed['closingdate'])
                outputs['later-closing-date-at-checkpoint'] = next_date > prior
            except (ValueError, TypeError, KeyError):
                pass
            prior_amount = row['baseline']['currentCommitmentUSD']
            next_amount = number(observed.get('curr_total_commitment'))
            if prior_amount is not None and next_amount is not None:
                outputs['larger-commitment-at-checkpoint'] = next_amount > prior_amount
        results.append({'id': row['id'], 'outcomes': outputs, 'outcomeObservedAt': receipt['capturedThrough'],
                        'resolutionStatus': 'observed' if all(v is not None for v in outputs.values()) else 'partial-or-unknown'})
    return {'schemaVersion': 1, 'baselineSha256': digest(COHORT.read_bytes()),
            'resolutionCapturedAt': receipt['capturedThrough'],
            'selectionAuditStatus': 'requires-independent-first-eligible-capture-review',
            'selectionLimitation': 'Local receipt validation cannot prove that an earlier eligible capture was not omitted; a reviewer must audit the complete collection log before scoring.',
            'rows': results}


def build_ui_summary(cohort, receipt):
    return {
        'schemaVersion': 1,
        'id': 'worldbank-india-prospective-20261008',
        'title': 'World Bank India: prospective institutional metadata cohort',
        'asOf': cohort['registeredAt'][:10],
        'retrievedAt': receipt['capturedThrough'],
        'firstAvailableAt': receipt['capturedThrough'],
        'counts': {'officialApiProjects': cohort['population']['apiProjects'],
                   'eligibleActiveProjects': len(cohort['rows']), 'targets': len(cohort['rows']) * 3,
                   'resolvedTargets': 0, 'numericProbabilities': 0},
        'forecastStatus': cohort['forecastStatus'],
        'baselineSha256': digest(COHORT.read_bytes()),
        'resolutionWindow': cohort['resolutionWindow'],
        'targetDefinitions': cohort['targets'],
        'variableDefinitions': [
            {'id': 'status', 'label': 'Recorded project status', 'kind': 'category',
             'interpretation': 'API status, not independently verified physical completion.'},
            {'id': 'closingDate', 'label': 'Recorded closing date', 'kind': 'date',
             'interpretation': 'Current metadata date; original approval baseline is not established.'},
            {'id': 'currentCommitmentUSD', 'label': 'Current total commitment', 'kind': 'money', 'currency': 'USD',
             'interpretation': 'Commitment metadata, not disbursed cash, loss or traced payment.'},
        ],
        'limits': [cohort['missingness'],
                   'No historical corruption classifier or calibrated probability is available.',
                   cohort['scheduleStatus']],
        'source': {'publisher': 'World Bank', 'indexUrl': API.format(offset=0),
                   'receiptPath': cohort['baselineReceipt'], 'cohortPath': str(COHORT.relative_to(ROOT)),
                   'auditPath': 'docs/research-radar/next-model/TEMPORAL-DATA-AUDIT.md',
                   'originalPages': len(receipt['pages']), 'verifiedUniqueProjects': receipt['total']},
        'projects': [{'id': row['id'], 'name': row['projectName'], 'sourceUrl': row['sourceUrl'],
                      'borrower': row['borrower'], 'implementingAgency': row['implementingAgency'],
                      'variables': row['baseline'], 'firstAvailableAt': row['firstAvailableAt'],
                      'targets': [{'id': key, 'outcome': None, 'probability': None} for key in row['targetIds']]}
                     for row in cohort['rows']],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--capture-baseline', action='store_true')
    mode.add_argument('--verify', action='store_true')
    mode.add_argument('--export-summary', action='store_true', help='Build the compact UI view of the frozen baseline.')
    mode.add_argument('--capture-resolution', type=Path, metavar='NEW_DIRECTORY')
    mode.add_argument('--resolve', type=Path, metavar='RECEIPT_JSON')
    args = parser.parse_args()
    if args.capture_baseline:
        assert not COHORT.exists(), 'Baseline is frozen; never silently refresh it.'
        records, receipt = capture(OUT / 'worldbank-baseline')
        COHORT.write_text(json.dumps(build(records, receipt), indent=2, ensure_ascii=False) + '\n')
    elif args.export_summary:
        records, receipt = read_capture(OUT / 'worldbank-baseline/receipt.json')
        cohort = json.loads(COHORT.read_text())
        assert build(records, receipt) == cohort
        UI_SUMMARY.write_text(json.dumps(build_ui_summary(cohort, receipt), indent=2, ensure_ascii=False) + '\n')
    elif args.verify:
        records, receipt = read_capture(OUT / 'worldbank-baseline/receipt.json')
        cohort = json.loads(COHORT.read_text())
        assert build(records, receipt) == cohort, 'Cohort no longer matches frozen source bytes.'
        assert build_ui_summary(cohort, receipt) == json.loads(UI_SUMMARY.read_text()), 'UI summary no longer matches frozen cohort.'
        print(f'World Bank cohort verified: {len(build(records, receipt)["rows"])} active projects; all outcomes and probabilities unresolved.')
    elif args.capture_resolution:
        capture(args.capture_resolution.resolve())
    else:
        records, receipt = read_capture(args.resolve)
        result = resolve(json.loads(COHORT.read_text()), records, receipt)
        target = OUT / 'prospective-worldbank-resolution.json'
        assert not target.exists(), 'Existing resolution requires explicit independent review before replacement.'
        target.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
        print(f'Wrote {target.relative_to(ROOT)}; no model performance is implied.')


if __name__ == '__main__':
    main()
