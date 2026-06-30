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

/** Scope differentiates an asset (single borrowable token), a pool (LP collateral
 *  market), a lend market (single-asset supply market), and a multiply market
 *  (leveraged collateral→borrow loop). */
export const MARKET_SCOPES = ["asset", "pool", "lend", "multiply"] as const
const marketScope = v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply"))

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
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    spokeId: v.optional(v.string()),
    feeTier: v.optional(v.string()),
    maxLtvPct: v.optional(v.number()),
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

  /**
   * Shared, multi-user market liquidity ledger. Every borrow / repay / supply /
   * withdraw from ANY client increments one aggregate row per market, and every
   * client subscribes (see `convex/liquidity.ts`) and layers these deltas onto the
   * base catalog so liquidity stats move with aggregate activity across all users
   * instead of staying frozen. One row per market keeps reads O(#markets).
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
    source: v.string(),
    updatedAt: v.number(),
  }).index("by_symbol", ["symbol"]),

  /**
   * Static per-market editorial content: the About description + on-chain stats,
   * the parameter-change history, and the General FAQs. Seeded from the shared
   * generators so the detail page reads About / Parameter Changes / FAQs from
   * Convex like everything else. One row per market.
   */
  marketContent: defineTable({
    marketId: v.id("markets"),
    description: v.string(),
    stats: v.array(v.object({ label: v.string(), value: v.string(), href: v.optional(v.string()) })),
    history: v.array(v.object({ date: v.string(), title: v.string(), description: v.optional(v.string()) })),
    faqs: v.array(v.object({ question: v.string(), answer: v.string() })),
  }).index("by_market", ["marketId"]),

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
    preferences: v.optional(v.object({ theme: v.optional(v.string()), currency: v.optional(v.string()) })),
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
  }).index("by_wallet_at", ["wallet", "at"]),

  /** Wallet-scoped rewards engine state for reactive sandbox rehydration. */
  sandboxRewards: defineTable({
    wallet: v.string(),
    stateJson: v.string(),
    updatedAt: v.number(),
  }).index("by_wallet", ["wallet"]),

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
      }),
    ),
    maxLtvPct: v.number(),
    liquidationThresholdPct: v.optional(v.number()),
    pairAprPct: v.number(),
    lpTokenPriceUsd: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  /**
   * Open/closed position, one row per (wallet, product, market). Unified across
   * products via a `product` discriminator: borrow & lend carry usd6 *string*
   * fields; multiply is number-native (mirrors `MultiplyPosition`, incl. the
   * "infinity" health-factor sentinel and nullable liquidationPrice). Child
   * collateral/debt detail lives in `positionCollateral` / `positionDebt`.
   */
  positions: defineTable({
    wallet: v.string(),
    product: v.union(v.literal("borrow"), v.literal("multiply"), v.literal("lend")),
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
  })
    .index("by_wallet", ["wallet"])
    .index("by_wallet_product", ["wallet", "product"])
    .index("by_wallet_market", ["wallet", "marketSlug"]),

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
    product: v.union(v.literal("borrow"), v.literal("lend"), v.literal("multiply")),
    /** deposit | withdraw | borrow | repay | claim | liquidate | multiply | deleverage */
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
    syntheticTxHash: v.string(),
    simulated: v.boolean(),
    at: v.number(),
  })
    .index("by_wallet_at", ["wallet", "at"])
    .index("by_wallet_intent", ["wallet", "intentId"])
    .index("by_market_at", ["marketSlug", "at"]),

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
  }).index("by_wallet", ["wallet"]),
})
