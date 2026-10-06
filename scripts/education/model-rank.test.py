"""Dependency-free tests for model provenance and promotion boundaries."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location("model_rank", Path(__file__).with_name("model-rank.py"))
MODEL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODEL)


class ModelResearchGuards(unittest.TestCase):
    def setUp(self):
        self.documents = [{
            "id": "public-budget",
            "title": "Public education budget",
            "text": "A budget allocation is not observed expenditure.",
            "url": "https://www.education.gov.in/budget",
        }]
        self.result = {
            "schemaVersion": 1,
            "purpose": "research-discovery-only",
            "automaticallyVerified": False,
            "corpusSha256": "fixture-sha",
            "documentCount": 1,
            "model": {
                "id": MODEL.MODEL_ID,
                "revision": MODEL.REVISION,
                "license": "Apache-2.0",
                "assetSha256": {name: metadata[0] for name, metadata in MODEL.ASSETS.items()},
            },
            "queries": {
                query_id: {
                    "text": text,
                    "matches": [{
                        "documentId": "public-budget",
                        "title": "Public education budget",
                        "url": "https://www.education.gov.in/budget",
                        "similarity": 0.5,
                    }],
                }
                for query_id, text in MODEL.QUERIES.items()
            },
        }

    def validate(self, result=None):
        MODEL.validate_result(self.result if result is None else result, self.documents, "fixture-sha")

    def test_accepts_ranked_unverified_source_links(self):
        self.validate()

    def test_rejects_automatic_verification(self):
        self.result["automaticallyVerified"] = True
        with self.assertRaisesRegex(ValueError, "never auto-verify"):
            self.validate()

    def test_rejects_stale_corpus(self):
        self.result["corpusSha256"] = "old-sha"
        with self.assertRaisesRegex(ValueError, "current evidence corpus"):
            self.validate()

    def test_rejects_invented_citation(self):
        self.result["queries"]["school-access"]["matches"][0]["url"] = "https://example.org/invented"
        with self.assertRaisesRegex(ValueError, "invent or modify"):
            self.validate()

    def test_rejects_unpinned_model(self):
        self.result["model"]["revision"] = "main"
        with self.assertRaisesRegex(ValueError, "model provenance"):
            self.validate()

    def test_rejects_changed_weights(self):
        self.result["model"]["assetSha256"]["tokenizer.json"] = "wrong"
        with self.assertRaisesRegex(ValueError, "asset hashes"):
            self.validate()

    def test_rejects_nonfinite_or_out_of_range_similarity(self):
        for value in (float("nan"), float("inf"), -1.1, 1.1, True):
            with self.subTest(value=value):
                result = copy.deepcopy(self.result)
                result["queries"]["school-access"]["matches"][0]["similarity"] = value
                with self.assertRaisesRegex(ValueError, "Cosine similarity"):
                    self.validate(result)

    def test_rejects_missing_query(self):
        del self.result["queries"]["school-access"]
        with self.assertRaisesRegex(ValueError, "query set"):
            self.validate()

    def test_rejects_duplicate_document_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            corpus = Path(directory) / "corpus.json"
            corpus.write_text(json.dumps({"documents": self.documents * 2}))
            with self.assertRaisesRegex(ValueError, "Duplicate document"):
                MODEL.read_corpus(corpus)

    def test_rejects_wrong_corpus_shape(self):
        with tempfile.TemporaryDirectory() as directory:
            corpus = Path(directory) / "corpus.json"
            corpus.write_text("[]")
            with self.assertRaisesRegex(ValueError, "JSON object"):
                MODEL.read_corpus(corpus)

    def test_rejects_embedded_url_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            corpus = Path(directory) / "corpus.json"
            self.documents[0]["url"] = "https://username:secret@example.org/source"
            corpus.write_text(json.dumps({"documents": self.documents}))
            with self.assertRaisesRegex(ValueError, "without embedded credentials"):
                MODEL.read_corpus(corpus)

    def test_rejects_bad_cached_model_without_redownloading(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            target = cache / MODEL.REVISION / "tokenizer.json"
            target.parent.mkdir(parents=True)
            target.write_text("corrupt model cache")
            with self.assertRaisesRegex(ValueError, "integrity validation"):
                MODEL.asset(cache, "tokenizer.json", offline=True)


if __name__ == "__main__":
    unittest.main()
