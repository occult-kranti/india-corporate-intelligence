"""Prespecified, dependency-free promotion decision for the frozen retrieval pilot."""
NONREGRESSION = ('mrrAt10', 'recallAt5', 'familyNdcgAt5', 'familyRecallAt5',
                 'counterevidenceRecallAt5', 'hardNegativePreference')


def promotion_decision(systems):
    candidate = systems['candidate']['metrics']
    base = systems['base_fp32']['metrics']
    quantized = systems['base_onnx_uint8']['metrics']
    lexical = systems['bm25']['metrics']
    score = candidate['caseMacro']
    strongest = max(base['caseMacro']['ndcgAt5'], quantized['caseMacro']['ndcgAt5'])
    criteria = [
        {'name': 'case-macro nDCG@5 gain over strongest neural baseline',
         'observed': score['ndcgAt5'] - strongest, 'minimum': .02},
        {'name': 'case-macro nDCG@5 difference from BM25',
         'observed': score['ndcgAt5'] - lexical['caseMacro']['ndcgAt5'], 'minimum': -.01},
    ]
    for metric in NONREGRESSION:
        values = [base['caseMacro'][metric], quantized['caseMacro'][metric], score[metric]]
        criteria.append({'name': f'{metric} difference from strongest neural baseline',
                         'observed': None if any(v is None for v in values) else values[2] - max(values[:2]),
                         'minimum': -.01})
    base_cases = {row['caseId']: row['metrics']['ndcgAt5'] for row in base['perCase']}
    differences = {row['caseId']: row['metrics']['ndcgAt5'] - base_cases[row['caseId']]
                   for row in candidate['perCase']}
    criteria.extend([
        {'name': 'held-out cases with positive nDCG@5 change',
         'observed': sum(value > 1e-12 for value in differences.values()), 'minimum': 3},
        {'name': 'worst case nDCG@5 change', 'observed': min(differences.values()), 'minimum': -.05},
    ])
    for item in criteria:
        item['passed'] = item['observed'] is not None and item['observed'] + 1e-12 >= item['minimum']
    passed = all(item['passed'] for item in criteria) and len(differences) == 5
    return {'promoted': passed, 'status': 'promoted-retrieval-only' if passed else 'experimental-not-promoted',
            'criteria': criteria, 'perCaseNdcgChanges': differences,
            'defaultRetriever': 'candidate' if passed else 'base_onnx_uint8',
            'meaning': 'Gate for source-retrieval convenience only; never graph verification or probability calibration.'}
