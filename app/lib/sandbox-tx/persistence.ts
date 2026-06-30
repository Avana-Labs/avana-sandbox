/**
 * Maps an in-browser sandbox transaction (the Credit Engine's result, surfaced as a
 * `TransactionHistoryItem`) onto the args for the Convex `recordTransaction` mutation.
 *
 * Per the phase-2 brief: the Credit Engine stays the simulation; Convex *persists* the
 * result. Money crosses the wire as a decimal usd6 string (see the schema encoding
 * contract). This module is pure so the mapping is unit-tested without a Convex client.
 */

import type { TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"

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
