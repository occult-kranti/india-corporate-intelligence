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
import security  # noqa: E402

FIXTURE_DIR = HERE / "fixtures"
OUTPUTS = ["quality.json", "rates.json", "concentration.json", "timing.json", "redflags.json", "security.json", "security-page.json", "provenance.json"]
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
        for text in list(build.SQL.values()) + list(security.SQL.values()):
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
        ssql = security.SQL
        self.assertIn("ORDER BY value_sum DESC, bidder_norm LIMIT 5", ssql["concentration"])
        self.assertIn("ORDER BY b.awards DESC, b.portal, b.buyer", ssql["concentration"])
        self.assertIn("ORDER BY a.awards DESC, a.value_sum DESC, a.bidder_norm", ssql["concentration_by_class"])
        for name in ("unclassified", "class_map"):
            self.assertIn("ORDER BY rows DESC, portal, buyer", ssql[name])
        self.assertIn("ORDER BY tb.rows DESC, tb.buyer", ssql["title_only_buyers"])
        # a second run over the same fixture reproduces every file — all eight — byte for byte
        self.assertEqual(sorted(p.name for p in self.tmp.glob("*.json")), sorted(OUTPUTS))
        with tempfile.TemporaryDirectory() as d2:
            build.run(arrow_dir=FIXTURE_DIR, out_dir=d2, as_of="2026-09-26", log=lambda *_: None)
            for name in OUTPUTS:
                self.assertEqual((self.tmp / name).read_bytes(), (Path(d2) / name).read_bytes(), name)

# --------------------------------------------------------------------------------------
# security.json — the slice is recomputed here from the FIXTURE'S DECLARATIONS
# (make_fixture.SECURITY_*), not from security.py's regexes
# --------------------------------------------------------------------------------------
_CODE = re.compile(r"^\d{4}_([A-Za-z][A-Za-z0-9]*)_\d+_\d+$")


def _junk(org) -> bool:
    return org is None or org.strip() == "" or org.lower().startswith("test")


def _buyer(row) -> str | None:
    org = row["organisation_name"]
    if row["portal_type"] == 0:
        return None if org is None else org.split("||")[0].split("/")[0].strip()
    m = _CODE.match(row["tender_id"] or "")
    return None if org is None else f"{org} / {m.group(1) if m else 'unparsed'}"


def _expected_class(row) -> str | None:
    """The class the fixture's author declared for this row, or None if it must stay out of the slice."""
    org = row["organisation_name"]
    if _junk(org):
        return None
    if row["portal_type"] == 0:
        return make_fixture.SECURITY_CENTRAL_ORGS.get(org)
    m = _CODE.match(row["tender_id"] or "")
    if m and make_fixture.SECURITY_STATE_CODES.get(m.group(1)) == org:
        return "state-police"
    titles = make_fixture.SECURITY_TITLES + [make_fixture.TITLE_ONLY_SECURITY_BODY[2]]
    return "state-police" if row["title"] in titles else None


def _dedup(rows: list[dict]) -> list[dict]:
    first: dict = {}
    for r in sorted(rows, key=lambda r: r["internal_id"]):
        b = r["selected_bidder"]
        first.setdefault((r["tender_id"], None if b is None else b.strip().lower(), r["aoc_at"]), r)
    return list(first.values())


def _plausible(v) -> bool:
    return v is not None and 0 < v <= 1e12


class SecuritySliceOnFixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        make_fixture.write_fixture(FIXTURE_DIR / "fixture.arrow", seed=2026)
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.tmp = Path(cls.tmpdir.name)
        build.run(arrow_dir=FIXTURE_DIR, out_dir=cls.tmp, as_of="2026-10-04", log=lambda *_: None)
        cls.sec = json.loads((cls.tmp / "security.json").read_text())
        cls.text = (cls.tmp / "security.json").read_text()
        cls.docs = {n: json.loads((cls.tmp / n).read_text()) for n in OUTPUTS}
        cls.rows = _fixture_table().to_pylist()
        cls.survivors = _dedup(cls.rows)
        for r in cls.rows:
            r["_class"] = _expected_class(r)

    @classmethod
    def tearDownClass(cls):
        cls.tmpdir.cleanup()

    def test_security_class_map_each_invented_buyer_in_its_class(self):
        cmap = {(r["portal"], r["buyer"]): r for r in self.sec["classes"]["map"]}
        for org, cls in make_fixture.SECURITY_CENTRAL_ORGS.items():
            key = ("central", org.split("||")[0].split("/")[0].strip())
            self.assertIn(key, cmap, org)
            self.assertEqual(cmap[key]["class"], cls, org)
            self.assertEqual(cmap[key]["route"], "buyer")
            if cls != "other-security":  # the member that put it there really matches the buyer key
                rx = next(m[2] for m in security.MEMBERS if m[1] == cmap[key]["member"])
                self.assertRegex(key[1].lower(), rx)
        for code, state in make_fixture.SECURITY_STATE_CODES.items():
            row = cmap[("state", f"{state} / {code}")]
            self.assertEqual((row["class"], row["route"]), ("state-police", "department code"))
        # the excluded code, the decoys and the junk organisation are nowhere in the slice
        excluded = " / ".join(make_fixture.EXCLUDED_STATE_CODE)
        self.assertIn(excluded, security.STATE_CODE_EXCLUDED)
        self.assertTrue(re.search(security.STATE_CODE_RE, make_fixture.EXCLUDED_STATE_CODE[1].lower()), "the exclusion is exercised")
        listed = {r["buyer"] for r in self.sec["classes"]["map"]} | {r["buyer"] for r in self.sec["classes"]["titleOnlyBuyers"]}
        self.assertNotIn(excluded, listed)
        for decoy in make_fixture.DECOY_CENTRAL_ORGS:
            self.assertNotIn(decoy, self.text, decoy)
        self.assertNotIn("test / FXPOL", self.text)
        # other-security is listed for the reader to see what the regex caught
        unc = {r["buyer"] for r in self.sec["classes"]["unclassified"]}
        self.assertEqual(unc, {k[1] for k, r in cmap.items() if r["class"] == "other-security"})
        self.assertEqual(set(r["class"] for r in self.sec["classes"]["map"]) | {"state-police"}, set(security.CLASS_ORDER))
        state, code, title = make_fixture.TITLE_ONLY_SECURITY_BODY
        title_rows = sum(1 for r in self.survivors if r["_class"] == "state-police" and r["title"] in make_fixture.SECURITY_TITLES + [title])
        self.assertEqual(self.sec["classes"]["titleOnlyBuyersTotal"]["rows"], title_rows)
        body = f"{state} / {code}"
        for t in self.sec["classes"]["titleOnlyBuyers"]:  # the share of the buyer's own raw rows the title rule took
            own = [r for r in self.rows if r["portal_type"] == 1 and _buyer(r) == t["buyer"]]
            self.assertEqual(t["buyerRawRows"], len(own), t["buyer"])
            self.assertEqual(t["sliceRawRows"], sum(1 for r in own if r["_class"]), t["buyer"])
            if t["buyer"] != body:
                self.assertLess(t["sliceRawRows"], t["buyerRawRows"], "an ordinary department: most of its rows stay out")
        mostly = self.sec["classes"]["titleOnlyBuyersMostlySecurityTitled"]
        self.assertEqual([m["buyer"] for m in mostly], [body], "only the police-housing body reads as mostly security-titled")
        self.assertEqual(mostly[0]["sliceShareOfBuyerRawRowsPct"], 100.0)
        self.assertNotIn(body, cmap and {k[1] for k in cmap}, "a reading aid: nothing is added to the class map")
        self.assertEqual([c["class"] for c in self.sec["headline"]], security.CLASS_ORDER)

    def test_security_quality_and_rates_reconcile_to_fixture_counts(self):
        q = {r["class"]: r for r in self.sec["quality"]["byClass"]}
        rt = {r["class"]: r for r in self.sec["rates"]["byClass"]}
        for cls in security.CLASS_ORDER:
            raw = [r for r in self.rows if r["_class"] == cls]
            dd = [r for r in self.survivors if r["_class"] == cls]
            rated = [r for r in dd if r["bids_received"] is not None and 1 <= r["bids_received"] <= 1000]
            single = sum(r["bids_received"] == 1 for r in rated)
            self.assertGreater(len(dd), 0, cls)
            self.assertEqual(q[cls]["rawRows"], len(raw), cls)
            self.assertEqual(q[cls]["dedupRows"], len(dd), cls)
            self.assertEqual(q[cls]["bidsReceived"]["null"], sum(r["bids_received"] is None for r in dd), cls)
            self.assertEqual(q[cls]["contractValue"]["null"], sum(r["contract_value_amount"] is None for r in dd), cls)
            self.assertEqual(q[cls]["winnerMarkers"]["marked"], sum(build.is_marked(r["selected_bidder"]) for r in dd), cls)
            self.assertEqual(q[cls]["bidsReceived"]["inDenominator"] + q[cls]["bidsReceived"]["excludedFromDenominator"], len(dd))
            self.assertEqual((rt[cls]["n"], rt[cls]["singleBidder"]), (len(rated), single), cls)
            lo, hi = rt[cls]["wilson95"]
            self.assertTrue(lo <= rt[cls]["singleBidderPct"] <= hi, cls)
        all_dd = [r for r in self.survivors if r["_class"]]
        self.assertEqual(self.sec["quality"]["afterDedup"]["rows"], len(all_dd))
        self.assertEqual(self.sec["quality"]["raw"]["rows"], sum(1 for r in self.rows if r["_class"]))
        self.assertLess(self.sec["quality"]["afterDedup"]["rows"], self.sec["quality"]["raw"]["rows"], "the dedup rule bites in the slice")
        self.assertEqual(self.sec["rates"]["denominatorN"], sum(r["n"] for r in self.sec["rates"]["byClass"]))
        self.assertEqual(sum(r["n"] for r in self.sec["rates"]["byClassYear"]), self.sec["rates"]["denominatorN"])
        # the declared contrast: works draw many bidders, stores and DPSUs few
        self.assertLess(rt["works"]["singleBidderPct"], rt["stores"]["singleBidderPct"])
        self.assertLess(rt["works"]["singleBidderPct"], rt["dpsu"]["singleBidderPct"])

    def test_security_comparators_are_read_from_the_same_run(self):
        rates, redflags, timing = self.docs["rates.json"], self.docs["redflags.json"], self.docs["timing.json"]
        by_year, by_py = {}, {}
        for r in rates["byPortalYear"]:
            a = by_year.setdefault(r["year"], [0, 0]); a[0] += r["n"]; a[1] += r["singleBidder"]
            by_py[(r["portal"], r["year"])] = (r["n"], r["singleBidder"])
        for row in self.sec["rates"]["byClassYear"]:
            self.assertEqual([row["wholeFile"]["n"], row["wholeFile"]["singleBidder"]], by_year[row["year"]], row)
            self.assertEqual((row["wholeFileSamePortal"]["n"], row["wholeFileSamePortal"]["singleBidder"]), by_py[(row["portal"], row["year"])])
        single = next(i for i in redflags["indicators"] if i["indicator"] == "singleBidding")
        self.assertEqual(self.sec["rates"]["total"]["wholeFile"]["n"], single["familySize"])
        self.assertEqual(self.sec["rates"]["total"]["wholeFile"]["singleBidderPct"], single["ratePct"])
        rest = self.sec["rates"]["total"]["restOfFile"]
        self.assertEqual(rest["n"] + self.sec["rates"]["total"]["n"], single["familySize"])
        for ind in self.sec["redflags"]["indicators"]:
            wf = next(i for i in redflags["indicators"] if i["indicator"] == ind["indicator"])
            self.assertEqual(ind["wholeFile"], {k: wf[k] for k in ("familySize", "count", "ratePct", "wilson95")})
            self.assertEqual(sum(c["familySize"] for c in ind["byClass"]), ind["familySize"], ind["indicator"])
            self.assertEqual(sum(c["count"] for c in ind["byClass"]), ind["count"], ind["indicator"])
            self.assertTrue(len(ind["innocentReading"]) > 20)
        self.assertEqual(self.sec["timing"]["total"]["wholeFile"]["shareLe2DaysPct"], timing["shareLe2Days"]["pct"])
        wf_bands = {r["key"]: r for r in rates["byValueBand"]}
        for b in self.sec["bands"]["byClass"][0]["bands"]:
            if b["band"] in wf_bands:
                self.assertEqual(b["wholeFile"]["singleBidderPct"], wf_bands[b["band"]]["singleBidderPct"])
        # every class carries every band, the 'value missing or implausible' row included
        for c in self.sec["bands"]["byClass"]:
            self.assertEqual([b["band"] for b in c["bands"]], [b["band"] for b in build.VALUE_BANDS] + [build.VALUE_BAND_OTHER])
            self.assertEqual(sum(b["rows"] for b in c["bands"]), c["rows"])

    def test_security_timing_n_accounting_identity(self):
        q = {r["class"]: r["dedupRows"] for r in self.sec["quality"]["byClass"]}
        q[None] = self.sec["quality"]["afterDedup"]["rows"]
        self.assertIn(security.TIMING_BIN_CASE, build.SQL["timing_hist"], "the slice's bins are the pipeline's bins")
        rows = [self.sec["timing"]["total"]] + self.sec["timing"]["byClass"]
        for row in rows:
            key = None if row["class"] == "all slice" else row["class"]
            self.assertEqual(row["n"] + row["excludedAocBeforeClosing"] + row["excludedDateMissing"], row["dedupRows"], row["class"])
            self.assertEqual(row["dedupRows"], q[key], row["class"])
            self.assertEqual(sum(b["n"] for b in row["daysClosingToAoc"]), row["n"], row["class"])
            self.assertEqual([b["bin"] for b in row["daysClosingToAoc"]], security.TIMING_BINS)
        total = self.sec["timing"]["total"]
        self.assertGreater(total["excludedAocBeforeClosing"], 0, "the fixture carries date-order defects in the slice")
        self.assertGreater(total["excludedDateMissing"], 0, "the fixture carries missing dates in the slice")
        dd = [r for r in self.survivors if r["_class"]]
        self.assertEqual(total["excludedDateMissing"], sum(r["aoc_at"] is None or r["closing_at"] is None for r in dd))
        short = next(i for i in self.sec["redflags"]["indicators"] if i["indicator"] == "shortDecisionWindow")
        self.assertEqual(short["familySize"], total["n"])

    def test_security_naming_rule(self):
        fam: dict = {}
        for r in self.survivors:
            if r["_class"] and r["selected_bidder"] is not None and _plausible(r["contract_value_amount"]):
                key = (r["_class"], _buyer(r), r["selected_bidder"].strip().lower())
                fam[key] = fam.get(key, 0) + 1
        c = self.sec["concentration"]
        named = 0
        for row in c["byBuyer"]:
            self.assertGreaterEqual(row["markedAwards"], 50)
            self.assertLessEqual(len(row["topMarkedWinners"]), 5)
            for w in row["topMarkedWinners"]:
                named += 1
                self.assertTrue(build.is_marked(w["name"]), w["name"])
                self.assertGreaterEqual(w["awards"], 5)
                self.assertGreaterEqual(fam[(row["class"], row["buyer"], w["name"].strip().lower())], 5, w["name"])
        for cl in c["byClass"]:
            self.assertLessEqual(len(cl["topMarkedWinners"]), 10)
            for w in cl["topMarkedWinners"]:
                named += 1
                self.assertTrue(build.is_marked(w["name"]), w["name"])
                self.assertGreaterEqual(w["maxAwardsFromOneBuyer"], 5)
                best = max(k for (cls, _, n), k in fam.items() if cls == cl["class"] and n == w["name"].strip().lower())
                self.assertGreaterEqual(best, 5, w["name"])
        self.assertGreater(named, 0)
        self.assertIn(make_fixture.SECURITY_WINNER, self.text)
        # the rare marked winner has exactly four awards from one buyer: never named
        rare = [r for r in self.survivors if r["selected_bidder"] == make_fixture.RARE_MARKED_WINNER]
        self.assertEqual(len(rare), 4, "the sentinel is not vacuous")
        self.assertNotIn(make_fixture.RARE_MARKED_WINNER.lower(), self.text.lower())
        # no bare name, no joined list holding one, no component of one
        low = self.text.lower()
        for name in make_fixture.UNMARKED_WINNERS + make_fixture.MIXED_WINNERS:
            self.assertNotIn(name.lower(), low, name)
        for name in make_fixture.MIXED_WINNERS:
            for part in build.name_components(name):
                if not build.is_marked(part):
                    self.assertNotIn(part.lower(), low, part)
        self.assertEqual(c["msOnlyNamed"]["of"], len({w["name"] for row in c["byBuyer"] for w in row["topMarkedWinners"]}
                                                     | {w["name"] for cl in c["byClass"] for w in cl["topMarkedWinners"]}))
        rep = next(i for i in self.sec["redflags"]["indicators"] if i["indicator"] == "repeatSingleBidderMarkedWinners")
        self.assertEqual(rep["noNames"], "pairs are counted, never listed")
        # a central buyer's slice family is its concentration.json family: same counts, HHIs and named winners
        whole = {(r["portal"], r["buyer"]): r for r in self.docs["concentration.json"]["byBuyer"]}
        shared = [r for r in c["byBuyer"] if r["portal"] == "central" and (r["portal"], r["buyer"]) in whole]
        self.assertTrue(shared)
        for r in shared:
            w = whole[(r["portal"], r["buyer"])]
            for k in ("awards", "markedAwards", "unmarkedAwards", "hhiMarkedCount", "hhiMarkedValue", "topMarkedWinnerShareOfCountPct"):
                self.assertEqual(r[k], w[k], (r["buyer"], k))
            self.assertEqual([x["name"] for x in r["topMarkedWinners"]], [x["name"] for x in w["topMarkedWinners"]])
            self.assertAlmostEqual(r["valueSumInr"], w["valueSumInr"], delta=1.0)

    def test_security_read_me_first_rule_provenance_and_innocent_readings(self):
        s = self.sec
        self.assertEqual(list(s)[0], "readMeFirst")
        for phrase in ("not on CPPP", "Defence Procurement Portal", "Defence Acquisition Procedure", "GeM", "state police",
                       "central armed police forces", "DRDO", "BRO", "MES", "Defence Estates", "DPSUs", "prisons", "fire", "forensic"):
            self.assertIn(phrase, s["readMeFirst"], phrase)
        top = max(s["classes"]["map"], key=lambda r: (r["rows"], r["buyer"]))
        self.assertIn(f"{top['buyer']} ({top['class']}) alone is {build.pct(top['rows'], s['quality']['afterDedup']['rows'])}%", s["readMeFirst"])
        rule = s["sliceRule"]
        self.assertEqual(rule["centralBuyerRegex"], security.CENTRAL_SLICE_RE)
        self.assertEqual(rule["stateTitleRegex"], security.STATE_TITLE_RE)
        self.assertEqual(rule["stateDepartmentCodeRegex"], security.STATE_CODE_RE)
        self.assertEqual(rule["classes"], security.CLASS_ORDER)
        self.assertEqual(s["provenance"]["sliceRule"], rule)
        self.assertEqual(s["provenance"]["sliceSql"], security.SQL)
        self.assertEqual(s["provenance"]["sql"], self.docs["provenance.json"]["provenance"]["sql"], "the shared block is the shared block")
        self.assertIn("security.json", self.docs["provenance.json"]["outputs"])
        for section in ("quality", "rates", "bands", "timing", "concentration"):
            self.assertTrue(isinstance(s[section]["innocentReading"], str) and len(s[section]["innocentReading"]) > 40, section)
        for c in security.CLASS_ORDER:
            self.assertTrue(len(s["classes"]["definitions"][c]["innocentReading"]) > 40, c)
        self.assertEqual(s["caveat"], build.RATES_CAVEAT)
        cov = {m["member"]: m["rows"] for m in s["classes"]["memberCoverage"]}
        self.assertEqual(set(cov), {m[1] for m in security.MEMBERS})
        self.assertEqual(cov["HAL"], 0, "a member without a buyer key of its own is shown at 0, not dropped")


if __name__ == "__main__":
    unittest.main()
