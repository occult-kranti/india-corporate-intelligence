#!/usr/bin/env python3
"""Recompute descriptive findings from versioned original-source numeric extracts.

Run from any directory. No network, model predictions or private identifiers.
The inputs retain source totals independently of the recomputed totals.
"""
from decimal import Decimal as D
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read(name):
    return json.loads((ROOT / name).read_text())


def amount(value):
    return D(value) if value is not None else D(0)


def decimal_text(value):
    return str(value.quantize(D("0.01")))


csr = read("pmuy-csr-extract.json")
for key, annual_key, total_key in [
    ("contributions", "reportedAnnualContributions", "reportedContributionsTotal"),
    ("utilization", "reportedAnnualPmuYUtilization", "reportedPmuYUtilizationTotal"),
]:
    rows = csr[key]
    for row in rows:
        assert sum(map(amount, row["annual"])) == D(row["total"]), row
    for column in range(3):
        assert sum(amount(row["annual"][column]) for row in rows) == D(csr[annual_key][column])
    assert sum(D(row["total"]) for row in rows) == D(csr[total_key])
contributions = sum(D(row["total"]) for row in csr["contributions"])
pmuy_use = sum(D(row["total"]) for row in csr["utilization"])
prior_bpl_use = D(csr["additionalPreviousBplSchemeTransfer"])
all_use = pmuy_use + prior_bpl_use
assert all_use == D(csr["reportedTotalUtilization"])
idle = contributions - all_use
assert idle == D(csr["reportedIdleBalance"])

coal = read("coal-auction-extract.json")
for row in coal["rows"]:
    assert len(row["bidderEntries"]) == row["qualifiedEntries"]
    assert sum(x["bidActions"] for x in row["bidderEntries"]) == row["reportedBidActions"]
    # The relationship-group cell is printed independently of independent-QB total.
    # Collapsing each stated group to one entry should reproduce that total.
    group_sizes = list(map(int, row["relatedEntryGroupCounts"].split("+")))
    assert row["qualifiedEntries"] - sum(n - 1 for n in group_sizes) == row["independentQualifiedEntriesReported"]
entries = [x for row in coal["rows"] for x in row["bidderEntries"]]

refills = read("pmuy-refill-extract.json")
state_rows = [row for row in refills["rows"] if row["state"] != "All India"]
national = [row for row in refills["rows"] if row["state"] == "All India"]
assert len(state_rows) == 36 and len(national) == 1
assert len({row["state"] for row in state_rows}) == 36
gaps = [{"state": row["state"], "gap2024_25": decimal_text(D(row["nonPmuy2024_25"]) - D(row["pmuy2024_25"]))} for row in state_rows]
national = national[0]
result = {
    "schemaVersion": 1,
    "generatedBy": "research/investigation-program/raw/resources-welfare/analyze.py",
    "inputSha256": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in ["pmuy-csr-extract.json", "coal-auction-extract.json", "pmuy-refill-extract.json"]},
    "csr": {
        "unit": "INR crore", "asOf": "2019-03-31",
        "contributed": decimal_text(contributions), "pmuyUse": decimal_text(pmuy_use),
        "previousBplSchemeUse": decimal_text(prior_bpl_use),
        "totalUse": decimal_text(all_use), "idleBalance": decimal_text(idle),
        "unexplainedArithmeticResidual": decimal_text(contributions - all_use - idle),
        "idleSharePercent": decimal_text(100 * idle / contributions),
        "interpretation": "Historical idle balance reconciles exactly after the separate previous-BPL transfer. It is not missing money and is not a current balance.",
    },
    "coal": {
        "auctionRows": len(coal["rows"]), "qualifiedBidderEntries": len(entries),
        "sumIndependentQualifiedEntries": sum(row["independentQualifiedEntriesReported"] for row in coal["rows"]),
        "zeroBidActionEntries": sum(x["bidActions"] == 0 for x in entries),
        "bidActions": sum(x["bidActions"] for x in entries),
        "interpretation": "Descriptive totals for CAG's selected related-entry subset, not unique companies and not an estimate of collusion prevalence. All 11 source bid-action totals reconcile.",
    },
    "refills": {
        "stateUtCount": len(state_rows), "completeYear": "FY2024-25",
        "statesWithLowerPmuyThanNonPmuy": sum(D(row["pmuy2024_25"]) < D(row["nonPmuy2024_25"]) for row in state_rows),
        "pmuyBelowThreeCylinders": [row["state"] for row in state_rows if D(row["pmuy2024_25"]) < 3],
        "largestCompleteYearGaps": sorted(gaps, key=lambda row: D(row["gap2024_25"]), reverse=True)[:5],
        "nationalPmuy": national["pmuy2024_25"], "nationalNonPmuy": national["nonPmuy2024_25"],
        "nationalGap": decimal_text(D(national["nonPmuy2024_25"]) - D(national["pmuy2024_25"])),
        "nationalPmuyShareOfNonPmuyPercent": decimal_text(100 * D(national["pmuy2024_25"]) / D(national["nonPmuy2024_25"])),
        "interpretation": "Official aggregate differences, not matched households or a causal effect. FY2025-26 columns are preserved only as the source's April-January annualised projection; no full-year trend is calculated from them.",
    },
}
(ROOT / "computed-findings.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
