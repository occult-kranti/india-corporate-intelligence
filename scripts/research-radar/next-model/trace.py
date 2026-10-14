#!/usr/bin/env python3
"""Deterministic, source-closed evidence navigation. This does not infer cash flow."""
from __future__ import annotations
import argparse
from collections import deque
from copy import deepcopy
from datetime import date, datetime
import hashlib
import json
import re
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_GRAPH = ROOT / 'research/research-radar/next-model/graph-data.json'
EXCLUDED_NAMESPACES = {'legacy', 'crosswalk'}
# These may be displayed with provenance, but never advance a path as a causal hop.
CONTEXT_ONLY_KINDS = {'identity-crosswalk', 'response', 'contra', 'comparison',
    'supersede', 'supersedes', 'analytic', 'analytic-review', 'distinguishes-decision',
    'court-recorded-response', 'audit-response', 'statistical-record',
    'statistical-reporting', 'dataset-provenance', 'documented-context',
    'budget-context', 'procurement-context', 'bid-context', 'reported-role-context',
    'funding-context', 'project-context', 'maintenance-context', 'supply-context',
    'guarantee-context', 'policy-context', 'procurement-financing-context'}
INTERPRETATION = ('Exact authored relationships only. Navigation paths preserve original arrows and '
    'do not imply causation, a continuous payment chain, beneficiary allocation, guilt or probability. '
    'An absent link is unknown in this corpus. Amounts are not added across records or stages.')


def canonical_sha(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'),
                                   ensure_ascii=False).encode()).hexdigest()


def unique_index(rows, name):
    result = {}
    for row in rows:
        if not isinstance(row.get('id'), str) or row['id'] in result:
            raise ValueError(f'{name}: missing or duplicate exact ID {row.get("id")}')
        result[row['id']] = row
    return result


def referenced_sources(row):
    return set(row.get('sourceIds', [])) | {s for g in row.get('geography', [])
                                          for s in g.get('sourceIds', [])}


def validate_graph(graph):
    """Fail closed on dangling citations/endpoints/records; never quietly drop evidence."""
    indexes = {key: unique_index(graph.get(key, []), key)
               for key in ('sources', 'entities', 'relationships', 'records')}
    errors = []
    for key in ('entities', 'relationships', 'records'):
        for row in indexes[key].values():
            missing = referenced_sources(row) - indexes['sources'].keys()
            if missing:
                errors.append(f'{row["id"]}: missing sources {sorted(missing)}')
            if key == 'relationships':
                if not row.get('sourceIds'):
                    errors.append(f'{row["id"]}: relationship lacks evidence source')
                for endpoint in ('from', 'to'):
                    if row.get(endpoint) not in indexes['entities']:
                        errors.append(f'{row["id"]}: missing {endpoint} {row.get(endpoint)}')
                for target in row.get('recordIds', []) + row.get('responseIds', []):
                    if target not in indexes['records']:
                        errors.append(f'{row["id"]}: missing record/response {target}')
            if key == 'records':
                for field, target in [('entityIds', 'entities'), ('relationshipIds', 'relationships')]:
                    for ident in row.get(field, []):
                        if ident not in indexes[target]:
                            errors.append(f'{row["id"]}: missing {field} {ident}')
    if errors:
        raise ValueError('\n'.join(errors[:50]))
    return indexes


def live_registry():
    program = "import {loadInvestigation} from './scripts/investigation/load.mjs';console.log(JSON.stringify((await loadInvestigation()).INVESTIGATION_REGISTRY));"
    result = subprocess.run(['node', '--input-type=module', '-e', program],
                            cwd=ROOT, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def build_artifact(registry):
    """Browser-ready canonical subset, with exact copies of retained assertion objects."""
    # All original rows remain in the full input registry. Exclusions are explicit.
    sources = [r for r in registry['sources'] if r['namespace'] not in EXCLUDED_NAMESPACES]
    source_ids = {r['id'] for r in sources}
    entities = [r for r in registry['entities'] if r['namespace'] not in EXCLUDED_NAMESPACES]
    entity_ids = {r['id'] for r in entities}
    edges = [r for r in registry['relationships'] if r['namespace'] not in EXCLUDED_NAMESPACES]
    edge_ids = {r['id'] for r in edges}
    records, excluded = [], []
    for row in registry['records']:
        if row['namespace'] in EXCLUDED_NAMESPACES:
            continue
        missing = sorted((referenced_sources(row) - source_ids) |
                         (set(row.get('entityIds', [])) - entity_ids) |
                         (set(row.get('relationshipIds', [])) - edge_ids))
        if missing:
            excluded.append({'id': row['id'], 'reason': 'depends-on-out-of-scope-legacy-or-crosswalk',
                             'unavailableIds': missing})
        else:
            records.append(row)
    # Explicit authored acquisition questions are indexed by their existing exact edges/records.
    followups = []
    input_hashes = {}
    for file in sorted((ROOT / 'research/raw/money-trails').rglob('trails.json')):
        value = json.loads(file.read_text())
        input_hashes[str(file.relative_to(ROOT))] = hashlib.sha256(file.read_bytes()).hexdigest()
        for hop in value['hops']:
            if hop.get('missingNextDocument'):
                followups.append({
                    'id': hop['id'], 'question': hop['missingNextDocument'],
                    'neededRecord': hop['missingNextDocument'], 'holder': hop.get('documentHolder') or 'Not specified in retained record',
                    'whyCurrentEvidenceStops': hop['summary'],
                    'disconfirmationTest': '; '.join(hop.get('alternatives', [])) or 'Compare the acquired record with the retained assertion and response.',
                    'relationshipIds': hop.get('relationshipIds', []),
                    'recordIds': hop.get('recordIds', []), 'sourceIds': hop.get('sourceIds', []),
                    'counterEvidenceRecordIds': sorted(set(hop.get('responseRecordIds', []) + hop.get('counterEvidenceRecordIds', []))),
                    'flowState': hop.get('flowState'), 'financialStage': hop.get('financialStage'),
                    'limitations': hop.get('limitations', []), 'priorityBasis': 'authored-missing-record',
                })
    value = {'schemaVersion': 1, 'registryFingerprint': canonical_sha(registry),
             'updatedAt': registry['updatedAt'], 'scope': 'nonlegacy-noncrosswalk-source-closed',
             'sources': sources, 'entities': entities, 'relationships': edges, 'records': records,
             'held': [x for x in registry.get('held', []) if x['namespace'] not in EXCLUDED_NAMESPACES],
             'excludedRecords': excluded, 'followups': followups,
             'followupInputHashes': input_hashes,
             'contextOnlyKinds': sorted(CONTEXT_ONLY_KINDS),
             'methodology': [INTERPRETATION, 'Source-summary corpus, not independently reread original files.',
                'Coordinates are not invented. Entity geography retains the original association basis.',
                'Historical feature availability is not supplied by an event date or publication date alone.'],
             'fullRegistryCounts': {k: len(registry[k]) for k in ('sources', 'entities', 'relationships', 'records', 'held')}}
    validate_graph(value)
    recids = {r['id'] for r in records}
    for item in followups:
        if set(item['sourceIds']) - source_ids or set(item['relationshipIds']) - edge_ids or set(item['counterEvidenceRecordIds']) - recids:
            raise ValueError(f'Followup source/edge/response closure failed: {item["id"]}')
    return value


def retained_date(value):
    """Strict ISO day or timestamp; malformed metadata never becomes availability."""
    if not isinstance(value, str) or not re.match(r'^\d{4}-\d{2}-\d{2}(?:$|T)', value):
        return None
    try:
        if len(value) == 10:
            return date.fromisoformat(value).isoformat()
        return datetime.fromisoformat(value.replace('Z', '+00:00')).date().isoformat()
    except ValueError:
        return None


def source_temporal_status(source, as_of):
    published, retrieved = source.get('publishedAt'), source.get('retrievedAt')
    pub_day, retrieved_day = retained_date(published), retained_date(retrieved)
    if not as_of:
        return {'eligible': True, 'basis': 'contemporary-reconstruction-no-as-of-forecast',
                'publishedAt': published, 'retrievedAt': retrieved}
    # Source dates filter retrospective context; source/edge version availability
    # has not been independently reconstructed, so this never certifies a forecast.
    if not retrieved:
        reason = 'unknown-observed-availability'
    elif not retrieved_day:
        reason = 'invalid-observed-availability'
    elif published and not pub_day:
        reason = 'invalid-publication-date'
    elif pub_day and pub_day > retrieved_day:
        reason = 'inconsistent-publication-after-retrieval'
    elif retrieved_day > as_of:
        reason = 'retrieved-after-cutoff'
    elif pub_day and pub_day > as_of:
        reason = 'published-after-cutoff'
    else:
        reason = 'observed-by-cutoff'
    return {'eligible': reason == 'observed-by-cutoff', 'basis': reason,
            'publishedAt': published, 'retrievedAt': retrieved,
            'historicalFirstAvailability': None}


def expand_trace(graph, source_ids=(), from_entity=None, to_entity=None, max_hops=2,
                 direction='both', max_edges=150, max_paths=20, as_of=None):
    if not 1 <= max_hops <= 3:
        raise ValueError('max_hops must be 1–3')
    if direction not in {'both', 'outgoing', 'incoming'}:
        raise ValueError('direction must be both, outgoing or incoming')
    if not 1 <= max_edges <= 1000 or not 1 <= max_paths <= 100:
        raise ValueError('bounded output required: max_edges 1–1000, max_paths 1–100')
    if as_of is not None and (len(as_of) != 10 or retained_date(as_of) != as_of):
        raise ValueError('as_of must be a valid ISO calendar day YYYY-MM-DD')
    indexes = validate_graph(graph)
    sources, entities, edges, records = (indexes[k] for k in ('sources', 'entities', 'relationships', 'records'))
    selected_sources = list(dict.fromkeys(source_ids))
    missing = set(selected_sources) - sources.keys()
    if missing:
        raise ValueError(f'Unknown or out-of-scope source IDs: {sorted(missing)}')
    for ident in [from_entity, to_entity]:
        if ident is not None and ident not in entities:
            raise ValueError(f'Unknown or out-of-scope exact entity ID: {ident}')
    if to_entity and not from_entity:
        raise ValueError('to_entity requires from_entity')
    if not selected_sources and not from_entity:
        raise ValueError('Select at least one exact source ID or from_entity')
    temporal = {k: source_temporal_status(v, as_of) for k, v in sources.items()}
    def usable(row):
        ids = referenced_sources(row)
        # All cited evidence must be available, not just the earliest favorable source.
        return bool(ids) and all(temporal[s]['eligible'] for s in ids)
    available_edges = {k: v for k, v in edges.items() if usable(v)}
    selected_set = {x for x in selected_sources if temporal[x]['eligible']}
    seed_edges = {k for k, row in available_edges.items() if selected_set.intersection(row['sourceIds'])}
    seed_records = {k for k, row in records.items() if selected_set.intersection(row.get('sourceIds', [])) and usable(row)}
    if from_entity:
        seed_nodes = {from_entity}
    else:
        seed_nodes = {x for k in seed_edges for x in (edges[k]['from'], edges[k]['to'])}
        seed_nodes |= {x for k in seed_records for x in records[k].get('entityIds', [])}
        seed_nodes |= {k for k, row in entities.items() if selected_set.intersection(row.get('sourceIds', [])) and usable(row)}
    adjacency = {k: [] for k in entities}
    for edge in available_edges.values():
        if direction in {'both', 'outgoing'}:
            adjacency[edge['from']].append((edge['to'], edge['id'], 'forward'))
        if direction in {'both', 'incoming'}:
            adjacency[edge['to']].append((edge['from'], edge['id'], 'reverse'))
    for value in adjacency.values():
        value.sort(key=lambda x: (x[1], x[0]))
    # Source-relevant edges precede context expansion when an explicit bound truncates output.
    edge_ids = set()
    clipped = False
    for eid in sorted(seed_edges):
        if len(edge_ids) < max_edges:
            edge_ids.add(eid)
        else:
            clipped = True
    node_depth = {k: 0 for k in seed_nodes}
    queue = deque(sorted(seed_nodes))
    traversal = []
    while queue:
        current = queue.popleft()
        depth = node_depth[current]
        if depth >= max_hops:
            continue
        for neighbor, eid, traversed in adjacency[current]:
            if eid not in edge_ids and len(edge_ids) >= max_edges:
                clipped = True
                continue
            edge_ids.add(eid)
            context_only = edges[eid]['kind'] in CONTEXT_ONLY_KINDS or edges[eid]['tier'] == 'analytic'
            traversal.append({'relationshipId': eid, 'fromEntityId': current, 'toEntityId': neighbor,
                              'traversedDirection': traversed, 'depth': depth + 1,
                              'contextOnly': context_only})
            if not context_only and neighbor not in node_depth:
                node_depth[neighbor] = depth + 1
                queue.append(neighbor)
    paths = []
    path_search_truncated = False
    if from_entity and to_entity:
        # Explicit simple paths with original edge arrows preserved separately from navigation.
        stack = [(from_entity, [from_entity], [], [])]
        searched_states = 0
        while stack:
            current, nodes, edge_path, directions = stack.pop()
            searched_states += 1
            if searched_states > 10000:
                path_search_truncated = True
                break
            if current == to_entity:
                paths.append({'entityIds': nodes, 'relationshipIds': edge_path,
                              'traversedDirections': directions, 'inferredCashFlow': False,
                              'interpretation': 'Contextual evidence navigation; not a proven money chain.'})
                if len(paths) >= max_paths:
                    path_search_truncated = bool(stack)
                    break
                continue
            if len(edge_path) >= max_hops:
                continue
            for neighbor, eid, traversed in reversed(adjacency[current]):
                e = edges[eid]
                if eid in edge_ids and neighbor not in nodes and e['kind'] not in CONTEXT_ONLY_KINDS and e['tier'] != 'analytic':
                    stack.append((neighbor, nodes + [neighbor], edge_path + [eid], directions + [traversed]))
    linked_record_ids = seed_records | {x for eid in edge_ids for x in edges[eid].get('recordIds', [])}
    response_ids = {x for eid in edge_ids for x in edges[eid].get('responseIds', [])}
    linked_record_ids |= response_ids
    followups = [deepcopy(x) for x in graph.get('followups', [])
                 if set(x['relationshipIds']).intersection(edge_ids) or set(x['recordIds']).intersection(linked_record_ids)]
    for item in followups:
        response_ids.update(item.get('counterEvidenceRecordIds', []))
    linked_record_ids |= response_ids
    # Response records are retained even when temporally ineligible. They are labelled,
    # not used to create a path or claim an earlier prediction.
    selected_records = [deepcopy(records[k]) for k in sorted(linked_record_ids)]
    for row in selected_records:
        if row.get('falsifier'):
            followups.append({'id': f'falsifier:{row["id"]}', 'question': row['falsifier'],
                'neededRecord': row['falsifier'], 'holder': 'Not specified in retained record',
                'whyCurrentEvidenceStops': row['summary'], 'disconfirmationTest': row['falsifier'],
                'relationshipIds': row.get('relationshipIds', []), 'recordIds': [row['id']],
                'sourceIds': row.get('sourceIds', []), 'priorityBasis': 'authored-disconfirmation-test'})
    for eid in sorted(edge_ids):
        row = edges[eid]
        if row.get('falsifier'):
            followups.append({'id': f'falsifier:{eid}', 'question': row['falsifier'],
                'neededRecord': row['falsifier'], 'holder': 'Not specified in retained relationship',
                'whyCurrentEvidenceStops': row['summary'], 'disconfirmationTest': row['falsifier'],
                'relationshipIds': [eid], 'recordIds': row.get('recordIds', []),
                'sourceIds': row['sourceIds'], 'priorityBasis': 'authored-disconfirmation-test'})
    followups.sort(key=lambda x: (x['priorityBasis'] != 'authored-missing-record', x['id']))
    if not followups:
        followups = [{'id': 'unresolved:record-acquisition', 'question': 'Which original record confirms or refutes the next claimed relationship?',
            'neededRecord': 'A dated original record naming both exact entities and the specific relationship; bank or ledger evidence if a payment is claimed.',
            'holder': 'Not established in this corpus',
            'whyCurrentEvidenceStops': 'No source-backed acquisition instruction was retained for the selected neighborhood.',
            'disconfirmationTest': 'An original record contradicting identity, amount stage or claimed direction stops the claim.',
            'relationshipIds': [], 'recordIds': [], 'sourceIds': [], 'priorityBasis': 'generic-evidence-stop-not-new-allegation'}]
    output_nodes = seed_nodes | {x for eid in edge_ids for x in (edges[eid]['from'], edges[eid]['to'])}
    # Records may refer to endpoints beyond displayed expansion; expose exact objects without extra edges.
    output_nodes |= {x for r in selected_records for x in r.get('entityIds', [])}
    selected_entities = [deepcopy(entities[k]) for k in sorted(output_nodes)]
    selected_edges = [deepcopy(edges[k]) for k in sorted(edge_ids)]
    citation_ids = set(selected_sources)
    for row in selected_entities + selected_edges + selected_records + followups:
        citation_ids |= referenced_sources(row)
    selected_citations = [deepcopy(sources[k]) for k in sorted(citation_ids)]
    counterevidence = [{'recordId': row['id'], 'response': row.get('response', ''),
                       'alternativeExplanations': row.get('alternativeExplanations', []),
                       'limitations': row.get('limitations', []), 'sourceIds': row.get('sourceIds', []),
                       'explicitResponseRecord': row['id'] in response_ids,
                       'availableAtCutoff': usable(row)}
                      for row in selected_records if row['id'] in response_ids or row.get('response') or row.get('alternativeExplanations')]
    amount_cells = [{'relationshipId': e['id'], 'from': e['from'], 'to': e['to'],
                     'tier': e['tier'], 'status': e['status'], 'sourceIds': e['sourceIds'],
                     **deepcopy(amount)} for e in selected_edges for amount in e.get('amounts', [])]
    result = {'schemaVersion': 1, 'registryFingerprint': graph.get('registryFingerprint'),
        'selectedSourceIds': selected_sources, 'request': {'fromEntity': from_entity,
            'toEntity': to_entity, 'maxHops': max_hops, 'direction': direction, 'maxEdges': max_edges, 'asOf': as_of},
        'entities': selected_entities, 'relationships': selected_edges, 'records': selected_records,
        'sources': selected_citations, 'paths': paths, 'traversal': traversal,
        'moneyAmounts': amount_cells, 'aggregateAmount': None, 'inferredCashFlow': False,
        'counterevidence': counterevidence, 'counterevidenceCoverage': 'retained-records-only-not-exhaustive-response-search',
        'missingRecordQuestions': followups, 'sourceClosure': {'missingSourceIds': [], 'citationCount': len(selected_citations)},
        'temporalLimits': {'asOf': as_of, 'historicalForecastEligible': False, 'mode': 'source-date-filtered-reconstruction' if as_of else 'contemporary-reconstruction',
            'sourceAvailability': {k: temporal[k] for k in sorted(citation_ids)},
            'recordAvailability': {r['id']: {'allCitedSourcesEligible': usable(r), 'rowVersionAvailabilityVerified': False} for r in selected_records},
            'entityAvailability': {r['id']: {'allCitedSourcesEligible': usable(r), 'rowVersionAvailabilityVerified': False} for r in selected_entities},
            'followupAvailability': {r['id']: {'allCitedSourcesEligible': usable(r), 'rowVersionAvailabilityVerified': False} for r in followups},
            'ineligibleSelectedSourceIds': [k for k in selected_sources if not temporal[k]['eligible']],
            'unknownRetrievedAtCount': sum(not s.get('retrievedAt') for s in selected_citations),
            'unknownPublishedAtCount': sum(not s.get('publishedAt') for s in selected_citations),
            'note': 'Event date is not feature availability. Source dates filter reconstruction context only: archived availability of the current source summary and authored edge version is unverified. Retrieval date does not establish historical first availability. Later responses are labelled context, not earlier model inputs.'},
        'truncation': {'edgeLimitReached': clipped, 'pathSearchTruncated': path_search_truncated,
                       'maxHops': max_hops, 'relationshipsReturned': len(selected_edges)},
        'unsupportedContinuation': 'No supported path in the selected scope and bounds.' if to_entity and not paths else 'Any continuation beyond retained exact edges requires new source records.',
        'interpretation': INTERPRETATION}
    validate_packet(result, graph)
    return result


def validate_packet(packet, graph):
    """Output assertions must exactly match the input registry, including adverse caveats."""
    indexes = validate_graph(graph)
    for kind in ('entities', 'relationships', 'records', 'sources'):
        for row in packet[kind]:
            if row != indexes[kind].get(row['id']):
                raise ValueError(f'Output {kind} row was changed or invented: {row["id"]}')
    citations = {s['id'] for s in packet['sources']}
    for kind in ('entities', 'relationships', 'records'):
        for row in packet[kind]:
            if referenced_sources(row) - citations:
                raise ValueError(f'Output source closure failed: {row["id"]}')
    expected_amounts = [{'relationshipId': e['id'], 'from': e['from'], 'to': e['to'],
                        'tier': e['tier'], 'status': e['status'], 'sourceIds': e['sourceIds'], **deepcopy(a)}
                       for e in packet['relationships'] for a in e.get('amounts', [])]
    if packet.get('moneyAmounts') != expected_amounts:
        raise ValueError('Derived money cells differ from exact retained relationship amounts')
    returned = {e['id'] for e in packet['relationships']}
    for path in packet['paths']:
        if path.get('inferredCashFlow') is not False:
            raise ValueError('A navigation path cannot claim inferred cash flow')
        for i, eid in enumerate(path['relationshipIds']):
            if eid not in returned:
                raise ValueError('Path references undisplayed edge')
            edge = indexes['relationships'][eid]
            pair = [edge['from'], edge['to']]
            if path['traversedDirections'][i] == 'reverse':
                pair.reverse()
            if pair != path['entityIds'][i:i+2]:
                raise ValueError('Path has a fabricated endpoint or direction')
    if packet['inferredCashFlow'] is not False or packet['aggregateAmount'] is not None:
        raise ValueError('Trace cannot infer a cash flow or sum incompatible stages')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--graph', type=Path, default=DEFAULT_GRAPH)
    parser.add_argument('--registry', type=Path, help='Full registry JSON for artifact build; otherwise load current TypeScript registry.')
    parser.add_argument('--build', action='store_true')
    parser.add_argument('--verify', action='store_true')
    parser.add_argument('--source', action='append', default=[])
    parser.add_argument('--sources-json', type=Path, help='Ranked source rows or object with rankedSources; source IDs must be exact.')
    parser.add_argument('--top-k', type=int, default=5)
    parser.add_argument('--from-entity', '--fromentity', dest='from_entity')
    parser.add_argument('--to-entity', '--toentity', dest='to_entity')
    parser.add_argument('--max-hops', type=int, default=2)
    parser.add_argument('--direction', choices=['both', 'outgoing', 'incoming'], default='both')
    parser.add_argument('--max-edges', type=int, default=150)
    parser.add_argument('--as-of')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.build or args.verify:
        registry = json.loads(args.registry.read_text()) if args.registry else live_registry()
        value = build_artifact(registry)
        content = json.dumps(value, separators=(',', ':'), ensure_ascii=False) + '\n'
        if args.verify:
            if not args.graph.exists() or args.graph.read_text() != content:
                raise ValueError('Graph artifact differs from the current registry/followup source bytes; rebuild explicitly.')
        else:
            args.graph.parent.mkdir(parents=True, exist_ok=True)
            args.graph.write_text(content)
        print(json.dumps({'status': 'verified' if args.verify else 'built', 'path': str(args.graph),
                          'bytes': len(content.encode()), 'counts': {k: len(value[k]) for k in ('sources','entities','relationships','records')},
                          'registryFingerprint': value['registryFingerprint']}))
        return
    graph = json.loads(args.graph.read_text())
    ids = args.source
    if args.sources_json:
        if args.top_k < 1:
            raise ValueError('top-k must be positive')
        ranked = json.loads(args.sources_json.read_text())
        if isinstance(ranked, dict):
            ranked = ranked['rankedSources']
        ids += [row if isinstance(row, str) else row.get('sourceId', row.get('id')) for row in ranked[:args.top_k]]
    result = expand_trace(graph, ids, args.from_entity, args.to_entity,
                          args.max_hops, args.direction, args.max_edges, as_of=args.as_of)
    content = json.dumps(result, indent=2, ensure_ascii=False) + '\n'
    if args.output:
        args.output.write_text(content)
    else:
        print(content, end='')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'trace: {exc}', file=sys.stderr)
        raise SystemExit(2)
