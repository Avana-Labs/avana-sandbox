import type { BorrowSystemState } from "@/app/lib/credit-engine"
import { deserializeBorrowSystemState, serializeBorrowSystemState } from "@/app/lib/borrow-system/codec"

const STORAGE_PREFIX = "avana.borrow.session.v1"

export function borrowSessionStorageKey(walletId: string) {
  return `${STORAGE_PREFIX}:${walletId}`
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

export function clearBorrowSessionState(walletId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(borrowSessionStorageKey(walletId))
}
