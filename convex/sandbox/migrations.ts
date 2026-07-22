import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import type { Doc } from "../_generated/dataModel"
import { SANDBOX_TOKEN_PRICE_USD } from "./onboarding"

/**
 * One-off, idempotent re-value of seeded MULTIPLY positions after the token-price
 * baseline was corrected (ETH-family dropped from the stale ~$3,500 tier to the
 * realistic ~$1,934 tier — see app/lib/prices/sandbox-baseline-prices.ts and the
 * aligned SANDBOX_TOKEN_PRICE_USD map).
 *
 * WHY: a multiply position stores `collateralValueUsd` (the intended gross exposure,
 * an invariant) and `collateralAmount` (a TOKEN quantity frozen at claim-time price).
 * The dashboard re-values exposure as `collateralAmount × currentBaseline`. With the
 * token amount frozen at the old high price, exposure now re-values DOWN while the
 * fixed `debtValueUsd` stays — collapsing equity and pushing seeded positions
 * underwater. Rewriting the token amount from the invariant restores the intended
 * exposure (and therefore LTV / health factor) at the new baseline.
 *
 * FORMULA: collateralAmount = collateralValueUsd / baselinePrice(collateralSymbol).
 * `collateralValueUsd` and `debtValueUsd` are left untouched, so LTV/HF are preserved.
 * Idempotent: it recomputes from the invariant, so re-running is a no-op.
 *
 * Collateral symbol is the first leg of the market slug (e.g. "wsteth-eth" → wsteth).
 */
function baselinePriceForSlug(marketSlug: string): number {
  const symbol = marketSlug.split("-")[0]?.toLowerCase() ?? ""
  return SANDBOX_TOKEN_PRICE_USD[symbol] ?? 1
}

export const migrateMultiplyCollateralToBaseline = internalMutation({
  args: {
    // Optional single-wallet run (used to validate on the test wallet first).
    wallet: v.optional(v.string()),
    // Pagination for the all-wallets sweep.
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { wallet, cursor, batchSize }) => {
    const now = Date.now()
    let scanned = 0
    let migrated = 0

    const applyTo = async (positions: Doc<"positions">[]) => {
      for (const pos of positions) {
        if (pos.product !== "multiply" || pos.status !== "open") continue
        const grossExposureUsd = pos.collateralValueUsd
        if (typeof grossExposureUsd !== "number" || grossExposureUsd <= 0) continue
        scanned++
        const price = baselinePriceForSlug(pos.marketSlug)
        const newAmount = grossExposureUsd / price
        const current = pos.collateralAmount ?? 0
        // Skip if already correct (idempotent / re-runnable).
        if (Math.abs(current - newAmount) <= Math.max(1e-9, newAmount * 1e-9)) continue
        await ctx.db.patch(pos._id, {
          collateralAmount: newAmount,
          lastUpdatedAt: now,
          revision: (pos.revision ?? 0) + 1,
        })
        migrated++
      }
    }

    if (wallet) {
      const rows = await ctx.db
        .query("positions")
        .withIndex("by_wallet_product", (q) => q.eq("wallet", wallet).eq("product", "multiply"))
        .collect()
      await applyTo(rows)
      return { scope: "wallet", wallet, scanned, migrated, isDone: true, continueCursor: null }
    }

    const page = await ctx.db.query("positions").paginate({ cursor: cursor ?? null, numItems: batchSize ?? 200 })
    await applyTo(page.page)
    return { scope: "all", scanned, migrated, isDone: page.isDone, continueCursor: page.continueCursor }
  },
})
