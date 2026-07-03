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
 * How long an optimistic intent may gate hydration before it is assumed never-landing.
 *
 * A write round-trips through Convex in well under a second, so any intent still missing from
 * a re-emit after this window is treated as rejected/lost (STALE_WRITE, RATE_LIMITED, dropped
 * persist, …) rather than in-flight. This bounds a "poison" intent's blast radius to a brief,
 * self-correcting flicker instead of a PERMANENT hydration freeze that pins the tab on stale
 * positions/balances forever.
 */
export const HYDRATION_GATE_TTL_MS = 30_000

/** Local history item shape the gate needs: its intent id, status, and submit time. */
export type PendingHydrationItem = { intentId: string; status: string; timestamp: number }

/**
 * The subset of local intent ids that should gate hydration: RECENT, non-failed optimistic
 * writes. Failed/rejected actions never keep a durable server row, so they must not gate (a
 * best-effort-persisted failure or an unpersisted one would otherwise block every future
 * re-emit). Intents older than `ttlMs` are dropped for the same reason. This is what keeps a
 * never-persisted intent from freezing the WalletHydrator (see the effect that calls it).
 */
export function pendingHydrationIntentIds(
  items: Iterable<PendingHydrationItem>,
  now: number,
  ttlMs: number = HYDRATION_GATE_TTL_MS,
): Set<string> {
  const pending = new Set<string>()
  for (const item of items) {
    if (item.status !== "failed" && now - item.timestamp < ttlMs) pending.add(item.intentId)
  }
  return pending
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
