#!/usr/bin/env python3
"""CPPP live verification sample — Task 4 of the 2026-09-26 foreign-money plan.

Draws 40 award rows from the 4.92M-row CPPP awards dataset with a seeded RNG
(seed 2026), stratified 20 central / 20 state across award years 2015–2026, and
restricted to rows whose winner carries a legal-form or trade marker and whose
detail_url is non-null. Each row's stored detail_url is fetched verbatim
(curl -sS -L -A "Mozilla/5.0", 3 s politeness delay), the Award of Contract page
is parsed for the CPPP's own fields, and the dataset values are compared field by
field. The result is research/raw/cppp/sample-verification.json.

THE REFUSAL. The dataset holds hundreds of thousands of personal names of small
contractors. Nothing this script writes may carry a winner name unless it is marked:
the portal joins several winners of one tender into one comma-separated
selected_bidder string, so EVERY ','/';'-separated component must match MARKER
(one firm in the list does not license the bare names beside it), and
selected_bidder_address is never read into the output at all. The sample is drawn
from marked winners only, and assert_emittable() re-checks every name, component by
component, and every key before the JSON is written.

The first draw of 2026-09-26 tested the whole string and admitted joined lists such
as '<firm> Private Limited,<bare name>,<bare name>'; the component rule changes the
candidate set (1,744,723 -> 1,402,374 rows), so the 40 rows of this file differ from
that first draw. Same seed, same RNG, different population — stated in the JSON.

Sampling is a genuine seeded RNG, not a hash order: for each of the 24 strata
(portal × year) the candidate internal_ids are listed in sorted order and
random.Random(2026).sample() picks k of them, with the strata visited in a fixed
order (central first, years ascending). Re-running with the same inputs gives
the same 40 rows.

Offline tooling only: Python 3.11 + duckdb + pyarrow (pip --user); not in CI.

Usage (from the repo root):
  python3 scripts/cppp/verify_sample.py                 # draw, fetch, write JSON
  python3 scripts/cppp/verify_sample.py --dry-run       # draw only, no network
  CPPP_ARROW_DIR=/path/to/arrow python3 scripts/cppp/verify_sample.py
Fetched bodies are kept under $CPPP_FETCH_DIR (default: <scratchpad>/cppp-fetched)
so two of them can be copied into fixtures/ by hand.
"""
from __future__ import annotations

import argparse
import hashlib
import html as htmlmod
import json
import os
import random
import re
import subprocess
import sys
import time
from datetime import date, datetime

AS_OF = '2026-09-26'
SEED = 2026
YEARS = list(range(2015, 2027))
PER_PORTAL = 20
DELAY_S = 3.0
UA = 'Mozilla/5.0'

DEFAULT_ARROW_DIR = ('/tmp/claude-0/-home-user-india-corporate-intelligence/'
                     'f532d734-1afb-5ca9-b34e-a813ae9f9a94/scratchpad/tenders-hf')
ARROW_FILES = ['data-00000-of-00002.arrow', 'data-00001-of-00002.arrow']
DEFAULT_FETCH_DIR = os.path.join(os.path.dirname(DEFAULT_ARROW_DIR), 'cppp-fetched')

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_PATH = os.path.join(REPO, 'research', 'raw', 'cppp', 'sample-verification.json')

# The marker allow-list from the spec (§1 non-goals) — a winner name may be
# written out only if it matches. Case-insensitive; the same pattern is embedded
# in the candidate SQL below via regexp_matches(lower(selected_bidder), ...).
MARKER_SRC = (r'(ltd|limited|pvt|private|llp|m/s|infra|construct|enterprise|corporation|'
              r'company|co\.|associates|traders|agencies|industries|technolog|solutions|'
              r'services|builders|engineers|contractors|suppliers|&|and sons|society|samiti|'
              r'sangh|mandal|federation|trust|bank|udyog|nigam|pariyojana)')
MARKER = re.compile(MARKER_SRC, re.I)
# Winners are joined with ',' (1,205,994 of 4,540,739 named rows; ';' never occurs but is
# treated the same). A name is marked only when every non-empty component matches.
COMPONENT_SEP = r'[,;]'
MARKED_RULE = ("a selected_bidder is 'marked' only when every non-empty component of the string split on ',' "
               "or ';' matches markerRegex (case-insensitive); a joined list holding one bare personal name is "
               "unmarked as a whole and is never drawn or written")
_COMPONENTS_SQL = f"list_filter(string_split_regex(lower(selected_bidder), '{COMPONENT_SEP}'), lambda x: trim(x) <> '')"
MARKED_SQL = (f"selected_bidder IS NOT NULL AND len({_COMPONENTS_SQL}) > 0 AND "
              f"len(list_filter({_COMPONENTS_SQL}, lambda x: NOT regexp_matches(x, '{MARKER_SRC}'))) = 0")

FIELDS = ('bids_received', 'selected_bidder', 'contract_value', 'aoc_date')
VERDICTS = ('match', 'mismatch', 'missing', 'page_gone')

# One row per award decision — the SAME rule as build.py's SQL['dedup']:
# PARTITION BY (tender_id, lower(trim(selected_bidder)), aoc_at) ORDER BY internal_id.
# Two spellings differing only by case/whitespace are one bidder; a later aoc_at for the
# same tender and bidder is a separate award decision (a re-award), kept.
DEDUP_RULE = ('one row per (tender_id, selected_bidder_norm, aoc_at) — the first by internal_id, where '
              'selected_bidder_norm = lower(trim(selected_bidder)) (build.py SQL[dedup], verbatim); candidates '
              'further restricted to marked winners (every component), non-null detail_url and aoc year 2015-2026')

SQL_CAND = f"""CREATE TABLE cand AS
SELECT internal_id, tender_id, portal_type, year(aoc_at) AS y, organisation_name,
       selected_bidder, bids_received, contract_value_amount, aoc_at, detail_url
FROM t
WHERE detail_url IS NOT NULL
  AND {MARKED_SQL}
  AND aoc_at IS NOT NULL AND year(aoc_at) BETWEEN 2015 AND 2026
QUALIFY row_number() OVER (PARTITION BY tender_id, lower(trim(selected_bidder)), aoc_at
                           ORDER BY internal_id) = 1"""

SQL_STRATUM = ("SELECT internal_id FROM cand WHERE portal_type = ? AND y = ? "
               "ORDER BY internal_id")

SQL_ROWS = ("SELECT internal_id, tender_id, portal_type, y, organisation_name, selected_bidder, "
            "bids_received, contract_value_amount, aoc_at, detail_url FROM cand "
            "WHERE internal_id IN (SELECT unnest(?)) ORDER BY portal_type, y, internal_id")

SQL_TOTALS = "SELECT count(*) AS rows, count(DISTINCT tender_id) AS distinct_tender_ids FROM t"


# What the 2026-09-26 run established about the stored links (kept here so a re-run
# that suddenly reaches AOC pages drops it automatically: it is emitted only when
# every row is page_gone).
FINDING = (
    'Every stored detail_url answered HTTP 200 with the portal message "Invalid Url.Please Check". '
    'The link token is <b64 numeric id>A13h1<b64 key>A13h1<b64 unix time>; the key is one constant per '
    'portal (central: 2,005,258 rows share it; state: 2,916,702) and the time segment is the June 2026 '
    'scrape timestamp, so the portal appears to bind links to a validity window. A headless-Chromium load '
    'of the same URL returned the same message (JavaScript is not the cause). The portal\'s own Results of '
    'Tenders search (resultoftendersnew/cpppdata, mmpdata) sits behind an image captcha and was not '
    'attempted; no token was re-signed or re-timestamped to reach a page. Consequence for the README: '
    'bids_received, selected_bidder, contract_value and aoc_at remain "reported" (dataset-only) for every '
    'row; the row-level "documented" upgrade the plan allowed at >= 38/40 agreement is not available.'
)


class RefusalError(Exception):
    """Raised when an output would carry an unmarked winner name or an address."""


# ----------------------------------------------------------------------------
# marker / refusal

def name_components(name) -> list:
    """The non-empty ','/';'-separated components of a selected_bidder string."""
    if name is None:
        return []
    return [c.strip() for c in re.split(COMPONENT_SEP, str(name)) if c.strip()]


def is_marked(name) -> bool:
    """Python twin of MARKED_SQL: every component carries a marker."""
    parts = name_components(name)
    return bool(parts) and all(MARKER.search(p) for p in parts)


def assert_emittable(doc) -> None:
    """Walk the whole document: every selected_bidder must be marked in every
    component; no key may be or contain 'address'."""
    def walk(node, path):
        if isinstance(node, dict):
            for k, v in node.items():
                if 'address' in str(k).lower():
                    raise RefusalError(f'address key at {path}/{k}')
                if k == 'selected_bidder':
                    if path.endswith('/verdicts') and v in VERDICTS:
                        pass                      # a verdict word, not a name
                    elif path.endswith('/agreement') and isinstance(v, dict):
                        pass                      # per-verdict counts, not a name
                    elif v is None:
                        pass                      # field absent from the page
                    elif not is_marked(v):
                        raise RefusalError(f'unmarked winner name at {path}/{k}')
                walk(v, f'{path}/{k}')
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f'{path}[{i}]')
    walk(doc, '')


# ----------------------------------------------------------------------------
# page classification and parsing

LABELS = {
    'bids_received': re.compile(r'^(number|no\.?)\s+of\s+bids?\s+received', re.I),
    'selected_bidder': re.compile(r'^(name\s+of\s+(the\s+)?)?selected\s+bidder', re.I),
    'contract_value': re.compile(r'^contract\s+value', re.I),
    'aoc_date': re.compile(r'^(date\s+of\s+award\s+of\s+contract|aoc\s+date|'
                           r'award\s+of\s+contract\s+date|contract\s+date)', re.I),
}
_ADDRESS = re.compile(r'address', re.I)


def classify_page(html: str, status: int) -> str:
    """'aoc' | 'invalid_url' | 'captcha' | 'not_found' | 'unrecognised'."""
    if status == 404:
        return 'not_found'
    if status >= 400:
        return 'http_error'
    if re.search(r'Invalid\s+Url', html, re.I):
        return 'invalid_url'
    if re.search(r'image-captcha|Image CAPTCHA|What code is in the image', html, re.I):
        return 'captcha'
    if re.search(r'number\s+of\s+bids\s+received', html, re.I) and \
            re.search(r'selected\s+bidder', html, re.I):
        return 'aoc'
    return 'unrecognised'


def _text(fragment: str) -> str:
    s = re.sub(r'<[^>]+>', ' ', fragment)
    s = htmlmod.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()


def _cells(html: str):
    """Yield (label, value) pairs from every table row with >= 2 cells."""
    body = re.sub(r'<(script|style)\b.*?</\1>', ' ', html, flags=re.S | re.I)
    for tr in re.findall(r'<tr\b.*?</tr>', body, flags=re.S | re.I):
        cells = [_text(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>', tr, flags=re.S | re.I)]
        cells = [c for c in cells if c != '']
        if len(cells) >= 2:
            label = cells[0].rstrip(' :').strip()
            yield label, cells[1]


def _to_int(s):
    m = re.search(r'-?\d[\d,]*', s or '')
    return int(m.group(0).replace(',', '')) if m else None


def _to_amount(s):
    s = (s or '').replace('₹', ' ').replace('Rs.', ' ').replace('INR', ' ')
    m = re.search(r'-?\d[\d,]*(?:\.\d+)?', s)
    return float(m.group(0).replace(',', '')) if m else None


_DATE_FORMATS = ('%d-%b-%Y', '%d-%b-%Y %I:%M %p', '%d-%b-%Y %H:%M', '%d/%m/%Y', '%d-%m-%Y',
                 '%Y-%m-%d', '%d %b %Y', '%d-%B-%Y')


def _to_date(s):
    s = (s or '').strip()
    if not s:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    m = re.search(r'(\d{1,2})-([A-Za-z]{3})-(\d{4})', s)
    if m:
        try:
            return datetime.strptime(m.group(0), '%d-%b-%Y').date().isoformat()
        except ValueError:
            return None
    return None


def parse_aoc(html: str) -> dict:
    """Parse an Award of Contract page into the four compared fields.

    Returns {'bids_received': int|None, 'selected_bidder': str|None,
             'contract_value': float|None, 'aoc_date': 'YYYY-MM-DD'|None}.
    Address rows are skipped on purpose and never surface in the result."""
    out = {f: None for f in FIELDS}
    for label, value in _cells(html):
        if _ADDRESS.search(label):
            continue
        for field, rx in LABELS.items():
            if out[field] is None and rx.search(label):
                if field == 'bids_received':
                    out[field] = _to_int(value)
                elif field == 'selected_bidder':
                    out[field] = value or None
                elif field == 'contract_value':
                    out[field] = _to_amount(value)
                else:
                    out[field] = _to_date(value)
                break
    return out


# ----------------------------------------------------------------------------
# comparison

def _norm_name(s):
    s = re.sub(r'[^a-z0-9&]+', ' ', str(s).casefold())
    return re.sub(r'\s+', ' ', s).strip()


def _row_date(v):
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return (v.date() if isinstance(v, datetime) else v).isoformat()
    return str(v)[:10]


def compare(row: dict, parsed) -> dict:
    """Field-level verdicts. parsed=None means the page was not an AOC page."""
    if parsed is None:
        return {f: 'page_gone' for f in FIELDS}
    ds = {
        'bids_received': row.get('bids_received'),
        'selected_bidder': row.get('selected_bidder'),
        'contract_value': row.get('contract_value_amount'),
        'aoc_date': _row_date(row.get('aoc_at')),
    }
    out = {}
    for f in FIELDS:
        p = parsed.get(f)
        d = ds[f]
        if p is None:
            out[f] = 'missing'          # the page does not show the field
        elif d is None:
            out[f] = 'mismatch'         # the dataset lacks what the page shows
        elif f == 'bids_received':
            out[f] = 'match' if int(d) == int(p) else 'mismatch'
        elif f == 'selected_bidder':
            out[f] = 'match' if _norm_name(d) == _norm_name(p) else 'mismatch'
        elif f == 'contract_value':
            out[f] = 'match' if abs(float(d) - float(p)) <= 0.5 else 'mismatch'
        else:
            out[f] = 'match' if d == p else 'mismatch'
    return out


# ----------------------------------------------------------------------------
# sampling plan

def strata_plan() -> dict:
    """{(portal, year): k}. 20 per portal over 12 years: year i gets 1, and the
    first 8 years (2015-2022) get a second draw. Fixed, documented allocation."""
    plan = {}
    for portal in ('central', 'state'):
        for i in range(PER_PORTAL):
            key = (portal, YEARS[i % len(YEARS)])
            plan[key] = plan.get(key, 0) + 1
    return plan


PORTAL_CODE = {'central': 0, 'state': 1}


# ----------------------------------------------------------------------------
# data access (duckdb + pyarrow; imported lazily so the tests need neither)

def open_table(arrow_dir: str):
    import pyarrow as pa
    import pyarrow.ipc as ipc
    tabs = []
    for f in ARROW_FILES:
        mm = pa.memory_map(os.path.join(arrow_dir, f), 'r')
        # HF datasets shards are the Arrow IPC *stream* format (open_file raises
        # "Not an Arrow file").
        tabs.append(ipc.open_stream(mm).read_all())
    return pa.concat_tables(tabs)


def sha256_16(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 24), b''):
            h.update(chunk)
    return h.hexdigest()[:16]


def draw_sample(con, seed: int = SEED):
    rng = random.Random(seed)
    con.execute(SQL_CAND)
    chosen = []
    plan = strata_plan()
    shortfall = []
    for portal in ('central', 'state'):
        for y in YEARS:
            k = plan[(portal, y)]
            ids = [r[0] for r in con.execute(SQL_STRATUM, [PORTAL_CODE[portal], y]).fetchall()]
            if len(ids) < k:
                shortfall.append({'portal': portal, 'year': y, 'wanted': k, 'available': len(ids)})
                chosen.extend(ids)
            else:
                chosen.extend(rng.sample(ids, k))
    rows = con.execute(SQL_ROWS, [chosen]).fetchall()
    cols = ['internal_id', 'tender_id', 'portal_type', 'y', 'organisation_name', 'selected_bidder',
            'bids_received', 'contract_value_amount', 'aoc_at', 'detail_url']
    return [dict(zip(cols, r)) for r in rows], shortfall


# ----------------------------------------------------------------------------
# fetching

def fetch(url: str, out_path: str):
    """curl -sS -L -A UA; returns (status, body). Never follows more than curl's
    default redirects; 60 s cap."""
    r = subprocess.run(['curl', '-sS', '-L', '-A', UA, '--max-time', '60', '-o', out_path,
                        '-w', '%{http_code}', url], capture_output=True, text=True)
    try:
        status = int(r.stdout.strip() or 0)
    except ValueError:
        status = 0
    body = ''
    if os.path.exists(out_path):
        with open(out_path, encoding='utf-8', errors='replace') as fh:
            body = fh.read()
    return status, body, r.stderr.strip()


# ----------------------------------------------------------------------------
# main

def git_sha() -> str:
    try:
        return subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=REPO,
                              capture_output=True, text=True).stdout.strip() or 'unknown'
    except OSError:
        return 'unknown'


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--arrow-dir', default=os.environ.get('CPPP_ARROW_DIR', DEFAULT_ARROW_DIR))
    ap.add_argument('--fetch-dir', default=os.environ.get('CPPP_FETCH_DIR', DEFAULT_FETCH_DIR))
    ap.add_argument('--out', default=OUT_PATH)
    ap.add_argument('--seed', type=int, default=SEED)
    ap.add_argument('--dry-run', action='store_true', help='draw only; no network, no JSON')
    ap.add_argument('--delay', type=float, default=DELAY_S)
    ap.add_argument('--reuse-fetched', action='store_true',
                    help='re-read the bodies already saved in --fetch-dir instead of fetching again')
    args = ap.parse_args(argv)

    import duckdb
    t0 = time.time()
    table = open_table(args.arrow_dir)
    con = duckdb.connect()
    con.register('t', table)
    total_rows, distinct_tids = con.execute(SQL_TOTALS).fetchone()
    print(f'opened {total_rows:,} rows in {time.time() - t0:.1f}s', file=sys.stderr)

    rows, shortfall = draw_sample(con, args.seed)
    n_cand = con.execute('SELECT count(*) FROM cand').fetchone()[0]
    print(f'candidates {n_cand:,}; drew {len(rows)} rows; shortfall {shortfall}', file=sys.stderr)
    for r in rows:
        assert is_marked(r['selected_bidder']), r['tender_id']   # drawn from marked winners only
    if args.dry_run:
        for r in rows:
            print(r['portal_type'], r['y'], r['tender_id'], r['detail_url'][:60])
        return 0

    os.makedirs(args.fetch_dir, exist_ok=True)
    results = []
    page_classes = {}
    agreement = {f: {v: 0 for v in VERDICTS} for f in FIELDS}
    for i, r in enumerate(rows):
        portal = 'central' if r['portal_type'] == 0 else 'state'
        fname = os.path.join(args.fetch_dir, f'{i:02d}-{portal}-{r["y"]}.html')
        if args.reuse_fetched and os.path.exists(fname) and os.path.exists(fname + '.status'):
            with open(fname, encoding='utf-8', errors='replace') as fh:
                body = fh.read()
            with open(fname + '.status', encoding='utf-8') as fh:
                status, err = int(fh.readline().strip() or 0), fh.read().strip()
            fetched_at = datetime.utcfromtimestamp(os.path.getmtime(fname))
        else:
            status, body, err = fetch(r['detail_url'], fname)
            fetched_at = datetime.utcnow()
            with open(fname + '.status', 'w', encoding='utf-8') as fh:
                fh.write(f'{status}\n{err}\n')
        cls = classify_page(body, status)
        page_classes[cls] = page_classes.get(cls, 0) + 1
        parsed = parse_aoc(body) if cls == 'aoc' else None
        verdicts = compare(r, parsed)
        for f, v in verdicts.items():
            agreement[f][v] += 1
        rec = {
            'tender_id': r['tender_id'],
            'portal': portal,
            'year': r['y'],
            'organisation_name': r['organisation_name'],
            'selected_bidder': r['selected_bidder'],          # marked by construction; re-asserted below
            'detail_url': r['detail_url'],
            'dataset': {
                'bids_received': r['bids_received'],
                'contract_value_amount': r['contract_value_amount'],
                'aoc_date': _row_date(r['aoc_at']),
            },
            'fetch': {
                'httpStatus': status,
                'bytes': len(body.encode('utf-8', errors='replace')),
                'sha256_16': hashlib.sha256(body.encode('utf-8', errors='replace')).hexdigest()[:16],
                'pageClass': cls,
                'curlError': err or None,
                'fetchedAt': fetched_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
            },
            'parsed': parsed,
            'verdicts': verdicts,
        }
        results.append(rec)
        print(f'[{i + 1:02d}/{len(rows)}] {portal} {r["y"]} {r["tender_id"]} -> {status} {cls} '
              f'{verdicts["bids_received"]}', file=sys.stderr)
        if i + 1 < len(rows) and not args.reuse_fetched:
            time.sleep(args.delay)

    page_gone = sum(1 for x in results if x['fetch']['pageClass'] != 'aoc')
    doc = {
        'title': 'CPPP live verification sample: 40 marked-winner awards against their detail_url',
        'asOf': AS_OF,
        'seed': args.seed,
        'rng': 'python random.Random(seed).sample over sorted internal_ids per stratum; strata visited '
               'central then state, years ascending 2015-2026',
        'strata': [{'portal': p, 'year': y, 'k': k} for (p, y), k in strata_plan().items()],
        'strataShortfall': shortfall,
        'markerRegex': MARKER.pattern,
        'markedRule': MARKED_RULE,
        'redraw': ('the first 2026-09-26 draw tested markerRegex against the whole selected_bidder string and '
                   'admitted comma-joined lists carrying bare personal names; this file applies the component '
                   'rule, which shrinks the candidate set, so with the same seed and RNG these 40 rows differ '
                   'from that first draw'),
        'fetchMethod': f'curl -sS -L -A "{UA}" --max-time 60, {args.delay:g}s delay between requests; '
                       'detail_url fetched verbatim, never rewritten',
        'pageClasses': page_classes,
        'pageGone': page_gone,
        'finding': FINDING if page_gone == len(results) else None,
        'agreement': agreement,
        'verdictRule': {
            'match': 'page value equals dataset value (bids: int; bidder: casefolded alnum; value: within 0.5; '
                     'date: same calendar day)',
            'mismatch': 'page shows a value that differs, or the dataset is null where the page has a value',
            'missing': 'the page is an AOC page but does not show the field',
            'page_gone': 'the URL did not return an AOC page (invalid_url / captcha / not_found / unrecognised)',
        },
        'refusal': f'rows drawn only from marked winners — {MARKED_RULE}; the bidder address column is never '
                   'read; assert_emittable() re-checks every name component and every key before writing',
        'rows': results,
        'provenance': {
            'inputs': [{'file': f, 'bytes': os.path.getsize(os.path.join(args.arrow_dir, f)),
                        'sha256_16': sha256_16(os.path.join(args.arrow_dir, f))} for f in ARROW_FILES],
            'rows': total_rows,
            'distinctTenderIds': distinct_tids,
            'candidateRows': n_cand,
            'dedupRule': DEDUP_RULE,
            'sql': {'cand': SQL_CAND, 'stratum': SQL_STRATUM, 'rows': SQL_ROWS, 'totals': SQL_TOTALS},
            'generatedBy': f'scripts/cppp/verify_sample.py@{git_sha()}',
            'asOf': AS_OF,
        },
    }
    assert_emittable(doc)
    text = json.dumps(doc, indent=2, ensure_ascii=False, default=str)
    if 'selected_bidder_address' in text:
        raise RefusalError('address text in output')
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as fh:
        fh.write(text + '\n')
    print(f'wrote {args.out}; page_gone {page_gone}/{len(results)}; agreement {json.dumps(agreement)}',
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
