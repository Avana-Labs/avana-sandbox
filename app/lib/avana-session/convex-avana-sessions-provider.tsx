"use client"

import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { SandboxActionResult } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult, LendTransactionResult } from "@/app/lib/lend-system/contracts"
import type { MultiplySandboxActionResult, MultiplyTransactionResult } from "@/app/lib/multiply-system/contracts"
import {
  borrowResultToRecordArgs,
  lendResultToRecordArgs,
  multiplyResultToRecordArgs,
  swapRecordToRecordSwapArgs,
} from "@/app/lib/sandbox-tx/persistence"
import type { SwapTransactionRecord } from "@/app/lib/swap-system/transaction-adapter"
import {
  AvanaSessionsProvider,
  useBorrowSessionContext,
  useLendSessionContext,
  useMultiplySessionContext,
} from "./avana-sessions-provider"
import { ConvexMarketSnapshotHydrators } from "./convex-market-snapshot-hydrators"
import { pendingHydrationIntentIds, shouldApplyHydration } from "./wallet-hydration-guard"
import {
  advanceRevisionOnSuccess,
  captureHydratedRevisions,
  seedRevisionFromReceipt,
  withExpectedRevision,
  type PositionRevisionSummary,
} from "./optimistic-revision"

function ConvexWalletHydrators({
  walletId,
  onWalletHydrated,
}: {
  walletId: string
  onWalletHydrated: (positions: readonly PositionRevisionSummary[]) => void
}) {
  const borrow = useBorrowSessionContext()
  const lend = useLendSessionContext()
  const multiply = useMultiplySessionContext()
  const session = useQuery(api.sandbox.transactions.getSessionState, { wallet: walletId })
  // Seeded initial per-wallet portfolio state lives in three tables (walletDebts /
  // walletCollateralPositions / walletClaimPositions) — the Convex swaps for the
  // HOME_INITIAL_DEBTS + HOME_COLLATERAL_POOLS + HOME_CLAIM_POSITIONS mocks. Read
  // here and forward into the borrow hydrate so the home portfolio cards render
  // per-wallet Convex data instead of the mock catalog.
  const walletDebts = useQuery(api.wallet.debts.listForWallet, { wallet: walletId })
  const walletCollateralPositions = useQuery(api.wallet.collateralPositions.listForWallet, { wallet: walletId })
  const walletClaimPositions = useQuery(api.wallet.claimPositions.listForWallet, { wallet: walletId })
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
    if (!session) return
    const { borrow: borrowHistory, lend: lendHistory, multiply: multiplyHistory } = historiesRef.current
    const pending = pendingHydrationIntentIds([...borrowHistory, ...lendHistory, ...multiplyHistory], Date.now())
    if (!shouldApplyHydration(session, pending)) return
    borrow.hydrateWalletData({
      ...session,
      walletDebts: walletDebts?.map((row) => ({
        marketId: row.marketId,
        debtAssetId: row.debtAssetId,
        amountUsd: row.amountUsd,
      })),
      walletCollateralPositions: walletCollateralPositions?.map((row) => ({
        homePoolId: row.homePoolId,
        marketId: row.marketId,
        collateralUsd: row.collateralUsd,
      })),
      walletClaimPositions: walletClaimPositions?.map((row) => ({
        claimId: row.claimId,
        marketId: row.marketId,
        totalUsd: row.totalUsd,
      })),
    })
    lend.hydrateWalletData(session)
    multiply.hydrateWalletData(session)
    onWalletHydrated(session.positions)
  }, [
    borrow.hydrateWalletData,
    lend.hydrateWalletData,
    multiply.hydrateWalletData,
    onWalletHydrated,
    session,
    walletDebts,
    walletCollateralPositions,
    walletClaimPositions,
  ])

  return null
}

export function ConvexAvanaSessionsProvider({ walletId, children }: { walletId: string; children: ReactNode }) {
  const recordTransaction = useMutation(api.sandbox.transactions.recordTransaction)
  const recordSwap = useMutation(api.sandbox.transactions.recordSwap)
  const durableSwapTransactions = useQuery(api.sandbox.transactions.getWalletSwapTransactions, { wallet: walletId })
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
    (args: { stateJson: string; expectedRevision?: number }) =>
      saveRewardsState({ wallet: walletId, stateJson: args.stateJson, expectedRevision: args.expectedRevision }),
    [saveRewardsState, walletId],
  )
  const persistSwapTransaction = useCallback(
    async (record: SwapTransactionRecord) => {
      const args = swapRecordToRecordSwapArgs(record, walletId)
      if (!args) return
      await recordSwap(args)
    },
    [recordSwap, walletId],
  )

  return (
    <AvanaSessionsProvider
      walletId={walletId}
      persistBorrowTransaction={persistBorrowTransaction}
      persistLendTransaction={persistLendTransaction}
      persistMultiplyTransaction={persistMultiplyTransaction}
      persistSwapTransaction={persistSwapTransaction}
      remoteSwapTransactions={durableSwapTransactions ?? undefined}
      remoteRewardsState={rewardsState?.stateJson ?? (rewardsState === null ? null : undefined)}
      remoteRewardsRevision={rewardsState?.revision ?? (rewardsState === null ? null : undefined)}
      persistRewardsState={persistRewardsState}
      persistLocalState={false}
      sessionSource="convex"
    >
      <ConvexMarketSnapshotHydrators />
      <ConvexWalletHydrators walletId={walletId} onWalletHydrated={handleWalletHydrated} />
      {children}
    </AvanaSessionsProvider>
  )
}
