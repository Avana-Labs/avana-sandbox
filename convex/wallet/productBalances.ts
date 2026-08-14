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

const OPEN_GATE_BORROW_MARKET = "uni-v3-bluechip-weth-usdc"
const OPEN_GATE_BORROW_VALUE_USD = 800

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

function usd6ToNumber(value: string | undefined): number {
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed / 1_000_000 : 0
}

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
    const hasInvalidBorrowPoolRows = borrow.some(
      (row) => (row.state === "poolAvailable" || row.state === "collateral") && row.poolId === row.marketId,
    )
    const openGateBorrowPosition = await ctx.db
      .query("positions")
      .withIndex("by_wallet_product_market", (q) =>
        q.eq("wallet", wallet).eq("product", "borrow").eq("marketSlug", OPEN_GATE_BORROW_MARKET),
      )
      .filter((q) => q.eq(q.field("status"), "open"))
      .first()
    const openGateCollateral = openGateBorrowPosition
      ? await ctx.db
          .query("positionCollateral")
          .withIndex("by_position", (q) => q.eq("positionId", openGateBorrowPosition._id))
          .first()
      : null
    const openGatePledgedUsd = Math.min(
      OPEN_GATE_BORROW_VALUE_USD,
      Math.max(0, usd6ToNumber(openGateCollateral?.collateralValueUsd6 ?? openGateBorrowPosition?.collateralValueUsd6)),
    )
    const openGateBorrowValue = borrow
      .filter(
        (row) =>
          row.marketId === OPEN_GATE_BORROW_MARKET && (row.state === "poolAvailable" || row.state === "collateral"),
      )
      .reduce((sum, row) => sum + row.valueUsd, 0)
    const openGateProductPledgedUsd = borrow
      .filter((row) => row.marketId === OPEN_GATE_BORROW_MARKET && row.state === "collateral")
      .reduce((sum, row) => sum + row.valueUsd, 0)
    const hasOverstatedOpenGateBorrow = openGateBorrowValue > OPEN_GATE_BORROW_VALUE_USD + 0.01
    const hasMismatchedOpenGateBorrow = Math.abs(openGateProductPledgedUsd - openGatePledgedUsd) > 0.01
    const buildBorrowRepairRows = async () => {
      const pledgedUsd = openGatePledgedUsd
      if (pledgedUsd <= 0) return OPEN_GATE_BORROW_ROWS
      const availableUsd = Math.max(0, OPEN_GATE_BORROW_VALUE_USD - pledgedUsd)
      return [
        {
          ...OPEN_GATE_BORROW_ROWS[0]!,
          amount: availableUsd / 125,
          valueUsd: availableUsd,
          state: "poolAvailable" as const,
        },
        {
          ...OPEN_GATE_BORROW_ROWS[0]!,
          amount: pledgedUsd / 125,
          valueUsd: pledgedUsd,
          state: "collateral" as const,
        },
      ]
    }
    if (
      lend.length > 0 &&
      borrow.length > 0 &&
      multiply.length > 0 &&
      liquid.length > 0 &&
      !hasInvalidMultiplyAvailable &&
      !hasInvalidBorrowPoolRows &&
      !hasOverstatedOpenGateBorrow &&
      !hasMismatchedOpenGateBorrow
    ) {
      return { seeded: false as const }
    }

    return replaceProductBalanceRows(ctx, wallet, {
      liquid: liquid.length > 0 ? undefined : OPEN_GATE_LIQUID_ROWS,
      lend: lend.length > 0 ? undefined : OPEN_GATE_LEND_ROWS,
      borrow:
        borrow.length > 0 && !hasInvalidBorrowPoolRows && !hasOverstatedOpenGateBorrow && !hasMismatchedOpenGateBorrow
          ? undefined
          : await buildBorrowRepairRows(),
      multiply: multiply.length > 0 && !hasInvalidMultiplyAvailable ? undefined : OPEN_GATE_MULTIPLY_ROWS,
    })
  },
})
