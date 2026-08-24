import { v } from "convex/values"
import { internalMutation } from "../_generated/server"

function sameNumber(left: number, right: number) {
  return Math.abs(left - right) <= Math.max(1e-9, Math.abs(right) * 1e-9)
}

/**
 * Dry-run-first, paginated migration from sandboxBalances into the two retained
 * wallet ledgers. Only missing rows are inserted; existing rows are never overwritten.
 * Application code never invokes this migration automatically.
 */
export const migrateSandboxBalancePage = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
    execute: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("sandboxBalances").paginate({
      cursor: args.cursor ?? null,
      numItems: Math.min(Math.max(Math.trunc(args.batchSize ?? 100), 1), 250),
    })
    let walletBalancesInserted = 0
    let liquidBalancesInserted = 0
    let missingWalletBalances = 0
    let missingLiquidBalances = 0
    let alreadyCovered = 0
    const conflicts: Array<{
      wallet: string
      assetId: string
      table: "walletBalances" | "walletLiquidBalances"
      targetUpdatedAt: number
      sourceUpdatedAt: number
    }> = []

    for (const source of page.page) {
      const [walletRows, liquidRows] = await Promise.all([
        ctx.db
          .query("walletBalances")
          .withIndex("by_wallet_asset", (q) => q.eq("wallet", source.wallet).eq("assetId", source.assetSlug))
          .collect(),
        ctx.db
          .query("walletLiquidBalances")
          .withIndex("by_wallet_asset", (q) => q.eq("wallet", source.wallet).eq("assetId", source.assetSlug))
          .collect(),
      ])
      const walletRow = walletRows.find((row) => row.sourceType === "wallet" && row.sourcePositionId === undefined)
      const liquidRow = liquidRows.find((row) => row.state === "available")
      const valueUsd6 = String(Math.round(source.valueUsd * 1_000_000))

      if (!walletRow) {
        missingWalletBalances++
        if (args.execute === true) {
          await ctx.db.insert("walletBalances", {
            wallet: source.wallet,
            assetId: source.assetSlug,
            amount: source.amount,
            sourceType: "wallet",
            assetKind: "wallet",
            symbol: source.symbol,
            valueUsd6,
            updatedAt: source.updatedAt,
          })
          walletBalancesInserted++
        }
      } else if (sameNumber(walletRow.amount, source.amount) && walletRow.valueUsd6 === valueUsd6) {
        alreadyCovered++
      } else {
        conflicts.push({
          wallet: source.wallet,
          assetId: source.assetSlug,
          table: "walletBalances",
          targetUpdatedAt: walletRow.updatedAt,
          sourceUpdatedAt: source.updatedAt,
        })
      }

      if (!liquidRow) {
        missingLiquidBalances++
        if (args.execute === true) {
          await ctx.db.insert("walletLiquidBalances", {
            wallet: source.wallet,
            assetId: source.assetSlug,
            symbol: source.symbol,
            amount: source.amount,
            valueUsd: source.valueUsd,
            state: "available",
            updatedAt: source.updatedAt,
          })
          liquidBalancesInserted++
        }
      } else if (sameNumber(liquidRow.amount, source.amount) && sameNumber(liquidRow.valueUsd, source.valueUsd)) {
        alreadyCovered++
      } else {
        conflicts.push({
          wallet: source.wallet,
          assetId: source.assetSlug,
          table: "walletLiquidBalances",
          targetUpdatedAt: liquidRow.updatedAt,
          sourceUpdatedAt: source.updatedAt,
        })
      }
    }

    return {
      scanned: page.page.length,
      dryRun: args.execute !== true,
      missingWalletBalances,
      missingLiquidBalances,
      walletBalancesInserted,
      liquidBalancesInserted,
      alreadyCovered,
      conflicts,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})
