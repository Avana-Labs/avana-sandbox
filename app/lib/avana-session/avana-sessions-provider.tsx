"use client"

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"
import { useRewardsSession } from "@/app/lib/rewards-system"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"
import { useLendSession } from "@/app/lib/lend-system/use-lend-session"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import { useAvanaSession } from "./use-avana-session"

type BorrowSession = ReturnType<typeof useBorrowSession>
type MultiplySession = ReturnType<typeof useMultiplySession>
type LendSession = ReturnType<typeof useLendSession>
type RewardsSession = ReturnType<typeof useRewardsSession>

function usd6ToNumber(value: bigint) {
  return Number(value) / 1_000_000
}

function useRewardsEventBridge({
  walletId,
  borrow,
  multiply,
  lend,
  rewards,
}: {
  walletId: string
  borrow: BorrowSession
  multiply: MultiplySession
  lend: LendSession
  rewards: RewardsSession
}) {
  const seenIdsRef = useRef(new Set<string>())

  useEffect(() => {
    for (const item of borrow.transactionHistory) {
      const bridgeId = `borrow:${item.id}`
      if (item.status !== "success" || seenIdsRef.current.has(bridgeId)) continue
      seenIdsRef.current.add(bridgeId)

      if (item.kind === "borrow") {
        void rewards.recordActivityEvent({
          id: bridgeId,
          wallet: walletId,
          product: "borrow",
          type: "borrow_opened",
          amountUsd: usd6ToNumber(item.executedAmountUsd6),
          marketId: item.marketId,
          timestamp: item.timestamp,
        })
      }

      if (item.kind === "repay") {
        void rewards.recordActivityEvent({
          id: bridgeId,
          wallet: walletId,
          product: "borrow",
          type: "borrow_repaid",
          amountUsd: usd6ToNumber(item.executedAmountUsd6),
          marketId: item.marketId,
          timestamp: item.timestamp,
        })
      }
    }
  }, [borrow.transactionHistory, rewards, walletId])

  useEffect(() => {
    for (const item of multiply.transactionHistory) {
      const bridgeId = `multiply:${item.id}`
      if (item.status !== "success" || seenIdsRef.current.has(bridgeId)) continue
      seenIdsRef.current.add(bridgeId)

      void rewards.recordActivityEvent({
        id: bridgeId,
        wallet: walletId,
        product: "multiply",
        type: item.kind === "multiply" ? "multiply_opened" : "multiply_deleveraged",
        amountUsd: item.amountUsd,
        marketId: item.marketId,
        timestamp: item.timestamp,
      })
    }
  }, [multiply.transactionHistory, rewards, walletId])

  useEffect(() => {
    for (const item of lend.transactionHistory) {
      const bridgeId = `lend:${item.id}`
      if (item.status !== "success" || seenIdsRef.current.has(bridgeId)) continue
      seenIdsRef.current.add(bridgeId)

      void rewards.recordActivityEvent({
        id: bridgeId,
        wallet: walletId,
        product: "lend",
        type: item.kind === "deposit" ? "lend_deposited" : "lend_withdrawn",
        marketId: item.marketId,
        amountUsd: item.amount,
        timestamp: item.timestamp,
      })
    }
  }, [lend.transactionHistory, rewards, walletId])
}

export type AvanaSessions = {
  walletId: string
  walletAddress: string
  sandboxMode: true
  borrow: BorrowSession
  multiply: MultiplySession
  lend: LendSession
  rewards: RewardsSession
}

const AvanaSessionsContext = createContext<AvanaSessions | null>(null)

export function AvanaSessionsProvider({
  walletId,
  children,
}: {
  walletId?: string
  children: ReactNode
}) {
  const avana = useAvanaSession(walletId)
  const borrow = useBorrowSession({
    walletId: avana.walletId,
    sessionSeed: avana.borrowSessionSeed,
  })
  const multiply = useMultiplySession({
    walletId: avana.walletId,
    sessionSeed: avana.multiplySessionSeed,
  })
  const lend = useLendSession({
    walletId: avana.walletId,
    sessionSeed: avana.lendSessionSeed,
  })
  const rewards = useRewardsSession({
    walletId: avana.walletId,
    sessionSeed: avana.rewardsSessionSeed,
  })

  useRewardsEventBridge({
    walletId: avana.walletId,
    borrow,
    multiply,
    lend,
    rewards,
  })

  return (
    <AvanaSessionsContext.Provider
      value={{
        walletId: avana.walletId,
        walletAddress: avana.walletAddress,
        sandboxMode: avana.sandboxMode,
        borrow,
        multiply,
        lend,
        rewards,
      }}
    >
      {children}
    </AvanaSessionsContext.Provider>
  )
}

export function useAvanaSessions() {
  const context = useContext(AvanaSessionsContext)
  if (!context) {
    throw new Error("useAvanaSessions must be used within AvanaSessionsProvider")
  }
  return context
}

export function useOptionalAvanaSessions() {
  return useContext(AvanaSessionsContext)
}

export function useBorrowSessionContext() {
  return useAvanaSessions().borrow
}

export function useMultiplySessionContext() {
  return useAvanaSessions().multiply
}

export function useLendSessionContext() {
  return useAvanaSessions().lend
}

export function useRewardsSessionContext() {
  return useAvanaSessions().rewards
}
