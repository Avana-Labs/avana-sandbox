# Avana Actions Pages — Pre-Launch Hardening Audit

Audit date: 2026-09-16  
Branch: `feat/desktop-mega-menu`  
Base commit before this audit: `6dced0e1`  
Audit commits: `3f89317b`, `8a1266b3`, `b25e0fbd`

## Release verdict

**BLOCKED — do not public-launch the action system.**

The current application wires the live-looking action pages to sandbox read and write
adapters by default. The production adapters exist only as dependency-injection seams and
throw `Production ... adapter is not implemented` when no external implementation is supplied.
The Convex provider persists sandbox receipts through `convex/sandbox/*`; it does not submit
wallet transactions. This is a P0 launch blocker for a product advertised as onchain.

The standalone Swap flow also remained stuck at `Loading quote` in deterministic Playwright
mode after the indicative quote appeared. No final financial CTA was clicked in the browser:
the local runtime was simulated and the browser confirmation boundary was not crossed. Engine
execution was covered by the deterministic adapter suites instead.

## Complete action inventory

The canonical router is `app/actions/[product]/[kind]/page.tsx`. It exposes:

| Product | Action routes | Discovered entry surfaces |
| --- | --- | --- |
| Borrow | `supply`, `pledge` (alias), `borrow`, `repay`, `remove`, `claim` | `/borrow` workspace, collateral-pools table, borrowable-assets table, pool detail sidebar, asset detail sidebar, dashboard Borrow tab, dashboard health banner, mobile/detail sidebars |
| Lend | `deposit`, `withdraw` | `/lend`, lend asset spokes, lend market detail, dashboard Investments tab, dashboard quick actions, borrowable-assets table, dashboard rewards/lend account section, mobile/sidebar actions |
| Multiply | `multiply`, `deleverage`, `close` | `/multiply`, Explore Loops table, multiply market detail, dashboard Multiply/collateral table, dashboard health banner, mobile/detail sidebars |
| Rewards | `claim` | dashboard rewards hero, dashboard rewards tabs/cards, mobile rewards CTA |
| Umbrella | `stake`, `claim`, `cooldown`, `unstake` | `/umbrella`, Umbrella positions, cooldown cards, market detail/sidebars, dashboard Umbrella position surfaces, mobile Umbrella sidebar |
| Swap | standalone `/swap` | home swap action, dashboard Wallet tab, wallet CTA; `/actions/swap/swap` is intentionally invalid and shows Action unavailable |

Also inventoried: onboarding faucet/claim controls under `app/components/sandbox/onboarding-flow.tsx`.
They are sandbox onboarding controls, not part of the canonical financial action router.

## Action-by-action report

### Action: Borrow → Supply collateral / Pledge

**Entry Points**  
`app/borrow/components/borrow-workspace.tsx`, `app/borrow/pool/[poolId]/pool-detail-client.tsx`,
`app/dashboard/dashboard-borrow-tab.tsx`, `app/borrow/_detail/sidebars/*`, and the `/borrow/pledge`
alias. The alias normalizes to `supply`.

**Visual Inspection**  
PASS for route rendering. The local route showed the LP selector, collateral factor,
collateral risk, borrowing power before/after, health factor, and network fee.

**Input Values**  
LP collateral USD amount; the browser fixture showed `$98` for a 100-unit input because the
LP oracle value was below $1.

**Formula Verification**  
Credit engine uses bigint USD6 values; collateral value, credit limit, health factor, and LTV
come from `app/lib/credit-engine` and the shared borrow preview mapper.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Deterministic adapter coverage is green; expected state is wallet
LP delta = `-input`, collateral delta = `+input`, credit capacity increases by collateral ×
collateral factor, and activity is recorded once. No real-wallet result was observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
BLOCKED for live execution. Static list/detail parity and borrow adapter suites passed.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Read architecture has wallet hydration and revision guards; live wallet reconnect was not
verifiable because the production read adapter is not implemented.

**Edge Cases**  
Zero input and over-balance validation are covered; LP collateral uses the LP valuation path,
not a normal ERC-20 price.

**Issues Found**  
P0: production read/write path absent. P2: the route is titled Pledge while other entry points
describe the same economic action as Supply collateral; terminology should be standardized.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing credit-engine, borrow adapter, preview, supply-over-balance, and list/detail parity suites.

**Final Status**  
BLOCKED.

### Action: Borrow

**Entry Points**  
Borrow workspace, collateral-pools table, asset detail sidebar, dashboard quick action, dashboard
Borrow tab, dashboard health-risk banner, and mobile/detail action launchers.

**Visual Inspection**  
PASS for route rendering. Browser preview showed a 1,000-token USDC borrow, available borrowing
power `$3,651`, LTV `19.05% → 34.92%`, health factor `2.49`, and liquidation threshold `86.50%`.

**Input Values**  
The input is a token quantity; the engine action is USD-denominated and uses the borrow asset
oracle price before creating the intent.

**Formula Verification**  
`LTV = total debt USD / collateral USD`; Max is pre-borrow available credit, converted back to
borrow-token units. Health factor and capacity come from the bigint credit engine.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Deterministic preview/execute suites pass. Expected wallet receipt
equals token input, debt increases by token input × price, and all dependent risk metrics update.
No production receipt was observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
BLOCKED for live execution; static borrow dashboard/read-model tests passed.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Hydration/revision guards are present; production read adapter prevents live verification.

**Edge Cases**  
Near-cap borrow, zero/invalid amounts, liquidity blocks, and health-factor bands are covered by
focused tests.

**Issues Found**  
P0: no production execution/read path.

**Code Changes**  
None specific to Borrow.

**Regression Tests Added**  
Existing borrow preview, health-factor, execution-guard, and adapter suites.

**Final Status**  
BLOCKED.

### Action: Borrow → Repay

**Entry Points**  
Asset detail sidebar, dashboard Borrow tab, dashboard health-risk banner, mobile/detail sidebars,
and repay links from position cards.

**Visual Inspection**  
PASS after hardening. Browser USDC preview showed outstanding debt `$1,200`, remaining debt
`$1,200 → $1,100`, and health factor `4.98`; the flow blocks over-repay.

**Input Values**  
Token quantity. The engine takes USD6, so the action now multiplies the typed amount by the
selected debt asset’s oracle price.

**Formula Verification**  
`repayUsd = repayTokenAmount × debtAssetPrice`; remaining debt and health factor are recomputed
by the credit engine. Max is outstanding USD debt converted to debt-token units.

**Execution / Expected Result / Actual Result**  
The pre-audit code passed the raw token input as USD, so 1 ETH could repay $1. Fixed in `8a1266b3`.
Browser final submit was not performed; deterministic conversion and client tests pass.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic engine/adapter coverage: PASS. Live/onchain reconciliation: BLOCKED by missing
production adapters.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Revision/hydration mechanisms exist; live test BLOCKED.

**Edge Cases**  
Over-repay, full repay, partial repay, and volatile-asset unit conversion are covered.

**Issues Found**  
Resolved P1: token/USD unit mismatch. Open P0: production path absent.

**Code Changes**  
`app/components/action-page/borrow-action-page-client.tsx`,
`app/lib/action-system/adapters/borrow-preview-mapper.ts` — `8a1266b3`.

**Regression Tests Added**  
ETH at $2,000 with a $500 USD repay now maps to `0.25 ETH` and Max converts to token units.

**Final Status**  
BLOCKED by production execution/read path; unit bug fixed.

### Action: Borrow → Remove collateral

**Entry Points**  
Borrow workspace/dashboard position actions, dashboard Borrow tab, collateral position sidebars,
and mobile/detail action launchers.

**Visual Inspection**  
PASS. Browser showed a percentage input, collateral value, annual earnings before/after,
borrowing power, net balance, net collateral, and health factor.

**Input Values**  
Percentage of the selected LP collateral position; 10% displayed `$418.57` in the local fixture.

**Formula Verification**  
Percent is converted to basis points; collateral removal is simulated through the credit engine,
with health-factor safety validation.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Deterministic client test confirms a 25% removal produces `$1,050`
processed and the position delta is reflected in the receipt UI.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic coverage: PASS. Live coverage: BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
BLOCKED by production read adapter.

**Edge Cases**  
Unsafe withdrawal is rejected by health-factor checks; percentage input is bounded 0–100.

**Issues Found**  
P0 production path absent.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing removal client, health, and credit-engine tests.

**Final Status**  
BLOCKED.

### Action: Borrow → Claim

**Entry Points**  
Pool detail sidebar, dashboard Borrow tab, collateral position cards, and mobile/detail sidebars.

**Visual Inspection**  
PASS. Browser showed claim total/market/total received `$111.10` and an estimated network fee.

**Input Values**  
Claim positions and selected collateral pool; no free-form amount.

**Formula Verification**  
Claim total is derived from selected claim positions and the borrow claim preview.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Expected reward balance decreases by claim total, wallet claim asset
increases, and activity records one claim. No production receipt observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
BLOCKED for live execution.

**Refresh/Reconnect Test / Cache/Staleness Test**  
BLOCKED for live execution.

**Edge Cases**  
Empty claim positions are handled by the picker/zero-state logic.

**Issues Found**  
P0 production path absent.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing claim preview, activity, and dashboard route tests.

**Final Status**  
BLOCKED.

### Action: Lend → Deposit

**Entry Points**  
`/lend`, lend asset spokes, lend market detail, dashboard quick actions, dashboard Investments tab,
dashboard rewards/lend account section, and borrowable-assets table.

**Visual Inspection**  
PASS. Browser showed USDC wallet balance `8,200`, 4.85% APY, supplied value before/after, rewards,
lifetime earnings, and network fee.

**Input Values**  
Token quantity. The local fixture showed a 4,000 USDC deposit.

**Formula Verification**  
Lend engine preview supplies engine USD snapshots and interest/reward fields. The mapper now uses
those snapshots directly instead of applying a second, independently refreshed UI price.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Deterministic sandbox deposit lifecycle passes. Expected wallet token
delta = `-deposit`, supplied amount = `+deposit`, and dashboard/position/activity use the same
engine result.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic adapter/read-model coverage: PASS. Live coverage: BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Local persistence/hydration tests pass; live test BLOCKED.

**Edge Cases**  
Balance checks, second deposits, accrued earnings, and failure-without-state-mutation are covered.

**Issues Found**  
Resolved P1: UI oracle repricing could disagree with engine before/after USD values. Open P0:
production path absent.

**Code Changes**  
`app/lib/action-system/adapters/lend-preview-mapper.ts` — `b25e0fbd`.

**Regression Tests Added**  
Price divergence test asserts engine `$100 → $150` remains unchanged even when a UI price of $1,800
is supplied.

**Final Status**  
BLOCKED by production execution/read path; preview drift fixed.

### Action: Lend → Withdraw

**Entry Points**  
Lend asset spokes, lend market detail, dashboard Investments tab, dashboard position cards,
mobile/sidebar actions, and detail-page withdrawal CTAs.

**Visual Inspection**  
PASS. Browser showed deposited `4,249.96 USDC`, remaining supply, accrued earnings before/after,
withdrawable balance, pool liquidity, and interest inclusion.

**Input Values**  
Token quantity capped by current supplied balance and available liquidity.

**Formula Verification**  
Withdraw uses the lend engine preview; supplied and earnings USD metrics are read from the same
before/after snapshots as Deposit.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Deterministic withdraw/partial/full/dust-close suites pass.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic coverage: PASS. Live coverage: BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Local persistence and lazy accrual tests exist; live coverage BLOCKED.

**Edge Cases**  
Partial/full withdraw, accrued interest, insufficient liquidity, and dust closure are covered.

**Issues Found**  
Resolved P1: independent UI repricing. Open P0: production path absent.

**Code Changes**  
`b25e0fbd` mapper fix; `3f89317b` disclosure.

**Regression Tests Added**  
Lend mapper and sandbox adapter lifecycle suites.

**Final Status**  
BLOCKED.

### Action: Multiply

**Entry Points**  
`/multiply`, Explore Loops table, multiply market detail, dashboard Multiply/collateral table,
dashboard quick action, and mobile/detail sidebars.

**Visual Inspection**  
PASS for the route; local test wallet had no AAVE/ETH collateral balance, so the browser correctly
showed a zero Max and blocked execution. The route exposes collateral, multiplier, loop exposure,
borrowed amount, LTV, health factor, net APY, liquidation price, and execution steps in code.

**Input Values**  
Collateral token quantity plus target multiplier. The engine models initial supply → borrow → swap →
resupply loop legs.

**Formula Verification**  
Multiply engine aggregates gross exposure, debt, LTV, health factor, net APY, and loop count. Live
collateral price is threaded into the action intent.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED by zero local collateral and missing production adapter. Expected
gross exposure, debt, and equity to reconcile across dashboard/position/activity; no live result.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic multiply adapter/sequence/health tests: PASS. Live coverage: BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Hydration and position revaluation code exists; live test BLOCKED.

**Edge Cases**  
Public max leverage, min health factor, zero budget, and sequence consistency are covered.

**Issues Found**  
P0 production path absent. P1 deterministic browser execution is not possible with the supplied
zero-collateral test wallet.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing multiply sequence, close, health-factor, collateral-limit, and adapter suites.

**Final Status**  
BLOCKED.

### Action: Multiply → Deleverage

**Entry Points**  
Multiply market detail, Explore Loops table, dashboard collateral table, dashboard health banner,
position cards, and mobile/detail sidebars.

**Visual Inspection**  
PASS for empty-position handling; route displayed target leverage and disabled execution when no
position was selected.

**Input Values**  
Target multiplier bounded by current position multiplier and the shared leverage limits.

**Formula Verification**  
Engine preview reconciles exposure, debt, LTV, health factor, net APY, and liquidation price before
and after deleverage.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED by no local position and no production adapter. Deterministic unwind
tests pass.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic coverage: PASS. Live coverage: BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
BLOCKED for live execution.

**Edge Cases**  
Minimum target, close-only behavior, and public max limits are covered.

**Issues Found**  
P0 production path absent; P1 browser fixture lacks an open Multiply position.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing deleverage and leverage-limit suites.

**Final Status**  
BLOCKED.

### Action: Multiply → Close

**Entry Points**  
Multiply position cards, multiply detail/sidebar actions, dashboard collateral table, and mobile
position controls.

**Visual Inspection**  
PASS for empty-position handling; no position correctly disabled the CTA.

**Input Values**  
No amount; full unwind of the selected position.

**Formula Verification**  
Close preview calculates debt repaid, collateral unwound, swap loss, minimum received, and final
withdrawal from the shared multiply preview.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Deterministic close-position tests pass; no live receipt observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic coverage: PASS. Live coverage: BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
BLOCKED for live execution.

**Edge Cases**  
Zero debt, price impact, and dust/fully closed position behavior are covered.

**Issues Found**  
P0 production path absent; P1 browser fixture lacks an open position.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing close-position and sequence suites.

**Final Status**  
BLOCKED.

### Action: Rewards → Claim

**Entry Points**  
Dashboard rewards balance hero, rewards cards/tabs, mobile rewards CTA, and `/actions/rewards/claim`.

**Visual Inspection**  
PASS. Browser showed `25 AVA`, `$25.00`, one quest, and network fee.

**Input Values**  
Fixed claimable reward total; no free-form amount.

**Formula Verification**  
Claim preview comes from the rewards session and durable rewards state; claim activity is distinct
from lend/borrow activity.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Deterministic reward adapter/activity suites pass. Expected claimable
rewards decrease by exactly the successful claim and wallet/activity update together.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic coverage: PASS. Live coverage: BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Remote rewards revision/OCC code exists; production wallet path is unavailable.

**Edge Cases**  
No-claimable-reward blocks are covered.

**Issues Found**  
P0 production path absent.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing rewards adapter, activity, referral, and durable state tests.

**Final Status**  
BLOCKED.

### Action: Umbrella → Stake

**Entry Points**  
Umbrella positions, Umbrella homepage/sidebar, dashboard Umbrella surfaces, mobile Umbrella sidebar,
and stake CTAs from market cards.

**Visual Inspection**  
FAIL in deterministic browser mode: the page showed a valid baseline wallet balance (`20,000 GHO`)
and APY breakdown but disabled the CTA with `Current Convex price unavailable for GHO`.

**Input Values**  
Token quantity capped by wallet balance; stake amount is valued at market price.

**Formula Verification**  
Umbrella session uses amount × market price for value, with coverage/target/deficit metrics from
the session/Convex state.

**Execution / Expected Result / Actual Result**  
Blocked before review by the strict price guard in local test mode. Expected active stake and wallet
balance to move by the stake amount and activity to record once; not observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Umbrella lifecycle unit coverage exists; live/browser execution BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Convex user snapshot and staged-action persistence are implemented; live verification BLOCKED.

**Edge Cases**  
Insufficient balance and stale/unavailable price blocks are surfaced.

**Issues Found**  
P1: deterministic test mode cannot execute the action despite a deterministic baseline price. P0:
production wallet path absent.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing Umbrella seed-price, hydration, cooldown, tranche, and lifecycle suites.

**Final Status**  
BLOCKED.

### Action: Umbrella → Claim

**Entry Points**  
Umbrella positions, market detail/sidebar claim CTAs, dashboard Umbrella rewards, and mobile sidebar.

**Visual Inspection**  
PASS. Browser showed pending rewards `$26.14`, earnings breakdown, coverage, target, deficit offset,
active deficit, and network fee.

**Input Values**  
Fixed pending rewards amount and selected Umbrella market.

**Formula Verification**  
Pending reward and earnings components come from the Umbrella position/session snapshot.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED. Expected pending rewards → zero and wallet/activity claim delta =
`$26.14`; no production receipt observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Unit/session coverage exists; live coverage BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Convex state path exists; live coverage BLOCKED.

**Edge Cases**  
No rewards blocks are implemented.

**Issues Found**  
P0 production path absent.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing Umbrella claim/session tests.

**Final Status**  
BLOCKED.

### Action: Umbrella → Start cooldown

**Entry Points**  
Umbrella cooldown cards, Umbrella detail/sidebar, dashboard Umbrella positions, and mobile sidebar.

**Visual Inspection**  
FAIL in deterministic browser mode: active stake `9,500 GHO` was visible, but the CTA was disabled
by the unavailable Convex price guard.

**Input Values**  
Token quantity capped by active stake; cooldown is 20 days followed by a 2-day withdrawal window.

**Formula Verification**  
Session tranche logic tracks active, cooling, ready, expired, and withdrawal-window state.

**Execution / Expected Result / Actual Result**  
Blocked before review. Expected active stake decrease and cooling amount increase exactly by input;
not observed in browser.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Umbrella lifecycle tests pass; live/browser execution BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
BLOCKED for live execution.

**Edge Cases**  
Expired tranche recovery and overlapping cooldown cases are covered.

**Issues Found**  
P1 deterministic price-guard test blocker; P0 production path absent.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing cooldown/tranche lifecycle suites.

**Final Status**  
BLOCKED.

### Action: Umbrella → Unstake

**Entry Points**  
Umbrella cooldown withdrawal cards, Umbrella detail/sidebar, dashboard position cards, and mobile
sidebar.

**Visual Inspection**  
PASS for state messaging; browser showed cooled stake `0` and correctly disabled the CTA. The same
price guard prevented a ready-position execution test.

**Input Values**  
Token quantity capped by cooled stake and open withdrawal window.

**Formula Verification**  
Session requires cooldown status `ready`, non-expired withdrawal window, and amount ≤ cooled stake.

**Execution / Expected Result / Actual Result**  
Blocked before review. Expected cooled stake decrease, wallet balance increase, and activity entry;
not observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Lifecycle unit coverage exists; live/browser execution BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
BLOCKED for live execution.

**Edge Cases**  
Not-ready, expired window, and excessive amount are blocked; expired tranches can recover.

**Issues Found**  
P1 deterministic price-guard test blocker; P0 production path absent.

**Code Changes**  
Simulation disclosure: `3f89317b`.

**Regression Tests Added**  
Existing Umbrella unstake/cooldown lifecycle suites.

**Final Status**  
BLOCKED.

### Action: Swap

**Entry Points**  
Standalone `/swap`, home swap action, dashboard Wallet tab, and wallet quick actions. The attempted
`/actions/swap/swap` URL is not a valid router action and correctly rendered Action unavailable.

**Visual Inspection**  
FAIL. Standalone Swap rendered Sell ETH / Buy USDC and an indicative output, but the primary CTA
remained `Loading quote` after more than 5 seconds in local test mode.

**Input Values**  
Local wallet showed `0.01 ETH`; input `0.01` displayed `$19.34`, estimated output `19.266508 USDC`,
and `$19.27` output value.

**Formula Verification**  
The swap quote engine computes fee, price impact, minimum received, route, and network fee. The UI
uses the quote output for the buy-side USD value.

**Execution / Expected Result / Actual Result**  
Browser final submit: BLOCKED by quote loading. Expected approval (if required) → confirmed swap →
wallet input/output deltas → activity record; not observed.

**Dashboard Reconciliation / Position Reconciliation / Market Reconciliation / Activity Reconciliation**  
Deterministic swap adapter/quote suites pass; browser and live reconciliation BLOCKED.

**Refresh/Reconnect Test / Cache/Staleness Test**  
Quote TTL/expiry refresh logic exists; the initial authoritative quote never reached usable state
in the browser, so refresh behavior was not verifiable.

**Edge Cases**  
Approval rejection/failure, swap rejection/revert, quote expiry, price impact acknowledgement,
and insufficient balance have unit coverage.

**Issues Found**  
P1: local deterministic flow stuck on Loading quote. P0: production swap transaction path is not
wired; default swap adapter is sandbox/MockSwapProvider.

**Code Changes**  
None yet.

**Regression Tests Added**  
Existing swap quote, adapter, rejection, expiry, and action-page tests; add a browser regression
once the quote lifecycle root cause is isolated.

**Final Status**  
FAIL / BLOCKED.

## Cross-page consistency matrix

| Value | Canonical implementation inspected | Result |
| --- | --- | --- |
| Borrow collateral, debt, LTV, health factor | Credit engine bigint metrics + borrow action mapper + wallet hydration | Deterministic parity PASS; live BLOCKED |
| Lend supplied value and earnings | Lend engine preview snapshots + lend mapper + Convex hydration | Mapper drift fixed in `b25e0fbd`; live BLOCKED |
| Multiply gross exposure/debt/equity | Multiply engine/read model + multiply mapper + Convex position hydration | Deterministic sequence tests PASS; live BLOCKED |
| Umbrella user stake/cooling/claim state | `useUmbrellaSession` + `convex/sandbox/umbrella.ts` | Lifecycle tests PASS; browser action guard blocks three actions |
| Rewards | Rewards session + durable rewards state/OCC | Deterministic tests PASS; live BLOCKED |
| Swap quote/output/fee | `convex/sandbox/swapQuoteEngine.ts` + MockSwapProvider/Convex quote path | Unit tests PASS; browser quote state stuck |
| Simulation disclosure | `ActionPageShell` `simulated` prop | Fixed in `3f89317b`; browser status banner PASS |

## Mathematical and precision review

- Credit-engine financial values use bigint fixed-point USD6/WAD arithmetic.
- Lend and Multiply domain engines still contain JavaScript number-based token state; this is
  acceptable for deterministic sandbox fixtures but is not a sufficient onchain accounting layer.
- Action input parsing caps magnitude at `1e15` and several Max handlers still serialize through
  six decimal places. That is insufficient as a universal guarantee for 8- and 18-decimal assets;
  production token amounts must remain integer/base-unit values until presentation.
- Stable and volatile live-price overlays can differ from static sandbox catalog prices. The Lend
  mapper drift was fixed by using engine USD snapshots; the remaining architecture must ensure the
  engine itself receives the same current oracle snapshot before public launch.

## Validation evidence

- `npm run build`: PASS. One non-blocking Turbopack warning traces dynamic filesystem access in
  `app/opengraph-image.tsx`.
- `npm run lint`: PASS.
- Focused action/domain suites: 104 files, 356 tests PASS initially; post-fix focused suites also
  pass (Borrow mapper/client 20 tests; Lend mapper 4 tests; Action shell 5 tests; Swap/action-page
  12 tests).
- Full `npm test`: 551 files passed, 1 file failed, 2,680 tests passed, 8 skipped. The failure was
  `convex/__tests__/liquidity-delta-snapshot.test.ts` timing out at the default 5-second test limit
  while compacting the 512-row threshold batch. The isolated file passes with `--testTimeout=20000`
  (7/7), so the full-suite gate remains non-green under the repository default.
- Browser: every canonical action route was loaded in local deterministic mode and key configured
  previews were inspected. No final financial CTA was submitted.
- Normal dev browser mode hit Convex auth `429 too many requests`; this prevented a trustworthy
  live Convex wallet audit and is separate from the deterministic local findings.

## Required before release

1. Wire production read adapters and transaction adapters for every product, including wallet
   signing, chain/contract checks, confirmations, failure states, and real transaction hashes.
2. Make production execution impossible to confuse with sandbox execution; retain the disclosure
   until real receipts and authoritative reads are confirmed.
3. Fix the Swap quote lifecycle and add a browser regression for indicative → authoritative quote.
4. Provide a funded deterministic Multiply wallet and a ready Umbrella position for full UI lifecycle
   coverage, or expose injected fixtures without weakening production guards.
5. Replace universal six-decimal Max serialization with base-unit-safe token amount handling.
6. Rerun full CI with the repository’s default timeout green, then perform signed-wallet lifecycle
   reconciliation across dashboard, market/detail pages, activity, balances, liquidity, and risk.
