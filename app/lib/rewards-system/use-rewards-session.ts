"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SandboxRewardsActionAdapter } from "./sandbox-action-adapter"
import { SandboxRewardsReadAdapter } from "./sandbox-read-adapter"
import { buildDefaultRewardsCatalog } from "@/app/lib/rewards-engine"
import type { RewardActivityEvent } from "@/app/lib/rewards-engine"
import type { RewardsSessionState } from "./contracts"
import { clearRewardsSessionState, readRewardsSessionState, writeRewardsSessionState } from "./storage"
import { REWARDS_SESSION_SYNC_EVENT } from "./session-sync"

/**
 * Freshness rank for a rewards state. Claims and activity events are append-only
 * (you can't un-claim), so the state with more records is the more recent one.
 * Claims dominate so a durably-persisted claim is never lost to a stale snapshot.
 */
function rewardsStateRank(state: RewardsSessionState): number {
  return (state.claims?.length ?? 0) * 1_000_000 + (state.events?.length ?? 0)
}

export function useRewardsSession({
  walletId,
  sessionSeed,
  persistState = true,
  remoteState,
  remoteRevision,
  persistRemoteState,
}: {
  walletId: string
  sessionSeed: string
  persistState?: boolean
  remoteState?: string | null
  remoteRevision?: number | null
  persistRemoteState?: (args: {
    stateJson: string
    expectedRevision?: number
  }) => Promise<{ revision?: number } | unknown>
}) {
  const seededState = useMemo(() => JSON.parse(sessionSeed) as RewardsSessionState, [sessionSeed])
  const [state, setState] = useState(seededState)
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const isPersistingRef = useRef(false)
  const lastRemoteStateRef = useRef<string | null>(null)
  const rewardsRevisionRef = useRef<number | undefined>(undefined)
  const tasks = useMemo(() => buildDefaultRewardsCatalog(), [])

  useEffect(() => {
    if (!persistState) {
      if (remoteState === undefined) {
        setHasHydratedStorage(false)
        return
      }
      const remote = remoteState ? (JSON.parse(remoteState) as RewardsSessionState) : null
      // Compare against the durable localStorage mirror: if a prior Convex save
      // failed, the mirror holds the newer claim while Convex is stale. Prefer the
      // fresher (more-records) state so a claimed balance never reverts on nav.
      const local = readRewardsSessionState(walletId, sessionSeed)
      const chosen = remote && rewardsStateRank(remote) >= rewardsStateRank(local) ? remote : local
      // Track the remote value (not `chosen`) so the persist effect re-pushes a
      // locally-fresher state up to Convex.
      lastRemoteStateRef.current = remoteState
      if (remoteRevision != null) rewardsRevisionRef.current = remoteRevision
      setState(chosen)
      setHasHydratedStorage(true)
      return
    }
    const nextState = readRewardsSessionState(walletId, sessionSeed)
    setState(nextState)
    setHasHydratedStorage(true)
  }, [persistState, remoteRevision, remoteState, walletId, sessionSeed])

  useEffect(() => {
    if (!hasHydratedStorage) return
    if (!persistState) {
      const serialized = JSON.stringify(state)
      // Durable write-through: mirror to localStorage so a failed/unreachable Convex
      // save doesn't drop the claim on the next navigation (hydration picks it up).
      writeRewardsSessionState(walletId, state)
      if (serialized === lastRemoteStateRef.current || !persistRemoteState) return
      lastRemoteStateRef.current = serialized
      void persistRemoteState({
        stateJson: serialized,
        expectedRevision: rewardsRevisionRef.current,
      })
        .then((result) => {
          const revision = (result as { revision?: number } | null)?.revision
          if (revision != null) rewardsRevisionRef.current = revision
        })
        .catch(() => {
          lastRemoteStateRef.current = null
        })
      return
    }
    isPersistingRef.current = true
    writeRewardsSessionState(walletId, state)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(REWARDS_SESSION_SYNC_EVENT, { detail: { walletId } }))
    }
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [hasHydratedStorage, persistRemoteState, persistState, walletId, state])

  useEffect(() => {
    if (!persistState || typeof window === "undefined") return undefined

    const reloadFromStorage = () => {
      const nextState = readRewardsSessionState(walletId, sessionSeed)
      setState(nextState)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key == null || !event.key.endsWith(`:${walletId}`)) return
      reloadFromStorage()
    }

    const handleSameTabSync = (event: Event) => {
      const detail = (event as CustomEvent<{ walletId: string }>).detail
      if (detail?.walletId !== walletId || isPersistingRef.current) return
      reloadFromStorage()
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(REWARDS_SESSION_SYNC_EVENT, handleSameTabSync)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(REWARDS_SESSION_SYNC_EVENT, handleSameTabSync)
    }
  }, [persistState, sessionSeed, walletId])

  const writeRewardsState = useCallback(
    (next: RewardsSessionState | ((current: RewardsSessionState) => RewardsSessionState)) => {
      const resolved = typeof next === "function" ? next(stateRef.current) : next
      stateRef.current = resolved
      setState(resolved)
    },
    [],
  )

  const actionAdapter = useMemo(
    () =>
      new SandboxRewardsActionAdapter({
        readState: () => stateRef.current,
        writeState: writeRewardsState,
        tasks,
      }),
    [tasks, writeRewardsState],
  )

  const readAdapter = useMemo(
    () =>
      new SandboxRewardsReadAdapter({
        state: () => stateRef.current,
        tasks,
      }),
    [tasks],
  )

  useEffect(() => {
    if (!hasHydratedStorage) return
    void actionAdapter.initializeRewardsForWallet(walletId)
  }, [actionAdapter, hasHydratedStorage, walletId])

  const recordActivityEvent = useCallback(
    async (event: RewardActivityEvent) => actionAdapter.recordActivityEvent(event),
    [actionAdapter],
  )

  const claimReward = useCallback(
    (taskId: string) => actionAdapter.claimReward(walletId, taskId),
    [actionAdapter, walletId],
  )
  const claimAllRewards = useCallback(() => actionAdapter.claimAllRewards(walletId), [actionAdapter, walletId])
  const completeSandboxTask = useCallback(
    (taskId: string) => actionAdapter.completeSandboxTask(walletId, taskId),
    [actionAdapter, walletId],
  )
  const completeEducation = useCallback(() => actionAdapter.completeEducation(walletId), [actionAdapter, walletId])
  const favoriteMarket = useCallback(
    (marketId: string) => actionAdapter.favoriteMarket(walletId, marketId),
    [actionAdapter, walletId],
  )
  const recordSimulation = useCallback(
    (product: "borrow" | "lend" | "multiply") => actionAdapter.recordSimulation(walletId, product),
    [actionAdapter, walletId],
  )
  const recordSandboxTour = useCallback(
    (taskId: string) => actionAdapter.recordSandboxTour(walletId, taskId),
    [actionAdapter, walletId],
  )
  const recordDailyCheckin = useCallback(() => actionAdapter.recordDailyCheckin(walletId), [actionAdapter, walletId])
  const runReferralSandboxStep = useCallback(
    (step: "invite" | "activate" | "fund") => actionAdapter.runReferralSandboxStep(walletId, step),
    [actionAdapter, walletId],
  )
  const createReferralCode = useCallback(() => actionAdapter.createReferralCode(walletId), [actionAdapter, walletId])
  const recordReferralLinkCopied = useCallback(
    () => actionAdapter.recordReferralLinkCopied(walletId),
    [actionAdapter, walletId],
  )
  const applyReferralCode = useCallback(
    (referralCode: string) => actionAdapter.applyReferralCode(walletId, referralCode),
    [actionAdapter, walletId],
  )
  const refreshTaskProgress = useCallback(() => actionAdapter.refreshTaskProgress(walletId), [actionAdapter, walletId])
  const reset = useCallback(() => {
    if (persistState) clearRewardsSessionState(walletId)
    setState(JSON.parse(sessionSeed))
  }, [persistState, sessionSeed, walletId])

  return useMemo(
    () => ({
      walletId,
      state,
      hasHydratedStorage,
      tasks,
      readAdapter,
      recordActivityEvent,
      claimReward,
      claimAllRewards,
      completeSandboxTask,
      completeEducation,
      favoriteMarket,
      recordSimulation,
      recordSandboxTour,
      recordDailyCheckin,
      runReferralSandboxStep,
      createReferralCode,
      recordReferralLinkCopied,
      applyReferralCode,
      refreshTaskProgress,
      reset,
      isPending: false,
    }),
    [
      walletId,
      state,
      hasHydratedStorage,
      tasks,
      readAdapter,
      recordActivityEvent,
      claimReward,
      claimAllRewards,
      completeSandboxTask,
      completeEducation,
      favoriteMarket,
      recordSimulation,
      recordSandboxTour,
      recordDailyCheckin,
      runReferralSandboxStep,
      createReferralCode,
      recordReferralLinkCopied,
      applyReferralCode,
      refreshTaskProgress,
      reset,
    ],
  )
}
