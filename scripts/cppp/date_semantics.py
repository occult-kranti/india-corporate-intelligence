"""Interpretation repair only: no SQL execution or analytical recomputation."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

SOURCE = "research/raw/tender-portal-audit/closing-field-semantics.json"
RECORD_ID = "procurement-audit:record:closing-field-semantics"
DATE_GAP_READING = (
    "Collector field mapping, record versions, amendments and timestamp precision remain unresolved. "
    "The observed exact-key subset challenges whether closing_at denotes the submission deadline; "
    "it does not establish the field's meaning throughout the corpus. These gaps cannot establish "
    "evaluation speed, a suspiciously fast award or a fiscal-spending explanation. Original notices, "
    "corrigenda and award documents with their event labels are required before interpreting the gap."
)
DATE_GAP_STANCE = (
    " The retained date-gap entry is a dataset-field diagnostic with unresolved event semantics, "
    "not a measure of evaluation speed."
)


def date_field_semantics(*, metadata_only: bool = False) -> dict:
    return {
        "asOf": "2026-10-06",
        "mode": "metadata-only interpretation correction" if metadata_only else "pipeline-emitted interpretation caveat",
        "source": SOURCE,
        "recordId": RECORD_ID,
        "scope": (
            "Strict one-to-one original-database candidate subset on the central portal, notice-publication "
            "years 2013–2018, heavily concentrated in Neyveli Lignite Corporation Limited; not a random "
            "or representative corpus sample"
        ),
        "finding": (
            "The original award-listing field labelled closing_date aligns with notice publication in "
            "the observed subset rather than establishing the notice submission deadline. Field meanings "
            "outside this bounded subset and the reasons for the mapping remain unresolved."
        ),
        "interpretation": DATE_GAP_READING,
        "preservation": (
            "Only interpretation metadata changed; historical numbers, denominator membership, SQL, "
            "asOf and generatedBy were not recomputed or rewritten."
            if metadata_only else
            "Analytical execution and input identity are recorded separately by provenance.asOf, generatedBy, inputs and sql."
        ),
    }


def timing_definition(*, sliced: bool = False) -> str:
    family = "slice dedup rows" if sliced else "dedup rows"
    total = "dedupRows, per class and in total" if sliced else "dedup rows"
    return (
        f"Recorded dataset-date gap: days = date_diff('day', closing_at, aoc_at) on {family}. "
        "These are recorded field labels with unresolved event semantics, not verified submission-deadline "
        "and evaluation events. Rows with aoc_at < closing_at, and rows where either date is NULL, are "
        f"excluded and counted so that n + excludedAocBeforeClosing + excludedDateMissing = {total}."
    )


def short_gap_definition(days: int) -> str:
    return f"recorded dataset-date gap date_diff('day', closing_at, aoc_at) <= {days}; event semantics unresolved"


def short_gap_family(*, sliced: bool = False) -> str:
    family = "slice deduplicated dataset rows" if sliced else "deduplicated dataset rows"
    target = "slice timing" if sliced else "timing.json"
    return (f"{family} with aoc_at >= closing_at; rows with aoc_at < closing_at or either field NULL "
            f"are excluded and counted in {target}. This is a recorded-field population, not a verified evaluation-period population.")


def annotate_existing(directory: Path) -> int:
    pending = []
    for name in ("timing.json", "redflags.json", "security.json"):
        path = directory / name
        doc = json.loads(path.read_text())
        audit = date_field_semantics(metadata_only=True)
        doc["provenance"]["dateFieldSemanticsAudit"] = audit
        timing = doc if name == "timing.json" else doc.get("timing")
        if timing is not None:
            timing.update(definition=timing_definition(sliced=name == "security.json"),
                          innocentReading=DATE_GAP_READING, fieldSemanticsAudit=audit)
        flags = doc if name == "redflags.json" else doc.get("redflags")
        if flags is not None:
            if not flags["stance"].endswith(DATE_GAP_STANCE):
                flags["stance"] += DATE_GAP_STANCE
            short = next(row for row in flags["indicators"] if row["indicator"] == "shortDecisionWindow")
            short.update(definition=short_gap_definition(2), familyDefinition=short_gap_family(sliced=name == "security.json"),
                         innocentReading=DATE_GAP_READING, fieldSemanticsAudit=audit)
        pending.append((path, doc))
    for path, doc in pending:
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    return len(pending)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--annotate-dir", required=True, type=Path)
    args = parser.parse_args()
    print(f"Corrected interpretation metadata in {annotate_existing(args.annotate_dir)} files; no analysis rerun.")
