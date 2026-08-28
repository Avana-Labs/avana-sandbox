"use client"

import { useCallback } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAvanaIdentity, useRewardsSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"

function claimKey(taskIds: readonly string[]) {
  let hash = 2_166_136_261
  for (const character of [...taskIds].sort().join("\u0000")) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

/** Persist the Convex transaction before changing the client rewards engine. */
export function useDurableRewardsClaim() {
  const { walletId } = useAvanaIdentity()
  const rewards = useRewardsSessionContext()
  const recordRewardsClaim = useMutation(api.sandbox.transactions.recordRewardsClaim)

  return useCallback(
    async (taskIds: readonly string[]) => {
      if (taskIds.length === 0) throw new Error("Nothing to claim")
      const key = claimKey(taskIds)
      const syntheticTxHash = `0xrewards${key}`
      const persisted = await recordRewardsClaim({
        wallet: walletId,
        intentId: `rewards:${key}:${taskIds.length}`,
        taskIds: [...taskIds],
        syntheticTxHash,
      })
      const claims = []
      for (const taskId of taskIds) claims.push(await rewards.claimReward(taskId))
      return { claims, persisted, syntheticTxHash }
    },
    [recordRewardsClaim, rewards, walletId],
  )
}
