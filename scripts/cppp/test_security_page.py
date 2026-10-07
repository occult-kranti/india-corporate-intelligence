"""Tests for scripts/cppp/security_page.py: research/raw/cppp/security.json → security-page.json.

Run: python3 -m unittest scripts/cppp/test_security_page.py   (stdlib only: no duckdb, no pyarrow)

The projection is tested on the committed slice (research/raw/cppp/security.json) and on small
synthetic documents for the guard. The fixture build in test_build.py writes security-page.json
too, and its byte-identical rerun covers that file.
"""
from __future__ import annotations

import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import security_page as SP  # noqa: E402

SRC = SP.DEFAULT_SRC
OUT = SP.DEFAULT_OUT

# Every field /security and the /tenders security-buyers line read (grep of src/pages/Security.tsx,
# src/components/security/*.tsx, src/components/tenders/SecurityBuyers.tsx and src/data/securityView.ts,
# 2026-10-07), plus the spec's SLICE list (SECURITY_PAGE.md §3.2) and classes.map for the one-buyer share.
PAGE_READS = [
    "readMeFirst", "caveat", "headline",
    "classes.definitions", "classes.map",
    "quality.total", "quality.total.rawRows", "quality.total.dedupRows",
    "quality.byClass", "quality.byClass[].class", "quality.byClass[].rawRows", "quality.byClass[].dedupRows",
    "quality.afterDedup", "quality.afterDedup.rule", "quality.afterDedup.rows", "quality.afterDedup.shareOfFileDedupRowsPct",
    "rates.total", "rates.excludingWorks", "rates.byClass", "rates.byClassYear", "rates.innocentReading",
    "rates.byClass[].wholeFileSamePortal", "rates.byClassYear[].wilson95",
    "provenance", "provenance.inputs", "provenance.inputs[].sha256_16", "provenance.asOf", "provenance.dedupRule",
]


def _get(doc, path: str):
    """Resolve a dotted path; a `[]` segment maps over the list."""
    parts = path.split(".")
    cur = [doc]
    for part in parts:
        many = part.endswith("[]")
        key = part[:-2] if many else part
        nxt = []
        for c in cur:
            v = c[key]
            if many:
                nxt.extend(v)
            else:
                nxt.append(v)
        cur = nxt
    return cur


def _canon(x) -> str:
    return json.dumps(x, ensure_ascii=False, indent=1)


def _all_strings(x, prefix: str = ""):
    if isinstance(x, dict):
        for k, v in x.items():
            path = f"{prefix}.{k}" if prefix else k
            yield path + " (key)", k
            yield from _all_strings(v, path)
    elif isinstance(x, list):
        for v in x:
            yield from _all_strings(v, prefix + "[]")
    elif isinstance(x, str):
        yield prefix, x


def _schema_paths(x, prefix: str = "") -> set[str]:
    out = set()
    if isinstance(x, dict):
        for k, v in x.items():
            path = f"{prefix}.{k}" if prefix else k
            out.add(path)
            out |= _schema_paths(v, path)
    elif isinstance(x, list):
        for v in x:
            out |= _schema_paths(v, prefix + "[]")
    return out


@unittest.skipUnless(SRC.exists(), "research/raw/cppp/security.json not built in this copy")
class ProjectionOfTheCommittedSlice(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src_bytes = SRC.read_bytes()
        cls.src = json.loads(cls.src_bytes)
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.tmp = Path(cls.tmpdir.name)
        cls.doc = SP.project(SRC, cls.tmp / "a.json", log=lambda *_: None)
        cls.text = (cls.tmp / "a.json").read_text(encoding="utf-8")
        _, cls.names = SP.winner_fields(cls.src)

    @classmethod
    def tearDownClass(cls):
        cls.tmpdir.cleanup()

    # --- determinism ------------------------------------------------------------------
    def test_two_runs_byte_identical(self):
        SP.project(SRC, self.tmp / "b.json", log=lambda *_: None)
        self.assertEqual((self.tmp / "a.json").read_bytes(), (self.tmp / "b.json").read_bytes())
        self.assertEqual(SP.dump(SP.build_projection(self.src_bytes, "research/raw/cppp/security.json")), self.text)

    def test_committed_page_file_is_current(self):
        self.assertTrue(OUT.exists(), "research/raw/cppp/security-page.json missing: run python3 scripts/cppp/security_page.py")
        self.assertEqual(OUT.read_text(encoding="utf-8"), self.text, "security-page.json is stale: rerun security_page.py")

    def test_writer_matches_the_source_writer(self):
        # the source re-serialised by the projection's writer is the source, byte for byte:
        # same indent, separators, ensure_ascii and float repr as build._write
        self.assertEqual(SP.dump(self.src).encode("utf-8"), self.src_bytes)

    # --- what is kept -----------------------------------------------------------------
    def test_every_page_read_field_present_and_equal(self):
        for path in PAGE_READS:
            with self.subTest(path=path):
                self.assertEqual(_canon(_get(self.doc, path)), _canon(_get(self.src, path)))

    def test_every_keep_path_is_the_source_subtree_verbatim(self):
        for path in SP.KEEP:
            dotted = ".".join(path)
            with self.subTest(path=dotted):
                self.assertEqual(_canon(_get(self.doc, dotted)), _canon(_get(self.src, dotted)))

    def test_key_order_follows_the_source_and_readmefirst_is_first(self):
        keys = list(self.doc)
        self.assertEqual(keys[0], "readMeFirst")
        self.assertEqual(keys[-2:], ["projectedFrom", "dropped"])
        src_order = [k for k in self.src if k in self.doc]
        self.assertEqual(keys[:-2], src_order)
        for parent in ("classes", "quality", "rates"):
            self.assertEqual(list(self.doc[parent]), [k for k in self.src[parent] if k in self.doc[parent]], parent)

    def test_kept_and_dropped_partition_the_source(self):
        dropped = [d["path"] for d in self.doc["dropped"]]
        kept = [".".join(p) for p in SP.KEEP]
        for path in _schema_paths(self.src):
            covered = [p for p in kept + dropped if path == p or path.startswith(p + ".") or path.startswith(p + "[]")]
            ancestor_of_kept = any(k.startswith(path + ".") for k in kept)
            self.assertTrue(covered or ancestor_of_kept, f"{path} neither kept nor listed in dropped")

    # --- what is dropped --------------------------------------------------------------
    def test_winner_lists_dropped_with_the_c14_reason(self):
        reasons = {d["path"]: d["reason"] for d in self.doc["dropped"]}
        for path in ("concentration.byBuyer[].topMarkedWinners", "concentration.byClass[].topMarkedWinners"):
            self.assertEqual(reasons.get(path), "names a winner; the page names none (spec C14)", path)
        for block in ("concentration", "redflags", "timing", "bands", "sliceRule"):
            self.assertIn(block, reasons)
            self.assertNotIn(block, self.doc)
        # the key names survive only as the paths `dropped` lists, never as keys
        keys = {path.rsplit(".", 1)[-1].replace("[]", "") for path in _schema_paths(self.doc)}
        self.assertNotIn("topMarkedWinners", keys)
        self.assertNotIn("msOnlyNamed", keys)
        body = SP.dump({k: v for k, v in self.doc.items() if k != "dropped"})
        self.assertNotIn("topMarkedWinners", body)
        self.assertNotIn("msOnlyNamed", body)

    def test_no_winner_string_survives(self):
        self.assertGreater(len(self.names), 0, "the source should carry winner lists for this test to mean anything")
        folded = {n.casefold() for n in self.names}
        exempt = set()
        for path, s in _all_strings(self.doc):
            low = s.casefold()
            for n in folded:
                if n in low:
                    # the one exemption: a public buyer of the slice (a DPSU that also sells) kept as a buyer
                    self.assertIn(path, SP.BUYER_FIELDS, f"a winner string survives at {path}")
                    self.assertEqual(low, n, f"a winner string survives inside a longer value at {path}")
                    exempt.add(n)
        # every exempt string is a classes.map buyer of the dpsu class, and there are few
        dpsu_buyers = {r["buyer"].casefold() for r in self.doc["classes"]["map"] if r["class"] == "dpsu"}
        self.assertTrue(exempt <= dpsu_buyers, "an exempt buyer is not a DPSU buyer")
        self.assertLessEqual(len(exempt), 3)
        # and the raw text never carries a winner string as it appears in a winner list
        for n in self.names:
            exempt_here = n.casefold() in exempt
            if not exempt_here:
                self.assertNotIn(n, self.text)

    # --- provenance of the projection -------------------------------------------------
    def test_projected_from_matches(self):
        pf = self.doc["projectedFrom"]
        self.assertEqual(pf, {"file": "research/raw/cppp/security.json",
                              "sha256_16": hashlib.sha256(self.src_bytes).hexdigest()[:16]})
        self.assertRegex(pf["sha256_16"], r"^[0-9a-f]{16}$")


class GuardOnSyntheticSlices(unittest.TestCase):
    """The guard refuses to write a projection that would carry a winner string."""

    def _base(self) -> dict:
        doc = {
            "readMeFirst": "a slice, not the whole of procurement",
            "classes": {"definitions": {"dpsu": {"definition": "DPSUs", "innocentReading": "a supply chain"}},
                        "map": [{"portal": "central", "buyer": "Example Dockyard Limited", "class": "dpsu", "member": "EDL",
                                 "route": "buyer", "rows": 10}],
                        "mapNote": "every buyer key"},
            "headline": [{"class": "dpsu", "rawRows": 12, "dedupRows": 10}],
            "quality": {"afterDedup": {"rule": "r", "rows": 10, "shareOfFileDedupRowsPct": 1.0},
                        "total": {"rawRows": 12, "dedupRows": 10}, "byClass": [{"class": "dpsu", "rawRows": 12, "dedupRows": 10}]},
            "rates": {"total": {"n": 10, "singleBidder": 1, "singleBidderPct": 10.0}, "excludingWorks": {"n": 10},
                      "byClass": [], "byClassYear": [], "innocentReading": "read by class"},
            "concentration": {"byBuyer": [{"buyer": "Example Dockyard Limited",
                                           "topMarkedWinners": [{"name": "SAMPLE FABRICATORS PVT LTD", "awards": 7}]}],
                              "byClass": [{"class": "dpsu", "topMarkedWinners": [{"name": "SAMPLE FABRICATORS PVT LTD", "awards": 7}]}]},
            "redflags": {"stance": "rates over a family", "indicators": []},
            "caveat": "dataset-only",
            "provenance": {"inputs": [{"file": "x.arrow", "sha256_16": "0" * 16}], "asOf": "2026-10-04", "dedupRule": "r"},
        }
        return doc

    def _project(self, doc) -> dict:
        return SP.build_projection(json.dumps(doc).encode("utf-8"), "security.json")

    def test_clean_document_projects(self):
        out = self._project(self._base())
        self.assertNotIn("concentration", out)
        self.assertEqual([d["path"] for d in out["dropped"] if d["reason"].startswith("names a winner")],
                         ["concentration.byBuyer[].topMarkedWinners", "concentration.byClass[].topMarkedWinners"])

    def test_winner_in_a_kept_text_field_refused_without_repeating_it(self):
        doc = self._base()
        doc["caveat"] = "dataset-only; see sample fabricators pvt ltd"
        with self.assertRaises(SP.WinnerLeak) as cm:
            self._project(doc)
        self.assertIn("caveat", str(cm.exception))
        self.assertNotIn("FABRICATORS", str(cm.exception).upper())

    def test_winner_list_under_a_kept_path_refused(self):
        doc = self._base()
        doc["rates"]["byClass"] = [{"class": "dpsu", "topMarkedWinners": [{"name": "ANOTHER WORKS LLP"}]}]
        with self.assertRaises(SP.WinnerLeak):
            self._project(doc)

    def test_buyer_exemption_is_whole_value_only(self):
        doc = self._base()
        doc["concentration"]["byClass"][0]["topMarkedWinners"].append({"name": "EXAMPLE DOCKYARD LIMITED", "awards": 5})
        out = self._project(doc)  # the same public body, kept as a buyer: allowed
        self.assertEqual(out["classes"]["map"][0]["buyer"], "Example Dockyard Limited")
        doc2 = copy.deepcopy(doc)
        doc2["classes"]["map"][0]["buyer"] = "Example Dockyard Limited Unit 2"
        with self.assertRaises(SP.WinnerLeak):
            self._project(doc2)
        doc3 = copy.deepcopy(doc)
        doc3["headline"][0]["note"] = "Example Dockyard Limited"
        with self.assertRaises(SP.WinnerLeak):
            self._project(doc3)

    def test_missing_page_field_refused(self):
        doc = self._base()
        del doc["rates"]["byClassYear"]
        with self.assertRaises(ValueError):
            self._project(doc)


if __name__ == "__main__":
    unittest.main()
