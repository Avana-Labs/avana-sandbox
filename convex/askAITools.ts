import { v } from "convex/values"
import { ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
import {
  calculateLendProjection,
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

export const engineSnapshot = query({
  args: { multiplyShockPct: v.optional(v.number()), lendProjectionDays: v.optional(v.number()) },
  handler: async (ctx, { multiplyShockPct, lendProjectionDays }) => {
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
