"""Synthetic archive contracts. Does not start or contact a browser."""
import copy
import importlib.util
import json
import tempfile
import zipfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('har_validator', Path(__file__).with_name('validate-resource-har.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
row = {'request': {'method': 'GET', 'url': 'https://site/', 'headers': [], 'cookies': []}, 'response': {'status': 200, 'headers': [], 'cookies': [], 'content': {'size': 4, '_file': 'body.txt'}}, 'startedDateTime': '2026-10-16T00:00:00Z', 'time': 2, 'timings': {'send': 0, 'wait': 1, 'receive': 1}}
events = [{'type': 'request', 'id': 1, 'method': 'GET', 'url': 'https://site/'}, {'type': 'response', 'id': 1, 'method': 'GET', 'url': 'https://site/', 'status': 200}]
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory)
    def run(rows, observed, body=True, unsafe=False, terminal=True):
        with zipfile.ZipFile(path / 'evidence.zip', 'w') as archive:
            archive.writestr('har.har', json.dumps({'log': {'entries': rows}}))
            if body: archive.writestr('body.txt', b'test')
            if unsafe: archive.writestr('../escape', b'bad')
        observed = copy.deepcopy(observed)
        for item in observed: item.setdefault('id', 1)
        if terminal and not any(item['type'] == 'failed' for item in observed): observed.append({'type': 'finished', 'id': 1})
        (path / 'events.json').write_text(json.dumps({'events': observed}))
        return module.validate(path / 'evidence.zip', path / 'events.json')
    assert run([row], events)['responseBodies'] == 1
    failed = copy.deepcopy(row); failed['_failureText'] = 'net::ERR_FAILED'; failed['response']['status'] = 0; failed['response']['content'] = {'size': 0}
    assert run([failed], [events[0], {'type': 'failed', 'method': 'GET', 'url': 'https://site/'}])['failedRequests'] == 1
    mutations = [lambda: run([row], events, body=False), lambda: run([], events), lambda: run([row], events + [{'type': 'request', 'method': 'GET', 'url': 'https://missing/'}]), lambda: run([row], [events[0], {**events[1], 'status': 404}]), lambda: run([row], [events[0], {'type': 'failed', 'method': 'GET', 'url': 'https://site/'}]), lambda: run([{**row, 'timings': {}}], events), lambda: run([row], events, unsafe=True)]
    non200 = copy.deepcopy(row); non200['response']['status'] = 404; non200['response']['content'] = {'size': 4}
    post = copy.deepcopy(row); post['request']['postData'] = {'_file': 'missing-request.dat'}; post['request']['bodySize'] = 3
    pending = copy.deepcopy(row); pending['response']['status'] = -1; pending['response']['content'] = {'size': -1}; pending['time'] = -1
    wrong_size = copy.deepcopy(row); wrong_size['response']['content']['size'] = 9
    incomplete = copy.deepcopy(row); incomplete['response']['content'] = {'size': -1}; incomplete['timings']['receive'] = -1
    mutations.extend([lambda: run([row], events, terminal=False), lambda: run([incomplete], events), lambda: run([non200], [events[0], {**events[1], 'status': 404}]), lambda: run([post], events), lambda: run([pending], [events[0]]), lambda: run([wrong_size], events)])
    valid_post = copy.deepcopy(row); valid_post['request']['postData'] = {'_file': 'body.txt'}; valid_post['request']['bodySize'] = 4
    assert run([valid_post], events)['requestBodies'] == 1
    for mutate in mutations:
        try: mutate()
        except (AssertionError, KeyError): pass
        else: raise AssertionError('Corrupted HAR was accepted')
print('16 HAR fixture checks passed')
