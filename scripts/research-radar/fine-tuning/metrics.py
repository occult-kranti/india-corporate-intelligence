"""Dependency-free, independently authored retrieval evaluation.

These are relevance-ranking measurements on authored labels, never probabilities
of wrongdoing. Every candidate is ranked, so metric cutoffs cannot hide omitted
negatives. Family collapse measures recovery of an assertion lineage rather than
pretending that repeated reports are independent positive observations.
"""
import math
from collections import defaultdict


METRIC_NAMES = (
    'ndcgAt5', 'mrrAt10', 'recallAt5', 'familyNdcgAt5',
    'familyRecallAt5', 'hardNegativePreference', 'counterevidenceRecallAt5',
)


def _mean(values):
    observed = [value for value in values if value is not None]
    return sum(observed) / len(observed) if observed else None


def _dcg(grades, cutoff=5):
    return sum((2 ** grade - 1) / math.log2(rank + 2)
               for rank, grade in enumerate(grades[:cutoff]))


def _ndcg(ranking, relevance, cutoff=5):
    ideal = _dcg(sorted(relevance.values(), reverse=True), cutoff)
    if ideal <= 0:
        raise ValueError('NDCG requires at least one positive relevance label')
    return _dcg([relevance.get(item, 0) for item in ranking], cutoff) / ideal


def _unique_ids(rows, kind):
    ids = [row.get('id') for row in rows]
    if any(not isinstance(item, str) or not item for item in ids):
        raise ValueError(f'{kind} IDs must be nonempty strings')
    if len(ids) != len(set(ids)):
        raise ValueError(f'Duplicate {kind} ID')
    return ids


def _id_list(query, key, candidate_ids):
    values = query.get(key, [])
    if not isinstance(values, list) or len(values) != len(set(values)):
        raise ValueError(f'{query["id"]}: {key} must be a unique ID list')
    if not set(values) <= candidate_ids:
        raise ValueError(f'{query["id"]}: {key} refers to unknown documents')
    return values


def evaluate_rankings(queries, documents, rankings):
    """Evaluate complete doc-ID rankings for a labeled query subset.

    Query schema: id, caseId, relevance={docId: 0|1|2}, positiveIds,
    hardNegativeIds, and optional requiredCounterevidenceIds. A missing explicit
    relevance map falls back to binary positiveIds for development queries.
    Document schema: id and family. Rankings map each query ID to all candidate
    document IDs exactly once. Hard-negative preference compares the highest
    ranked positive with each explicitly labeled hard negative, then averages.
    Counterevidence recall uses its explicit required-document denominator; when
    absent, queries with counterevidence=true use all their positive labels.
    Undefined subset metrics are None and never silently treated as zero.
    """
    if not queries or not documents:
        raise ValueError('Evaluation requires nonempty queries and documents')
    query_ids = _unique_ids(queries, 'query')
    document_ids = _unique_ids(documents, 'document')
    candidate_ids = set(document_ids)
    if set(rankings) != set(query_ids):
        raise ValueError('Rankings must cover exactly the evaluated query IDs')
    family_by_id = {}
    for document in documents:
        family = document.get('family')
        if not isinstance(family, str) or not family.strip():
            raise ValueError('Every candidate needs an explicit source family')
        family_by_id[document['id']] = family

    per_query = []
    for query in queries:
        query_id = query['id']
        case_id = query.get('caseId')
        if not isinstance(case_id, str) or not case_id:
            raise ValueError(f'{query_id}: missing caseId')
        ranking = rankings[query_id]
        if (not isinstance(ranking, list) or len(ranking) != len(document_ids)
                or len(set(ranking)) != len(ranking)
                or set(ranking) != candidate_ids):
            raise ValueError(f'{query_id}: ranking must contain every candidate exactly once')
        positive_ids = _id_list(query, 'positiveIds', candidate_ids)
        relevance = query.get('relevance', {item: 1 for item in positive_ids})
        if not isinstance(relevance, dict) or not set(relevance) <= candidate_ids:
            raise ValueError(f'{query_id}: relevance must reference candidate documents')
        if any(type(grade) is not int or grade not in (0, 1, 2)
               for grade in relevance.values()):
            raise ValueError(f'{query_id}: relevance grades must be integers 0, 1 or 2')
        positives = {item for item, grade in relevance.items() if grade > 0}
        if not positives or set(positive_ids) != positives:
            raise ValueError(f'{query_id}: positiveIds must exactly match positive relevance')
        hard_negatives = _id_list(query, 'hardNegativeIds', candidate_ids)
        if positives.intersection(hard_negatives):
            raise ValueError(f'{query_id}: a positive cannot be a hard negative')
        counter_ids = _id_list(query, 'requiredCounterevidenceIds', candidate_ids)
        if not set(counter_ids) <= positives:
            raise ValueError(f'{query_id}: required counterevidence must have positive relevance')
        if type(query.get('counterevidence', False)) is not bool:
            raise ValueError(f'{query_id}: counterevidence must be an explicit boolean')
        if not counter_ids and query.get('counterevidence', False):
            counter_ids = sorted(positives)

        positions = {item: rank for rank, item in enumerate(ranking, 1)}
        first_positive_rank = min(positions[item] for item in positives)
        top_five = set(ranking[:5])
        family_relevance = {}
        # Broad assertion-family coverage can credit an older sibling of a
        # positively labeled final order. It is not version/status correctness;
        # document-level grades and hard negatives measure that separately.
        for item, grade in relevance.items():
            family = family_by_id[item]
            family_relevance[family] = max(grade, family_relevance.get(family, 0))
        positive_families = {family for family, grade in family_relevance.items() if grade > 0}
        family_ranking = list(dict.fromkeys(family_by_id[item] for item in ranking))
        metrics = {
            'ndcgAt5': _ndcg(ranking, relevance),
            'mrrAt10': 1 / first_positive_rank if first_positive_rank <= 10 else 0.0,
            'recallAt5': len(positives.intersection(top_five)) / len(positives),
            'familyNdcgAt5': _ndcg(family_ranking, family_relevance),
            'familyRecallAt5': len(positive_families.intersection(family_ranking[:5])) / len(positive_families),
            'hardNegativePreference': _mean([
                float(first_positive_rank < positions[item]) for item in hard_negatives]),
            'counterevidenceRecallAt5': (len(set(counter_ids).intersection(top_five)) / len(counter_ids)
                                         if counter_ids else None),
        }
        per_query.append({
            'queryId': query_id, 'caseId': case_id, 'metrics': metrics,
            'positiveCount': len(positives), 'positiveFamilyCount': len(positive_families),
            'hardNegativeCount': len(hard_negatives), 'counterevidenceCount': len(counter_ids),
            'counterevidenceQuery': bool(counter_ids),
        })

    grouped = defaultdict(list)
    for row in per_query:
        grouped[row['caseId']].append(row)
    per_case = [{
        'caseId': case_id, 'queryCount': len(rows),
        'metrics': {name: _mean([row['metrics'][name] for row in rows]) for name in METRIC_NAMES},
    } for case_id, rows in sorted(grouped.items())]
    return {
        'queryCount': len(queries), 'documentCount': len(documents), 'caseCount': len(grouped),
        'macro': {name: _mean([row['metrics'][name] for row in per_query]) for name in METRIC_NAMES},
        'caseMacro': {name: _mean([row['metrics'][name] for row in per_case]) for name in METRIC_NAMES},
        'perQuery': per_query, 'perCase': per_case,
    }
