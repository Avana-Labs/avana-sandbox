# Token Price & LP-Valuation Architecture — Audit & TDD Plan

Code-truth audit (source + tests only). Compares the current implementation against the
target financial-data architecture and lays out a test-driven, commit-by-commit remediation
plan for the whole app.

---

## 0. TL;DR

The app is an intentional **sandbox**: only token spot prices are genuinely live (DefiLlama);
supply / borrow / TVL / APY / liquidity are seeded and evolved by simulated activity. The core
engine math is solid (bigint fixed-point, correct supply/borrow separation, correct multiply
leverage/HF formulas). The gaps that map to the requirement are concentrated in the **price
basis** and **LP valuation**:

1. **Two disconnected price systems.** A real DefiLlama oracle writes `tokenPrices` hourly, but
   **nothing rendered reads it** — every displayed price and every valuation reads a hardcoded
   `SANDBOX_BASELINE_PRICES_USD` map (duplicated in 3 hand-synced copies). The oracle's client
   hooks (`usePriceFor`, `usePriceFreshness`, `fetchTokenPrices`) and the whole `lpTokenPrices`
   table are dead code.
2. **LP price is not `Σ(weightᵢ × priceᵢ)`.** Current `poolLpTokenPriceUsd = max(1,
   collateralExampleUsd / 2.5)` where `collateralExampleUsd = 1500 + index*320` — a catalog
   index counter, unrelated to components. A commit that switched to `2·√(P0·P1)` (the forbidden
   formula) was just reverted (`4bda575f` → `7ae903a0`). Pools carry **no weights/composition** —
   3-token and 80/20 pools exist only as display strings in `name`; `pair`/`visuals` are 2-tuples.
3. **Stablecoins hard-pegged to 1**, unknown symbols default to `$1` (`sandboxBaselinePriceUsd`).
4. **Refresh is hourly, not ~10 min**; freshness is a single `updatedAt` (no `status` /
   `sourceUpdatedAt` / `fetchedAt` / `snapshotAt`); `lpTokenPrices` is never refreshed.
5. **No coherent snapshot bundle** (`underlyingPrices[] / lpWeights / lpPriceUsd / status`).
6. **Fiat** is not locale-aware (manual symbol concatenation, hardcoded `en-US` grouping) and FX
   bypasses Convex (client polls `open.er-api.com`); staleness is silent.
7. **Decimal seams** at the JS-number boundaries (`Number(raw)/1e18 * priceUsd` in server
   solvency/liquidation; float USD → `Math.round` into usd6 at persistence edges).

Everything else (multiply accounting, lend principal/rewards separation, debt-never-LP-priced,
current/history split for portfolio) is largely correct.

---

## 1. Current vs Target — by requirement section

| # | Requirement | Current state (evidence) | Verdict |
|---|---|---|---|
| 1 | One canonical financial-data layer; UI reads normalized Convex data; components don't fetch from providers | UI reads Convex queries and no component hits a provider (good). BUT the *values* rendered come from the static `SANDBOX_BASELINE_PRICES_USD` map, not the Convex `tokenPrices` oracle. `canonical.ts:33`, `sandbox-baseline-prices.ts:18` | ⚠️ Partial — plumbing right, basis wrong |
| 2 | Refresh ~10 min; store `{sourceUpdatedAt, fetchedAt, snapshotAt, status}`; failed refresh never looks fresh | Hourly cron (`crons.ts:24`). Only `updatedAt` + `source`. No status enum, no 4-timestamp model. Failed-refresh safety exists for `tokenPrices` only; `lpTokenPrices` never refreshed | ❌ Gap |
| 3 | Canonical token USD prices; validate; prefer chainId+contract; `unavailable` over invented | Real oracle exists & is well-guarded (finite, >0, confidence≥0.8, throws on empty — `prices.ts:174,179,191`). Identity is **symbol-only** (`by_symbol`); chain/contract buried in opaque `llamaId`, never parsed. But the oracle isn't the rendered basis | ⚠️ Partial |
| 4 | Pair rates = A_USD / B_USD | `poolPairPriceUsd(base,quote)=P0/P1` correct (`canonical.ts:68`) — off the static map | ✅ (basis aside) |
| 5 | LP collateral = `Σ(weightᵢ × priceᵢ)`; 2/3/4+; weighted | Not implemented. `max(1, collateralExampleUsd/2.5)` (`borrow-sim.ts:101`). No weights anywhere | ❌ Gap (core) |
| 6 | Remove `2·√(P0·P1)` and reserves/supply LP math | Neither is live (the `2·√` attempt was reverted). Current heuristic must still be removed | ⚠️ Partial |
| 7 | Borrowed assets = amount × own token price; never LP-valued | Debt is **never** LP-priced (correct separation — `valuation.ts:30`, `transactions.ts:553`). BUT debt is fixed-USD + interest index; not re-priced by the borrowed token's spot price | ⚠️ Partial |
| 8 | Keep supply & borrow accounting separate | Correct — separate paths, LP price confined to collateral | ✅ |
| 9 | Stablecoins can depeg; use current price | USDC/USDT/DAI/GHO hardcoded `=1`; unknown → `$1` default (`sandbox-baseline-prices.ts:20-27,55`) | ❌ Gap |
| 10 | Fiat via USD → selected fiat; `Intl.NumberFormat` | Manual symbol concatenation + hardcoded `en-US` grouping, prefix-only (`currency/format.ts:29-58`); FX via client poll of `open.er-api.com`, not Convex; staleness silent | ❌ Gap |
| 11 | Convex snapshots store coherent bundles from one price snapshot | No `underlyingPrices[] / lpWeights / lpPriceUsd / status` on any table; daily stats carry price over while liquidity is simulated → can drift | ❌ Gap |
| 12 | Separate current vs historical | Only `portfolioCurrent` / `portfolioSnapshots` split; prices are current-only (no history table); market price history smeared into `marketDailyStats.priceUsd` | ⚠️ Partial |
| 13 | Remove fake production financial data | Whole app is seeded-by-design; nothing fakes a *live* feed, but the static price map + `/2.5` LP heuristic + hard-1 stables are the offending pieces for the price layer | ⚠️ Partial (see Decisions) |
| 14 | Decimal-safe calculations | Core engine is bigint `mulDiv` (good). Seams: `Number(raw)/1e18*priceUsd` in `transactions.ts:528`, `liquidation.ts:73`; float→`Math.round` usd6 at `persistence.ts:89-98`; magic `10n**27n/10n**18n` literals | ⚠️ Partial |
| 15 | Required automated tests | LP-composition cluster entirely MISSING (no code to test yet); depeg, wrong-chain, wrong-contract, weights≠100%, N-token, negative amount, external reward-token MISSING; borrow/lend/multiply flow + fiat largely COVERED | ❌ Gap |
| 16 | Final UI test across device/locale/action | Not done as part of this work | ▫️ To do |

---

## 2. Key file map (single source of truth for the plan)

- Live oracle: `convex/prices.ts` (fetch+validate `:157-203`, queries `:55-114`, staleness `:45,82`)
- Oracle table: `convex/schema.ts:605-628` (`tokenPrices`), `:1589-1594` (`lpTokenPrices`, no writer)
- Crons: `convex/crons.ts` (`refresh token prices` hourly `:24`)
- **Rendered basis (static)**: `app/lib/prices/sandbox-baseline-prices.ts:18-57`, `app/lib/prices/canonical.ts`
- Duplicate static maps: `convex/sandbox/onboarding.ts:68-86` (`SANDBOX_TOKEN_PRICE_USD`), `convex/sandbox/umbrella.ts:30-78`
- Dead oracle consumers: `app/lib/prices/token-prices-context.tsx:38,44`, `market-hydration-server.ts:347`
- LP price heuristic: `app/lib/borrow-sim.ts:101-103` (+ `collateralExampleUsd` `:951`)
- Pool catalog (2-tuple pairs, weights-as-strings): `app/lib/borrow-sim.ts:722-839`
- LP price consumers: `app/lib/borrow-system/mock.ts:146,176,183`, `app/lib/convex-seed/build-seed.ts:534`
- Engine valuation (bigint): `app/lib/credit-engine/valuation.ts`, `actions.ts`, `units.ts`
- Server solvency/liquidation (float seam): `convex/sandbox/transactions.ts:502-538`, `convex/sandbox/liquidation.ts:51-81`
- Exposure 50/50 split: `app/lib/portfolio/exposure-aggregator.ts:52-62`
- Lend: `app/lib/lend-engine/{formulas,simulation,actions}.ts`, hydration bug `app/lib/lend-system/use-lend-session.ts:277-282,310`
- Multiply: `app/lib/multiply-engine/{formulas,simulation,validation}.ts`, `multiply-system/*`
- Fiat: `app/lib/currency/{rates,exchange-rates,active-rate,format}.ts`, `app/api/fx-rates/route.ts`, `app/components/display-preferences.tsx:30-48`

---

## 3. Decisions — RESOLVED

- **D1 — Scope of "real": KEEP SANDBOX.** Make the price/LP/fiat layer fully canonical, live,
  validated, decimal-safe, and drift-free; supply/borrow/TVL stay simulated but are never
  presented as a live feed. No new provider/RPC/subgraph phases.
- **D2 — Debt repricing: REPRICE BY CURRENT PRICE.** `BorrowedAssetUSD = amount × currentPrice`
  on revaluation (C13 stays); a volatile/depegged borrowed asset moves the debt and HF.
- **D3 — Static baseline map: DELETE ENTIRELY.** No static fallback. Convex `tokenPrices` is the
  sole basis; unknown/unpriced/stale → `unavailable` (never a fabricated number). Delete
  `SANDBOX_BASELINE_PRICES_USD`, `SANDBOX_TOKEN_PRICE_USD` (`onboarding.ts`), and the `umbrella.ts`
  copy. **Consequence:** the map's *determinism* role for tests + `test-mode`/e2e (which run with
  NO Convex/SIWE — see `ci.yml` `e2e-smoke`) must be replaced by an explicit **test-only price
  fixture**, seeded into the price context under `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE`/audit mode —
  NOT a production default. This is new work: see **C0** below.
- **D4 — Price SoT:** resolved by this plan — Convex `tokenPrices` is the single source of truth.
  (Multiply-vs-Leverage naming remains a separate open question, out of scope.)

---

## 4. Test-driven, commit-by-commit plan

Conventions: every commit is **tests first (red) → implementation (green)**, keeps `npm test`
green at the end, and is independently revertable. Money = bigint fixed-point (`parseFixed`,
`usd6`, `WAD`, `RAY`, `mulDiv` from `@/app/lib/credit-engine`). New pure pricing functions live in
`app/lib/prices/` (unit-tested in the `test` CI job). Convex integration tests use
`convexTest(schema, import.meta.glob(...))` with `edge-runtime` and `vi.stubGlobal("fetch", …)`
(templates: `convex/borrow-solvency-lp-price.test.ts`, `convex/__tests__/prices-internal.test.ts`).

### Phase 0 — Determinism safety net (required by D3: delete the static map)

**C0. Test-only deterministic price fixture** *(D3 consequence)*
- Test: `app/lib/prices/__tests__/test-mode-prices.test.ts` — under `test-mode`/audit mode the
  price context resolves a fixed fixture (the values the deleted map used to guarantee); in a
  normal build the fixture is absent and prices come only from Convex; the fixture is never a
  silent production default (unknown symbol still → `unavailable`).
- Impl: a `TEST_PRICE_FIXTURE` gated behind `NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE`/audit flags, injected
  into the price context; convex integration tests seed `tokenPrices` via `t.run(...)`. This is
  what lets `e2e-smoke` (no Convex/SIWE) keep passing once the static map is gone. Land C0 BEFORE
  deleting the map in C3.

### Phase 1 — Make the Convex oracle the single canonical basis

**C1. Canonical price record: add chain/contract/status/timestamps** *(D3)*
- Test: `convex/__tests__/prices-record.test.ts` — a stored price row carries `chainId`,
  `contractAddress`, `symbol`, `priceUsd`, `source`, `sourceUpdatedAt`, `fetchedAt`,
  `snapshotAt`, `status`; identity is `(chainId, contractAddress)` not symbol-only.
- Impl: extend `tokenPrices` schema (`schema.ts:605`), parse `llamaId` into chain+contract in
  `refreshPrices`, add a `by_chain_contract` index, populate the new fields.

**C2. Status + freshness thresholds (10-min refresh)** *(req §2)*
- Test: `prices-freshness.test.ts` — `status ∈ {fresh, stale, invalid}` from age vs thresholds
  (refresh 10m, stale 20m, invalid 30–60m); a failed refresh keeps rows and flips `fresh→stale`
  (never stale-as-fresh); partial refresh is only as fresh as its stalest token.
- Impl: constants (`REFRESH 10m / STALE 20m / INVALID 30-60m`), compute/store `status`, cron →
  `{ minutes: 10 }` (`crons.ts:24`).

**C3. Convex is the sole basis; DELETE the static maps** *(D3, req §1)*
- Test: `app/lib/prices/__tests__/canonical-source.test.ts` — the canonical reader returns the
  Convex value + status; unknown/unpriced/stale → `unavailable` (NEVER `$1`); no import of a
  static production price map survives (grep guard in the test).
- Impl: `canonical.ts` reads only from the Convex price context/hydration; **delete**
  `SANDBOX_BASELINE_PRICES_USD` + `sandboxBaselinePriceUsd` (`sandbox-baseline-prices.ts`),
  `SANDBOX_TOKEN_PRICE_USD` (`onboarding.ts:68`), and the `umbrella.ts:30-78` copy; onboarding
  claim-gate and umbrella markets read `tokenPrices` from Convex. Depends on **C0** for
  test/e2e determinism.

**C4. Wire freshness into the UI; delete dead hooks or connect them** *(req §2)*
- Test: component test asserting a "prices may be stale" affordance renders when status≠fresh.
- Impl: connect `usePriceFreshness`/`usePriceFor` to real consumers (borrow list, detail tile,
  charts) or remove them; ensure stale values are *visibly* stale.

**C5. Stablecoin depeg + unavailable-over-wrong** *(req §9, §3)*
- Test: `app/lib/prices/__tests__/stablecoin-depeg.test.ts` — with USDT=0.999 / DAI=1.001 /
  GHO=0.998, pair prices, LP prices, borrow totals reflect the deviation; an unpriced leg yields
  `unavailable`, never a fabricated number.
- Impl: remove hard `=1`; source stables from the oracle like any token.

### Phase 2 — LP collateral valuation `Σ(weightᵢ × priceᵢ)` *(req §5, §6, §15 — core)*

**C6. Pool composition + weights data model (2/3/4+ tokens)**
- Test: `app/lib/prices/__tests__/pool-weights.test.ts` — every catalog pool has
  `constituents: {symbol, weightBps}[]` with `Σ weightBps === 10000`; 3-token & 80/20 pools are
  real composition (not `name` strings); 2/3/4-token shapes representable.
- Impl: add `constituents` to `PoolSeed`/`BorrowPoolRow` (`borrow-sim.ts:726,86`) and
  `pools`/`markets` schema; author real weights for `POOL_SEEDS` (`borrow-sim.ts:751-839`),
  converting the string-encoded 3-token (`DAI / USDC / USDT`, `USDC / WBTC / ETH`, …) and 80/20
  (`80/20 WETH/AAVE`, …) pools.

**C7. Pure `lpTokenPriceUsd(constituents, prices) = Σ wᵢ·pᵢ`** *(the required tests)*
- Test: `app/lib/prices/__tests__/lp-token-price.test.ts` — the four spec fixtures:
  stable USDC=1/USDT=0.999 50/50 → 0.9995 (×12000 → 11994); volatile ETH=1900/USDC=1 50/50 →
  950.50; 3-asset equal-weight (ETH+GHO+WBTC)/3; weighted ETH/LDO/GHO 50/25/25. Plus: 2/3/4-token,
  weights≠100% → throws, any leg unpriced → `unavailable` (no partial number), zero amount → 0,
  negative amount → rejected, decimal handling (bigint).
- Impl: new pure function in `app/lib/prices/lp-token-price.ts`.

**C8. Replace the `/2.5` heuristic everywhere; enforce single-source parity** *(req §6)*
- Test: `pool-lp-price-parity.test.ts` — seed `markets.priceUsd` == engine `lpTokenPriceUsd6` for
  the same pool; LP value moves with its components (WBTC/ETH ≫ stable/stable); the old
  `collateralExampleUsd/2.5` path is gone.
- Impl: `poolLpTokenPriceUsd` (`borrow-sim.ts:101`) delegates to C7 using constituents+canonical
  prices; update `mock.ts:146,176`, `build-seed.ts:534`; delete `collateralExampleUsd/2.5`
  and (if now unused) `collateralExampleUsd` itself.

**C9. Refresh `lpTokenPrices` from a job (derived from token prices × weights)** *(req §2)*
- Test: `convex/__tests__/lp-prices-refresh.test.ts` — a scheduled action recomputes each pool's
  LP price from current `tokenPrices` × weights, writes `lpTokenPrices` with status; server
  solvency reads the derived LP price; a stale/unavailable leg marks the LP price unavailable.
- Impl: implement a caller for `wallet/lpTokenPrices.upsertPrices` (currently dead); add to the
  10-min cron; `transactions.ts:523` / `liquidation.ts:68` read the refreshed value.

**C10. SuppliedUSD end-to-end + weight-aware exposure** *(req §5)*
- Test: extend `credit-engine/__tests__/valuation.test.ts` — `SuppliedUSD = SuppliedLPAmount ×
  LPPriceUSD` with the new prices; `exposure-aggregator` splits by real weights, not 50/50.
- Impl: replace the 50/50 split in `exposure-aggregator.ts:52-62` and
  `portfolio-exposure-by-asset.tsx` with constituent weights.

### Phase 3 — Coherent snapshots + current/history *(req §8, §11, §12)*

**C11. Coherent market-snapshot bundle from one price snapshot**
- Test: `convex/__tests__/market-snapshot-bundle.test.ts` — a snapshot stores `underlyingPrices[]`,
  `lpWeights`, `lpPriceUsd`, `suppliedLpAmount`, `suppliedUsd`, `borrowedAssets[]`,
  `totalBorrowedUsd`, `status`, and `lpPriceUsd === Σ(weight×underlyingPrice)` within the bundle
  (no cross-source drift); `status` propagates from the stalest input.
- Impl: extend the snapshot schema + `computeMarketSnapshots` (`markets.ts:216-262`) to bundle
  from one price read.

**C12. Current vs historical separation for prices/snapshots**
- Test: current queries read the current bundle; chart queries read history; a stale current
  bundle is flagged, never silently shown as live.
- Impl: add `tokenPricesHistory` (or document the derived model) and a
  `marketSnapshotsCurrent`/`…History` split mirroring the portfolio pattern (`schema.ts:1392-1413`).

### Phase 4 — Accounting corrections *(req §7, lend/multiply)*

**C13. Borrowed asset = amount × current token price** *(D2, req §7)*
- Test: `borrow-valuation.test.ts` — 2 WBTC + 8000 USDC → `2×WBTC + 8000×USDC` at current prices;
  `TotalBorrowedUSD = Σ`; debt is never LP-valued; a depegged borrowed stable moves the total.
- Impl: reprice debt notional by current token price on revaluation (`valuation.ts`,
  `transactions.ts` solvency), preserving interest accrual.

**C14. Lend Convex-hydration fixes** *(found defects)*
- Test: `lend-system/__tests__/hydration-units.test.ts` — for a non-$1 asset (ETH),
  `principalAmount`/`interestEarned` are token amounts (not USD), and `rewardsEarnedUsd` survives
  hydration; an external reward token is valued at *its own* price (`RewardUSD = amount ×
  rewardTokenPrice`).
- Impl: fix `use-lend-session.ts:277,281-282,310` (`interestEarned = earnedUsd/price`,
  `principalAmount = supplied − earnedUsd/price`, stop hardcoding `rewardsEarnedUsd:0`); add
  external-reward-token valuation.

**C15. Multiply guards: stale-oracle block + hard deleverage HF** *(multiply gaps)*
- Test: `multiply-engine/__tests__/guards.test.ts` — a stale/aged oracle price blocks open/adjust;
  partial unwind is *hard-blocked* (not warn-only) below min HF; USDC depeg lowers HF; insufficient
  liquidity and slippage-over-limit hard-block.
- Impl: add oracle-age guard (`validation.ts`, `simulation.ts:81-84`); make
  `validateDeleverageAction` (`validation.ts:113-115`) return `allowed:false` below min HF.

### Phase 5 — Fiat *(req §10)*

**C16. Locale-aware `Intl.NumberFormat` currency formatter**
- Test: `currency/__tests__/intl-format.test.ts` — per-locale grouping and symbol placement
  (e.g. `1.234,56 €` / `€1,234.56`), zero-decimal currencies (JPY/KRW/…), negatives; replaces
  the `redenominateCompactUsd` regex path.
- Impl: single `formatCurrency(amountUsd, currency, locale)` on `Intl.NumberFormat({style:
  "currency"})`; migrate the ~16 `$`-baking sites to convert from raw USD numbers.

**C17. FX through the validated Convex layer**
- Test: `convex/__tests__/fx-rates.test.ts` — an action fetches+validates FX, writes an `fxRates`
  table with `status`+timestamps; client reads from Convex; stale FX is visibly stale; USD forced
  to 1.
- Impl: `fxRates` table + refresh action + 10-min cron; `exchange-rates.ts` reads Convex;
  surface staleness in `display-preferences`.

### Phase 6 — Decimal hardening *(req §14)*

**C18. Bigint server valuation; kill float seams**
- Test: `convex/__tests__/valuation-precision.test.ts` — large-notional LP collateral values match
  the bigint oracle within ≤1 unit; no `Number(raw)/1e18` in solvency/liquidation.
- Impl: convert `transactions.ts:528` / `liquidation.ts:73` to `mulDiv` bigint; replace magic
  `10n**27n`/`10n**18n` with `RAY`/`WAD` (`persistence.ts:234,241`).

### Phase 7 — Cleanup + full UI verification *(req §13, §16)*

**C19. Remove/relabel remaining live-looking fake constants** *(D1)*
- Ensure no simulated TVL/liquidity is presented as a live feed; `unavailable` beats a wrong
  number everywhere; grep sweep from §13 comes back clean of production-facing fakes.

**C20. Production-like build + manual UI matrix** *(req §16)*
- `npm run build` + serve; walk every action (dashboard, pool/asset/market pages, connect/switch
  wallet, switch network, switch fiat, supply/withdraw LP collateral, borrow/repay, add/remove
  collateral, approve, tx preview/submit/success/failure, insufficient balance, stale price,
  unavailable price, charts, tables, sort, filter, dialogs, refresh) across desktop/tablet/mobile
  and every supported locale. Verify the 14-point checklist in the requirement per flow.

---

## 5. What is already correct (do not regress)

- DefiLlama oracle validation & failed-refresh safety (`prices.ts:174-201`).
- Bigint fixed-point credit engine (`credit-engine/units.ts`, `valuation.ts`, `actions.ts`).
- Debt is never LP-priced; supply/borrow accounting is separated.
- Multiply leverage/HF/equity formulas; slider targets leverage; supply vs borrow APY tracked
  separately; HF hard-gated on open.
- Lend principal vs rewards separation (in the pure sim); withdrawal split.
- `portfolioCurrent`/`portfolioSnapshots` current/history pattern (reuse it for prices/markets).
- Existing test suite + fixtures/builders (reuse as templates).
