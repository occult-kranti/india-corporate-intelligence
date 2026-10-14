#!/usr/bin/env python3
"""Run a pinned, local open-source discovery model without promoting claims."""
import argparse
import importlib.util
import json
from pathlib import Path

DEFAULT_INPUT = Path('research/money-trails/model-corpus.json')
DEFAULT_OUTPUT = Path('research/money-trails/model-suggestions.json')
QUERIES = {
    'invoice-subcontract-recipient': 'Public agency payment main contractor executed subcontract bank payment invoice GST recipient intermediate vendor actual delivery acceptance tax margins missing onward beneficiary',
    'judicial-assertion-versus-cash-proof': 'Court original judgment agency ECIR prosecution allegation witness statement contested bank narrative bail attachment final merits conviction acquittal defence rebuttal',
    'corporate-ownership-period': 'Company annual report CIN exact legal entity shareholder subsidiary ownership percentage equity class director beneficial owner historical reporting year perimeter',
    'public-debt-and-consumer-collections': 'Public lender PFC sanctioned loan drawn disbursement pending promoter equity unsecured loan AMISP smart meter direct debit escrow consumer receipts contract commitment',
    'cross-department-contractor': 'Same legally identified company police CCTV contractor water Jal Jeevan Mission electricity smart meter subsidiary port project credit rating financial disclosure',
    'political-donation-identity': 'Electoral bond purchaser redemption unique prefix serial denomination date party political donation contractor exact CIN identity missing funding origin contract timing no causal proof',
    'financial-reconciliation-overlap': 'Alleged proceeds retained cash bank flow overlapping subtotals equivalent value property attachment acquisition dates recovery audit total arithmetic contradiction',
    'official-role-personal-benefit-gap': 'Minister public office delegated approval procurement decision conflict of interest public role does not establish personal receipt named intermediary transaction evidence gap',
    'counterevidence-and-later-outcome': 'Later tribunal appeal bail rejection salary defence proceeds property joint ownership wife excluded equivalent value attachment court narrows earlier accusation',
    'disproof-document-next-hop': 'Signed work order acceptance certificate supplier ledger bank exhibit recovery voucher audited related party disclosure missing document institution holder lawful alternative falsifier',
}


def model_engine():
    path = Path(__file__).resolve().parents[1] / 'education/model-rank.py'
    spec = importlib.util.spec_from_file_location('money_trails_discovery_core', path)
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    engine.QUERIES = dict(QUERIES)
    # This registry-wide review intentionally exceeds the older education
    # workflow's 2,000-summary bound. Preserve every original row validation by
    # validating bounded chunks, then check cross-chunk identities. Inference
    # already embeds in batches of 16; retained vectors stay small at this cap.
    read_bounded_corpus = engine.read_corpus

    def read_registry_corpus(path):
        raw = path.read_bytes()
        payload = json.loads(raw)
        documents = payload.get('documents') if isinstance(payload, dict) else None
        if not isinstance(documents, list) or not documents or len(documents) > 5000:
            raise ValueError('Registry review accepts 1 to 5,000 public source summaries')

        class CorpusChunk:
            def __init__(self, values):
                self.values = values

            def read_bytes(self):
                return json.dumps({'documents': self.values}).encode()

        for start in range(0, len(documents), 2000):
            read_bounded_corpus(CorpusChunk(documents[start:start + 2000]))
        if len({row['id'] for row in documents}) != len(documents):
            raise ValueError('Duplicate document identity across registry chunks')
        return documents, engine.sha256(raw)

    engine.read_corpus = read_registry_corpus
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
        if result.get('researchDomain') != 'money-trails':
            raise ValueError('Wrong discovery domain')
        print(f'Validated {len(documents)} summaries, {len(QUERIES)} discovery queries and exact pinned model/corpus.')
        return
    result = engine.rank(documents, digest, args.cache, args.offline)
    result['researchDomain'] = 'money-trails'
    result['limitation'] = 'Complete retained source-summary registry discovery only; this is not full-document or bank-ledger analysis. Similarity is not an identity bridge, probability of misconduct, actual money transfer, or proof of corruption. Every graph relationship is separately source-reviewed; no ranking is promoted automatically.'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.partial')
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(args.output)
    print(f'Executed {engine.MODEL_ID}@{engine.REVISION} locally over {len(documents)} summaries in {result["execution"]["inferenceSeconds"]} seconds.')


if __name__ == '__main__':
    main()
