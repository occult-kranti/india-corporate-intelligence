# Continuation: optional source fleets

Reviewed 14 October 2026.

The merged application loads its investigation registry before a route dossier. The canonical identity bridge builder previously threw if a reviewed target came from a deliberately empty optional fleet. Removing energy inputs for the required empty-state fixture produced the runtime error `deep-corporate/pkcl: reviewed canonical identity is unavailable: energy:parsa-kente-collieries`, leaving a blank page. The finance/NGO empty fixture had the same dependency problem.

`src/data/investigation.ts` now checks the generated fleet's explicit `empty` declaration for the target's exact legacy namespace. An unavailable target in an explicitly empty fleet produces a cited held identity record and a held bridge entry. The reviewed source entity, its original canonical ID and documentary identity basis remain preserved. No replacement entity, financial edge, payment or influence is inferred. Existing available bridges remain drawn. A missing target in a nonempty fleet, an unresolved target, or an identity without the required primary documentary basis still fails closed.

Only the fleet's `empty` and `fleet` fields enter this check, allowing build tooling to avoid retaining unrelated metadata solely for this lookup.

Production registry evidence is unchanged: `trace.py --verify` passes against the pre-fix graph artifact, with registry fingerprint `c030553b8c749eee27a7ba55a92a04c4806b50909e776ba2765a97ff3534cbf5`. Two new tests bundle the actual registry with empty fleet exports and exercise corrupted nonempty/unsupported-identity cases. The entire investigation test file passes all 28 tests.

Browser evidence, with acceptance assertions unchanged:

- Fresh energy empty fixture: AC-02 passes on desktop and mobile. Log: `/tmp/icip-energy-ac02-fixed.log`.
- Fresh isolated finance empty fixture: AC-01 through AC-09 and mobile AC-104 all pass (10 tests). Log: `/tmp/icip-finance-empty-fixed.log`.
- Energy AC-48 and AC-53 pass independently against the retained production bundle. Their earlier full-run failures were not reproduced; this does not establish their original cause. Logs: `/tmp/icip-energy-ac48.log` and `/tmp/icip-energy-ac53.log`.
- Finance AC-65 and AC-66 pass unchanged individually; the contiguous AC-64 through AC-66 sequence also passes 3/3. The original full-run failures remain unclassified, and these focused passes do not certify the entire retained suite.

The existing energy and finance empty-fixture caches are keyed by file existence, not current source contents. Both pre-merge caches were stale. Verification therefore rebuilt each fixture explicitly. Finance verification used an isolated checkout copy to avoid replacing assets while the parent's larger acceptance suite remained active. No acceptance assertion was weakened, no production `dist` was rebuilt by this task, and no git operations were performed.
