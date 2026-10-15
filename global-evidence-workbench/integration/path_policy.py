"""Pure fail-closed predicates for research navigation, not a causation engine."""
from datetime import date
NON_MECHANISM={'analytic','contra','family','hq','sector','listed','supersede'}
def eligible_path_edge(edge,as_of):
    """Return decision + reason; requires explicit reviewed bounds and typed mechanism."""
    if edge.get('pathEligible') is not True:return False,'not-reviewed'
    if edge.get('type') in NON_MECHANISM:return False,'non-mechanism-predicate'
    if edge.get('status')=='SUPERSEDED' or edge.get('supersededBy'):return False,'superseded'
    if not edge.get('sourceIds'):return False,'missing-citation'
    if not edge.get('validFrom') or not edge.get('validTo'):return False,'unknown-time-bound'
    try:start,end,when=map(date.fromisoformat,[edge['validFrom'],edge['validTo'],as_of])
    except (ValueError,TypeError):return False,'invalid-date'
    if end<start:return False,'inverted-interval'
    return (True,'reviewed-time-compatible') if start<=when<=end else (False,'outside-validity')

def cross_repo_join(candidate):
    required=['sourceIds','sourceEntityId','targetEventId','predicate','validFrom','validTo','reviewer']
    if any(not candidate.get(k) for k in required):return False,'incomplete-evidence'
    try:
        start,end=map(date.fromisoformat,[candidate['validFrom'],candidate['validTo']])
    except (ValueError,TypeError):return False,'invalid-date-bound'
    if end<start:return False,'inverted-interval'
    if candidate.get('basis') in ('geography','same-name','sector','temporal-coincidence'):return False,'non-evidentiary-basis'
    if candidate.get('identityResolved') is not True:return False,'identity-unresolved'
    if candidate.get('sourceExplicitlySupportsPredicate') is not True:return False,'predicate-not-explicit'
    return True,'admissible-for-editorial-review-not-causal-proof'
