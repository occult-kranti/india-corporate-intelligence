"""Metadata-only regressions: python3 -m unittest scripts/cppp/test_provenance.py."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from scripts.cppp.provenance import (
    AUDIT_DATE, GIST_REVISION, GIST_URL, HF_REVISION, HF_TREE_RETRIEVED_AT,
    HF_TREE_URL, RECORDED_INPUTS, REMOTE_INPUTS, SCRAPED_AT,
    annotate_existing, lineage_metadata,
)
from scripts.cppp.test_date_semantics import restore_approved_date_copy

ROOT = Path(__file__).resolve().parents[2]
ATTRIBUTION_KEYS = {"dataset", "scrapedAt", "lineageAudit"}
# Canonical SHA-256 of each complete JSON document before the attribution repair.
# Covers all numbers, SQL, original inputs, asOf and generatedBy, including the sample.
# Restore only the separately authorized date-semantics copy/audit paths before hashing.
BASELINE_SHA256 = {
    "concentration.json": "62e89398654eafac38e8fb6182717972930630f40b76c6724fd42f17274ca9f0",
    "provenance.json": "648a245f56d3cc895be5fcd59fde02d04f84477ea6e74c33329834cdc0a98f75",
    "quality.json": "a6b806675ea5b931dac83c7c466b696a9e26bc62f90ff253b0c5758b8d629d3b",
    "rates.json": "a2cf7ed086c58e19609293b40105bee3231824482665786877d2504d05b7c449",
    "redflags.json": "fc7c2e614db5d4aafe7341632f099742817b7ea11b2e4e8f69603b035e25eef0",
    "sample-verification.json": "db4493815c6c17e9c3e9a43dbe2c5e5df701a0db5b5380be04ade09a49179e57",
    "security.json": "6e7e0c314a2becfa49bfa79a418d838ed5d955e149efa25b7ddc3168323d7d5e",
    "timing.json": "93ce151608c22130236ed8daf238f9767554613119b905c38735e9aef90f2922",
}


class AttributionMetadata(unittest.TestCase):
    def test_archived_payloads_unchanged_and_required_fields_present(self):
        for name, digest in BASELINE_SHA256.items():
            with self.subTest(file=name):
                doc = json.loads((ROOT / "research/raw/cppp" / name).read_text())
                p = doc["provenance"]
                self.assertEqual({key: p[key] for key in ATTRIBUTION_KEYS},
                                 lineage_metadata(p["inputs"], metadata_only=True))
                self.assertEqual(set(p["dataset"]), {"name", "url", "licence", "scraper"})
                self.assertIn("asserted", p["dataset"]["licence"])
                self.assertIn("unresolved", p["dataset"]["licence"])
                self.assertEqual(p["lineageAudit"]["asOf"], AUDIT_DATE)
                for key in ATTRIBUTION_KEYS:
                    del p[key]
                doc = restore_approved_date_copy(doc, name)
                canonical = json.dumps(doc, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
                self.assertEqual(hashlib.sha256(canonical).hexdigest(), digest)

    def test_revision_claims_agree_with_opened_receipts(self):
        evidence = ROOT / "research/raw/tender-portal-audit/evidence"
        gist = json.loads((evidence / "conversion-gist.json").read_text())
        hf = json.loads((evidence / "hf-meta.body").read_text())
        receipt = json.loads((evidence / "hf-readme.receipt.json").read_text())
        self.assertEqual(gist["html_url"], GIST_URL)
        self.assertEqual(gist["history"][0]["version"], GIST_REVISION)
        self.assertEqual(hf["sha"], HF_REVISION)
        self.assertEqual(receipt["headers"]["x-repo-commit"], HF_REVISION)

    def test_remote_full_hashes_match_receipts_and_retained_prefixes(self):
        evidence = ROOT / "research/raw/tender-portal-audit/evidence"
        tree = json.loads((evidence / "hf-tree.json").read_text())
        receipt = json.loads((evidence / "hf-tree.receipt.json").read_text())
        self.assertEqual(receipt["url"], HF_TREE_URL)
        self.assertEqual(receipt["retrievedAt"], HF_TREE_RETRIEVED_AT)
        indexed = {entry["path"]: entry for entry in tree}
        for remote, retained in zip(REMOTE_INPUTS, RECORDED_INPUTS):
            entry = indexed[remote["file"]]
            self.assertEqual(remote["sha256"], entry["lfs"]["oid"])
            self.assertEqual(remote["bytes"], entry["lfs"]["size"])
            self.assertEqual(remote["bytes"], entry["size"])
            self.assertEqual(remote["file"], retained["file"])
            self.assertEqual(remote["bytes"], retained["bytes"])
            self.assertEqual(remote["sha256"][:16], retained["sha256_16"])

    def test_scrape_range_uses_verified_award_details_only(self):
        root = ROOT / "research/raw/tender-portal-audit"
        analysis = json.loads((root / "analysis.json").read_text())
        receipt = json.loads((root / "evidence/aoc_tenders.db.download-receipt.json").read_text())
        stages = {row["grain"]: row for row in analysis["queries"]["detail_integrity"]["rows"]}
        awards = stages["awards"]
        value = " to ".join(awards[key].replace(" ", "T") for key in ("earliest_scrape", "latest_scrape"))
        self.assertEqual(SCRAPED_AT["value"], value)
        self.assertNotIn(stages["notices"]["earliest_scrape"].split(" ")[0], value)
        self.assertEqual(receipt["status"], "verified-published-sha256")
        self.assertEqual(receipt["sha256"], receipt["expectedSHA256"])
        self.assertEqual(analysis["sourceHashes"]["aoc_tenders.db"], receipt["sha256"])
        self.assertIn(receipt["sha256"], SCRAPED_AT["method"])
        self.assertIn(analysis["retrievedAt"], SCRAPED_AT["method"])

    def test_other_inputs_never_inherit_source_or_scrape_date(self):
        candidates = [[], [{"file": "fixture.arrow", "bytes": 100, "sha256_16": "0" * 16}],
                      RECORDED_INPUTS[:1], RECORDED_INPUTS + RECORDED_INPUTS[:1]]
        for field, replacement in [("file", "other.arrow"), ("bytes", 1), ("sha256_16", "0" * 16)]:
            changed = deepcopy(RECORDED_INPUTS)
            changed[0][field] = replacement
            candidates.append(changed)
        for inputs in candidates:
            with self.subTest(inputs=inputs):
                metadata = lineage_metadata(inputs)
                self.assertNotIn("scrapedAt", metadata)
                self.assertIn("Unattributed", metadata["dataset"]["name"])
                self.assertEqual(metadata["dataset"]["scraper"], "Unverified for these inputs")
                self.assertEqual(metadata["lineageAudit"]["inputCheck"]["status"], "does-not-match-retained-input-record")

    def test_matching_inputs_claim_only_remote_prefix_and_size_link(self):
        current = lineage_metadata(list(reversed(RECORDED_INPUTS)))
        audit = current["lineageAudit"]
        self.assertEqual(audit["inputCheck"]["status"], "matches-retained-input-record")
        self.assertIn("prefixes match remotely reported", audit["inputCheck"]["hfSnapshotCryptographicLink"])
        remote = audit["inputCheck"]["remoteSnapshot"]
        self.assertEqual(remote["files"], REMOTE_INPUTS)
        self.assertTrue(remote["retainedPrefixAndSizeMatch"])
        self.assertFalse(remote["localFullHashVerified"])
        self.assertEqual(audit["mode"], "pipeline-emitted source metadata")
        current["dataset"]["name"] = "mutated"
        self.assertNotEqual(lineage_metadata(RECORDED_INPUTS)["dataset"]["name"], "mutated")

    def test_annotation_is_idempotent_and_preserves_original_generator(self):
        doc = {"metric": 42, "provenance": {"inputs": RECORDED_INPUTS, "asOf": "2026-09-26",
                                           "generatedBy": "original", "sql": {"count": "SELECT 42"}}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "example.json"
            path.write_text(json.dumps(doc))
            self.assertEqual(annotate_existing(Path(directory)), 1)
            first = path.read_bytes()
            annotate_existing(Path(directory))
            self.assertEqual(first, path.read_bytes())
            annotated = json.loads(first)
            for key in ATTRIBUTION_KEYS:
                del annotated["provenance"][key]
            self.assertEqual(annotated, doc)


if __name__ == "__main__":
    unittest.main()
