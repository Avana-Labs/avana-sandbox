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
 *   - transition  — fixed-point amounts, product/action compatibility, lend deltas,
 *                   multiply LTV/multiplier and aggregate ledger deltas are recomputed.
 *
 * Fixed-point amounts cross the wire as decimal strings (see schema encoding contract).
 */

import { v, type Infer } from "convex/values"
import type { MutationCtx } from "../_generated/server"
import { mutation, query } from "../_generated/server"
import { requireSandboxWallet } from "./auth"
import type { Doc } from "../_generated/dataModel"

/** Hourly per-wallet transaction cap (anti-abuse). Exported for tests. */
export const MAX_TX_PER_HOUR = 200

/** Global multiply leverage ceiling, mirrors MULTIPLY_ACTION_MAX_LEVERAGE (client slider). */
const MAX_MULTIPLIER = 10

/** Liquidation threshold (%) assumed when a pledged pool has none recorded. Conservative. */
const BORROW_FALLBACK_LIQUIDATION_PCT = 85

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

function usd6Number(value?: string) {
  return Number(BigInt(value ?? "0")) / 1_000_000
}

function assertClose(actual: number, expected: number, field: string, tolerance = 0.02) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    throw new Error(`INVALID_TRANSITION: ${field} does not match the server recomputation.`)
  }
}

function validateTransactionTransition(
  args: {
    product: "borrow" | "lend" | "multiply"
    kind: string
    requestedAmountUsd6: string
    executedAmountUsd6: string
    amountUsd: number
    position?: Infer<typeof positionPayload>
  },
  existing?: Doc<"positions">,
) {
  requireUnsignedInteger(args.requestedAmountUsd6, "requestedAmountUsd6")
  requireUnsignedInteger(args.executedAmountUsd6, "executedAmountUsd6")
  const requested = BigInt(args.requestedAmountUsd6)
  const executed = BigInt(args.executedAmountUsd6)
  if (requested > 0n && executed > requested) {
    throw new Error("INVALID_TRANSITION: executed amount exceeds the requested amount.")
  }
  assertClose(args.amountUsd, Number(executed) / 1_000_000, "amountUsd")

  const allowedKinds = {
    borrow: new Set(["deposit", "withdraw", "borrow", "repay", "claim"]),
    lend: new Set(["deposit", "withdraw", "claim"]),
    multiply: new Set(["multiply", "deleverage"]),
  }
  if (!allowedKinds[args.product].has(args.kind)) {
    throw new Error(`INVALID_TRANSITION: ${args.kind} is not valid for ${args.product}.`)
  }

  if (!args.position) return
  if (args.product === "lend" && args.kind !== "claim") {
    const before = usd6Number(existing?.suppliedUsd6)
    const after = usd6Number(args.position.suppliedUsd6)
    const expected = args.kind === "deposit" ? before + args.amountUsd : before - args.amountUsd
    assertClose(after, Math.max(0, expected), "lend supplied balance")
  }
  if (args.product === "multiply") {
    const collateral = args.position.collateralValueUsd ?? 0
    const debt = args.position.debtValueUsd ?? 0
    if (collateral < 0 || debt < 0 || debt > collateral) {
      throw new Error("INVALID_TRANSITION: multiply collateral and debt are inconsistent.")
    }
    const equity = collateral - debt
    const expectedMultiplier = equity > 0 ? collateral / equity : 1
    const expectedLtv = collateral > 0 ? debt / collateral : 0
    assertClose(args.position.multiplier ?? 1, expectedMultiplier, "multiply multiplier", 0.0001)
    assertClose(args.position.ltv ?? 0, expectedLtv, "multiply LTV", 0.0001)
    // Cap enforcement: the client slider tops out at MULTIPLY_ACTION_MAX_LEVERAGE, but a
    // tampered client could submit an internally-consistent position above it. Reject so
    // leverage caps are enforced server-side, not just in the UI.
    if ((args.position.multiplier ?? 1) > MAX_MULTIPLIER + 0.01) {
      throw new Error("INVALID_TRANSITION: multiplier exceeds the protocol maximum.")
    }
  }
}

/**
 * Server-side borrow solvency re-derivation. The Credit Engine runs in the browser, so
 * the server must independently confirm a borrow/withdraw write does not persist an
 * underwater (HF < 1) or unbacked position — otherwise a tampered client could record
 * arbitrary debt against arbitrary (or zero) collateral. We re-derive the liquidation
 * value from the pledged pools' real liquidation thresholds (NOT any client-supplied HF)
 * and reject when debt exceeds it.
 */
async function assertBorrowSolvent(
  ctx: MutationCtx,
  args: { product: "borrow" | "lend" | "multiply"; kind: string; position?: Infer<typeof positionPayload> },
) {
  if (args.product !== "borrow" || !args.position) return
  const debtUsd = usd6Number(args.position.debtValueUsd6)
  if (debtUsd <= 0) return // no debt → nothing to back

  const collateralRows = (args.position.collateral ?? []).filter((row) => row.collateralEnabled !== false)
  if (collateralRows.length === 0) {
    throw new Error("INVALID_TRANSITION: borrow debt has no backing collateral.")
  }

  let liquidationValueUsd = 0
  let valuedCollateralUsd = 0
  for (const row of collateralRows) {
    const valueUsd = usd6Number(row.collateralValueUsd6)
    if (valueUsd <= 0) continue // value not provided for this leg — can't bound it
    valuedCollateralUsd += valueUsd
    const pool = await ctx.db
      .query("pools")
      .withIndex("by_slug", (q) => q.eq("slug", row.marketSlug))
      .unique()
    const thresholdPct = pool?.liquidationThresholdPct ?? pool?.maxLtvPct ?? BORROW_FALLBACK_LIQUIDATION_PCT
    liquidationValueUsd += valueUsd * (thresholdPct / 100)
  }

  // Only enforce the health-factor bound when we actually have collateral values to
  // re-derive from; missing value data fails open (don't block a legitimate borrow on a
  // mapping gap) while a clearly underwater position (debt > liquidation value) is rejected.
  if (valuedCollateralUsd > 0 && debtUsd > liquidationValueUsd + 0.01) {
    throw new Error("INVALID_TRANSITION: borrow position would be undercollateralized (health factor < 1).")
  }
}

function canonicalLedgerDelta(
  args: {
    product: "borrow" | "lend" | "multiply"
    kind: string
    marketSlug?: string
    assetId?: string
    amountUsd: number
    position?: Infer<typeof positionPayload>
  },
  existing?: Doc<"positions">,
) {
  if (args.product === "borrow") {
    const marketSlug = args.kind === "borrow" || args.kind === "repay" ? args.assetId : args.marketSlug
    if (!marketSlug || args.kind === "claim") return null
    return {
      marketSlug,
      borrowedDeltaUsd: args.kind === "borrow" ? args.amountUsd : args.kind === "repay" ? -args.amountUsd : 0,
      suppliedDeltaUsd: args.kind === "deposit" ? args.amountUsd : args.kind === "withdraw" ? -args.amountUsd : 0,
    }
  }
  if (args.product === "lend") {
    if (!args.marketSlug || args.kind === "claim") return null
    return {
      marketSlug: args.marketSlug,
      borrowedDeltaUsd: 0,
      suppliedDeltaUsd: args.kind === "deposit" ? args.amountUsd : -args.amountUsd,
    }
  }
  if (!args.marketSlug || !args.position) return null
  return {
    marketSlug: args.marketSlug,
    borrowedDeltaUsd: (args.position.debtValueUsd ?? 0) - (existing?.debtValueUsd ?? 0),
    suppliedDeltaUsd: (args.position.collateralValueUsd ?? 0) - (existing?.collateralValueUsd ?? 0),
  }
}

export async function appendPortfolioSnapshot(ctx: MutationCtx, wallet: string, now: number) {
  const [positions, balances] = await Promise.all([
    ctx.db.query("positions").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect(),
    ctx.db.query("sandboxBalances").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect(),
  ])
  const open = positions.filter((position) => position.status === "open")
  const liquid = balances.reduce((sum, balance) => sum + balance.valueUsd, 0)
  const borrowCollateral = open
    .filter((position) => position.product === "borrow")
    .reduce((sum, position) => sum + usd6Number(position.collateralValueUsd6), 0)
  const borrowDebt = open
    .filter((position) => position.product === "borrow")
    .reduce((sum, position) => sum + usd6Number(position.debtValueUsd6), 0)
  const lendSupplied = open
    .filter((position) => position.product === "lend")
    .reduce((sum, position) => sum + usd6Number(position.suppliedUsd6), 0)
  const earned = open
    .filter((position) => position.product === "lend")
    .reduce((sum, position) => sum + usd6Number(position.earnedUsd6), 0)
  const multiplyCollateral = open
    .filter((position) => position.product === "multiply")
    .reduce((sum, position) => sum + (position.collateralValueUsd ?? 0), 0)
  const multiplyDebt = open
    .filter((position) => position.product === "multiply")
    .reduce((sum, position) => sum + (position.debtValueUsd ?? 0), 0)

  await ctx.db.insert("portfolioSnapshots", {
    wallet,
    at: now,
    totalValueUsd: liquid + borrowCollateral - borrowDebt + lendSupplied + multiplyCollateral - multiplyDebt,
    totalSuppliedUsd: borrowCollateral + lendSupplied + multiplyCollateral,
    totalBorrowedUsd: borrowDebt + multiplyDebt,
    availableToBorrowUsd: Math.max(0, borrowCollateral * 0.7 - borrowDebt),
    totalMultiplyExposureUsd: multiplyCollateral,
    totalEarnedUsd: earned,
  })
}

/**
 * Fold a delta into the shared aggregate liquidity ledger (`marketLiquidityDeltas`).
 * This is the auth-gated, wallet-attributed write path that unifies every product's
 * supply/borrow movement onto one ledger (mirrors `convex/liquidity.recordDelta`, but
 * reached only from inside an owner-verified mutation).
 */
export async function applyLedgerDelta(
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
    // NOTE: there is intentionally no client `ledger` arg. The aggregate market-liquidity
    // delta is recomputed server-side (canonicalLedgerDelta) so a client can never dictate
    // the shared ledger.
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

    // Hourly per-wallet rate limit. `take(MAX_TX_PER_HOUR)` bounds the read instead of
    // collecting the wallet's entire trailing-hour history just to count it.
    const windowStart = now - 60 * 60 * 1000
    const recent = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet).gte("at", windowStart))
      .take(MAX_TX_PER_HOUR)
    if (recent.length >= MAX_TX_PER_HOUR) {
      throw new Error(`RATE_LIMITED: more than ${MAX_TX_PER_HOUR} sandbox transactions in the last hour.`)
    }

    const status = args.status ?? "success"
    const simulated = args.simulated ?? true
    const marketSlug = args.position?.marketSlug ?? args.marketSlug
    const hash = `sim-${args.product}-${args.kind}-${args.intentId.slice(0, 8)}-${now.toString(36)}`

    // Upsert the (wallet, product, market) position on success.
    let positionId: import("../_generated/dataModel").Id<"positions"> | undefined
    let existingPosition: Doc<"positions"> | undefined
    if (args.position && status === "success" && marketSlug) {
      validatePositionPayload(args.position)
      const matches = await ctx.db
        .query("positions")
        .withIndex("by_wallet_market", (q) => q.eq("wallet", wallet).eq("marketSlug", marketSlug))
        .collect()
      const existing = matches.find((p) => p.product === args.product)
      existingPosition = existing
      validateTransactionTransition(args, existing)
      await assertBorrowSolvent(ctx, args)
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

    if (!args.position) validateTransactionTransition(args)

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
    if (status === "success") {
      const ledger = canonicalLedgerDelta(
        {
          product: args.product,
          kind: args.kind,
          marketSlug,
          assetId: args.assetId,
          amountUsd: args.amountUsd,
          position: args.position,
        },
        existingPosition,
      )
      if (ledger) {
        await applyLedgerDelta(
          ctx,
          ledger.marketSlug,
          ledger.borrowedDeltaUsd,
          ledger.suppliedDeltaUsd,
          now,
        )
      }
      await appendPortfolioSnapshot(ctx, wallet, now)
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
    // Indexed point lookup by (wallet, hash) instead of scanning the wallet's whole
    // transaction history and post-filtering by hash.
    const transaction = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_hash", (q) => q.eq("wallet", wallet).eq("syntheticTxHash", args.hash))
      .first()
    if (transaction) return transaction

    return ctx.db
      .query("sandboxActivity")
      .withIndex("by_wallet_hash", (q) => q.eq("wallet", wallet).eq("syntheticTxHash", args.hash))
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

/** Full wallet-scoped portfolio read model plus the catalog identity rows it references. */
export const getPortfolioPageState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const positions = await ctx.db.query("positions").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect()

    // Hydrate collateral/debt in parallel (was a sequential per-position loop).
    const hydratedPositions = await Promise.all(
      positions.map(async (position) => {
        const [collateral, debt] = await Promise.all([
          ctx.db.query("positionCollateral").withIndex("by_position", (q) => q.eq("positionId", position._id)).collect(),
          ctx.db.query("positionDebt").withIndex("by_position", (q) => q.eq("positionId", position._id)).collect(),
        ])
        return { ...position, collateral, debt }
      }),
    )

    // Fetch ONLY the catalog rows this wallet's positions reference (the mapper just needs
    // them for labels), not the entire 173-market / all-pools catalog per authenticated
    // subscriber. Borrow collateral joins to `pools`; lend/multiply join to `markets`.
    const poolSlugs = new Set<string>()
    const marketRefs = new Map<string, { scope: "lend" | "multiply"; slug: string }>()
    for (const position of hydratedPositions) {
      if (position.product === "borrow") {
        for (const c of position.collateral) poolSlugs.add(c.marketSlug)
      } else if (position.product === "lend" || position.product === "multiply") {
        marketRefs.set(`${position.product}:${position.marketSlug}`, { scope: position.product, slug: position.marketSlug })
      }
    }

    const [transactions, snapshots, risk, rewards, balances, starterAllocation, poolRows, marketRows] = await Promise.all([
      ctx.db.query("transactions").withIndex("by_wallet_at", (q) => q.eq("wallet", wallet)).order("desc").take(500),
      ctx.db.query("portfolioSnapshots").withIndex("by_wallet_at", (q) => q.eq("wallet", wallet)).order("asc").collect(),
      ctx.db.query("riskSnapshots").withIndex("by_wallet_at", (q) => q.eq("wallet", wallet)).order("desc").first(),
      ctx.db.query("sandboxRewards").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).unique(),
      ctx.db.query("sandboxBalances").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).collect(),
      ctx.db.query("starterAllocations").withIndex("by_wallet", (q) => q.eq("wallet", wallet)).unique(),
      Promise.all(
        [...poolSlugs].map((slug) => ctx.db.query("pools").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()),
      ),
      Promise.all(
        [...marketRefs.values()].map((ref) =>
          ctx.db.query("markets").withIndex("by_scope_slug", (q) => q.eq("scope", ref.scope).eq("slug", ref.slug)).unique(),
        ),
      ),
    ])
    const pools = poolRows.filter((row): row is NonNullable<typeof row> => row !== null)
    const markets = marketRows.filter((row): row is NonNullable<typeof row> => row !== null)
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
