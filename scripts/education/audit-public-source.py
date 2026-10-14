#!/usr/bin/env python3
"""Compare the curated school series with a downloaded original parliamentary PDF.

This is an offline audit: the researcher supplies a PDF downloaded from the URL
in the source registry. Requires pypdf; does not contact or repeatedly retry sites.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

from pypdf import PdfReader


def rows(pages):
    result = {}
    for page in pages:
        for line in (page.extract_text() or "").splitlines():
            match = re.match(r"^(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$", line)
            if match:
                result[match[1].strip()] = [int(value) for value in match.groups()[1:]]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("school_pdf", type=Path, help="Lok Sabha Q1374, 27 July 2026, original PDF")
    parser.add_argument("--data", type=Path, default=Path(__file__).resolve().parents[2] / "src/data/education-research.json")
    args = parser.parse_args()
    data = json.loads(args.data.read_text())
    reader = PdfReader(args.school_pdf)
    assert len(reader.pages) >= 6, "Expected the source annexures on PDF pages 4–6."
    states = rows([reader.pages[3]])
    districts = rows([reader.pages[4], reader.pages[5]])
    assert len(states) == 37, f"Expected India plus 36 state/UT rows, found {len(states)}."
    assert len(districts) == 76, f"Expected 75 districts plus Total, found {len(districts)}."
    errors = []
    for series in data["schoolSeries"]:
        name = {"India": "INDIA", "Tamil Nadu": "Tamilnadu"}.get(series["name"], series["name"])
        table = districts if series.get("localityId") else states
        actual = [point["value"] for point in sorted(series["points"], key=lambda point: point["year"])]
        if table.get(name) != actual:
            errors.append({"name": name, "source": table.get(name), "curated": actual})
    assert len(data["schoolSeries"]) == 112, "Expected all 112 school-stock series."
    for year_index in range(5):
        assert sum(values[year_index] for name, values in states.items() if name != "INDIA") == states["INDIA"][year_index]
        assert sum(values[year_index] for name, values in districts.items() if name != "Total") == states["Uttar Pradesh"][year_index]
    report = {
        "source": "Lok Sabha Q1374, 27 July 2026; Annexure I PDF p4; Annexure II PDF pp5–6",
        "sha256": hashlib.sha256(args.school_pdf.read_bytes()).hexdigest(),
        "series_compared": len(data["schoolSeries"]),
        "values_compared": len(data["schoolSeries"]) * 5,
        "state_and_district_sums_reconcile": True,
        "mismatches": errors,
    }
    print(json.dumps(report, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
