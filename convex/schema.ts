/**
 * Convex schema — the canonical persistence layer for every number a detail
 * page renders. The frontend never imports mock data once these tables are
 * populated; instead it calls the queries in sibling files (`engagement.ts`,
 * `cashflow.ts`, `markets.ts`, `allocation.ts`) which fold these rows into
 * the view-model shapes declared in `app/lib/borrow-detail/types.ts`.
 *
 * Table naming contract:
 *   - `markets`                     canonical identity for every asset + pool.
 *   - `walletEvents`                source-of-truth user actions (drives engagement + transaction history).
 *   - `marketDailyStats`            daily market snapshot (drives supply/borrow, utilization, key metrics).
 *   - `marketRevenueDaily`          daily revenue (drives cash-flow card).
 *   - `assetPoolAllocationDaily`    daily per-pool allocation per asset (drives allocation breakdown).
 *   - `riskAssessments`             risk rating snapshots.
 *
 * If you change field names here, update the matching JSDoc `@convex-source`
 * pointers in `app/lib/borrow-detail/types.ts` so the data seam stays obvious.
 */

import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

/** Wallet actions that make a user "engaged" with a market. */
export const WALLET_EVENT_KINDS = [
  "supply",
  "withdraw",
  "borrow",
  "repay",
  "liquidation",
  "rewardsClaim",
] as const

const walletEventKind = v.union(
  v.literal("supply"),
  v.literal("withdraw"),
  v.literal("borrow"),
  v.literal("repay"),
  v.literal("liquidation"),
  v.literal("rewardsClaim"),
)

/** Scope differentiates an asset (single token market) from a pool (LP collateral market). */
export const MARKET_SCOPES = ["asset", "pool"] as const
const marketScope = v.union(v.literal("asset"), v.literal("pool"))

/** Risk buckets mirror `RiskLevel` in `app/lib/borrow-detail/types.ts`. */
const riskLevel = v.union(
  v.literal("low"),
  v.literal("moderate"),
  v.literal("elevated"),
  v.literal("high"),
)

export default defineSchema({
  /**
   * Canonical market directory. Every other table fk's against this. The
   * `slug` is what the UI uses in URLs (e.g. `usdc`, `uni-v3-bluechip-weth-usdc`)
   * so the migration from mocks is a straight lookup.
   */
  markets: defineTable({
    scope: marketScope,
    /** URL-safe id. Matches `AssetDetail.id` / `PoolDetail.id`. */
    slug: v.string(),
    chainId: v.number(),
    /** Display name, e.g. "USD Coin" or "ETH / USDC". */
    name: v.string(),
    /** Short symbol (assets) or pair label (pools). */
    symbol: v.string(),
    /** For pools: e.g. "Uniswap v3 · 0.3%". Optional for assets. */
    venueLabel: v.optional(v.string()),
    /** For assets only: "stable" | "crypto". */
    category: v.optional(v.union(v.literal("stable"), v.literal("crypto"))),
    /** Block explorer link for the underlying contract. */
    explorerUrl: v.optional(v.string()),
    /** Used to cap user-visible utilization / LTV on the front end. */
    reserveFactorPct: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_scope_slug", ["scope", "slug"])
    .index("by_scope_chain", ["scope", "chainId"]),

  /**
   * Every on-chain user action. Source of truth for:
   *   - `EngagementTrend.series`    (distinct wallets per day)
   *   - `EngagementTrend.primary`   (active wallets today vs. yesterday)
   *   - `EngagementTrend.secondary` (conversion: e.g. supplies that later borrowed)
   *   - `AssetDetail.transactions`  (recent N rows with amount + tx hash)
   *
   * Write path: indexer/webhook. Read path: `convex/engagement.ts`.
   */
  walletEvents: defineTable({
    marketId: v.id("markets"),
    /** Checksummed EVM address. Store lowercase for deterministic indexing. */
    wallet: v.string(),
    kind: walletEventKind,
    /** Notional in USD at event time. Back-fill from price oracle at block. */
    amountUsd: v.number(),
    /** Counterparty wallet if applicable (liquidator, router, etc.). */
    counterparty: v.optional(v.string()),
    txHash: v.string(),
    blockNumber: v.number(),
    /** Event time, ms since epoch (UTC). Index on this for range scans. */
    at: v.number(),
  })
    .index("by_market_at", ["marketId", "at"])
    .index("by_wallet_at", ["wallet", "at"])
    .index("by_market_kind_at", ["marketId", "kind", "at"]),

  /**
   * Daily snapshot of market-wide stats (one row per market per day).
   *
   * Source of truth for:
   *   - `AssetDetail.supplyBorrow.{supplied, borrowed, utilization}`
   *   - `AssetDetail.historicalUtilization`
   *   - `AssetDetail.heroMetric.series.{supply, borrow, utilization, apy}`
   *   - `AssetDetail.quickStats` (latest row + 24h delta)
   *   - `PoolDetail.keyMetrics.*`
   *   - `PoolDetail.heroMetric.series.*`
   *
   * Write path: daily aggregator job. Read path: `convex/markets.ts`.
   */
  marketDailyStats: defineTable({
    marketId: v.id("markets"),
    /** ISO YYYY-MM-DD in UTC. One row per (marketId, day). */
    day: v.string(),
    suppliedUsd: v.number(),
    borrowedUsd: v.number(),
    /** 0..100; derived as `borrowedUsd / suppliedUsd`. Stored to avoid recompute. */
    utilizationPct: v.number(),
    supplyApyPct: v.number(),
    borrowAprPct: v.number(),
    /** For pools: same as suppliedUsd. For assets: total reserve value. */
    tvlUsd: v.number(),
    /** Rolling 24h swap volume (pools only; 0 for single-asset markets). */
    volumeUsd: v.number(),
    feesUsd: v.number(),
    /** Spot price of the underlying at end-of-day (assets only). */
    priceUsd: v.optional(v.number()),
    /** Current caps / parameters (useful for key metrics card). */
    supplyCapUsd: v.optional(v.number()),
    borrowCapUsd: v.optional(v.number()),
  })
    .index("by_market_day", ["marketId", "day"]),

  /**
   * Daily revenue per market. Feeds the monthly Cash Flow card. The UI
   * aggregates daily rows into monthly buckets client-side, so any writer
   * can land data at whatever cadence makes sense.
   *
   * Source of truth for:
   *   - `CashflowTrend.series` (asset page — "revenue generated")
   *   - `CashflowCard.rows`    (both pages — breakdown table)
   *   - `CashflowCard.bars`    (monthly fees + incentives)
   */
  marketRevenueDaily: defineTable({
    marketId: v.id("markets"),
    day: v.string(),
    /** Gross interest paid by borrowers. */
    interestFromBorrowersUsd: v.number(),
    /** Net interest that accrued to suppliers (after reserve take). */
    interestToSuppliersUsd: v.number(),
    /** Protocol reserve take. */
    reserveTakeUsd: v.number(),
    /** External incentives emitted on top of native yield. */
    rewardsDistributedUsd: v.number(),
    /** Swap fees (pools only). */
    swapFeesUsd: v.number(),
  })
    .index("by_market_day", ["marketId", "day"]),

  /**
   * Daily snapshot of how an asset's liquidity is split across pools.
   * Source of truth for `AssetDetail.allocation`. The table is keyed by the
   * asset; the `poolId` FK lets the query join to `markets` for display.
   */
  assetPoolAllocationDaily: defineTable({
    assetId: v.id("markets"),
    poolId: v.id("markets"),
    day: v.string(),
    valueUsd: v.number(),
    /** 0..100, share of the asset's total deployed value. */
    sharePct: v.number(),
    utilizationPct: v.number(),
    borrowAprPct: v.number(),
  })
    .index("by_asset_day", ["assetId", "day"])
    .index("by_pool_day", ["poolId", "day"]),

  /**
   * Risk review snapshots. One row per review cycle. The UI reads the latest
   * row for a given market; history is retained for audit.
   *
   * Source of truth for `RiskAssessment` on both detail pages.
   */
  riskAssessments: defineTable({
    marketId: v.id("markets"),
    assessedAt: v.number(),
    premiumBps: v.number(),
    level: riskLevel,
    /** 0..100 gauge score. */
    score: v.number(),
    headline: v.string(),
    summary: v.string(),
    breakdown: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        bps: v.number(),
        level: riskLevel,
        description: v.string(),
      }),
    ),
    metrics: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        value: v.string(),
        hint: v.optional(v.string()),
      }),
    ),
  })
    .index("by_market_assessed_at", ["marketId", "assessedAt"]),
})
