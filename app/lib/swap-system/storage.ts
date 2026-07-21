import { safeReadParsed, safeRemoveItem, safeSetItem } from "@/app/lib/safe-local-storage"
import type { SwapSystemState } from "./transaction-adapter"

const SWAP_STATE_PREFIX = "avana.swap.session.v1"

function stateKey(walletId: string) {
  return `${SWAP_STATE_PREFIX}:${walletId}`
}

function parseSwapState(raw: string, fallback: SwapSystemState): SwapSystemState {
  const parsed = JSON.parse(raw) as Partial<SwapSystemState>
  return {
    balances: Array.isArray(parsed.balances) ? parsed.balances : fallback.balances,
    allowances: parsed.allowances && typeof parsed.allowances === "object" ? parsed.allowances : {},
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
  }
}

export function readSwapSessionState(walletId: string, fallback: SwapSystemState) {
  return safeReadParsed(
    stateKey(walletId),
    (raw) => parseSwapState(raw, fallback),
    () => fallback,
  )
}

export function writeSwapSessionState(walletId: string, state: SwapSystemState) {
  safeSetItem(stateKey(walletId), JSON.stringify(state))
}

export function clearSwapSessionState(walletId: string) {
  safeRemoveItem(stateKey(walletId))
}
