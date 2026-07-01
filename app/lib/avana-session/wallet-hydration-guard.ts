/**
 * Guard for the reactive WalletHydrator (H19).
 *
 * The Convex `getSessionState` query re-emits on every write, and each emit fully
 * REPLACES the local position/history set in every session. A user's just-submitted
 * (optimistic) edit lives locally the instant it executes, but its Convex write only
 * shows up in a LATER re-emit. A re-emit that arrived in between — i.e. one that
 * predates the optimistic write — would clobber that in-flight edit (flicker / lost
 * state) if applied.
 *
 * This is the intent-keyed equivalent of the borrow session's `persistedAt` cross-tab
 * guard: an incoming snapshot is only safe to apply once it contains every optimistic
 * intent the client already knows about. If any locally-known intent is still missing,
 * the snapshot is stale for this client and must be skipped until it catches up.
 */

/** Snapshot shape we need from `getSessionState` — just the intent ids of its rows. */
export type HydrationSnapshot = {
  transactions: ReadonlyArray<{ intentId?: string | null }>
}

/**
 * Decide whether an incoming Convex snapshot is safe to hydrate from.
 *
 * @param snapshot           the re-emitted session state (undefined while loading)
 * @param localIntentIds     intent ids of the client's current (incl. optimistic) writes
 * @returns true when every local intent is reflected in the snapshot (safe to apply)
 */
export function shouldApplyHydration(
  snapshot: HydrationSnapshot | undefined | null,
  localIntentIds: Iterable<string>,
): boolean {
  if (!snapshot) return false
  const remote = new Set<string>()
  for (const tx of snapshot.transactions) {
    if (tx.intentId) remote.add(tx.intentId)
  }
  for (const intentId of localIntentIds) {
    if (!remote.has(intentId)) return false // an in-flight edit is not yet in this emit → stale
  }
  return true
}
