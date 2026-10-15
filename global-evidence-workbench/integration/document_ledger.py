"""Document access/change observations. No inference of intent from availability."""
import hashlib,pathlib
OBSERVATIONS={'HTTP_404','ACCESS_DENIED','MOVED','WITHDRAWN','REDACTED','REPLACED','NOT_FOUND_IN_SEARCH','CONTENT_CHANGED','UNCHANGED','UNAVAILABLE','PUBLISHER_REPORTED_CHANGE'}
DEFAULT_ALTERNATIVES=['Routine URL migration or content-management change','Lawful redaction or privacy protection','Correction, retraction or replacement','Temporary service, indexing, authentication or access failure']
def compare_snapshots(before=None,after=None):
    # Inputs must be locally acquired bytes. Never hash a URL/summary as source bytes.
    if before is not None and not isinstance(before,bytes):raise TypeError('before must be bytes')
    if after is not None and not isinstance(after,bytes):raise TypeError('after must be bytes')
    digest=lambda b:hashlib.sha256(b).hexdigest() if b is not None else None
    return {'beforeSha256':digest(before),'afterSha256':digest(after),'beforeBytes':len(before) if before is not None else None,'afterBytes':len(after) if after is not None else None,'comparison':'UNAVAILABLE' if before is None or after is None else 'UNCHANGED' if before==after else 'CONTENT_CHANGED','intent':'NOT_ESTABLISHED'}
def normalize_entry(e):
    e=dict(e);kind=e.get('observationType','UNAVAILABLE')
    if kind not in OBSERVATIONS:raise ValueError('Unknown observation type '+kind)
    if not e.get('id') or not e.get('sourceIds'):raise ValueError('Entry needs ID and evidence')
    e.setdefault('beforeSha256',None);e.setdefault('afterSha256',None)
    for side in ('before','after'):
        if e.get(side+'Sha256') and not e.get(side+'AcquiredBytesVerified'):
            raise ValueError('Hash requires verified acquired-byte provenance')
    e.setdefault('concealmentHypothesis',None);e['concealmentEstablished']=False
    e.setdefault('alternativeExplanations',DEFAULT_ALTERNATIVES.copy())
    e.setdefault('officialExplanation',None);e.setdefault('comparison','UNAVAILABLE')
    e['intent']='NOT_ESTABLISHED'
    return e
