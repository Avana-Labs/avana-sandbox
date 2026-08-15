import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"
import type { UmbrellaPosition, UmbrellaTransaction } from "./use-umbrella-session"

export type UmbrellaPositionStatus =
  | "active"
  | "partiallyCooling"
  | "coolingDown"
  | "readyToUnstake"
  | "cooldownExpired"
  | "slashed"
  | "closed"

/**
 * Reduce an UmbrellaPosition down to the single high-level state the dashboard
 * badge cares about. Kept in a helper so the same derivation covers table rows,
 * mobile cards, and any future rollups (e.g. a status count on the section
 * header) without drifting.
 *
 * NOTE: `slashed` is reserved for when `totalSlashedUsd` is exposed per-position
 * (today it's only market-wide, so we can't tell which staker's stake was
 * slashed). TODO: once the per-position slashed field lands, branch on it before
 * the cooldown checks so a slashed position doesn't look like a plain "closed".
 */
export function deriveUmbrellaPositionStatus(position: UmbrellaPosition): UmbrellaPositionStatus {
  if (position.amount === 0) return "closed"
  if (position.cooldownStatus === "expired") return "cooldownExpired"
  if (position.cooldownStatus === "ready") return "readyToUnstake"
  if (position.cooldownStatus === "cooling") {
    if (position.cooldownAmount >= position.amount) return "coolingDown"
    if (position.cooldownAmount > 0) return "partiallyCooling"
  }
  return "active"
}

/**
 * Map the session transaction log into the shape the dashboard "recent activity"
 * feed expects. Mirrors the lend/borrow/multiply mappers: normalise timestamps
 * to ISO, sign amounts by whether they add to or subtract from the position,
 * pick a status + kind from the union, and keep the tx hash intact so the
 * hash-dedup in dashboard-page-client can collapse duplicates coming through
 * multiple sources.
 */
export function buildUmbrellaActivityRows(transactions: UmbrellaTransaction[]): PortfolioActivityRow[] {
  return transactions.map((tx) => {
    // Withdrawing stake leaves the wallet negative (funds returning to the
    // wallet, not into the position); everything else (stake / claim / start
    // cooldown) shows as a positive commitment to the Umbrella product.
    const signedAmount = tx.kind === "unstake" ? -Math.abs(tx.amountUsd) : Math.abs(tx.amountUsd)

    return {
      id: tx.id,
      at: new Date(tx.timestamp).toISOString(),
      product: "umbrella" as const,
      kind:
        tx.kind === "stake"
          ? ("stake" as const)
          : tx.kind === "claim"
            ? ("claim" as const)
            : tx.kind === "startCooldown"
              ? ("startCooldown" as const)
              : ("unstake" as const),
      status: tx.status === "success" ? ("confirmed" as const) : ("failed" as const),
      amountUsd: signedAmount,
      primaryLabel:
        tx.kind === "stake"
          ? `Staked ${tx.symbol}`
          : tx.kind === "unstake"
            ? `Unstaked ${tx.symbol}`
            : tx.kind === "startCooldown"
              ? `Cooldown ${tx.symbol}`
              : `Claimed ${tx.symbol} rewards`,
      secondaryLabel:
        tx.kind === "claim"
          ? "Umbrella rewards claim"
          : `${tx.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${tx.symbol}`,
      txHash: tx.hash,
    }
  })
}
