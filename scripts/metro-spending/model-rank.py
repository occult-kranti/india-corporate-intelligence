#!/usr/bin/env python3
"""Run a pinned, local open-source discovery model without promoting claims."""
import argparse
import importlib.util
import json
from pathlib import Path

DEFAULT_INPUT = Path('research/metro-spending/model-corpus.json')
DEFAULT_OUTPUT = Path('research/metro-spending/model-suggestions.json')
QUERIES = {
    'delhi-police-procurement': 'Delhi Police procurement public tender CCTV radio communications app nomination single bidder audit PAC government response contract payments',
    'mumbai-police-financing': 'Mumbai Maharashtra police housing surveillance coastal procurement government resolution budget borrowing guarantee contract ceiling accepted bid',
    'defence-border-expenditure': 'Ministry Defence Home Affairs border road construction navy shipbuilding public budget audit expenditure contractor delays recovery response',
    'city-versus-national-scope': 'National ministry headquarters Delhi Mumbai company headquarters city association versus project site Maharashtra statewide allocation not city expenditure',
    'notice-award-payment-separation': 'Original tender notice corrigendum bid award contract signed supplier invoice actual disbursement payment distinct stages exact identifier',
    'audit-claim-and-later-outcome': 'Audit observation management reply PAC follow up allegation court bail acquittal discharge set aside later outcome procedural status current date',
    'identity-and-money-direction': 'Exact legal institution company buyer supplier public agency identity cross reference ownership budget borrower creditor beneficiary money direction',
    'loss-recovery-and-financing': 'Appropriation budget estimate revised estimate actual expenditure questioned expenditure alleged loss recovery cash debt guarantee overlapping amount non additive',
}


def model_engine():
    path = Path(__file__).resolve().parents[1] / 'education/model-rank.py'
    spec = importlib.util.spec_from_file_location('metro_discovery_core', path)
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    engine.QUERIES = dict(QUERIES)
    return engine


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=DEFAULT_INPUT)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--cache', type=Path, default=Path('/tmp/india-education-model-cache'))
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    engine = model_engine()
    documents, digest = engine.read_corpus(args.input)
    if args.verify:
        result = json.loads(args.output.read_text())
        engine.validate_result(result, documents, digest)
        if result.get('researchDomain') != 'metro-spending':
            raise ValueError('Wrong discovery domain')
        print(f'Validated {len(documents)} summaries, {len(QUERIES)} discovery queries and exact pinned model/corpus.')
        return
    result = engine.rank(documents, digest, args.cache, args.offline)
    result['researchDomain'] = 'metro-spending'
    result['limitation'] = 'Public authored-summary discovery only. Similarity is not an identity bridge, probability of misconduct, actual money transfer, or proof of corruption. Every graph relationship is separately source-reviewed; no ranking is promoted automatically.'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.partial')
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(args.output)
    print(f'Executed {engine.MODEL_ID}@{engine.REVISION} locally over {len(documents)} summaries in {result["execution"]["inferenceSeconds"]} seconds.')


if __name__ == '__main__':
    main()
