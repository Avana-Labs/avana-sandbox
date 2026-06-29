"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SandboxRewardsActionAdapter } from "./sandbox-action-adapter"
import { SandboxRewardsReadAdapter } from "./sandbox-read-adapter"
import { buildDefaultRewardsCatalog } from "@/app/lib/rewards-engine"
import type { RewardActivityEvent } from "@/app/lib/rewards-engine"
import type { RewardsSessionState } from "./contracts"
import { clearRewardsSessionState, readRewardsSessionState, writeRewardsSessionState } from "./storage"
import { REWARDS_SESSION_SYNC_EVENT } from "./session-sync"

export function useRewardsSession({
  walletId,
  sessionSeed,
}: {
  walletId: string
  sessionSeed: string
}) {
  const seededState = useMemo(() => JSON.parse(sessionSeed) as RewardsSessionState, [sessionSeed])
  const [state, setState] = useState(seededState)
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const isPersistingRef = useRef(false)
  const tasks = useMemo(() => buildDefaultRewardsCatalog(), [])

  useEffect(() => {
    const nextState = readRewardsSessionState(walletId, sessionSeed)
    setState(nextState)
    setHasHydratedStorage(true)
  }, [walletId, sessionSeed])

  useEffect(() => {
    if (!hasHydratedStorage) return
    isPersistingRef.current = true
    writeRewardsSessionState(walletId, state)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(REWARDS_SESSION_SYNC_EVENT, { detail: { walletId } }))
    }
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [hasHydratedStorage, walletId, state])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

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
  }, [sessionSeed, walletId])

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

  const claimReward = useCallback((taskId: string) => actionAdapter.claimReward(walletId, taskId), [actionAdapter, walletId])
  const claimAllRewards = useCallback(() => actionAdapter.claimAllRewards(walletId), [actionAdapter, walletId])
  const completeSandboxTask = useCallback((taskId: string) => actionAdapter.completeSandboxTask(walletId, taskId), [actionAdapter, walletId])
  const completeEducation = useCallback(() => actionAdapter.completeEducation(walletId), [actionAdapter, walletId])
  const favoriteMarket = useCallback((marketId: string) => actionAdapter.favoriteMarket(walletId, marketId), [actionAdapter, walletId])
  const recordSimulation = useCallback(
    (product: "borrow" | "lend" | "multiply") => actionAdapter.recordSimulation(walletId, product),
    [actionAdapter, walletId],
  )
  const recordSandboxTour = useCallback((taskId: string) => actionAdapter.recordSandboxTour(walletId, taskId), [actionAdapter, walletId])
  const recordDailyCheckin = useCallback(() => actionAdapter.recordDailyCheckin(walletId), [actionAdapter, walletId])
  const runReferralSandboxStep = useCallback(
    (step: "invite" | "activate" | "fund") => actionAdapter.runReferralSandboxStep(walletId, step),
    [actionAdapter, walletId],
  )
  const createReferralCode = useCallback(() => actionAdapter.createReferralCode(walletId), [actionAdapter, walletId])
  const recordReferralLinkCopied = useCallback(() => actionAdapter.recordReferralLinkCopied(walletId), [actionAdapter, walletId])
  const applyReferralCode = useCallback((referralCode: string) => actionAdapter.applyReferralCode(walletId, referralCode), [actionAdapter, walletId])
  const refreshTaskProgress = useCallback(() => actionAdapter.refreshTaskProgress(walletId), [actionAdapter, walletId])
  const reset = useCallback(() => {
    clearRewardsSessionState(walletId)
    setState(JSON.parse(sessionSeed))
  }, [sessionSeed, walletId])

  return {
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
  }
}
