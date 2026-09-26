"""Tests for scripts/cppp/build.py on the 2,000-row synthetic fixture.

Run: python3 -m unittest scripts/cppp/test_build.py   (not in CI: needs duckdb + pyarrow)

The fixture is regenerated from make_fixture.py on every run so the expectations below
are computed from the same synthetic rows the build reads.
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

import pyarrow as pa
import pyarrow.ipc as ipc

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "fixtures"))

import build  # noqa: E402
import make_fixture  # noqa: E402

FIXTURE_DIR = HERE / "fixtures"
OUTPUTS = ["quality.json", "rates.json", "concentration.json", "timing.json", "redflags.json", "provenance.json"]
EXPECTED_BANDS = ["<₹10 L", "₹10 L–1 cr", "₹1–10 cr", "₹10–100 cr", ">₹100 cr"]


def _fixture_table() -> pa.Table:
    with pa.memory_map(str(FIXTURE_DIR / "fixture.arrow")) as mm:
        return ipc.open_stream(mm).read_all()


class BuildOnFixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        make_fixture.write_fixture(FIXTURE_DIR / "fixture.arrow", seed=2026)
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.tmp = Path(cls.tmpdir.name)
        cls.result = build.run(arrow_dir=FIXTURE_DIR, out_dir=cls.tmp, as_of="2026-09-26")
        cls.docs = {name: json.loads((cls.tmp / name).read_text()) for name in OUTPUTS}
        cls.blob = "".join((cls.tmp / name).read_text() for name in OUTPUTS)
        cls.table = _fixture_table()

    @classmethod
    def tearDownClass(cls):
        cls.tmpdir.cleanup()

    # --- provenance ---------------------------------------------------------------
    def test_all_outputs_written_with_provenance(self):
        for name in OUTPUTS:
            self.assertTrue((self.tmp / name).exists(), name)
            p = self.docs[name]["provenance"]
            for key in ("inputs", "rows", "distinctTenderIds", "dedupRule", "sql", "generatedBy", "asOf"):
                self.assertIn(key, p, f"{name} provenance lacks {key}")
            self.assertEqual(p["asOf"], "2026-09-26")
            self.assertTrue(p["generatedBy"].startswith("scripts/cppp/build.py@"))

    def test_inputs_carry_sha256_16(self):
        inputs = self.docs["quality.json"]["provenance"]["inputs"]
        self.assertEqual(len(inputs), 1)
        self.assertEqual(inputs[0]["file"], "fixture.arrow")
        self.assertGreater(inputs[0]["bytes"], 0)
        self.assertRegex(inputs[0]["sha256_16"], r"^[0-9a-f]{16}$")

    def test_provenance_sql_contains_every_table(self):
        sql = self.docs["provenance.json"]["provenance"]["sql"]
        for name, text in build.SQL.items():
            self.assertEqual(sql[name], text, f"SQL for {name} not verbatim")
        for name in OUTPUTS:
            self.assertEqual(self.docs[name]["provenance"]["sql"], sql)
        self.assertIn("dedup", sql)
        self.assertIn("ROW_NUMBER() OVER (PARTITION BY tender_id, bidder_norm, aoc_at ORDER BY internal_id)", sql["dedup"])

    # --- dedup ------------------------------------------------------------------------
    def test_dedup_rule_stated_verbatim_and_applied(self):
        q = self.docs["quality.json"]
        self.assertEqual(q["provenance"]["dedupRule"], build.DEDUP_RULE)
        self.assertEqual(q["provenance"]["dedupRule"],
                         "one row per (tender_id, selected_bidder_norm, aoc_at) — the first by internal_id")
        self.assertLess(q["afterDedup"]["rows"], q["raw"]["rows"])
        self.assertEqual(q["afterDedup"]["rows"] + q["afterDedup"]["removed"], q["raw"]["rows"])
        # independent recomputation of the rule from the fixture
        keys = set()
        for tid, b, aoc in zip(self.table["tender_id"].to_pylist(), self.table["selected_bidder"].to_pylist(),
                               self.table["aoc_at"].to_pylist()):
            keys.add((tid, None if b is None else b.strip().lower(), aoc))
        self.assertEqual(q["afterDedup"]["rows"], len(keys))
        alt = q["afterDedup"]["alternativeOnePerTenderId"]
        self.assertEqual(alt["rows"], q["raw"]["distinctTenderIds"])
        self.assertLess(alt["rows"], q["afterDedup"]["rows"])

    # --- quality -----------------------------------------------------------------------
    def test_quality_headline_counts_match_fixture(self):
        q = self.docs["quality.json"]
        bids = self.table["bids_received"].to_pylist()
        vals = self.table["contract_value_amount"].to_pylist()
        self.assertEqual(q["raw"]["rows"], self.table.num_rows)
        self.assertEqual(q["bidsReceived"]["null"], sum(b is None for b in bids))
        self.assertEqual(q["bidsReceived"]["zero"], sum(b == 0 for b in bids))
        self.assertEqual(q["bidsReceived"]["one"], sum(b == 1 for b in bids))
        self.assertEqual(q["bidsReceived"]["over1000"], sum(b is not None and b > 1000 for b in bids))
        self.assertEqual(q["contractValue"]["null"], sum(v is None for v in vals))
        self.assertEqual(q["contractValue"]["lteZero"], sum(v is not None and v <= 0 for v in vals))
        self.assertEqual(q["contractValue"]["over1e12"], sum(v is not None and v > 1e12 for v in vals))
        aoc = self.table["aoc_at"].to_pylist(); clo = self.table["closing_at"].to_pylist()
        self.assertEqual(q["dates"]["aocBeforeClosing"], sum(a is not None and c is not None and a < c for a, c in zip(aoc, clo)))
        self.assertEqual(q["nulls"]["aoc_at_null"], sum(a is None for a in aoc))
        self.assertEqual(q["nulls"]["closing_at_null"], sum(c is None for c in clo))
        self.assertGreater(q["nulls"]["aoc_at_null"], 0, "the fixture carries NULL aoc_at rows")
        self.assertGreater(q["nulls"]["closing_at_null"], 0, "the fixture carries NULL closing_at rows")
        self.assertGreater(q["organisations"]["junkRows"], 0)
        self.assertTrue(any(h["n"] > 0 for h in q["contractValue"]["magnitudeHistogram"]))

    def test_quality_tender_type_map_lists_dirty_values(self):
        m = {row["raw"]: row for row in self.docs["quality.json"]["tenderType"]["rawValues"]}
        for dirty in ("1", "2", "", None):
            self.assertIn(dirty, m, f"dirty tender_type {dirty!r} missing from the map")
        self.assertEqual(m["1"]["normalised"], "Other/unknown")
        self.assertEqual(m["Works"]["normalised"], "Works")
        self.assertEqual(m["LIMITED"]["normalised"], "Limited")
        self.assertEqual(m["Limited Tender(Mtrl)"]["normalised"], "Limited")
        self.assertEqual(m["LT"]["normalised"], "Limited")
        self.assertEqual(m["Nomination"]["normalised"], "Other/unknown")
        self.assertEqual(m["Open"]["normalised"], "Other/unknown")
        self.assertGreater(self.docs["quality.json"]["duplicates"]["maxRowsPerTenderId"], 1)
        self.assertTrue(self.docs["quality.json"]["duplicates"]["heaviestTenderIds"])
        self.assertEqual(set(self.docs["quality.json"]["tenderType"]["normalisedCounts"]),
                         {"Works", "Goods", "Services", "Limited", "Other/unknown"})

    def test_quality_marker_share(self):
        w = self.docs["quality.json"]["winnerMarkers"]
        self.assertEqual(w["named"], w["marked"] + w["unmarked"])
        self.assertGreater(w["unmarked"], 0)
        self.assertEqual(w["regex"], build.MARKER_RE)
        self.assertEqual(w["rule"], build.MARKED_RULE)
        # independent recomputation with the component rule: a joined list with one bare name is unmarked
        names = [b for b in self.table["selected_bidder"].to_pylist() if b is not None]
        self.assertEqual(w["named"], len(names))
        self.assertEqual(w["marked"], sum(build.is_marked(b) for b in names))
        joined = [b for b in names if "," in b or ";" in b]
        self.assertTrue(any(build.is_marked(b) for b in joined), "fixture has all-marked joined winners")
        self.assertTrue(any(not build.is_marked(b) and re.search(build.MARKER_RE, b, re.I) for b in joined),
                        "fixture has joined winners with a marked firm beside a bare name")

    def test_component_marker_rule(self):
        self.assertTrue(build.is_marked("Beta Constructions"))
        self.assertTrue(build.is_marked("Delta Enterprises,Eta Builders"))
        self.assertTrue(build.is_marked("Gamma Traders; Kappa Suppliers"))
        self.assertTrue(build.is_marked("Acme Pvt Ltd, "))            # trailing empty component ignored
        for bad in ("Beta Constructions,ramesh kumar", "suresh yadav,Gamma Traders", "Acme Pvt Ltd,ramesh kumar",
                    "SAI VAISHNAVI ENTERPRISES, PROP. RAJ KUMAR PATRA", "ramesh kumar", "", None, ","):
            self.assertFalse(build.is_marked(bad), repr(bad))
        self.assertEqual(build.name_components(" a , ,b;c "), ["a", "b", "c"])
        self.assertIn(build.MARKED_SQL, build.SQL["base"])
        self.assertIn("markedRule", self.docs["provenance.json"]["provenance"])
        self.assertIn("every non-empty component", self.docs["provenance.json"]["provenance"]["refusal"])

    # --- rates ---------------------------------------------------------------------------
    def test_rates_denominator_and_wilson(self):
        r = self.docs["rates.json"]
        self.assertEqual(r["denominator"], "awards after dedup with bids_received >= 1 and <= 1000")
        tables = ["byPortalYear", "byTenderType", "byValueBand", "byOrganisation"]
        for t in tables:
            self.assertTrue(len(r[t]) > 0, t)
            for row in r[t]:
                self.assertIn("n", row); self.assertIn("wilson95", row)
                lo, hi = row["wilson95"]
                self.assertTrue(0 <= lo <= row["singleBidderPct"] <= hi <= 100, (t, row))
        total = sum(row["n"] for row in r["byPortalYear"])
        self.assertEqual(total, r["denominatorN"])
        self.assertEqual(sum(row["n"] for row in r["byTenderType"]), r["denominatorN"])
        self.assertEqual(sum(row["n"] for row in r["byOrganisation"]), r["denominatorN"])

    def test_rates_tender_type_classes(self):
        keys = {row["key"] for row in self.docs["rates.json"]["byTenderType"]}
        self.assertTrue(keys <= {"Works", "Goods", "Services", "Limited", "Other/unknown"}, keys)

    def test_value_bands_exact_with_thresholds(self):
        r = self.docs["rates.json"]
        keys = [row["key"] for row in r["byValueBand"] if row["key"] in EXPECTED_BANDS]
        self.assertEqual(keys, EXPECTED_BANDS)
        self.assertEqual(r["provenance"]["valueBandsInr"],
                         [{"band": "<₹10 L", "lo": 0, "hi": 1_000_000},
                          {"band": "₹10 L–1 cr", "lo": 1_000_000, "hi": 10_000_000},
                          {"band": "₹1–10 cr", "lo": 10_000_000, "hi": 100_000_000},
                          {"band": "₹10–100 cr", "lo": 100_000_000, "hi": 1_000_000_000},
                          {"band": ">₹100 cr", "lo": 1_000_000_000, "hi": None}])
        other = [row for row in r["byValueBand"] if row["key"] not in EXPECTED_BANDS]
        self.assertEqual([row["key"] for row in other], ["value missing or implausible"])

    def test_small_organisations_pooled(self):
        rows = self.docs["rates.json"]["byOrganisation"]
        self.assertTrue(all(row["n"] >= 30 or row["key"] == "pooled (n<30)" for row in rows), rows)
        pooled = [row for row in rows if row["key"] == "pooled (n<30)"]
        self.assertEqual(len(pooled), 1)
        self.assertGreater(pooled[0]["pooledGroups"], 0)
        state_keys = [row["key"] for row in rows if row["portal"] == "state"]
        self.assertTrue(any(re.match(r"^(Kerala|West Bengal|Maharashtra|Madhya Pradesh) / [A-Z]+$", k) for k in state_keys), state_keys)

    def test_central_buyer_folds_slash_and_pipe_hierarchies(self):
        # 'Body/Unit/Sub-unit' and 'Body||Unit' and 'Body / Unit' are all one buyer: the body
        central = {row["key"] for row in self.docs["rates.json"]["byOrganisation"] if row["portal"] == "central"}
        self.assertIn("Fixture Petroleum Corporation Ltd", central)
        self.assertIn("Synthetic Heavy Electricals Ltd", central)
        for k in central:
            self.assertNotIn("/", k, k); self.assertNotIn("||", k, k)
            self.assertEqual(k, k.strip(), k)
        for doc, key in (("concentration.json", "byBuyer"), ("redflags.json", "singleBiddingByBuyer")):
            for row in self.docs[doc][key]:
                if row["portal"] == "central":
                    self.assertNotIn("/", row["buyer"], (doc, row["buyer"]))
        self.assertIn("first '/' segment", self.docs["provenance.json"]["provenance"]["buyerRule"])
        # the folding really happened: the fixture writes the same body four ways
        orgs = self.table["organisation_name"].to_pylist()
        self.assertGreaterEqual(len({o for o in orgs if o and o.startswith("Fixture Petroleum")}), 4)

    # --- the refusal ---------------------------------------------------------------------
    def test_no_unmarked_name_anywhere(self):
        low = self.blob.lower()
        self.assertNotIn("ramesh kumar", low)
        for name in make_fixture.UNMARKED_WINNERS:
            self.assertNotIn(name.lower(), low, name)
        for name in make_fixture.MIXED_WINNERS:  # the joined lists, whole and by component
            self.assertNotIn(name.lower(), low, name)
            for part in build.name_components(name):
                if not build.is_marked(part):
                    self.assertNotIn(part.lower(), low, part)

    def test_every_emitted_name_component_is_marked(self):
        # the comma-joined leak: a marked firm in a list must not carry a bare name into the output
        names = [w["name"] for row in self.docs["concentration.json"]["byBuyer"] for w in row["topMarkedWinners"]]
        self.assertTrue(names)
        for name in names:
            parts = build.name_components(name)
            self.assertTrue(parts, name)
            for part in parts:
                self.assertRegex(part.lower(), build.MARKER_RE, (name, part))
            self.assertTrue(build.is_marked(name), name)

    def test_named_winners_only_marked_with_5_awards(self):
        c = self.docs["concentration.json"]
        named = 0
        for row in c["byBuyer"]:
            self.assertGreaterEqual(row["awards"], 50)
            self.assertIn("hhiMarkedValue", row); self.assertIn("hhiMarkedCount", row); self.assertIn("unmarkedShareOfAwardsPct", row)
            if row["hhiMarkedCount"] is not None:
                self.assertTrue(0 < row["hhiMarkedCount"] <= 10000, row["hhiMarkedCount"])
            for w in row["topMarkedWinners"]:
                named += 1
                self.assertTrue(build.is_marked(w["name"]), w["name"])
                self.assertGreaterEqual(w["awards"], 5)
        self.assertGreater(named, 0, "the fixture has marked winners with >= 5 awards for a buyer")

    def test_selected_bidder_address_never_emitted(self):
        self.assertNotIn("ADDR-SENTINEL", self.blob)
        self.assertNotIn("Fixture Street", self.blob)
        for text in build.SQL.values():
            self.assertNotIn("selected_bidder_address", text)

    # --- timing --------------------------------------------------------------------------
    def test_timing_excludes_date_order_violations(self):
        t = self.docs["timing.json"]
        self.assertGreater(t["excludedAocBeforeClosing"], 0)
        self.assertGreater(t["excludedDateMissing"], 0, "the fixture has dedup rows with a NULL aoc_at or closing_at")
        self.assertEqual(t["excludedAocBeforeClosing"] + t["excludedDateMissing"] + t["n"], self.docs["quality.json"]["afterDedup"]["rows"])
        self.assertEqual(sum(b["n"] for b in t["daysClosingToAoc"]), t["n"])
        short = next(i for i in self.docs["redflags.json"]["indicators"] if i["indicator"] == "shortDecisionWindow")
        self.assertEqual(short["familySize"], t["n"])
        self.assertIn("NULL", short["familyDefinition"])
        self.assertIn("wilson95", t["shareLe2Days"])
        fy = t["aocByFinancialYearMonth"]
        self.assertEqual([m["fyMonth"] for m in fy], list(range(1, 13)))
        self.assertEqual(fy[0]["calendarMonth"], 4)
        self.assertTrue({"central", "state"} <= {row["portal"] for row in t["byPortal"]})

    # --- red flags -----------------------------------------------------------------------
    def test_redflags_carry_family_size_and_rate(self):
        rf = self.docs["redflags.json"]
        names = {i["indicator"] for i in rf["indicators"]}
        self.assertEqual(names, {"singleBidding", "nonOpenTenderType", "shortDecisionWindow", "repeatSingleBidderMarkedWinners"})
        for ind in rf["indicators"]:
            self.assertGreater(ind["familySize"], 0)
            self.assertLessEqual(ind["count"], ind["familySize"])
            self.assertAlmostEqual(ind["ratePct"], 100 * ind["count"] / ind["familySize"], places=1)
            self.assertIn("wilson95", ind)
            self.assertTrue(isinstance(ind["innocentReading"], str) and len(ind["innocentReading"]) > 20)
            self.assertTrue(ind["familyDefinition"])
        non_open = next(i for i in rf["indicators"] if i["indicator"] == "nonOpenTenderType")
        self.assertGreater(non_open["nonOpenLabelsLeftInOtherUnknown"]["n"], 0)
        for row in rf["singleBiddingByBuyer"]:
            self.assertGreaterEqual(row["n"], 50)

    def test_rates_caveat_states_the_sample_outcome(self):
        c = self.docs["rates.json"]["caveat"]
        self.assertEqual(c, build.RATES_CAVEAT)
        for phrase in ("sample-verification.json", "40", "Invalid Url", "reported", "unknown"):
            self.assertIn(phrase, c)
        self.assertNotIn("until", c)

    # --- reproducible ordering ---------------------------------------------------------------
    def test_order_sensitive_queries_have_total_orderings(self):
        sql = build.SQL
        self.assertIn("ORDER BY n DESC, shape, portal LIMIT 15", sql["quality_tender_id_shapes"])
        self.assertIn("ORDER BY rows DESC, tender_id, portal LIMIT 10", sql["quality_heaviest_tender_ids"])
        self.assertIn("ORDER BY single * 1.0 / n DESC, n DESC, portal, buyer LIMIT 25", sql["redflag_single_by_buyer"])
        self.assertIn("ORDER BY value_sum DESC, bidder_norm LIMIT 5", sql["concentration"])
        self.assertIn("arg_max(f.selected_bidder, (f.v, f.selected_bidder))", sql["concentration"])
        self.assertIn("ORDER BY b.awards DESC, b.portal, b.buyer", sql["concentration"])
        # a second run over the same fixture reproduces every file byte for byte
        with tempfile.TemporaryDirectory() as d2:
            build.run(arrow_dir=FIXTURE_DIR, out_dir=d2, as_of="2026-09-26", log=lambda *_: None)
            for name in OUTPUTS:
                a = json.loads((self.tmp / name).read_text()); b = json.loads((Path(d2) / name).read_text())
                a.pop("runtimeSeconds", None); b.pop("runtimeSeconds", None)
                self.assertEqual(a, b, name)


if __name__ == "__main__":
    unittest.main()
