import type { TransactionIntent } from "./contracts"

export function createExecutionFingerprint(intent: TransactionIntent) {
  return `${intent.id}:${intent.actionType}:${intent.walletId}:${intent.amountUsd6.toString()}`
}
