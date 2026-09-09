import type { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"

type BorrowSession = ReturnType<typeof useBorrowSessionContext>

export function resolveClaimPositions(
  session: BorrowSession,
  walletId: string,
  marketId: string,
  claimPositionId?: string,
) {
  const positions = session.state.accounts[walletId]?.rewardPositions ?? []
  if (claimPositionId) {
    const selected = positions.find((position) => position.id === claimPositionId)
    if (selected) return [selected]
  }
  if (!marketId) return positions
  return positions.filter((position) => position.marketId === marketId)
}

export function selectionsFromPositions(positions: ReadonlyArray<{ id: string }>) {
  const selections: Record<string, boolean> = {}
  for (const position of positions) selections[position.id] = true
  return selections
}
