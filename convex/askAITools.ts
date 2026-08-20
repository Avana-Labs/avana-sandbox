import { v } from "convex/values"
import { ASK_AI_CONFIG, ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
import type { AskAIMarketSource } from "../app/lib/ask-ai/providers/contracts"
import {
  calculateLendProjection,
  calculateAskAIBorrowSimulation,
  calculateAskAICollateralStress,
  calculateMultiplyStress,
  decodeBorrowRiskSnapshot,
  deriveAskAIUmbrellaStatus,
} from "../app/lib/ask-ai/engine-calculations"
import { query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { getAuthedWallet } from "./sandbox/auth"

type PortfolioReadCtx = Pick<QueryCtx | MutationCtx, "auth" | "db">

export async function readAskAIPortfolio(ctx: PortfolioReadCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }

  const [lend, borrow, multiply, liquid, umbrella] = await Promise.all([
    ctx.db
      .query("walletLendBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletBorrowBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletMultiplyBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletLiquidBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("positions")
      .withIndex("by_wallet_product", (q) => q.eq("wallet", wallet).eq("product", "umbrella"))
      .collect(),
  ])

  const sumUsd = (rows: readonly { valueUsd: number }[]) => rows.reduce((sum, row) => sum + row.valueUsd, 0)
  const umbrellaSuppliedUsd = umbrella.reduce(
    (sum, position) => sum + Number(position.suppliedUsd6 ?? "0") / 1_000_000,
    0,
  )

  return {
    walletRequired: false as const,
    wallet,
    totals: {
      lendUsd: sumUsd(lend),
      borrowUsd: sumUsd(borrow),
      multiplyUsd: sumUsd(multiply),
      liquidUsd: sumUsd(liquid),
      umbrellaUsd: umbrellaSuppliedUsd,
    },
    lend,
    borrow,
    multiply,
    liquid,
    umbrella,
    asOf: Math.max(
      0,
      ...lend.map((row) => row.updatedAt),
      ...borrow.map((row) => row.updatedAt),
      ...multiply.map((row) => row.updatedAt),
      ...liquid.map((row) => row.updatedAt),
      ...umbrella.map((row) => row.lastUpdatedAt),
    ),
  }
}

export const portfolio = query({
  args: {},
  handler: readAskAIPortfolio,
})

export async function readAskAIEngineSnapshot(
  ctx: PortfolioReadCtx,
  { multiplyShockPct, lendProjectionDays }: { multiplyShockPct?: number; lendProjectionDays?: number },
) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }

  const [positions, borrowRisk, multiplyParameters] = await Promise.all([
    ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("riskSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .first(),
    ctx.db.query("multiplyTokenParameters").collect(),
  ])

  const parameterBySymbol = new Map(multiplyParameters.map((row) => [row.symbol.toLowerCase(), row]))
  const now = Date.now()
  const lendDays = Math.min(Math.max(lendProjectionDays ?? 30, 1), 365)
  const shockPct = Math.min(Math.max(multiplyShockPct ?? -20, -95), 100)

  return {
    walletRequired: false as const,
    wallet,
    borrow: borrowRisk
      ? {
          engine: "credit-engine" as const,
          at: borrowRisk.at,
          ...decodeBorrowRiskSnapshot(borrowRisk),
          spokes: borrowRisk.spokes.map((spoke) => ({
            spokeId: spoke.spokeId,
            availableCreditUsd: Number(spoke.availableCreditUsd6) / 1_000_000,
            totalBorrowedUsd: Number(spoke.totalBorrowedUsd6) / 1_000_000,
            liquidationBufferUsd: Number(spoke.liquidationBufferUsd6) / 1_000_000,
            healthFactor:
              spoke.healthFactorWad === null ? null : Number(spoke.healthFactorWad) / 1_000_000_000_000_000_000,
          })),
        }
      : null,
    lend: positions
      .filter((position) => position.product === "lend" && position.status === "open")
      .map((position) => {
        const principalUsd = Number(position.suppliedUsd6 ?? "0") / 1_000_000
        return {
          engine: "lend-engine" as const,
          marketSlug: position.marketSlug,
          principalUsd,
          earnedUsd: Number(position.earnedUsd6 ?? "0") / 1_000_000,
          projection: calculateLendProjection({
            principalUsd,
            supplyApyPct: position.supplyApyPct ?? 0,
            days: lendDays,
          }),
        }
      }),
    multiply: positions
      .filter((position) => position.product === "multiply" && position.status === "open")
      .map((position) => {
        const parameters = parameterBySymbol.get((position.assetId ?? "").toLowerCase())
        return {
          engine: "multiply-engine" as const,
          marketSlug: position.marketSlug,
          collateralValueUsd: position.collateralValueUsd ?? 0,
          debtValueUsd: position.debtValueUsd ?? 0,
          persistedHealthFactor: position.healthFactor ?? null,
          stress: parameters
            ? calculateMultiplyStress({
                collateralValueUsd: position.collateralValueUsd ?? 0,
                debtValueUsd: position.debtValueUsd ?? 0,
                liquidationThresholdPct: parameters.liquidationThresholdPct,
                collateralPriceShockPct: shockPct,
              })
            : null,
          stressUnavailableReason: parameters ? null : "Missing multiply token risk parameters",
        }
      }),
    umbrella: positions
      .filter((position) => position.product === "umbrella")
      .map((position) => ({
        engine: "umbrella-system" as const,
        marketSlug: position.marketSlug,
        suppliedUsd: Number(position.suppliedUsd6 ?? "0") / 1_000_000,
        earnedUsd: Number(position.earnedUsd6 ?? "0") / 1_000_000,
        cooldownUsd: Number(position.cooldownAmountUsd6 ?? "0") / 1_000_000,
        slashedUsd: Number(position.slashedAmountUsd6 ?? "0") / 1_000_000,
        status: deriveAskAIUmbrellaStatus({ ...position, now }),
      })),
    asOf: Math.max(0, borrowRisk?.at ?? 0, ...positions.map((position) => position.lastUpdatedAt)),
  }
}

export const engineSnapshot = query({
  args: { multiplyShockPct: v.optional(v.number()), lendProjectionDays: v.optional(v.number()) },
  handler: readAskAIEngineSnapshot,
})

export async function readAskAIBorrowCapacity(ctx: PortfolioReadCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const snapshot = await ctx.db
    .query("riskSnapshots")
    .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
    .order("desc")
    .first()
  return {
    walletRequired: false as const,
    wallet,
    capacity: snapshot ? decodeBorrowRiskSnapshot(snapshot) : null,
    spokes: snapshot?.spokes ?? [],
    asOf: snapshot?.at ?? 0,
  }
}

export const borrowCapacity = query({ args: {}, handler: readAskAIBorrowCapacity })

export async function readAskAIPositionRisk(ctx: PortfolioReadCtx, positionId?: string) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const selected = positionId ? positions.find((position) => position._id === positionId) : undefined
  if (positionId && !selected) throw new Error("Position not found")
  const relevant = selected ? [selected] : positions.filter((position) => position.status === "open")
  const engine = await readAskAIEngineSnapshot(ctx, { multiplyShockPct: -20 })
  return { walletRequired: false as const, wallet, positions: relevant, engine, asOf: engine.asOf }
}

export const positionRisk = query({
  args: { positionId: v.optional(v.string()) },
  handler: async (ctx, { positionId }) => readAskAIPositionRisk(ctx, positionId),
})

export const simulateBorrow = query({
  args: {
    positionId: v.string(),
    additionalBorrowAmount: v.number(),
    borrowAsset: v.string(),
  },
  handler: async (ctx, { positionId, additionalBorrowAmount, borrowAsset }) => {
    if (
      !Number.isFinite(additionalBorrowAmount) ||
      additionalBorrowAmount <= 0 ||
      additionalBorrowAmount > 1_000_000_000
    )
      throw new Error("Additional borrow amount is invalid")
    const wallet = await getAuthedWallet(ctx)
    if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect()
    const position = positions.find((row) => row._id === positionId && row.status === "open")
    if (!position) throw new Error("Position not found")
    const market = await ctx.db
      .query("borrowMarkets")
      .withIndex("by_slug", (q) => q.eq("slug", position.marketSlug))
      .unique()
    if (!market?.maxLtvPct) throw new Error("Position risk parameters are unavailable")
    const collateralValueUsd = position.collateralValueUsd ?? Number(position.collateralValueUsd6 ?? "0") / 1_000_000
    const debtValueUsd = position.debtValueUsd ?? Number(position.debtValueUsd6 ?? "0") / 1_000_000
    return {
      walletRequired: false as const,
      positionId,
      borrowAsset: borrowAsset.trim().toUpperCase(),
      additionalBorrowAmount,
      simulation: calculateAskAIBorrowSimulation({
        collateralValueUsd,
        debtValueUsd,
        additionalBorrowAmountUsd: additionalBorrowAmount,
        maxLtvPct: market.maxLtvPct,
      }),
      asOf: position.lastUpdatedAt,
    }
  },
})

export const stressPosition = query({
  args: {
    positionId: v.string(),
    assetPriceChanges: v.array(v.object({ symbol: v.string(), change: v.number() })),
  },
  handler: async (ctx, { positionId, assetPriceChanges }) => {
    if (assetPriceChanges.length < 1 || assetPriceChanges.length > 8)
      throw new Error("Provide 1 to 8 asset price changes")
    for (const item of assetPriceChanges)
      if (!Number.isFinite(item.change) || item.change < -0.95 || item.change > 1)
        throw new Error("Asset price change must be between -0.95 and 1")
    const wallet = await getAuthedWallet(ctx)
    if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect()
    const position = positions.find((row) => row._id === positionId && row.status === "open")
    if (!position) throw new Error("Position not found")
    const market = (await ctx.db.query("markets").collect()).find((row) => row.slug === position.marketSlug)
    const parameter = position.assetId
      ? await ctx.db
          .query("multiplyTokenParameters")
          .withIndex("by_symbol", (q) => q.eq("symbol", position.assetId!))
          .unique()
      : null
    const constituents = market?.constituents ?? (position.assetId ? [{ symbol: position.assetId, weight: 1 }] : [])
    const liquidationThresholdPct = parameter?.liquidationThresholdPct
    if (constituents.length === 0 || liquidationThresholdPct === undefined)
      throw new Error("Position risk parameters are unavailable")
    return {
      walletRequired: false as const,
      positionId,
      simulation: calculateAskAICollateralStress({
        collateralValueUsd: position.collateralValueUsd ?? Number(position.collateralValueUsd6 ?? "0") / 1_000_000,
        debtValueUsd: position.debtValueUsd ?? Number(position.debtValueUsd6 ?? "0") / 1_000_000,
        liquidationThresholdPct,
        constituents,
        assetPriceChanges: Object.fromEntries(
          assetPriceChanges.map(({ symbol, change }) => [symbol.toUpperCase(), change]),
        ),
      }),
      asOf: position.lastUpdatedAt,
    }
  },
})

export const markets = query({
  args: {
    scope: v.optional(v.union(v.literal("asset"), v.literal("pool"), v.literal("lend"), v.literal("multiply"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { scope, limit }) => {
    const boundedLimit = Math.min(Math.max(limit ?? 20, 1), 50)
    const rows = scope
      ? await ctx.db
          .query("markets")
          .withIndex("by_scope_chain", (q) => q.eq("scope", scope))
          .take(boundedLimit)
      : await ctx.db.query("markets").take(boundedLimit)
    return rows.map((market) => ({
      slug: market.slug,
      scope: market.scope,
      name: market.name,
      symbol: market.symbol,
      chainId: market.chainId,
      venueLabel: market.venueLabel,
      feeTier: market.feeTier,
      maxLtvPct: market.maxLtvPct,
      priceUsd: market.priceUsd,
    }))
  },
})

export async function readAskAIMarketSnapshots(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  {
    sources,
    kind,
    limit,
  }: {
    sources?: AskAIMarketSource[]
    kind?: "token_price" | "dex_pool" | "lending_market"
    limit?: number
  },
) {
  const boundedLimit = Math.min(Math.max(limit ?? 10, 1), 50)
  const rows = sources
    ? (
        await Promise.all(
          sources.map((source) =>
            kind
              ? ctx.db
                  .query("askAIMarketSnapshots")
                  .withIndex("by_source_kind_key", (q) => q.eq("source", source).eq("kind", kind))
                  .take(boundedLimit)
              : ctx.db
                  .query("askAIMarketSnapshots")
                  .withIndex("by_source_kind_key", (q) => q.eq("source", source))
                  .take(boundedLimit),
          ),
        )
      ).flat()
    : await ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(boundedLimit)
  return rows
    .filter((row) => !kind || row.kind === kind)
    .filter((row) => marketFreshness(row.kind, row.sourceUpdatedAt ?? row.fetchedAt, Date.now()) === "fresh")
    .sort((left, right) => right.fetchedAt - left.fetchedAt)
    .slice(0, boundedLimit)
}

export const marketSnapshots = query({
  args: {
    sources: v.optional(
      v.array(
        v.union(
          v.literal("coingecko"),
          v.literal("defillama"),
          v.literal("uniswap"),
          v.literal("curve"),
          v.literal("balancer"),
          v.literal("aave"),
        ),
      ),
    ),
    kind: v.optional(v.union(v.literal("token_price"), v.literal("dex_pool"), v.literal("lending_market"))),
    limit: v.optional(v.number()),
  },
  handler: readAskAIMarketSnapshots,
})

export function marketFreshness(kind: "token_price" | "dex_pool" | "lending_market", at: number, now = Date.now()) {
  const threshold =
    kind === "dex_pool"
      ? ASK_AI_CONFIG.freshness.poolMetricsStaleAfterMs
      : kind === "lending_market"
        ? ASK_AI_CONFIG.freshness.aaveMarketStaleAfterMs
        : ASK_AI_CONFIG.freshness.tokenPriceStaleAfterMs
  return now - at <= threshold ? ("fresh" as const) : ("stale" as const)
}

export const searchMarkets = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query: rawQuery, limit }) => {
    const queryText = rawQuery.trim().toLowerCase()
    if (!queryText || queryText.length > 200) throw new Error("Market query must contain 1 to 200 characters")
    const boundedLimit = Math.min(Math.max(limit ?? 10, 1), 20)
    const [markets, snapshots, tokenPrices] = await Promise.all([
      ctx.db.query("markets").collect(),
      ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(100),
      ctx.db.query("tokenPrices").collect(),
    ])
    const terms = queryText.split(/[\s/,-]+/).filter(Boolean)
    const matchingMarkets = markets
      .filter((market) => {
        const haystack = `${market.slug} ${market.name} ${market.symbol} ${market.venueLabel ?? ""}`.toLowerCase()
        return terms.every((term) => haystack.includes(term))
      })
      .slice(0, boundedLimit)
    const matchingCanonicalPrices = tokenPrices
      .filter((price) => terms.some((term) => price.symbol.toLowerCase().includes(term)))
      .filter((price) => price.status !== "invalid")
      .slice(0, boundedLimit)
      .map((price) => ({
        source: "defillama" as const,
        kind: "token_price" as const,
        key: price.symbol,
        data: {
          symbol: price.symbol,
          usd: price.priceUsd,
          confidence: price.confidence,
          status: price.status,
        },
        asOf: price.sourceUpdatedAt ?? price.updatedAt,
        freshness: price.status === "fresh" ? ("fresh" as const) : ("stale" as const),
      }))
    const matchingSnapshots = snapshots
      .filter((snapshot) => {
        const haystack = `${snapshot.key} ${snapshot.source}`.toLowerCase()
        return terms.some((term) => haystack.includes(term))
      })
      .filter((snapshot) => marketFreshness(snapshot.kind, snapshot.sourceUpdatedAt ?? snapshot.fetchedAt) === "fresh")
      .slice(0, boundedLimit)
      .map((snapshot) => ({
        source: snapshot.source,
        kind: snapshot.kind,
        key: snapshot.key,
        data: snapshot.payload,
        asOf: snapshot.sourceUpdatedAt ?? snapshot.fetchedAt,
        freshness: marketFreshness(snapshot.kind, snapshot.sourceUpdatedAt ?? snapshot.fetchedAt),
      }))
    return {
      markets: matchingMarkets,
      providerData: [...matchingCanonicalPrices, ...matchingSnapshots].slice(0, boundedLimit),
    }
  },
})

export const poolMetrics = query({
  args: { marketId: v.string() },
  handler: async (ctx, { marketId }) => {
    const normalizedId = marketId.trim().toLowerCase()
    if (!normalizedId || normalizedId.length > 160) throw new Error("Market ID is invalid")
    const [markets, snapshots] = await Promise.all([
      ctx.db.query("markets").collect(),
      ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(100),
    ])
    const market = markets.find(
      (row) => row.slug.toLowerCase() === normalizedId || row.symbol.toLowerCase() === normalizedId,
    )
    const aliases = new Set([normalizedId, market?.slug.toLowerCase(), market?.symbol.toLowerCase()].filter(Boolean))
    const providerData = snapshots
      .filter((snapshot) => snapshot.kind === "dex_pool" && aliases.has(snapshot.key.toLowerCase()))
      .filter((snapshot) => marketFreshness("dex_pool", snapshot.sourceUpdatedAt ?? snapshot.fetchedAt) === "fresh")
      .map((snapshot) => ({
        source: snapshot.source,
        data: snapshot.payload,
        asOf: snapshot.sourceUpdatedAt ?? snapshot.fetchedAt,
        freshness: marketFreshness("dex_pool", snapshot.sourceUpdatedAt ?? snapshot.fetchedAt),
      }))
    if (!market && providerData.length === 0) throw new Error("Market not found")
    return { market: market ?? null, providerData }
  },
})
