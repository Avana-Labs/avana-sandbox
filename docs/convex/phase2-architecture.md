# Phase 2 — architecture note (Convex-backed, wallet-scoped sandbox)

Companion to [`phase2-sandbox.md`](./phase2-sandbox.md). This note records the design
**as built** in the `convex-sandbox-phase2` branch: the data model, the auth/identity
model, the transaction-adapter seam, and the gating UI. It is the reference for the
remaining cutover and the hand-off (§10).

## The one rule

**Convex is the source of truth for SANDBOX state only.** Every number persisted here
is synthetic. In production, truth comes from contracts + indexed on-chain data, and
the Credit/Lend/Multiply engines stay simulation/analytics only. Nothing in phase 2
performs a real contract write or talks to an indexer.

## Data flow (target)

```
Wallet connect (ConnectKit/wagmi) → SIWE sign-in → JWT → Convex ctx.auth
  → SandboxGate reads getState(wallet)  ──► locked shell + onboarding flow until "done"
  → UI action box → SandboxTransactionAdapter
      · previewTransaction → Credit Engine simulation (pure, client-side, no writes)
      · executeTransaction → Convex mutation (recordTransaction): owner-verified,
        idempotent, rate-limited → persists wallet-scoped state + synthetic receipt
        + folds the delta onto the shared marketLiquidityDeltas ledger
  → UI reads wallet-scoped state from Convex (reactive)
```

## Identity & auth

- The SIWE→JWT bridge (shipped in 3A) is the sole issuer: `app/lib/siwe/*`,
  `app/api/siwe/{nonce,verify,jwks,openid-configuration}`, registered in
  `convex/auth.config.ts`. `ConvexProviderWithAuth` attaches the JWT.
- Server derives the wallet from `ctx.auth` (`convex/sandbox/auth.ts`
  `getAuthedWallet` = `identity.wallet ?? identity.subject`, lowercased) and **never
  trusts a client-passed wallet** — every wallet-scoped function calls
  `requireSandboxWallet(ctx, wallet)` first.
- **§3 change**: the *client* session walletId now comes from the authed wallet.
  `AvanaSessionProviders` reads `useSiweAuth()`; a signed-in SIWE wallet drives the
  whole session (`resolveWalletIdentity` treats a non-profile id as a raw address).
  Not signed in → the onboarding gate remains locked. `AutoSiwe` auto-prompts sign-in
  once per newly connected address.
- Issuer config must agree across three places or Convex JWT verification silently
  fails: `SIWE_JWT_ISSUER` (Convex), `NEXT_PUBLIC_SIWE_ISSUER` (Next), and the token
  `iss`. JWT is **RS256** (`SIWE_JWT_PRIVATE_JWK` must be RSA).

## Schema (§1)

Fixed-point encoding contract: engine money/rates are bigint `usd6`/`WAD`/`RAY`. Convex
has no bigint and `RAY` (1e27) overflows JS `Number`, so every fixed-point field is a
**decimal integer string** (same lossless form as `app/lib/borrow-system/codec.ts`).
Multiply is number-native and stays numbers. Nullable rates use `v.union(<string>,
v.null())`; the multiply health factor keeps its `"infinity"` literal.

| Table | Purpose | Key indexes |
|---|---|---|
| `pools` | pledgeable LP-pair catalog (mirrors `PortfolioPoolRecord`) | `by_slug` |
| `positions` | unified open/closed position, `product` discriminator (borrow/multiply/lend) | `by_wallet`, `by_wallet_product`, `by_wallet_market` |
| `positionCollateral` | borrow collateral leg (`UserCollateralPosition`) | `by_wallet`, `by_position` |
| `positionDebt` | borrow debt leg (`UserDebtPosition`, share/index) | `by_wallet`, `by_position` |
| `transactions` | per-wallet ledger, ONE row per balance change | `by_wallet_at`, `by_wallet_intent`, `by_market_at` |
| `riskSnapshots` | append-only, **spoke-scoped** health history | `by_wallet_at` |
| `liquidationPreviews` | analytics-only preview audit | `by_wallet_at` |
| `liquidationActions` | recorded liquidations (liquidator↔victim) | `by_wallet_at`, `by_liquidator_at` |
| `portfolioSnapshots` | append-only portfolio time series (`PortfolioSnapshotRecord`) | `by_wallet_at` |
| `sandboxSessions` | per-wallet seed/last-seen metadata | `by_wallet` |

(Existing phase-1/3A tables — `markets`, `marketDailyStats`, `marketRevenueDaily`,
`assetPoolAllocationDaily`, `riskAssessments`, `marketLiquidityDeltas`, `tokenPrices`,
`marketContent`, `sandboxEconomy`, `sandboxConfig`, `sandboxProfiles`,
`sandboxActivity` — are unchanged except `sandboxProfiles` already had the X-flow
fields.)

## Server functions (§2)

`convex/sandbox/`:

- **onboarding.ts** — `getState` (own wallet only, now also returns
  `economy.perUserTargetUsd`), `startAnalysis` (deterministic tier), `startTweet`
  (→`xPending`), `confirmTweet` (→`xConfirmed`), `claim`. `claim` now:
  enforces caps server-side and seeds a deterministic **$1M starter state**: 12 liquid
  assets, 8 LP collateral positions, 8 lend positions and 6 multiply positions, plus
  their transactions, liquidity deltas and initial portfolio snapshot.
- **transactions.ts** — `recordTransaction` is the single write path for a balance
  change: owner-gated, **idempotent on `intentId`** (`by_wallet_intent`), **hourly
  per-wallet rate limit** (`MAX_TX_PER_HOUR = 200`), upserts the
  `(wallet, product, market)` position, writes one `transactions` row + synthetic
  receipt, and folds the delta onto `marketLiquidityDeltas` (the product-unifying
  ledger, now reached only from an owner-verified mutation). Plus `recordRiskSnapshot`
  and reads `getActivity` / `getPositions` / `getPortfolio` / `getRisk`.
- **liquidation.ts** — `recordLiquidationPreview` (owner-scoped analytics);
  `recordLiquidation` gated on the **liquidator** identity (a keeper acting on a victim
  it does not own — the one place self-only scoping is relaxed, by design);
  `getLiquidations` (as victim + as liquidator).

The mutation does not trust client liquidity deltas. It validates fixed-point amounts,
product/action compatibility, lend balance movement and multiply LTV/multiplier, then
derives aggregate liquidity and the portfolio snapshot from persisted state. Rebuilding
the complete product transition from the intent is the remaining hardening step.

## Gating UI (§4)

`SandboxGate` (mounted in `layout.tsx` around the site chrome) is **fail-closed**.
Unauthenticated users, missing Convex configuration and query/auth errors remain in the
locked onboarding shell. The shell reuses the normal Avana `Header`; protected page
content is released only when Convex returns `onboardingStep === "done"`.

## Transaction adapter (§5)

`previewTransaction` stays pure Credit-Engine simulation. For authenticated sessions,
`executeTransaction` calls the injected Convex persistence port and waits for the
canonical synthetic receipt before committing local React state. Convex query
subscriptions then rehydrate wallet state. Rejected writes leave the browser state
unchanged. `Production*` adapters remain intentional placeholders for future contract
writes.

## Tests (§6)

`convex/*.test.ts` run under `npm test` (convex-test + edge-runtime): onboarding caps
+ X-flow + starter state; recordTransaction ownership/idempotency/rate-limit/ledger;
liquidation; the multi-user harness (capRush / calm+borrowHeavy / liquidationStorm); a
fast-check idempotency+ledger property.
