#!/usr/bin/env python3
"""Execute a pinned open-source model over cross-sector source summaries."""
import argparse
import importlib.util
import json
from pathlib import Path

DEFAULT_INPUT = Path('research/allegations-map/model-corpus.json')
DEFAULT_OUTPUT = Path('research/allegations-map/model-suggestions.json')
QUERIES = {
    'attributed-claim-and-response': 'Attributed allegation regulator complaint police prosecution company respondent court bail response defense rebuttal current procedural status no conviction',
    'public-invoice-to-beneficiary': 'Public purchaser contractor institution staffing invoice claim scholarship beneficiary verification false entries disbursement exact legal recipient payment source',
    'regulatory-recovery-versus-payment': 'Investor collection principal refunds actual cash disbursed eligible claim recovery bank deficiency asset auction court appointed committee financial stage',
    'judicial-limits-and-outcomes': 'Court judicial reasoning interim bail non coercive protection injunction investigation debarment set aside material responses limited merits no universal exoneration',
    'ownership-versus-wrongdoing': 'Land sale deed society trust authorized signatory property buyer later resale consideration knowing participation ownership association does not prove criminal guilt',
    'challenge-unsupported-negative': 'Editorial correction unsupported claim withdrawn non exhaustive selected top donors table absence does not disprove contribution exact source limitations no automatic factual promotion',
    'exact-identity-connection': 'Exact legal company institution cohort identifier connected retained sources no fuzzy name alias address merge public context unknown location',
    'financial-stage-control': 'Alleged diversion collected principal invoice commitment asset attachment valuation refund recovery cash amount distinct currency unit period accounting stage',
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
        if result.get('researchDomain') != 'allegations-map':
            raise ValueError('Wrong discovery corpus domain')
        print(f'Validated {len(documents)} source summaries, {len(QUERIES)} discovery queries, model revision and corpus hash.')
        return
    result = engine.rank(documents, digest, args.cache, args.offline)
    result['researchDomain'] = 'allegations-map'
    result['limitation'] = 'Cosine similarity ranks retained researcher-authored summaries for unverified research discovery only. It is not a verified fact, an identity crosswalk, a probability of wrongdoing, a causal inference or a claim that all NSE companies were analysed. No generated relationship is promoted to the graph.'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.partial')
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(args.output)
    print(f'Executed {engine.MODEL_ID}@{engine.REVISION} locally over {len(documents)} summaries; {result["execution"]["inferenceSeconds"]} seconds.')


if __name__ == '__main__':
    main()
