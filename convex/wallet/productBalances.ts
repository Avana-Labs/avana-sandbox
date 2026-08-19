import { v, type Infer } from "convex/values"
import type { MutationCtx } from "../_generated/server"
import { internalMutation, mutation, query } from "../_generated/server"
import { requireSandboxWallet } from "../sandbox/auth"

const lendState = v.union(v.literal("available"), v.literal("deposited"))
const borrowState = v.union(
  v.literal("poolAvailable"),
  v.literal("collateral"),
  v.literal("debt"),
  v.literal("claimableFees"),
)
const multiplyState = v.union(v.literal("available"), v.literal("collateral"), v.literal("debt"), v.literal("position"))

const lendRow = v.object({
  marketId: v.string(),
  assetId: v.string(),
  symbol: v.string(),
  amount: v.number(),
  valueUsd: v.number(),
  state: lendState,
})

const borrowRow = v.object({
  marketId: v.optional(v.string()),
  assetId: v.optional(v.string()),
  poolId: v.optional(v.string()),
  symbol: v.string(),
  amount: v.number(),
  valueUsd: v.number(),
  state: borrowState,
})

const multiplyRow = v.object({
  marketId: v.optional(v.string()),
  assetId: v.string(),
  symbol: v.string(),
  amount: v.number(),
  valueUsd: v.number(),
  state: multiplyState,
})

const liquidRow = v.object({
  assetId: v.string(),
  symbol: v.string(),
  amount: v.number(),
  valueUsd: v.number(),
  state: v.literal("available"),
})

type ProductBucket = "lend" | "borrow" | "multiply" | "liquid"

async function clearBucket(ctx: MutationCtx, wallet: string, bucket: ProductBucket) {
  const table =
    bucket === "lend"
      ? "walletLendBalances"
      : bucket === "borrow"
        ? "walletBorrowBalances"
        : bucket === "multiply"
          ? "walletMultiplyBalances"
          : "walletLiquidBalances"
  const rows = await ctx.db
    .query(table)
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  for (const row of rows) await ctx.db.delete(row._id)
  return rows.length
}

export async function replaceProductBalanceRows(
  ctx: MutationCtx,
  wallet: string,
  rows: {
    lend?: Array<Infer<typeof lendRow>>
    borrow?: Array<Infer<typeof borrowRow>>
    multiply?: Array<Infer<typeof multiplyRow>>
    liquid?: Array<Infer<typeof liquidRow>>
  },
) {
  const now = Date.now()
  const deleted =
    (rows.lend ? await clearBucket(ctx, wallet, "lend") : 0) +
    (rows.borrow ? await clearBucket(ctx, wallet, "borrow") : 0) +
    (rows.multiply ? await clearBucket(ctx, wallet, "multiply") : 0) +
    (rows.liquid ? await clearBucket(ctx, wallet, "liquid") : 0)

  for (const row of rows.lend ?? []) await ctx.db.insert("walletLendBalances", { ...row, wallet, updatedAt: now })
  for (const row of rows.borrow ?? []) await ctx.db.insert("walletBorrowBalances", { ...row, wallet, updatedAt: now })
  for (const row of rows.multiply ?? [])
    await ctx.db.insert("walletMultiplyBalances", { ...row, wallet, updatedAt: now })
  for (const row of rows.liquid ?? []) await ctx.db.insert("walletLiquidBalances", { ...row, wallet, updatedAt: now })

  return {
    deleted,
    written:
      (rows.lend?.length ?? 0) + (rows.borrow?.length ?? 0) + (rows.multiply?.length ?? 0) + (rows.liquid?.length ?? 0),
  }
}

export const listForWallet = query({
  args: { wallet: v.string() },
  handler: async (ctx, { wallet }) => {
    const authed = await requireSandboxWallet(ctx, wallet)
    const [lend, rawBorrow, multiply, liquid, borrowPositions] = await Promise.all([
      ctx.db
        .query("walletLendBalances")
        .withIndex("by_wallet", (q) => q.eq("wallet", authed))
        .collect(),
      ctx.db
        .query("walletBorrowBalances")
        .withIndex("by_wallet", (q) => q.eq("wallet", authed))
        .collect(),
      ctx.db
        .query("walletMultiplyBalances")
        .withIndex("by_wallet", (q) => q.eq("wallet", authed))
        .collect(),
      ctx.db
        .query("walletLiquidBalances")
        .withIndex("by_wallet", (q) => q.eq("wallet", authed))
        .collect(),
      ctx.db
        .query("positions")
        .withIndex("by_wallet_product", (q) => q.eq("wallet", authed).eq("product", "borrow"))
        .collect(),
    ])

    const pledgedByMarket = new Map<string, { valueUsd: number; updatedAt: number }>()
    for (const position of borrowPositions) {
      if (position.status !== "open") continue
      const legs = await ctx.db
        .query("positionCollateral")
        .withIndex("by_position", (q) => q.eq("positionId", position._id))
        .collect()
      const valueUsd = Math.max(
        0,
        Number(position.collateralValueUsd6 ?? "0") / 1_000_000,
        ...legs.map((leg) => Number(leg.collateralValueUsd6 ?? "0") / 1_000_000),
      )
      const existing = pledgedByMarket.get(position.marketSlug)
      if (!existing || position.lastUpdatedAt >= existing.updatedAt) {
        pledgedByMarket.set(position.marketSlug, { valueUsd, updatedAt: position.lastUpdatedAt })
      }
    }
    const poolTotals = new Map<string, number>()
    for (const row of rawBorrow) {
      if (!row.marketId || (row.state !== "poolAvailable" && row.state !== "collateral")) continue
      poolTotals.set(row.marketId, (poolTotals.get(row.marketId) ?? 0) + row.valueUsd)
    }

    // Reprice borrow-collateral LP value at the pool's LIVE LP price rather than the
    // frozen claim-time USD. `markets.priceUsd` (scope "pool") is Σ(weightᵢ × priceᵢ)
    // refreshed from the token oracle (convex/prices.ts refreshPoolLpPrices), the same
    // basis the credit engine / borrow tab use — so a fall in a collateral token now
    // shows up in Net Value here and the two surfaces reconcile. We scale the frozen
    // split by liveLp / claimLp: the per-pool claim price comes from the collateral row
    // (valueUsd / amount), which is the one row carrying a reliable unit count. Falls back
    // to the frozen basis when the pool has no live price (e.g. an unpriced constituent)
    // or no claim-price anchor, so unpriced pools degrade gracefully instead of zeroing.
    const poolSlugs = [...new Set(rawBorrow.map((row) => row.marketId).filter((slug): slug is string => Boolean(slug)))]
    const poolMarkets = await Promise.all(
      poolSlugs.map((slug) =>
        ctx.db
          .query("markets")
          .withIndex("by_scope_slug", (q) => q.eq("scope", "pool").eq("slug", slug))
          .unique(),
      ),
    )
    const liveLpBySlug = new Map<string, number>()
    for (const market of poolMarkets) {
      if (market && typeof market.priceUsd === "number" && Number.isFinite(market.priceUsd) && market.priceUsd > 0) {
        liveLpBySlug.set(market.slug, market.priceUsd)
      }
    }
    const claimLpBySlug = new Map<string, number>()
    for (const row of rawBorrow) {
      if (row.state !== "collateral" || !row.marketId) continue
      if (row.amount > 0 && row.valueUsd > 0) claimLpBySlug.set(row.marketId, row.valueUsd / row.amount)
    }

    const borrow = rawBorrow.map((row) => {
      if (!row.marketId || (row.state !== "poolAvailable" && row.state !== "collateral")) return row
      const pledgedUsd = Math.min(poolTotals.get(row.marketId) ?? 0, pledgedByMarket.get(row.marketId)?.valueUsd ?? 0)
      const frozenValueUsd =
        row.state === "collateral" ? pledgedUsd : Math.max(0, (poolTotals.get(row.marketId) ?? 0) - pledgedUsd)
      const claimPrice = row.amount > 0 && row.valueUsd > 0 ? row.valueUsd / row.amount : 1

      const liveLp = liveLpBySlug.get(row.marketId)
      const claimLp = claimLpBySlug.get(row.marketId)
      if (liveLp !== undefined && claimLp !== undefined && claimLp > 0) {
        const valueUsd = frozenValueUsd * (liveLp / claimLp)
        return { ...row, valueUsd, amount: valueUsd / liveLp }
      }
      return { ...row, valueUsd: frozenValueUsd, amount: claimPrice > 0 ? frozenValueUsd / claimPrice : frozenValueUsd }
    })

    return {
      lend,
      borrow,
      multiply,
      liquid,
    }
  },
})

export const replaceForWallet = internalMutation({
  args: {
    wallet: v.string(),
    lend: v.optional(v.array(lendRow)),
    borrow: v.optional(v.array(borrowRow)),
    multiply: v.optional(v.array(multiplyRow)),
    liquid: v.optional(v.array(liquidRow)),
  },
  handler: async (ctx, { wallet, lend, borrow, multiply, liquid }) =>
    replaceProductBalanceRows(ctx, wallet, { lend, borrow, multiply, liquid }),
})

export const ensureOpenGateBalances = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const [lend, borrow, multiply, liquid] = await Promise.all([
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
    ])

    return {
      seeded: false as const,
      initialized: lend.length > 0 || borrow.length > 0 || multiply.length > 0 || liquid.length > 0,
    }
  },
})
