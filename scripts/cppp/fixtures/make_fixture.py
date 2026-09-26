#!/usr/bin/env python3
"""Write scripts/cppp/fixtures/fixture.arrow: ~2,000 SYNTHETIC CPPP award rows.

Every value here is invented. Winner names are either synthetic firms carrying a
legal-form marker ("M/s Alpha Infra Pvt Ltd") or synthetic bare names ("ramesh
kumar") that stand in for the personal names in the real scrape; the tests assert
that no bare name ever reaches an output. Addresses carry the sentinel
"ADDR-SENTINEL-" so the tests can prove selected_bidder_address is never emitted.

The fixture reproduces every defect class recorded in the 2026-09-26 probe of the
real data: duplicate rows per tender_id (same bidder+AOC → exact duplicates; different
bidders → lots), bids_received null / zero / one / >1000, contract_value_amount null /
<= 0 / > 1e12, contract_value_raw '' with a null amount (parse failure), aoc_at before
closing_at, a NULL aoc_at or closing_at, state-portal rows whose organisation_name is the
state, state tender_ids without a department code, dirty tender_type values ('1', '2', '',
None, 'Open'), junk organisations ('test …', '', None), central hierarchies written with
'||' and with '/', and marked, unmarked and comma-joined (marked+bare) winners.

Schema (column names and Arrow types) matches the real files exactly.

Usage: python3 scripts/cppp/fixtures/make_fixture.py [--out PATH] [--seed 2026]
"""
from __future__ import annotations

import argparse
import hashlib
import random
from datetime import datetime, timedelta
from pathlib import Path

import pyarrow as pa
import pyarrow.ipc as ipc

HERE = Path(__file__).resolve().parent
DEFAULT_OUT = HERE / "fixture.arrow"

# --- synthetic vocabularies -------------------------------------------------------
MARKED_WINNERS = [
    "M/s Alpha Infra Pvt Ltd", "Beta Constructions", "Gamma Traders", "Delta Enterprises",
    "Epsilon Engineers & Co.", "Zeta Solutions LLP", "Eta Builders", "Theta Industries Limited",
    "Iota Associates", "Kappa Suppliers", "Lambda Technologies Private Limited", "Mu Udyog Nigam",
    "Nu Gram Vikas Samiti", "Xi and Sons", "Omicron Contractors", "Pi Agencies",
]
UNMARKED_WINNERS = [  # synthetic bare names: must NEVER appear in any output
    "ramesh kumar", "suresh yadav", "priya nair", "anil sharma", "deepak verma",
    "kavita singh", "manoj patel", "rekha das", "vijay rao", "sunita devi",
]
# The portal joins several winners of one tender into one comma-separated string. These
# mix a marked firm with a bare name (as the real data does) and must be treated as
# unmarked as a whole: the firm's marker must not license the person beside it.
MIXED_WINNERS = [
    "Beta Constructions,ramesh kumar", "suresh yadav,Gamma Traders",
    "Delta Enterprises, PROP. anil sharma", "M/s Alpha Infra Pvt Ltd,kavita singh,Eta Builders",
]
MARKED_JOINED_WINNERS = [  # every component marked: may be named
    "Delta Enterprises,Eta Builders", "Gamma Traders; Kappa Suppliers",
]
CENTRAL_ORGS = [  # synthetic public bodies; hierarchy separated by '||' or '/' as on the portal
    "Synthetic Heavy Electricals Ltd||Unit A", "Synthetic Heavy Electricals Ltd||Unit B",
    "National Fixture Power Corporation||Region North", "Fixture Railways||Zone East||Division 1",
    "Fixture Petroleum Corporation Ltd", "Fixture Petroleum Corporation Ltd/RETAIL (LOG)",
    "Fixture Petroleum Corporation Ltd/RETAIL (LOG)/RETAIL (LOG)-WR", "Fixture Petroleum Corporation Ltd / LPG",
    "Directorate of Fixture Roads", "Fixture Atomic Energy Board", "Central Fixture Warehousing Corporation",
]
STATE_ORGS = ["Kerala", "West Bengal", "Maharashtra", "Madhya Pradesh"]
DEPT_CODES = ["PWD", "LSGD", "ZPHD", "WRDD", "PHED", "UAD", "MAD"]
JUNK_ORGS = ["test", "Test Organisation", "test dept", "", None, "TESTING"]
TENDER_TYPES_CLEAN = ["Works", "Works", "Works", "Works", "Goods", "Services", "Limited"]
TENDER_TYPES_DIRTY = ["1", "2", "", None, "Open", "open", "LIMITED", "Open Tender", "Limited Tender(Mtrl)", "LT", "Single Tender(Urg-M)", "Nomination"]
TITLES = ["Construction of road", "Supply of pipes", "Repair of building", "Consultancy services",
          "Supply of transformers", "Drain works", "Annual maintenance", "Civil works ward 7"]
COMPLETION = ["3 Months", "6 Months", "12 Months", "45 Days", None]


def _hex_id(rng: random.Random) -> str:
    return hashlib.md5(str(rng.random()).encode()).hexdigest()


def _heavy(org) -> bool:
    """Buyers where one joined winner recurs >= 5 times, so it would be NAMED under a
    whole-string marker test — the leak the component rule closes."""
    return org is not None and (org.startswith("Synthetic Heavy Electricals") or org.startswith("Fixture Petroleum"))


def _pick_winner(rng: random.Random, marked_p: float, org=None) -> str:
    r = rng.random()
    if _heavy(org):
        if r < 0.15:
            return MIXED_WINNERS[0]               # 'Beta Constructions,ramesh kumar', many awards
        if r < 0.27:
            return MARKED_JOINED_WINNERS[0]       # 'Delta Enterprises,Eta Builders', many awards
    if r < 0.06:
        return rng.choice(MIXED_WINNERS)          # joined list with a bare name inside
    if r < 0.10:
        return rng.choice(MARKED_JOINED_WINNERS)  # joined list, every component marked
    return rng.choice(MARKED_WINNERS) if rng.random() < marked_p else rng.choice(UNMARKED_WINNERS)


def make_rows(seed: int = 2026, n_tenders: int = 950) -> list[dict]:
    rng = random.Random(seed)
    rows: list[dict] = []
    t0 = datetime(2018, 1, 1)

    def base_row(tender_id, portal_type, portal_year, org, aoc, closing, bidder, bids, amount, ttype, dept):
        raw = "" if amount is None and rng.random() < 0.5 else (None if amount is None else (f"{amount:.2f}" if rng.random() < 0.3 else f"{int(amount)}"))
        bids_raw = None if bids is None else ("" if bids is None else str(bids))
        return {
            "internal_id": _hex_id(rng),
            "tender_id": tender_id,
            "portal_type": portal_type,
            "portal_year": portal_year,
            "partition_id": rng.randint(1, 20),
            "sl_no": f"{rng.randint(1, 99999)}.",
            "organisation_name": org,
            "title": rng.choice(TITLES),
            "reference_number": f"REF/{rng.randint(1000, 9999)}/{portal_year}",
            "tender_type": ttype,
            "tender_description": rng.choice(TITLES) + " (synthetic)",
            "aoc_at": aoc,
            "closing_at": closing,
            "contract_at": aoc + timedelta(days=rng.randint(0, 30)) if aoc is not None and rng.random() < 0.8 else None,
            "award_published_at": aoc + timedelta(days=rng.randint(0, 10)) if aoc is not None else None,
            "contract_value_raw": raw,
            "contract_value_amount": amount,
            "bids_received_raw": bids_raw,
            "bids_received": bids,
            "selected_bidder": bidder,
            "selected_bidder_address": None if bidder is None else f"ADDR-SENTINEL-{rng.randint(1, 10**6)} Fixture Street, {dept or 'Central'}",
            "completion_period_raw": rng.choice(COMPLETION),
            "detail_url": f"https://example.invalid/aoc/{tender_id}",
            "tender_document_url": f"https://example.invalid/doc/{tender_id}",
        }

    for i in range(n_tenders):
        portal_type = 1 if rng.random() < 0.6 else 0
        year = rng.choice([2019, 2020, 2021, 2022, 2023, 2024, 2025])
        closing = t0 + timedelta(days=rng.randint(0, 365 * 8), hours=rng.randint(9, 17))
        # decision window: many quick decisions (<=2 days) and a long tail
        days = rng.choice([0, 1, 1, 2, 3, 5, 8, 14, 21, 30, 45, 60, 90, 150, 400])
        aoc = closing + timedelta(days=days)
        dept = None
        if portal_type == 1:
            org = rng.choice(STATE_ORGS)
            if rng.random() < 0.12:
                tender_id = str(rng.randint(10000, 99999999))  # no department code
            else:
                dept = rng.choice(DEPT_CODES)
                tender_id = f"{year}_{dept}_{rng.randint(1000, 999999)}_{rng.randint(1, 9)}"
        else:
            org = rng.choice(CENTRAL_ORGS)
            tender_id = f"{year}_{rng.choice(['MES', 'BHEL', 'NTPC', 'IOCL'])}_{rng.randint(1000, 999999)}_{rng.randint(1, 9)}"
        # buyer-specific single-bidder propensity so the redflag families have structure
        single_p = 0.55 if org in (STATE_ORGS[0], CENTRAL_ORGS[0]) else 0.18
        marked_p = 0.75 if portal_type == 0 else 0.45

        def draw_bids():
            r = rng.random()
            if r < 0.06:
                return None
            if r < 0.10:
                return 0
            if r < 0.10 + single_p * 0.85:
                return 1
            if r < 0.985:
                return rng.randint(2, 40)
            return rng.randint(1001, 5000)

        def draw_amount():
            r = rng.random()
            if r < 0.06:
                return None
            if r < 0.10:
                return rng.choice([0.0, -1.0, -250000.0])
            if r < 0.11:
                return rng.choice([2.5e12, 9.9e13])
            return float(round(10 ** rng.uniform(4.5, 9.5), 2))

        ttype = rng.choice(TENDER_TYPES_CLEAN) if rng.random() < 0.8 else rng.choice(TENDER_TYPES_DIRTY)
        if rng.random() < 0.03:
            org = rng.choice(JUNK_ORGS)
        if rng.random() < 0.05:  # AOC before closing — date-order violation
            aoc = closing - timedelta(days=rng.randint(1, 40))
        # a missing date (0 rows in the 2026-09-26 scrape; the pipeline must count them if they appear)
        r_null = rng.random()
        if r_null < 0.01:
            aoc = None
        elif r_null < 0.02:
            closing = None

        bidder = _pick_winner(rng, marked_p, org)
        bids = draw_bids()
        amount = draw_amount()
        if bids is None and rng.random() < 0.6:  # the real "all missing" rows
            bidder, amount, ttype = None, None, None
        rows.append(base_row(tender_id, portal_type, year, org, aoc, closing, bidder, bids, amount, ttype, dept))

        # lots and duplicates
        r = rng.random()
        if r < 0.22:  # exact duplicates: same bidder, same AOC, new internal_id
            for _ in range(rng.randint(1, 3)):
                dup = dict(rows[-1])
                dup["internal_id"] = _hex_id(rng)
                dup["sl_no"] = f"{rng.randint(1, 99999)}."
                rows.append(dup)
        elif r < 0.42:  # lots: same tender_id, different bidders (some same AOC, some not)
            for _ in range(rng.randint(1, 4)):
                lot_aoc = aoc if aoc is None or rng.random() < 0.6 else aoc + timedelta(days=rng.randint(1, 20))
                rows.append(base_row(tender_id, portal_type, year, org, lot_aoc, closing,
                                     _pick_winner(rng, marked_p, org), draw_bids(), draw_amount(), ttype, dept))
        elif r < 0.50 and aoc is not None:  # same bidder, later AOC (a re-award, kept by the dedup rule)
            rows.append(base_row(tender_id, portal_type, year, org, aoc + timedelta(days=rng.randint(1, 60)), closing,
                                 bidder, draw_bids(), draw_amount(), ttype, dept))
    return rows


def to_table(rows: list[dict]) -> pa.Table:
    schema = pa.schema([
        ("internal_id", pa.string()), ("tender_id", pa.string()), ("portal_type", pa.int64()),
        ("portal_year", pa.int64()), ("partition_id", pa.int64()), ("sl_no", pa.string()),
        ("organisation_name", pa.string()), ("title", pa.string()), ("reference_number", pa.string()),
        ("tender_type", pa.string()), ("tender_description", pa.string()),
        ("aoc_at", pa.timestamp("us")), ("closing_at", pa.timestamp("us")),
        ("contract_at", pa.timestamp("us")), ("award_published_at", pa.timestamp("us")),
        ("contract_value_raw", pa.string()), ("contract_value_amount", pa.float64()),
        ("bids_received_raw", pa.string()), ("bids_received", pa.int32()),
        ("selected_bidder", pa.string()), ("selected_bidder_address", pa.string()),
        ("completion_period_raw", pa.string()), ("detail_url", pa.string()),
        ("tender_document_url", pa.string()),
    ])
    cols = {f.name: [r[f.name] for r in rows] for f in schema}
    return pa.table(cols, schema=schema)


def write_fixture(out: Path = DEFAULT_OUT, seed: int = 2026) -> int:
    table = to_table(make_rows(seed))
    out.parent.mkdir(parents=True, exist_ok=True)
    with pa.OSFile(str(out), "wb") as sink, ipc.new_stream(sink, table.schema) as w:
        w.write_table(table)
    return table.num_rows


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--seed", type=int, default=2026)
    a = ap.parse_args()
    n = write_fixture(a.out, a.seed)
    print(f"wrote {n} synthetic rows to {a.out}")
