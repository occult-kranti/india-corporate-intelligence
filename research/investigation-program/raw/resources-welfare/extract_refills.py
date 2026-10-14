#!/usr/bin/env python3
"""Verify the saved 37-row table against the original, hash-bound public PDF.

Usage: python extract_refills.py /path/to/AU4116_Jq69sG.pdf
Requires PyMuPDF. Downloads are intentionally separate from verification.
"""
import hashlib
import json
from pathlib import Path
import re
import sys

import fitz

root = Path(__file__).resolve().parent
saved = json.loads((root / "pmuy-refill-extract.json").read_text())
pdf_path = Path(sys.argv[1])
digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
assert digest == saved["sourceSha256"], "PDF bytes differ from the inspected source; review the new version before using it"
with fitz.open(pdf_path) as pdf:
    assert len(pdf) == 4
    page = pdf[3].get_text()
assert "Annexure-B" in page and "Prorated" in page and "Jan 26" in page
table = "Chandigarh" + page.split("Chandigarh", 1)[1]
pattern = re.compile(r"([^\d]+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})")
rows = [{
    "state": " ".join(match.group(1).split()),
    "pmuy2024_25": match.group(2),
    "pmuy2025_26Prorated": match.group(3),
    "nonPmuy2024_25": match.group(4),
    "nonPmuy2025_26Prorated": match.group(5),
} for match in pattern.finditer(table)]
assert len(rows) == 37 and rows[-1]["state"] == "All India"
assert rows == saved["rows"], "Extracted table differs from saved rows"
print(json.dumps({"verified": True, "rows": len(rows), "numericCells": len(rows) * 4, "pdfSha256": digest}))
