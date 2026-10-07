#!/usr/bin/env python3
"""Execute a pinned open-source model over cross-sector source summaries."""
import argparse
import importlib.util
import json
from pathlib import Path

DEFAULT_INPUT = Path('research/deep-investigation/model-corpus.json')
DEFAULT_OUTPUT = Path('research/deep-investigation/model-suggestions.json')
QUERIES = {
    'public-contract-to-owner': 'Indian government concession tender award project company subsidiary promoter ownership funding debt lender capital recycling monetisation financial close payment',
    'loan-recovery-versus-loss': 'Loan lending debt default corporate insolvency recovery approved settlement debt assumed write off public treasury cash proceeds distinct stage',
    'hospital-public-payment': 'Hospital medical insurance PMJAY public payment claim reimbursement false claims patient deaths audit investigation response prosecution outcome',
    'school-charity-csr': 'Schools meals NGO charity corporate social responsibility donations public grant school delivery annual financial statement audit government response',
    'startup-money-trail': 'Startup unicorn overseas loan subsidiary lender transfer insolvency settlement court judgment company respondent denial final outcome',
    'challenge-the-allegation': 'Counter evidence company denial exculpatory court decision audit reply innocent explanation allegation not established attribution factual correction',
    'missing-connection-proof': 'Exact legal identity ISIN CIN project identifier contract number beneficiary parent subsidiary public funding link avoid inference from shared names geography political donation',
}


def model_engine():
    path = Path(__file__).resolve().parents[1] / 'education/model-rank.py'
    spec = importlib.util.spec_from_file_location('deep_discovery_model_core', path)
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
        if result.get('researchDomain') != 'deep-follow-the-money':
            raise ValueError('Wrong discovery corpus domain')
        print(f'Validated {len(documents)} source summaries, {len(QUERIES)} discovery queries, model revision and corpus hash.')
        return
    result = engine.rank(documents, digest, args.cache, args.offline)
    result['researchDomain'] = 'deep-follow-the-money'
    result['limitation'] = 'Cosine similarity ranks retained researcher-authored summaries for unverified research discovery only. It is not a verified fact, an identity crosswalk, a probability of wrongdoing, a causal inference or a claim that all NSE companies were analysed. No generated relationship is promoted to the graph.'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.partial')
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(args.output)
    print(f'Executed {engine.MODEL_ID}@{engine.REVISION} locally over {len(documents)} summaries; {result["execution"]["inferenceSeconds"]} seconds.')


if __name__ == '__main__':
    main()
