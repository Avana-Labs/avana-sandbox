/**
 * Sandbox liquidation recording.
 *
 * Liquidation is preview-only in the sandbox transaction adapter (it returns a
 * "failed" receipt and never mutates balances). These functions persist the
 * ANALYTICS around liquidation so the UI can show/audit it:
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
    const now = Date.now()
    const hash = `sim-liquidate-${now.toString(36)}`
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
