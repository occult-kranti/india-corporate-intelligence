# Local fine-tuning release acceptance

Baseline: `cbf6da91517f559bc3a37b0a7f91b6fb99ac3e47`. Branch: `codex/education-funding-intelligence`. User-facing run date: 7 October 2026, America/New_York; UTC receipts fall on 8 October.

The executed experiment trained 73,728 custom query/value LoRA parameters on the pinned MiniLM full-precision encoder. It completed 72 optimizer steps in eight epochs, with epoch 1 selected by the frozen development rule. Independently inspected binary tensors confirm a nonzero parameter update and unchanged base weights. Full configuration, source/label hashes, runtime, history, trained weights and one-time test rankings are committed in `research/research-radar/fine-tuning/`.

The candidate remains **experimental, not promoted**. The independent 20-query/five-case test improved case-macro nDCG@5 from 0.925522 to 0.934182, concentrated in one question. Two of ten predefined promotion conditions failed; the existing ONNX default is preserved. This is source retrieval, with no trained outcome forecast or numerical corruption probability. Local candidate and default CLI inference both executed successfully and retained the cited source, locator and limitations.

## Executed checks

- Eight source/group/label integrity tests, ten independently authored analytical metric tests and sixteen artifact mutation tests passed: **34 tests**.
- Offline verification also passed with `python3 -S`, without installed ML libraries, model downloads, training or inference. It recomputes all retained development/test metrics, selection, promotion rules and bootstrap values, validates tensor updates and rejects stale inputs or modified outputs.
- TypeScript and the production Vite build passed. The inherited large core-bundle warning remains; the new model weights are not bundled into the browser.
- **63 focused model-panel browser checks** passed on the final candidate at 1440, 390 and 320 pixels with no runtime errors. The release decision, all four measured systems, artifact links, hashes, keyboard interaction and responsive detail spacing were checked.
- The retained **326-check research-radar workflow** passed before a final change confined to the new panel's margin specificity. No map/data behavior changed. The required deployment workflow reruns this complete suite on the final source.

## Frozen build

The final accepted candidate was copied byte-for-byte into `dist-finetune-release`. Index SHA-256: `988399344a150e4ec881abfc6462fa8bcb767882b25ee99f72b963b217b9ad62`. Source-content and all output-file hashes are retained in `acceptance/build-manifest.json`. Browser, training/evaluation and independent binary-audit receipts are retained alongside it.

Publication requires the repository's full deployment workflow, matching normal public index/assets and live browser acceptance. Actual source/Pages commit IDs and live receipts are recorded separately in `/workspace/icip-finetune-release/`. Local acceptance alone is not proof of publication. No further training or label changes followed the sealed test.
