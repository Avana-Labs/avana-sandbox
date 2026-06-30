/**
 * Maps an in-browser sandbox transaction (the Credit Engine's result, surfaced as a
 * `TransactionHistoryItem`) onto the args for the Convex `recordTransaction` mutation.
 *
 * Per the phase-2 brief: the Credit Engine stays the simulation; Convex *persists* the
 * result. Money crosses the wire as a decimal usd6 string (see the schema encoding
 * contract). This module is pure so the mapping is unit-tested without a Convex client.
 */

import type { TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"
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
  position?: {
    status: "open" | "closed"
    marketSlug?: string
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
  }
  ledger?: {
    marketSlug: string
    borrowedDeltaUsd?: number
    suppliedDeltaUsd?: number
  }
}

export function lendResultToRecordArgs(result: LendSandboxActionResult, wallet: string): RecordTransactionArgs {
  const item = result.historyItem
  const position = item.positionId ? result.state.positions[item.positionId] : undefined
  const amountUsd = item.amount
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
    ledger:
      item.kind === "claim"
        ? undefined
        : {
            marketSlug: item.marketId,
            suppliedDeltaUsd: item.kind === "deposit" ? amountUsd : -amountUsd,
          },
  }
}

export function multiplyResultToRecordArgs(result: MultiplySandboxActionResult, wallet: string): RecordTransactionArgs {
  const item = result.historyItem
  const positionId = item.positionId ?? Object.keys(result.state.positions).find((id) => result.state.positions[id]?.marketId === item.marketId)
  const position = positionId ? result.state.positions[positionId] : undefined
  return {
    wallet,
    intentId: item.intentId,
    product: "multiply",
    kind: item.kind,
    marketSlug: position?.marketId ?? item.marketId,
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
