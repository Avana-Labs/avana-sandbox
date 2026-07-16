"use client"

import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import type { LendConvexSnapshot } from "@/app/lib/lend-system/market-hydration"
import type { MultiplyConvexSnapshot } from "@/app/lib/multiply-system/market-hydration"
import type { SandboxActionResult } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult, LendTransactionResult } from "@/app/lib/lend-system/contracts"
import type { MultiplySandboxActionResult, MultiplyTransactionResult } from "@/app/lib/multiply-system/contracts"
import {
  borrowResultToRecordArgs,
  lendResultToRecordArgs,
  multiplyResultToRecordArgs,
} from "@/app/lib/sandbox-tx/persistence"
import {
  AvanaSessionsProvider,
  useBorrowSessionContext,
  useLendSessionContext,
  useMultiplySessionContext,
} from "./avana-sessions-provider"
import { pendingHydrationIntentIds, shouldApplyHydration } from "./wallet-hydration-guard"
import {
  advanceRevisionOnSuccess,
  captureHydratedRevisions,
  seedRevisionFromReceipt,
  withExpectedRevision,
  type PositionRevisionSummary,
} from "./optimistic-revision"

function ConvexSessionHydrators({
  walletId,
  onWalletHydrated,
}: {
  walletId: string
  onWalletHydrated: (positions: readonly PositionRevisionSummary[]) => void
}) {
  const borrow = useBorrowSessionContext()
  const lend = useLendSessionContext()
  const multiply = useMultiplySessionContext()
  const snapshots = useQuery(api.markets.listMarketSnapshots)
  const session = useQuery(api.sandbox.transactions.getSessionState, { wallet: walletId })
  const historiesRef = useRef({
    borrow: borrow.transactionHistory,
    lend: lend.transactionHistory,
    multiply: multiply.transactionHistory,
  })
  historiesRef.current = {
    borrow: borrow.transactionHistory,
    lend: lend.transactionHistory,
    multiply: multiply.transactionHistory,
  }

  useEffect(() => {
    if (!snapshots || snapshots.length === 0) return
    borrow.hydrateMarketData(snapshots as ConvexMarketSnapshot[])
    lend.hydrateMarketData(snapshots as LendConvexSnapshot[])
    multiply.hydrateMarketData(snapshots as MultiplyConvexSnapshot[])
  }, [borrow.hydrateMarketData, lend.hydrateMarketData, multiply.hydrateMarketData, snapshots])

  useEffect(() => {
    if (!session) return
    const { borrow: borrowHistory, lend: lendHistory, multiply: multiplyHistory } = historiesRef.current
    const pending = pendingHydrationIntentIds([...borrowHistory, ...lendHistory, ...multiplyHistory], Date.now())
    if (!shouldApplyHydration(session, pending)) return
    borrow.hydrateWalletData(session)
    lend.hydrateWalletData(session)
    multiply.hydrateWalletData(session)
    onWalletHydrated(session.positions)
  }, [borrow.hydrateWalletData, lend.hydrateWalletData, multiply.hydrateWalletData, onWalletHydrated, session])

  return null
}

export function ConvexAvanaSessionsProvider({ walletId, children }: { walletId: string; children: ReactNode }) {
  const recordTransaction = useMutation(api.sandbox.transactions.recordTransaction)
  const saveRewardsState = useMutation(api.sandbox.rewards.saveState)
  const rewardsState = useQuery(api.sandbox.rewards.getState, { wallet: walletId })
  const revisionByKeyRef = useRef(new Map<string, number>())
  const handleWalletHydrated = useCallback(
    (positions: readonly PositionRevisionSummary[]) => captureHydratedRevisions(revisionByKeyRef.current, positions),
    [],
  )

  const persistBorrowTransaction = useCallback(
    async (result: SandboxActionResult) => {
      const { args, key } = withExpectedRevision(
        borrowResultToRecordArgs(result, walletId),
        "borrow",
        revisionByKeyRef.current,
      )
      const persisted = await recordTransaction(args)
      if (persisted.revision != null) seedRevisionFromReceipt(revisionByKeyRef.current, key, persisted.revision)
      else advanceRevisionOnSuccess(revisionByKeyRef.current, key, persisted.idempotent)
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, walletId],
  )
  const persistLendTransaction = useCallback(
    async (result: LendSandboxActionResult): Promise<LendTransactionResult> => {
      const { args, key } = withExpectedRevision(
        lendResultToRecordArgs(result, walletId),
        "lend",
        revisionByKeyRef.current,
      )
      const persisted = await recordTransaction(args)
      if (persisted.revision != null) seedRevisionFromReceipt(revisionByKeyRef.current, key, persisted.revision)
      else advanceRevisionOnSuccess(revisionByKeyRef.current, key, persisted.idempotent)
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        actionType: result.receipt.actionType,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, walletId],
  )
  const persistMultiplyTransaction = useCallback(
    async (result: MultiplySandboxActionResult): Promise<MultiplyTransactionResult> => {
      const { args, key } = withExpectedRevision(
        multiplyResultToRecordArgs(result, walletId),
        "multiply",
        revisionByKeyRef.current,
      )
      const persisted = await recordTransaction(args)
      if (persisted.revision != null) seedRevisionFromReceipt(revisionByKeyRef.current, key, persisted.revision)
      else advanceRevisionOnSuccess(revisionByKeyRef.current, key, persisted.idempotent)
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        actionType: result.receipt.actionType,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, walletId],
  )
  const persistRewardsState = useCallback(
    (stateJson: string) => saveRewardsState({ wallet: walletId, stateJson }),
    [saveRewardsState, walletId],
  )

  return (
    <AvanaSessionsProvider
      walletId={walletId}
      persistBorrowTransaction={persistBorrowTransaction}
      persistLendTransaction={persistLendTransaction}
      persistMultiplyTransaction={persistMultiplyTransaction}
      remoteRewardsState={rewardsState?.stateJson ?? (rewardsState === null ? null : undefined)}
      persistRewardsState={persistRewardsState}
      persistLocalState={false}
      sessionSource="convex"
    >
      <ConvexSessionHydrators walletId={walletId} onWalletHydrated={handleWalletHydrated} />
      {children}
    </AvanaSessionsProvider>
  )
}
