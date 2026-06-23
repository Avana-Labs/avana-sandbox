const LEND_STATE_PREFIX = "avana.lend.session.v1"
const LEND_META_PREFIX = "avana.lend.session.meta.v1"

import { deserializeLendSystemState, serializeLendSystemState } from "./codec"
import type { LendTransactionHistoryItem, LendTransactionResult } from "./contracts"
import { buildDemoLendSystemState } from "./mock"

export type LendSessionMetadata = {
  transactionHistory: LendTransactionHistoryItem[]
  receipts: LendTransactionResult[]
}

function stateKey(walletId: string) {
  return `${LEND_STATE_PREFIX}:${walletId}`
}

function metaKey(walletId: string) {
  return `${LEND_META_PREFIX}:${walletId}`
}

export function readLendSessionState(walletId: string, sessionSeed: string) {
  if (typeof window === "undefined") {
    return deserializeLendSystemState(sessionSeed)
  }

  const raw = window.localStorage.getItem(stateKey(walletId))
  if (!raw) return deserializeLendSystemState(sessionSeed)
  return deserializeLendSystemState(raw)
}

export function writeLendSessionState(walletId: string, state: ReturnType<typeof deserializeLendSystemState>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(stateKey(walletId), serializeLendSystemState(state))
}

export function readLendSessionMetadata(walletId: string): LendSessionMetadata {
  if (typeof window === "undefined") {
    return { transactionHistory: [], receipts: [] }
  }

  const raw = window.localStorage.getItem(metaKey(walletId))
  if (!raw) return { transactionHistory: [], receipts: [] }
  return JSON.parse(raw) as LendSessionMetadata
}

export function writeLendSessionMetadata(walletId: string, metadata: LendSessionMetadata) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(metaKey(walletId), JSON.stringify(metadata))
}

export function clearLendSessionState(walletId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(stateKey(walletId))
  window.localStorage.removeItem(metaKey(walletId))
}

export function buildDefaultLendSessionSeed(walletId: string) {
  return serializeLendSystemState(buildDemoLendSystemState(walletId))
}
