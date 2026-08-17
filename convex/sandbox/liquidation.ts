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
import type { MutationCtx } from "../_generated/server"
import { mutation, query } from "../_generated/server"
import { getAuthedWallet, requireSandboxWallet } from "./auth"
import { tokenNotionalToUsd } from "./collateral-usd"
import { appendPortfolioSnapshot, applyLedgerDelta } from "./transactions"

/** A single liquidation may repay at most this share of outstanding debt (50%). */
const LIQUIDATION_CLOSE_FACTOR_BPS = 5_000
/** Keeper seize premium assumed when the client omits one. */
const DEFAULT_LIQUIDATION_BONUS_BPS = 1_000
/** Hard server-side ceiling on the seize premium (defends a tampered client). */
const MAX_LIQUIDATION_BONUS_BPS = 2_000
/**
 * Liquidation-threshold basis, hand-synced with the borrow path's server-side
 * solvency re-derivation (convex/sandbox/transactions.ts
 * `serverCollateralValueUsd` / `liquidationThresholdFromMaxLtv`) which itself
 * mirrors the client credit engine. Convex can't import app/lib and those
 * helpers aren't exported, so the minimal formula is replicated here: LT =
 * explicit `liquidationThresholdPct`, else maxLtv + 10pp capped at 95%, else 85%.
 */
const BORROW_FALLBACK_LIQUIDATION_PCT = 85
const LIQUIDATION_THRESHOLD_SPREAD_PCT = 10
const LIQUIDATION_THRESHOLD_CAP_PCT = 95

function requirePositiveUsd6(value: string, field: string) {
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`INVALID_LIQUIDATION: ${field} must be a positive usd6 integer.`)
  }
}

/**
 * Revalue a victim collateral leg from shares/principal + the pool/market oracle
 * (never the spoofable client `collateralValueUsd6`) and return its liquidation
 * threshold. Replicates the borrow path's `serverCollateralValueUsd` so the
 * liquidation solvency check uses the same basis the borrow write does.
 */
async function victimCollateralLiquidationValue(
  ctx: MutationCtx,
  row: { marketSlug: string; collateralShares: string; principalTokenAmount: string },
) {
  const principal = BigInt(row.principalTokenAmount)
  const shares = BigInt(row.collateralShares)
  const raw = principal > 0n ? principal : shares
  const [pool, market] = await Promise.all([
    ctx.db
      .query("pools")
      .withIndex("by_slug", (q) => q.eq("slug", row.marketSlug))
      .unique(),
    ctx.db
      .query("markets")
      .withIndex("by_scope_slug", (q) => q.eq("scope", "pool").eq("slug", row.marketSlug))
      .unique(),
  ])
  const priceUsd = pool?.lpTokenPriceUsd ?? market?.priceUsd
  // 18-dec token notional (engine) vs usd6 microdollars (sandbox tests / persistence).
  // Bigint mulDiv for the 18-dec path — see collateral-usd.tokenNotionalToUsd.
  let valueUsd = 0
  if (raw > 0n) {
    valueUsd = raw >= 10n ** 12n ? tokenNotionalToUsd(raw, priceUsd ?? 0) : Number(raw) / 1_000_000
  }
  const thresholdPct =
    pool?.liquidationThresholdPct ??
    (pool?.maxLtvPct != null
      ? Math.min(pool.maxLtvPct + LIQUIDATION_THRESHOLD_SPREAD_PCT, LIQUIDATION_THRESHOLD_CAP_PCT)
      : BORROW_FALLBACK_LIQUIDATION_PCT)
  return { valueUsd, thresholdPct }
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
    if (args.healthFactorWadBefore !== null && BigInt(args.healthFactorWadBefore) >= 1_000_000_000_000_000_000n) {
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

      // ── Server-side solvency + sizing gate (P1-2) ──────────────────────────
      // `healthFactorWadBefore` above is CLIENT-supplied and spoofable — a caller
      // could pass "0" to liquidate a solvent victim. Independently recompute the
      // victim's health factor from stored collateral/debt + the pool oracle
      // (same basis as the borrow path's `assertBorrowSolvent`) and cap repay/seize
      // by a real close factor × liquidation bonus, not just "positive and ≤ value".
      const debtTotalUsd6 = debtRows.reduce((sum, row) => sum + BigInt(row.principalBorrowedUsd6), 0n)
      if (debtTotalUsd6 <= 0n) {
        throw new Error("INVALID_LIQUIDATION: the victim position has no debt to liquidate.")
      }
      let liquidationValueUsd = 0
      for (const collateral of collateralRows) {
        if (collateral.collateralEnabled === false) continue
        const { valueUsd, thresholdPct } = await victimCollateralLiquidationValue(ctx, collateral)
        liquidationValueUsd += valueUsd * (thresholdPct / 100)
      }
      const debtTotalUsd = Number(debtTotalUsd6) / 1_000_000
      // HF = risk-adjusted collateral / debt; the victim is solvent (HF ≥ 1) when
      // that collateral still covers the debt. Reject solvent victims outright.
      if (liquidationValueUsd >= debtTotalUsd) {
        throw new Error("INVALID_LIQUIDATION: the victim position is not underwater.")
      }
      const repay = BigInt(args.repaidUsd6)
      // Close factor: repay at most 50% of the outstanding debt per liquidation.
      if (repay * 10_000n > debtTotalUsd6 * BigInt(LIQUIDATION_CLOSE_FACTOR_BPS)) {
        throw new Error("INVALID_LIQUIDATION: repay exceeds the close factor.")
      }
      // Seize ≤ repay × (1 + liquidation bonus), with the bonus clamped server-side.
      const bonusBps = BigInt(
        Math.min(
          Math.max(0, Math.round(args.liquidationBonusBps ?? DEFAULT_LIQUIDATION_BONUS_BPS)),
          MAX_LIQUIDATION_BONUS_BPS,
        ),
      )
      const maxSeizeUsd6 = (repay * (10_000n + bonusBps)) / 10_000n
      if (BigInt(args.seizedCollateralUsd6) > maxSeizeUsd6) {
        throw new Error("INVALID_LIQUIDATION: seized collateral exceeds the close-factor × bonus cap.")
      }

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
          collateralShares: currentValue > 0n ? ((currentSharesValue * nextValue) / currentValue).toString() : "0",
          principalTokenAmount: currentValue > 0n ? ((currentTokenAmount * nextValue) / currentValue).toString() : "0",
          updatedAt: now,
        })
        remainingSeize -= seized
      }
      if (remainingSeize > 0n) {
        throw new Error("INVALID_LIQUIDATION: seized collateral exceeds the position value.")
      }

      const collateralBefore = collateralRows.reduce((sum, row) => sum + BigInt(row.collateralValueUsd6 ?? "0"), 0n)
      const debtBefore = debtRows.reduce((sum, row) => sum + BigInt(row.principalBorrowedUsd6), 0n)
      const collateralAfter = collateralBefore - BigInt(args.seizedCollateralUsd6)
      const debtAfter = debtBefore - (currentPrincipal - nextPrincipal)
      const closed = collateralAfter <= 0n && debtAfter <= 0n
      await ctx.db.patch(position._id, {
        collateralValueUsd6: (collateralAfter > 0n ? collateralAfter : 0n).toString(),
        debtValueUsd6: (debtAfter > 0n ? debtAfter : 0n).toString(),
        status: closed ? "closed" : "open",
        lastUpdatedAt: now,
        // Bump the optimistic-concurrency token: a liquidation mutates the position outside
        // recordTransaction, so without this a victim's tab that cached the pre-liquidation
        // revision would still match currentRevision and its stale-read repay/withdraw/borrow
        // would pass the STALE_WRITE guard — silently restoring the seized collateral and
        // repaid debt. Advancing revision forces that client to reload before it can write.
        revision: (position.revision ?? 0) + 1,
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
      ctx.db
        .query("liquidationActions")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
        .order("desc")
        .take(50),
      ctx.db
        .query("liquidationActions")
        .withIndex("by_liquidator_at", (q) => q.eq("liquidatorWallet", wallet))
        .order("desc")
        .take(50),
    ])
    return { asVictim, asLiquidator }
  },
})
