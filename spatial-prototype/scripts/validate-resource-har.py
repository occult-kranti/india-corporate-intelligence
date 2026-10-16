"""Validate standalone full HAR/body preservation, never a browser launcher."""
import collections
import json
import sys
import zipfile
from pathlib import PurePosixPath


def validate(archive_path, events_path):
    observed = json.load(open(events_path, encoding='utf-8'))['events']
    with zipfile.ZipFile(archive_path) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)), 'Duplicate HAR archive entries'
        assert all(not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts for name in names), 'Unsafe HAR archive path'
        assert archive.testzip() is None, 'HAR archive CRC failure'
        files = [name for name in names if name.endswith('.har')]
        assert len(files) == 1, 'Exactly one full HAR document is required'
        log = json.loads(archive.read(files[0]))['log']
        entries = log['entries']
        assert entries, 'Network evidence is empty'
        counts = collections.Counter((row['request']['method'], row['request']['url']) for row in entries)
        expected = collections.Counter((row['method'], row['url']) for row in observed if row['type'] == 'request')
        assert not expected - counts, f'HAR omitted observed requests: {expected - counts}'
        responses = collections.Counter((row['request']['method'], row['request']['url'], row['response']['status']) for row in entries)
        expected_responses = collections.Counter((row['method'], row['url'], row['status']) for row in observed if row['type'] == 'response')
        assert not expected_responses - responses, 'HAR omitted observed response status'
        failures = collections.Counter((row['request']['method'], row['request']['url']) for row in entries if row.get('_failureText') or row.get('response', {}).get('_failureText'))
        expected_failures = collections.Counter((row['method'], row['url']) for row in observed if row['type'] == 'failed')
        assert not expected_failures - failures, 'HAR omitted observed request failure details'
        request_ids = {row['id'] for row in observed if row['type'] == 'request'}
        terminal_ids = collections.Counter(row['id'] for row in observed if row['type'] in ('finished', 'failed'))
        assert all(terminal_ids[identifier] == 1 for identifier in request_ids), 'Observed request is pending or has ambiguous terminal outcome'
        assert not set(terminal_ids) - request_ids, 'Terminal request identity is uncorrelated'
        response_references, request_references = set(), set()
        for row in entries:
            failure = row.get('_failureText') or row.get('response', {}).get('_failureText')
            assert row['response']['status'] >= 100 or failure, 'Pending/incomplete HAR request lacks an explicit failure outcome'
            assert isinstance(row['startedDateTime'], str) and isinstance(row['time'], (int, float)), 'Missing full timing metadata'
            assert all(key in row['timings'] for key in ['send', 'wait', 'receive']), 'Missing HAR phase timing'
            for field in ['request', 'response']:
                assert isinstance(row[field]['headers'], list), 'Missing headers'
                assert isinstance(row[field]['cookies'], list), 'Missing full cookie field'
            content = row['response']['content']
            if not failure:
                assert row['timings']['receive'] >= 0 and content.get('size', -1) >= 0, 'Response headers arrived but response body/timing is incomplete'
            reference = content.get('_file')
            if reference:
                assert reference in names, f'Missing attached response body {reference}'
                archive.read(reference)  # CRC validation, including binary bodies.
                response_references.add(reference)
            content_length = next((int(header['value']) for header in row['response']['headers'] if header['name'].lower() == 'content-length' and header['value'].isdigit()), 0)
            has_body = content.get('size', 0) > 0 or row['response'].get('bodySize', 0) > 0 or content_length > 0
            if has_body and row['request']['method'] != 'HEAD' and row['response']['status'] not in (204, 304):
                assert reference or bool(content.get('text')), 'Nonempty response lost its body'
            if reference and content.get('size', -1) >= 0:
                assert len(archive.read(reference)) == content['size'], 'Response body length differs from retained HAR content size'
            post = row['request'].get('postData', {})
            request_reference = post.get('_file')
            if request_reference:
                assert request_reference in names, f'Missing attached request body {request_reference}'
                archive.read(request_reference)
                request_references.add(request_reference)
            if row['request'].get('bodySize', 0) > 0:
                assert request_reference or bool(post.get('text')), 'Nonempty request lost its body'
            if request_reference and row['request'].get('bodySize', -1) >= 0:
                assert len(archive.read(request_reference)) == row['request']['bodySize'], 'Request body length differs from retained HAR request size'
        return {'status': 'passed', 'entries': len(entries), 'observedRequests': sum(expected.values()), 'responseBodies': len(response_references), 'requestBodies': len(request_references), 'failedRequests': sum(failures.values()), 'mode': 'full', 'content': 'attach', 'limitations': 'Separate HAR timing/frame linkage is not the Trace Viewer network recording.'}


if __name__ == '__main__':
    print(json.dumps(validate(sys.argv[1], sys.argv[2]), sort_keys=True))
