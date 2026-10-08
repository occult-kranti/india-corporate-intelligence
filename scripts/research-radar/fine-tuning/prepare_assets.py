#!/usr/bin/env python3
"""Fetch immutable public model weights, verify every byte, never upload research."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

MODEL_ID = 'sentence-transformers/all-MiniLM-L6-v2'
REVISION = '1110a243fdf4706b3f48f1d95db1a4f5529b4d41'
DEFAULT_CACHE = Path('/workspace/.cache/icip-models') / REVISION
ASSETS = {
    'model.safetensors': '53aa51172d142c89d9012cce15ae4d6cc0ca6895895114379cacb4fab128d9db',
    'config.json': '953f9c0d463486b10a6871cc2fd59f223b2c70184f49815e7efbcab5d8908b41',
    'tokenizer.json': 'be50c3628f2bf5bb5e3a7f17b1f74611b2561a3a27eeab05e5aa30f411572037',
    'tokenizer_config.json': 'acb92769e8195aabd29b7b2137a9e6d6e25c476a4f15aa4355c233426c61576b',
    'special_tokens_map.json': '303df45a03609e4ead04bc3dc1536d0ab19b5358db685b6f3da123d05ec200e3',
    'README.md': 'dcd602d2fd35c203a247304a06fec6654a12f7941b739f9221a064fe8dc3b7f0',
}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def prepare(cache=DEFAULT_CACHE, offline=False):
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    records = []
    for name, expected in ASSETS.items():
        path = cache / name
        url = f'https://huggingface.co/{MODEL_ID}/resolve/{REVISION}/{name}'
        if not path.exists():
            if offline:
                raise ValueError(f'Missing offline model asset: {path}')
            temporary = path.with_suffix(path.suffix + '.partial')
            with urlopen(url, timeout=60) as response, temporary.open('wb') as target:
                while chunk := response.read(1024 * 1024):
                    target.write(chunk)
            if sha(temporary) != expected:
                temporary.unlink()
                raise ValueError(f'Downloaded asset hash mismatch: {name}')
            temporary.replace(path)
        if sha(path) != expected:
            raise ValueError(f'Cached asset hash mismatch: {name}')
        records.append({'filename': name, 'url': url, 'sha256': expected, 'bytes': path.stat().st_size})
    if (cache / 'model.safetensors').stat().st_size != 90_868_376:
        raise ValueError('Unexpected base weight length')
    return {'modelId': MODEL_ID, 'revision': REVISION, 'license': 'Apache-2.0', 'assets': records}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=DEFAULT_CACHE)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--manifest', type=Path, default=Path('research/research-radar/fine-tuning/base-assets.json'))
    args = parser.parse_args()
    result = prepare(args.cache, args.offline)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(result, indent=2) + '\n')
    print(f'Verified {len(result["assets"])} immutable base assets, including actual full-precision model bytes.')
