import type { BorrowSystemState } from "@/app/lib/credit-engine"
import type { SyntheticTransactionReceipt, TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"
import {
  deserializeBorrowSystemState,
  deserializeBorrowValue,
  serializeBorrowSystemState,
  serializeBorrowValue,
} from "@/app/lib/borrow-system/codec"

const STORAGE_PREFIX = "avana.borrow.session.v1"
const META_STORAGE_PREFIX = "avana.borrow.session.meta.v1"

export type BorrowSessionMetadata = {
  transactionHistory: TransactionHistoryItem[]
  receipts: SyntheticTransactionReceipt[]
}

export function borrowSessionStorageKey(walletId: string) {
  return `${STORAGE_PREFIX}:${walletId}`
}

export function borrowSessionMetadataKey(walletId: string) {
  return `${META_STORAGE_PREFIX}:${walletId}`
}

export function readBorrowSessionState(walletId: string, seed: string): BorrowSystemState {
  if (typeof window === "undefined") {
    return deserializeBorrowSystemState(seed)
  }

  const key = borrowSessionStorageKey(walletId)
  const stored = window.localStorage.getItem(key)
  return deserializeBorrowSystemState(stored ?? seed)
}

export function writeBorrowSessionState(walletId: string, state: BorrowSystemState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(borrowSessionStorageKey(walletId), serializeBorrowSystemState(state))
}

export function readBorrowSessionMetadata(walletId: string): BorrowSessionMetadata {
  if (typeof window === "undefined") {
    return { transactionHistory: [], receipts: [] }
  }

  const stored = window.localStorage.getItem(borrowSessionMetadataKey(walletId))
  if (!stored) {
    return { transactionHistory: [], receipts: [] }
  }

  return deserializeBorrowValue<BorrowSessionMetadata>(stored)
}

export function writeBorrowSessionMetadata(walletId: string, metadata: BorrowSessionMetadata) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(borrowSessionMetadataKey(walletId), serializeBorrowValue(metadata))
}

export function clearBorrowSessionState(walletId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(borrowSessionStorageKey(walletId))
  window.localStorage.removeItem(borrowSessionMetadataKey(walletId))
}
