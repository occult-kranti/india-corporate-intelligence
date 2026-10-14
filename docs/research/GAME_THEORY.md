# Strategic incentives lab

Route: `#/game-theory`. Components: `src/pages/GameTheory.tsx`, `src/data/strategicModels.ts`, `src/game-theory.css`.

The lab helps an investigator move from a plausible institutional incentive to a falsifiable documentary question. Four generic roles cover a public official, supplier, oversight body and public-interest researcher. Each role has a lawful public-interest strategy, high-level abuse hypothesis, predicted trace, competing explanation, falsifier and questions about the applicable rules. No real actor receives an incentive score. Hypothetical abuse is not reported as observed conduct.

## Model and derivation

This is a one-actor decision under risk, not a strategic equilibrium. A two-choice/two-state payoff matrix treats detection as a chance event, not a second player's decision. All inputs are assumed, not calibrated to India, a named case or any person.

- `B ≥ 0`: private benefit under the abuse hypothesis, in arbitrary utility units.
- `p ∈ [0, 1]`: assumed probability of detection and an effective sanction.
- `S ≥ 0`: utility loss on detection and sanction.
- `C ≥ 0`: utility cost of the lawful choice.

Expected abuse utility is `(1 − p)B + p(B − S) = B − pS`. Lawful utility is `−C` in either state. The model compares their difference `B + C − pS`. Equality occurs at `p* = (B + C)/S` when `S > 0`. A threshold above 1 cannot be reached by detection alone. A threshold at 1 permits equality at full detection, with no possible strictly lawful advantage from increasing `p`. If `S = 0`, detection has no effect; both choices tie only if `B = C = 0`.

The zero is an arbitrary reference state. Values do not measure public welfare, money or corruption likelihood. The model omits moral preferences, reputational effects, social harm, repeated interactions, information asymmetry and endogenous oversight. Higher expected utility is a conditional arithmetic result, not a recommended course of conduct. Motive, causation, coordination and guilt cannot be inferred from the result. A more elaborate game would need documented actors, action sets, information and defensible payoff assumptions; the interface does not pretend to have these.

The sensitivity plot sweeps `p` from 0 to 1 while holding the other assumptions fixed. A table provides exact plotted values. A small floating-point tolerance recognizes mathematical equality without inventing a preference from rounding error. Non-finite, negative, missing or out-of-range inputs are rejected by the pure model.

## Investigation workflow

`INVESTIGATION_CASES` and `INVESTIGATION_SOURCES` supply the case selector, explicit evidence status, finding, limitation, research question and source support statements. Selecting a case does not transfer the toy model assumptions to a real actor. Each worksheet asks for a precise question, predicted trace, strongest alternative, falsifier, missing records, notes and optional public source URLs.

Notes are separate for each case/question pair and for each generic role. They save in this browser's localStorage under `icip-strategy-lab-v1`; there is no upload, account or cross-device sync. Browser storage failure is visible and does not disable editing or JSON download. The lab is useful even when the investigation dataset is empty.

JSON export includes the active worksheet, model assumptions and omitted variables, formulae, results, sensitivity values, selected role, case status and limitations, case source objects, and added public HTTP(S) URLs. Invalid link text remains visible in the worksheet and is explicitly listed as omitted from validated URLs. Source links support only their stated claims; attaching them does not validate a hypothesis.

The lawful workflow is: specify scope and a comparison group; acquire the predicted public record lawfully; test the alternative on the same material; retain negative results; seek a response and independent review. A refusal or unavailable record is an access gap, not proof. Rule questions require checking jurisdiction, effective date, governing instrument and exceptions. The lab makes no fabricated statutory conclusions or operational instructions for concealment, bribery, evasion or interference.

## Verification

Run `node --test scripts/game-theory.test.mjs`. The test imports a TypeScript-transpiled copy of the actual model and checks weighted utilities, equality, both probability boundaries, zero sanctions, zero utilities, unreachable thresholds, floating-point equality, invalid inputs, overflow and monotone sensitivity. It also checks that each institutional role has an alternative and a falsification test.

Run `npx tsc --noEmit` for project integration. Browser checks should cover role changes, assumption sliders, case selection, independent draft retention, reload, the JSON download, storage failure and a narrow viewport. Jump controls use scrolling buttons so they cannot overwrite the application's hash route.

Verified on 2026-10-14: all eight pure-model tests and the full project TypeScript check passed. Chromium exercised the integrated route with 21 loaded cases: role changes, slider result changes, preserved hash navigation, independent role notes, case-linked notes, reload persistence, downloaded JSON contents, rejection of `javascript:` evidence links, disabled-storage messaging, and a 390px viewport with no document overflow. A separate empty-data response verified editable generic notes and JSON download without any cases. Desktop and mobile screenshots were visually inspected. These checks establish interface behavior; they do not validate the underlying investigation claims or the model's empirical assumptions.
