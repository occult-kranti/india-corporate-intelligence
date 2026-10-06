"""Hash retained audit evidence/results; never enumerate external raw databases."""
import hashlib
import json
import pathlib
import sys
ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parents[2]
output = ROOT / 'sha256-manifest.json'
files = [p for p in ROOT.rglob('*') if p.is_file() and p != output and '__pycache__' not in p.parts and p.suffix != '.pyc']
files.extend(REPO / p for p in [
    'docs/tender-investigation/SOURCE_AUDIT.md',
    'docs/tender-investigation/ANALYSIS_PANEL.md',
    'docs/tender-investigation/amount-lexemes.json',
    'docs/tender-investigation/round-two-check.json',
    'src/data/procurement-audit.json',
])
rows = [{'path': str(p.relative_to(REPO)), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(files)]
serialized = json.dumps(rows, indent=2) + '\n'
if '--check' in sys.argv:
    if not output.is_file() or output.read_text() != serialized:
        raise SystemExit('Retained audit manifest is stale; review changes before rebuilding')
else:
    output.write_text(serialized)
print(f'Verified manifest inventory: {len(rows)} retained files')
