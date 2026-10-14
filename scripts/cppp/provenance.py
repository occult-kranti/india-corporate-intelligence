"""Source attribution only; no Arrow, SQL, network or analytical dependencies.

The audit records observed source claims, not a verified extraction/conversion chain.
Run this module with --annotate-dir to reproduce the 2026-10-06 metadata-only repair.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import json
from pathlib import Path

AUDIT_DATE = "2026-10-06"
HF_URL = "https://huggingface.co/datasets/rumourscape/tenders"
HF_REVISION = "401d093cc74d7a05e7d48326c1bc11edb289d7bb"
HF_TREE_RETRIEVED_AT = "2026-10-06T23:05:51.913316+00:00"
HF_TREE_URL = f"https://huggingface.co/api/datasets/rumourscape/tenders/tree/{HF_REVISION}?recursive=true&expand=true"
GIST_URL = "https://gist.github.com/rhnvrm/8060dedb15ae592dae492ec62f725c0c"
GIST_REVISION = "593ed6da09866ca75bd016fecd863546a4c48df2"
EVIDENCE = "research/raw/tender-portal-audit/evidence/"
RECORDED_INPUTS = [
    {"file": "data-00000-of-00002.arrow", "bytes": 1796891632, "sha256_16": "95e997785ecab0a9"},
    {"file": "data-00001-of-00002.arrow", "bytes": 1656131440, "sha256_16": "d7663349efb13547"},
]
REMOTE_INPUTS = [
    {"file": "data-00000-of-00002.arrow", "bytes": 1796891632,
     "sha256": "95e997785ecab0a93abe02cb1ca7c4c246270f554bc4f03d3994d2b1b3c3b909"},
    {"file": "data-00001-of-00002.arrow", "bytes": 1656131440,
     "sha256": "d7663349efb13547078a21983144e2f20823e610555403f2d10e402200797349"},
]
DATASET = {
    "name": "CPPP award scrape, HF rumourscape/tenders Arrow mirror",
    "url": HF_URL,
    "licence": "CC-BY-4.0 asserted by the HF republisher; underlying portal licensing unresolved",
    "scraper": "Sarthak Sidhant, tender.sarthaksidhant.com (credited by the HF dataset card)",
}
SCRAPED_AT = {
    "value": "2026-06-18T11:05:10.031221 to 2026-06-24T01:26:48.718329",
    "method": (
        "Observed min/max of aoc_details.scraped_at after TIMESTAMP parsing, award-detail stage only: "
        "research/raw/tender-portal-audit/analysis.json queries.detail_integrity rows[grain=awards], "
        "analysis retrievedAt 2026-10-06T23:04:37.424875+00:00. Source aoc_tenders.db SHA-256 "
        "ec8ef7711a17b7cae9e0414c2403b119a0a31c4dec49ed7055b38ec0df5f7586 matches the publisher's "
        "full hash; see research/raw/tender-portal-audit/evidence/aoc_tenders.db.download-receipt.json. "
        "Supersedes the older approximate June 19-24 catalogue range. Notice-detail dates are a "
        "separate stage. No timezone is asserted for these source timestamps; this is not a fresh "
        "Arrow measurement or the original analytical computation date."
    ),
}


def matches_recorded_inputs(inputs: list[dict]) -> bool:
    """Compare all three retained identifiers, including file multiplicity."""
    key = lambda item: (item.get("file"), item.get("bytes"), item.get("sha256_16"))
    return sorted(map(key, inputs), key=repr) == sorted(map(key, RECORDED_INPUTS), key=repr)


def lineage_metadata(inputs: list[dict], *, metadata_only: bool = False) -> dict:
    """Return fresh metadata; never attribute arbitrary/fixture inputs to the mirror."""
    matched = matches_recorded_inputs(inputs)
    result = {
        "dataset": deepcopy(DATASET) if matched else {
            "name": "Unattributed CPPP-format Arrow inputs (HF URL is a historical source reference only)",
            "url": HF_URL,
            "licence": "Unknown for these inputs; historical HF mirror asserts CC-BY-4.0, underlying portal licensing unresolved",
            "scraper": "Unverified for these inputs",
        },
        "lineageAudit": {
            "asOf": AUDIT_DATE,
            "mode": "metadata-only annotation" if metadata_only else "pipeline-emitted source metadata",
            "note": (
                "Attribution added without rerunning extraction, conversion, SQL, metrics or portal verification; "
                "existing asOf, generatedBy, inputs and analytical payload are preserved."
                if metadata_only else
                "Source audit date describes the retained receipts, not this run. Analytical execution is "
                "recorded separately by provenance.asOf, generatedBy, inputs and sql."
            ),
            "inputCheck": {
                "status": "matches-retained-input-record" if matched else "does-not-match-retained-input-record",
                "method": "Exact multiset comparison of filenames, byte sizes and retained 16-hex SHA-256 prefixes",
                "recordedInputs": deepcopy(RECORDED_INPUTS),
                "hfSnapshotCryptographicLink": (
                    "retained filenames, sizes and SHA-256 prefixes match remotely reported HF LFS hashes"
                    if matched else "current inputs do not match the retained HF-linked input record"
                ),
                "remoteSnapshot": {
                    "revision": HF_REVISION,
                    "url": HF_TREE_URL,
                    "retrievedAt": HF_TREE_RETRIEVED_AT,
                    "hashSource": "HF tree API lfs.oid (SHA-256) and lfs.size; remotely reported, not a local full-file rehash",
                    "files": deepcopy(REMOTE_INPUTS),
                    "retainedPrefixAndSizeMatch": True,
                    "localFullHashVerified": False,
                    "evidence": [EVIDENCE + "hf-tree.json", EVIDENCE + "hf-tree.receipt.json"],
                },
                "limitation": (
                    "The retained Arrow filenames, sizes and 64-bit SHA-256 prefixes match the full LFS "
                    "hashes remotely reported for the pinned HF snapshot. Historical provenance retains "
                    "only prefixes, not verified local full hashes or the revision at download. The absent "
                    "historical Arrow files were not locally rehashed during this metadata audit. This "
                    "supports the snapshot linkage at prefix-and-size level; it does not establish a local "
                    "full-hash match, the converter revision used, or agreement with official portal records."
                ),
            },
            "referenceChain": [
                {"stage": "official portal", "name": "Central Public Procurement Portal (CPPP)",
                 "url": "https://eprocure.gov.in/", "basis": "Source claimed by publisher and HF dataset card; row agreement unverified"},
                {"stage": "scraper and original publisher", "name": "Sarthak Sidhant",
                 "url": "https://tender.sarthaksidhant.com/",
                 "evidence": [EVIDENCE + "portal-home.html", EVIDENCE + "portal-home.receipt.json", EVIDENCE + "hf-readme.body"]},
                {"stage": "conversion recipe", "name": "Rohan Verma (rhnvrm)", "url": GIST_URL,
                 "observedRevision": GIST_REVISION,
                 "basis": "HF README credits this recipe. Its awards_core joins award listings to award details within the award stage, not tender notices to awards; observing its revision does not identify the version used for the Arrow files",
                 "evidence": [EVIDENCE + "conversion-gist.json", EVIDENCE + "conversion-gist.receipt.json"]},
                {"stage": "HF republisher and Arrow mirror", "name": "rumourscape/tenders", "url": HF_URL,
                 "observedRevision": HF_REVISION, "licence": DATASET["licence"],
                 "basis": "The retained Arrow schema is award listings plus award details within the award stage, not a notice-to-award join",
                 "evidence": [EVIDENCE + "hf-meta.body", EVIDENCE + "hf-meta.receipt.json", EVIDENCE + "hf-readme.body",
                              EVIDENCE + "hf-readme.receipt.json", EVIDENCE + "hf-state.json", EVIDENCE + "hf-state.receipt.json",
                              EVIDENCE + "hf-schema.json", EVIDENCE + "hf-tree.json", EVIDENCE + "hf-tree.receipt.json"]},
                {"stage": "retained local Arrow input record", "basis": "See provenance.inputs and lineageAudit.inputCheck; prefixes are not full hashes"},
                {"stage": "local analysis", "basis": "See provenance.generatedBy and provenance.sql where present; sample verification has its own generator"},
            ],
            "referenceScrapedAt": deepcopy(SCRAPED_AT),
        },
    }
    # Unknown dates are omitted: consumers expect a year-leading date/range, not 'unknown'.
    if matched:
        result["scrapedAt"] = deepcopy(SCRAPED_AT)
    return result


def annotate_existing(directory: Path) -> int:
    """Add only the three attribution keys; validate all files before writing any."""
    pending = []
    for path in sorted(directory.glob("*.json")):
        original = path.read_text(encoding="utf-8")
        document = json.loads(original)
        # Main outputs use one space; verify_sample.py uses two. Preserve both.
        key_line = next((line for line in original.splitlines() if line.lstrip().startswith('"')), " ")
        indent = len(key_line) - len(key_line.lstrip()) or 1
        provenance = document["provenance"]
        if not matches_recorded_inputs(provenance["inputs"]):
            raise ValueError(f"{path}: inputs do not match the retained corpus")
        provenance.update(lineage_metadata(provenance["inputs"], metadata_only=True))
        pending.append((path, document, indent))
    for path, document, indent in pending:
        path.write_text(json.dumps(document, ensure_ascii=False, indent=indent) + "\n", encoding="utf-8")
    return len(pending)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--annotate-dir", required=True, type=Path)
    args = parser.parse_args()
    print(f"Annotated {annotate_existing(args.annotate_dir)} existing JSON files; no analysis rerun.")
