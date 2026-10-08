# Local compute and storage audit

Audited 8 October 2026. This is an observed capacity audit and execution proposal, not a hardware benchmark or a claim that a new model was trained. The audit was read-only. After explicit team-lead authorization, the three exact audited paths were removed; the execution receipt is described below. The machine-readable inventory, including every candidate-build file hash, is kept outside Git at `/workspace/next-model-storage-audit.json`.

## Capacity that actually constrains the run

| Resource | Observed value | Consequence |
| --- | --- | --- |
| Cgroup memory ceiling | 17,179,869,184 bytes / 16 GiB | Respect this ceiling rather than the host's larger `/proc/meminfo` value. |
| CPU | Five logical CPUs visible; quota `400000 100000` | Four sustained CPU cores are available. Do not assign five threads to every parallel worker. |
| GPU | PyTorch reports CUDA unavailable, device count zero | Training and retrieval run on CPU. |
| Overlay disk | Approximately 11 GiB free at audit | Enough for one compact encoder and bounded checkpoints without deleting original research. |
| `/tmp` | Separate RAM-backed tmpfs, approximately 8.8 GiB apparent capacity | Model weights and large training/SQLite intermediates belong on `/workspace`; writing them to `/tmp` consumes memory. |
| Working runtime | Python 3.12.14, torch 2.8.0+cpu, transformers 4.56.2, NumPy 2.3.4 | Existing persistent environment imports successfully. |

The persistent environment is `/workspace/.venvs/icip-finetune`. `psutil` and `duckdb` were absent at the moment of the audit; neither is needed to load the existing retrieval model. An optional `psutil` import was replaced by the standard-library `resource` probe. The temporal-data owner can install a pinned DuckDB runtime if its analysis requires it.

The current MiniLM weights remain at `/workspace/.cache/icip-models/1110a243fdf4706b3f48f1d95db1a4f5529b4d41/model.safetensors`: 90,868,376 bytes, SHA-256 `53aa51172d142c89d9012cce15ae4d6cc0ca6895895114379cacb4fab128d9db`. The trained and initial adapters, each 297,520 bytes, are retained in the repository. The previous run's receipt reports 143.37 seconds on CPU; this is a measurement of that small historical run, not a forecast for new training.

## Concrete cleanup proposal

Only these three paths qualified for the initial cleanup proposal. Their logical size is **435,860,837 bytes / 415.67 MiB**. File allocation and actual `df` improvement can differ. They were untracked, and no open handles into these paths were found at audit time. A fresh check reconfirmed no open handles/working directories, no tracked build files and full-file duplicate hashes immediately before the authorized deletion.

| Proposed disposable path | Logical bytes | Retained replacement and verification |
| --- | ---: | --- |
| `dist-finetune-candidate/` | 50,164,362 | `dist-finetune-release/`, all 251 relative paths, sizes and SHA-256 values identical. Whole inventory digest: `e119a822688c2556dc1c299db43cf2dabd975deb060ea8f040da462861bb37d5`. |
| `dist-research-radar-candidate/` | 50,139,265 | `dist-research-radar-release/`, all 251 relative paths, sizes and SHA-256 values identical. Whole inventory digest: `a9045529f1b772cc1400925e6cd06ad902c53a99637d5e58a83d16cefe1ee8a7`. |
| `/home/agent/.cache/pip/http-v2/` | 335,557,210 | Regenerable pip HTTP download cache; the import-tested installed environment remains. It is not a byte-identical substitute for the cache, and future upstream downloads cannot be guaranteed. |

Build digests above are SHA-256 of compact sorted-key JSON arrays containing each sorted file's relative path, byte size and SHA-256. The full inventory is retained outside Git. The [cleanup receipt](../../../research/research-radar/next-model/storage-cleanup-receipt.json) records removal of exactly 435,860,837 logical bytes. Overlay free space increased by 440,369,152 bytes, from 11,650,117,632 to 12,090,486,784 bytes; filesystem allocation and concurrent activity explain why this differs from logical bytes. Both release replacements, all evidence and all installed model/runtime assets remain.

The inventory found **29 build directories containing 1,302,181,684 logical file bytes**. Most older builds contain distinct historical output bytes. They were not declared duplicates simply because their names begin with `dist`. Keeping these older accepted builds avoids losing an exact local release artifact unnecessarily when current free capacity already accommodates compact model experiments.

The following are preserved:

- Original tender SQLite databases: `tenders_vps.db` 6,672,879,616 bytes and `aoc_tenders.db` 6,594,818,048 bytes. They are retained evidence with published-hash download receipts, not disposable caches.
- `audit.duckdb` 2,373,201,920 bytes and `linkage-v2.duckdb` 406,597,632 bytes. Although derived, the temporal-data agent requested them for active work.
- The persistent model weights, trained adapters, Python environment, `node_modules`, Git history, evidence documents and corpora.

No external cloud-account resources were removed or inspected. This cleanup is workspace housekeeping, not evidence deletion or cloud infrastructure teardown.

## Feasible local architecture

A compact encoder plus a small supervised ranking layer is the practical CPU training budget. Keep the existing MiniLM and lexical retrieval as measured baselines. Compare a pinned 80–160 million parameter encoder only after checking its license, tokenizer, language support and evaluation evidence. The research panel is separately comparing current compact models; capacity alone does not establish which is best.

A frozen FP32 encoder with 80–160 million parameters needs approximately 0.32–0.64 GB for weights before runtime overhead and activations. LoRA or a small learned ranking layer adds much less optimizer memory than full tuning. These are arithmetic weight estimates, not measured peak RSS. A full AdamW run requires roughly 16 bytes per trainable FP32 parameter for weights, gradients and two optimizer moments before activations: approximately 1.28–2.56 GB in that parameter range. Both can fit on paper, but small-label overfitting and CPU throughput—not reclaimed disk—are the binding reasons to prefer bounded parameter-efficient experiments.

Recommended execution envelope:

1. Store model assets and checkpoints on `/workspace`, pinned by revision and checksum. Preserve one untouched baseline and the selected checkpoint; do not retain every optimizer state indefinitely.
2. Give training at most two or three CPU threads while research and database work run; keep aggregate worker settings within the four-core quota. Use explicit `torch.set_num_threads` and BLAS thread limits.
3. Start with sequence length 256, microbatch two to four and gradient accumulation. Measure elapsed time, peak RSS and disk growth on a representative batch before a longer run. The exact batch size is determined by measurement.
4. Keep database memory explicitly bounded and avoid concurrent wide table materialization during training. The existing audit scripts used 1.1 GB DuckDB limits and two threads; parallel totals still matter.
5. Use graph features as typed, dated evidence inputs—relation type, source lineage, identity certainty, amount stage and missingness—not a large language model's invented connections. Train or validate retrieval and observable institutional outcomes separately.
6. Preserve case/source-family holdouts and temporal cutoffs. More parameters, more epochs and storage cleanup do not supply missing outcome labels or make corruption probabilities calibrated.

A 0.5–1.5 billion parameter quantized generator may fit for slow exploratory inference if later justified, but is not necessary for these measured retrieval/ranking tasks. No GPU is available to support an efficient larger-model fine-tuning claim. The immediate proposal therefore spends compute on evaluation, graph-aware retrieval and observed-outcome checks rather than an unsupported parameter-size upgrade.
