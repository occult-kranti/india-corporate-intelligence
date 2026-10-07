#!/usr/bin/env python3
"""The page's file: research/raw/cppp/security.json projected to research/raw/cppp/security-page.json.

    python3 scripts/cppp/security_page.py                      # repository paths
    python3 scripts/cppp/security_page.py --src <security.json> --out <security-page.json>

security.py calls project() at the end of write_security(), so every pipeline run refreshes the
page file from the slice it has just written. Run standalone, it needs no Arrow input, no duckdb
and no pyarrow: it reads security.json and nothing else.

WHY. /security and the /tenders "security buyers" line read a few blocks of the slice (spec
docs/design/SECURITY_PAGE.md §3.2 SLICE, prerequisite S8). The whole file also carries
concentration.byBuyer[].topMarkedWinners and concentration.byClass[].topMarkedWinners: 255
distinct winner strings, 16 of them admitted by "m/s" alone (concentration.msOnlyNamed). No
component renders them, and the page names no winner (caption C14), so they must not ride in
the browser payload either.

WHAT IS KEPT (KEEP below; each subtree verbatim, in the source's key order):
the union of what the page and the /tenders line read and the spec's SLICE list.
Everything else is dropped and listed in the output's `dropped`, each path with its reason.

THE GUARD. Every string held under a winner-list key anywhere in the source (WINNER_KEY:
topMarkedWinners today) is collected, and project() refuses to write if any of them appears,
case-insensitively, inside any key or string value of the output, or if the output holds a
winner-list key at all. The error names the path and the count, never the string. One exemption
(BUYER_FIELDS): a public buyer of the slice that is also a marked winner elsewhere (BEL, a DPSU)
keeps its classes.map row; the string may be the whole buyer value there and nothing else.

Determinism: the source's key order is preserved, floats are re-serialised by the same
json.dumps(ensure_ascii=False, indent=1) + "\\n" that build._write uses (Python's shortest
round-trip float repr, so a value reads back byte-identical), and the output depends only on
the bytes of security.json.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DEFAULT_SRC = ROOT / "research" / "raw" / "cppp" / "security.json"
DEFAULT_OUT = ROOT / "research" / "raw" / "cppp" / "security-page.json"

# Paths kept, each a whole subtree. Readers (grep of the /security build, 2026-10-07):
#   readMeFirst, caveat ................ Procurement.tsx (quoted verbatim); spec SLICE
#   headline ........................... SecurityBuyers.tsx (headline.length); spec SLICE
#   classes.definitions ................ Procurement.tsx; spec SLICE
#   classes.map ........................ the one-buyer share (rows by public buyer, class, member,
#                                        route, portal: public bodies, never winners)
#   quality.afterDedup ................. Procurement.tsx, SecurityBuyers.tsx
#   quality.total ...................... Chrome.tsx, Procurement.tsx; spec SLICE
#   quality.byClass .................... Chrome.tsx, Procurement.tsx (the works share)
#   rates.total, rates.excludingWorks .. Procurement.tsx, SecurityBuyers.tsx; spec SLICE
#   rates.byClass, rates.byClassYear ... Procurement.tsx, Chrome.tsx; spec SLICE
#   rates.innocentReading .............. spec SLICE (each class's reading beside its rate)
#   provenance ......................... Chrome.tsx, Procurement.tsx, Shared.tsx (inputs, asOf,
#                                        dedupRule); spec SLICE; kept whole: it is the audit trail
KEEP: tuple[tuple[str, ...], ...] = (
    ("readMeFirst",),
    ("classes", "definitions"),
    ("classes", "map"),
    ("headline",),
    ("quality", "afterDedup"),
    ("quality", "total"),
    ("quality", "byClass"),
    ("rates", "total"),
    ("rates", "excludingWorks"),
    ("rates", "byClass"),
    ("rates", "byClassYear"),
    ("rates", "innocentReading"),
    ("caveat",),
    ("provenance",),
)

# A key whose subtree holds winner strings (topMarkedWinners). Integer fields that merely end
# in "Bidder" (singleBidder) hold no string and so collect nothing.
WINNER_KEY = re.compile(r"(?i)(winners?|bidders?)$")

# The one exemption. A public body of the slice that is also a marked winner somewhere (a DPSU
# that sells as well as buys: BEL today) is kept in classes.map as a BUYER. Its string may stand
# there, as the whole value of the buyer field and nowhere else; any other occurrence, and any
# substring hit, still fails.
BUYER_FIELDS = frozenset({"classes.map[].buyer"})

REASON_WINNER = "names a winner; the page names none (spec C14)"
REASON_UNREAD = "not read by /security or the /tenders security-buyers line (spec §3.2 SLICE)"
REASON_HOLDS_WINNER = REASON_UNREAD + "; its winner-bearing fields are listed above"


class WinnerLeak(AssertionError):
    """The projection would carry a winner string. The message never repeats the string."""


def dump(doc) -> str:
    """Byte-for-byte the writer of build._write (and so of security.json)."""
    return json.dumps(doc, ensure_ascii=False, indent=1) + "\n"


def _keep_tree() -> dict:
    tree: dict = {}
    for path in KEEP:
        node = tree
        for k in path[:-1]:
            node = node.setdefault(k, {})
        node[path[-1]] = True
    return tree


def _project(src, tree: dict, prefix: str, dropped_top: list[str]):
    out = {}
    for k, v in src.items():
        path = f"{prefix}.{k}" if prefix else k
        if k not in tree:
            dropped_top.append(path)
        elif tree[k] is True:
            out[k] = v
        else:
            if not isinstance(v, dict):
                raise ValueError(f"security_page: {path} is not an object in the source")
            out[k] = _project(v, tree[k], path, dropped_top)
    return out


def _missing(src, tree: dict, prefix: str = "") -> list[str]:
    miss = []
    for k, sub in tree.items():
        path = f"{prefix}.{k}" if prefix else k
        if not isinstance(src, dict) or k not in src:
            miss.append(path)
        elif sub is not True:
            miss.extend(_missing(src[k], sub, path))
    return miss


def _strings(x, out: list[str]) -> None:
    if isinstance(x, dict):
        for k, v in x.items():
            out.append(k)
            _strings(v, out)
    elif isinstance(x, list):
        for v in x:
            _strings(v, out)
    elif isinstance(x, str):
        out.append(x)


def _values(x, out: list[str]) -> None:
    """String VALUES only (not keys): the winner strings themselves."""
    if isinstance(x, dict):
        for v in x.values():
            _values(v, out)
    elif isinstance(x, list):
        for v in x:
            _values(v, out)
    elif isinstance(x, str):
        out.append(x)


def winner_fields(doc) -> tuple[list[str], set[str]]:
    """(schema paths of winner-list keys whose subtree holds strings, in source order; the strings)."""
    paths: list[str] = []
    names: set[str] = set()

    def walk(x, prefix: str):
        if isinstance(x, dict):
            for k, v in x.items():
                path = f"{prefix}.{k}" if prefix else k
                if WINNER_KEY.search(k):
                    found: list[str] = []
                    _values(v, found)
                    if found:
                        names.update(found)
                        if path not in paths:
                            paths.append(path)
                        continue
                walk(v, path)
        elif isinstance(x, list):
            for v in x:
                walk(v, prefix + "[]")

    walk(doc, "")
    return paths, names


def assert_no_winner(out: dict, names: set[str]) -> int:
    """Raise WinnerLeak on any surviving winner string; return the number of exempt public buyers."""
    held, _ = winner_fields(out)
    if held:
        raise WinnerLeak(f"security_page: the projection holds winner-list fields {held}")
    folded = sorted({n.casefold() for n in names if n.strip()})
    hits = 0
    where: set[str] = set()
    exempt: set[str] = set()

    def walk(x, prefix: str):
        nonlocal hits
        if isinstance(x, dict):
            for k, v in x.items():
                path = f"{prefix}.{k}" if prefix else k
                check(k, path + " (key)")
                walk(v, path)
        elif isinstance(x, list):
            for v in x:
                walk(v, prefix + "[]")
        elif isinstance(x, str):
            check(x, prefix)

    def check(s: str, path: str):
        nonlocal hits
        low = s.casefold()
        for n in folded:
            if n in low:
                if path in BUYER_FIELDS and low == n:
                    exempt.add(n)  # the same public body, kept as a buyer of the slice
                    continue
                hits += 1
                where.add(path)

    walk(out, "")
    if hits:
        raise WinnerLeak(f"security_page: {hits} winner string occurrence(s) would survive, at {sorted(where)}")
    return len(exempt)


def _display_path(src_path: Path) -> str:
    try:
        return src_path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return src_path.name  # a scratch run (the tests' temporary directories): the name only


def build_projection(src_bytes: bytes, src_label: str) -> dict:
    src = json.loads(src_bytes.decode("utf-8"))
    tree = _keep_tree()
    miss = _missing(src, tree)
    if miss:
        raise ValueError(f"security_page: the source lacks {miss}")
    dropped_top: list[str] = []
    out = _project(src, tree, "", dropped_top)
    if next(iter(out)) != "readMeFirst":
        raise ValueError("security_page: readMeFirst is not the first field")

    wpaths, names = winner_fields(src)
    dropped = []
    for top in dropped_top:
        inside = [w for w in wpaths if w == top or w.startswith(top + ".") or w.startswith(top + "[]")]
        for w in inside:
            dropped.append({"path": w, "reason": REASON_WINNER})
        if top not in inside:
            dropped.append({"path": top, "reason": REASON_HOLDS_WINNER if inside else REASON_UNREAD})
    covered = {d["path"] for d in dropped if d["reason"] == REASON_WINNER}
    if set(wpaths) - covered:
        raise WinnerLeak(f"security_page: winner-list fields under a kept path: {sorted(set(wpaths) - covered)}")

    out["projectedFrom"] = {"file": src_label, "sha256_16": hashlib.sha256(src_bytes).hexdigest()[:16]}
    out["dropped"] = dropped
    assert_no_winner(out, names)
    return out


def project(src_path: Path | str = DEFAULT_SRC, out_path: Path | str = DEFAULT_OUT, log=print) -> dict:
    src_path, out_path = Path(src_path), Path(out_path)
    src_bytes = src_path.read_bytes()
    doc = build_projection(src_bytes, _display_path(src_path))
    text = dump(doc)
    out_path.write_text(text, encoding="utf-8")
    log(f"security-page.json: {len(src_bytes):,} → {len(text.encode('utf-8')):,} bytes; "
        f"{len(doc['dropped'])} paths dropped, {sum(d['reason'] == REASON_WINNER for d in doc['dropped'])} of them winner-bearing")
    return doc


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", default=str(DEFAULT_SRC), help="security.json written by security.py")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="the slim page file to write")
    a = ap.parse_args(argv)
    project(a.src, a.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
