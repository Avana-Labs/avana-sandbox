# Phase 2 — mock → seed-only audit (§7)

Inventory of every place the app still produces data from in-browser mock/static
sources instead of reading Convex, with the migration status and the concrete action
to reach the "NO mock data" verification gate (§8). Status legend:

- ✅ **Convex** — reads from Convex (possibly overlaying a static base).
- 🟡 **Hybrid** — Convex overlays numbers onto a static catalog/identity.
- 🔴 **Mock** — still 100% in-browser/static; must move to Convex.

## Default data-source mode

`AVANA_DATA_SOURCE` is unset → `resolveDataSourceMode()` returns `"live"`.
`AVANA_DATA_SOURCE=mock` is now the only way to enable deterministic demo providers.
Portfolio and Rewards have authenticated Convex implementations. Borrow, Lend and
Multiply live providers require non-empty Convex snapshots and no longer fall back to
mock providers when Convex is unavailable.

## Surfaces

| Surface | Source today | Status | Action to close the gate |
|---|---|---|---|
| Borrow/Lend/Multiply **list numbers** (supplied/borrowed/util/apy/price) | Convex `listMarketSnapshots` overlaid on `*-sim.ts` | 🟡 | Acceptable (numbers are Convex). Full removal = seed the catalog identities into `markets`/`marketContent` and read them instead of building from `*-sim.ts`. |
| **Catalog identities/spokes/copy/icons** | `borrow-sim.ts`, `home-sim.ts`, `multiply-sim.ts`, `shared/lend/asset-groups.ts` | 🔴 | Seed `markets` + `marketContent` fully; read catalog from Convex. |
| Lend list **row → detail link** | — | ✅ (§8a) | Done — rows/cards navigate to `/lend/markets/[marketId]`. |
| Borrow/Lend/Multiply **detail pages** (markets) | `*FromConvex` builders w/ per-section mock fallback | 🟡 | Strict mode: assert every section resolves from Convex so the fallback is dead. |
| Legacy detail routes `/borrow/asset/[assetId]`, `/borrow/pool/[poolId]` | `getAssetDetail`/`getPoolDetail` — pure mock, no Convex | 🔴 | Confirm still linked; migrate to the Convex-hydrated `/borrow/(assets|markets)/[id]` or remove. |
| **Dashboard / portfolio** (snapshots/supplies/debts/collaterals/multiply/orders/activity/strategies/rewards) | authenticated Convex `positions`/`portfolioSnapshots`/`transactions`; explicit mock provider remains for demo/tests | ✅ | Remaining static strategy buckets should become a global Convex catalog. |
| Dashboard residual mock even with a session | `strategyBuckets` always static; `getWalletLendAssets` balance fallback | 🔴 | Move strategy buckets to a Convex table (global catalog) and lend balances to `positions`. |
| **Rewards** quest board | wallet state persists in Convex; task definitions remain a TypeScript catalog | 🟡 | Seed task definitions and normalize wallet progress/claims instead of storing the session JSON blob. |
| Rewards `rewardPools` | derived from `BORROW_POOL_CATALOG` (mock) | 🔴 | Source from a rewards Convex table. |
| **Per-wallet sandbox state** (borrow/lend/multiply/rewards sessions) | authenticated sessions subscribe to Convex; localStorage is explicit demo mode only | ✅ | Keep regression coverage preventing authenticated storage access. |
| **Wallet identity** | §3 — authed SIWE wallet drives the client session | ✅ | Done client-side. SSR pages still resolve `demo-wallet` (server can't see the client wallet) — move portfolio SSR to a Convex source keyed by the JWT identity. |
| **Token prices** | Convex `tokenPrices` (DefiLlama cron) | ✅ | Done (basket pricing now reads it too). |
| **Market liquidity** | Convex `marketLiquidityDeltas` | ✅ | Done; §2 routes deltas through the owner-verified `recordTransaction`. |

## Hardening: world-writable seed writers (recommended follow-up)

`convex/seed.ts` and `prices.upsertPrices` now use `internalMutation`. The seed script
calls `convex/seedAdmin.ts`, whose public actions require `CONVEX_SEED_SECRET` before
invoking those internal functions. An unset or incorrect secret is rejected in local
and production deployments.

## Seeding the new §1 tables

`positions`/`portfolioSnapshots`/`transactions` are populated from live user actions
(claim seeds a starter set; subsequent actions append). `pools` needs a deterministic
seed mirroring `PortfolioPoolRecord` (the ETH/USDC, WBTC/WETH, USDC/USDT pools) — add an
idempotent upsert keyed by `slug`, following the existing `seed.ts` upsert pattern.
