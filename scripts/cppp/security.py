"""The CPPP security slice: research/raw/cppp/security.json, written by build.run() on every build.

Not a separate pipeline. build.run() calls write_security() over the SAME duckdb connection, the
SAME `base` / `dedup` views (the stated dedup rule) and the SAME provenance block, after rates,
timing and red flags are computed, so every whole-file comparator here is read from that run's
own results, not re-derived.

WHAT THE SLICE IS. Award decisions after dedup whose buyer is a security body: on the central
portal, the first '||' segment of organisation_name matches CENTRAL_SLICE_RE; on the state portal
(where organisation_name is the state), the department code parsed from tender_id by the pipeline's
buyer rule matches STATE_CODE_RE (less STATE_CODE_EXCLUDED), or the title matches STATE_TITLE_RE.
Every slice row gets one BUYER CLASS (CLASS_ORDER) by the first matching member of MEMBERS over the
buyer key; state-portal rows are 'state-police'; anything else the regex caught is 'other-security'
and its buyer key is listed in `classes.unclassified`.

WHAT IT IS NOT. Defence capital acquisition (Defence Procurement Portal / Defence Acquisition
Procedure), GeM purchases and most state police procurement (state portals) are not in CPPP.

THE REFUSAL is build.py's, unchanged: a winner is named only when every comma/semicolon component
carries a marker (build.MARKED_SQL) and only with >= 5 awards for that buyer, at most five per buyer;
the per-class lists name only winners that already meet the per-buyer threshold at some buyer of the
class. Red flags count pairs and never list winners. selected_bidder_address is never read.
"""
from __future__ import annotations

import re

import build as B  # build.py registers itself as 'build' when run as a script

# --------------------------------------------------------------------------------------
# The slice rule — every string here is written verbatim into security.json → sliceRule
# --------------------------------------------------------------------------------------
CLASS_ORDER = ["works", "stores", "research", "dpsu", "capf", "intelligence-investigation", "state-police", "other-security"]

_LEGACY_OF = (r"ordnance|(heavy vehicles?|engine|vehicle|cordite|rifle|small arms|metal (and|&) steel|ammunition|"
              r"high explosives?|gun carriage|gun (and|&) shell|field gun|opto electronics|machine tool prototype) factory")

# (class, member, regex over lower(buyer key)) — FIRST MATCH WINS, in this order. The order puts every
# named body before the catch-all 'IHQ / MoD' member, so 'IHQ of MoD (Army)' is the Army and
# 'E-IN-C Branch - Military Engineer Services' is MES, never a generic MoD row.
MEMBERS: list[tuple[str, str, str]] = [
    ("works", "Military Engineer Services", r"military engineer|\bmes\b"),
    ("works", "Border Roads Organisation", r"border roads|\bbro\b|\bdgbr\b"),
    ("research", "DRDO", r"\bdrdo\b|defen[cs]e research (and|&) development organi[sz]ation"),
    ("research", "Department of Defence Research and Development", r"department of defen[cs]e research|\bddr ?& ?d\b"),
    ("research", "other defence research laboratory names", r"defen[cs]e research"),
    ("dpsu", "HAL", r"hindustan aeronautics"),
    ("dpsu", "BEL", r"bharat electronics"),
    ("dpsu", "BDL", r"bharat dynamics"),
    ("dpsu", "MDL", r"mazagon"),
    ("dpsu", "GRSE", r"garden reach|\bgrse\b"),
    ("dpsu", "GSL", r"goa shipyard"),
    ("dpsu", "HSL", r"hindustan shipyard"),
    ("dpsu", "CSL", r"cochin shipyard"),
    ("dpsu", "BEML", r"\bbeml\b|bharat earth movers"),
    ("dpsu", "MIDHANI", r"mishra dhatu|midhani"),
    ("dpsu", "Munitions India", r"munitions india"),
    ("dpsu", "Armoured Vehicles Nigam (AVANI)", r"armoured vehicles|\bavnl\b|\bavani\b"),
    ("dpsu", "Advanced Weapons and Equipment India", r"advanced weapons|\baweil\b"),
    ("dpsu", "Troop Comforts", r"troop comforts"),
    ("dpsu", "Yantra India", r"yantra india"),
    ("dpsu", "India Optel", r"india optel"),
    ("dpsu", "Gliders India", r"gliders india"),
    ("dpsu", "legacy Ordnance Factory names", _LEGACY_OF),
    ("capf", "CRPF", r"\bcrpf\b|central reserve police"),
    ("capf", "BSF", r"\bbsf\b|border security force"),
    ("capf", "CISF", r"\bcisf\b|central industrial security"),
    ("capf", "ITBP", r"\bitbp\b|indo[- ]?tibetan"),
    ("capf", "SSB", r"\bssb\b|sashastra seema"),
    ("capf", "Assam Rifles", r"assam rifles"),
    ("capf", "NSG", r"\bnsg\b|national security guard"),
    ("intelligence-investigation", "IB", r"intelligence bureau"),
    ("intelligence-investigation", "NIA", r"\bnia\b|national investigation agency"),
    ("intelligence-investigation", "NCB", r"\bncb\b|narcotics control"),
    ("intelligence-investigation", "ED", r"enforcement directorate|directorate of enforcement"),
    ("intelligence-investigation", "CBI", r"\bcbi\b|central bureau of investigation"),
    ("intelligence-investigation", "SVP National Police Academy", r"vallabhbhai patel national police academy|\bsvp ?npa\b"),
    ("intelligence-investigation", "BPR&D", r"bureau of police research|\bbpr ?& ?d\b"),
    ("stores", "Army (IHQ of MoD (Army))", r"\barmy\b"),
    ("stores", "Navy (IHQ of MoD (Navy))", r"\bnavy\b|\bnaval\b"),
    ("stores", "Indian Air Force", r"air ?force"),
    ("stores", "Integrated Defence Staff", r"integrated defen[cs]e staff"),
    ("stores", "Coast Guard", r"coast ?guard"),
    ("stores", "Defence Estates", r"defen[cs]e estates|\bdgde\b"),
    ("stores", "IHQ of MoD (other)", r"\bihq\b|\bmod\b"),
]
# Terms that put a central buyer in the slice without naming a class: the reader sees each such
# buyer in classes.unclassified.
OTHER_SECURITY_RE = (r"\bdefen[cs]e\b|military|cantonment|\bndrf\b|disaster response force|intelligence|police|home affairs|"
                     r"\bmha\b|home department|forensic|fire service|home guard|civil defen[cs]e|prison|jail|"
                     r"special protection group|cabinet secretariat")
CENTRAL_SLICE_RE = "|".join(m[2] for m in MEMBERS) + "|" + OTHER_SECURITY_RE

# State portal: the department code (parsed from tender_id by the buyer rule) names the body ...
STATE_CODE_RE = r"pol|jail|pris|fire|fsl|forens|igp|^dgp|^cid$|^hg|hg$|hga$|fes$|^fesa$"
# ... except where the code regex catches a department whose own titles show it is not one.
STATE_CODE_EXCLUDED = {
    "Maharashtra / DGPSP": "titles are printing inks, folding machines and waste-paper sales (government printing and stationery), not police",
    "Andaman and Nicobar Island / DCFSL": "titles are forest-division works (silviculture camps, roads), not a forensic laboratory",
    "West Bengal / DMHG": "titles are district-administration projects (land-plan georeferencing, IEC material), not home guards",
}
# ... or the title names the body. Narrowed where the bare term is mostly something else (BARE_TERMS).
STATE_TITLE_RE = (r"\bpolice\b|\bpolicing\b|\bhome ?guards?\b|\bprisons?\b|\bjails?\b|"
                  r"\bcorrectional (home|homes|service|services|institution|institutions)\b|"
                  r"\bfire ?(station|stations|service|services|brigade|and emergency|& emergency|and rescue|& rescue|tender|tenders)\b|"
                  r"\bforensic\b|\bc\.?i\.?d\.? (office|headquarters|hq|unit|building|branch|wing|complex)\b|criminal investigation|"
                  r"director general of police|superintendent of police")
BARE_TERMS = {  # the bare forms NOT used in titles, and why; their leftover counts are emitted
    "dgp": (r"\bdgp\b", ("in titles the bare acronym is mostly a tag inside West Bengal works reference numbers ('257/DGP/2022-23', "
                         "'ADDA/DGP/…'), not the Director General of Police; DGP is matched in department codes and as 'director general of police'")),
    "cid": (r"\bcid\b", ("in titles the bare acronym is mostly pipe fittings ('CID joints') and other uses in irrigation and water-supply works; "
                         "the title rule needs 'CID office/headquarters/…' or 'criminal investigation'")),
    "fsl": (r"\bfsl\b", ("in titles FSL is split between forensic-science-laboratory purchases and 'full supply level' in water-tank works; the "
                         "title rule uses only 'forensic', so FSL-only forensic rows are among those left out (counted below)")),
    "fire": (r"\bfire\b", ("bare 'fire' catches fire-fighting, alarm and extinguisher installations in any building and forest fire lines; the "
                           "title rule needs a fire station, service, brigade, emergency/rescue unit or fire tender, so rows that say only "
                           "'fire fighting vehicle' are left out with them")),
}
_BARE_ANY = "|".join(v[0] for v in BARE_TERMS.values())

CLASS_DEFINITIONS = {
    "works": "Military Engineer Services and the Border Roads Organisation: buildings, roads, repairs, maintenance",
    "stores": ("the services' headquarters and stores buyers: IHQ of MoD (Army) and (Navy), the Indian Air Force, Integrated Defence Staff, "
               "the Coast Guard, Defence Estates"),
    "research": "DRDO and the Department of Defence Research and Development",
    "dpsu": ("defence public-sector undertakings: HAL, BEL, BDL, MDL, GRSE, GSL, HSL, CSL, BEML, MIDHANI, the seven companies carved out of the "
             "Ordnance Factory Board in 2021 (Munitions India, Armoured Vehicles Nigam / AVANI, Advanced Weapons and Equipment India, Troop "
             "Comforts, Yantra India, India Optel, Gliders India) and the legacy 'Ordnance Factory …' / '… Factory' names of the same plants"),
    "capf": "the central armed police forces: CRPF, BSF, CISF, ITBP, SSB, Assam Rifles, NSG",
    "intelligence-investigation": "IB, NIA, NCB, ED, CBI, the SVP National Police Academy, BPR&D",
    "state-police": ("state-portal rows whose department code or title names police, home guards, prisons or jails, fire services, forensic "
                     "laboratories, the CID or the DGP; the buyer is the pipeline's '<state> / <department code>'"),
    "other-security": "caught by the slice regex but by no class member; every such buyer key is in classes.unclassified",
}
CLASS_NOTES = {
    "dpsu": ("CSL is administered by the Ministry of Ports, Shipping and Waterways, not the Department of Defence Production; it is in this class "
             "because it builds for the Navy, and classes.map shows its rows separately so a reader can remove it. A DPSU sub-unit filed under "
             "'Department of Defence Production/…' (one GRSE unit) keeps the pipeline's buyer key and sits in other-security."),
    "state-police": ("Two routes, reported separately: 'department code' (the code names the body) and 'title' (another department's row whose "
                     "title names the body — mostly public-works and housing bodies building police stations, quarters and jails, and some "
                     "works that name a police station, jail or fire station only as a place)."),
}
CLASS_INNOCENT = {
    "works": ("Works tenders (buildings, roads, repairs) draw many local contractors, so this class's low single-bidder rate is a works "
              "rate, not a defence rate; its size dominates the slice."),
    "stores": ("Headquarters stores buyers purchase rations, medical stores, spares and equipment; spares are often proprietary or from an "
               "approved or OEM source, where one bid is what the procedure expects; a single bid on a proprietary spare is the rule working, "
               "not failing."),
    "research": "Laboratories buy specialised instruments and development items for which few vendors qualify; thin markets give few bids.",
    "dpsu": ("A DPSU buying components from its own developed vendor base is a supply chain, not an open market; one bid from a developed "
             "source is expected, and a DPSU's buying says nothing about the Union's capital acquisition, which is not on CPPP."),
    "capf": ("CAPF purchases mix rations, clothing, vehicles and works across remote locations; rate contracts and the move of common items "
             "to GeM can change what remains on CPPP from year to year."),
    "intelligence-investigation": "Few awards; the intervals are wide and the purchases are small, mixed and often specialised.",
    "state-police": ("Police housing corporations and public-works departments let many-bidder works for police buildings; prisons buy "
                     "rations and diet through local tenders with few local suppliers; title-only rows include works that name a police "
                     "station or jail only as a place."),
    "other-security": "A residual of bodies the regex caught by a security word; read the buyer list before reading the rate.",
}

READ_ME_FIRST = (
    "This is a slice of the CPPP award scrape, not India's security procurement. Defence capital acquisition is not on CPPP: it runs "
    "through the Defence Procurement Portal under the Defence Acquisition Procedure. GeM purchases are not here, and most state police "
    "procurement is on the states' own e-procurement portals, not this one. So this slice is what the central armed police forces, the "
    "services' headquarters, DRDO, BRO, MES, Defence Estates, the DPSUs and, where the department code or the title says so, state police, "
    "prisons, fire and forensic bodies bought in the open market and published on CPPP, after the pipeline's dedup rule. Every figure is "
    "dataset-only: the live verification sample found every stored link expired, so the scrape's agreement with the portal is unknown."
)
# appended at build time from the data: the largest buyer's share of the slice
READ_ME_FIRST_DOMINANCE = ("{buyer} ({cls}) alone is {pct}% of the slice's {n} award decisions, so read every rate by buyer class, never "
                           "for the slice as a whole.")

for _name, _rx in [("CENTRAL_SLICE_RE", CENTRAL_SLICE_RE), ("STATE_CODE_RE", STATE_CODE_RE), ("STATE_TITLE_RE", STATE_TITLE_RE), ("_BARE_ANY", _BARE_ANY)]:
    assert "'" not in _rx, f"{_name} must not contain a single quote: it is embedded in SQL"
    re.compile(_rx)
for _k in STATE_CODE_EXCLUDED:
    assert "'" not in _k

# --------------------------------------------------------------------------------------
# SQL — every string here is written verbatim into security.json → provenance.sliceSql
# --------------------------------------------------------------------------------------
_CODE_SQL = "regexp_extract(tender_id, '^\\d{4}_([A-Za-z][A-Za-z0-9]*)_\\d+_\\d+$', 1)"  # the buyer rule's own parse
_EXCLUDED_SQL = ", ".join(f"'{k}'" for k in STATE_CODE_EXCLUDED)
ROUTE_EXPR = f"""CASE WHEN junk_org THEN NULL
            WHEN portal_type = 0 AND regexp_matches(lower(trim(split_part(organisation_name, '||', 1))), '{CENTRAL_SLICE_RE}') THEN 'buyer'
            WHEN portal_type = 1 AND regexp_matches(lower({_CODE_SQL}), '{STATE_CODE_RE}') AND buyer NOT IN ({_EXCLUDED_SQL}) THEN 'department code'
            WHEN portal_type = 1 AND internal_id IN (SELECT internal_id FROM sec_title WHERE title_hit) THEN 'title' END"""


def _class_precedence() -> list[str]:
    """The order classes are tried in: the order of their first member in MEMBERS."""
    order: list[str] = []
    for c, _, _ in MEMBERS:
        if c not in order:
            order.append(c)
    return order


def _class_case() -> str:
    whens = " ".join(f"WHEN regexp_matches(lower(buyer), '{'|'.join(m[2] for m in MEMBERS if m[0] == c)}') THEN '{c}'"
                     for c in _class_precedence())
    return f"CASE WHEN route IS NULL THEN NULL WHEN portal_type = 1 THEN 'state-police' {whens} ELSE 'other-security' END"


CLASS_EXPR = _class_case()
MEMBER_EXPR = ("CASE WHEN portal_type <> 0 THEN NULL " +
               " ".join(f"WHEN regexp_matches(lower(buyer), '{rx}') THEN '{label}'" for _, label, rx in MEMBERS) + " END")
_YEAR = f"CASE WHEN aoc_year BETWEEN {B.YEAR_MIN} AND {B.YEAR_MAX} THEN aoc_year::VARCHAR ELSE 'out-of-range year' END"
# Identical to the CASE in build.SQL['timing_hist'] (test_build asserts it), so the bins are the same bins.
TIMING_BIN_CASE = """CASE WHEN days_to_aoc = 0 THEN '0' WHEN days_to_aoc = 1 THEN '1' WHEN days_to_aoc = 2 THEN '2'
         WHEN days_to_aoc <= 7 THEN '3–7' WHEN days_to_aoc <= 14 THEN '8–14' WHEN days_to_aoc <= 30 THEN '15–30'
         WHEN days_to_aoc <= 60 THEN '31–60' WHEN days_to_aoc <= 90 THEN '61–90' WHEN days_to_aoc <= 180 THEN '91–180'
         WHEN days_to_aoc <= 365 THEN '181–365' ELSE '>365' END"""
TIMING_BINS = ["0", "1", "2", "3–7", "8–14", "15–30", "31–60", "61–90", "91–180", "181–365", ">365"]
_RATED = "bids_received >= 1 AND bids_received <= 1000"
_RATE_COLS = B._RATE_COLS

SQL: dict[str, str] = {}
SQL["sec_title"] = f"""CREATE OR REPLACE TEMP TABLE sec_title AS
SELECT internal_id, regexp_matches(lower(title), '{STATE_TITLE_RE}') AS title_hit,
       {", ".join(f"regexp_matches(lower(title), '{v[0]}') AS bare_{k}" for k, v in BARE_TERMS.items())}
FROM t WHERE portal_type = 1 AND regexp_matches(lower(title), '{STATE_TITLE_RE}|{_BARE_ANY}')"""
SQL["sec_raw"] = f"""CREATE OR REPLACE TEMP TABLE sec_raw AS
SELECT *, {CLASS_EXPR} AS class FROM (SELECT *, {ROUTE_EXPR} AS route FROM base) WHERE route IS NOT NULL"""
SQL["sec"] = f"""CREATE OR REPLACE TEMP TABLE sec AS
SELECT *, {CLASS_EXPR} AS class FROM (SELECT *, {ROUTE_EXPR} AS route FROM dedup) WHERE route IS NOT NULL"""
SQL["sec_rated"] = f"CREATE OR REPLACE VIEW sec_rated AS SELECT * FROM sec WHERE {_RATED}"

SQL["quality_raw"] = """SELECT count(*) AS rows, count(DISTINCT tender_id) AS distinct_tender_ids,
       count(*) FILTER (WHERE portal = 'central') AS central_rows, count(*) FILTER (WHERE portal = 'state') AS state_rows FROM sec_raw"""
SQL["quality_raw_by_class"] = """SELECT class, count(*) AS rows, count(DISTINCT tender_id) AS distinct_tender_ids FROM sec_raw GROUP BY 1 ORDER BY 1"""
SQL["quality_dedup"] = f"""SELECT class, count(*) AS rows, count(DISTINCT tender_id) AS distinct_tender_ids,
       count(*) FILTER (WHERE portal = 'central') AS central_rows, count(*) FILTER (WHERE portal = 'state') AS state_rows,
       count(*) FILTER (WHERE bids_received IS NULL) AS bids_null, count(*) FILTER (WHERE bids_received = 0) AS bids_zero,
       count(*) FILTER (WHERE bids_received > 1000) AS bids_over_1000, count(*) FILTER (WHERE bids_received < 0) AS bids_negative,
       count(*) FILTER (WHERE {_RATED}) AS rated,
       count(*) FILTER (WHERE contract_value_amount IS NULL) AS value_null, count(*) FILTER (WHERE contract_value_amount <= 0) AS value_lte_zero,
       count(*) FILTER (WHERE contract_value_amount > 1e12) AS value_over_1e12,
       sum(contract_value_amount) FILTER (WHERE NOT ({B.IMPLAUSIBLE_VALUE})) AS plausible_sum,
       count(selected_bidder) AS named, count(*) FILTER (WHERE marked) AS marked,
       count(*) FILTER (WHERE selected_bidder IS NOT NULL AND NOT marked) AS unmarked,
       count(*) FILTER (WHERE selected_bidder IS NULL AND bids_received IS NULL AND contract_value_amount IS NULL AND tender_type IS NULL) AS all_award_fields_null
FROM sec GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""
SQL["quality_state_route"] = """SELECT route, count(*) AS rows, count(DISTINCT buyer) AS buyers FROM sec WHERE portal = 'state' GROUP BY 1 ORDER BY 1"""
SQL["quality_bare_terms"] = f"""SELECT {", ".join(f"count(*) FILTER (WHERE bare_{k}) AS {k}" for k in BARE_TERMS)}
FROM sec_title WHERE NOT title_hit AND internal_id NOT IN (SELECT internal_id FROM sec_raw)"""
SQL["class_map"] = f"""SELECT portal, buyer, class, route, {MEMBER_EXPR} AS member, count(*) AS rows FROM sec
WHERE portal = 'central' OR route = 'department code' GROUP BY ALL ORDER BY rows DESC, portal, buyer"""
SQL["class_members"] = f"""SELECT {MEMBER_EXPR} AS member, count(*) AS rows, count(DISTINCT buyer) AS buyers FROM sec WHERE portal = 'central' GROUP BY 1 ORDER BY 1"""
SQL["unclassified"] = """SELECT portal, buyer, count(*) AS rows FROM sec WHERE class = 'other-security' GROUP BY 1, 2 ORDER BY rows DESC, portal, buyer LIMIT 30"""
SQL["title_only_buyers"] = """WITH tb AS (SELECT buyer, count(*) AS rows FROM sec WHERE route = 'title' GROUP BY 1),
slice_raw AS (SELECT buyer, count(*) AS slice_raw_rows FROM sec_raw WHERE route = 'title' GROUP BY 1),
buyer_raw AS (SELECT buyer, count(*) AS buyer_raw_rows FROM base WHERE portal_type = 1 AND buyer IN (SELECT buyer FROM tb) GROUP BY 1)
SELECT tb.buyer, tb.rows, slice_raw.slice_raw_rows, buyer_raw.buyer_raw_rows
FROM tb LEFT JOIN slice_raw USING (buyer) LEFT JOIN buyer_raw USING (buyer) ORDER BY tb.rows DESC, tb.buyer"""
MOSTLY_SECURITY_MIN_RAW_ROWS, MOSTLY_SECURITY_MIN_SHARE_PCT = 20, 50.0
SQL["title_only_buyer_count"] = """SELECT count(DISTINCT buyer) AS buyers, count(*) AS rows FROM sec WHERE route = 'title'"""

SQL["rates_by_class"] = f"""SELECT class, {_RATE_COLS} FROM sec_rated GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""
SQL["rates_excluding_works"] = f"""SELECT {_RATE_COLS} FROM sec_rated WHERE class <> 'works'"""
SQL["rates_by_class_year"] = f"""SELECT class, portal, {_YEAR} AS year, {_RATE_COLS} FROM sec_rated GROUP BY 1, 2, 3 ORDER BY 1, 2, 3"""
SQL["rates_by_year"] = f"""SELECT {_YEAR} AS year, {_RATE_COLS} FROM sec_rated GROUP BY 1 ORDER BY 1"""
SQL["rates_state_route"] = f"""SELECT route, {_RATE_COLS} FROM sec_rated WHERE portal = 'state' GROUP BY 1 ORDER BY 1"""

SQL["bands"] = f"""SELECT class, value_band, count(*) AS rows, sum(contract_value_amount) FILTER (WHERE NOT ({B.IMPLAUSIBLE_VALUE})) AS value_sum,
       count(*) FILTER (WHERE {_RATED}) AS n, count(*) FILTER (WHERE bids_received = 1) AS single
FROM sec GROUP BY GROUPING SETS ((class, value_band), (value_band)) ORDER BY class NULLS FIRST, value_band"""

SQL["timing_hist"] = f"""SELECT class, {TIMING_BIN_CASE} AS bin, count(*) AS n
FROM sec WHERE days_to_aoc >= 0 GROUP BY GROUPING SETS ((class, bin), (bin)) ORDER BY class NULLS FIRST, bin"""
SQL["timing_summary"] = f"""SELECT class, count(*) AS n, count(*) FILTER (WHERE days_to_aoc <= {B.SHORT_DECISION_DAYS}) AS le2,
       median(days_to_aoc) AS median_days, avg(days_to_aoc) AS mean_days, quantile_cont(days_to_aoc, 0.9) AS p90_days
FROM sec WHERE days_to_aoc >= 0 GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""
SQL["timing_excluded"] = """SELECT class, count(*) AS rows, count(*) FILTER (WHERE days_to_aoc < 0) AS aoc_before_closing,
       count(*) FILTER (WHERE days_to_aoc IS NULL) AS date_missing FROM sec GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""

# concentration: build.SQL['concentration'] over the slice, with the eligibility threshold on MARKED plausible awards
SQL["concentration"] = f"""WITH fam AS (
  SELECT class, route, buyer, portal, bidder_norm, selected_bidder, marked, contract_value_amount AS v FROM sec
  WHERE selected_bidder IS NOT NULL AND NOT ({B.IMPLAUSIBLE_VALUE})
), buyers AS (
  SELECT class, route, buyer, portal, count(*) AS awards, sum(v) AS value_sum,
         count(*) FILTER (WHERE marked) AS marked_awards, sum(v) FILTER (WHERE marked) AS marked_value,
         count(*) FILTER (WHERE NOT marked) AS unmarked_awards, sum(v) FILTER (WHERE NOT marked) AS unmarked_value,
         count(DISTINCT bidder_norm) FILTER (WHERE marked) AS distinct_marked_winners
  FROM fam GROUP BY 1, 2, 3, 4 HAVING count(*) FILTER (WHERE marked) >= {B.CONCENTRATION_MIN_AWARDS}
), winners AS (
  SELECT f.buyer, f.portal, f.bidder_norm, arg_max(f.selected_bidder, (f.v, f.selected_bidder)) AS display_name, count(*) AS awards, sum(f.v) AS value_sum
  FROM fam f JOIN buyers b USING (buyer, portal) WHERE f.marked GROUP BY 1, 2, 3
), hhi AS (
  SELECT w.buyer, w.portal, sum(power(10000.0 * w.value_sum / b.marked_value, 2)) / 10000.0 AS hhi,
         sum(power(10000.0 * w.awards / b.marked_awards, 2)) / 10000.0 AS hhi_count,
         max(w.value_sum) / b.marked_value AS top_share, max(w.awards) * 1.0 / b.marked_awards AS top_share_count
  FROM winners w JOIN buyers b USING (buyer, portal) GROUP BY 1, 2, b.marked_value, b.marked_awards
)
SELECT b.*, h.hhi, h.hhi_count, h.top_share, h.top_share_count,
       (SELECT list(struct_pack(name := display_name, awards := awards, value := value_sum) ORDER BY value_sum DESC, bidder_norm)
        FROM (SELECT * FROM winners w WHERE w.buyer = b.buyer AND w.portal = b.portal AND w.awards >= {B.NAME_MIN_AWARDS} ORDER BY value_sum DESC, bidder_norm LIMIT 5)) AS top_marked_winners
FROM buyers b LEFT JOIN hhi h USING (buyer, portal) ORDER BY b.awards DESC, b.portal, b.buyer"""
SQL["concentration_by_class"] = f"""WITH fam AS (
  SELECT class, buyer, portal, bidder_norm, selected_bidder, contract_value_amount AS v FROM sec
  WHERE marked AND selected_bidder IS NOT NULL AND NOT ({B.IMPLAUSIBLE_VALUE})
), per_buyer AS (
  SELECT class, bidder_norm, buyer, portal, count(*) AS k FROM fam GROUP BY 1, 2, 3, 4
), eligible AS (
  SELECT class, bidder_norm, max(k) AS max_awards_one_buyer, count(*) AS buyers FROM per_buyer GROUP BY 1, 2 HAVING max(k) >= {B.NAME_MIN_AWARDS}
), agg AS (
  SELECT f.class, f.bidder_norm, arg_max(f.selected_bidder, (f.v, f.selected_bidder)) AS display_name, count(*) AS awards, sum(f.v) AS value_sum
  FROM fam f JOIN eligible e USING (class, bidder_norm) GROUP BY 1, 2
)
SELECT a.class, a.bidder_norm, a.display_name, a.awards, a.value_sum, e.max_awards_one_buyer, e.buyers,
       row_number() OVER (PARTITION BY a.class ORDER BY a.awards DESC, a.value_sum DESC, a.bidder_norm) AS rk
FROM agg a JOIN eligible e USING (class, bidder_norm) QUALIFY rk <= 10 ORDER BY a.class, rk"""

SQL["redflag_single"] = """SELECT class, count(*) AS family, count(*) FILTER (WHERE bids_received = 1) AS flagged FROM sec_rated GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""
SQL["redflag_non_open"] = """SELECT class, count(*) AS family, count(*) FILTER (WHERE tender_type_norm = 'Limited') AS flagged FROM sec WHERE tender_type_norm <> 'Other/unknown' GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""
SQL["redflag_non_open_labels"] = f"""SELECT count(*) AS n, count(DISTINCT tender_type) AS distinct_labels FROM sec
WHERE tender_type_norm = 'Other/unknown' AND regexp_matches(lower(trim(tender_type)), '{B.NON_OPEN_LABEL_RE}')"""
SQL["redflag_short"] = f"""SELECT class, count(*) AS family, count(*) FILTER (WHERE days_to_aoc <= {B.SHORT_DECISION_DAYS}) AS flagged FROM sec WHERE days_to_aoc >= 0 GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""
SQL["redflag_repeat"] = f"""WITH single AS (SELECT class, portal, buyer, bidder_norm FROM sec_rated WHERE bids_received = 1 AND marked),
pairs AS (SELECT class, portal, buyer, bidder_norm, count(*) AS k FROM single GROUP BY 1, 2, 3, 4)
SELECT class, sum(k) AS family, sum(k) FILTER (WHERE k >= {B.NAME_MIN_AWARDS}) AS flagged,
       count(*) AS pairs, count(*) FILTER (WHERE k >= {B.NAME_MIN_AWARDS}) AS repeat_pairs
FROM pairs GROUP BY GROUPING SETS ((class), ()) ORDER BY class NULLS FIRST"""

SLICE_RULE = {
    "family": ("award decisions after the pipeline's dedup rule (junk organisations excluded) whose buyer, department code or title "
               "matches the regexes below; every regex is applied case-insensitively to the lower-cased field"),
    "centralBuyerRegex": CENTRAL_SLICE_RE,
    "centralBuyerRegexAppliesTo": "lower(trim(first '||' segment of organisation_name)), central portal",
    "stateDepartmentCodeRegex": STATE_CODE_RE,
    "stateDepartmentCodeAppliesTo": "lower(department code parsed from tender_id by the buyer rule), state portal",
    "stateDepartmentCodeExcluded": STATE_CODE_EXCLUDED,
    "stateTitleRegex": STATE_TITLE_RE,
    "stateTitleAppliesTo": "lower(title), state portal, rows whose department code did not already match",
    "bareTermsNotUsedInTitles": {k: {"regex": v[0], "why": v[1]} for k, v in BARE_TERMS.items()},
    "classRule": ("each central buyer key (the pipeline's buyer rule) takes the class of the FIRST matching member in classMembers, in "
                  "order; every state-portal slice row is state-police; a central buyer that matches the slice regex but no member is "
                  "other-security"),
    "classMembers": [{"class": c, "member": m, "regex": rx} for c, m, rx in MEMBERS],
    "otherSecurityRegex": OTHER_SECURITY_RE,
    "classes": CLASS_ORDER,
    "notInSlice": ("a central row is in the slice by its BUYER, not its purpose: CPWD building a CAPF barrack, or a state PWD on the central "
                   "portal, is not in it; on the state portal a row enters by its department code or its title"),
}


# --------------------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------------------
def _rate(n, k) -> dict:
    n, k = int(n or 0), int(k or 0)
    return {"n": n, "singleBidder": k, "singleBidderPct": B.pct(k, n), "wilson95": B.wilson95(k, n)}


def _rate_row(r: dict) -> dict:
    out = _rate(r["n"], r["single"])
    out.update({"meanBids": None if r["mean_bids"] is None else round(float(r["mean_bids"]), 2), "medianBids": r["median_bids"]})
    return out


def _share(k, n) -> dict:
    k, n = int(k or 0), int(n or 0)
    return {"count": k, "n": n, "pct": B.pct(k, n), "wilson95": B.wilson95(k, n)}


def _round(x, nd=2):
    return None if x is None else round(float(x), nd)


def ms_only(name: str) -> bool:
    """True when some component of a marked name is marked ONLY by 'm/s' (a possible proprietor's trading name)."""
    for part in B.name_components(name):
        if not B._MARKER_PY.search(re.sub(r"m/s", " ", part, flags=re.I)):
            return True
    return False


def _whole_file(rates: dict, timing: dict, redflags: dict) -> dict:
    """Comparators read from this run's rates/timing/redflags documents (the same rows the sibling files hold)."""
    by_year: dict[str, list[int]] = {}
    by_portal_year: dict[tuple[str, str], list[int]] = {}
    by_portal: dict[str, list[int]] = {}
    for r in rates["byPortalYear"]:
        for acc in (by_year.setdefault(r["year"], [0, 0]), by_portal_year.setdefault((r["portal"], r["year"]), [0, 0]),
                    by_portal.setdefault(r["portal"], [0, 0])):
            acc[0] += r["n"]
            acc[1] += r["singleBidder"]
    total = [sum(v[0] for v in by_year.values()), sum(v[1] for v in by_year.values())]
    return {"byYear": by_year, "byPortalYear": by_portal_year, "byPortal": by_portal, "total": total,
            "bands": {r["key"]: r for r in rates["byValueBand"]},
            "timing": timing, "indicators": {i["indicator"]: i for i in redflags["indicators"]}}


# --------------------------------------------------------------------------------------
# the slice
# --------------------------------------------------------------------------------------
def write_security(con, out_dir, provenance: dict, rates: dict, timing: dict, redflags: dict, log=print) -> dict:
    for name in ("sec_title", "sec_raw", "sec", "sec_rated"):
        con.execute(SQL[name])
    rows_of, one = B.rows_of, B.one
    W = _whole_file(rates, timing, redflags)
    class_portal = {c: ("state" if c == "state-police" else "central") for c in CLASS_ORDER}

    def by_class(rows: list[dict]) -> tuple[dict, dict | None]:
        return {r["class"]: r for r in rows if r["class"] is not None}, next((r for r in rows if r["class"] is None), None)

    # ---- classes ---------------------------------------------------------------------
    cmap = rows_of(con, SQL["class_map"])
    cmap.sort(key=lambda r: CLASS_ORDER.index(r["class"]))  # stable: within a class the SQL's total order stands
    members = {r["member"]: r for r in rows_of(con, SQL["class_members"])}
    title_n = one(con, SQL["title_only_buyer_count"])
    title_only = [{"buyer": r["buyer"], "rows": r["rows"], "sliceRawRows": int(r["slice_raw_rows"] or 0), "buyerRawRows": int(r["buyer_raw_rows"] or 0),
                   "sliceShareOfBuyerRawRowsPct": B.pct(int(r["slice_raw_rows"] or 0), int(r["buyer_raw_rows"] or 0))}
                  for r in rows_of(con, SQL["title_only_buyers"])]
    mostly = sorted((r for r in title_only if r["buyerRawRows"] >= MOSTLY_SECURITY_MIN_RAW_ROWS
                     and (r["sliceShareOfBuyerRawRowsPct"] or 0) >= MOSTLY_SECURITY_MIN_SHARE_PCT),
                    key=lambda r: (-r["sliceShareOfBuyerRawRowsPct"], -r["buyerRawRows"], r["buyer"]))
    classes = {
        "definitions": {c: {"definition": CLASS_DEFINITIONS[c], "innocentReading": CLASS_INNOCENT[c],
                            **({"note": CLASS_NOTES[c]} if c in CLASS_NOTES else {})} for c in CLASS_ORDER},
        "map": [{"portal": r["portal"], "buyer": r["buyer"], "class": r["class"], "member": r["member"], "route": r["route"], "rows": r["rows"]}
                for r in cmap],
        "mapNote": ("every central buyer key in the slice and every state buyer key that entered by its department code, with its dedup rows; "
                    "state buyers that entered by title alone are in titleOnlyBuyers"),
        "memberCoverage": [{"class": c, "member": m, "rows": int((members.get(m) or {}).get("rows") or 0),
                            "buyers": int((members.get(m) or {}).get("buyers") or 0)} for c, m, _ in MEMBERS],
        "memberCoverageNote": ("dedup rows per class member on the central portal; a member with 0 rows has no buyer key of its own in this "
                               "scrape (it may buy on its own portal, on GeM, or under a parent body's key)"),
        "unclassified": rows_of(con, SQL["unclassified"]),
        "unclassifiedNote": "the 30 largest buyer keys the slice regex caught but no class member did (class other-security), by dedup rows",
        "titleOnlyBuyers": title_only[:30],
        "titleOnlyBuyersTotal": {"buyers": title_n["buyers"], "rows": title_n["rows"]},
        "titleOnlyBuyersMostlySecurityTitled": mostly,
        "titleOnlyBuyersMostlySecurityTitledNote": (
            f"title-only buyers with >= {MOSTLY_SECURITY_MIN_RAW_ROWS} raw rows of which the title rule took >= "
            f"{MOSTLY_SECURITY_MIN_SHARE_PCT:g}%, by share: on the evidence of their own titles these are likely police, prisons or "
            "police-housing bodies whose department code does not name them, so their untitled rows are outside the slice. A reading aid "
            "with an arbitrary cut, not a rule: nothing here is added to the slice"),
        "titleOnlyBuyersNote": ("the 30 largest state buyer keys whose rows entered the slice by title alone, by slice dedup rows; only their "
                                "matching rows are in the slice. sliceShareOfBuyerRawRowsPct is the share of the buyer's own raw rows that the "
                                "title rule took: a public-works department shows a small share; a police, prisons or police-housing body whose "
                                "department code does not name it shows a large one, and its other rows are NOT in the slice"),
    }

    # ---- quality ---------------------------------------------------------------------
    raw = one(con, SQL["quality_raw"])
    raw_cls = {r["class"]: r for r in rows_of(con, SQL["quality_raw_by_class"])}
    dq, dq_total = by_class(rows_of(con, SQL["quality_dedup"]))

    def qrow(r: dict | None, rr: dict | None) -> dict:
        r = r or {}
        g = lambda k: int(r.get(k) or 0)  # noqa: E731
        return {"rawRows": int((rr or {}).get("rows") or 0), "rawDistinctTenderIds": int((rr or {}).get("distinct_tender_ids") or 0),
                "dedupRows": g("rows"), "dedupDistinctTenderIds": g("distinct_tender_ids"),
                "byPortal": {"central": g("central_rows"), "state": g("state_rows")},
                "bidsReceived": {"null": g("bids_null"), "zero": g("bids_zero"), "over1000": g("bids_over_1000"), "negative": g("bids_negative"),
                                 "inDenominator": g("rated"), "excludedFromDenominator": g("rows") - g("rated")},
                "contractValue": {"null": g("value_null"), "lteZero": g("value_lte_zero"), "over1e12": g("value_over_1e12"),
                                  "plausibleSumInr": B._money(r.get("plausible_sum"))},
                "allAwardFieldsNull": g("all_award_fields_null"),
                "winnerMarkers": {"named": g("named"), "marked": g("marked"), "unmarked": g("unmarked"), "markedSharePct": B.pct(g("marked"), g("named"))}}

    bare = one(con, SQL["quality_bare_terms"])
    quality = {
        "readMeFirst": ("The slice's own counts, stated before any rate. Raw rows are before the dedup rule; every other count is over "
                        "award decisions after it. Nulls and implausible values are counted per class, as in quality.json."),
        "raw": {"rows": raw["rows"], "distinctTenderIds": raw["distinct_tender_ids"], "byPortal": {"central": raw["central_rows"], "state": raw["state_rows"]},
                "shareOfFileRowsPct": B.pct(raw["rows"], provenance["rows"])},
        "afterDedup": {"rule": B.DEDUP_RULE, "rows": int(dq_total["rows"]) if dq_total else 0,
                       "shareOfFileDedupRowsPct": B.pct(int(dq_total["rows"]) if dq_total else 0, provenance["afterDedupRows"])},
        "total": qrow(dq_total, {"rows": raw["rows"], "distinct_tender_ids": raw["distinct_tender_ids"]}),
        "byClass": [{"class": c, **qrow(dq.get(c), raw_cls.get(c))} for c in CLASS_ORDER],
        "stateRoutes": rows_of(con, SQL["quality_state_route"]),
        "bareTitleTermsLeftOut": {"base": "raw state-portal rows whose title carries the bare term, taken by no route of the slice",
                                  **{k: int(bare[k] or 0) for k in BARE_TERMS}},
        "innocentReading": ("The slice is a regex over names, codes and titles: it can miss a security body that writes its name another way "
                            "and catch a body that is not one. classes.map, classes.unclassified and classes.titleOnlyBuyers list what it "
                            "caught, so the reader can check every key."),
    }

    # ---- rates -----------------------------------------------------------------------
    rc, rc_total = by_class(rows_of(con, SQL["rates_by_class"]))
    wf_total = _rate(*W["total"])

    def wf_portal(portal: str) -> dict:
        return _rate(*W["byPortal"].get(portal, [0, 0]))

    by_class_rates = []
    for c in CLASS_ORDER:
        row = {"class": c, "portal": class_portal[c]}
        row.update(_rate_row(rc[c]) if c in rc else {**_rate(0, 0), "meanBids": None, "medianBids": None})
        row["wholeFile"] = wf_total
        row["wholeFileSamePortal"] = {"portal": class_portal[c], **wf_portal(class_portal[c])}
        by_class_rates.append(row)
    slice_total = _rate_row(rc_total) if rc_total else {**_rate(0, 0), "meanBids": None, "medianBids": None}
    rest = _rate(W["total"][0] - slice_total["n"], W["total"][1] - slice_total["singleBidder"])
    by_class_year = []
    for r in rows_of(con, SQL["rates_by_class_year"]):
        y = r["year"]
        by_class_year.append({"class": r["class"], "portal": r["portal"], "year": y, **_rate_row(r),
                              "wholeFile": _rate(*W["byYear"].get(y, [0, 0])),
                              "wholeFileSamePortal": {"portal": r["portal"], **_rate(*W["byPortalYear"].get((r["portal"], y), [0, 0]))}})
    by_class_year.sort(key=lambda r: (CLASS_ORDER.index(r["class"]), r["portal"], r["year"]))
    rates_doc = {
        "denominator": f"slice {B.DENOMINATOR}",
        "denominatorN": slice_total["n"],
        "rateDefinition": "singleBidderPct = 100 * awards with bids_received = 1 / n; wilson95 = Wilson score interval at 95%, in percent",
        "comparatorRule": ("wholeFile and wholeFileSamePortal are read from this run's rates.json byPortalYear rows (summed over portals, or "
                           "over years, as labelled); restOfFile = wholeFile minus the slice; nothing is re-derived"),
        "total": {**slice_total, "wholeFile": wf_total, "restOfFile": rest},
        "excludingWorks": {**_rate_row(one(con, SQL["rates_excluding_works"])), "note": "the slice without the works class (MES and BRO), which dominates it"},
        "byClass": by_class_rates,
        "byClassYear": by_class_year,
        "byYear": [{"year": r["year"], **_rate_row(r), "wholeFile": _rate(*W["byYear"].get(r["year"], [0, 0]))} for r in rows_of(con, SQL["rates_by_year"])],
        "stateByRoute": [{"route": r["route"], **_rate_row(r), "wholeFileSamePortal": {"portal": "state", **wf_portal("state")}}
                         for r in rows_of(con, SQL["rates_state_route"])],
        "innocentReading": ("Works tenders draw many bidders; proprietary spares and developed-source components draw one; a DPSU buying from "
                            "its own supply chain is not a market. A class's rate beside the whole file says how this slice of the scrape "
                            "differs, not whether anyone's conduct does; years differ in which bodies and tender types the scrape holds."),
        "caveat": B.RATES_CAVEAT,
    }

    # ---- bands -----------------------------------------------------------------------
    band_keys = [b["band"] for b in B.VALUE_BANDS] + [B.VALUE_BAND_OTHER]
    braw = rows_of(con, SQL["bands"])
    bidx = {(r["class"], r["value_band"]): r for r in braw}
    bands_by_class = []
    for c in [None] + CLASS_ORDER:
        tot = sum(int((bidx.get((c, k)) or {}).get("rows") or 0) for k in band_keys)
        rows = []
        for k in band_keys:
            r = bidx.get((c, k)) or {}
            wf = W["bands"].get(k)
            rows.append({"band": k, "rows": int(r.get("rows") or 0), "shareOfClassRowsPct": B.pct(int(r.get("rows") or 0), tot),
                         "valueSumInr": B._money(r.get("value_sum")) if k != B.VALUE_BAND_OTHER else None,
                         **_rate(r.get("n"), r.get("single")),
                         "wholeFile": _rate(wf["n"], wf["singleBidder"]) if wf else _rate(0, 0)})
        bands_by_class.append({"class": c if c is not None else "all slice", "rows": tot, "bands": rows})
    bands_doc = {
        "thresholdsInr": B.VALUE_BANDS, "implausibleRule": B.IMPLAUSIBLE_VALUE,
        "definition": ("dedup rows per value band (thresholds in provenance.valueBandsInr) with the plausible value sum, and the single-bidder "
                       f"rate over the band's rows in the denominator ({_RATED}); the '{B.VALUE_BAND_OTHER}' row is always shown"),
        "byClass": bands_by_class,
        "innocentReading": ("Large works and ships are few and draw specialised bidders; small local purchases are many and draw one or two; "
                            "a band's value sum is as reported by the scrape and unverified, and one mis-keyed value can dominate a band."),
    }

    # ---- timing ----------------------------------------------------------------------
    hist = {(r["class"], r["bin"]): r["n"] for r in rows_of(con, SQL["timing_hist"])}
    ts, ts_total = by_class(rows_of(con, SQL["timing_summary"]))
    tx, tx_total = by_class(rows_of(con, SQL["timing_excluded"]))
    wf_t = W["timing"]
    wf_t_portal = {r["portal"]: r for r in wf_t["byPortal"]}

    def trow(c, s, x) -> dict:
        s, x = s or {}, x or {}
        n = int(s.get("n") or 0)
        portal = class_portal.get(c)
        out = {"class": c if c is not None else "all slice", "dedupRows": int(x.get("rows") or 0), "n": n,
               "excludedAocBeforeClosing": int(x.get("aoc_before_closing") or 0), "excludedDateMissing": int(x.get("date_missing") or 0),
               "daysClosingToAoc": [{"bin": b, "n": int(hist.get((c, b), 0))} for b in TIMING_BINS],
               "shareLe2Days": _share(s.get("le2"), n),
               "medianDays": s.get("median_days"), "meanDays": _round(s.get("mean_days")), "p90Days": _round(s.get("p90_days")),
               "wholeFile": {"shareLe2DaysPct": wf_t["shareLe2Days"]["pct"], "wilson95": wf_t["shareLe2Days"]["wilson95"], "n": wf_t["n"],
                             "medianDays": wf_t["medianDays"]}}
        if portal:
            p = wf_t_portal.get(portal) or {}
            out["wholeFileSamePortal"] = {"portal": portal, "shareLe2DaysPct": p.get("le2DaysPct"), "wilson95": p.get("wilson95"), "n": p.get("n"),
                                          "medianDays": p.get("medianDays")}
        return out

    timing_doc = {
        "definition": B.timing_definition(sliced=True),
        "total": trow(None, ts_total, tx_total),
        "byClass": [trow(c, ts.get(c), tx.get(c)) for c in CLASS_ORDER],
        "innocentReading": B.DATE_GAP_READING,
        "fieldSemanticsAudit": B.date_field_semantics(),
    }

    # ---- concentration ---------------------------------------------------------------
    conc_rows = []
    for r in rows_of(con, SQL["concentration"]):
        winners = r["top_marked_winners"] or []
        conc_rows.append({
            "portal": r["portal"], "buyer": r["buyer"], "class": r["class"], "route": r["route"], "awards": r["awards"],
            "valueSumInr": B._money(r["value_sum"]), "markedAwards": r["marked_awards"], "unmarkedAwards": r["unmarked_awards"],
            "unmarkedShareOfAwardsPct": B.pct(r["unmarked_awards"], r["awards"]),
            "unmarkedShareOfValuePct": B.pct(r["unmarked_value"] or 0, r["value_sum"]) if r["value_sum"] else None,
            "distinctMarkedWinners": r["distinct_marked_winners"],
            "hhiMarkedValue": None if r["hhi"] is None else round(float(r["hhi"]), 1),
            "hhiMarkedCount": None if r["hhi_count"] is None else round(float(r["hhi_count"]), 1),
            "topMarkedWinnerSharePct": None if r["top_share"] is None else round(100 * float(r["top_share"]), 2),
            "topMarkedWinnerShareOfCountPct": None if r["top_share_count"] is None else round(100 * float(r["top_share_count"]), 2),
            "topMarkedWinners": [{"name": w["name"], "awards": int(w["awards"]), "valueInr": B._money(w["value"])} for w in winners],
        })
    ctop: dict[str, list] = {c: [] for c in CLASS_ORDER}
    for r in rows_of(con, SQL["concentration_by_class"]):
        ctop[r["class"]].append({"name": r["display_name"], "awards": int(r["awards"]), "valueInr": B._money(r["value_sum"]),
                                 "maxAwardsFromOneBuyer": int(r["max_awards_one_buyer"]), "buyers": int(r["buyers"])})
    named = sorted({w["name"] for row in conc_rows for w in row["topMarkedWinners"]} | {w["name"] for ws in ctop.values() for w in ws})
    concentration_doc = {
        "family": (f"slice award decisions after dedup with a named winner and a plausible value (NOT ({B.IMPLAUSIBLE_VALUE})), for buyers "
                   f"with >= {B.CONCENTRATION_MIN_AWARDS} such awards to MARKED winners (concentration.json thresholds on all named awards; "
                   "this file on marked awards, so every HHI here rests on at least 50 marked awards); for a state buyer that entered by title, "
                   "only its slice rows"),
        "hhiDefinition": ("hhiMarkedValue and hhiMarkedCount exactly as concentration.json: the sum over marked winners of (share × 10000)^2 / "
                          "10000 on the 0–10000 scale, of award value and of award count; unmarked winners are excluded and reported as a share"),
        "namingRule": (f"topMarkedWinners lists at most 5 winners per buyer, each matching markerRegex in every component and with >= "
                       f"{B.NAME_MIN_AWARDS} awards for that buyer — the rule of concentration.json; byClass lists at most 10 marked winners "
                       f"per class by awards across the class, each with >= {B.NAME_MIN_AWARDS} awards from at least one buyer of the class "
                       "(maxAwardsFromOneBuyer); nobody else is named"),
        "buyers": len(conc_rows), "byBuyer": conc_rows,
        "crossFileNote": ("a central buyer's family here equals its family in concentration.json, and its counts, HHIs, shares and named "
                          "winners are identical there; value sums are floating-point sums taken in a different row order, so they can "
                          "differ in the last paise"),
        "byClass": [{"class": c, "topMarkedWinners": ctop[c]} for c in CLASS_ORDER],
        "msOnlyNamed": {"n": sum(ms_only(n) for n in named), "of": len(named),
                        "note": "distinct names shown here that some component carries only because of 'm/s'; they may be trading names of individuals"},
        "innocentReading": ("A buyer with a specialised need, an approved-source list, a developed vendor for a DPSU, or a thin local contractor "
                            "pool concentrates awards for reasons that involve nobody's conduct; a high HHI is a question, not a finding, and "
                            "a named winner is a firm that won, nothing more."),
    }

    # ---- red flags -------------------------------------------------------------------
    def indicator(name: str, definition: str, family_def: str, rows: list[dict], innocent: str, extra: dict | None = None) -> dict:
        idx, tot = by_class(rows)
        tot = tot or {"family": 0, "flagged": 0}
        fam, cnt = int(tot["family"] or 0), int(tot["flagged"] or 0)
        wf = W["indicators"][name]
        out = {"indicator": name, "definition": definition, "familyDefinition": family_def, "familySize": fam, "count": cnt,
               "ratePct": B.pct(cnt, fam), "wilson95": B.wilson95(cnt, fam),
               "byClass": [{"class": c, "familySize": int((idx.get(c) or {}).get("family") or 0), "count": int((idx.get(c) or {}).get("flagged") or 0),
                            "ratePct": B.pct(int((idx.get(c) or {}).get("flagged") or 0), int((idx.get(c) or {}).get("family") or 0)),
                            "wilson95": B.wilson95(int((idx.get(c) or {}).get("flagged") or 0), int((idx.get(c) or {}).get("family") or 0))}
                           for c in CLASS_ORDER],
               "wholeFile": {"familySize": wf["familySize"], "count": wf["count"], "ratePct": wf["ratePct"], "wilson95": wf["wilson95"]},
               "innocentReading": innocent}
        if extra:
            out.update(extra)
        return out

    rep = rows_of(con, SQL["redflag_repeat"])
    rep_idx, rep_total = by_class(rep)
    rep_total = rep_total or {"pairs": 0, "repeat_pairs": 0}
    wf_rep = W["indicators"]["repeatSingleBidderMarkedWinners"]
    redflags_doc = {
        "stance": "The four indicators of redflags.json over the slice, each as a rate over its declared family, by class, beside the whole-file rate. Rates over a family, never a list of culprits." + B.DATE_GAP_STANCE,
        "indicators": [
            indicator("singleBidding", "bids_received = 1", f"slice award decisions after dedup with {_RATED}", rows_of(con, SQL["redflag_single"]),
                      "Proprietary spares, developed-source DPSU components and specialised laboratory items draw one bid by design; works draw many. The class, not the slice, is the unit to read."),
            indicator("nonOpenTenderType", "tender_type normalises to 'Limited'",
                      "slice award decisions after dedup whose tender_type normalises to Works, Goods, Services or Limited (Other/unknown excluded)",
                      rows_of(con, SQL["redflag_non_open"]),
                      "Limited tenders are lawful below thresholds, for urgent needs and for proprietary or security-classified items; the field mixes category with method, so this rate is a floor on non-open procedures.",
                      {"nonOpenLabelsLeftInOtherUnknown": one(con, SQL["redflag_non_open_labels"]), "nonOpenLabelRegex": B.NON_OPEN_LABEL_RE}),
            indicator("shortDecisionWindow", B.short_gap_definition(B.SHORT_DECISION_DAYS), B.short_gap_family(sliced=True),
                      rows_of(con, SQL["redflag_short"]),
                      B.DATE_GAP_READING, {"fieldSemanticsAudit": B.date_field_semantics()}),
            indicator("repeatSingleBidderMarkedWinners",
                      f"single-bidder awards to a (buyer, marked winner) pair with >= {B.NAME_MIN_AWARDS} single-bidder awards from that buyer",
                      "slice single-bidder awards after dedup to MARKED winners", rep,
                      "A repeat single bidder is what an OEM, an approved source for a spare, a DPSU's developed vendor or a rate-contract holder looks like; pairs are a question, not a finding.",
                      {"pairs": int(rep_total["pairs"] or 0), "repeatPairs": int(rep_total["repeat_pairs"] or 0),
                       "pairsByClass": [{"class": c, "pairs": int((rep_idx.get(c) or {}).get("pairs") or 0),
                                         "repeatPairs": int((rep_idx.get(c) or {}).get("repeat_pairs") or 0)} for c in CLASS_ORDER],
                       "wholeFilePairs": {"pairs": wf_rep.get("pairs"), "repeatPairs": wf_rep.get("repeatPairs")},
                       "noNames": "pairs are counted, never listed"}),
        ],
    }

    headline = [{"class": r["class"], "rawRows": q["rawRows"], "dedupRows": q["dedupRows"], "n": r["n"], "singleBidder": r["singleBidder"],
                 "singleBidderPct": r["singleBidderPct"], "wilson95": r["wilson95"],
                 "wholeFileSamePortalPct": r["wholeFileSamePortal"]["singleBidderPct"], "wholeFilePct": r["wholeFile"]["singleBidderPct"]}
                for r, q in zip(by_class_rates, quality["byClass"])]
    top_buyer = max(cmap, key=lambda r: (r["rows"], r["buyer"])) if cmap else None
    read_me = READ_ME_FIRST
    if top_buyer and quality["afterDedup"]["rows"]:
        read_me += " " + READ_ME_FIRST_DOMINANCE.format(buyer=top_buyer["buyer"], cls=top_buyer["class"],
                                                       pct=B.pct(top_buyer["rows"], quality["afterDedup"]["rows"]),
                                                       n=f"{quality['afterDedup']['rows']:,}")
    doc = {
        "readMeFirst": read_me,
        "sliceRule": SLICE_RULE,
        "classes": classes,
        "headline": headline,
        "headlineNote": "rows before and after dedup and the single-bidder rate per class, beside the whole file on the same portal and the whole file",
        "quality": quality,
        "rates": rates_doc,
        "bands": bands_doc,
        "timing": timing_doc,
        "concentration": concentration_doc,
        "redflags": redflags_doc,
        "caveat": B.RATES_CAVEAT,
        "provenance": {**provenance, "sliceRule": SLICE_RULE, "sliceSql": dict(SQL), "dateFieldSemanticsAudit": B.date_field_semantics()},
    }
    B._write(out_dir / "security.json", doc)
    log(f"security.json: {quality['afterDedup']['rows']:,} slice award decisions")
    return doc
