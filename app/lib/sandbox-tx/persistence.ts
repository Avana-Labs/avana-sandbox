/**
 * Maps an in-browser sandbox transaction (the Credit Engine's result, surfaced as a
 * `TransactionHistoryItem`) onto the args for the Convex `recordTransaction` mutation.
 *
 * Per the phase-2 brief: the Credit Engine stays the simulation; Convex *persists* the
 * result. Money crosses the wire as a decimal usd6 string (see the schema encoding
 * contract). This module is pure so the mapping is unit-tested without a Convex client.
 */

import type { SandboxActionResult, TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult } from "@/app/lib/lend-system/contracts"
import type { MultiplySandboxActionResult } from "@/app/lib/multiply-system/contracts"

export type RecordTransactionArgs = {
  wallet: string
  intentId: string
  product: "borrow" | "lend" | "multiply"
  kind: string
  marketSlug?: string
  assetId?: string
  requestedAmountUsd6: string
  executedAmountUsd6: string
  amountUsd: number
  simulated: boolean
  /** Optimistic-concurrency token: the position revision this write was computed from.
   *  The server rejects the write (STALE_WRITE) if the stored position has advanced past it. */
  expectedRevision?: number
  position?: {
    status: "open" | "closed"
    marketSlug?: string
    collateralValueUsd6?: string
    debtValueUsd6?: string
    suppliedUsd6?: string
    earnedUsd6?: string
    collateralAmount?: number
    collateralValueUsd?: number
    debtValueUsd?: number
    multiplier?: number
    ltv?: number
    healthFactor?: number | "infinity"
    liquidationPrice?: number | null
    netApyPct?: number
    collateral?: Array<{
      marketSlug: string
      collateralShares: string
      principalTokenAmount: string
      collateralEnabled: boolean
      collateralValueUsd6?: string
    }>
    debt?: Array<{
      assetId: string
      baseAssetId: string
      spokeId?: string
      marketSlug?: string
      debtSharesUsd6: string
      debtIndexRay: string
      borrowRateWad: string
      principalBorrowedUsd6: string
    }>
  }
}

export function lendResultToRecordArgs(result: LendSandboxActionResult, wallet: string): RecordTransactionArgs {
  const item = result.historyItem
  const position = item.positionId ? result.state.positions[item.positionId] : undefined
  // `item.amount` is TOKEN-denominated (e.g. 1 ETH). The server reconciles the supplied
  // balance in USD (position.suppliedValueUsd), so the transaction amount and the liquidity
  // delta must be USD too — otherwise every non-$1 asset (ETH, BTC, …) trips
  // INVALID_TRANSITION on execute and lend is silently restricted to $1 stablecoins.
  const assetPriceUsd = result.state.markets[item.marketId]?.assetPriceUsd ?? 1
  const amountUsd = item.amount * assetPriceUsd
  return {
    wallet,
    intentId: item.intentId,
    product: "lend",
    kind: item.kind,
    marketSlug: item.marketId,
    requestedAmountUsd6: Math.round(amountUsd * 1_000_000).toString(),
    executedAmountUsd6: Math.round(amountUsd * 1_000_000).toString(),
    amountUsd,
    simulated: item.simulated,
    position: position
      ? {
          status: position.status === "active" ? "open" : "closed",
          marketSlug: position.marketId,
          suppliedUsd6: Math.round(position.suppliedValueUsd * 1_000_000).toString(),
          earnedUsd6: Math.round(position.interestEarned * 1_000_000).toString(),
        }
      : undefined,
  }
}

export function multiplyResultToRecordArgs(result: MultiplySandboxActionResult, wallet: string): RecordTransactionArgs {
  const item = result.historyItem
  const positionId = item.positionId ?? Object.keys(result.state.positions).find((id) => result.state.positions[id]?.marketId === item.marketId)
  const position = positionId ? result.state.positions[positionId] : undefined
  const marketSlug = position?.marketId ?? item.marketId

  // A successful close DELETES the position from engine state (multiply-engine/actions.ts), so
  // it can no longer be read back here. Without an explicit payload, recordTransaction skips its
  // position-close branch and the server row stays status:"open" forever — a closed position
  // that resurrects on reload / in a second tab, carrying stale debt and a phantom liquidation
  // price. Emit an explicit closed payload so the server marks the row closed (sets closedAt)
  // and releases the position's liquidity.
  const closedByDelete = !position && item.status === "success" && item.kind === "close" && Boolean(marketSlug)

  return {
    wallet,
    intentId: item.intentId,
    product: "multiply",
    kind: item.kind,
    marketSlug,
    requestedAmountUsd6: Math.round(item.amountUsd * 1_000_000).toString(),
    executedAmountUsd6: Math.round(item.amountUsd * 1_000_000).toString(),
    amountUsd: item.amountUsd,
    simulated: item.simulated,
    position: position
      ? {
          status: position.multiplier <= 1 ? "closed" : "open",
          marketSlug: position.marketId,
          collateralAmount: position.collateralAmount,
          collateralValueUsd: position.collateralValueUsd,
          debtValueUsd: position.debtValueUsd,
          multiplier: position.multiplier,
          ltv: position.ltv,
          healthFactor: position.healthFactor,
          liquidationPrice: position.liquidationPrice,
          netApyPct: position.netApy,
        }
      : closedByDelete
        ? {
            status: "closed",
            marketSlug,
            collateralAmount: 0,
            collateralValueUsd: 0,
            debtValueUsd: 0,
            multiplier: 1,
            ltv: 0,
            healthFactor: "infinity",
            liquidationPrice: null,
            netApyPct: 0,
          }
        : undefined,
  }
}

/** usd6 bigint → human USD number (UI-edge conversion). */
function usd6ToNumber(value: bigint): number {
  return Number(value) / 1_000_000
}

/**
 * Convert a successful borrow-system history item into recordTransaction args. The
 * idempotency key is the item's intentId, so replays (reloads, double sends) collapse
 * onto one row server-side.
 */
export function borrowHistoryItemToRecordArgs(item: TransactionHistoryItem, wallet: string): RecordTransactionArgs {
  return {
    wallet,
    intentId: item.intentId,
    product: "borrow",
    kind: item.kind,
    marketSlug: item.marketId,
    assetId: item.assetId,
    requestedAmountUsd6: item.requestedAmountUsd6.toString(),
    executedAmountUsd6: item.executedAmountUsd6.toString(),
    amountUsd: usd6ToNumber(item.executedAmountUsd6),
    simulated: item.simulated,
  }
}

export function borrowResultToRecordArgs(result: SandboxActionResult, wallet: string): RecordTransactionArgs {
  const base = borrowHistoryItemToRecordArgs(result.historyItem, wallet)
  const account = result.state.accounts[wallet]
  const marketSlug = result.historyItem.marketId
  if (!account || !marketSlug) return base

  const collateral = account.collateralPositions
    .filter((position) => position.marketId === marketSlug)
    .map((position) => {
      const market = result.state.markets[position.marketId]
      return {
        marketSlug: position.marketId,
        collateralShares: position.collateralShares.toString(),
        principalTokenAmount: position.principalTokenAmount.toString(),
        collateralEnabled: position.collateralEnabled,
        collateralValueUsd6: market
          ? ((position.collateralShares * market.snapshot.supplyIndexRay) / 10n ** 27n).toString()
          : undefined,
      }
    })
  const debt = account.debtPositions
    .filter((position) => position.marketId === marketSlug)
    .map((position) => ({
      assetId: position.assetId,
      baseAssetId: position.baseAssetId,
      spokeId: position.spokeId,
      marketSlug: position.marketId,
      debtSharesUsd6: position.debtSharesUsd6.toString(),
      debtIndexRay: position.debtIndexRay.toString(),
      borrowRateWad: position.borrowRateWad.toString(),
      principalBorrowedUsd6: position.principalBorrowedUsd6.toString(),
    }))

  return {
    ...base,
    position: {
      status: collateral.length === 0 && debt.length === 0 ? "closed" : "open",
      marketSlug,
      collateralValueUsd6: result.preview.after.collateralValueUsd6.toString(),
      debtValueUsd6: result.preview.after.totalBorrowedUsd6.toString(),
      collateral,
      debt,
    },
  }
}
