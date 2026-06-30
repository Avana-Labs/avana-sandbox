# Phase 2 — mock → seed-only audit (§7)

Inventory of every place the app still produces data from in-browser mock/static
sources instead of reading Convex, with the migration status and the concrete action
to reach the "NO mock data" verification gate (§8). Status legend:

- ✅ **Convex** — reads from Convex (possibly overlaying a static base).
- 🟡 **Hybrid** — Convex overlays numbers onto a static catalog/identity.
- 🔴 **Mock** — still 100% in-browser/static; must move to Convex.

## Default data-source mode

`AVANA_DATA_SOURCE` is unset → `resolveDataSourceMode()` returns `"mock"`, so list/
dashboard pages render mock by default. The `"live"` sources for portfolio + rewards
are unimplemented stubs (`livePortfolioPageSource` / `liveRewardsPageSource` throw
`createUnsupportedSourceError`). **Flipping `AVANA_DATA_SOURCE=live` today would break
those pages** — the live sources must be implemented (Convex-backed) first.

## Surfaces

| Surface | Source today | Status | Action to close the gate |
|---|---|---|---|
| Borrow/Lend/Multiply **list numbers** (supplied/borrowed/util/apy/price) | Convex `listMarketSnapshots` overlaid on `*-sim.ts` | 🟡 | Acceptable (numbers are Convex). Full removal = seed the catalog identities into `markets`/`marketContent` and read them instead of building from `*-sim.ts`. |
| **Catalog identities/spokes/copy/icons** | `borrow-sim.ts`, `home-sim.ts`, `multiply-sim.ts`, `shared/lend/asset-groups.ts` | 🔴 | Seed `markets` + `marketContent` fully; read catalog from Convex. |
| Lend list **row → detail link** | — | ✅ (§8a) | Done — rows/cards navigate to `/lend/markets/[marketId]`. |
| Borrow/Lend/Multiply **detail pages** (markets) | `*FromConvex` builders w/ per-section mock fallback | 🟡 | Strict mode: assert every section resolves from Convex so the fallback is dead. |
| Legacy detail routes `/borrow/asset/[assetId]`, `/borrow/pool/[poolId]` | `getAssetDetail`/`getPoolDetail` — pure mock, no Convex | 🔴 | Confirm still linked; migrate to the Convex-hydrated `/borrow/(assets|markets)/[id]` or remove. |
| **Dashboard / portfolio** (snapshots/supplies/debts/collaterals/multiply/orders/activity/strategies/rewards) | `app/lib/data/mock/wallet/portfolio/*`, all tagged `demo-wallet`; `livePortfolioPageSource` throws | 🔴 | Implement a Convex `PortfolioPageSource` reading the new `positions`/`portfolioSnapshots`/`transactions` tables (scoped by the authed wallet). §2 already seeds a starter position + snapshot at claim. |
| Dashboard residual mock even with a session | `strategyBuckets` always static; `getWalletLendAssets` balance fallback | 🔴 | Move strategy buckets to a Convex table (global catalog) and lend balances to `positions`. |
| **Rewards** quest board | client `rewards-engine/catalog.ts` over localStorage events | 🔴 | Seed the task catalog into Convex; make claim/progress wallet-scoped + server-authoritative (the `sandboxEconomy` cap pattern is the precedent). |
| Rewards `rewardPools` | derived from `BORROW_POOL_CATALOG` (mock) | 🔴 | Source from a rewards Convex table. |
| **Per-wallet sandbox state** (borrow/lend/multiply/rewards sessions) | `*-system/storage.ts` localStorage, keyed by walletId | 🟡 | §2 added `positions`/`transactions`; §5 persists on execute (best-effort). Full cutover = UI subscribes to Convex; drop localStorage for authed wallets. |
| **Wallet identity** | §3 — authed SIWE wallet drives the client session | ✅ | Done client-side. SSR pages still resolve `demo-wallet` (server can't see the client wallet) — move portfolio SSR to a Convex source keyed by the JWT identity. |
| **Token prices** | Convex `tokenPrices` (DefiLlama cron) | ✅ | Done (basket pricing now reads it too). |
| **Market liquidity** | Convex `marketLiquidityDeltas` | ✅ | Done; §2 routes deltas through the owner-verified `recordTransaction`. |

## Hardening: world-writable seed writers (recommended follow-up)

`convex/seed.ts` (`upsertMarkets`/`upsertDailyStats`/`upsertRevenue`/`upsertRisk`/
`upsertAllocation`/`upsertContent`/`clearWalletEvents`/`insertWalletEvents`) and
`convex/prices.ts` (`upsertPrices`) are exported as **public `mutation`** — any client
can write the market-data layer. They are intended for the seed pipeline only.

Why not converted in this branch: `scripts/seed-convex.ts` calls them as public
mutations via `ConvexHttpClient`, which can only invoke public functions. Converting to
`internalMutation` without refactoring the script would break seeding (untestable here
against a deployment).

Two ready options (pick one in the cutover):

1. **internal + run** — convert the writers to `internalMutation`/`internalAction` and
   drive the seed via `npx convex run` (admin credentials can invoke internal
   functions), replacing the `ConvexHttpClient` path in `scripts/seed-convex.ts`.
2. **admin-secret guard** — keep them public but require a `seedSecret` arg matching a
   `SEED_SECRET` Convex env var (allow when unset, for local dev); pass the secret from
   the seed script. Non-breaking for local, closes the public-write hole in prod.

## Seeding the new §1 tables

`positions`/`portfolioSnapshots`/`transactions` are populated from live user actions
(claim seeds a starter set; subsequent actions append). `pools` needs a deterministic
seed mirroring `PortfolioPoolRecord` (the ETH/USDC, WBTC/WETH, USDC/USDT pools) — add an
idempotent upsert keyed by `slug`, following the existing `seed.ts` upsert pattern.
