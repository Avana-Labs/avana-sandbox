/**
 * Sandbox liquidation recording.
 *
 * Liquidation previews remain analytics-only. A confirmed liquidation with a
 * position id atomically updates the victim's debt/collateral, records the
 * transaction and portfolio snapshot, and stores the liquidation audit row:
 *   - `recordLiquidationPreview` — every computed preview (health before/after, the
 *     allowed/blocked verdict), owner-scoped.
 *   - `recordLiquidation` — a recorded liquidation action. Unlike the rest of the
 *     sandbox (self-only via `requireSandboxWallet`), a liquidation has TWO parties:
 *     the caller is the LIQUIDATOR (the authed wallet), acting on a VICTIM wallet it
 *     does not own. So we gate on the liquidator identity, not the victim.
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { getAuthedWallet, requireSandboxWallet } from "./auth"
import { appendPortfolioSnapshot, applyLedgerDelta } from "./transactions"

function requirePositiveUsd6(value: string, field: string) {
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`INVALID_LIQUIDATION: ${field} must be a positive usd6 integer.`)
  }
}

/** Persist a liquidation preview for the owner's own position (analytics audit). */
export const recordLiquidationPreview = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    return ctx.db.insert("liquidationPreviews", { ...args, wallet, at: Date.now() })
  },
})

/**
 * Record a liquidation action (liquidator↔victim). The caller must be the
 * liquidator (the authed wallet); the victim `wallet` is recorded as data.
 */
export const recordLiquidation = mutation({
  args: {
    /** The position owner being liquidated (victim). */
    wallet: v.string(),
    /** The keeper performing the liquidation; must equal the authed wallet. */
    liquidatorWallet: v.string(),
    positionId: v.optional(v.id("positions")),
    debtPositionId: v.optional(v.id("positionDebt")),
    marketSlug: v.optional(v.string()),
    repaidUsd6: v.string(),
    seizedCollateralUsd6: v.string(),
    liquidationBonusBps: v.optional(v.number()),
    healthFactorWadBefore: v.union(v.string(), v.null()),
    healthFactorWadAfter: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const liquidator = await getAuthedWallet(ctx)
    if (!liquidator) throw new Error("UNAUTHENTICATED: sign in to record a liquidation.")
    if (liquidator !== args.liquidatorWallet.toLowerCase()) {
      throw new Error("LIQUIDATOR_MISMATCH: the caller must be the liquidator.")
    }
    requirePositiveUsd6(args.repaidUsd6, "repaidUsd6")
    requirePositiveUsd6(args.seizedCollateralUsd6, "seizedCollateralUsd6")
    if (
      args.healthFactorWadBefore !== null &&
      BigInt(args.healthFactorWadBefore) >= 1_000_000_000_000_000_000n
    ) {
      throw new Error("INVALID_LIQUIDATION: the victim position is not underwater.")
    }
    const now = Date.now()
    const hash = `sim-liquidate-${now.toString(36)}`

    if (args.positionId) {
      const position = await ctx.db.get(args.positionId)
      const victim = args.wallet.toLowerCase()
      if (!position || position.wallet !== victim || position.product !== "borrow") {
        throw new Error("INVALID_LIQUIDATION: position does not belong to the victim wallet.")
      }
      const [collateralRows, debtRows] = await Promise.all([
        ctx.db
          .query("positionCollateral")
          .withIndex("by_position", (q) => q.eq("positionId", args.positionId!))
          .collect(),
        ctx.db
          .query("positionDebt")
          .withIndex("by_position", (q) => q.eq("positionId", args.positionId!))
          .collect(),
      ])
      const debt = args.debtPositionId ? debtRows.find((row) => row._id === args.debtPositionId) : debtRows[0]
      if (!debt) throw new Error("INVALID_LIQUIDATION: debt position was not found.")

      const repay = BigInt(args.repaidUsd6)
      const currentPrincipal = BigInt(debt.principalBorrowedUsd6)
      const nextPrincipal = currentPrincipal > repay ? currentPrincipal - repay : 0n
      const currentShares = BigInt(debt.debtSharesUsd6)
      const nextShares = currentPrincipal > 0n ? (currentShares * nextPrincipal) / currentPrincipal : 0n
      await ctx.db.patch(debt._id, {
        principalBorrowedUsd6: nextPrincipal.toString(),
        debtSharesUsd6: nextShares.toString(),
        updatedAt: now,
      })

      let remainingSeize = BigInt(args.seizedCollateralUsd6)
      for (const collateral of collateralRows) {
        if (remainingSeize === 0n) break
        const currentValue = BigInt(collateral.collateralValueUsd6 ?? "0")
        if (currentValue === 0n) continue
        const seized = currentValue < remainingSeize ? currentValue : remainingSeize
        const nextValue = currentValue - seized
        const currentSharesValue = BigInt(collateral.collateralShares)
        const currentTokenAmount = BigInt(collateral.principalTokenAmount)
        await ctx.db.patch(collateral._id, {
          collateralValueUsd6: nextValue.toString(),
          collateralShares:
            currentValue > 0n ? ((currentSharesValue * nextValue) / currentValue).toString() : "0",
          principalTokenAmount:
            currentValue > 0n ? ((currentTokenAmount * nextValue) / currentValue).toString() : "0",
          updatedAt: now,
        })
        remainingSeize -= seized
      }
      if (remainingSeize > 0n) {
        throw new Error("INVALID_LIQUIDATION: seized collateral exceeds the position value.")
      }

      const collateralBefore = collateralRows.reduce(
        (sum, row) => sum + BigInt(row.collateralValueUsd6 ?? "0"),
        0n,
      )
      const debtBefore = debtRows.reduce((sum, row) => sum + BigInt(row.principalBorrowedUsd6), 0n)
      const collateralAfter = collateralBefore - BigInt(args.seizedCollateralUsd6)
      const debtAfter = debtBefore - (currentPrincipal - nextPrincipal)
      const closed = collateralAfter <= 0n && debtAfter <= 0n
      await ctx.db.patch(position._id, {
        collateralValueUsd6: (collateralAfter > 0n ? collateralAfter : 0n).toString(),
        debtValueUsd6: (debtAfter > 0n ? debtAfter : 0n).toString(),
        status: closed ? "closed" : "open",
        lastUpdatedAt: now,
        ...(closed ? { closedAt: now } : {}),
      })

      const repaidUsd = Number(repay) / 1_000_000
      const seizedUsd = Number(BigInt(args.seizedCollateralUsd6)) / 1_000_000
      const marketSlug = args.marketSlug ?? position.marketSlug
      await ctx.db.insert("transactions", {
        wallet: victim,
        intentId: `liquidation:${hash}`,
        product: "borrow",
        kind: "liquidation",
        status: "success",
        marketSlug,
        positionId: position._id,
        requestedAmountUsd6: args.repaidUsd6,
        executedAmountUsd6: args.repaidUsd6,
        amountUsd: repaidUsd,
        healthFactorWadBefore: args.healthFactorWadBefore,
        healthFactorWadAfter: args.healthFactorWadAfter,
        syntheticTxHash: hash,
        simulated: true,
        at: now,
      })
      await applyLedgerDelta(ctx, marketSlug, -repaidUsd, -seizedUsd, now)
      await appendPortfolioSnapshot(ctx, victim, now)
    }

    const id = await ctx.db.insert("liquidationActions", {
      wallet: args.wallet.toLowerCase(),
      liquidatorWallet: liquidator,
      positionId: args.positionId,
      debtPositionId: args.debtPositionId,
      marketSlug: args.marketSlug,
      repaidUsd6: args.repaidUsd6,
      seizedCollateralUsd6: args.seizedCollateralUsd6,
      liquidationBonusBps: args.liquidationBonusBps,
      healthFactorWadBefore: args.healthFactorWadBefore,
      healthFactorWadAfter: args.healthFactorWadAfter,
      syntheticTxHash: hash,
      at: now,
    })
    return { id, hash }
  },
})

/** Liquidations involving the wallet, both as victim and as liquidator. */
export const getLiquidations = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const [asVictim, asLiquidator] = await Promise.all([
      ctx.db.query("liquidationActions").withIndex("by_wallet_at", (q) => q.eq("wallet", wallet)).order("desc").take(50),
      ctx.db
        .query("liquidationActions")
        .withIndex("by_liquidator_at", (q) => q.eq("liquidatorWallet", wallet))
        .order("desc")
        .take(50),
    ])
    return { asVictim, asLiquidator }
  },
})
