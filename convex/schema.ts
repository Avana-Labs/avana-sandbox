/**
 * Convex schema — the canonical persistence layer for every number a detail
 * page renders. The frontend never imports mock data once these tables are
 * populated; instead it calls the queries in sibling files (`engagement.ts`,
 * `cashflow.ts`, `markets.ts`, `allocation.ts`) which fold these rows into
 * the view-model shapes declared in `app/lib/borrow-detail/types.ts`.
 *
 * Table naming contract:
 *   - `markets`                     canonical identity (legacy shared; decoupling track splits by product).
 *   - `walletEvents`                source-of-truth user actions (drives engagement + transaction history).
 *   - `marketDailyStats`            daily market snapshot (drives supply/borrow, utilization, key metrics).
 *   - `marketRevenueDaily`          daily revenue (drives cash-flow card).
 *   - `assetPoolAllocationDaily`    daily per-pool allocation per asset (drives allocation breakdown).
 *   - `riskAssessments`             risk rating snapshots.
 *   - `borrow*` / `lend*` / `multiply*`  product-siloed detail params (IRM, risk grid, liquidation, borrowables).
 *
 * If you change field names here, update the matching JSDoc `@convex-source`
 * pointers in `app/lib/borrow-detail/types.ts` so the data seam stays obvious.
 */

import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

/** Wallet actions that make a user "engaged" with a market. */
export const WALLET_EVENT_KINDS = ["supply", "withdraw", "borrow", "repay", "liquidation", "rewardsClaim"] as const

const walletEventKind = v.union(
  v.literal("supply"),
  v.literal("withdraw"),
  v.literal("borrow"),
  v.literal("repay"),
  v.literal("liquidation"),
  v.literal("rewardsClaim"),
)

/** Scope differentiates an asset (single borrowable token), a pool (LP collateral
 *  market), a lend market (single-asset supply market), and a multiply market
 *  (leveraged collateral→borrow loop). */
export const MARKET_SCOPES = ["asset", "pool", "lend", "multiply"] as const
const marketScope = v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply"))

/** Risk buckets mirror `RiskLevel` in `app/lib/borrow-detail/types.ts`. */
const riskLevel = v.union(v.literal("low"), v.literal("moderate"), v.literal("elevated"), v.literal("high"))

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
    /** Incentive / rewards APY percent (0 = none). Detail Key Statistics overlay. */
    rewardsApyPct: v.optional(v.number()),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    spokeId: v.optional(v.string()),
    feeTier: v.optional(v.string()),
    maxLtvPct: v.optional(v.number()),
    /**
     * Canonical USD price. The live token oracle (tokenPrices) only covers single-token
     * bluechip symbols; pool markets carry LP-pair symbols and long-tail lend markets carry
     * chain-name symbols with no oracle price, so this is seeded per market. For POOL markets
     * it is the LP token price (poolLpTokenPriceUsd) — used both by the onboarding starter
     * gate and by assertBorrowSolvent to revalue an 18-decimal LP-token pledge.
     */
    priceUsd: v.optional(v.number()),
    visuals: v.optional(
      v.array(
        v.object({
          symbol: v.string(),
          shortLabel: v.string(),
          bgClassName: v.string(),
          textClassName: v.string(),
          iconUrl: v.optional(v.string()),
        }),
      ),
    ),
    resources: v.optional(v.array(v.object({ label: v.string(), href: v.string() }))),
    createdAt: v.number(),
  })
    .index("by_scope_slug", ["scope", "slug"])
    .index("by_scope_chain", ["scope", "chainId"]),

  /**
   * Product-siloed borrow market identity (pool + asset). Prefer this for display
   * metadata; legacy `markets` remains the FK hub for walletEvents / allocation until
   * those are siloed.
   */
  borrowMarkets: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("pool"), v.literal("asset")),
    chainId: v.number(),
    name: v.string(),
    symbol: v.string(),
    venueLabel: v.optional(v.string()),
    category: v.optional(v.union(v.literal("stable"), v.literal("crypto"))),
    explorerUrl: v.optional(v.string()),
    reserveFactorPct: v.optional(v.number()),
    /** Incentive / rewards APY percent (0 = none). Detail Key Statistics overlay. */
    rewardsApyPct: v.optional(v.number()),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    spokeId: v.optional(v.string()),
    feeTier: v.optional(v.string()),
    maxLtvPct: v.optional(v.number()),
    priceUsd: v.optional(v.number()),
    visuals: v.optional(
      v.array(
        v.object({
          symbol: v.string(),
          shortLabel: v.string(),
          bgClassName: v.string(),
          textClassName: v.string(),
          iconUrl: v.optional(v.string()),
        }),
      ),
    ),
    resources: v.optional(v.array(v.object({ label: v.string(), href: v.string() }))),
    /** Asset-scope fields: spoke-agnostic asset id + display context label. */
    baseAssetId: v.optional(v.string()),
    contextLabel: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  /** Product-siloed lend market identity. */
  lendMarkets: defineTable({
    slug: v.string(),
    chainId: v.number(),
    name: v.string(),
    symbol: v.string(),
    venueLabel: v.optional(v.string()),
    category: v.optional(v.union(v.literal("stable"), v.literal("crypto"))),
    explorerUrl: v.optional(v.string()),
    reserveFactorPct: v.optional(v.number()),
    /** Incentive / rewards APY percent (0 = none). Detail Key Statistics overlay. */
    rewardsApyPct: v.optional(v.number()),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    spokeId: v.optional(v.string()),
    feeTier: v.optional(v.string()),
    maxLtvPct: v.optional(v.number()),
    priceUsd: v.optional(v.number()),
    visuals: v.optional(
      v.array(
        v.object({
          symbol: v.string(),
          shortLabel: v.string(),
          bgClassName: v.string(),
          textClassName: v.string(),
          iconUrl: v.optional(v.string()),
        }),
      ),
    ),
    resources: v.optional(v.array(v.object({ label: v.string(), href: v.string() }))),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  /** Product-siloed multiply market identity. */
  multiplyMarkets: defineTable({
    slug: v.string(),
    chainId: v.number(),
    name: v.string(),
    symbol: v.string(),
    venueLabel: v.optional(v.string()),
    category: v.optional(v.union(v.literal("stable"), v.literal("crypto"))),
    explorerUrl: v.optional(v.string()),
    reserveFactorPct: v.optional(v.number()),
    /** Incentive / rewards APY percent (0 = none). Detail Key Statistics overlay. */
    rewardsApyPct: v.optional(v.number()),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    spokeId: v.optional(v.string()),
    feeTier: v.optional(v.string()),
    maxLtvPct: v.optional(v.number()),
    priceUsd: v.optional(v.number()),
    visuals: v.optional(
      v.array(
        v.object({
          symbol: v.string(),
          shortLabel: v.string(),
          bgClassName: v.string(),
          textClassName: v.string(),
          iconUrl: v.optional(v.string()),
        }),
      ),
    ),
    resources: v.optional(v.array(v.object({ label: v.string(), href: v.string() }))),
    /**
     * Multiply-specific catalog fields. All optional so existing rows migrate
     * lazily; seed writer populates from MULTIPLY_MARKET_CATALOG in Phase C.
     */
    publicMaxMultiplier: v.optional(v.number()),
    hardMaxMultiplier: v.optional(v.number()),
    minHealthFactor: v.optional(v.number()),
    riskTier: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    liquidationThresholdPct: v.optional(v.number()),
    collateralSymbol: v.optional(v.string()),
    collateralName: v.optional(v.string()),
    borrowSymbol: v.optional(v.string()),
    borrowName: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

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
  /**
   * Legacy shared daily market snapshot. Prefer product-siloed
   * `borrowDailyStats` / `lendDailyStats` / `multiplyDailyStats`.
   * Kept for dual-read during decoupling; seed still dual-writes for now.
   *
   * Write path: daily aggregator job. Read path: `convex/markets.ts` (+ siloed IRM).
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
  }).index("by_market_day", ["marketId", "day"]),

  /** Borrow product daily stats (pool + asset), slug-keyed. */
  borrowDailyStats: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("pool"), v.literal("asset")),
    day: v.string(),
    suppliedUsd: v.number(),
    borrowedUsd: v.number(),
    utilizationPct: v.number(),
    supplyApyPct: v.number(),
    borrowAprPct: v.number(),
    tvlUsd: v.number(),
    volumeUsd: v.number(),
    feesUsd: v.number(),
    priceUsd: v.optional(v.number()),
    supplyCapUsd: v.optional(v.number()),
    borrowCapUsd: v.optional(v.number()),
  }).index("by_slug_day", ["slug", "day"]),

  /** Lend product daily stats, slug-keyed. */
  lendDailyStats: defineTable({
    slug: v.string(),
    day: v.string(),
    suppliedUsd: v.number(),
    borrowedUsd: v.number(),
    utilizationPct: v.number(),
    supplyApyPct: v.number(),
    borrowAprPct: v.number(),
    tvlUsd: v.number(),
    volumeUsd: v.number(),
    feesUsd: v.number(),
    priceUsd: v.optional(v.number()),
    supplyCapUsd: v.optional(v.number()),
    borrowCapUsd: v.optional(v.number()),
  }).index("by_slug_day", ["slug", "day"]),

  /** Multiply product daily stats, slug-keyed. */
  multiplyDailyStats: defineTable({
    slug: v.string(),
    day: v.string(),
    suppliedUsd: v.number(),
    borrowedUsd: v.number(),
    utilizationPct: v.number(),
    supplyApyPct: v.number(),
    borrowAprPct: v.number(),
    tvlUsd: v.number(),
    volumeUsd: v.number(),
    feesUsd: v.number(),
    priceUsd: v.optional(v.number()),
    supplyCapUsd: v.optional(v.number()),
    borrowCapUsd: v.optional(v.number()),
  }).index("by_slug_day", ["slug", "day"]),

  /**
   * Precomputed reference-snapshot cache for `listMarketSnapshots`. That query is
   * subscribed app-wide, so recomputing it from a full `markets` collect plus one
   * indexed read per market (~173 reads) on every subscriber recompute does not
   * scale. Instead the recompute runs once in `rebuildMarketSnapshots` (on write /
   * on schedule) and writes the folded rows here; the hot query reads this single
   * document (O(1)). One row total — `singleton: "markets"`.
   */
  marketSnapshotsCache: defineTable({
    /** Constant discriminator so there is exactly one cache row (`"markets"`). */
    singleton: v.string(),
    rows: v.array(
      v.object({
        slug: v.string(),
        scope: marketScope,
        name: v.string(),
        symbol: v.string(),
        chainId: v.number(),
        venueLabel: v.optional(v.string()),
        category: v.optional(v.union(v.literal("stable"), v.literal("crypto"))),
        description: v.optional(v.string()),
        iconUrl: v.optional(v.string()),
        spokeId: v.optional(v.string()),
        feeTier: v.optional(v.string()),
        maxLtvPct: v.optional(v.number()),
        reserveFactorPct: v.optional(v.number()),
        rewardsApyPct: v.optional(v.number()),
        /** Latest siloed risk-assessment premium (bps) for list Risk Premium column. */
        premiumBps: v.optional(v.number()),
        visuals: v.optional(
          v.array(
            v.object({
              symbol: v.string(),
              shortLabel: v.string(),
              bgClassName: v.string(),
              textClassName: v.string(),
              iconUrl: v.optional(v.string()),
            }),
          ),
        ),
        resources: v.optional(v.array(v.object({ label: v.string(), href: v.string() }))),
        suppliedUsd: v.number(),
        borrowedUsd: v.number(),
        availableUsd: v.number(),
        utilizationPct: v.number(),
        supplyApyPct: v.number(),
        borrowAprPct: v.number(),
        tvlUsd: v.number(),
        volumeUsd: v.number(),
        feesUsd: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index("by_singleton", ["singleton"]),

  /**
   * Legacy shared daily revenue per market (Cashflow card), keyed by `markets` id.
   * Prefer product-siloed `borrowRevenueDaily` / `lendRevenueDaily` / `multiplyRevenueDaily`.
   * Kept for dual-read during decoupling; seed still dual-writes for now.
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
  }).index("by_market_day", ["marketId", "day"]),

  /** Borrow product daily revenue (pool + asset), slug-keyed. */
  borrowRevenueDaily: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("pool"), v.literal("asset")),
    day: v.string(),
    interestFromBorrowersUsd: v.number(),
    interestToSuppliersUsd: v.number(),
    reserveTakeUsd: v.number(),
    rewardsDistributedUsd: v.number(),
    swapFeesUsd: v.number(),
  }).index("by_slug_day", ["slug", "day"]),

  /** Lend product daily revenue, slug-keyed. */
  lendRevenueDaily: defineTable({
    slug: v.string(),
    day: v.string(),
    interestFromBorrowersUsd: v.number(),
    interestToSuppliersUsd: v.number(),
    reserveTakeUsd: v.number(),
    rewardsDistributedUsd: v.number(),
    swapFeesUsd: v.number(),
  }).index("by_slug_day", ["slug", "day"]),

  /** Multiply product daily revenue, slug-keyed. */
  multiplyRevenueDaily: defineTable({
    slug: v.string(),
    day: v.string(),
    interestFromBorrowersUsd: v.number(),
    interestToSuppliersUsd: v.number(),
    reserveTakeUsd: v.number(),
    rewardsDistributedUsd: v.number(),
    swapFeesUsd: v.number(),
  }).index("by_slug_day", ["slug", "day"]),

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
   * Legacy shared risk review snapshots (Risk Premium card), keyed by `markets` id.
   * Prefer product-siloed `borrowRiskAssessments` / `lendRiskAssessments` / `multiplyRiskAssessments`.
   * Kept for dual-read during decoupling; seed still dual-writes for now.
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
  }).index("by_market_assessed_at", ["marketId", "assessedAt"]),

  /**
   * Shared, multi-user market liquidity ledger. Every borrow / repay / supply /
   * withdraw from ANY client APPENDS a delta event here (never patches a shared
   * row), and every client subscribes (see `convex/liquidity.ts`), which folds the
   * events per market and layers the net onto the base catalog so liquidity stats
   * move with aggregate activity across all users instead of staying frozen.
   *
   * Append-only by design: patching a single per-market row put every writer on the
   * same document and made concurrent actions contend under Convex OCC. Appending a
   * fresh row per action removes that hot-write contention.
   *
   * Scale is handled by COMPACTION, not by changing this write path: a scheduled
   * `liquidity.compactDeltas` folds the oldest rows into the cumulative
   * `marketLiquidityBaseline` (one row per market) and deletes them, so this table only
   * holds a bounded recent window and the fold reads `#markets + #recent rows` instead of
   * O(#events). Each row is counted exactly once — raw here until folded, then baseline.
   */
  marketLiquidityDeltas: defineTable({
    /** Catalog market id — a pool id ("uni-v3-bluechip-weth-usdc") or borrowable asset id ("uni-v2:usdc"). */
    marketSlug: v.string(),
    /** Net borrowed change in USD (borrow +, repay −). */
    borrowedDeltaUsd: v.number(),
    /** Net supplied/collateral change in USD (supply/deposit +, withdraw −). */
    suppliedDeltaUsd: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["marketSlug"]),

  /**
   * Cumulative per-market fold of every COMPACTED `marketLiquidityDeltas` row — the
   * bounded baseline that keeps the fold independent of the total number of actions.
   *
   * The append-only event table stays the zero-contention hot-write sink (all products
   * append a fresh row per action — never patch a shared row). A scheduled compaction
   * (`crons.ts` → `liquidity.compactDeltas`) folds the OLDEST delta rows into these
   * per-market accumulators and DELETES the folded rows, so the raw table only ever holds
   * a bounded recent window. The fold is then `baseline + the few un-compacted deltas`
   * (markets + recent-window rows), not a full-table scan. One row per market slug.
   *
   * Correctness: every delta row is counted exactly once — either it is still in the raw
   * table (summed live) or it has been folded into a baseline row and deleted (summed via
   * the baseline), never both. Compaction only touches this table, so it never contends
   * with the hot append path on a document.
   */
  marketLiquidityBaseline: defineTable({
    marketSlug: v.string(),
    /** Running sum of borrowedDeltaUsd across all compacted rows for this market. */
    borrowedDeltaUsd: v.number(),
    /** Running sum of suppliedDeltaUsd across all compacted rows for this market. */
    suppliedDeltaUsd: v.number(),
    /** Max `updatedAt` of any delta folded into this baseline (for the fold's freshness). */
    updatedAt: v.number(),
  }).index("by_slug", ["marketSlug"]),

  /**
   * Precomputed fold of `marketLiquidityDeltas` into one net aggregate per market.
   * The app-wide liquidity subscription (`liquidity.listDeltaSnapshot`) reads this
   * single document (O(1)) instead of the append-only event table — so ONE user's
   * borrow/repay/supply/withdraw no longer invalidates every other subscriber. A
   * schedule (`crons.ts`) rebuilds it periodically from the bounded fold (the
   * `marketLiquidityBaseline` plus the un-compacted deltas), bounding cross-user
   * staleness to the refresh interval.
   */
  liquidityDeltasCache: defineTable({
    /** Constant discriminator so there is exactly one cache row (`"deltas"`). */
    singleton: v.string(),
    rows: v.array(
      v.object({
        marketSlug: v.string(),
        borrowedDeltaUsd: v.number(),
        suppliedDeltaUsd: v.number(),
        updatedAt: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index("by_singleton", ["singleton"]),

  /**
   * Sharded economy counters. The single `sandboxEconomy` row is read-and-patched
   * by every claim, so concurrent claims all contend on it under Convex OCC (the
   * load sweep saw ~53% of concurrent claims fail there). Each claim instead adds
   * its grant to ONE randomly-chosen shard row; the live count/total is the sum of
   * all shards. Distinct shards never collide, so the hot counter comes off the
   * write path while the aggregate stays exact.
   */
  sandboxEconomyShards: defineTable({
    /** 0..N-1 shard bucket; a claim picks one at random to increment. */
    shard: v.number(),
    userCount: v.number(),
    grantedUsd: v.number(),
  }).index("by_shard", ["shard"]),

  /**
   * Real token spot prices (the ONE place the sandbox reads live market data). A
   * scheduled action (`convex/prices.ts refreshPrices`) pulls these from DefiLlama
   * so the detail "Price" + the list price-under-logos reflect production prices,
   * while supply/borrow/TVL stay simulated. One row per base symbol.
   */
  tokenPrices: defineTable({
    /** Lowercase base symbol/id, e.g. "usdc", "weth". Matches SpokeBorrowableRecord.baseAssetId. */
    symbol: v.string(),
    /** DefiLlama coin id used to fetch it (chain:address or coingecko:id). */
    llamaId: v.string(),
    priceUsd: v.number(),
    decimals: v.optional(v.number()),
    /** DefiLlama price confidence (0..1). */
    confidence: v.optional(v.number()),
    /**
     * Where the row came from: "defillama" is the hourly refreshed live spot;
     * "baseline" is the seeded snapshot used until the first live refresh lands
     * (replaces the ASSET_PRICE_USD constant in the mock). Live upserts strictly
     * overwrite baselines on the same symbol.
     */
    source: v.string(),
    /**
     * 24h price change as a 1e18 wad (bigint stored as string). Optional because
     * DefiLlama's percentChange1d isn't always populated; when absent, the UI
     * suppresses the delta arrow. Replaces ASSET_PRICE_CHANGE_24H mock map.
     */
    priceChange24hWad: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_symbol", ["symbol"]),

  /**
   * Legacy shared editorial content (About / history / FAQs), keyed by `markets` id.
   * Prefer product-siloed `borrowMarketContent` / `lendMarketContent` / `multiplyMarketContent`.
   * Kept for dual-read during decoupling; seed still dual-writes for now.
   */
  marketContent: defineTable({
    marketId: v.id("markets"),
    description: v.string(),
    stats: v.array(v.object({ label: v.string(), value: v.string(), href: v.optional(v.string()) })),
    history: v.array(v.object({ date: v.string(), title: v.string(), description: v.optional(v.string()) })),
    faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
  }).index("by_market", ["marketId"]),

  // ── Product-siloed detail params (Borrow / Lend / Multiply are separate products) ──
  // Keyed by product slug — do NOT share rows across products.

  /** Borrow About / FAQs / parameter-change history (pool + asset). */
  borrowMarketContent: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("pool"), v.literal("asset")),
    description: v.string(),
    stats: v.array(v.object({ label: v.string(), value: v.string(), href: v.optional(v.string()) })),
    history: v.array(v.object({ date: v.string(), title: v.string(), description: v.optional(v.string()) })),
    faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
  }).index("by_slug", ["slug"]),

  /** Borrow Risk Premium / assessment card (pool + asset). Distinct from `borrowRiskParameters`. */
  borrowRiskAssessments: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("pool"), v.literal("asset")),
    assessedAt: v.number(),
    premiumBps: v.number(),
    level: riskLevel,
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
  }).index("by_slug", ["slug"]),

  /** Borrow Risk Parameters grid (pool + asset). One latest row per slug. */
  borrowRiskParameters: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("pool"), v.literal("asset")),
    parameters: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        value: v.string(),
        description: v.optional(v.string()),
      }),
    ),
    updatedAt: v.number(),
    source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
    txHash: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  /** Borrow Interest Rate Model curve params (asset markets). */
  borrowInterestRateModels: defineTable({
    slug: v.string(),
    optimalUtilizationPct: v.number(),
    slopeBelowOptimalPct: v.number(),
    slopeAboveOptimalPct: v.number(),
    baseBorrowRatePct: v.number(),
    updatedAt: v.number(),
    source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
    txHash: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  /** Borrow market liquidation KPIs (pool markets), one row per pool per day. */
  borrowLiquidationDaily: defineTable({
    slug: v.string(),
    day: v.string(),
    liquidationsCount: v.number(),
    collateralSeizedUsd: v.number(),
    debtRepaidUsd: v.number(),
    liquidationBonusUsd: v.number(),
    collateralAtRiskUsd: v.number(),
    walletsAtRisk: v.number(),
    walletsEligibleForLiquidation: v.number(),
    badDebtUsd: v.number(),
    walletsWithBadDebt: v.number(),
  }).index("by_slug_day", ["slug", "day"]),

  /** Borrow pool → borrowable asset edges (Assets You Can Borrow). */
  borrowPoolBorrowables: defineTable({
    poolSlug: v.string(),
    assetSlug: v.string(),
    name: v.string(),
    symbol: v.string(),
    borrowAprPct: v.number(),
  }).index("by_pool", ["poolSlug"]),

  /** Lend About / FAQs / parameter-change history. */
  lendMarketContent: defineTable({
    slug: v.string(),
    description: v.string(),
    stats: v.array(v.object({ label: v.string(), value: v.string(), href: v.optional(v.string()) })),
    history: v.array(v.object({ date: v.string(), title: v.string(), description: v.optional(v.string()) })),
    faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
  }).index("by_slug", ["slug"]),

  /** Lend Risk Premium / assessment card. Distinct from `lendRiskParameters`. */
  lendRiskAssessments: defineTable({
    slug: v.string(),
    assessedAt: v.number(),
    premiumBps: v.number(),
    level: riskLevel,
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
  }).index("by_slug", ["slug"]),

  /** Lend Risk Parameters grid. */
  lendRiskParameters: defineTable({
    slug: v.string(),
    parameters: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        value: v.string(),
        description: v.optional(v.string()),
      }),
    ),
    updatedAt: v.number(),
    source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
    txHash: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  /** Lend Interest Rate Model curve params. */
  lendInterestRateModels: defineTable({
    slug: v.string(),
    optimalUtilizationPct: v.number(),
    slopeBelowOptimalPct: v.number(),
    slopeAboveOptimalPct: v.number(),
    baseBorrowRatePct: v.number(),
    updatedAt: v.number(),
    source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
    txHash: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  /** Multiply About / FAQs / parameter-change history. */
  multiplyMarketContent: defineTable({
    slug: v.string(),
    description: v.string(),
    stats: v.array(v.object({ label: v.string(), value: v.string(), href: v.optional(v.string()) })),
    history: v.array(v.object({ date: v.string(), title: v.string(), description: v.optional(v.string()) })),
    faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
  }).index("by_slug", ["slug"]),

  /** Multiply Risk Premium / assessment card. Distinct from `multiplyRiskParameters`. */
  multiplyRiskAssessments: defineTable({
    slug: v.string(),
    assessedAt: v.number(),
    premiumBps: v.number(),
    level: riskLevel,
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
  }).index("by_slug", ["slug"]),

  /** Multiply Risk Parameters grid. */
  multiplyRiskParameters: defineTable({
    slug: v.string(),
    parameters: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        value: v.string(),
        description: v.optional(v.string()),
      }),
    ),
    updatedAt: v.number(),
    source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
    txHash: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  /** Multiply market liquidation KPIs, one row per market per day. */
  multiplyLiquidationDaily: defineTable({
    slug: v.string(),
    day: v.string(),
    liquidationsCount: v.number(),
    collateralSeizedUsd: v.number(),
    debtRepaidUsd: v.number(),
    liquidationBonusUsd: v.number(),
    collateralAtRiskUsd: v.number(),
    walletsAtRisk: v.number(),
    walletsEligibleForLiquidation: v.number(),
    badDebtUsd: v.number(),
    walletsWithBadDebt: v.number(),
  }).index("by_slug_day", ["slug", "day"]),

  /**
   * Support Center submissions. Captured every time a user sends a request from
   * the Support Center form so the team has a durable record. Wallet/email are
   * optional (a user may not be signed in); status defaults to "new".
   */
  supportRequests: defineTable({
    wallet: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    category: v.string(),
    categoryLabel: v.optional(v.string()),
    topic: v.string(),
    topicLabel: v.optional(v.string()),
    message: v.string(),
    status: v.union(v.literal("new"), v.literal("in_progress"), v.literal("resolved")),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_created", ["wallet", "createdAt"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // ── Phase 2: wallet-scoped sandbox state (synthetic; never source of truth in prod) ──

  /**
   * Single authoritative row holding the global sandbox economy caps. Caps are
   * enforced SERVER-SIDE here at claim time — never trusted from the client.
   */
  sandboxEconomy: defineTable({
    userCap: v.number(),
    totalGrantedUsdCap: v.number(),
    perUserTargetUsd: v.number(),
    minMultiplier: v.number(),
    maxMultiplier: v.number(),
    userCount: v.number(),
    totalGrantedUsd: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    closedReason: v.optional(v.string()),
    closedAt: v.optional(v.number()),
  }),

  /** Single tunable row: allocation basket weights + onboarding copy/links. */
  sandboxConfig: defineTable({
    basket: v.array(v.object({ tokenId: v.string(), weight: v.number() })),
    seedVersion: v.number(),
    tweetTemplate: v.optional(v.string()),
    xHandle: v.optional(v.string()),
    resourcesLinks: v.optional(v.array(v.object({ label: v.string(), href: v.string() }))),
  }),

  /** Minimal immutable starter catalog read by every onboarding claim in one indexed lookup. */
  sandboxStarterCatalog: defineTable({
    singleton: v.string(),
    rows: v.array(
      v.object({
        slug: v.string(),
        scope: marketScope,
        symbol: v.string(),
        priceUsd: v.number(),
      }),
    ),
    updatedAt: v.number(),
  }).index("by_singleton", ["singleton"]),

  /** Per-authenticated-user onboarding + allocation profile. */
  sandboxProfiles: defineTable({
    /** Lowercased wallet address; must match the authenticated identity. */
    wallet: v.string(),
    /** Identity subject from the auth issuer (Privy user id or SIWE-JWT subject). */
    authSubject: v.optional(v.string()),
    createdAt: v.number(),
    seedVersion: v.number(),
    onboardingStep: v.union(
      v.literal("wallet"),
      v.literal("analyzing"),
      v.literal("eligible"),
      v.literal("xPending"),
      v.literal("xConfirmed"),
      v.literal("claimPending"),
      v.literal("done"),
      v.literal("waitlisted"),
    ),
    onboardedAt: v.optional(v.number()),
    eligibilityTier: v.optional(v.number()),
    tierSeed: v.optional(v.string()),
    allocatedUsd: v.optional(v.number()),
    basketSnapshot: v.optional(
      v.array(v.object({ tokenId: v.string(), amount: v.number(), priceUsdAtClaim: v.number() })),
    ),
    xHandle: v.optional(v.string()),
    tweetUrl: v.optional(v.string()),
    tweetedAt: v.optional(v.number()),
    claimTxSynthetic: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        language: v.optional(v.string()),
        currency: v.optional(v.string()),
        showDollarAmounts: v.optional(v.boolean()),
        /** Short display name captured at onboarding (≤10 chars). */
        name: v.optional(v.string()),
        /** Which DEX(es) the user brings LP liquidity from — research signal. */
        dexSources: v.optional(v.array(v.string())),
      }),
    ),
  })
    .index("by_wallet", ["wallet"])
    .index("by_authSubject", ["authSubject"]),

  /** Liquid play-money balances granted at onboarding but not yet deployed into a market. */
  sandboxBalances: defineTable({
    wallet: v.string(),
    assetSlug: v.string(),
    symbol: v.string(),
    amount: v.number(),
    valueUsd: v.number(),
    priceUsd: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_asset", ["wallet", "assetSlug"]),

  /** Immutable, idempotent manifest of the wallet's diversified $1M starter grant. */
  starterAllocations: defineTable({
    wallet: v.string(),
    version: v.number(),
    totalEquityUsd: v.number(),
    liquid: v.array(v.object({ marketSlug: v.string(), amountUsd: v.number() })),
    collateral: v.array(v.object({ marketSlug: v.string(), amountUsd: v.number() })),
    lend: v.array(v.object({ marketSlug: v.string(), amountUsd: v.number() })),
    multiply: v.array(v.object({ marketSlug: v.string(), amountUsd: v.number() })),
    receiptHashes: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_wallet", ["wallet"]),

  /** Wallet-scoped sandbox activity log (one row per balance-changing action). */
  sandboxActivity: defineTable({
    wallet: v.string(),
    kind: v.string(),
    amountUsd: v.number(),
    marketSlug: v.optional(v.string()),
    syntheticTxHash: v.string(),
    at: v.number(),
  })
    .index("by_wallet_at", ["wallet", "at"])
    .index("by_wallet_hash", ["wallet", "syntheticTxHash"]),

  /** Wallet-scoped rewards engine state for reactive sandbox rehydration. */
  sandboxRewards: defineTable({
    wallet: v.string(),
    stateJson: v.string(),
    updatedAt: v.number(),
    /** Optimistic-concurrency version; clients echo `expectedRevision` on update. */
    revision: v.optional(v.number()),
  }).index("by_wallet", ["wallet"]),

  /**
   * Per-wallet remaining claimable on each borrow LP-fee reward position. One row per
   * (wallet, rewardPositionId). `remainingUsd6` is the claimable left AFTER the wallet's
   * claims (decimal usd6 string), so hydration reduces the statically-seeded claimable to
   * this value instead of resetting it to full on reload. Additive + backward compatible:
   * wallets with no rows simply keep the seeded (full) claimable, i.e. today's behavior.
   */
  sandboxRewardClaims: defineTable({
    wallet: v.string(),
    rewardPositionId: v.string(),
    remainingUsd6: v.string(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_position", ["wallet", "rewardPositionId"]),

  // ── Phase 2 (cont.): wallet-scoped FINANCIAL state (synthetic; never prod truth) ──
  //
  // ENCODING CONTRACT: the credit-/multiply-engines work in bigint fixed-point —
  // usd6 (1e6), WAD (1e18), RAY (1e27). Convex has no bigint and RAY overflows the
  // JS Number safe-integer range, so every fixed-point field below is a *decimal
  // integer string* (e.g. "12400000000" = 12,400 usd6). This is the same lossless
  // representation `app/lib/borrow-system/codec.ts` uses (it tags bigints as
  // {__bigint}); here we drop the wrapper and store the bare string. Nullable rates
  // (e.g. an infinite health factor) are `v.union(<string>, v.null())`. Plain-number
  // fields belong ONLY to the multiply engine, which is number-native (see types.ts).
  //
  // Wallet is always the lowercased authed address (see convex/sandbox/auth.ts). The
  // server derives it from ctx.auth and never trusts a client-passed wallet.

  /**
   * LP collateral-pool catalog (global, not wallet-scoped). Mirrors
   * `PortfolioPoolRecord` (app/lib/data/providers/portfolio/source.ts) — the pool a
   * `positionCollateral` row pledges into. Distinct from the `markets` directory:
   * `markets` is the borrow/lend/multiply market catalog; `pools` is the pledgeable
   * LP-pair catalog the portfolio + collateral views render. One row per slug.
   */
  pools: defineTable({
    /** URL-safe pool id, e.g. "uni-v3-bluechip-weth-usdc". */
    slug: v.string(),
    name: v.string(),
    venue: v.string(),
    /** e.g. "v3" | "stable" | "volatile". */
    category: v.string(),
    chainId: v.optional(v.number()),
    /** Exactly two legs (PortfolioPoolRecord.visuals tuple). */
    visuals: v.array(
      v.object({
        symbol: v.string(),
        shortLabel: v.string(),
        bgClassName: v.string(),
        textClassName: v.string(),
        /** Optional iconUrl added in Phase C so the borrow catalog stops relying on the client-side VISUALS map. */
        iconUrl: v.optional(v.string()),
      }),
    ),
    maxLtvPct: v.number(),
    liquidationThresholdPct: v.optional(v.number()),
    pairAprPct: v.number(),
    lpTokenPriceUsd: v.optional(v.number()),
    /**
     * Phase C additions — currently hardcoded in borrow-sim.ts. All optional so
     * existing pool rows migrate lazily; the borrow-catalog seed writer sets
     * them when it repopulates.
     */
    venueLabel: v.optional(v.string()),
    spokeId: v.optional(v.string()),
    dexId: v.optional(v.string()),
    feeTier: v.optional(v.string()),
    chain: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    lpSymbol: v.optional(v.string()),
    collateralExampleUsd: v.optional(v.number()),
    riskPremiumBps: v.optional(v.number()),
    borrowableTokens: v.optional(
      v.array(
        v.object({
          symbol: v.string(),
          iconUrl: v.string(),
          shortLabel: v.string(),
          bgClass: v.string(),
          textClass: v.string(),
        }),
      ),
    ),
    supportedBorrowAssetIds: v.optional(v.array(v.string())),
    poolSeedName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_spoke_id", ["spokeId"]),

  /**
   * Open/closed position, one row per (wallet, product, market). Unified across
   * products via a `product` discriminator: borrow & lend carry usd6 *string*
   * fields; multiply is number-native (mirrors `MultiplyPosition`, incl. the
   * "infinity" health-factor sentinel and nullable liquidationPrice). Child
   * collateral/debt detail lives in `positionCollateral` / `positionDebt`.
   */
  positions: defineTable({
    wallet: v.string(),
    product: v.union(v.literal("borrow"), v.literal("multiply"), v.literal("lend"), v.literal("umbrella")),
    /** Joins to `markets.slug` or `pools.slug`. */
    marketSlug: v.string(),
    spokeId: v.optional(v.string()),
    assetId: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed")),
    // borrow/lend (usd6 decimal strings)
    collateralValueUsd6: v.optional(v.string()),
    debtValueUsd6: v.optional(v.string()),
    suppliedUsd6: v.optional(v.string()),
    earnedUsd6: v.optional(v.string()),
    supplyApyPct: v.optional(v.number()),
    cooldownAmountUsd6: v.optional(v.string()),
    cooldownStartedAt: v.optional(v.number()),
    cooldownEndsAt: v.optional(v.number()),
    withdrawalWindowEndsAt: v.optional(v.number()),
    claimedRewardsUsd6: v.optional(v.string()),
    /**
     * Reward accrual checkpoint for umbrella positions — DISTINCT from
     * `lastUpdatedAt` so balance-sync patches (which touch lastUpdatedAt on
     * every mutation) do NOT reset accrued rewards. Updated only when a
     * stake / claim / startCooldown / unstake re-checkpoints `earnedUsd6`.
     */
    rewardCheckpointAt: v.optional(v.number()),
    // multiply (number-native — see app/lib/multiply-engine/types.ts MultiplyPosition)
    collateralAmount: v.optional(v.number()),
    collateralValueUsd: v.optional(v.number()),
    debtValueUsd: v.optional(v.number()),
    multiplier: v.optional(v.number()),
    ltv: v.optional(v.number()),
    healthFactor: v.optional(v.union(v.number(), v.literal("infinity"))),
    liquidationPrice: v.optional(v.union(v.number(), v.null())),
    netApyPct: v.optional(v.number()),
    openedAt: v.number(),
    lastUpdatedAt: v.number(),
    closedAt: v.optional(v.number()),
    openTxSynthetic: v.optional(v.string()),
    /**
     * Optimistic-concurrency version, bumped on every successful write. A client that
     * computed a write from revision N sends `expectedRevision: N`; the server rejects it
     * if the stored position has since advanced (another tab/device wrote first), instead
     * of silently clobbering that write. Optional for rows seeded before this field.
     */
    revision: v.optional(v.number()),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_product", ["wallet", "product"])
    .index("by_wallet_market", ["wallet", "marketSlug"])
    // Cross-wallet aggregate scans (used by umbrella market-level Coverage /
    // Amount-in-cooldown, computed live from every wallet's positions on top
    // of the catalog baseline).
    .index("by_product_market", ["product", "marketSlug"])
    // Direct (wallet, product, market) lookup so the position upsert is a `.unique()`
    // instead of collect()+find() over every position sharing a market slug.
    .index("by_wallet_product_market", ["wallet", "product", "marketSlug"]),

  /** Collateral leg of a borrow position. Mirrors `UserCollateralPosition`. */
  positionCollateral: defineTable({
    wallet: v.string(),
    positionId: v.id("positions"),
    /** Collateral pool slug (joins to `pools.slug`). */
    marketSlug: v.string(),
    collateralShares: v.string(),
    principalTokenAmount: v.string(),
    collateralEnabled: v.boolean(),
    /** Denormalized USD value for O(1) reads. */
    collateralValueUsd6: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_position", ["positionId"]),

  /** Debt leg of a borrow position. Mirrors `UserDebtPosition` (share/index accounting). */
  positionDebt: defineTable({
    wallet: v.string(),
    positionId: v.id("positions"),
    assetId: v.string(),
    baseAssetId: v.string(),
    spokeId: v.optional(v.string()),
    marketSlug: v.optional(v.string()),
    debtSharesUsd6: v.string(),
    debtIndexRay: v.string(),
    borrowRateWad: v.string(),
    principalBorrowedUsd6: v.string(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_position", ["positionId"]),

  /**
   * Per-wallet transaction ledger — ONE row per balance-changing action (the §2
   * invariant). Mirrors `TransactionHistoryItem` (borrow-system/contracts.ts) plus
   * `PortfolioActivityRecord`. `intentId` is the client intent id; the
   * `by_wallet_intent` index makes the execute mutation idempotent (replays/double
   * clicks return the existing row). `amountUsd` is the denormalized human-USD value
   * so activity feeds read without decoding usd6. (`sandboxActivity` stays the
   * onboarding-claim log; portfolio activity reads merge both — see §7.)
   */
  transactions: defineTable({
    wallet: v.string(),
    intentId: v.optional(v.string()),
    product: v.union(
      v.literal("borrow"),
      v.literal("lend"),
      v.literal("multiply"),
      v.literal("swap"),
      v.literal("rewards"),
      v.literal("umbrella"),
    ),
    /** deposit | withdraw | borrow | repay | claim | liquidate | multiply | deleverage | swap */
    kind: v.string(),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("pending")),
    marketSlug: v.optional(v.string()),
    assetId: v.optional(v.string()),
    positionId: v.optional(v.id("positions")),
    requestedAmountUsd6: v.string(),
    executedAmountUsd6: v.string(),
    amountUsd: v.number(),
    healthFactorWadBefore: v.optional(v.union(v.string(), v.null())),
    healthFactorWadAfter: v.optional(v.union(v.string(), v.null())),
    /** Multiply/deleverage leverage at the time of THIS transaction, so hydrated history shows
     *  the real before→after (e.g. "3.00x → 2.00x") instead of a constant 1 × the position's
     *  current multiplier (which rendered deleverages as leverage increases). */
    multiplierBefore: v.optional(v.number()),
    multiplierAfter: v.optional(v.number()),
    /** Swap-only legs (product === "swap"): the input/output token identity + amounts so
     *  the activity feed can render "0.001 ETH → 1.925 USDC" from the durable row alone. */
    swapInputSymbol: v.optional(v.string()),
    swapOutputSymbol: v.optional(v.string()),
    swapInputAmount: v.optional(v.number()),
    swapOutputAmount: v.optional(v.number()),
    /** Swap-only receipt detail (product === "swap"): the quote/provider/economics so the
     *  synthetic-transaction receipt renders the full swap breakdown from the durable row
     *  alone — cross-device, or after the in-session swap history is gone. Before this, a
     *  durable-row-only receipt fell back to a generic card with a hash-derived network fee
     *  and no min-received / price-impact / provider / quote id. */
    swapProvider: v.optional(v.string()),
    swapQuoteId: v.optional(v.string()),
    swapNetworkFeeUsd: v.optional(v.number()),
    swapMinOutputAmount: v.optional(v.number()),
    swapPriceImpactPct: v.optional(v.number()),
    swapSlippageBps: v.optional(v.number()),
    syntheticTxHash: v.string(),
    simulated: v.boolean(),
    at: v.number(),
  })
    .index("by_wallet_at", ["wallet", "at"])
    .index("by_wallet_intent", ["wallet", "intentId"])
    .index("by_wallet_hash", ["wallet", "syntheticTxHash"])
    .index("by_market_at", ["marketSlug", "at"])
    .index("by_wallet_product_at", ["wallet", "product", "at"]),

  /**
   * Append-only risk/health history per wallet. Preserves the SPOKE-scoped health
   * dimension (BorrowSpokeBreakdown) rather than collapsing to one account health
   * factor — `calculateSpokeCreditMetrics` is per-spoke. Latest row = current risk;
   * history feeds the hero risk chart.
   */
  riskSnapshots: defineTable({
    wallet: v.string(),
    at: v.number(),
    collateralValueUsd6: v.string(),
    borrowCapacityUsd6: v.string(),
    availableBorrowCapacityUsd6: v.string(),
    totalBorrowedUsd6: v.string(),
    currentLtvWad: v.string(),
    healthFactorWad: v.union(v.string(), v.null()),
    spokes: v.array(
      v.object({
        spokeId: v.string(),
        availableCreditUsd6: v.string(),
        totalBorrowedUsd6: v.string(),
        liquidationBufferUsd6: v.string(),
        healthFactorWad: v.union(v.string(), v.null()),
      }),
    ),
    /** Action kind that produced this snapshot (e.g. "borrow"). */
    trigger: v.optional(v.string()),
  }).index("by_wallet_at", ["wallet", "at"]),

  /**
   * Audit log of liquidation PREVIEWS (analytics-only; sandbox liquidation never
   * executes). One row per computed preview so health-before/after and the
   * allowed/blocked verdict are inspectable. `wallet` is the position owner (victim).
   */
  liquidationPreviews: defineTable({
    wallet: v.string(),
    positionId: v.optional(v.id("positions")),
    marketSlug: v.optional(v.string()),
    repayAmountUsd6: v.string(),
    seizeCollateralUsd6: v.string(),
    healthFactorWadBefore: v.union(v.string(), v.null()),
    healthFactorWadAfter: v.union(v.string(), v.null()),
    liquidationBonusBps: v.optional(v.number()),
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    at: v.number(),
  }).index("by_wallet_at", ["wallet", "at"]),

  /**
   * Recorded liquidation ACTIONS. Captures the liquidator↔victim pair: `wallet` is
   * the victim (wallet-scoped read), `liquidatorWallet` is the keeper. Indexed both
   * ways so each party can list its liquidations.
   */
  liquidationActions: defineTable({
    wallet: v.string(),
    liquidatorWallet: v.string(),
    positionId: v.optional(v.id("positions")),
    debtPositionId: v.optional(v.id("positionDebt")),
    marketSlug: v.optional(v.string()),
    repaidUsd6: v.string(),
    seizedCollateralUsd6: v.string(),
    liquidationBonusBps: v.optional(v.number()),
    healthFactorWadBefore: v.union(v.string(), v.null()),
    healthFactorWadAfter: v.union(v.string(), v.null()),
    syntheticTxHash: v.string(),
    at: v.number(),
  })
    .index("by_wallet_at", ["wallet", "at"])
    .index("by_liquidator_at", ["liquidatorWallet", "at"]),

  /**
   * Append-only portfolio time series per wallet (mirrors `PortfolioSnapshotRecord`;
   * the mock ships a 13-point series feeding the hero chart). `at` is ms-epoch
   * (mock used ISO strings). Values are plain-number USD (portfolio view-model unit).
   */
  portfolioSnapshots: defineTable({
    wallet: v.string(),
    at: v.number(),
    totalValueUsd: v.number(),
    totalSuppliedUsd: v.number(),
    totalBorrowedUsd: v.number(),
    availableToBorrowUsd: v.number(),
    totalMultiplyExposureUsd: v.number(),
    totalEarnedUsd: v.number(),
  }).index("by_wallet_at", ["wallet", "at"]),

  /** One mutable current portfolio row per wallet; hot dashboard reads never scan history. */
  portfolioCurrent: defineTable({
    wallet: v.string(),
    at: v.number(),
    totalValueUsd: v.number(),
    totalSuppliedUsd: v.number(),
    totalBorrowedUsd: v.number(),
    availableToBorrowUsd: v.number(),
    totalMultiplyExposureUsd: v.number(),
    totalEarnedUsd: v.number(),
  }).index("by_wallet", ["wallet"]),

  /**
   * Optional per-wallet session metadata: which seed version provisioned this
   * wallet's starter state, when, and last-seen. The hourly transaction rate limit
   * is enforced by counting `transactions` in the trailing hour (no counter here),
   * so this table is purely informational/bookkeeping.
   */
  sandboxSessions: defineTable({
    wallet: v.string(),
    authSubject: v.optional(v.string()),
    seedVersion: v.number(),
    seededAt: v.optional(v.number()),
    lastSeenAt: v.number(),
    /**
     * Whether the wallet has been through the umbrella-onboarding seed. Set
     * once by the onboarding claim so a second claim (or a restore/reset)
     * does not re-seed umbrella positions/balances/activity. Independent of
     * the `positions` idempotency gate because sandboxActivity + wallet
     * balances would otherwise duplicate silently.
     */
    umbrellaSeeded: v.optional(v.boolean()),
  }).index("by_wallet", ["wallet"]),

  /**
   * Live per-market umbrella state that mutates outside the frozen catalog
   * (currentDeficitUsd / deficitOffsetUsd / totalSlashedUsd). The
   * UMBRELLA_MARKETS constant in `convex/sandbox/umbrella.ts` is the catalog
   * fallback; this table is the source of truth once populated by
   * `simulateDeficit` / `simulateSlash`.
   */
  umbrellaMarketState: defineTable({
    marketId: v.string(),
    currentDeficitUsd: v.number(),
    deficitOffsetUsd: v.number(),
    totalSlashedUsd: v.number(),
    updatedAt: v.number(),
  }).index("by_market", ["marketId"]),

  /**
   * Per-wallet token balances backing the swap flow + the dashboard "Wallet" tab.
   * Mirrors app/lib/swap-system/contracts.ts UserAssetBalance so the display path
   * stops reading DEMO_SWAP_BALANCES. One row per (wallet, assetId, sourceType);
   * amount is a number (asset-native, not USD-scaled — pricing happens at render).
   *
   * sourceType discriminates where the balance sits: "wallet" is the base wallet
   * holding; "position" is claimable/withdrawable balance credited by an open
   * position (with sourcePositionId joining `positions`). Positions writes update
   * these rows so the wallet tab reflects unrealized earnings live.
   */
  walletBalances: defineTable({
    wallet: v.string(),
    assetId: v.string(),
    amount: v.number(),
    sourceType: v.union(v.literal("wallet"), v.literal("position")),
    sourcePositionId: v.optional(v.id("positions")),
    /**
     * Discriminates the asset shape inside a balance row so home + action
     * flows can filter without a join. "wallet" = plain token holding;
     * "lp" = LP-token collateral for a pool market (assetId is `lp:<marketSlug>`);
     * "returned-lp" = LP returned from a remove-collateral action, pending
     * withdrawal to the wallet. Optional so existing rows migrate lazily.
     */
    assetKind: v.optional(v.union(v.literal("wallet"), v.literal("lp"), v.literal("returned-lp"))),
    /** Display symbol so select lists render without a per-row asset lookup. */
    symbol: v.optional(v.string()),
    /**
     * USD-scaled value at 1e6 (bigint stored as string), computed at write
     * time using the row's live price. Home + action pages read this instead
     * of doing a price join per row. Refreshed by the same rollup that
     * updates `tokenPrices`.
     */
    valueUsd6: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_asset", ["wallet", "assetId"])
    .index("by_wallet_asset_kind", ["wallet", "assetKind"]),

  /**
   * Product-scoped onboarding + wallet balances. These are the source-of-truth
   * buckets for authenticated sandbox wallets; frontend `buildConvex*SessionSeed`
   * functions must not mint product funds locally.
   */
  walletLendBalances: defineTable({
    wallet: v.string(),
    marketId: v.string(),
    assetId: v.string(),
    symbol: v.string(),
    amount: v.number(),
    valueUsd: v.number(),
    state: v.union(v.literal("available"), v.literal("deposited")),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_market_state", ["wallet", "marketId", "state"]),

  walletBorrowBalances: defineTable({
    wallet: v.string(),
    marketId: v.optional(v.string()),
    assetId: v.optional(v.string()),
    poolId: v.optional(v.string()),
    symbol: v.string(),
    amount: v.number(),
    valueUsd: v.number(),
    state: v.union(v.literal("poolAvailable"), v.literal("collateral"), v.literal("debt"), v.literal("claimableFees")),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_state", ["wallet", "state"])
    .index("by_wallet_market_state", ["wallet", "marketId", "state"]),

  walletMultiplyBalances: defineTable({
    wallet: v.string(),
    marketId: v.optional(v.string()),
    assetId: v.string(),
    symbol: v.string(),
    amount: v.number(),
    valueUsd: v.number(),
    state: v.union(v.literal("available"), v.literal("collateral"), v.literal("debt"), v.literal("position")),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_asset_state", ["wallet", "assetId", "state"]),

  walletLiquidBalances: defineTable({
    wallet: v.string(),
    assetId: v.string(),
    symbol: v.string(),
    amount: v.number(),
    valueUsd: v.number(),
    state: v.literal("available"),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_asset", ["wallet", "assetId"]),

  /**
   * LP token spot price for a pool market (USD per LP token). Feeds pledge-flow
   * "you deposit N LP ≈ $X" previews across the borrow action pages. Kept per-slug
   * (not baked into marketDailyStats) because LP prices tick faster than daily
   * — snapshots update on the same interval as the market-snapshots cache.
   */
  lpTokenPrices: defineTable({
    slug: v.string(),
    /** Spot price in USD per LP token. */
    priceUsd: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  /**
   * Fee APY as a wad (1e18-scaled bigint stored as string) per market. Sourced
   * from marketDailyStats.supplyApyPct at rollup, but split into its own table so
   * the credit engine's accrual math (accrueLinearIndex) can read a stable wad
   * value without re-parsing/rounding a percentage on the hot path. Feeds
   * BorrowMarketRecord.snapshot.feeApyWad in hydrated state — currently sourced
   * from the mock catalog, target for #17's home + sidebar flip.
   */
  feeApyWads: defineTable({
    slug: v.string(),
    feeApyWad: v.string(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  // ---------------------------------------------------------------------------
  // Global reference — spokes, dexes, home content
  // ---------------------------------------------------------------------------

  /**
   * BorrowSpoke registry (currently hardcoded in `app/lib/borrow-sim.ts`
   * BORROW_SPOKES). Feeds spoke section headings, category filter (isSmartSpoke),
   * risk-model spoke labels, `getSpokeById` lookups, and SPOKE_SLUGS routing.
   */
  spokes: defineTable({
    id: v.string(),
    slug: v.string(),
    dex: v.string(),
    label: v.string(),
    description: v.string(),
    eMode: v.optional(v.string()),
    maxLtvPct: v.number(),
    aprApproxPct: v.number(),
    riskPremiumBps: v.number(),
    liquidityUsd: v.number(),
    liquidationUsdApprox: v.number(),
    bgClass: v.string(),
    textClass: v.string(),
    borrowableTokens: v.array(
      v.object({
        symbol: v.string(),
        iconUrl: v.string(),
        shortLabel: v.string(),
        bgClass: v.string(),
        textClass: v.string(),
      }),
    ),
    isSmartSpoke: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_key", ["id"])
    .index("by_slug", ["slug"]),

  /** DEX catalog (currently hardcoded BORROW_DEXES). 4 entries at seed time. */
  dexes: defineTable({
    id: v.string(),
    label: v.string(),
    tvlUsd: v.number(),
    bgClass: v.string(),
    textClass: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["id"]),

  // ---------------------------------------------------------------------------
  // Borrowable assets — global registry per (spokeId, baseAssetId)
  // ---------------------------------------------------------------------------

  /**
   * Per-spoke borrowable asset records currently derived at runtime from
   * `app/lib/borrow-system/registry.ts`. Referenced by pool + asset landing
   * rows, the "Assets You Can Borrow" section, and asset detail cross-market
   * links.
   */
  borrowAssets: defineTable({
    id: v.string(),
    spokeId: v.string(),
    baseAssetId: v.string(),
    name: v.string(),
    symbol: v.string(),
    subtitle: v.string(),
    category: v.string(),
    contextLabel: v.string(),
    displayVisual: v.object({
      symbol: v.string(),
      iconUrl: v.string(),
      shortLabel: v.string(),
      bgClass: v.string(),
      textClass: v.string(),
    }),
    baseBorrowAprPct: v.number(),
    totalCapacityUsd: v.number(),
    utilizationPct: v.number(),
    totalBorrowedUsd: v.number(),
    availableUsd: v.number(),
    reserveFactorPct: v.optional(v.number()),
    marketIds: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_key", ["id"])
    .index("by_spoke", ["spokeId"])
    .index("by_base_asset", ["baseAssetId"]),

  // ---------------------------------------------------------------------------
  // Multiply — missing tables that let detail render from Convex (constraint 6)
  // ---------------------------------------------------------------------------

  /**
   * Multiply IRM parameters. Mirrors `borrowInterestRateModels` — one row per
   * multiply market slug. Currently multiply detail renders the IRM section
   * from a client-side mock silently; this fixes that.
   */
  multiplyInterestRateModels: defineTable({
    slug: v.string(),
    optimalUtilizationPct: v.number(),
    slopeBelowOptimalPct: v.number(),
    slopeAboveOptimalPct: v.number(),
    baseBorrowRatePct: v.number(),
    source: v.optional(v.union(v.literal("seed"), v.literal("chain"))),
    txHash: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  /**
   * Per-multiply-market allocation across contributing pools. Currently
   * missing; detail renders nothing / silent mock. Same shape as the asset
   * allocation cards but keyed by multiplyMarkets.slug.
   */
  multiplyMarketAllocations: defineTable({
    marketSlug: v.string(),
    rowKey: v.string(),
    poolSlug: v.string(),
    poolName: v.string(),
    venueLabel: v.string(),
    sharePct: v.number(),
    valueUsd: v.number(),
    utilizationPct: v.number(),
    borrowAprPct: v.number(),
    collateralFactorPct: v.number(),
    updatedAt: v.number(),
  }).index("by_market", ["marketSlug"]),

  /**
   * Per-token multiply parameters (supply APY, borrow APY, available USD,
   * collateral factor, liquidation threshold) currently spread across
   * MULTIPLY_TOKEN_SUPPLY_APYS / MULTIPLY_TOKEN_BORROW_APYS /
   * MULTIPLY_TOKEN_AVAILABLE_USD / MULTIPLY_COLLATERAL_FACTORS /
   * MULTIPLY_LIQUIDATION_THRESHOLDS / MULTIPLY_TOKEN_LOGOS in `multiply-sim.ts`.
   */
  multiplyTokenParameters: defineTable({
    symbol: v.string(),
    supplyApyPct: v.number(),
    borrowAprPct: v.number(),
    availableUsd: v.number(),
    collateralFactorPct: v.number(),
    liquidationThresholdPct: v.number(),
    iconUrl: v.string(),
    updatedAt: v.number(),
  }).index("by_symbol", ["symbol"]),

  // ---------------------------------------------------------------------------
  // Contract addresses — seeded synthetic 0x… strings today, Etherscan later.
  // Split by scope (pool / asset / multiply) to keep indexes narrow.
  // ---------------------------------------------------------------------------

  poolContractAddresses: defineTable({
    poolSlug: v.string(),
    salt: v.string(),
    address: v.string(),
    label: v.string(),
    href: v.string(),
    chain: v.string(),
    isSynthetic: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_pool_salt", ["poolSlug", "salt"])
    .index("by_pool", ["poolSlug"]),

  assetContractAddresses: defineTable({
    assetSlug: v.string(),
    salt: v.string(),
    address: v.string(),
    label: v.string(),
    href: v.string(),
    chain: v.string(),
    isSynthetic: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_asset_salt", ["assetSlug", "salt"])
    .index("by_asset", ["assetSlug"]),

  multiplyContractAddresses: defineTable({
    marketSlug: v.string(),
    salt: v.string(),
    address: v.string(),
    label: v.string(),
    href: v.string(),
    chain: v.string(),
    isSynthetic: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_market_salt", ["marketSlug", "salt"])
    .index("by_market", ["marketSlug"]),

  // ---------------------------------------------------------------------------
  // Per-wallet portfolio — the "home page is the connected wallet's portfolio"
  // architecture. Test wallet is a seeded row using the "test-wallet-000"
  // convention; production wallets use hex addresses that never collide.
  // ---------------------------------------------------------------------------

  /**
   * Home page collateral cards + action-page sidebar HomeCollateralPool.
   * Currently HOME_COLLATERAL_POOLS mock keyed by home compact id.
   */
  walletCollateralPositions: defineTable({
    wallet: v.string(),
    homePoolId: v.string(),
    marketId: v.string(),
    name: v.string(),
    venueLabel: v.string(),
    category: v.string(),
    collateralUsd: v.number(),
    maxLtvPct: v.number(),
    borrowPowerUsd: v.number(),
    liquidationUsd: v.number(),
    pairAprPct: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_home_pool", ["wallet", "homePoolId"])
    .index("by_wallet_market", ["wallet", "marketId"]),

  /**
   * UI view of open debts. Currently HOME_INITIAL_DEBTS mock leaks into every
   * non-'home-demo-wallet' session; per-wallet rows fix that leak.
   */
  walletDebts: defineTable({
    wallet: v.string(),
    homePoolId: v.string(),
    marketId: v.string(),
    debtAssetId: v.string(),
    amountUsd: v.number(),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_home_pool", ["wallet", "homePoolId"]),

  /**
   * Rewards / fee claim positions on the home page. Currently HOME_CLAIM_POSITIONS
   * mock. Breakdown is an inline array so a single query renders the whole card.
   */
  walletClaimPositions: defineTable({
    wallet: v.string(),
    claimId: v.string(),
    homePoolId: v.string(),
    marketId: v.string(),
    name: v.string(),
    subtitle: v.string(),
    totalUsd: v.number(),
    breakdown: v.array(
      v.object({
        symbol: v.string(),
        amountLabel: v.string(),
        amountToken: v.number(),
        usdValue: v.number(),
        visualSymbol: v.string(),
      }),
    ),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_claim", ["wallet", "claimId"]),

  /** Per-wallet quest completion + claim state. */
  walletRewardsProgress: defineTable({
    wallet: v.string(),
    taskId: v.string(),
    status: v.string(),
    earnedAmount: v.number(),
    claimableAmount: v.number(),
    claimedAmount: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_task", ["wallet", "taskId"]),
})
