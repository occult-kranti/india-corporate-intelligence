#!/usr/bin/env python3
"""Validate the funding CONTRACT. Structural evidence checks are not fact checking."""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import date, datetime
import hashlib
import json
import math
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
TRACKS = {'defence', 'police-border', 'utilities', 'welfare-pmcares', 'cross-sector'}
STATUSES = {'documented', 'alleged', 'audit-finding', 'unresolved', 'contradicted'}
STAGES = {'budget', 'approval', 'award', 'payment', 'receipt', 'recovery', 'attachment', 'ownership', 'office', 'oversight', 'alleged-transfer', 'context'}
KINDS = {'official', 'court', 'audit', 'filing', 'reporting', 'methods'}
INSPECTIONS = {'full-document', 'selected-pages', 'web-text', 'secondary-only'}
MONEY_STAGES = {'budget', 'approval', 'award', 'payment', 'receipt', 'recovery', 'attachment', 'alleged-transfer'}


def streams_from(value):
    if isinstance(value, list):
        return value
    if isinstance(value, dict) and 'streams' in value:
        return value['streams']
    return [value]


def _validate(value, root=ROOT):
    errors, warnings = [], []
    indexes = {k: {} for k in ('sources', 'entities', 'edges', 'cases', 'claims')}
    seen = set()
    root = Path(root).resolve()
    streams = streams_from(value)
    if not isinstance(streams, list) or not streams:
        return {'valid': False, 'errors': ['Bundle must contain at least one stream'], 'warnings': [], 'counts': {}}

    def err(where, message):
        errors.append(f'{where}: {message}')

    def obj(row, where, fields):
        if not isinstance(row, dict):
            err(where, 'expected object'); return False
        for field in fields.split():
            if field not in row:
                err(where, f'missing {field}')
        return True

    def text(row, keys, where):
        for key in keys.split():
            if not isinstance(row.get(key), str) or not row[key].strip():
                err(where, f'{key} must be nonempty text')

    def arr(row, field, where, nonempty=False, strings=False):
        a = row.get(field)
        if not isinstance(a, list):
            err(where, f'{field} must be an array'); return []
        if nonempty and not a:
            err(where, f'{field} must not be empty')
        if strings and any(not isinstance(x, str) or not x.strip() for x in a):
            err(where, f'{field} requires nonempty strings')
        return a

    def enum(row, field, values, where):
        if row.get(field) not in values:
            err(where, f'invalid {field}: {row.get(field)!r}')

    def day(v, where, nullable=False):
        if v is None and nullable: return
        try:
            if not isinstance(v, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', v): raise ValueError()
            date.fromisoformat(v)
        except (ValueError, TypeError): err(where, 'expected ISO date YYYY-MM-DD')

    def refs(row, field, target, where, nonempty=True):
        a = arr(row, field, where, nonempty, True)
        if len(a) != len(set(x for x in a if isinstance(x, str))):
            err(where, f'{field} contains duplicate or invalid references')
        for ident in a:
            if not isinstance(ident, str) or ident not in indexes[target]: err(where, f'unresolved {field}: {ident!r}')
        return a

    # Reject unsupported quantitative extras even when smuggled into nested objects.
    def no_inference(o, where):
        if isinstance(o, dict):
            for k, v in o.items():
                low = re.sub('[^a-z]', '', k.lower())
                if low in {'aggregateamount', 'graphwidetotal', 'totalmoneyflow', 'totalcorruption', 'totalamount', 'sumamount', 'summedamount', 'corruptionprobability', 'probability', 'predictionprobability', 'guiltprobability', 'guiltscore', 'probabilityofguilt', 'inferredcashflow', 'inferredrelationship'} and v is not None and v is not False:
                    err(where, f'prohibited unvalidated aggregate/inference field {k}')
                if low in {'inferrededges', 'inferredrelationships'} and v not in (None, []):err(where, f'prohibited inferred edges in {k}')
                no_inference(v, f'{where}.{k}')
        elif isinstance(o, list):
            for i, v in enumerate(o): no_inference(v, f'{where}[{i}]')
    no_inference(value, 'bundle')
    track_counts = Counter()
    for n, stream in enumerate(streams):
        where = f'stream[{n}]'
        if not obj(stream, where, 'schemaVersion track reviewDate scope searchLog sources entities edges cases coverage rejectedJoins roadmap'): continue
        track = stream.get('track'); track_counts[track if isinstance(track, str) else '<invalid>'] += 1
        enum(stream, 'track', TRACKS, where)
        if stream.get('schemaVersion') != 1: err(where, 'schemaVersion must be 1')
        day(stream.get('reviewDate'), where+'.reviewDate'); text(stream, 'scope', where)
        prefix = f'fi:{track}:'
        for group in indexes:
            rows = stream.get(group, []) if group != 'claims' else [c for case in stream.get('cases', []) if isinstance(case, dict) for c in case.get('claims', []) if isinstance(case.get('claims'), list)]
            if not isinstance(rows, list): err(where, f'{group} must be array'); continue
            for row in rows:
                if not isinstance(row, dict): err(where, f'invalid {group} object'); continue
                ident = row.get('id')
                if not isinstance(ident, str) or not ident.startswith(prefix) or len(ident) <= len(prefix):
                    err(where, f'invalid {group} ID {ident!r}'); continue
                if ident in seen: err(where, f'duplicate global ID {ident}')
                seen.add(ident); indexes[group][ident] = row
        for entry in arr(stream, 'searchLog', where):
            if obj(entry, where+'.searchLog', 'query requestedResults date'):
                text(entry, 'query', where); day(entry.get('date'), where+'.searchLog.date')
                if type(entry.get('requestedResults')) is not int or entry['requestedResults'] < 0:
                    err(where, 'requestedResults must be a nonnegative integer, not inspected document count')
    for track, count in track_counts.items():
        if count > 1: err('bundle', f'duplicate stream track {track}')

    for s in indexes['sources'].values():
        w=s['id']; obj(s,w,'id title publisher url publishedAt accessedAt kind sourceFamily inspection locator excerpt limitations capturePath sha256')
        text(s,'title publisher url sourceFamily locator excerpt',w); enum(s,'kind',KINDS,w); enum(s,'inspection',INSPECTIONS,w)
        url=urlparse(s.get('url') if isinstance(s.get('url'),str) else '')
        if url.scheme not in ('http','https') or not url.netloc: err(w,'source URL must be public HTTP(S)')
        day(s.get('publishedAt'),w+'.publishedAt',True)
        try:
            d=datetime.fromisoformat(s.get('accessedAt','').replace('Z','+00:00'))
            if d.tzinfo is None: raise ValueError()
        except (ValueError,TypeError,AttributeError): err(w,'accessedAt requires ISO timestamp with timezone')
        limits=arr(s,'limitations',w,strings=True)
        cp,sha=s.get('capturePath'),s.get('sha256')
        if (cp is None) != (sha is None): err(w,'capturePath and sha256 must both be present or both null')
        if cp is not None:
            if not isinstance(cp,str) or not isinstance(sha,str) or not re.fullmatch('[0-9a-f]{64}',sha): err(w,'invalid capture path or SHA-256')
            else:
                path=(root/cp).resolve()
                if Path(cp).is_absolute() or not path.is_relative_to(root): err(w,'capturePath must stay inside repository')
                elif not path.is_file(): err(w,f'capture missing: {cp}')
                elif hashlib.sha256(path.read_bytes()).hexdigest()!=sha: err(w,f'capture hash mismatch: {cp}')
        else:
            if not limits: err(w,'uncaptured source must disclose limitation')
            warnings.append(f'{w}: no retained source capture')
        if s.get('inspection')=='secondary-only': warnings.append(f'{w}: secondary-only source; original assertion not independently inspected')
        if s.get('inspection')=='selected-pages' and not limits: err(w,'selected pages require inspection-scope limitation')
    for e in indexes['entities'].values():
        w=e['id'];obj(e,w,'id label kind identityBasis sourceIds');text(e,'label identityBasis',w)
        enum(e,'kind',{'institution','company','person','fund','programme','country'},w);refs(e,'sourceIds','sources',w)
    for e in indexes['edges'].values():
        w=e['id'];obj(e,w,'id from to relation label status stage date amount sourceIds response limits');text(e,'from to relation label response',w)
        enum(e,'status',STATUSES,w);enum(e,'stage',STAGES,w);day(e.get('date'),w+'.date',True)
        for k in ('from','to'):
            if e.get(k) not in indexes['entities']:err(w,f'unresolved endpoint {k}: {e.get(k)!r}')
        refs(e,'sourceIds','sources',w);arr(e,'limits',w,strings=True)
        if e.get('stage')=='alleged-transfer' and e.get('status')=='documented':err(w,'alleged-transfer cannot be marked documented transfer')
        amount=e.get('amount')
        if amount is not None:
            if obj(amount,w+'.amount','value currency unit period basis overlapGroup'):
                v=amount.get('value')
                if type(v) not in (int,float) or not math.isfinite(v) or v<0:err(w,'amount.value must be finite nonnegative number; unknown is null amount')
                text(amount,'currency unit period basis',w+'.amount')
                if not re.fullmatch('[A-Z]{3}',amount.get('currency','')):err(w,'currency requires ISO-style three-letter code')
                if amount.get('overlapGroup') is not None and not isinstance(amount['overlapGroup'],str):err(w,'overlapGroup must be null or text')
                if e.get('stage') not in MONEY_STAGES:err(w,'amount on nonfinancial relation; do not turn context/ownership into cash')
                if e.get('date') is None and amount.get('period','').lower() in ('unknown','n/a',''):err(w,'amount requires explicit period or date')
    for c in indexes['cases'].values():
        w=c['id'];obj(c,w,'id title question sector period status finding geography entityIds edgeIds sourceIds claims whatWeKnow whatWeDoNotKnow nextRecords limits')
        text(c,'title question sector period finding',w);enum(c,'status',STATUSES,w)
        entity_ids=refs(c,'entityIds','entities',w);edge_ids=refs(c,'edgeIds','edges',w,False);refs(c,'sourceIds','sources',w)
        for edge_id in edge_ids:
            e=indexes['edges'].get(edge_id,{})
            if e and (e.get('from') not in entity_ids or e.get('to') not in entity_ids):err(w,f'case omits endpoint of {edge_id}')
        for geo in arr(c,'geography',w):
            if obj(geo,w+'.geography','label stateCode basis'):
                text(geo,'label basis',w+'.geography')
                if geo.get('stateCode') is not None and (not isinstance(geo['stateCode'],str) or not geo['stateCode'].strip()):err(w,'stateCode must be nonempty text or null')
        for field in ('whatWeKnow','whatWeDoNotKnow','limits'):arr(c,field,w,True,True)
        for nxt in arr(c,'nextRecords',w,True):
            if obj(nxt,w+'.nextRecords','record holder purpose'):text(nxt,'record holder purpose',w+'.nextRecords')
        arr(c,'claims',w,True)
        for claim in c.get('claims',[]):
            if not isinstance(claim,dict):continue
            cw=claim.get('id',w+'.claims');obj(claim,cw,'id text status sourceIds response alternative falsifier missingRecords')
            text(claim,'text response alternative falsifier',cw);enum(claim,'status',STATUSES,cw);refs(claim,'sourceIds','sources',cw)
            arr(claim,'missingRecords',cw,strings=True)
        if 'decisionAnalysis' in c:
            a=c['decisionAnalysis'];aw=w+'.decisionAnalysis'
            if obj(a,aw,'decisionDate actors informationThen options observedOutcome sourceIds hindsightLimits'):
                day(a.get('decisionDate'),aw+'.decisionDate',True);text(a,'observedOutcome',aw);refs(a,'sourceIds','sources',aw);arr(a,'hindsightLimits',aw,True,True)
                for actor in arr(a,'actors',aw,True):
                    if obj(actor,aw+'.actors','entityId authority incentive evidenceSourceIds'):
                        text(actor,'authority incentive',aw)
                        if actor.get('entityId') not in indexes['entities']:err(aw,'unresolved actor entityId')
                        refs(actor,'evidenceSourceIds','sources',aw)
                for option in arr(a,'options',aw,True):
                    if obj(option,aw+'.options','label expectedObservableOutcome sourceIds'):
                        text(option,'label expectedObservableOutcome',aw);refs(option,'sourceIds','sources',aw)
                for info in arr(a,'informationThen',aw):
                    if isinstance(info,str):
                        if not info.strip():err(aw,'empty informationThen item')
                    elif isinstance(info,dict):
                        text(info,'text',aw);refs(info,'sourceIds','sources',aw)
                    else:err(aw,'informationThen requires labelled text or source-linked object')
    for stream in streams:
        if not isinstance(stream,dict):continue
        w=stream.get('track','stream')
        for row in arr(stream,'coverage',w):
            if obj(row,w+'.coverage','institution jurisdiction period status sourceIds gap nextRecord'):
                text(row,'institution jurisdiction period gap nextRecord',w);enum(row,'status',{'examined','partial','queued','unavailable'},w)
                refs(row,'sourceIds','sources',w,row.get('status') in ('examined','partial'))
        for row in arr(stream,'rejectedJoins',w):
            if obj(row,w+'.rejectedJoins','from to proposed reason sourceIds'):
                text(row,'from to proposed reason',w);refs(row,'sourceIds','sources',w,False)
        for row in arr(stream,'roadmap',w,True):
            if obj(row,w+'.roadmap','phase task deliverable acceptance'):text(row,'task deliverable acceptance',w);enum(row,'phase',{'now','next','later'},w)
    return {'valid':not errors,'errors':errors,'warnings':warnings,'counts':{k:len(v) for k,v in indexes.items()},'tracks':dict(track_counts),'interpretation':'Structural checks do not independently verify quotations, source reliability, amount reconciliation, or the truth of any allegation. No inferred relationship, guilt score or money total is produced.'}


def validate(value, root=ROOT):
    """Malformed schema input fails closed instead of aborting a release check."""
    try:
        return _validate(value, root)
    except (TypeError, KeyError, AttributeError, ValueError, OverflowError) as exc:
        return {'valid': False, 'errors': [f'Malformed contract structure: {type(exc).__name__}: {exc}'], 'warnings': [], 'counts': {}}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('inputs',nargs='*',type=Path);p.add_argument('--root',type=Path,default=ROOT);p.add_argument('--output',type=Path);a=p.parse_args()
    paths=a.inputs or sorted((a.root/'research/funding-investigations/streams').glob('*.json'))
    streams=[]; input_values=[]
    for path in paths:
        value=json.loads(path.read_text());input_values.append(value);normalized=streams_from(value)
        if not isinstance(normalized,list):normalized=[normalized]
        streams.extend(normalized)
    result=validate({'streams':streams,'inputWrappers':input_values},a.root);result['inputs']=[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
    rendered=json.dumps(result,indent=2,ensure_ascii=False)+'\n'
    if a.output:a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(rendered)
    print(rendered);return 0 if result['valid'] else 1
if __name__=='__main__':sys.exit(main())
