# Avana — Consolidated Audit (Pass 1 + fresh-eyes replication)

_Date: 2026-08-17. Two independent audit rounds per workstream. Pass 1 used docs + memory;
the fresh round was barred from docs/, memory, and any audit file, reaching conclusions from
code alone. This file records the comparison and the consolidated test-driven commit plan.
Pass 1 detail: `audit-2026-08-17-pass1.md`._

## Did the two rounds match?

**Yes on every root cause; the re-run added depth and corrected two over-generous "positives."**

### Performance — converged hard

Both rounds independently named the SAME single root cause: the six `use*Session()` hooks return
**unmemoized object literals** (`use-borrow-session.ts:476`, `use-lend-session.ts:399`, +4), so the
one `AvanaSessionsProvider` hands new identities to all 8 product contexts on every render,
defeating the deliberate split-context isolation. The 30s lend accrual tick
(`use-lend-session.ts:233`) is the app-wide trigger; ~39 consumers re-render, including the
1357-line borrow page and 957-line dashboard.

- Both: defer the returning-user wallet mount (`wallet-gate.tsx:70-78`).
- **Diverged:** pass 1 flagged the Hugeicons barrel as MED; fresh round didn't. Verified: it IS a
  single barrel (~76 icons → 42 files) and `@hugeicons/*` is absent from `optimizePackageImports`
  (`next.config.mjs:132`) — but bundlers can tree-shake named re-exports, so impact is unproven.
  Resolution: **measure-first**, behind a bundle analyzer.
- **Net-new (fresh):** duplicate `getWalletOnboardingState` (3×) / `getPortfolio` (2×)
  subscriptions — LOW.

### Pricing — converged on the core, re-run went deeper

Both: two disconnected price universes (seeded `SANDBOX_BASELINE_PRICES_USD` vs live DefiLlama
oracle), never reconciled → same token shows different USD on borrow list (live) vs detail tile
(baseline $1,934). Both: oracle ingestion accepts NaN/0/neg (`convex/prices.ts:163`); symbol-only
keying; mock price literals; stablecoin/EURC inconsistency.

- **Correction (fresh, verified):** pass 1 called price **freshness** a "positive, no action" —
  but `usePriceFreshness` has **zero production consumers** (only its own definition). Stale CAN
  render as live with no indicator. Now a HIGH commit (C3).
- **Correction (fresh, verified):** pass 1 said decimals are "handled correctly and centrally" —
  but the credit engine uses **flat `TOKEN_DECIMALS = 18`** (`credit-engine/units.ts:2`) for every
  token. Fine for the sim (enter-as-decimal, same scale in/out); NOT decimal-safe at a real
  on-chain integer boundary. Noted, deferred to real-integration.
- **Net-new (fresh):** a THIRD price copy — engine valuation runs on seeded `priceUsd6`
  (`credit-engine/valuation.ts:12`), not the tile baseline or the oracle, with nothing enforcing
  seed == baseline → the health factor a user acts on can be computed at a price shown nowhere
  (C4). Also: swap catalog duplicates baseline as raw literals (`swap-system/catalog.ts`, drift
  risk); `formatOraclePrice` uses locale-dependent grouping that can break the currency switcher
  (`borrow-detail/formatters.ts:8`).

### Localization — near-identical, fresh round richer on specifics

Both measured the SAME per-locale gaps (ar/hi/tr 119, id/ko/nl/ru 114, de 75, fr/ja/pt 70, es 8,
zh 5; union 1,179) and the SAME root cause: ~163 in-code `t()` keys absent from all 13 locales
(entire Swap surface, dashboard/borrow-detail sections, narration), and the i18n tests are
curated-list based with **no code-derived parity gate**.

- **Net-new (fresh):** specific ES accent errors beyond pass 1 — `Liquidacion`→Liquidación,
  `Accion`→Acción, `Posicion`→Posición, `segun`→según, `transaccion`→transacción (~12 sites in
  `es.ts`); plus hardcoded `<span>Select Asset</span>` (`home-swap-action.tsx:464`) despite the key
  existing, and English `global-error.tsx:38`.
- Both: "Multiply" translated two incompatible ways (literal vs "leverage"); Cooldown half-loaned;
  symbols/brands correctly untranslated.

**Net effect of the re-run:** no root cause overturned; confidence raised (independent convergence);
three material additions in pricing (unwired freshness, third price copy, engine decimals) and
sharper localization specifics. The consolidated plan below folds them in.

---

# Consolidated Test-Driven, Commit-by-Commit TODO List

Each commit: **① failing test → ② make it pass → ③ verify** (`npm test` + `tsc` + build; CI gate is
`format:check → security:check → lint → tsc → vitest`). Tags: [C2] confirmed by both rounds
(high confidence), [NEW] surfaced only by the re-run, [DEC] needs a product decision.

## Track A — Performance

- **A1 · Memoize the 6 session-hook returns** [C2, CRITICAL]
  ① `avana-session/__tests__/session-render-isolation.test.tsx`: force a lend-state change (and a
  simulated 30s tick), assert a borrow-context consumer does NOT re-render and each hook return is
  referentially stable when its inputs are unchanged.
  ② `useMemo` the top-level `return {…}` in use-borrow/lend/multiply/swap/rewards/umbrella-session
  (internals already memoized). ③ test + build. _Fixes the cascade AND the lend-tick blast radius._
- **A2 · Defer returning-user wallet mount to idle** [C2, MED]
  ① `wallet-gate.test.tsx`: with a persisted SIWE token, `activate()` not called sync on mount, is
  called after a mocked `requestIdleCallback`. ② wrap `activate()` (`wallet-gate.tsx:70-78`).
- **A3 · Wire `@next/bundle-analyzer`** [tooling] — dev dep + `ANALYZE=1 analyze` script; record baseline.
- **A4 · Add `@hugeicons/*` to `optimizePackageImports`** [measure-first] — behind A3; keep only if the
  analyzer shows a real first-load drop. ① config guard test.
- **A5 · `React.memo` heavy table rows** [pass1, LOW-MED] — only if profiling after A1 still shows row
  cost. ① row render-count test. ② memoize rows in borrowable-assets/collateral-pools/explore-loops.
- **A6 · Consolidate duplicate onboarding/portfolio subscriptions** [NEW, LOW] — one shared hook for
  `getWalletOnboardingState`/`getPortfolio`. ① test asserting single subscription source.

## Track B — Localization

- **B1 · Code-derived key-parity gate** [C2, CRITICAL — do first]
  ① `i18n/__tests__/key-parity-from-source.test.ts`: extract every `t("…")` literal from
  app/+components/, assert each resolves in all 13 locales; seed a `KNOWN_UNTRANSLATED` allowlist
  with the current ~163+partial gaps so it passes now. Each later commit deletes its entries.
  ③ wired into `test` job; CI now fails on any new untranslated key.
- **B2 · Backfill the Swap/Express surface** [C2, HIGH] — all swap keys × 13; remove from allowlist.
- **B3 · Backfill transaction narration into the 11 missing locales** [C2, HIGH]
  (`processing-narration.tsx`).
- **B4 · Backfill dashboard + borrow-detail labels** [C2, HIGH] — Your position / Your Portfolio /
  Key Statistics / Collateral Factor / Fees Paid / Net-Portfolio tooltip.
- **B5 · Fix wrapped-but-English + hardcoded strings** [C2+NEW, MED] — 2 borrow-gate value==English;
  `<span>Select Asset</span>` (home-swap-action.tsx:464); `global-error.tsx:38`.
- **B6 · Spanish accents + guard** [NEW, MED] — restore Liquidación/Acción/Posición/según/transacción
  (~12 sites, es.ts); add a lint/test flagging bare `cion\b`/`segun`/`mas` in es.ts.
- **B7 · Terminology glossary test** [C2, MED, DEC] — canonical term per concept per locale
  (Multiply, Cooldown, Collateral, Swap, Slippage, Yield, Vault, Approve, Gas Fee). Needs the
  Multiply-vs-Leverage decision.
- **B8 · Nav/CTA overflow verification** [C2, LOW] — Playwright width/visual at 1280px + 375px for
  DE/RU/ES/PT on the primary nav and fixed-width CTAs (Supply/Repay/Claim/Stake/Unstake); add a
  visible scroll/fade affordance or truncate-with-tooltip where it clips.

## Track C — Pricing

- **C1 · Harden oracle ingestion** [C2, clean bug — do first]
  ① feed NaN/0/-5/low-confidence into `refreshPrices` → assert rejected, not stored.
  ② drop `!Number.isFinite(price) || price <= 0` and sub-threshold `confidence` (`convex/prices.ts:163`).
- **C2 · Fix borrow-list token-quantity mixing** [C2, genuine defect]
  ① assert displayed qty = USD / canonical-catalog-price (self-consistent), not USD / liveOracle.
  ② `borrowable-assets-table.tsx:336,:346` divide by the same price used to build the USD figure.
- **C3 · Wire staleness into the live-price UI** [NEW, HIGH — addresses "never show stale as live"]
  ① assert that when the oracle snapshot age > `PRICE_STALE_AFTER_MS`, the borrow-list/pool surfaces
  expose a stale state (indicator or fallback to the static subtitle). ② consume `usePriceFreshness()`
  wherever `usePriceFor()` renders a live price.
- **C4 · Enforce seed `priceUsd6` == baseline** [NEW, HIGH — the third-copy drift trap]
  ① test asserting every seeded per-market `priceUsd6` equals `SANDBOX_BASELINE_PRICES_USD` for its
  symbol (reuse `convex/borrow-solvency-lp-price.test.ts` harness). ② derive the seed from the
  baseline at seed time so engine valuation and displayed price cannot diverge.
- **C5 · One canonical price basis; import the swap catalog from baseline** [C2+NEW, HIGH, DEC]
  ① oracle-vs-baseline deviation stays within a tolerance band; list-price == detail-tile-price for
  the same asset; swap catalog values == baseline lookups. ② replace swap-catalog literals with
  `SANDBOX_BASELINE_PRICES_USD` lookups (as multiply-system/catalog.ts already does); choose per
  surface whether the shown number is the deterministic baseline or the live oracle. _Needs the
  source-of-truth decision; depends on C4._
- **C6 · Anchor chart + align mock/convex tiles** [C2, MED] — chart terminal/base per-symbol from the
  canonical source; align mock vs convex detail tiles; derive `pool.mock.ts:466` pairReferencePrice
  (3450) from baseline. ① ETH chart terminal == canonical; mock tile == convex tile.
- **C7 · Force `en-US` in `formatOraclePrice`** [NEW, LOW] — ① a ≥$100 pool price re-denominates in a
  non-USD currency under a non-en-US render locale. ② match `formatTokenPrice`'s `"en-US"`.
- **C8 · Robustness (defer, sandbox-acceptable)** [LOW] — key prices by `chainId:address`; thread
  per-asset decimals into the engine before any real on-chain integration (flat-18 today); decide a
  uniform stablecoin/EURC depeg policy across both universes.

## Open decisions (block C5 and B7 only)

1. **Pricing source-of-truth** — generate baseline from oracle (recommended) / everything live / keep
   the split and only fix mixing.
2. **"Multiply" vs local "Leverage"** term across locales.

## Recommended execution order

A1 → C1 → B1 (three independent quick wins, high confidence) → C4 → C3 → C2 → B2–B4 → the rest.
