import { v } from "convex/values"
import { ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
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
