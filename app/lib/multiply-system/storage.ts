import type { MultiplyTransactionHistoryItem, MultiplyTransactionResult } from "./contracts"

const STORAGE_PREFIX = "avana.multiply.session.v1"
const META_STORAGE_PREFIX = "avana.multiply.session.meta.v1"

export type MultiplySessionMetadata = {
  transactionHistory: MultiplyTransactionHistoryItem[]
  receipts: MultiplyTransactionResult[]
}

export function multiplySessionStorageKey(walletId: string) {
  return `${STORAGE_PREFIX}:${walletId}`
}

export function multiplySessionMetadataKey(walletId: string) {
  return `${META_STORAGE_PREFIX}:${walletId}`
}

export function readMultiplySessionMetadata(walletId: string): MultiplySessionMetadata {
  if (typeof window === "undefined") {
    return { transactionHistory: [], receipts: [] }
  }

  const stored = window.localStorage.getItem(multiplySessionMetadataKey(walletId))
  if (!stored) return { transactionHistory: [], receipts: [] }
  return JSON.parse(stored) as MultiplySessionMetadata
}

export function writeMultiplySessionMetadata(walletId: string, metadata: MultiplySessionMetadata) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(multiplySessionMetadataKey(walletId), JSON.stringify(metadata))
}

export function clearMultiplySessionState(walletId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(multiplySessionStorageKey(walletId))
  window.localStorage.removeItem(multiplySessionMetadataKey(walletId))
}
