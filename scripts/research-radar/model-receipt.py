#!/usr/bin/env python3
"""Write a hash-bound receipt only after an executed artifact validates."""
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location('research_radar_model', Path(__file__).with_name('model-rank.py'))
wrapper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wrapper)
engine = wrapper.model_engine()
documents, digest = engine.read_corpus(wrapper.DEFAULT_INPUT)
result = json.loads(wrapper.DEFAULT_OUTPUT.read_text())
corpus = json.loads(wrapper.DEFAULT_INPUT.read_text())
engine.validate_result(result, documents, digest)
if result.get('researchDomain') != 'research-radar':
    raise ValueError('Wrong discovery domain')
for item in corpus['sourceRegistries']:
    if hashlib.sha256(Path(item['path']).read_bytes()).hexdigest() != item['sha256']:
        raise ValueError('Regional source catalog changed after execution')
receipt = {
    'recordedAt': datetime.now(timezone.utc).isoformat(),
    'command': '/tmp/india-education-model-env/bin/python scripts/research-radar/model-rank.py --offline',
    'input': str(wrapper.DEFAULT_INPUT), 'inputSha256': digest,
    'output': str(wrapper.DEFAULT_OUTPUT),
    'outputSha256': hashlib.sha256(wrapper.DEFAULT_OUTPUT.read_bytes()).hexdigest(),
    'sourceRegistries': corpus['sourceRegistries'],
    'documentCount': len(documents), 'sourceSummaryCount': corpus['sourceSummaryCount'],
    'caseSummaryCount': corpus['caseSummaryCount'], 'uniqueCitationUrls': corpus['uniqueCitationUrls'],
    'queryCount': len(wrapper.QUERIES), 'model': result['model'], 'execution': result['execution'],
    'limitation': result['limitation'],
    'meaning': 'This receipt records executed source discovery only. Model-output review and source validation remain separate.',
}
output = Path('research/research-radar/model-execution-receipt.json')
if '--verify' in sys.argv:
    retained = json.loads(output.read_text())
    recorded_at = retained.pop('recordedAt', None)
    if not recorded_at:
        raise ValueError('Receipt lacks recording timestamp')
    datetime.fromisoformat(recorded_at)
    receipt.pop('recordedAt')
    if retained != receipt:
        raise ValueError('Execution receipt differs from the current model, output or input hashes')
    print(f'Verified executed model receipt for {len(documents)} summaries and all four catalogs.')
else:
    output.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote executed model receipt for {len(documents)} summaries.')
