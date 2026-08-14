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
import { upsertWalletBalanceRows } from "../wallet/balances"
import { requireSandboxWallet } from "./auth"
import type { Doc } from "../_generated/dataModel"

type ProductBalanceTable =
  "walletLendBalances" | "walletBorrowBalances" | "walletMultiplyBalances" | "walletLiquidBalances"

/** Apply a successful swap to durable liquid balances (sandboxBalances + walletBalances). */
async function applySwapBalanceDelta(
  ctx: MutationCtx,
  wallet: string,
  args: {
    inputAssetId: string
    outputAssetId: string
    inputSymbol: string
    outputSymbol: string
    inputAmount: number
    outputAmount: number
    amountUsd: number
  },
  now: number,
) {
  const legs = [
    { assetId: args.inputAssetId, symbol: args.inputSymbol, delta: -args.inputAmount },
    { assetId: args.outputAssetId, symbol: args.outputSymbol, delta: args.outputAmount },
  ] as const

  for (const leg of legs) {
    const sandbox = await ctx.db
      .query("sandboxBalances")
      .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet).eq("assetSlug", leg.assetId))
      .unique()
    const nextAmount = Math.max(0, (sandbox?.amount ?? 0) + leg.delta)
    const priceUsd =
      sandbox?.priceUsd ??
      (leg.assetId === args.inputAssetId && args.inputAmount > 0
        ? args.amountUsd / args.inputAmount
        : leg.assetId === args.outputAssetId && args.outputAmount > 0
          ? args.amountUsd / args.outputAmount
          : 1)
    const valueUsd = nextAmount * priceUsd
    if (sandbox) {
      await ctx.db.patch(sandbox._id, { amount: nextAmount, valueUsd, priceUsd, updatedAt: now })
    } else if (nextAmount > 0) {
      await ctx.db.insert("sandboxBalances", {
        wallet,
        assetSlug: leg.assetId,
        symbol: leg.symbol,
        amount: nextAmount,
        valueUsd,
        priceUsd,
        updatedAt: now,
      })
    }
    await upsertWalletBalanceRows(ctx, [
      {
        wallet,
        assetId: leg.assetId,
        amount: nextAmount,
        sourceType: "wallet",
        assetKind: "wallet",
        symbol: leg.symbol,
        valueUsd6: String(Math.round(valueUsd * 1_000_000)),
      },
    ])
    await upsertProductBalanceValue(ctx, "walletLiquidBalances", wallet, {
      assetId: leg.assetId,
      symbol: leg.symbol,
      amount: nextAmount,
      valueUsd,
      state: "available",
    })
  }
}

/** Debit/credit one liquid asset in sandboxBalances + walletBalances (lend/borrow cash legs). */
async function applyLiquidAssetDelta(
  ctx: MutationCtx,
  wallet: string,
  assetId: string,
  symbol: string,
  delta: number,
  now: number,
) {
  if (!Number.isFinite(delta) || delta === 0) return
  const sandbox = await ctx.db
    .query("sandboxBalances")
    .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet).eq("assetSlug", assetId))
    .unique()
  const priceUsd = sandbox?.priceUsd && sandbox.priceUsd > 0 ? sandbox.priceUsd : 1
  const nextAmount = Math.max(0, (sandbox?.amount ?? 0) + delta)
  const valueUsd = nextAmount * priceUsd
  if (sandbox) {
    await ctx.db.patch(sandbox._id, { amount: nextAmount, valueUsd, priceUsd, updatedAt: now })
  } else if (nextAmount > 0) {
    await ctx.db.insert("sandboxBalances", {
      wallet,
      assetSlug: assetId,
      symbol,
      amount: nextAmount,
      valueUsd,
      priceUsd,
      updatedAt: now,
    })
  }
  await upsertWalletBalanceRows(ctx, [
    {
      wallet,
      assetId,
      amount: nextAmount,
      sourceType: "wallet",
      assetKind: "wallet",
      symbol,
      valueUsd6: String(Math.round(valueUsd * 1_000_000)),
    },
  ])
}

async function upsertProductBalanceValue(
  ctx: MutationCtx,
  table: ProductBalanceTable,
  wallet: string,
  row: {
    marketId?: string
    assetId?: string
    poolId?: string
    symbol: string
    amount: number
    valueUsd: number
    state: string
  },
) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const existing = rows.find(
    (candidate) =>
      candidate.state === row.state &&
      ("marketId" in candidate ? candidate.marketId : undefined) === row.marketId &&
      ("assetId" in candidate ? candidate.assetId : undefined) === row.assetId &&
      ("poolId" in candidate ? candidate.poolId : undefined) === row.poolId,
  )
  const next = { ...row, amount: Math.max(0, row.amount), valueUsd: Math.max(0, row.valueUsd), updatedAt: Date.now() }
  if (existing) {
    await ctx.db.patch(existing._id, next as never)
    return
  }
  if (next.amount <= 0 && next.valueUsd <= 0) return
  await ctx.db.insert(table, { ...next, wallet } as never)
}

async function adjustProductBalanceUsd(
  ctx: MutationCtx,
  table: ProductBalanceTable,
  wallet: string,
  match: { marketId?: string; assetId?: string; poolId?: string; state: string },
  symbol: string,
  deltaUsd: number,
  now: number,
) {
  if (!Number.isFinite(deltaUsd) || deltaUsd === 0) return
  const rows = await ctx.db
    .query(table)
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const existing = rows.find(
    (candidate) =>
      candidate.state === match.state &&
      (match.marketId === undefined || ("marketId" in candidate ? candidate.marketId : undefined) === match.marketId) &&
      (match.assetId === undefined || ("assetId" in candidate ? candidate.assetId : undefined) === match.assetId) &&
      (match.poolId === undefined || ("poolId" in candidate ? candidate.poolId : undefined) === match.poolId),
  )
  const sibling =
    existing ??
    rows.find(
      (candidate) =>
        match.marketId !== undefined &&
        ("marketId" in candidate ? candidate.marketId : undefined) === match.marketId &&
        (match.assetId === undefined || ("assetId" in candidate ? candidate.assetId : undefined) === match.assetId),
    )
  const nextValueUsd = Math.max(0, (existing?.valueUsd ?? 0) + deltaUsd)
  const priceUsd = existing && existing.amount > 0 && existing.valueUsd > 0 ? existing.valueUsd / existing.amount : 1
  const nextAmount = priceUsd > 0 ? nextValueUsd / priceUsd : nextValueUsd
  if (existing) {
    await ctx.db.patch(existing._id, { amount: nextAmount, valueUsd: nextValueUsd, updatedAt: now })
    return
  }
  if (nextValueUsd <= 0) return
  await ctx.db.insert(table, {
    wallet,
    marketId: match.marketId,
    assetId: match.assetId,
    poolId: match.poolId ?? (sibling && "poolId" in sibling ? sibling.poolId : undefined),
    symbol: sibling?.symbol ?? symbol,
    amount: nextAmount,
    valueUsd: nextValueUsd,
    state: match.state,
    updatedAt: now,
  } as never)
}

function liquidAssetIdFromArgs(assetId?: string, marketSlug?: string): string {
  if (assetId) {
    const base = assetId.includes(":") ? assetId.split(":").pop() : assetId
    if (base) return base.toLowerCase()
  }
  if (marketSlug) {
    const parts = marketSlug.toLowerCase().split(/[-_:]/)
    const stable = parts.find((part) => part === "usdc" || part === "usdt" || part === "dai")
    if (stable) return stable
    const last = parts.at(-1)
    if (last) return last
  }
  return "usdc"
}

/** Hourly per-wallet transaction cap (anti-abuse). Exported for tests. */
export const MAX_TX_PER_HOUR = 200
const PORTFOLIO_HISTORY_INTERVAL_MS = 60 * 60 * 1000
const MAX_PORTFOLIO_HISTORY_ROWS = 365

/** Global multiply leverage ceiling, mirrors MULTIPLY_ACTION_MAX_LEVERAGE (client slider). */
const MAX_MULTIPLIER = 10

/** Liquidation threshold (%) assumed when a pledged pool has none recorded AND no maxLtv to
 *  derive one from. Conservative. */
const BORROW_FALLBACK_LIQUIDATION_PCT = 85

/**
 * Derive a liquidation threshold from a pool's max-LTV / collateral factor when the pool has
 * no explicit `liquidationThresholdPct`. Kept in lockstep with the client credit engine's
 * `estimateLiquidationThresholdWad` (borrow-system/mock.ts): LT = maxLtv + 10pp, capped at
 * 95%. Convex can't import app/, so this is hand-synced (like the price baseline). Using the
 * raw maxLtv (collateral factor) here instead — as the old fallback did — understated the
 * liquidation value and rejected borrows the client preview had shown as solvent (HF ≥ 1),
 * breaking confirm==persist parity. (#12)
 */
const LIQUIDATION_THRESHOLD_SPREAD_PCT = 10
const LIQUIDATION_THRESHOLD_CAP_PCT = 95
function liquidationThresholdFromMaxLtv(maxLtvPct: number) {
  return Math.min(maxLtvPct + LIQUIDATION_THRESHOLD_SPREAD_PCT, LIQUIDATION_THRESHOLD_CAP_PCT)
}

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
  supplyApyPct: v.optional(v.number()),
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
    // "close" carries an explicit zeroed position payload (see multiplyResultToRecordArgs) so
    // the server runs its position-close branch instead of leaving a resurrecting "open" row.
    multiply: new Set(["multiply", "deleverage", "close"]),
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
 * Revalue a collateral leg from shares/principal + server oracle — never from the
 * client-supplied `collateralValueUsd6` (that field is display-only and spoofable).
 *
 * Sandbox writes historically store usd6 microdollars in shares/principal (tests +
 * persistence). Real engine positions store 18-decimal LP token amounts; those are
 * converted with `pools.lpTokenPriceUsd` / `markets.priceUsd` when present.
 */
async function serverCollateralValueUsd(
  ctx: MutationCtx,
  row: { marketSlug: string; collateralShares: string; principalTokenAmount: string },
) {
  const principal = BigInt(row.principalTokenAmount)
  const shares = BigInt(row.collateralShares)
  const raw = principal > 0n ? principal : shares
  if (raw <= 0n) {
    throw new Error(`INVALID_TRANSITION: collateral ${row.marketSlug} has no server-verifiable value.`)
  }

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
  const valueUsd =
    raw >= 10n ** 12n
      ? priceUsd && priceUsd > 0
        ? (Number(raw) / 1e18) * priceUsd
        : (() => {
            throw new Error(`INVALID_TRANSITION: collateral ${row.marketSlug} has no server-verifiable value.`)
          })()
      : Number(raw) / 1_000_000

  if (!(valueUsd > 0)) {
    throw new Error(`INVALID_TRANSITION: collateral ${row.marketSlug} has no server-verifiable value.`)
  }
  return { valueUsd, pool }
}

/**
 * Server-side borrow solvency re-derivation. The Credit Engine runs in the browser, so
 * the server must independently confirm a borrow/withdraw write does not persist an
 * underwater (HF < 1) or unbacked position — otherwise a tampered client could record
 * arbitrary debt against arbitrary (or zero) collateral. We re-derive collateral USD
 * from shares/principal + oracle and apply pool liquidation thresholds (NOT any
 * client-supplied HF or collateralValueUsd6) and reject when debt exceeds it.
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
  for (const row of collateralRows) {
    const { valueUsd, pool } = await serverCollateralValueUsd(ctx, row)
    // Match the client credit engine's HF basis: explicit LT if the pool has one, otherwise
    // maxLtv + 10pp (capped 95%) — NOT the raw maxLtv, which is the borrow-capacity collateral
    // factor and understates the liquidation value, causing server rejections of borrows the
    // preview allowed (#12).
    const thresholdPct =
      pool?.liquidationThresholdPct ??
      (pool?.maxLtvPct != null ? liquidationThresholdFromMaxLtv(pool.maxLtvPct) : BORROW_FALLBACK_LIQUIDATION_PCT)
    liquidationValueUsd += valueUsd * (thresholdPct / 100)
  }

  if (debtUsd > liquidationValueUsd + 0.01) {
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
  const [positions, balances, walletDebts, walletCollateral] = await Promise.all([
    ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("sandboxBalances")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletDebts")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletCollateralPositions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
  ])
  const open = positions.filter((position) => position.status === "open")
  const liquid = balances.reduce((sum, balance) => sum + balance.valueUsd, 0)
  const borrowPositions = open.filter((position) => position.product === "borrow")
  const marketsWithLiveBorrow = new Set(borrowPositions.map((position) => position.marketSlug))
  const borrowCollateral = borrowPositions.reduce((sum, position) => sum + usd6Number(position.collateralValueUsd6), 0)
  const borrowDebt = borrowPositions.reduce((sum, position) => sum + usd6Number(position.debtValueUsd6), 0)
  // Home-seed tables fill markets that have not yet been written into `positions`, so the
  // Convex portfolio chart matches the dashboard/home cards before the first borrow action.
  const seedCollateral = walletCollateral
    .filter((row) => !marketsWithLiveBorrow.has(row.marketId))
    .reduce((sum, row) => sum + row.collateralUsd, 0)
  const seedDebt = walletDebts
    .filter((row) => !marketsWithLiveBorrow.has(row.marketId))
    .reduce((sum, row) => sum + row.amountUsd, 0)
  const totalBorrowCollateral = borrowCollateral + seedCollateral
  const totalBorrowDebt = borrowDebt + seedDebt
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

  // ATB from per-pool collateral factors — never a hardcoded *0.7.
  const borrowSlugs = [
    ...new Set([
      ...borrowPositions.map((position) => position.marketSlug).filter(Boolean),
      ...walletCollateral.filter((row) => !marketsWithLiveBorrow.has(row.marketId)).map((row) => row.marketId),
    ]),
  ]
  const borrowPools = await Promise.all(
    borrowSlugs.map((slug) =>
      ctx.db
        .query("pools")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique(),
    ),
  )
  const maxLtvBySlug = new Map(
    borrowPools
      .filter((pool): pool is NonNullable<typeof pool> => pool !== null)
      .map((pool) => [pool.slug, pool.maxLtvPct / 100] as const),
  )
  for (const row of walletCollateral) {
    if (marketsWithLiveBorrow.has(row.marketId) || maxLtvBySlug.has(row.marketId)) continue
    maxLtvBySlug.set(row.marketId, row.maxLtvPct / 100)
  }
  const borrowCapacityUsd =
    borrowPositions.reduce((sum, position) => {
      const collateralUsd = usd6Number(position.collateralValueUsd6)
      const cf = maxLtvBySlug.get(position.marketSlug) ?? BORROW_FALLBACK_LIQUIDATION_PCT / 100
      return sum + collateralUsd * cf
    }, 0) +
    walletCollateral
      .filter((row) => !marketsWithLiveBorrow.has(row.marketId))
      .reduce((sum, row) => {
        const cf = maxLtvBySlug.get(row.marketId) ?? row.maxLtvPct / 100
        return sum + row.collateralUsd * cf
      }, 0)

  const snapshot = {
    wallet,
    at: now,
    totalValueUsd: liquid + totalBorrowCollateral - totalBorrowDebt + lendSupplied + multiplyCollateral - multiplyDebt,
    totalSuppliedUsd: totalBorrowCollateral + lendSupplied + multiplyCollateral,
    totalBorrowedUsd: totalBorrowDebt + multiplyDebt,
    availableToBorrowUsd: Math.max(0, borrowCapacityUsd - totalBorrowDebt),
    totalMultiplyExposureUsd: multiplyCollateral,
    totalEarnedUsd: earned,
  }

  const current = await ctx.db
    .query("portfolioCurrent")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .unique()
  if (current) await ctx.db.replace(current._id, snapshot)
  else await ctx.db.insert("portfolioCurrent", snapshot)

  const latestHistory = await ctx.db
    .query("portfolioSnapshots")
    .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
    .order("desc")
    .first()
  if (!latestHistory || now - latestHistory.at >= PORTFOLIO_HISTORY_INTERVAL_MS) {
    await ctx.db.insert("portfolioSnapshots", snapshot)
    const history = await ctx.db
      .query("portfolioSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .take(MAX_PORTFOLIO_HISTORY_ROWS + 1)
    for (const expired of history.slice(MAX_PORTFOLIO_HISTORY_ROWS)) {
      await ctx.db.delete(expired._id)
    }
  }
}

/**
 * Append a delta event to the shared liquidity ledger (`marketLiquidityDeltas`).
 * This is the auth-gated, wallet-attributed write path that unifies every product's
 * supply/borrow movement onto one ledger (mirrors `convex/liquidity.recordDelta`, but
 * reached only from inside an owner-verified mutation).
 *
 * Deliberately still a pure append — a fresh row per action, never a read-modify-write of
 * a shared per-market row — so concurrent writers never contend on the same document under
 * Convex OCC (the property this ledger was designed around). Scale is handled OFF this hot
 * path: `liquidity.compactDeltas` periodically folds old rows into a bounded per-market
 * baseline and deletes them, so the fold (`liquidity.foldDeltas`) reads
 * `#markets + #recent rows` instead of the whole table — without adding any contention here.
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

  await ctx.db.insert("marketLiquidityDeltas", {
    marketSlug,
    borrowedDeltaUsd: borrowed,
    suppliedDeltaUsd: supplied,
    updatedAt: now,
  })
}

/**
 * Persist the remaining claimable on each borrow LP-fee reward position after a claim.
 * Stored as an absolute per-(wallet, rewardPositionId) value so hydration can reduce the
 * seeded claimable to it. Idempotent by construction: replaying the same claim writes the
 * same remaining value. (Top-level intentId short-circuit already prevents replays.)
 */
async function applyRewardClaims(
  ctx: MutationCtx,
  wallet: string,
  claims: Array<{ rewardPositionId: string; remainingUsd6: string }>,
  now: number,
) {
  for (const claim of claims) {
    requireUnsignedInteger(claim.remainingUsd6, "remainingUsd6")
    const existing = await ctx.db
      .query("sandboxRewardClaims")
      .withIndex("by_wallet_position", (q) => q.eq("wallet", wallet).eq("rewardPositionId", claim.rewardPositionId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { remainingUsd6: claim.remainingUsd6, updatedAt: now })
    } else {
      await ctx.db.insert("sandboxRewardClaims", {
        wallet,
        rewardPositionId: claim.rewardPositionId,
        remainingUsd6: claim.remainingUsd6,
        updatedAt: now,
      })
    }
    // Keep home claim cards (walletClaimPositions) aligned with the durable remaining.
    const homeClaim = await ctx.db
      .query("walletClaimPositions")
      .withIndex("by_wallet_claim", (q) => q.eq("wallet", wallet).eq("claimId", claim.rewardPositionId))
      .unique()
    if (homeClaim) {
      const remainingUsd = Number(claim.remainingUsd6) / 1_000_000
      await ctx.db.patch(homeClaim._id, {
        totalUsd: Number.isFinite(remainingUsd) ? Math.max(0, remainingUsd) : 0,
        updatedAt: now,
      })
    }
  }
}

/**
 * Mirror a durable borrow `positions` row into the home-seed tables so home cards and
 * dashboard hydrate stay on one truth after the first action for a market.
 */
async function syncHomeBorrowMirrors(
  ctx: MutationCtx,
  wallet: string,
  marketSlug: string,
  position: Infer<typeof positionPayload>,
  now: number,
) {
  const closed = position.status === "closed"
  const collateralFromLegs = (position.collateral ?? []).reduce(
    (sum, leg) => sum + (leg.collateralValueUsd6 ? usd6Number(leg.collateralValueUsd6) : 0),
    0,
  )
  const collateralUsd = closed
    ? 0
    : (position.collateralValueUsd ??
      ((position.collateralValueUsd6 ? usd6Number(position.collateralValueUsd6) : 0) || collateralFromLegs))
  const debtLegs =
    position.debt?.map((leg) => ({
      debtAssetId: leg.baseAssetId || leg.assetId.split(":").pop() || leg.assetId,
      amountUsd: closed ? 0 : Number(leg.principalBorrowedUsd6) / 1_000_000,
    })) ?? []
  const debtUsd = closed
    ? 0
    : debtLegs.length > 0
      ? debtLegs.reduce((sum, leg) => sum + (Number.isFinite(leg.amountUsd) ? leg.amountUsd : 0), 0)
      : (position.debtValueUsd ?? usd6Number(position.debtValueUsd6))

  const [collateralRows, debtRows] = await Promise.all([
    ctx.db
      .query("walletCollateralPositions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("walletDebts")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
  ])
  const collateralMatch = collateralRows.find((row) => row.marketId === marketSlug)
  if (collateralMatch) {
    if (closed || collateralUsd <= 0) {
      await ctx.db.delete(collateralMatch._id)
    } else {
      const maxLtvPct = collateralMatch.maxLtvPct
      await ctx.db.patch(collateralMatch._id, {
        collateralUsd,
        borrowPowerUsd: collateralUsd * (maxLtvPct / 100),
        updatedAt: now,
      })
    }
  }

  const debtsForMarket = debtRows.filter((row) => row.marketId === marketSlug)
  if (closed || debtUsd <= 0) {
    for (const row of debtsForMarket) await ctx.db.delete(row._id)
    return
  }

  if (debtLegs.length > 0) {
    for (const leg of debtLegs) {
      if (!(leg.amountUsd > 0)) continue
      const existing = debtsForMarket.find((row) => row.debtAssetId === leg.debtAssetId)
      if (existing) {
        await ctx.db.patch(existing._id, { amountUsd: leg.amountUsd, updatedAt: now })
      } else if (collateralMatch) {
        await ctx.db.insert("walletDebts", {
          wallet,
          homePoolId: collateralMatch.homePoolId,
          marketId: marketSlug,
          debtAssetId: leg.debtAssetId,
          amountUsd: leg.amountUsd,
          updatedAt: now,
        })
      }
    }
    for (const row of debtsForMarket) {
      if (!debtLegs.some((leg) => leg.debtAssetId === row.debtAssetId && leg.amountUsd > 0)) {
        await ctx.db.delete(row._id)
      }
    }
    return
  }

  const existing = debtsForMarket[0]
  if (existing) {
    await ctx.db.patch(existing._id, { amountUsd: debtUsd, updatedAt: now })
  } else if (collateralMatch) {
    await ctx.db.insert("walletDebts", {
      wallet,
      homePoolId: collateralMatch.homePoolId,
      marketId: marketSlug,
      debtAssetId: position.assetId?.split(":").pop() || "usdc",
      amountUsd: debtUsd,
      updatedAt: now,
    })
  }
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
    /** Per-transaction multiply leverage, persisted so hydrated history renders the real
     *  before→after instead of a constant 1 × the position's current multiplier. */
    multiplierBefore: v.optional(v.number()),
    multiplierAfter: v.optional(v.number()),
    position: v.optional(positionPayload),
    /**
     * Optimistic-concurrency token: the `positions.revision` the client read before it
     * computed this write. When supplied and the stored position has since advanced, the
     * write is rejected (STALE_WRITE) instead of overwriting the concurrent change.
     */
    expectedRevision: v.optional(v.number()),
    /** Remaining claimable per borrow LP-fee reward position after this claim (usd6 decimal
     *  strings). Sent only for a borrow "claim"; persisted so claimable survives reload. */
    rewardClaims: v.optional(v.array(v.object({ rewardPositionId: v.string(), remainingUsd6: v.string() }))),
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
      // Return the position's CURRENT revision so a client whose original response was lost can
      // seed its optimistic-concurrency map from the replay. Without it, an idempotent CREATE
      // replay left the client's map empty and its next write to this position sent no
      // expectedRevision → REVISION_REQUIRED (M-12).
      const priorPosition = prior.positionId ? await ctx.db.get(prior.positionId) : null
      return {
        idempotent: true,
        transactionId: prior._id,
        positionId: prior.positionId ?? null,
        revision: priorPosition?.revision ?? null,
        receipt: {
          id: prior._id,
          hash: prior.syntheticTxHash,
          status: prior.status,
          simulated: prior.simulated,
          timestamp: prior.at,
        },
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
    // Revision actually written to the position this call, returned so the client seeds its
    // optimistic-concurrency map from the server truth instead of inferring it (M-12).
    let writtenRevision: number | undefined
    if (args.position && status === "success" && marketSlug) {
      validatePositionPayload(args.position)
      const existing =
        (await ctx.db
          .query("positions")
          .withIndex("by_wallet_product_market", (q) =>
            q.eq("wallet", wallet).eq("product", args.product).eq("marketSlug", marketSlug),
          )
          .unique()) ?? undefined
      existingPosition = existing
      // Optimistic concurrency: reject a write computed from a stale read instead of
      // silently clobbering a concurrent one (two tabs on the same wallet/market).
      const currentRevision = existing?.revision ?? 0
      if (existing && args.expectedRevision == null) {
        throw new Error(
          `REVISION_REQUIRED: ${args.product} position for ${marketSlug} already exists; ` +
            "reload it and submit its expectedRevision.",
        )
      }
      if (existing && args.expectedRevision !== currentRevision) {
        throw new Error(
          `STALE_WRITE: ${args.product} position for ${marketSlug} changed since it was read ` +
            `(expected revision ${args.expectedRevision}, found ${currentRevision}); reload and retry.`,
        )
      }
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
        supplyApyPct: args.position.supplyApyPct,
        collateralAmount: args.position.collateralAmount,
        collateralValueUsd: args.position.collateralValueUsd,
        debtValueUsd: args.position.debtValueUsd,
        multiplier: args.position.multiplier,
        ltv: args.position.ltv,
        healthFactor: args.position.healthFactor,
        liquidationPrice: args.position.liquidationPrice,
        netApyPct: args.position.netApyPct,
        lastUpdatedAt: now,
        revision: existing ? currentRevision + 1 : 0,
        ...(args.position.status === "closed" ? { closedAt: now } : {}),
      }
      writtenRevision = fields.revision
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
          ctx.db
            .query("positionCollateral")
            .withIndex("by_position", (q) => q.eq("positionId", positionId!))
            .collect(),
          ctx.db
            .query("positionDebt")
            .withIndex("by_position", (q) => q.eq("positionId", positionId!))
            .collect(),
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
        await syncHomeBorrowMirrors(ctx, wallet, marketSlug, args.position, now)
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
      multiplierBefore: args.multiplierBefore,
      multiplierAfter: args.multiplierAfter,
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
        await applyLedgerDelta(ctx, ledger.marketSlug, ledger.borrowedDeltaUsd, ledger.suppliedDeltaUsd, now)
      }
      if (args.product === "borrow" && args.kind === "claim" && args.rewardClaims?.length) {
        await applyRewardClaims(ctx, wallet, args.rewardClaims, now)
      }
      // Keep liquid wallet balances durable for cash-moving actions (lend deposit/withdraw,
      // borrow/repay). Token delta is derived from USD via the existing sandbox price.
      if (
        (args.product === "lend" && (args.kind === "deposit" || args.kind === "withdraw")) ||
        (args.product === "borrow" && (args.kind === "borrow" || args.kind === "repay"))
      ) {
        const assetId = liquidAssetIdFromArgs(args.assetId, marketSlug)
        const sandbox = await ctx.db
          .query("sandboxBalances")
          .withIndex("by_wallet_asset", (q) => q.eq("wallet", wallet).eq("assetSlug", assetId))
          .unique()
        const priceUsd = sandbox?.priceUsd && sandbox.priceUsd > 0 ? sandbox.priceUsd : 1
        const tokenAmount = args.amountUsd / priceUsd
        const signed = args.kind === "deposit" || args.kind === "repay" ? -tokenAmount : tokenAmount
        await applyLiquidAssetDelta(ctx, wallet, assetId, assetId.toUpperCase(), signed, now)
      }
      await applyProductBucketDelta(ctx, wallet, args, marketSlug, now)
      await appendPortfolioSnapshot(ctx, wallet, now)
    }

    return {
      idempotent: false,
      transactionId,
      positionId: positionId ?? null,
      revision: writtenRevision ?? null,
      receipt: { id: transactionId, hash, status, simulated, timestamp: now },
    }
  },
})

async function applyProductBucketDelta(
  ctx: MutationCtx,
  wallet: string,
  args: {
    product: "borrow" | "lend" | "multiply"
    kind: string
    marketSlug?: string
    assetId?: string
    amountUsd: number
    position?: Infer<typeof positionPayload>
    rewardClaims?: Array<{ rewardPositionId: string; remainingUsd6: string }>
  },
  marketSlug: string | undefined,
  now: number,
) {
  const assetId = liquidAssetIdFromArgs(args.assetId, marketSlug)
  if (args.product === "lend" && marketSlug) {
    if (args.kind === "deposit") {
      await adjustProductBalanceUsd(
        ctx,
        "walletLendBalances",
        wallet,
        { marketId: marketSlug, assetId, state: "available" },
        assetId.toUpperCase(),
        -args.amountUsd,
        now,
      )
      await adjustProductBalanceUsd(
        ctx,
        "walletLendBalances",
        wallet,
        { marketId: marketSlug, assetId, state: "deposited" },
        assetId.toUpperCase(),
        args.amountUsd,
        now,
      )
    } else if (args.kind === "withdraw") {
      await adjustProductBalanceUsd(
        ctx,
        "walletLendBalances",
        wallet,
        { marketId: marketSlug, assetId, state: "deposited" },
        assetId.toUpperCase(),
        -args.amountUsd,
        now,
      )
      await adjustProductBalanceUsd(
        ctx,
        "walletLendBalances",
        wallet,
        { marketId: marketSlug, assetId, state: "available" },
        assetId.toUpperCase(),
        args.amountUsd,
        now,
      )
    }
    return
  }

  if (args.product === "borrow") {
    if (marketSlug && (args.kind === "deposit" || args.kind === "withdraw")) {
      const signed = args.kind === "deposit" ? args.amountUsd : -args.amountUsd
      await adjustProductBalanceUsd(
        ctx,
        "walletBorrowBalances",
        wallet,
        { marketId: marketSlug, state: "poolAvailable" },
        marketSlug.toUpperCase(),
        -signed,
        now,
      )
      await adjustProductBalanceUsd(
        ctx,
        "walletBorrowBalances",
        wallet,
        { marketId: marketSlug, state: "collateral" },
        marketSlug.toUpperCase(),
        signed,
        now,
      )
    }
    if (args.kind === "borrow" || args.kind === "repay") {
      const debtAssetId = liquidAssetIdFromArgs(args.assetId, marketSlug)
      await adjustProductBalanceUsd(
        ctx,
        "walletBorrowBalances",
        wallet,
        { marketId: marketSlug, assetId: debtAssetId, state: "debt" },
        debtAssetId.toUpperCase(),
        args.kind === "borrow" ? args.amountUsd : -args.amountUsd,
        now,
      )
    }
    if (args.kind === "claim" && args.rewardClaims?.length) {
      for (const claim of args.rewardClaims) {
        await adjustProductBalanceUsd(
          ctx,
          "walletBorrowBalances",
          wallet,
          { assetId: claim.rewardPositionId, state: "claimableFees" },
          "Fees",
          -args.amountUsd,
          now,
        )
      }
    }
    return
  }

  if (args.product === "multiply" && marketSlug && args.position) {
    const baseAsset = liquidAssetIdFromArgs(args.position.assetId ?? args.assetId, marketSlug)
    const collateralValueUsd = args.position.status === "closed" ? 0 : (args.position.collateralValueUsd ?? 0)
    const debtValueUsd = args.position.status === "closed" ? 0 : (args.position.debtValueUsd ?? 0)
    const collateralAmount =
      args.position.status === "closed" ? 0 : (args.position.collateralAmount ?? collateralValueUsd)
    await upsertProductBalanceValue(ctx, "walletMultiplyBalances", wallet, {
      marketId: marketSlug,
      assetId: baseAsset,
      symbol: baseAsset.toUpperCase(),
      amount: collateralAmount,
      valueUsd: collateralValueUsd,
      state: "position",
    })
    await upsertProductBalanceValue(ctx, "walletMultiplyBalances", wallet, {
      marketId: marketSlug,
      assetId: baseAsset,
      symbol: baseAsset.toUpperCase(),
      amount: collateralAmount,
      valueUsd: collateralValueUsd,
      state: "collateral",
    })
    await upsertProductBalanceValue(ctx, "walletMultiplyBalances", wallet, {
      marketId: marketSlug,
      assetId,
      symbol: assetId.toUpperCase(),
      amount: debtValueUsd,
      valueUsd: debtValueUsd,
      state: "debt",
    })
  }
}

/**
 * Persist an executed Express/standalone swap as a durable, server-owned transaction.
 *
 * A swap is a pure liquid-balance move (debit input token, credit output token) with no
 * position, so it takes the dedicated path here instead of `recordTransaction`'s
 * position-oriented transition validation. Same ownership + idempotency + rate-limit
 * guarantees. On success, sandboxBalances + walletBalances are updated so the dashboard
 * Wallet tab and portfolio liquid legs stay durable. Swaps are USD-neutral at the
 * portfolio-net level, so no portfolio snapshot is appended.
 */
export const recordSwap = mutation({
  args: {
    wallet: v.string(),
    /** Client swap id — the idempotency key (replays return the existing row). */
    intentId: v.string(),
    status: v.optional(v.union(v.literal("success"), v.literal("failed"), v.literal("pending"))),
    inputAssetId: v.string(),
    outputAssetId: v.string(),
    inputSymbol: v.string(),
    outputSymbol: v.string(),
    inputAmount: v.number(),
    outputAmount: v.number(),
    /** USD value of the input leg (what the swap moved). */
    amountUsd: v.number(),
    /** Receipt detail — persisted so the synthetic-transaction receipt renders the full
     *  swap breakdown from the durable row alone (cross-device / after session history). */
    provider: v.optional(v.string()),
    quoteId: v.optional(v.string()),
    networkFeeUsd: v.optional(v.number()),
    minOutputAmount: v.optional(v.number()),
    priceImpactPct: v.optional(v.number()),
    slippageBps: v.optional(v.number()),
    simulated: v.optional(v.boolean()),
    /** Optional client tx hash; a synthetic one is derived when absent. */
    syntheticTxHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const now = Date.now()

    // Idempotency — a replayed swap id returns the existing row, never double-records.
    const prior = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_intent", (q) => q.eq("wallet", wallet).eq("intentId", args.intentId))
      .first()
    if (prior) {
      return {
        idempotent: true,
        transactionId: prior._id,
        receipt: {
          id: prior._id,
          hash: prior.syntheticTxHash,
          status: prior.status,
          simulated: prior.simulated,
          timestamp: prior.at,
        },
      }
    }

    // Same hourly per-wallet cap as recordTransaction (bounded read).
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
    // A failed/expired/rejected swap executed nothing, so its output leg is legitimately 0
    // (recordFailure). Only a successful swap must have moved a positive output; every swap
    // still needs a positive input (the amount attempted) and a non-negative USD value.
    const outputAmountValid = status === "success" ? args.outputAmount > 0 : args.outputAmount >= 0
    if (!(args.inputAmount > 0) || !outputAmountValid || !(args.amountUsd >= 0)) {
      throw new Error("INVALID_SWAP: input must be positive, output positive on success, USD non-negative.")
    }
    // Only a successful swap moved value; failed/expired executed nothing.
    const executedUsd6 = status === "success" ? String(Math.round(args.amountUsd * 1_000_000)) : "0"
    const requestedUsd6 = String(Math.round(args.amountUsd * 1_000_000))
    const hash = args.syntheticTxHash ?? `sim-swap-${args.intentId.slice(0, 8)}-${now.toString(36)}`

    const transactionId = await ctx.db.insert("transactions", {
      wallet,
      intentId: args.intentId,
      product: "swap",
      kind: "swap",
      status,
      assetId: args.inputAssetId,
      requestedAmountUsd6: requestedUsd6,
      executedAmountUsd6: executedUsd6,
      amountUsd: status === "success" ? args.amountUsd : 0,
      swapInputSymbol: args.inputSymbol,
      swapOutputSymbol: args.outputSymbol,
      swapInputAmount: args.inputAmount,
      swapOutputAmount: args.outputAmount,
      swapProvider: args.provider,
      swapQuoteId: args.quoteId,
      swapNetworkFeeUsd: args.networkFeeUsd,
      swapMinOutputAmount: args.minOutputAmount,
      swapPriceImpactPct: args.priceImpactPct,
      swapSlippageBps: args.slippageBps,
      syntheticTxHash: hash,
      simulated,
      at: now,
    })

    if (status === "success") {
      await applySwapBalanceDelta(ctx, wallet, args, now)
    }

    return {
      idempotent: false,
      transactionId,
      receipt: { id: transactionId, hash, status, simulated, timestamp: now },
    }
  },
})

/** Durable swap history for a wallet (newest first) — feeds the dashboard activity/receipt. */
export const getWalletSwapTransactions = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_wallet_product_at", (q) => q.eq("wallet", wallet).eq("product", "swap"))
      .order("desc")
      .take(200)
    return rows.map((row) => ({
      id: row._id,
      intentId: row.intentId ?? null,
      status: row.status,
      inputSymbol: row.swapInputSymbol ?? "",
      outputSymbol: row.swapOutputSymbol ?? "",
      inputAmount: row.swapInputAmount ?? 0,
      outputAmount: row.swapOutputAmount ?? 0,
      amountUsd: row.amountUsd,
      hash: row.syntheticTxHash,
      at: row.at,
    }))
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
        ctx.db
          .query("positionCollateral")
          .withIndex("by_position", (q) => q.eq("positionId", p._id))
          .collect(),
        ctx.db
          .query("positionDebt")
          .withIndex("by_position", (q) => q.eq("positionId", p._id))
          .collect(),
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
    const [positions, transactions, balances, starterAllocation, rewardClaims] = await Promise.all([
      ctx.db
        .query("positions")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
        .order("desc")
        .take(500),
      ctx.db
        .query("sandboxBalances")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .collect(),
      ctx.db
        .query("starterAllocations")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .unique(),
      ctx.db
        .query("sandboxRewardClaims")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .collect(),
    ])
    // Hydrate collateral/debt in parallel (was a sequential per-position await loop).
    const hydratedPositions = await Promise.all(
      positions.map(async (position) => {
        const [collateral, debt] = await Promise.all([
          ctx.db
            .query("positionCollateral")
            .withIndex("by_position", (q) => q.eq("positionId", position._id))
            .collect(),
          ctx.db
            .query("positionDebt")
            .withIndex("by_position", (q) => q.eq("positionId", position._id))
            .collect(),
        ])
        return { ...position, collateral, debt }
      }),
    )
    return {
      positions: hydratedPositions,
      transactions,
      balances,
      starterAllocation,
      rewardClaims: rewardClaims.map((row) => ({
        rewardPositionId: row.rewardPositionId,
        remainingUsd6: row.remainingUsd6,
      })),
    }
  },
})

/** Full wallet-scoped portfolio read model plus the catalog identity rows it references. */
export const getPortfolioPageState = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect()

    // Hydrate collateral/debt in parallel (was a sequential per-position loop).
    const hydratedPositions = await Promise.all(
      positions.map(async (position) => {
        const [collateral, debt] = await Promise.all([
          ctx.db
            .query("positionCollateral")
            .withIndex("by_position", (q) => q.eq("positionId", position._id))
            .collect(),
          ctx.db
            .query("positionDebt")
            .withIndex("by_position", (q) => q.eq("positionId", position._id))
            .collect(),
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
        marketRefs.set(`${position.product}:${position.marketSlug}`, {
          scope: position.product,
          slug: position.marketSlug,
        })
      }
    }

    const [transactions, snapshotRows, current, risk, rewards, balances, starterAllocation, poolRows, marketRows] =
      await Promise.all([
        ctx.db
          .query("transactions")
          .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
          .order("desc")
          .take(500),
        ctx.db
          .query("portfolioSnapshots")
          .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
          .order("desc")
          .take(MAX_PORTFOLIO_HISTORY_ROWS),
        ctx.db
          .query("portfolioCurrent")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
          .unique(),
        ctx.db
          .query("riskSnapshots")
          .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
          .order("desc")
          .first(),
        ctx.db
          .query("sandboxRewards")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
          .unique(),
        ctx.db
          .query("sandboxBalances")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
          .collect(),
        ctx.db
          .query("starterAllocations")
          .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
          .unique(),
        Promise.all(
          [...poolSlugs].map((slug) =>
            ctx.db
              .query("pools")
              .withIndex("by_slug", (q) => q.eq("slug", slug))
              .unique(),
          ),
        ),
        Promise.all(
          [...marketRefs.values()].map((ref) =>
            ctx.db
              .query("markets")
              .withIndex("by_scope_slug", (q) => q.eq("scope", ref.scope).eq("slug", ref.slug))
              .unique(),
          ),
        ),
      ])
    const pools = poolRows.filter((row): row is NonNullable<typeof row> => row !== null)
    const markets = marketRows.filter((row): row is NonNullable<typeof row> => row !== null)
    const snapshots = snapshotRows.reverse()
    // portfolioCurrent and portfolioSnapshots share identical value fields; only the branded _id
    // differs. Appending the live "current" point to the historical series is intended, so cast
    // past the nominal _id mismatch (runtime-identical to the prior push; keeps `tsc --noEmit`
    // green, which CI gates on).
    if (current && snapshots.at(-1)?.at !== current.at) snapshots.push(current as unknown as (typeof snapshots)[number])
    return {
      positions: hydratedPositions,
      transactions,
      snapshots,
      risk,
      pools,
      markets,
      rewards,
      balances,
      starterAllocation,
    }
  },
})

/** Wallet-scoped portfolio: the snapshot time series + position summary. */
export const getPortfolio = query({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const [snapshotRows, current, positions] = await Promise.all([
      ctx.db
        .query("portfolioSnapshots")
        .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
        .order("desc")
        .take(MAX_PORTFOLIO_HISTORY_ROWS),
      ctx.db
        .query("portfolioCurrent")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .unique(),
      ctx.db
        .query("positions")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .collect(),
    ])
    const snapshots = snapshotRows.reverse()
    const latest = current ?? snapshots.at(-1) ?? null
    // portfolioCurrent and portfolioSnapshots share identical value fields; only the branded _id
    // differs. Appending the live "current" point to the historical series is intended, so cast
    // past the nominal _id mismatch (runtime-identical to the prior push; keeps `tsc --noEmit`
    // green, which CI gates on).
    if (current && snapshots.at(-1)?.at !== current.at) snapshots.push(current as unknown as (typeof snapshots)[number])
    return {
      snapshots,
      latest,
      openPositions: positions.filter((p) => p.status === "open").length,
      positionCount: positions.length,
    }
  },
})

/**
 * Open-gate helper: write the first portfolioCurrent/snapshot when home seeds + liquid
 * balances exist but no action has fired appendPortfolioSnapshot yet — so the dashboard
 * chart can read Convex history instead of a synthetic series.
 */
export const ensurePortfolioSnapshot = mutation({
  args: { wallet: v.string() },
  handler: async (ctx, args) => {
    const wallet = await requireSandboxWallet(ctx, args.wallet)
    const current = await ctx.db
      .query("portfolioCurrent")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .unique()
    if (current) return { wrote: false as const }
    await appendPortfolioSnapshot(ctx, wallet, Date.now())
    return { wrote: true as const }
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
