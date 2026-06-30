/**
 * Wallet-scoped sandbox transaction persistence + reads.
 *
 * The Credit/Lend/Multiply engines stay client-side simulation/analytics (preview is
 * pure, no writes). When the user *executes*, the adapter calls `recordTransaction`,
 * which is the single Convex write path for a balance change. Per the brief, Convex is
 * the source of truth for SANDBOX state only — these synthetic numbers are never the
 * production source of truth (in prod, truth is contracts + indexed onchain data).
 *
 * Server-side guarantees (never trusted from the client):
 *   - ownership   — `requireSandboxWallet` derives the wallet from ctx.auth.
 *   - idempotency — a replayed `intentId` returns the existing row (no double-apply).
 *   - rate limit  — at most `MAX_TX_PER_HOUR` per wallet per trailing hour.
 *   - one row     — exactly one `transactions` row per balance-changing action.
 *
 * Fixed-point amounts cross the wire as decimal strings (see schema encoding contract).
 */

import { v, type Infer } from "convex/values"
import type { MutationCtx } from "../_generated/server"
import { mutation, query } from "../_generated/server"
import { requireSandboxWallet } from "./auth"

/** Hourly per-wallet transaction cap (anti-abuse). Exported for tests. */
export const MAX_TX_PER_HOUR = 200

/** Optional position upsert payload carried by a transaction. */
const positionPayload = v.object({
  status: v.union(v.literal("open"), v.literal("closed")),
  marketSlug: v.optional(v.string()),
  spokeId: v.optional(v.string()),
  assetId: v.optional(v.string()),
  collateralValueUsd6: v.optional(v.string()),
  debtValueUsd6: v.optional(v.string()),
  suppliedUsd6: v.optional(v.string()),
  earnedUsd6: v.optional(v.string()),
  collateralAmount: v.optional(v.number()),
  collateralValueUsd: v.optional(v.number()),
  debtValueUsd: v.optional(v.number()),
  multiplier: v.optional(v.number()),
  ltv: v.optional(v.number()),
  healthFactor: v.optional(v.union(v.number(), v.literal("infinity"))),
  liquidationPrice: v.optional(v.union(v.number(), v.null())),
  netApyPct: v.optional(v.number()),
  collateral: v.optional(
    v.array(
      v.object({
        marketSlug: v.string(),
        collateralShares: v.string(),
        principalTokenAmount: v.string(),
        collateralEnabled: v.boolean(),
        collateralValueUsd6: v.optional(v.string()),
      }),
    ),
  ),
  debt: v.optional(
    v.array(
      v.object({
        assetId: v.string(),
        baseAssetId: v.string(),
        spokeId: v.optional(v.string()),
        marketSlug: v.optional(v.string()),
        debtSharesUsd6: v.string(),
        debtIndexRay: v.string(),
        borrowRateWad: v.string(),
        principalBorrowedUsd6: v.string(),
      }),
    ),
  ),
})

function requireUnsignedInteger(value: string, field: string) {
  if (!/^\d+$/.test(value) || BigInt(value) < 0n) {
    throw new Error(`INVALID_POSITION: ${field} must be an unsigned integer string.`)
  }
}

function validatePositionPayload(position: Infer<typeof positionPayload>) {
  for (const [field, value] of Object.entries({
    collateralValueUsd6: position.collateralValueUsd6,
    debtValueUsd6: position.debtValueUsd6,
    suppliedUsd6: position.suppliedUsd6,
    earnedUsd6: position.earnedUsd6,
  })) {
    if (value !== undefined) requireUnsignedInteger(value, field)
  }
  for (const collateral of position.collateral ?? []) {
    requireUnsignedInteger(collateral.collateralShares, "collateralShares")
    requireUnsignedInteger(collateral.principalTokenAmount, "principalTokenAmount")
    if (collateral.collateralValueUsd6 !== undefined) {
      requireUnsignedInteger(collateral.collateralValueUsd6, "collateralValueUsd6")
    }
  }
  for (const debt of position.debt ?? []) {
    requireUnsignedInteger(debt.debtSharesUsd6, "debtSharesUsd6")
    requireUnsignedInteger(debt.debtIndexRay, "debtIndexRay")
    requireUnsignedInteger(debt.borrowRateWad, "borrowRateWad")
    requireUnsignedInteger(debt.principalBorrowedUsd6, "principalBorrowedUsd6")
  }
}

/**
 * Fold a delta into the shared aggregate liquidity ledger (`marketLiquidityDeltas`).
 * This is the auth-gated, wallet-attributed write path that unifies every product's
 * supply/borrow movement onto one ledger (mirrors `convex/liquidity.recordDelta`, but
 * reached only from inside an owner-verified mutation).
 */
async function applyLedgerDelta(
  ctx: MutationCtx,
  marketSlug: string,
  borrowedDeltaUsd: number,
  suppliedDeltaUsd: number,
  now: number,
) {
  const borrowed = Number.isFinite(borrowedDeltaUsd) ? borrowedDeltaUsd : 0
  const supplied = Number.isFinite(suppliedDeltaUsd) ? suppliedDeltaUsd : 0
  if (borrowed === 0 && supplied === 0) return

  const existing = await ctx.db
    .query("marketLiquidityDeltas")
    .withIndex("by_slug", (q) => q.eq("marketSlug", marketSlug))
    .unique()
  if (existing) {
    await ctx.db.patch(existing._id, {
      borrowedDeltaUsd: existing.borrowedDeltaUsd + borrowed,
      suppliedDeltaUsd: existing.suppliedDeltaUsd + supplied,
      updatedAt: now,
    })
    return
  }
  await ctx.db.insert("marketLiquidityDeltas", {
    marketSlug,
    borrowedDeltaUsd: borrowed,
    suppliedDeltaUsd: supplied,
    updatedAt: now,
  })
}

/**
 * Persist one balance-changing sandbox action. Returns a synthetic receipt the UI
 * renders exactly like the in-browser adapter's (`{ id, hash, status, simulated }`).
 */
export const recordTransaction = mutation({
  args: {
    wallet: v.string(),
    /** Client intent id — the idempotency key (replays return the existing row). */
    intentId: v.string(),
    product: v.union(v.literal("borrow"), v.literal("lend"), v.literal("multiply")),
    kind: v.string(),
    status: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("pending"))),
    marketSlug: v.optional(v.string()),
    assetId: v.optional(v.string()),
    requestedAmountUsd6: v.string(),
    executedAmountUsd6: v.string(),
    amountUsd: v.number(),
    simulated: v.optional(v.boolean()),
    healthFactorWadBefore: v.optional(v.union(v.string(), v.null())),
    healthFactorWadAfter: v.optional(v.union(v.string(), v.null())),
    position: v.optional(positionPayload),
    ledger: v.optional(
      v.object({
        marketSlug: v.string(),
        borrowedDeltaUsd: v.optional(v.number()),
        suppliedDeltaUsd: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const now = Date.now()

    // Idempotency — a replayed intent returns the existing row, never double-applies.
    const prior = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_intent", (q) => q.eq("wallet", wallet).eq("intentId", args.intentId))
      .first()
    if (prior) {
      return {
        idempotent: true,
        transactionId: prior._id,
        positionId: prior.positionId ?? null,
        receipt: { id: prior._id, hash: prior.syntheticTxHash, status: prior.status, simulated: prior.simulated, timestamp: prior.at },
      }
    }

    // Hourly per-wallet rate limit.
    const windowStart = now - 60 * 60 * 1000
    const recent = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet).gte("at", windowStart))
      .collect()
    if (recent.length >= MAX_TX_PER_HOUR) {
      throw new Error(`RATE_LIMITED: more than ${MAX_TX_PER_HOUR} sandbox transactions in the last hour.`)
    }

    const status = args.status ?? "success"
    const simulated = args.simulated ?? true
    const marketSlug = args.position?.marketSlug ?? args.marketSlug
    const hash = `sim-${args.product}-${args.kind}-${args.intentId.slice(0, 8)}-${now.toString(36)}`

    // Upsert the (wallet, product, market) position on success.
    let positionId: import("../_generated/dataModel").Id<"positions"> | undefined
    if (args.position && status === "success" && marketSlug) {
      validatePositionPayload(args.position)
      const matches = await ctx.db
        .query("positions")
        .withIndex("by_wallet_market", (q) => q.eq("wallet", wallet).eq("marketSlug", marketSlug))
        .collect()
      const existing = matches.find((p) => p.product === args.product)
      const fields = {
        spokeId: args.position.spokeId,
        assetId: args.position.assetId ?? args.assetId,
        status: args.position.status,
        collateralValueUsd6: args.position.collateralValueUsd6,
        debtValueUsd6: args.position.debtValueUsd6,
        suppliedUsd6: args.position.suppliedUsd6,
        earnedUsd6: args.position.earnedUsd6,
        collateralAmount: args.position.collateralAmount,
        collateralValueUsd: args.position.collateralValueUsd,
        debtValueUsd: args.position.debtValueUsd,
        multiplier: args.position.multiplier,
        ltv: args.position.ltv,
        healthFactor: args.position.healthFactor,
        liquidationPrice: args.position.liquidationPrice,
        netApyPct: args.position.netApyPct,
        lastUpdatedAt: now,
        ...(args.position.status === "closed" ? { closedAt: now } : {}),
      }
      if (existing) {
        await ctx.db.patch(existing._id, fields)
        positionId = existing._id
      } else {
        positionId = await ctx.db.insert("positions", {
          wallet,
          product: args.product,
          marketSlug,
          openedAt: now,
          openTxSynthetic: hash,
          ...fields,
        })
      }

      if (args.product === "borrow" && positionId) {
        const [existingCollateral, existingDebt] = await Promise.all([
          ctx.db.query("positionCollateral").withIndex("by_position", (q) => q.eq("positionId", positionId!)).collect(),
          ctx.db.query("positionDebt").withIndex("by_position", (q) => q.eq("positionId", positionId!)).collect(),
        ])
        for (const row of existingCollateral) await ctx.db.delete(row._id)
        for (const row of existingDebt) await ctx.db.delete(row._id)
        for (const collateral of args.position.collateral ?? []) {
          await ctx.db.insert("positionCollateral", {
            wallet,
            positionId,
            ...collateral,
            updatedAt: now,
          })
        }
        for (const debt of args.position.debt ?? []) {
          await ctx.db.insert("positionDebt", {
            wallet,
            positionId,
            ...debt,
            updatedAt: now,
          })
        }
      }
    }

    const transactionId = await ctx.db.insert("transactions", {
      wallet,
      intentId: args.intentId,
      product: args.product,
      kind: args.kind,
      status,
      marketSlug,
      assetId: args.assetId,
      positionId,
      requestedAmountUsd6: args.requestedAmountUsd6,
      executedAmountUsd6: args.executedAmountUsd6,
      amountUsd: args.amountUsd,
      healthFactorWadBefore: args.healthFactorWadBefore,
      healthFactorWadAfter: args.healthFactorWadAfter,
      syntheticTxHash: hash,
      simulated,
      at: now,
    })

    // Unify products on the shared aggregate ledger (auth-gated, attributed write).
    if (args.ledger && status === "success") {
      await applyLedgerDelta(ctx, args.ledger.marketSlug, args.ledger.borrowedDeltaUsd ?? 0, args.ledger.suppliedDeltaUsd ?? 0, now)
    }

    return {
      idempotent: false,
      transactionId,
      positionId: positionId ?? null,
      receipt: { id: transactionId, hash, status, simulated, timestamp: now },
    }
  },
})

/** Append a SPOKE-scoped risk/health snapshot (Credit-Engine-computed; analytics). */
export const recordRiskSnapshot = mutation({
  args: {
    wallet: v.string(),
    collateralValueUsd6: v.string(),
    borrowCapacityUsd6: v.string(),
    availableBorrowCapacityUsd6: v.string(),
    totalBorrowedUsd6: v.string(),
    currentLtvWad: v.string(),
    healthFactorWad: v.union(v.string(), v.null()),
    spokes: v.array(
      v.object({
        spokeId: v.string(),
        availableCreditUsd6: v.string(),
        totalBorrowedUsd6: v.string(),
        liquidationBufferUsd6: v.string(),
        healthFactorWad: v.union(v.string(), v.null()),
      }),
    ),
    trigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    return ctx.db.insert("riskSnapshots", { ...args, wallet, at: Date.now() })
  },
})

/** Merged wallet activity feed: product transactions + onboarding activity, newest first. */
export const getActivity = query({
  args: { wallet: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const limit = Math.min(args.limit ?? 50, 200)
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .take(limit)
    const acts = await ctx.db
      .query("sandboxActivity")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .take(limit)
    const merged = [
      ...txs.map((t) => ({
        source: "transaction" as const,
        id: t._id as string,
        product: t.product as string,
        kind: t.kind,
        status: t.status as string,
        amountUsd: t.amountUsd,
        marketSlug: t.marketSlug ?? null,
        hash: t.syntheticTxHash,
        at: t.at,
      })),
      ...acts.map((a) => ({
        source: "onboarding" as const,
        id: a._id as string,
        product: "onboarding",
        kind: a.kind,
        status: "success",
        amountUsd: a.amountUsd,
        marketSlug: a.marketSlug ?? null,
        hash: a.syntheticTxHash,
        at: a.at,
      })),
    ]
    merged.sort((x, y) => y.at - x.at)
    return merged.slice(0, limit)
  },
})

/** Resolve one synthetic receipt by hash, restricted to its authenticated owner. */
export const getTransactionByHash = query({
  args: { wallet: v.string(), hash: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .filter((q) => q.eq(q.field("syntheticTxHash"), args.hash))
      .first()
    if (transaction) return transaction

    return ctx.db
      .query("sandboxActivity")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .filter((q) => q.eq(q.field("syntheticTxHash"), args.hash))
      .first()
  },
})

/** Wallet-scoped positions with their collateral + debt legs. */
export const getPositions = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect()
    const out = []
    for (const p of positions) {
      const [collateral, debt] = await Promise.all([
        ctx.db.query("positionCollateral").withIndex("by_position", (q) => q.eq("positionId", p._id)).collect(),
        ctx.db.query("positionDebt").withIndex("by_position", (q) => q.eq("positionId", p._id)).collect(),
      ])
      out.push({ ...p, collateral, debt })
    }
    return out
  },
})

/** Complete reactive session payload for an authenticated wallet. */
export const getSessionState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const [positions, transactions, balances, starterAllocation] = await Promise.all([
      ctx.db.query("positions").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
        .order("desc")
        .take(500),
      ctx.db.query("sandboxBalances").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect(),
      ctx.db.query("starterAllocations").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).unique(),
    ])
    const hydratedPositions = []
    for (const position of positions) {
      const [collateral, debt] = await Promise.all([
        ctx.db.query("positionCollateral").withIndex("by_position", (q) => q.eq("positionId", position._id)).collect(),
        ctx.db.query("positionDebt").withIndex("by_position", (q) => q.eq("positionId", position._id)).collect(),
      ])
      hydratedPositions.push({ ...position, collateral, debt })
    }
    return { positions: hydratedPositions, transactions, balances, starterAllocation }
  },
})

/** Full wallet-scoped portfolio read model plus global catalog identity rows. */
export const getPortfolioPageState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const [positions, transactions, snapshots, risk, pools, markets, rewards, balances, starterAllocation] = await Promise.all([
      ctx.db.query("positions").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
        .order("desc")
        .take(500),
      ctx.db.query("portfolioSnapshots").withIndex("by_wallet_at", (q) => q.eq("wallet", wallet)).order("asc").collect(),
      ctx.db.query("riskSnapshots").withIndex("by_wallet_at", (q) => q.eq("wallet", wallet)).order("desc").first(),
      ctx.db.query("pools").collect(),
      ctx.db.query("markets").collect(),
      ctx.db.query("sandboxRewards").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).unique(),
      ctx.db.query("sandboxBalances").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect(),
      ctx.db.query("starterAllocations").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).unique(),
    ])
    const hydratedPositions = []
    for (const position of positions) {
      const [collateral, debt] = await Promise.all([
        ctx.db.query("positionCollateral").withIndex("by_position", (q) => q.eq("positionId", position._id)).collect(),
        ctx.db.query("positionDebt").withIndex("by_position", (q) => q.eq("positionId", position._id)).collect(),
      ])
      hydratedPositions.push({ ...position, collateral, debt })
    }
    return { positions: hydratedPositions, transactions, snapshots, risk, pools, markets, rewards, balances, starterAllocation }
  },
})

/** Wallet-scoped portfolio: the snapshot time series + position summary. */
export const getPortfolio = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const snapshots = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("asc")
      .collect()
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect()
    return {
      snapshots,
      latest: snapshots.length > 0 ? snapshots[snapshots.length - 1] : null,
      openPositions: positions.filter((p) => p.status === "open").length,
      positionCount: positions.length,
    }
  },
})

/** Latest risk/health snapshot for the wallet (null if none recorded yet). */
export const getRisk = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    return ctx.db
      .query("riskSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .first()
  },
})
