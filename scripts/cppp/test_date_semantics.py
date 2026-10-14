"""Metadata/copy-only date repair guards; standard library, no pipeline imports.

Run: python3 -m unittest scripts/cppp/test_date_semantics.py
The baseline is the HEAD observed before this repair, pinned so committing the repair
cannot silently move the comparison target. An analytical rerun needs a new baseline.
"""
from copy import deepcopy
import ast
from functools import lru_cache
import json
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
BASELINE_REVISION = "11a78e22a9998796c3c90b31fc4b708e98196c9c"
ARCHIVED_FILES = (
    "concentration.json", "provenance.json", "quality.json", "rates.json",
    "redflags.json", "sample-verification.json", "security.json", "timing.json",
)
COPY_FIELDS = ("definition", "familyDefinition", "innocentReading")
ATTRIBUTION_KEYS = ("dataset", "scrapedAt", "lineageAudit")


@lru_cache(maxsize=None)
def baseline_text(relative_path):
    return subprocess.check_output(
        ["git", "show", f"{BASELINE_REVISION}:{relative_path}"], cwd=ROOT, text=True,
    )


def baseline_document(name):
    return json.loads(baseline_text(f"research/raw/cppp/{name}"))


def current_document(name):
    return json.loads((ROOT / "research/raw/cppp" / name).read_text())


def value_at(document, path):
    value = document
    for part in path:
        value = value[part]
    return value


def approved_copy_paths(name):
    if name == "timing.json":
        return [("definition",), ("innocentReading",)]
    if name == "redflags.json":
        return [("stance",)] + [("indicators", 2, key) for key in COPY_FIELDS]
    if name == "security.json":
        return [("timing", "definition"), ("timing", "innocentReading"), ("redflags", "stance")] + [
            ("redflags", "indicators", 2, key) for key in COPY_FIELDS
        ]
    return []


def approved_audit_paths(name):
    if name not in ("timing.json", "redflags.json", "security.json"):
        return []
    paths = [("provenance", "dateFieldSemanticsAudit")]
    if name == "timing.json":
        paths.append(("fieldSemanticsAudit",))
    elif name == "redflags.json":
        paths.append(("indicators", 2, "fieldSemanticsAudit"))
    elif name == "security.json":
        paths.extend([("timing", "fieldSemanticsAudit"), ("redflags", "indicators", 2, "fieldSemanticsAudit")])
    return paths


def restore_approved_date_copy(document, name):
    """Undo only authorized copy/audit paths for the original full-payload digest."""
    restored = deepcopy(document)
    baseline = baseline_document(name)
    if name in ("redflags.json", "security.json"):
        prefix = ("redflags",) if name == "security.json" else ()
        for doc in (restored, baseline):
            if value_at(doc, prefix + ("indicators", 2, "indicator")) != "shortDecisionWindow":
                raise AssertionError("The approved indicator slot must remain shortDecisionWindow")
    for path in approved_copy_paths(name):
        old = value_at(baseline, path)
        current = value_at(restored, path)
        if not isinstance(current, str) or not isinstance(old, str):
            raise AssertionError(f"Only copy strings may change at {name}:{path}")
        value_at(restored, path[:-1])[path[-1]] = old
    for path in approved_audit_paths(name):
        value_at(restored, path[:-1]).pop(path[-1], None)
    return restored


def numerical_leaves(value, path=()):
    if isinstance(value, dict):
        return {key: leaf for name, item in value.items()
                for key, leaf in numerical_leaves(item, path + (name,)).items()}
    if isinstance(value, list):
        return {key: leaf for index, item in enumerate(value)
                for key, leaf in numerical_leaves(item, path + (index,)).items()}
    # Include booleans as their own type so False cannot silently become 0.
    return {path: (type(value).__name__, value)} if isinstance(value, (int, float)) else {}


def sql_assignments(source):
    assignments = []
    for node in ast.walk(ast.parse(source)):
        if isinstance(node, ast.Assign):
            targets = node.targets
        elif isinstance(node, (ast.AnnAssign, ast.AugAssign)):
            targets = [node.target]
        else:
            continue
        if any((isinstance(target, ast.Name) and target.id == "SQL") or
               (isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name) and target.value.id == "SQL")
               for target in targets):
            assignments.append(ast.dump(node, include_attributes=False))
    return assignments


# Detect affirmative legacy causal explanations, while allowing explicit statements
# that the fields cannot establish evaluation speed, automation or fiscal spending.
CAUSAL_EXPLANATIONS = [
    re.compile(r"\b(?:follow(?:s)? from|consistent with|explained by|caused by)\b[^.;]{0,140}\b(?:auto[- ]evaluation|automated|automatic)\b", re.I),
    re.compile(r"\bclustering\b[^.;]{0,100}\breflects?\b[^.;]{0,100}\b(?:spending|financial[- ]year|fiscal)\b", re.I),
    re.compile(r"\blong windows follow from technical evaluation\b", re.I),
]


class DateSemanticsMetadata(unittest.TestCase):
    def test_all_existing_numbers_are_unchanged(self):
        for name in ARCHIVED_FILES:
            with self.subTest(file=name):
                current = restore_approved_date_copy(current_document(name), name)
                for key in ATTRIBUTION_KEYS:
                    current["provenance"].pop(key, None)
                self.assertEqual(numerical_leaves(current), numerical_leaves(baseline_document(name)))

    def test_sql_inputs_and_computation_provenance_are_unchanged(self):
        for name in ARCHIVED_FILES:
            old = baseline_document(name)["provenance"]
            current = current_document(name)["provenance"]
            for key in ("sql", "sliceSql", "inputs", "asOf", "generatedBy"):
                with self.subTest(file=name, field=key):
                    self.assertEqual(current.get(key), old.get(key))

    def test_producer_sql_assignment_asts_are_unchanged(self):
        for name in ("build.py", "security.py"):
            path = f"scripts/cppp/{name}"
            with self.subTest(file=name):
                original = sql_assignments(baseline_text(path))
                self.assertTrue(original)
                self.assertEqual(sql_assignments((ROOT / path).read_text()), original)

    def test_targeted_audit_metadata_matches_helper(self):
        from scripts.cppp.date_semantics import date_field_semantics

        expected = date_field_semantics(metadata_only=True)
        for name in ("timing.json", "redflags.json", "security.json"):
            document = current_document(name)
            for path in approved_audit_paths(name):
                with self.subTest(file=name, path=path):
                    self.assertEqual(value_at(document, path), expected)

    def test_new_timing_copy_has_no_legacy_causal_explanations(self):
        for name in ("timing.json", "redflags.json", "security.json"):
            document = current_document(name)
            for path in approved_copy_paths(name):
                copy = value_at(document, path)
                with self.subTest(file=name, path=path):
                    self.assertTrue(copy.strip())
                    for pattern in CAUSAL_EXPLANATIONS:
                        self.assertIsNone(pattern.search(copy), copy)


if __name__ == "__main__":
    unittest.main()
