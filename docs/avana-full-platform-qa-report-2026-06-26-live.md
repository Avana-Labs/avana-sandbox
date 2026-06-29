# Avana Full Platform QA Report

Date: 2026-06-27

Environment tested:
- Branch under test: `codex/live-qa-followups` rebased by cherry-picking the verified QA fixes onto `origin/main` (`5b38a15`) on 2026-06-27
- `npm run lint`: pass with 0 errors, 2 warnings (`app/components/brand-logo.tsx` still uses raw `<img>`)
- `npx vitest run app/lib/lend-system/__tests__/use-lend-session.test.ts app/components/action-page/__tests__/multiply-action-page-client.test.tsx`: 8/8 pass
- `npm run dev` on `http://localhost:3000`: pass after fixing a root install blocker
- Local install status:
  - current `origin/main` initially failed on macOS because `package.json` directly included `@rolldown/binding-linux-x64-gnu`
  - removing that root dev dependency and reinstalling fixed local boot

Browser testing method:
- In-app browser against the local dev server on `http://localhost:3000`
- Desktop verification at default desktop width plus targeted mobile verification at `390x844`
- Manual route checks across Home, Borrow action UI, Lend action UI, Multiply deleverage, Rewards, desktop preferences, and mobile navigation

Live UI evidence gathered on 2026-06-27:
- Home route loads and renders primary nav, dashboard link, rewards link, preferences button, and connect button
- Borrow direct action route currently lands in a disabled state:
  - `Borrow amount` prefilled with `500`
  - `≈ $0.00`
  - `Enter a valid amount`
- Lend withdraw direct action route currently lands in a disabled state:
  - `Withdraw amount` prefilled with `100`
  - `≈ $0.00`
  - `Enter a valid amount`
- Rewards route is unstable:
  - first load rendered full quest content and multiple claim buttons
  - next reload rendered only `main` with no quest content
- Desktop preferences now point privacy to `https://avana.cc/privacy`
- Mobile menu toggle did not expose the privacy link in the tested `390x844` run, indicating the mobile menu is not reliably opening on the clean branch

## 1. Executive Summary

Direct answers:
- Is Avana usable right now? Partially, but not reliably. Read surfaces load, some previously repaired state-management flows are still covered by tests, but current live action entry routes are not consistently actionable after a clean boot.
- Is Avana production-ready? No.
- Can it handle 1,000 concurrent users? No.
- Biggest blockers:
  - Root install/runtime reliability is still fragile. `origin/main` had a macOS install blocker from a Linux-only dependency.
  - Core direct action routes can render disabled invalid states after a clean session instead of guiding the user into a valid flow.
  - Rewards is not stable on reload and cannot be trusted as a production-facing state surface.
  - Mobile navigation is not reliably opening in the live run.
  - The platform is still sandbox/local-session based, not backed by an authoritative shared transaction system.

Rating:
- Internal testing only

## 2. Critical Issues

### Critical 1: Current `main` does not install cleanly on macOS without removing a Linux-only root dependency

- Issue:
  The app cannot be installed cleanly on macOS from current `origin/main` because `package.json` directly includes `@rolldown/binding-linux-x64-gnu`.
- Where:
  `package.json`
- Steps to reproduce:
  1. Check out current `origin/main`.
  2. Run `npm install` on macOS/arm64.
- Expected:
  Install should resolve the correct platform binding through Rolldown optional dependencies.
- Actual:
  `npm install` fails with `EBADPLATFORM` for `@rolldown/binding-linux-x64-gnu`.
- Severity:
  Critical
- Recommended fix:
  Remove the explicit Linux-only root dependency. Let `rolldown` own platform-specific optional bindings.

### Critical 2: Borrow direct action route can land in a dead disabled state after a clean boot

- Issue:
  Borrow opens with a prefilled amount but no actionable value context, so the user cannot proceed.
- Where:
  `/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&amount=500`
- Steps to reproduce:
  1. Start from a clean local session after boot.
  2. Open `/actions/borrow/borrow?asset=uni-v3-bluechip:usdc&amount=500`.
- Expected:
  Either a valid preview should render, or the UI should explicitly require the missing prerequisite selection.
- Actual:
  The route shows `500`, `≈ $0.00`, and a disabled `Enter a valid amount` button.
- Severity:
  Critical
- Recommended fix:
  Resolve direct-route hydration so query params produce a valid preview, or hard-redirect into a prerequisite collateral-selection step.

### Critical 3: Lend withdraw direct action route can land in the same dead disabled state

- Issue:
  Withdraw prefill is not enough to make the route actionable on a clean session.
- Where:
  `/actions/lend/withdraw?market=gho&amount=100`
- Steps to reproduce:
  1. Start from a clean local session after boot.
  2. Open `/actions/lend/withdraw?market=gho&amount=100`.
- Expected:
  The withdraw preview should resolve against a seeded/mock supplied balance or guide the user into choosing a valid position first.
- Actual:
  The route shows `100`, `≈ $0.00`, and a disabled `Enter a valid amount` button.
- Severity:
  Critical
- Recommended fix:
  Make the route resolve a mock position deterministically or force an explicit position-selection state before amount entry.

### Critical 4: Rewards page is unstable across reloads

- Issue:
  The same route can show a full quest surface on one load and an empty main container on the next.
- Where:
  `/rewards`
- Steps to reproduce:
  1. Open `/rewards`.
  2. Confirm the full rewards quest UI renders.
  3. Reload `/rewards`.
- Expected:
  Rewards should render consistently across reloads with stable claimable/claimed state.
- Actual:
  One load rendered the full page, while the next rendered only `main` with no visible reward content.
- Severity:
  Critical
- Recommended fix:
  Trace the rewards page hydration/data gate. Add an explicit loading/error state instead of collapsing to empty content.

## 3. High-Priority Issues

### High 1: Mobile navigation is not reliably opening from the hamburger toggle

- Evidence:
  At `390x844`, the header showed `Toggle menu`, but after clicking it the DOM snapshot still did not expose the mobile nav links or privacy link.
- Risk:
  Mobile users can lose primary navigation and legal/help access entirely.
- Recommended fix:
  Re-test the mobile menu component on clean session state and add a route-level regression test for open/close visibility.

### High 2: Desktop privacy link is fixed, but mobile legal/help parity is still unreliable

- Evidence:
  Desktop preferences showed one canonical `https://avana.cc/privacy` link.
  The mobile run did not expose any matching privacy link because the menu never surfaced.
- Risk:
  Desktop and mobile policy access are inconsistent.
- Recommended fix:
  Keep the canonical URL patch, then fix mobile menu rendering so the same legal destinations are reachable on handheld viewports.

### High 3: Analytics/Speed Insights generate noisy local console output

- Evidence:
  The live browser console repeatedly logged failed loads for:
  - `https://va.vercel-scripts.com/v1/script.debug.js`
  - `https://va.vercel-scripts.com/v1/speed-insights/script.debug.js`
- Risk:
  Important app errors are harder to spot during QA, and local development gets polluted by expected third-party script noise.
- Recommended fix:
  Gate these integrations more cleanly in local/dev or suppress expected loader noise in local QA environments.

### High 4: `brand-logo` still emits a runtime image warning

- Evidence:
  The browser logged a warning that `http://localhost:3000/avana-icon.svg` has width or height modified without preserving aspect ratio.
- Risk:
  Visual consistency and image handling are still not clean even on first paint.
- Recommended fix:
  Fix the logo image sizing or move it to `next/image` with explicit aspect-preserving dimensions.

## 4. Medium-Priority Issues

- The connect button did not expose an obvious wallet/mock-wallet selection UI in the tested home run, which makes sandbox state initialization less understandable.
- Home defaults straight into an action panel state even before the user has an obviously connected sandbox wallet.
- The live app still depends on local session history and seeded mock state in ways that are not clear to a first-time tester after reinstall/reset.
- The current local QA path is too sensitive to session reset: a clean install changed multiple deep links from actionable to blocked.

## 5. Borrow Flow Findings

What works:
- Borrow surfaces still render on the clean branch.
- The repaired borrow success-state logic remains covered by previously added code changes and regression tests.

What is broken now in live UI:
- A direct borrow action link can land in a dead disabled state after a clean boot.
- The UI does not explain which prerequisite is missing when the amount is present but value is still `≈ $0.00`.
- I did not get a current clean-branch end-to-end borrow submit from a fresh session in this pass.

Verdict:
- Borrow is not reliable enough yet for public beta because deep-link entry can fail before review/submit even begins.

## 6. Lend Flow Findings

What works:
- Lend route surfaces load.
- The lend session hydration regression remains covered by tests.

What is broken now in live UI:
- Direct withdraw deep link can land in the same dead disabled state as Borrow.
- I did not get a current clean-branch withdraw submit from a fresh session in this pass because the route no longer resolved actionable preview state.

Verdict:
- Lend remains below beta quality because first-entry deep-link behavior is not deterministic after reset.

## 7. Multiply Flow Findings

What works:
- Multiply-related regression tests are passing.
- The previously repaired deleverage flow code remains on the branch.

What is broken or still at risk in live UI:
- I did not complete a fresh clean-session live deleverage submit in this pass because the broader clean-session action-entry behavior changed after reinstall/reset.
- Multiply management still needs a clean, reproducible first-run verification path that does not depend on pre-existing local session state.

Verdict:
- Multiply code quality improved, but the live first-run QA story is still incomplete.

## 8. Portfolio / Manage Positions Findings

What works:
- Dashboard and rewards links are present in chrome.

What is broken or unclear:
- Current live verification did not reach a reliable fresh-session portfolio mutation loop because the direct action routes were blocked early.
- Portfolio confidence is still downstream of the unresolved action-entry and rewards instability issues.

Verdict:
- Portfolio cannot be called trustworthy yet because the upstream action surfaces are not deterministic on a clean session.

## 9. Mobile Findings

Tested:
- `390x844`

Findings:
- The mobile header rendered correctly.
- The menu toggle button was visible.
- In the tested run, the menu did not expose the expected nav/legal links after click.

Most important mobile blockers:
- Primary mobile navigation needs a regression fix or a stronger open-state assertion.
- Legal/help parity with desktop cannot be guaranteed while the menu is unreliable.

## 10. Desktop Findings

Tested:
- Desktop default browser width

Findings:
- Desktop home and rewards routes load.
- Desktop preferences now expose the canonical privacy link.
- Desktop still shows noisy analytics/speed-insights logs in local QA.

## 11. Code Review Findings

### Frontend

- `package.json` incorrectly pinned a Linux-only Rolldown binding at the repo root.
- Action routes still rely too heavily on implicit seeded local session state.
- Rewards hydration/rendering lacks a safe fallback state when the page data path fails.
- Mobile nav behavior still needs a reliable open-state contract.

### Data / state management

- Too much behavior still depends on local seeded mock state surviving resets.
- Direct-link action routes are not self-sufficient after reinstall/reset.
- Rewards remains the most visibly unstable state surface.

### Runtime / DX

- Local QA is still noisy because third-party analytics scripts log failures in dev.
- Install/runtime robustness is not yet strong enough for frictionless contributor onboarding.

## 12. Data / Engine Findings

- The branch still carries targeted session/regression fixes for lend hydration and multiply persistence.
- Fresh-session action-entry behavior is still not deterministic enough, which suggests the engine/read-model layer is too coupled to prior local session state.
- Rewards route rendering is unstable enough to treat as an engine/data read problem until proven otherwise.

## 13. Scalability Review for 1,000 Concurrent Users

Direct judgment:
- Not ready for 1,000 concurrent users.

Expected bottlenecks and risks:
- There is still no authoritative multi-user transaction/state layer behind core product actions.
- Fresh-session instability already appears for a single local user after reinstall/reset.
- Rewards rendering is not stable enough for a single-user reload, which means concurrency is not the first problem yet.
- Mobile navigation reliability is below baseline product readiness.

What breaks first:
- Product correctness and state trust break before backend scale even becomes the limiting factor.

## 14. Recommended Fix Plan

### Fix Immediately

- Remove the Linux-only Rolldown binding from root dependencies and keep it out of the lockfile contract.
- Fix Borrow and Lend direct action-route hydration so deep links become actionable or explicitly redirect into prerequisite selection.
- Fix Rewards so reloads cannot collapse to an empty main container.
- Fix mobile menu open behavior on small viewports.

### Fix Before Public Beta

- Make sandbox/mock-wallet initialization explicit and visible to users after a reset.
- Remove local dev console noise from Analytics/Speed Insights in QA mode.
- Resolve remaining image/runtime warnings in shared chrome.
- Add deterministic post-reset test coverage for first-run Borrow, Lend, Multiply, and Rewards entry.

### Fix Before Production

- Replace local-session-driven action truth with a real authoritative ledger and idempotent transaction pipeline.
- Add cross-product read models that rehydrate correctly after refresh, tab duplication, and session reset.
- Add structured runtime telemetry for route hydration failures, empty-state collapses, and action preview invalidation.

## 15. Suggested Automated Tests

### Borrow tests

- Clean-session deep-link test for `/actions/borrow/borrow?...` that asserts either:
  - valid review state renders, or
  - the user is explicitly sent to a prerequisite selection state
- Regression test for post-submit success-state recovery

### Lend tests

- Clean-session deep-link test for `/actions/lend/withdraw?...`
- Regression test for legacy/partial lend session hydration

### Multiply tests

- Clean-session first-run multiply/deleverage readiness test
- Persistence test for multiply submit -> review -> success -> refreshed state

### Rewards tests

- Reload stability test for `/rewards`
- Quest-claim test that asserts the page does not blank and claim CTAs reconcile after mutation

### Wallet tests

- Home connect-button test that proves a first-time user can initialize the sandbox wallet/session intentionally

### Mobile tests

- `390x844` menu open/close regression test
- Mobile legal/help link visibility test

### Data tests

- Reset-session rehydration tests for Borrow, Lend, Multiply, and Rewards
- Action query-param hydration tests across all direct action routes

### Load tests

- Not useful yet until single-user authoritative state is fixed; first add realistic shared-state plumbing

### Regression tests

- macOS install smoke test in CI so platform-pinned dependencies cannot land again
- Local dev boot smoke test for `npm run dev`

## 16. Final Verdict

Avana is not ready for users. It is usable only as internal sandbox software, and even then only with caution because clean-session behavior is still inconsistent across install, action entry, rewards rendering, and mobile nav.

Top 5 things to fix first:
- Remove the invalid root Linux-only dependency and keep install parity across developer environments.
- Fix Borrow and Lend direct action-route hydration after a clean reset.
- Fix Rewards reload instability and empty-page collapse.
- Fix mobile menu open behavior and restore legal/help parity on mobile.
- Replace hidden local-session assumptions with explicit mock-wallet/session initialization plus stronger read-model rehydration.

## Frontend To-Do List

- Fix mobile menu open-state rendering at `390x844` and add a visible empty/error fallback if the menu state fails.
- Make Borrow and Lend direct action routes self-sufficient on first load.
- Show explicit prerequisite messaging when query params are not enough to build a preview.
- Stabilize `/rewards` so it never collapses to an empty main container.
- Make sandbox wallet/session initialization explicit in the UI instead of implicit local state.
- Reduce local-dev console noise from Analytics and Speed Insights.
- Fix the logo sizing/runtime warning in shared chrome.
- Keep desktop and mobile legal/help destinations unified through a shared canonical link module.

## Backend / Data To-Do List

- Define a single authoritative action-state contract instead of product-specific local assumptions.
- Make preview hydration deterministic from route params + mock wallet/session data.
- Add a real read model for rewards balance, claimable balance, and quest completion state.
- Guarantee post-action refresh consistency across rewards, positions, balances, and activity.
- Add idempotent action receipts and explicit failed-state handling before any move beyond sandbox.

## Security To-Do List

- Keep legal/privacy/help links on canonical owned domains only.
- Stop showing success-like states when the underlying page state cannot reconcile on reload.
- Add telemetry for hydration collapses, failed route-state derivation, and silent menu/render failures.
- Review how much action truth still depends on client-only local storage before any external user rollout.
- Add CI checks for platform-specific dependency mistakes that can silently block teams on one OS.

## Testing To-Do List

- Add CI install smoke on macOS and Linux.
- Add `npm run dev` boot smoke to catch runtime/import issues on current `main`.
- Add clean-session deep-link tests for Borrow, Lend, Multiply, and Rewards.
- Add mobile menu interaction tests at phone widths.
- Add rewards reload-stability tests.
- Add connect-button/session-init tests for first-time sandbox users.
- Add browser-console assertions that fail on unexpected warnings/errors in core flows.
