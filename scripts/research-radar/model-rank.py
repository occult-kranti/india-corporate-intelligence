#!/usr/bin/env python3
"""Run pinned local embeddings for source discovery; never predict personal guilt."""
import argparse
import importlib.util
import json
from pathlib import Path

DEFAULT_INPUT = Path('research/research-radar/model-corpus.json')
DEFAULT_OUTPUT = Path('research/research-radar/model-suggestions.json')
QUERIES = {
    'procurement-to-delivery': 'Public procurement contract tender bid comparison award amendments extensions executed work acceptance delivery performance failure payment certification independent audit',
    'debt-subsidy-and-cash': 'Public loans lending guarantees sanctioned debt actual disbursement drawdown subsidy welfare budget allocation release beneficiary payment reconciliation outstanding recovery',
    'corporate-identity-ownership': 'Exact legal company name CIN director historical shareholder beneficial ownership subsidiary annual report stock exchange disclosure identity evidence unresolved name match',
    'oversight-versus-personal-benefit': 'Minister public office appointment delegated power oversight approval conflict of interest no evidence personal receipt bank payment intermediary transaction missing proof',
    'latest-outcome-and-rebuttal': 'Latest court judgment appeal bail acquittal discharge reversal agency allegation denial audit response counterevidence legal outcome narrows earlier report',
    'water-energy-resources': 'Water supply groundwater pollution electricity energy power natural resources mining public concession ownership contract financing environmental clearance independent regulator project progress',
    'defence-police-arms': 'Defence procurement military arms deal foreign supplier police border equipment budget appropriation contract approval offsets tender delivery audit no operational secret information',
    'foreign-capital-tax-route': 'Foreign investment international lender public loan World Bank tax exemption guarantee corporate cross border financing official audited financial flow legal ownership exact entity identity',
    'future-outcome-disproof': 'Measurable future institutional project outcome procurement republication contract delivery correction recovery final order alternative explanation falsifier observation horizon missing official record',
    'same-source-false-connection': 'Repeated agency press release same assertion family related reporting duplicate source unrelated similarly named entity shared city or ministry not proof of money relationship',
}


def model_engine():
    path = Path(__file__).resolve().parents[1] / 'education/model-rank.py'
    spec = importlib.util.spec_from_file_location('research_radar_discovery_core', path)
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    engine.QUERIES = dict(QUERIES)
    # This bounded new-release corpus stays within the original 2,000-document
    # guard. All source, citation, identity and asset-integrity checks are reused.
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
        if result.get('researchDomain') != 'research-radar':
            raise ValueError('Wrong discovery domain')
        print(f'Validated {len(documents)} summaries, {len(QUERIES)} queries and exact pinned model/corpus.')
        return
    result = engine.rank(documents, digest, args.cache, args.offline)
    result['researchDomain'] = 'research-radar'
    result['limitation'] = ('Ranks the authored public source and case summaries retained in this release only. '
        'Source and case summaries can describe the same underlying assertion and are not independent observations. '
        'This is not full-document, bank-ledger, national-population or prospective accuracy analysis. '
        'Similarity is not a connection, probability, factual verification, or prediction of wrongdoing. '
        'No result is automatically added as a graph edge or promoted to a claim.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.partial')
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    temporary.replace(args.output)
    print(f'Executed {engine.MODEL_ID}@{engine.REVISION} locally over {len(documents)} summaries in {result["execution"]["inferenceSeconds"]} seconds.')


if __name__ == '__main__':
    main()
