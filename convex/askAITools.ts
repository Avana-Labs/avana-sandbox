import { v } from "convex/values"
import { ASK_AI_CONFIG, ASK_AI_WALLET_REQUIRED } from "../app/lib/ask-ai/config"
import type { AskAIMarketSource } from "../app/lib/ask-ai/providers/contracts"
import {
  calculateLendProjection,
  calculateAskAIBorrowSimulation,
  calculateAskAICollateralStress,
  calculateMultiplyStress,
  decodeBorrowRiskSnapshot,
  deriveAskAIUmbrellaStatus,
  askAIHealthFactorValue,
  askAIRiskLevel,
  calculateBorrowProjection,
} from "../app/lib/ask-ai/engine-calculations"
import { internalQuery, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { calculatePriceDropToLiquidationPct } from "../app/lib/multiply-engine/formulas"
import { getAuthedWallet } from "./sandbox/auth"
import { computePortfolioNetApyPct } from "./sandbox/transactions"
import type { Id } from "./_generated/dataModel"

type PortfolioReadCtx = Pick<QueryCtx | MutationCtx, "auth" | "db">

function withTurnWallet(ctx: Pick<QueryCtx, "db">, wallet?: string): PortfolioReadCtx {
  return {
    db: ctx.db,
    auth: {
      getUserIdentity: async () =>
        ({
          subject: wallet ?? "ask-guest:scheduled",
          ...(wallet ? { wallet } : {}),
        }) as Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>,
    },
  }
}

async function readRunningTurnWallet(ctx: Pick<QueryCtx, "db">, turnId: Id<"askAITurns">) {
  const turn = await ctx.db.get(turnId)
  if (!turn || turn.status !== "running") throw new Error("Ask AI turn is not running")
  return turn.wallet
}

// Scheduled actions have no client auth. The queue stamped this wallet from the
// authenticated identity; a model can only supply the running turn ID internally.
export const aaveWalletForTurn = internalQuery({
  args: { turnId: v.id("askAITurns") },
  handler: async (ctx, { turnId }) => (await readRunningTurnWallet(ctx, turnId)) ?? null,
})

/**
 * Provenance of the financial figures every Ask AI portfolio/risk tool returns.
 * Lane B passes this straight through into `richParts.financialResults[].dataProvenance`.
 *
 * This is a sandbox-first app. All portfolio, borrow, risk, and position data read
 * by these tools is written by the synthetic sandbox onboarding/transaction flow
 * (see convex/sandbox/onboarding.ts: "Balances/prices here are SYNTHETIC sandbox
 * values, not a source of truth"). No table (positions, walletLendBalances,
 * riskSnapshots, sandboxProfiles, ...) carries a per-record signal that would
 * distinguish a synthetic sandbox balance from a real connected-wallet balance or
 * an on-chain read, and there is no on-chain/connected-wallet read path feeding
 * these tables today. The authed wallet is derived from the SIWE/Privy identity but
 * only scopes access — it does not imply the data is real holdings. So the only
 * honest value we can return is "sandbox".
 *
 * TODO: when a real connected-wallet or on-chain data path lands, thread the true
 * source through here — e.g. a per-record origin flag stamped by the writer — and
 * return "connected_wallet" / "onchain" per record instead of this constant.
 */
const ASK_AI_DATA_PROVENANCE: "sandbox" | "connected_wallet" | "onchain" = "sandbox"

export async function readAskAIPortfolio(ctx: PortfolioReadCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }

  const [lend, borrow, multiply, liquid, allPositions, umbrellaTranches, current, walletCollateral] = await Promise.all(
    [
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
      ctx.db
        .query("positions")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .collect(),
      ctx.db
        .query("umbrellaCooldownTranches")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .collect(),
      // Carries the wallet's cumulative earnings, which no per-row balance does.
      ctx.db
        .query("portfolioCurrent")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .unique(),
      // Needed by the shared Net APY calculation.
      ctx.db
        .query("walletCollateralPositions")
        .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
        .collect(),
    ],
  )
  const umbrella = allPositions.filter((position) => position.product === "umbrella")

  const sumUsd = (rows: readonly { valueUsd: number }[]) => rows.reduce((sum, row) => sum + row.valueUsd, 0)
  // These tables store debt with a POSITIVE valueUsd and mark it only with
  // `state: "debt"` (convex/sandbox/onboarding.ts, transactions.ts), so a plain
  // sum counts borrowed value as if it were an asset. Anything presented as a
  // net must subtract those rows.
  const netUsd = (rows: readonly { valueUsd: number; state?: string }[]) =>
    rows.reduce((sum, row) => sum + (row.state === "debt" ? -row.valueUsd : row.valueUsd), 0)
  // walletMultiplyBalances records the SAME collateral twice, once as
  // `state:"position"` and once as `state:"collateral"` (convex/sandbox/
  // transactions.ts), so any sum over the raw rows counts it twice. The
  // dashboard drops the duplicate (`if (row.state === "collateral") continue`
  // in app/lib/swap-system/use-convex-wallet-balances.ts); mirror that here.
  const multiplyRows = multiply.filter((row) => row.state !== "collateral")
  const sumState = (rows: readonly { valueUsd: number; state: string }[], ...states: string[]) =>
    sumUsd(rows.filter((row) => states.includes(row.state)))
  // "What is my biggest position?" — debt rows are obligations, not holdings.
  const largest = [
    ...lend.map((row) => ({ label: `Lend ${row.symbol}`, valueUsd: row.valueUsd, state: row.state as string })),
    ...borrow.map((row) => ({ label: `Borrow ${row.symbol}`, valueUsd: row.valueUsd, state: row.state as string })),
    ...multiplyRows.map((row) => ({
      label: `Multiply ${row.symbol}`,
      valueUsd: row.valueUsd,
      state: row.state as string,
    })),
    ...liquid.map((row) => ({ label: `Liquid ${row.symbol}`, valueUsd: row.valueUsd, state: row.state as string })),
  ]
    .filter((row) => row.state !== "debt")
    .sort((a, b) => b.valueUsd - a.valueUsd)[0]
  const now = Date.now()
  const umbrellaPositions = umbrella.map((position) => ({
    ...position,
    suppliedUsd: Number(position.suppliedUsd6 ?? "0") / 1_000_000,
    cooldownUsd: Number(position.cooldownAmountUsd6 ?? "0") / 1_000_000,
    // "How much have I earned staking?" and "have I been slashed?" — decoded
    // here because the raw doc carries these only as usd6 strings.
    earnedUsd: Number(position.earnedUsd6 ?? "0") / 1_000_000,
    slashedUsd: Number(position.slashedAmountUsd6 ?? "0") / 1_000_000,
    lifecycleStatus: deriveAskAIUmbrellaStatus({ ...position, now }),
    remainingCooldownMs: Math.max(0, (position.cooldownEndsAt ?? 0) - now),
    remainingWithdrawalWindowMs: Math.max(0, (position.withdrawalWindowEndsAt ?? 0) - now),
  }))
  const umbrellaCooldowns = umbrellaTranches.flatMap((tranche) => {
    const amountUsd = Number(tranche.amountUsd6) / 1_000_000
    if (tranche.status === "consumed" || amountUsd <= 0) return []
    const status = now < tranche.endsAt ? "cooling" : now <= tranche.windowEndsAt ? "ready" : "expired"
    return [
      {
        positionId: tranche.positionId,
        marketId: tranche.marketId,
        amountUsd,
        status,
        startedAt: tranche.startedAt,
        endsAt: tranche.endsAt,
        windowEndsAt: tranche.windowEndsAt,
        remainingCooldownMs: status === "cooling" ? tranche.endsAt - now : 0,
        remainingWithdrawalWindowMs: status === "ready" ? tranche.windowEndsAt - now : 0,
        canWithdraw: status === "ready",
      },
    ]
  })
  const cooling = umbrellaCooldowns.filter((tranche) => tranche.status === "cooling")
  const ready = umbrellaCooldowns.filter((tranche) => tranche.status === "ready")
  const expired = umbrellaCooldowns.filter((tranche) => tranche.status === "expired")
  const umbrellaSuppliedUsd = umbrella.reduce(
    (sum, position) => sum + Number(position.suppliedUsd6 ?? "0") / 1_000_000,
    0,
  )

  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    totals: {
      // Gross exposure per product (collateral + debt), kept for callers that
      // want position size rather than equity.
      lendUsd: sumUsd(lend),
      borrowUsd: sumUsd(borrow),
      multiplyUsd: sumUsd(multiplyRows),
      liquidUsd: sumUsd(liquid),
      umbrellaUsd: umbrellaSuppliedUsd,
      // Equity per product: the same rows with debt subtracted.
      lendNetUsd: netUsd(lend),
      borrowNetUsd: netUsd(borrow),
      multiplyNetUsd: netUsd(multiplyRows),
      liquidNetUsd: netUsd(liquid),
      // Canonical Net Value, following the dashboard hero
      // (app/dashboard/use-dashboard-portfolio-summary.ts aggregateNetValueUsd):
      // the signed sum of liquid + lend + borrow + multiply with debt negative.
      // Umbrella is excluded there by construction — it is not part of
      // productBalances and lives on its own page — so it is excluded here too
      // and reported separately as umbrellaUsd.
      netValueUsd: netUsd(liquid) + netUsd(lend) + netUsd(borrow) + netUsd(multiplyRows),
      // "How much have I earned?" — cumulative, not derivable from balances.
      totalEarnedUsd: current?.totalEarnedUsd ?? 0,
      // State-resolved answers. The gross totals above deliberately mix states
      // (walletLendBalances holds undeposited "available" next to "deposited";
      // walletBorrowBalances holds pledged collateral, debt and claimable fees),
      // so each of these questions needs its own figure rather than the model
      // filtering rows and adding money itself.
      suppliedUsd: sumState(lend, "deposited"),
      idleLendUsd: sumState(lend, "available"),
      debtUsd: sumState(borrow, "debt") + sumState(multiplyRows, "debt"),
      collateralUsd: sumState(borrow, "collateral") + sumState(multiplyRows, "position"),
      unpledgedCollateralUsd: sumState(borrow, "poolAvailable"),
      claimableUsd: sumState(borrow, "claimableFees"),
      // Blended Net APY from the same helper the dashboard uses, so the two
      // surfaces cannot drift. Umbrella is excluded there as it is here.
      netApyPct: await computePortfolioNetApyPct(ctx, allPositions, walletCollateral),
      openPositionCount: allPositions.filter((position) => position.status === "open").length,
      umbrellaEarnedUsd: umbrellaPositions.reduce((sum, position) => sum + position.earnedUsd, 0),
      umbrellaSlashedUsd: umbrellaPositions.reduce((sum, position) => sum + position.slashedUsd, 0),
      largestPositionUsd: largest?.valueUsd ?? 0,
      largestPositionLabel: largest?.label ?? null,
    },
    lend,
    borrow,
    multiply,
    liquid,
    umbrella: umbrellaPositions,
    umbrellaCooldowns,
    umbrellaCooldownSummary: {
      coolingCount: cooling.length,
      coolingUsd: cooling.reduce((sum, tranche) => sum + tranche.amountUsd, 0),
      readyCount: ready.length,
      readyUsd: ready.reduce((sum, tranche) => sum + tranche.amountUsd, 0),
      expiredCount: expired.length,
      expiredUsd: expired.reduce((sum, tranche) => sum + tranche.amountUsd, 0),
      nextCooldownEndsAt: cooling.length > 0 ? Math.min(...cooling.map((tranche) => tranche.endsAt)) : null,
      nextWithdrawalWindowEndsAt: ready.length > 0 ? Math.min(...ready.map((tranche) => tranche.windowEndsAt)) : null,
    },
    asOf: Math.max(
      0,
      ...lend.map((row) => row.updatedAt),
      ...borrow.map((row) => row.updatedAt),
      ...multiply.map((row) => row.updatedAt),
      ...liquid.map((row) => row.updatedAt),
      ...umbrella.map((row) => row.lastUpdatedAt),
      ...umbrellaTranches.map((row) => row.updatedAt),
    ),
  }
}

export const portfolio = query({
  args: {},
  handler: readAskAIPortfolio,
})

export const portfolioForTurn = internalQuery({
  args: { turnId: v.id("askAITurns") },
  handler: async (ctx, { turnId }) => readAskAIPortfolio(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId))),
})

export async function readAskAIEngineSnapshot(
  ctx: PortfolioReadCtx,
  { multiplyShockPct, lendProjectionDays }: { multiplyShockPct?: number; lendProjectionDays?: number },
) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }

  const [positions, borrowRisk, multiplyParameters] = await Promise.all([
    ctx.db
      .query("positions")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .collect(),
    ctx.db
      .query("riskSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .first(),
    ctx.db.query("multiplyTokenParameters").collect(),
  ])

  const parameterBySymbol = new Map(multiplyParameters.map((row) => [row.symbol.toLowerCase(), row]))
  const now = Date.now()
  const lendDays = Math.min(Math.max(lendProjectionDays ?? 30, 1), 365)
  const shockPct = Math.min(Math.max(multiplyShockPct ?? -20, -95), 100)

  const lendPositions = positions
    .filter((position) => position.product === "lend" && position.status === "open")
    .map((position) => {
      const principalUsd = Number(position.suppliedUsd6 ?? "0") / 1_000_000
      return {
        engine: "lend-engine" as const,
        marketSlug: position.marketSlug,
        principalUsd,
        earnedUsd: Number(position.earnedUsd6 ?? "0") / 1_000_000,
        projection: calculateLendProjection({
          principalUsd,
          supplyApyPct: position.supplyApyPct ?? 0,
          days: lendDays,
        }),
      }
    })
  const multiplyPositions = positions
    .filter((position) => position.product === "multiply" && position.status === "open")
    .map((position) => {
      const parameters = parameterBySymbol.get((position.assetId ?? "").toLowerCase())
      const collateralValueUsd = position.collateralValueUsd ?? 0
      const collateralAmount = position.collateralAmount ?? 0
      return {
        engine: "multiply-engine" as const,
        marketSlug: position.marketSlug,
        collateralValueUsd,
        debtValueUsd: position.debtValueUsd ?? 0,
        equityUsd: collateralValueUsd - (position.debtValueUsd ?? 0),
        // "What's my leverage?", "what's my loop's net APY?", "what's my
        // liquidation price?", "how far can it fall?" — all were on the doc and
        // none reached the model.
        multiplier: position.multiplier ?? null,
        netApyPct: position.netApyPct ?? null,
        liquidationPrice: position.liquidationPrice ?? null,
        priceDropToLiquidationPct: calculatePriceDropToLiquidationPct(
          position.liquidationPrice ?? null,
          collateralAmount > 0 ? collateralValueUsd / collateralAmount : 0,
        ),
        ...askAIHealthFactorValue(position.healthFactor),
        persistedHealthFactor: position.healthFactor ?? null,
        stress: parameters
          ? calculateMultiplyStress({
              collateralValueUsd: position.collateralValueUsd ?? 0,
              debtValueUsd: position.debtValueUsd ?? 0,
              liquidationThresholdPct: parameters.liquidationThresholdPct,
              collateralPriceShockPct: shockPct,
            })
          : null,
        stressUnavailableReason: parameters ? null : "Missing multiply token risk parameters",
      }
    })
  const umbrellaEnginePositions = positions
    .filter((position) => position.product === "umbrella")
    .map((position) => ({
      engine: "umbrella-system" as const,
      marketSlug: position.marketSlug,
      suppliedUsd: Number(position.suppliedUsd6 ?? "0") / 1_000_000,
      earnedUsd: Number(position.earnedUsd6 ?? "0") / 1_000_000,
      cooldownUsd: Number(position.cooldownAmountUsd6 ?? "0") / 1_000_000,
      slashedUsd: Number(position.slashedAmountUsd6 ?? "0") / 1_000_000,
      status: deriveAskAIUmbrellaStatus({ ...position, now }),
    }))
  const total = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0)
  // Health factors across several positions have no meaningful average; the
  // honest single answer to "am I safe?" is the weakest one.
  const multiplyHealthFactors = multiplyPositions
    .map((position) => position.persistedHealthFactor)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  const stressedHealthFactors = multiplyPositions
    .map((position) => position.stress?.healthFactor)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))

  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    // One scalar per question, computed here so the model never does money
    // arithmetic itself. Health factors report the weakest position, not a mean.
    summary: {
      lendPositionCount: lendPositions.length,
      lendPrincipalUsd: total(lendPositions.map((position) => position.principalUsd)),
      lendEarnedUsd: total(lendPositions.map((position) => position.earnedUsd)),
      lendProjectedYieldUsd: total(lendPositions.map((position) => position.projection.projectedYieldUsd)),
      lendProjectionDays: lendDays,
      multiplyPositionCount: multiplyPositions.length,
      multiplyCollateralUsd: total(multiplyPositions.map((position) => position.collateralValueUsd)),
      multiplyDebtUsd: total(multiplyPositions.map((position) => position.debtValueUsd)),
      multiplyEquityUsd: total(
        multiplyPositions.map((position) => position.collateralValueUsd - position.debtValueUsd),
      ),
      multiplyWeakestHealthFactor: multiplyHealthFactors.length ? Math.min(...multiplyHealthFactors) : null,
      multiplyShockPct: shockPct,
      multiplyWeakestHealthFactorAfterShock: stressedHealthFactors.length ? Math.min(...stressedHealthFactors) : null,
      multiplyLiquidatableAfterShock: stressedHealthFactors.some((value) => value <= 1),
      umbrellaPositionCount: umbrellaEnginePositions.length,
      umbrellaSuppliedUsd: total(umbrellaEnginePositions.map((position) => position.suppliedUsd)),
      umbrellaEarnedUsd: total(umbrellaEnginePositions.map((position) => position.earnedUsd)),
      umbrellaSlashedUsd: total(umbrellaEnginePositions.map((position) => position.slashedUsd)),
    },
    borrow: borrowRisk
      ? {
          engine: "credit-engine" as const,
          at: borrowRisk.at,
          ...decodeBorrowRiskSnapshot(borrowRisk),
          spokes: borrowRisk.spokes.map((spoke) => ({
            spokeId: spoke.spokeId,
            availableCreditUsd: Number(spoke.availableCreditUsd6) / 1_000_000,
            totalBorrowedUsd: Number(spoke.totalBorrowedUsd6) / 1_000_000,
            liquidationBufferUsd: Number(spoke.liquidationBufferUsd6) / 1_000_000,
            healthFactor:
              spoke.healthFactorWad === null ? null : Number(spoke.healthFactorWad) / 1_000_000_000_000_000_000,
          })),
        }
      : null,
    lend: lendPositions,
    multiply: multiplyPositions,
    umbrella: umbrellaEnginePositions,
    asOf: Math.max(0, borrowRisk?.at ?? 0, ...positions.map((position) => position.lastUpdatedAt)),
  }
}

export const engineSnapshot = query({
  args: { multiplyShockPct: v.optional(v.number()), lendProjectionDays: v.optional(v.number()) },
  handler: readAskAIEngineSnapshot,
})

export async function readAskAIBorrowCapacity(ctx: PortfolioReadCtx) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const [snapshot, portfolio] = await Promise.all([
    ctx.db
      .query("riskSnapshots")
      .withIndex("by_wallet_at", (q) => q.eq("wallet", wallet))
      .order("desc")
      .first(),
    ctx.db
      .query("portfolioCurrent")
      .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
      .unique(),
  ])
  const capacity = snapshot
    ? { ...decodeBorrowRiskSnapshot(snapshot), source: "credit_engine_snapshot" as const }
    : portfolio
      ? {
          borrowCapacityUsd: portfolio.availableToBorrowUsd + portfolio.totalBorrowedUsd,
          availableBorrowCapacityUsd: portfolio.availableToBorrowUsd,
          totalBorrowedUsd: portfolio.totalBorrowedUsd,
          source: "portfolio_current" as const,
        }
      : null
  // The raw spoke rows are usd6 strings and a wad health factor. Handing those
  // to the model made it divide by 1e6/1e18 next to already-decoded numbers in
  // the same payload, so decode them here.
  const spokes = (snapshot?.spokes ?? []).map((spoke) => ({
    spokeId: spoke.spokeId,
    availableCreditUsd: Number(spoke.availableCreditUsd6) / 1_000_000,
    totalBorrowedUsd: Number(spoke.totalBorrowedUsd6) / 1_000_000,
    liquidationBufferUsd: Number(spoke.liquidationBufferUsd6) / 1_000_000,
    ...askAIHealthFactorValue(
      spoke.healthFactorWad === null ? null : Number(spoke.healthFactorWad) / 1_000_000_000_000_000_000,
    ),
  }))
  const capacityHealthFactor = capacity && "healthFactor" in capacity ? capacity.healthFactor : null
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    capacity: capacity
      ? {
          ...capacity,
          // "How much buffer do I have?" / "am I safe?" — the tool description
          // already promised a liquidation buffer, but only raw spokes had it.
          liquidationBufferUsd: spokes.reduce((sum, spoke) => sum + spoke.liquidationBufferUsd, 0),
          ...askAIHealthFactorValue(capacityHealthFactor),
        }
      : null,
    spokes,
    asOf: snapshot?.at ?? portfolio?.at ?? 0,
  }
}

export const borrowCapacity = query({ args: {}, handler: readAskAIBorrowCapacity })

export const borrowCapacityForTurn = internalQuery({
  args: { turnId: v.id("askAITurns") },
  handler: async (ctx, { turnId }) =>
    readAskAIBorrowCapacity(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId))),
})

export async function readAskAIPositionRisk(ctx: PortfolioReadCtx, positionId?: string) {
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const selected = positionId ? positions.find((position) => position._id === positionId) : undefined
  if (positionId && !selected) throw new Error("Position not found")
  const relevant = selected ? [selected] : positions.filter((position) => position.status === "open")
  const engine = await readAskAIEngineSnapshot(ctx, { multiplyShockPct: -20 })
  // Raw position docs carry usd6 STRINGS and a health factor that can be the
  // literal "infinity", sitting beside already-decoded numbers in `engine`.
  // Decode here so the model never converts money units itself.
  const decoded = relevant.map((position) => {
    const usd6 = (value: string | undefined) => Number(value ?? "0") / 1_000_000
    const collateralValueUsd = position.collateralValueUsd ?? usd6(position.collateralValueUsd6)
    const collateralAmount = position.collateralAmount ?? 0
    const liquidationPrice = position.liquidationPrice ?? null
    const collateralPriceUsd = collateralAmount > 0 ? collateralValueUsd / collateralAmount : 0
    return {
      positionId: position._id,
      product: position.product,
      marketSlug: position.marketSlug,
      assetId: position.assetId ?? null,
      status: position.status,
      collateralValueUsd,
      debtValueUsd: position.debtValueUsd ?? usd6(position.debtValueUsd6),
      suppliedUsd: usd6(position.suppliedUsd6),
      earnedUsd: usd6(position.earnedUsd6),
      ltv: position.ltv ?? null,
      multiplier: position.multiplier ?? null,
      netApyPct: position.netApyPct ?? null,
      supplyApyPct: position.supplyApyPct ?? null,
      liquidationPrice,
      // "How far can ETH fall before I'm liquidated?" as a fraction of price.
      priceDropToLiquidationPct: calculatePriceDropToLiquidationPct(liquidationPrice, collateralPriceUsd),
      ...askAIHealthFactorValue(position.healthFactor),
      openedAt: position.openedAt,
      lastUpdatedAt: position.lastUpdatedAt,
    }
  })
  const headrooms = decoded
    .map((position) => position.healthFactorHeadroom)
    .filter((value): value is number => typeof value === "number")
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    wallet,
    // One answer for "am I safe?" across everything the wallet holds.
    riskSummary: {
      positionCount: decoded.length,
      weakestHealthFactor: headrooms.length ? Math.min(...headrooms) + 1 : null,
      weakestHeadroom: headrooms.length ? Math.min(...headrooms) : null,
      riskLevel: askAIRiskLevel(headrooms.length ? Math.min(...headrooms) + 1 : null),
      liquidatableNow: decoded.some((position) => position.riskLevel === "critical"),
      smallestPriceDropToLiquidationPct: (() => {
        const drops = decoded
          .map((position) => position.priceDropToLiquidationPct)
          .filter((value): value is number => typeof value === "number" && value >= 0)
        return drops.length ? Math.min(...drops) : null
      })(),
    },
    positions: decoded,
    engine,
    asOf: engine.asOf,
  }
}

export const positionRisk = query({
  args: { positionId: v.optional(v.string()) },
  handler: async (ctx, { positionId }) => readAskAIPositionRisk(ctx, positionId),
})

export const positionRiskForTurn = internalQuery({
  args: { turnId: v.id("askAITurns"), positionId: v.optional(v.string()) },
  handler: async (ctx, { turnId, positionId }) =>
    readAskAIPositionRisk(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId)), positionId),
})

const simulateBorrowArgs = {
  positionId: v.string(),
  additionalBorrowAmount: v.number(),
  borrowAsset: v.string(),
  /** Window for the interest projection ("what will this cost me over a year"). */
  projectionDays: v.optional(v.number()),
}

async function readAskAISimulateBorrow(
  ctx: PortfolioReadCtx,
  {
    positionId,
    additionalBorrowAmount,
    borrowAsset,
    projectionDays,
  }: {
    positionId: string
    additionalBorrowAmount: number
    borrowAsset: string
    projectionDays?: number
  },
) {
  if (!Number.isFinite(additionalBorrowAmount) || additionalBorrowAmount <= 0 || additionalBorrowAmount > 1_000_000_000)
    throw new Error("Additional borrow amount is invalid")
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const position = positions.find((row) => row._id === positionId && row.status === "open")
  if (!position) throw new Error("Position not found")
  const market = await ctx.db
    .query("borrowMarkets")
    .withIndex("by_slug", (q) => q.eq("slug", position.marketSlug))
    .unique()
  if (!market?.maxLtvPct) throw new Error("Position risk parameters are unavailable")
  const collateralValueUsd = position.collateralValueUsd ?? Number(position.collateralValueUsd6 ?? "0") / 1_000_000
  const debtValueUsd = position.debtValueUsd ?? Number(position.debtValueUsd6 ?? "0") / 1_000_000
  // The borrow rate lives on the pool, not on borrowMarkets.
  const pool = await ctx.db
    .query("pools")
    .withIndex("by_slug", (q) => q.eq("slug", position.marketSlug))
    .unique()
  const simulation = calculateAskAIBorrowSimulation({
    collateralValueUsd,
    debtValueUsd,
    additionalBorrowAmountUsd: additionalBorrowAmount,
    maxLtvPct: market.maxLtvPct,
  })
  const days = Math.min(Math.max(projectionDays ?? 365, 1), 3_650)
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    positionId,
    borrowAsset: borrowAsset.trim().toUpperCase(),
    additionalBorrowAmount,
    simulation,
    // "What will this borrow cost me over time?" — projected on the debt the
    // position would carry AFTER the new borrow, so the figure answers the
    // question that was actually asked.
    interestProjection:
      typeof pool?.pairAprPct === "number"
        ? {
            ...calculateBorrowProjection({
              debtUsd: simulation.projected.debtValueUsd,
              borrowAprPct: pool.pairAprPct,
              days,
            }),
            onDebtUsd: simulation.projected.debtValueUsd,
          }
        : { unavailableReason: "No borrow rate is published for this market", days },
    asOf: position.lastUpdatedAt,
  }
}

export const simulateBorrow = query({
  args: simulateBorrowArgs,
  handler: readAskAISimulateBorrow,
})

export const simulateBorrowForTurn = internalQuery({
  args: { turnId: v.id("askAITurns"), ...simulateBorrowArgs },
  handler: async (ctx, { turnId, ...args }) =>
    readAskAISimulateBorrow(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId)), args),
})

const stressPositionArgs = {
  positionId: v.string(),
  assetPriceChanges: v.array(v.object({ symbol: v.string(), change: v.number() })),
}

async function readAskAIStressPosition(
  ctx: PortfolioReadCtx,
  {
    positionId,
    assetPriceChanges,
  }: { positionId: string; assetPriceChanges: Array<{ symbol: string; change: number }> },
) {
  if (assetPriceChanges.length < 1 || assetPriceChanges.length > 8)
    throw new Error("Provide 1 to 8 asset price changes")
  for (const item of assetPriceChanges)
    if (!Number.isFinite(item.change) || item.change < -0.95 || item.change > 1)
      throw new Error("Asset price change must be between -0.95 and 1")
  const wallet = await getAuthedWallet(ctx)
  if (!wallet) return { walletRequired: true as const, message: ASK_AI_WALLET_REQUIRED }
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_wallet", (q) => q.eq("wallet", wallet))
    .collect()
  const position = positions.find((row) => row._id === positionId && row.status === "open")
  if (!position) throw new Error("Position not found")
  const market = await ctx.db
    .query("markets")
    .withIndex("by_slug", (q) => q.eq("slug", position.marketSlug))
    .first()
  const parameter = position.assetId
    ? await ctx.db
        .query("multiplyTokenParameters")
        .withIndex("by_symbol", (q) => q.eq("symbol", position.assetId!))
        .unique()
    : null
  const constituents = market?.constituents ?? (position.assetId ? [{ symbol: position.assetId, weight: 1 }] : [])
  const liquidationThresholdPct = parameter?.liquidationThresholdPct
  if (constituents.length === 0 || liquidationThresholdPct === undefined)
    throw new Error("Position risk parameters are unavailable")
  return {
    walletRequired: false as const,
    dataProvenance: ASK_AI_DATA_PROVENANCE,
    positionId,
    simulation: calculateAskAICollateralStress({
      collateralValueUsd: position.collateralValueUsd ?? Number(position.collateralValueUsd6 ?? "0") / 1_000_000,
      debtValueUsd: position.debtValueUsd ?? Number(position.debtValueUsd6 ?? "0") / 1_000_000,
      liquidationThresholdPct,
      constituents,
      assetPriceChanges: Object.fromEntries(
        assetPriceChanges.map(({ symbol, change }) => [symbol.toUpperCase(), change]),
      ),
    }),
    asOf: position.lastUpdatedAt,
  }
}

export const stressPosition = query({
  args: stressPositionArgs,
  handler: readAskAIStressPosition,
})

export const stressPositionForTurn = internalQuery({
  args: { turnId: v.id("askAITurns"), ...stressPositionArgs },
  handler: async (ctx, { turnId, ...args }) =>
    readAskAIStressPosition(withTurnWallet(ctx, await readRunningTurnWallet(ctx, turnId)), args),
})

export async function readAskAIMarketSnapshots(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  {
    sources,
    kind,
    limit,
  }: {
    sources?: AskAIMarketSource[]
    kind?: "token_price" | "dex_pool" | "lending_market"
    limit?: number
  },
) {
  const boundedLimit = Math.min(Math.max(limit ?? 10, 1), 50)
  const rows = sources
    ? (
        await Promise.all(
          sources.map((source) =>
            kind
              ? ctx.db
                  .query("askAIMarketSnapshots")
                  .withIndex("by_source_kind_key", (q) => q.eq("source", source).eq("kind", kind))
                  .take(boundedLimit)
              : ctx.db
                  .query("askAIMarketSnapshots")
                  .withIndex("by_source_kind_key", (q) => q.eq("source", source))
                  .take(boundedLimit),
          ),
        )
      ).flat()
    : await ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(boundedLimit)
  return rows
    .filter((row) => !kind || row.kind === kind)
    .filter((row) => marketFreshness(row.kind, row.sourceUpdatedAt ?? row.fetchedAt, Date.now()) === "fresh")
    .sort((left, right) => right.fetchedAt - left.fetchedAt)
    .slice(0, boundedLimit)
}

export const marketSnapshots = query({
  args: {
    sources: v.optional(v.array(v.union(v.literal("coingecko"), v.literal("defillama"), v.literal("aave")))),
    kind: v.optional(v.union(v.literal("token_price"), v.literal("dex_pool"), v.literal("lending_market"))),
    limit: v.optional(v.number()),
  },
  handler: readAskAIMarketSnapshots,
})

export function marketFreshness(kind: "token_price" | "dex_pool" | "lending_market", at: number, now = Date.now()) {
  const threshold =
    kind === "dex_pool"
      ? ASK_AI_CONFIG.freshness.poolMetricsStaleAfterMs
      : kind === "lending_market"
        ? ASK_AI_CONFIG.freshness.aaveMarketStaleAfterMs
        : ASK_AI_CONFIG.freshness.tokenPriceStaleAfterMs
  return now - at <= threshold ? ("fresh" as const) : ("stale" as const)
}

// Filler words that would otherwise match everything (e.g. "on" is a substring
// of many payloads) and drown out the meaningful terms in a natural question.
const ASK_AI_SEARCH_STOPWORDS = new Set([
  "the",
  "is",
  "are",
  "was",
  "on",
  "in",
  "of",
  "to",
  "for",
  "and",
  "or",
  "a",
  "an",
  "what",
  "whats",
  "which",
  "best",
  "top",
  "highest",
  "biggest",
  "largest",
  "good",
  "great",
  "show",
  "me",
  "my",
  "our",
  "i",
  "do",
  "does",
  "how",
  "now",
  "current",
  "currently",
  "price",
  "prices",
  "rate",
  "rates",
  "market",
  "markets",
  "pool",
  "pools",
  "token",
  "tokens",
  "asset",
  "assets",
])

const ASK_AI_SEARCH_TERM_ALIASES = new Map([
  ["bitcoin", "btc"],
  ["ethereum", "eth"],
  ["chainlink", "link"],
  ["uniswap", "uni"],
  ["arbitrum", "arb"],
  ["optimism", "op"],
  ["aerodrome", "aero"],
  ["curve", "crv"],
  ["tether", "usdt"],
])

const ASK_AI_PRICE_SYMBOLS = new Set([
  "aave",
  "aero",
  "arb",
  "bal",
  "btc",
  "cbbtc",
  "cbeth",
  "crv",
  "crvusd",
  "dai",
  "eth",
  "eurc",
  "frxusd",
  "gho",
  "gno",
  "ldo",
  "link",
  "op",
  "reth",
  "rlusd",
  "steth",
  "uni",
  "usdc",
  "usde",
  "usdg",
  "usdt",
  "wbtc",
  "weeth",
  "weth",
  "wsteth",
])

const ASK_AI_PRICE_TERM_SYMBOLS = new Map<string, string[]>([
  ["btc", ["btc", "wbtc", "cbbtc"]],
  ["eth", ["eth", "weth", "steth", "wsteth", "reth", "weeth", "cbeth"]],
])

// The provider payloads store the human-searchable names (project, symbol,
// chain) — the snapshot `key` is often an opaque hash (e.g. "defillama:0x…"),
// so matching on key+source alone never finds a Uniswap/ETH pool by name.
function askAISnapshotHaystack(snapshot: { source: string; kind: string; key: string; payload: unknown }): string {
  const payload = (snapshot.payload ?? {}) as Record<string, unknown>
  const fields = [
    snapshot.source,
    snapshot.kind,
    snapshot.key,
    payload.symbol,
    payload.project,
    payload.chain,
    payload.market,
    payload.name,
    payload.id,
  ]
  return fields
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase()
}

// Rank magnitude so "best/top/largest" surfaces the deepest markets first.
function askAISnapshotSize(payload: unknown): number {
  const row = (payload ?? {}) as Record<string, unknown>
  const candidate = row.tvlUsd ?? row.totalValueLockedUSD ?? row.sizeUsd ?? row.availableLiquidity
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0
}

function finiteMarketNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function compactMarketData(kind: "token_price" | "dex_pool" | "lending_market", payload: unknown) {
  const row = (payload ?? {}) as Record<string, unknown>
  const fields: Record<string, unknown> =
    kind === "token_price"
      ? {
          symbol: row.symbol,
          priceUsd: finiteMarketNumber(row.price) ?? finiteMarketNumber(row.priceUsd) ?? finiteMarketNumber(row.usd),
          confidence: finiteMarketNumber(row.confidence),
          status: row.status,
        }
      : kind === "dex_pool"
        ? {
            pool: row.pool ?? row.id,
            project: row.project,
            chain: row.chain,
            symbol: row.symbol,
            tvlUsd:
              finiteMarketNumber(row.tvlUsd) ??
              finiteMarketNumber(row.totalValueLockedUSD) ??
              finiteMarketNumber(row.liquidityUsd),
            volume24hUsd: finiteMarketNumber(row.volume24hUsd) ?? finiteMarketNumber(row.volume24h),
            apyPct: finiteMarketNumber(row.apy),
          }
        : {
            market: row.market,
            chainId: row.chainId,
            version: row.version,
            maxLtvPct: finiteMarketNumber(row.maxLtvPct),
            liquidationThresholdPct: finiteMarketNumber(row.liquidationThresholdPct),
            supplyCap: finiteMarketNumber(row.supplyCap),
            borrowCap: finiteMarketNumber(row.borrowCap),
            eModes: row.eModes,
            canSupply: row.canSupply,
            canBorrow: row.canBorrow,
            isFrozen: row.isFrozen,
            isPaused: row.isPaused,
            supplyCapReached: row.supplyCapReached,
            borrowCapReached: row.borrowCapReached,
            symbol: row.symbol,
            name: row.name,
            sizeUsd: finiteMarketNumber(row.sizeUsd),
            supplyApyPct: finiteMarketNumber(row.supplyApyPct),
            borrowApyPct: finiteMarketNumber(row.variableBorrowRate),
            utilizationPct: finiteMarketNumber(row.utilizationRate),
            availableLiquidityUsd: finiteMarketNumber(row.availableLiquidity),
          }
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
}

export const searchMarkets = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query: rawQuery, limit }) => {
    const queryText = rawQuery.trim().toLowerCase()
    if (!queryText || queryText.length > 200) throw new Error("Market query must contain 1 to 200 characters")
    const boundedLimit = Math.min(Math.max(limit ?? 10, 1), 20)
    const terms = queryText.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    // Drop filler words so a natural question ("best ETH pools on Uniswap")
    // matches on "eth"/"uniswap", not on "on"/"best". Fall back to raw terms if
    // the query was entirely stopwords.
    const meaningfulTerms = terms.filter((term) => term.length >= 3 && !ASK_AI_SEARCH_STOPWORDS.has(term))
    const searchTerms = (meaningfulTerms.length > 0 ? meaningfulTerms : terms).map(
      (term) => ASK_AI_SEARCH_TERM_ALIASES.get(term) ?? term,
    )
    // Nudge the ranking toward what the question is about, so a "pools" question
    // surfaces pools and a "price" question surfaces token prices even when both
    // match the same asset term.
    const wantsPools = /\b(pool|pools|liquidity|tvl|lp)\b/.test(queryText)
    const wantsYield = /\b(yield|yields|apr|apy|rate|rates|lend|lending|supply|borrow)\b/.test(queryText)
    const wantsPrice = /\b(price|prices|worth|cost|value|quote)\b/.test(queryText)
    const wantsAaveProtocol =
      /\b(?:on|from|at)\s+aave\b/.test(queryText) ||
      /\baave(?:\s+v[34])?\s+(?:lend|lending|market|markets|pool|pools|apy|apr|rate|rates)\b/.test(queryText)
    const wantsAvanaOnly = /\bavana\b/.test(queryText) && !/\b(aave|compare|versus|vs)\b/.test(queryText)
    const wantsAaveOnly = /\baave\b/.test(queryText) && !wantsPrice && !/\b(avana|compare|versus|vs)\b/.test(queryText)
    const minimumYieldMatch = queryText.match(
      /\b(?:at least|above|over|more than|minimum(?: of)?)\s+(\d+(?:\.\d+)?)\s*%/,
    )
    const minimumYieldPct = minimumYieldMatch ? Number(minimumYieldMatch[1]) : null
    const kindBoost = (kind: "token_price" | "dex_pool" | "lending_market") =>
      (wantsPools && kind === "dex_pool" ? 2 : wantsPools && kind === "lending_market" ? 1 : 0) +
      (wantsYield && kind === "lending_market" ? 2 : wantsYield && kind === "dex_pool" ? 1 : 0) +
      (wantsPrice && kind === "token_price" ? 1 : 0)

    // Exact price questions are the highest-volume Ask AI read. Resolve only the
    // symbols named in the prompt through indexes instead of collecting every
    // price and every historical point on every request. This keeps one lookup
    // O(symbols requested) even when the cache grows and many users ask at once.
    const requestedSymbols = [
      ...new Set(
        searchTerms
          .filter((term) => ASK_AI_PRICE_SYMBOLS.has(term))
          .flatMap((term) => ASK_AI_PRICE_TERM_SYMBOLS.get(term) ?? [term])
          .slice(0, boundedLimit),
      ),
    ]
    const tokenPrices = (
      await Promise.all(
        requestedSymbols.map((symbol) =>
          ctx.db
            .query("tokenPrices")
            .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
            .unique(),
        ),
      )
    ).filter((price): price is NonNullable<typeof price> => Boolean(price))
    const historyRows = await Promise.all(
      tokenPrices.map(async (price) => ({
        symbol: price.symbol,
        rows: await ctx.db
          .query("tokenPricesHistory")
          .withIndex("by_symbol_day", (q) => q.eq("symbol", price.symbol))
          .order("desc")
          .take(90),
      })),
    )
    const historyBySymbol = new Map(
      historyRows.map(({ symbol, rows }) => [
        symbol,
        rows.map((point) => ({ day: point.day, priceUsd: point.priceUsd })).sort((a, b) => a.day.localeCompare(b.day)),
      ]),
    )

    // 90 days of history are fetched above and then stripped from the model
    // context (convex/askAIAgent.ts compacts provider rows), which left
    // "is ETH up today?" and "how much has it moved this week?" unanswerable.
    // Derive the moves here instead of shipping the raw series.
    const priceChangePct = (history: ReadonlyArray<{ priceUsd: number }>, daysBack: number, current: number) => {
      if (!Number.isFinite(current) || current <= 0 || history.length === 0) return undefined
      const past = history[history.length - 1 - daysBack]?.priceUsd
      return typeof past === "number" && past > 0 ? ((current - past) / past) * 100 : undefined
    }
    const scoredPrices = tokenPrices
      .filter((price) => price.status !== "invalid")
      .map((price) => {
        const haystack = price.symbol.toLowerCase()
        const matched = searchTerms.filter((term) => haystack.includes(term)).length
        const history = historyBySymbol.get(price.symbol) ?? []
        const changes = {
          change24hPct: priceChangePct(history, 1, price.priceUsd),
          change7dPct: priceChangePct(history, 7, price.priceUsd),
          change30dPct: priceChangePct(history, 30, price.priceUsd),
        }
        return {
          matched,
          exact: searchTerms.includes(haystack) ? 1 : 0,
          boost: kindBoost("token_price"),
          size: 0,
          row: {
            source: "defillama" as const,
            kind: "token_price" as const,
            key: price.symbol,
            data: {
              ...compactMarketData("token_price", {
                symbol: price.symbol,
                priceUsd: price.priceUsd,
                confidence: price.confidence,
                status: price.status,
              }),
              ...Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined)),
            },
            history,
            asOf: price.sourceUpdatedAt ?? price.updatedAt,
            freshness: price.status === "fresh" ? ("fresh" as const) : ("stale" as const),
          },
        }
      })
      .filter((entry) => entry.matched > 0)

    if (wantsPrice && scoredPrices.length > 0) {
      return {
        markets: [],
        providerData: scoredPrices
          .sort((a, b) => b.matched - a.matched || b.exact - a.exact)
          .slice(0, boundedLimit)
          .map((entry) => entry.row),
      }
    }

    const [marketCache, snapshots] = await Promise.all([
      ctx.db
        .query("marketSnapshotsCache")
        .withIndex("by_singleton", (q) => q.eq("singleton", "markets"))
        .first(),
      wantsAaveOnly
        ? ctx.db
            .query("askAIMarketSnapshots")
            .withIndex("by_source_kind_key", (q) => q.eq("source", "aave"))
            .take(1500)
        : wantsPools && !wantsYield
          ? ctx.db
              .query("askAIMarketSnapshots")
              .withIndex("by_source_kind_key", (q) => q.eq("source", "defillama").eq("kind", "dex_pool"))
              .take(250)
          : ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(250),
    ])
    // Tests and a brand-new deployment can briefly precede the scheduled cache
    // build. Keep a bounded cold fallback, while production reads one singleton.
    const markets = marketCache?.rows ?? (await ctx.db.query("markets").take(200))
    const matchingMarkets = (wantsAaveProtocol || wantsAaveOnly ? [] : markets)
      .filter((market) => {
        const haystack = `${market.slug} ${market.name} ${market.symbol} ${market.venueLabel ?? ""}`.toLowerCase()
        return searchTerms.some((term) => haystack.includes(term))
      })
      .slice(0, boundedLimit)

    // Score canonical prices and cached snapshots on the SAME scale, then rank the
    // combined list — otherwise token prices (added first) crowd out deep pools.
    const scoredSnapshots = (wantsAvanaOnly ? [] : snapshots)
      .filter((snapshot) => marketFreshness(snapshot.kind, snapshot.sourceUpdatedAt ?? snapshot.fetchedAt) === "fresh")
      .map((snapshot) => {
        const haystack = askAISnapshotHaystack(snapshot)
        const matched = searchTerms.filter((term) => haystack.includes(term)).length
        const data = compactMarketData(snapshot.kind, snapshot.payload)
        const symbol = typeof data.symbol === "string" ? data.symbol.toLowerCase() : ""
        return {
          matched,
          exact: symbol.length > 0 && searchTerms.includes(symbol) ? 1 : 0,
          boost: kindBoost(snapshot.kind),
          size: askAISnapshotSize(snapshot.payload),
          row: {
            source: snapshot.source,
            kind: snapshot.kind,
            key: snapshot.key,
            data,
            asOf: snapshot.sourceUpdatedAt ?? snapshot.fetchedAt,
            freshness: marketFreshness(snapshot.kind, snapshot.sourceUpdatedAt ?? snapshot.fetchedAt),
          },
          yieldPct:
            typeof data.supplyApyPct === "number"
              ? data.supplyApyPct
              : typeof data.apyPct === "number"
                ? data.apyPct
                : Number.NEGATIVE_INFINITY,
        }
      })
      .filter(
        (entry) =>
          entry.matched > 0 &&
          (!wantsAaveProtocol || entry.row.source === "aave") &&
          (!wantsYield || entry.row.kind === "lending_market" || entry.row.kind === "dex_pool"),
      )

    const providerData = [...scoredPrices, ...scoredSnapshots]
      // Most query terms matched, then the kind the question asked for, then depth.
      .sort((a, b) => {
        if (minimumYieldPct !== null && "yieldPct" in a && "yieldPct" in b) {
          const aMeets = a.yieldPct >= minimumYieldPct
          const bMeets = b.yieldPct >= minimumYieldPct
          if (aMeets !== bMeets) return aMeets ? -1 : 1
          if (a.yieldPct !== b.yieldPct) return b.yieldPct - a.yieldPct
        }
        return b.matched - a.matched || b.boost - a.boost || b.exact - a.exact || b.size - a.size
      })
      .slice(0, boundedLimit)
      .map((entry) => entry.row)

    return { markets: matchingMarkets, providerData }
  },
})

export const poolMetrics = query({
  args: { marketId: v.string() },
  handler: async (ctx, { marketId }) => {
    const normalizedId = marketId.trim().toLowerCase()
    if (!normalizedId || normalizedId.length > 160) throw new Error("Market ID is invalid")
    const snapshots = await ctx.db.query("askAIMarketSnapshots").withIndex("by_fetched_at").order("desc").take(100)
    // Slug is a lowercase URL-safe id, so the common lookup is a point read.
    // Fall back to a symbol point read (symbols are typically upper-case).
    const market =
      (await ctx.db
        .query("markets")
        .withIndex("by_slug", (q) => q.eq("slug", normalizedId))
        .first()) ??
      (await ctx.db
        .query("markets")
        .withIndex("by_symbol", (q) => q.eq("symbol", normalizedId.toUpperCase()))
        .first())
    const aliases = new Set([normalizedId, market?.slug.toLowerCase(), market?.symbol.toLowerCase()].filter(Boolean))
    const providerData = snapshots
      .filter((snapshot) => snapshot.kind === "dex_pool" && aliases.has(snapshot.key.toLowerCase()))
      .filter((snapshot) => marketFreshness("dex_pool", snapshot.sourceUpdatedAt ?? snapshot.fetchedAt) === "fresh")
      .map((snapshot) => ({
        source: snapshot.source,
        data: snapshot.payload,
        asOf: snapshot.sourceUpdatedAt ?? snapshot.fetchedAt,
        freshness: marketFreshness("dex_pool", snapshot.sourceUpdatedAt ?? snapshot.fetchedAt),
      }))
    if (!market && providerData.length === 0) throw new Error("Market not found")
    return { market: market ?? null, providerData }
  },
})
