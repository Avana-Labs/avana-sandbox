"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"
import { useLendSession } from "@/app/lib/lend-system/use-lend-session"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import { useAvanaSession } from "./use-avana-session"

type BorrowSession = ReturnType<typeof useBorrowSession>
type MultiplySession = ReturnType<typeof useMultiplySession>
type LendSession = ReturnType<typeof useLendSession>

export type AvanaSessions = {
  walletId: string
  walletAddress: string
  sandboxMode: true
  borrow: BorrowSession
  multiply: MultiplySession
  lend: LendSession
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

  return (
    <AvanaSessionsContext.Provider
      value={{
        walletId: avana.walletId,
        walletAddress: avana.walletAddress,
        sandboxMode: avana.sandboxMode,
        borrow,
        multiply,
        lend,
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
