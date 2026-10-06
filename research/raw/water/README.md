# Water and food evidence inputs

This separate evidence desk covers source releases dated **6 October 2021 through 6 October 2026**, inclusive. Original publication date, observed period and retrieval date are distinct. The default evidence filter includes verified releases inside that window; undated reports and older methodological background remain accessible through explicit filters. A report title, URL directory or retrieval date is not substituted for an unknown release date.

The retained inputs are `public-research.json`, `food-research.json` and `weather-research.json`. `scripts/water/assemble.mjs` deterministically adapts their reviewed fields to `src/data/water-research.json`. These files do not use the corporate graph entity/edge schema and are checked by their own validation gate.

The compiled snapshot contains **52 source records, 355 quantitative observations, 14 official discovery routes and 16 attributed findings or research questions**. All 36 states/UTs are selectable. Actual numeric coverage is finite:

- Rural administrative reporting: 34 states/UTs at the dated 27 July 2026 JJM snapshot. Delhi and Chandigarh are absent, not zero.
- JJM 2024 service survey: India plus 34 states/UTs, with four separate measures. Sampled Har Ghar Jal villages are not all rural villages.
- AMRUT: 15 selected urban-local-body programme connection counts, not all connections or coverage percentages in those cities.
- Agriculture/food: national crop series, selected leading producing states, a Dahod district programme figure and dated national irrigation/storage observations. Village training records establish an activity, not village crop production or improved outcomes.
- Weather: four explicitly scoped historical observations, alongside dated reports, attributed discussions and archived forecasts. No live alert is inferred.

The survey's published functionality index is the **minimum of separate marginal percentages**. The report says the design cannot identify the same household meeting all criteria. That index is neither an observed joint attainment rate nor a universal safe-water score. Household quality percentages refer to microbiological and pH testing; source-water chemistry is discussed separately in the report. The adapter keeps regularity and quantity separate and never treats the minimum index as joint household functionality.

Place matching uses explicit locality records and aliases within the selected state. A publisher address, generic word such as “mandi,” or crop name is not local evidence. District, city, block and village boundaries remain distinct. Official discovery tools remain available when an unknown village has no loaded records; their availability does not establish local coverage.

Forecast issuance, validity start and expiry are separate. One historical bulletin has no precise whole-document expiry and remains “unknown validity.” The Cuttack advisory has an explicit historical expiry. Neither is a current alert.

Tender estimates, awards and payments are different stages. Crop output is not market arrival; capacity is not inventory. CAG findings are attributed to the auditor, with government/management replies and the historical period preserved. Analytical questions require alternative explanations and a concrete check that could resolve or weaken them. No automated corruption, drought or water-safety score is produced.

`evidence/` preserves:

- `public/`: original AMRUT PDF and text; a clearly marked four-page excerpt from the 22.6 MB JJM report, original-report text, original/excerpt SHA-256 hashes and page mapping; JJM administrative indexed text; relevant public-document extracts and access failures.
- `food/`: original crop table PDF, SHA-256 manifest and relevant official extracts, including audit responses.
- `weather/`: the bounded search/fetch research receipt. Indexed text retrieval is distinguished from a full original-document or visual-page audit.

The validator verifies all three retained PDF hashes. The original full JJM PDF remains available at its source URL; its hash is recorded, and the committed PDF is explicitly an excerpt rather than a claimed complete original.

Run from the repository root:

```sh
node scripts/water/assemble.mjs
node scripts/water/validate.mjs
node --test scripts/water/water.test.mjs
```

The independent extraction audit requires `pypdf` and runs offline:

```sh
python3 scripts/water/audit-public-source.py
```

That audit checks 301 curated public-water observations against the retained research, 272 administrative cells against the indexed original table, 140 survey percentages against the PDF excerpt and 15 AMRUT values against the original PDF. The Node gate also checks groundwater category totals/extraction ratio, the PDMC component sum and crop area–production–yield rounding.
