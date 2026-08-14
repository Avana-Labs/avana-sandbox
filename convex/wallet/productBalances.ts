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

const OPEN_GATE_LIQUID_ROWS: Array<Infer<typeof liquidRow>> = [
  { assetId: "eth", symbol: "ETH", amount: 0.012, valueUsd: 23.208, state: "available" },
  { assetId: "usdc", symbol: "USDC", amount: 840, valueUsd: 840, state: "available" },
  { assetId: "link", symbol: "LINK", amount: 24, valueUsd: 432, state: "available" },
]

const OPEN_GATE_LEND_ROWS: Array<Infer<typeof lendRow>> = [
  { marketId: "usdc", assetId: "usdc", symbol: "USDC", amount: 840, valueUsd: 840, state: "available" },
]

const OPEN_GATE_BORROW_ROWS: Array<Infer<typeof borrowRow>> = [
  {
    marketId: "uni-v3-bluechip-weth-usdc",
    poolId: "eth-usdc-lp",
    symbol: "ETH / USDC LP",
    amount: 6.4,
    valueUsd: 800,
    state: "poolAvailable",
  },
]

const OPEN_GATE_MULTIPLY_ROWS: Array<Infer<typeof multiplyRow>> = [
  { marketId: "aave-gho", assetId: "aave", symbol: "AAVE", amount: 0, valueUsd: 0, state: "available" },
]

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
    const [lend, borrow, multiply, liquid] = await Promise.all([
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
    ])

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

    const hasInvalidMultiplyAvailable = multiply.some((row) => row.state === "available" && row.valueUsd > 100_000)
    if (
      lend.length > 0 &&
      borrow.length > 0 &&
      multiply.length > 0 &&
      liquid.length > 0 &&
      !hasInvalidMultiplyAvailable
    ) {
      return { seeded: false as const }
    }

    return replaceProductBalanceRows(ctx, wallet, {
      liquid: liquid.length > 0 ? undefined : OPEN_GATE_LIQUID_ROWS,
      lend: lend.length > 0 ? undefined : OPEN_GATE_LEND_ROWS,
      borrow: borrow.length > 0 ? undefined : OPEN_GATE_BORROW_ROWS,
      multiply: multiply.length > 0 && !hasInvalidMultiplyAvailable ? undefined : OPEN_GATE_MULTIPLY_ROWS,
    })
  },
})
