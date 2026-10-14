#!/usr/bin/env python3
"""Offline controls for the retained public-works corporate/office source slice."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[2]
raw = json.loads((root / "research/raw/public-works/connections-research.json").read_text())
manifest = json.loads((root / "evidence/public-works-connections/sha256-manifest.json").read_text())
checks = 0
for artifact in manifest:
    payload = (root / artifact["path"]).read_bytes()
    assert len(payload) == artifact["bytes"], artifact["path"]
    assert hashlib.sha256(payload).hexdigest() == artifact["sha256"], artifact["path"]
    checks += 2

sources = {item["id"]: item for item in raw["sources"]}
entities = {item["id"]: item for item in raw["entities"]}
edges = {item["id"]: item for item in raw["relationships"]}
text = (root / "research/raw/public-works/connection-evidence/irb-2024-excerpt.txt").read_text()
assert "Note 46: Donation" in text and "Note 45: Donation" in text
assert "676.20" in text and "360.00" in text and "300.00" in text and "16.20" in text
assert "party amounting to I Nil" in text
assert "Modern Road Makers Private Limited" in text and "IRB MP Expressway Private Limited" in text
assert "100%" in text and "00183554" in text
checks += 5

contributions = [edge for edge in edges.values() if edge["kind"] == "contribution"]
assert len(contributions) == 2
assert all(edge["from"] == "pwg-irb-group-fy24" for edge in contributions)
assert entities["pwg-irb-group-fy24"]["type"] == "group"
assert all(edge["fromDate"] == "2023-04-01" and edge["toDate"] == "2024-03-31" for edge in contributions)
assert all("not a direct payment" in " ".join(edge["limitations"]) for edge in contributions)
assert not any(edge["from"] in ("pwg-mrm", "pwg-irbmp", "pwg-irb-idl") and entities.get(edge["to"], {}).get("type") == "party" for edge in edges.values())
checks += 6

roster = (root / "research/raw/public-works/connection-evidence/pm-roster.txt").read_text()
assert "As on 25.07.2026" in roster
assert "2024-06-10" == sources["pwg-pm-roster"]["publishedAt"]
roles = [edge for edge in edges.values() if edge["sourceIds"] == ["pwg-pm-roster"]]
assert len(roles) == 8
assert all(edge["kind"] == "role" and edge["fromDate"] == edge["toDate"] == "2026-07-25" for edge in roles)
assert all("No specific contract decision" in edge["summary"] for edge in roles)
checks += 5

nhai = (root / "research/raw/public-works/connection-evidence/nhai-march2023-excerpt.txt").read_text()
assert "31-Jul-20" in nhai and "190.000" in nhai and "217.500" in nhai and "28%" in nhai
assert edges["pwg-package7-irb"]["fromDate"] == edges["pwg-package7-irb"]["toDate"] == "2020-07-31"
assert edges["pwg-nhai-package7"]["fromDate"] == "2023-03-31"
assert all(entity["resolved"] and entity["identityBasis"] and entity["sourceIds"] for entity in entities.values())
checks += 4
print(f"Passed {checks} archive, accounting-scope, no-inferred-payer, office-snapshot and package-date controls.")
