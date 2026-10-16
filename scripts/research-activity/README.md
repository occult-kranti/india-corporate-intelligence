# Research activity console

A small, dependency-free task and status interface, staged additively at `/research-activity/`. It shows a curated, dated snapshot after reviewed roadmap progress. It is neither an exhaustive inventory nor live worker telemetry.

## Interface contract

Nine work items and four release milestones, with four visible status groups:

- **Done: 1** — completed base release, with PR9 completion evidence.
- **Working on: 5** — PR10, research methods, repository/corpus audit, and two explicitly requested source-research lanes. Existing review items retain **Review pending**; the new lanes show **Source review pending**.
- **Next: 1** — original-route guide acceptance.
- **Blocked: 2** — federation and retained/held source reviews.

“All work” restores all nine items. Search is local and case-insensitive across questions, roles, summaries, next steps, and evidence titles. Reset clears the filter and query and returns focus to search. Underlying semantic states remain `completed`, `review-pending`, `planned`, `blocked`, and `running`; the supplied snapshot has **zero running items**. Grouping does not change a review decision or mark work complete.

Visible return navigation is relative to the deployment base:

- Evidence atlas: `../spatial/`
- Original workbench: `../#/investigate`

## Dated facts and scope

The snapshot was prepared at **2026-10-16 03:49:31 UTC** from supplied release verification and reviewed local research/audit status plus the two explicitly requested source-research lanes. The earlier release/audit facts were reviewed at 03:44 UTC. This staging pass did not independently query GitHub or inspect the live deployment. Each item retains its own checked date; unchanged guide/federation facts retain their earlier 03:22 UTC date. The PR9 completion-verification date also retains its original 03:22 UTC provenance.

- PR9 is merged into master `6e4d6512`; the base atlas is deployed at <https://occult-kranti.github.io/india-corporate-intelligence/spatial/>. Runtime completion evidence remains the exact public [PR9 URL](https://github.com/occult-kranti/india-corporate-intelligence/pull/9).
- PR10 is draft/review pending and unmerged at checked commit `0b4af3a1`. Reported checks: 174 static tests, 22 spatial browser cases, and four combined browser cases passed. Original-application CI was still in progress at the supplied check. These are checks of that release, **not browser acceptance of this new activity console**.
- Research-methods setup and repository/corpus assessments are locally reviewed or awaiting review. They are not shown as running work.
- New source-lane packets are reviewed candidates awaiting independent/publication review. Their neutral update is included in the existing source-review item. Two separately requested cards cover US/China/Europe ownership, donations and finance, and public/declassified programs and later public roles. Both are source-review pending. No allegations, source excerpts, restricted access claims, or factual relationships are added.
- Held material remains held. Status summaries never grant graph admission, certify a common/current date, or authorize publication.

## Runtime and checks

Only five files belong in the public runtime directory:

```
public/research-activity/index.html
public/research-activity/styles.css
public/research-activity/app.mjs
public/research-activity/model.mjs
public/research-activity/snapshot.json
```

Tests, schema, and documentation stay in `scripts/research-activity/`. No dependency installation, build step, backend, browser installation, external font, analytics, storage, or scheduler is required. Native ES modules and local `fetch` require HTTP hosting rather than `file://`. Test imports resolve relative to their files, not the process working directory.

Run from the repository root:

```sh
node --test scripts/research-activity/*.test.mjs
node --check public/research-activity/app.mjs
node --check public/research-activity/model.mjs
```

Optional schema smoke tests, only if Python `jsonschema` is already installed:

```sh
python scripts/research-activity/schema_test.py
```

Verified here: **22 Node tests, two Python schema tests, and both JavaScript syntax checks passed**. The Node harness uses built-ins only. DOM-contract tests do not establish browser rendering or accessibility conformance. See `TEST_RESULTS.txt` for output and `BROWSER_ACCEPTANCE.md` for unverified browser checks.

To preview when browser use is authorized, serve the repository's public tree over HTTP, for example `python -m http.server 8080 --bind 127.0.0.1 --directory public`, then navigate to `/research-activity/`. Serving this subtree alone does not reproduce adjacent workbench routes. No browser was launched or installed during this staging work.

## Safety and updates

Runtime data is validated before rendering; invalid data withholds the ledger. Text uses `textContent`. Unknown fields, unsafe dates, unresolved milestone references, unsafe links, and structurally incomplete completion records are rejected. The schema provides structural validation; `model.mjs` additionally enforces reference resolution, unique IDs, and temporal order.

Evidence URLs are limited to exact `https://github.com/occult-kranti/india-corporate-intelligence/pull/` URLs with a positive ASCII PR number. Credentials, fragments, queries, trailing whitespace/newlines, alternate hosts, other repositories, and deployment URLs are rejected. The policy was retained and tightened against trailing-newline acceptance. Local return links are fixed markup, separate from evidence links. The CSP permits same-origin modules/assets and same-origin fetch, with no inline/eval execution, objects, forms, or base-URL changes.

Completed tasks require a valid evidence index resolving to an approved public PR URL, a verification timestamp no later than the task's check date, and a nonempty explanatory note. A real URL alone is not proof of completion; an explicit evidence review must establish what it proves. There are no automatic transitions or claim promotion. Private-project links remain `null`.

When updating status, first verify the underlying facts, then change only the applicable item and its real checked time. Use exact UTC timestamps; do not refresh dates merely to remove a stale warning. Update snapshot `asOf` to the editorial check time, with no task check after it. Re-run tests and review semantic privacy. Strict schemas cannot determine whether otherwise-valid prose is private or true.

## Integration limits

This deliverable adds only the two directories named above. It does not edit workflows, root scripts, application navigation, or GitHub. The integrator owns those changes. Preserve directory-index handling and module/data relative URLs. Serve `.mjs` as JavaScript and `.json` as JSON; prefer revalidation/no-cache for the snapshot. Where supported, mirror the meta CSP in HTTP response headers and add `frame-ancestors 'none'` as a header directive.

Browser acceptance and release approval remain separate checks. Publication of this status page does not approve unrelated research content or PR10.
