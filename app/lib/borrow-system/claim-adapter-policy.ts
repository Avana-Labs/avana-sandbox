/**
 * Claim remains a home-sim preview-only flow until a canonical BorrowAction exists.
 * Surfaces should label claim as simulated but must not route through SandboxTransactionAdapter.
 */
export function isClaimSupportedByTransactionAdapter() {
  return false
}

export const CLAIM_ADAPTER_EXCLUSION_REASON =
  "Claim rewards are not modeled in the credit engine BorrowAction union yet."
