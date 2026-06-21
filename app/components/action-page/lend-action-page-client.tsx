"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLendSessionContext, useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { getWalletBalanceForLendMarket } from "@/app/lib/lend-system/wallet-balances"
import { getLendMarketById } from "@/app/lib/lend-system/catalog"
import type { ActionPageMode } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { mapLendPreviewToActionUi } from "@/app/lib/action-system/adapters/lend-preview-mapper"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { formatActionUsd } from "@/app/lib/action-system/formatters"

function truncateWallet(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 6)}...${id.slice(-4)}`
}

export function LendActionPageClient({
  kind,
  mode = "page",
  closeHref = "/lend",
  initialMarketId = "gho",
  initialAmount = "1",
}: {
  kind: "deposit" | "withdraw"
  mode?: ActionPageMode
  closeHref?: string
  initialMarketId?: string
  initialAmount?: string
}) {
  const descriptor = getActionDescriptor("lend", kind)
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useLendSessionContext()
  const market = session.state.markets[initialMarketId] ?? getLendMarketById(initialMarketId)
  const [stage, setStage] = useState<ActionStage>("configure")
  const [amount, setAmount] = useState(initialAmount)
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const position = useMemo(
    () =>
      Object.values(session.state.positions).find(
        (entry) => entry.walletId === walletId && entry.marketId === market?.marketId && entry.status === "active",
      ),
    [market?.marketId, session.state.positions, walletId],
  )

  useEffect(() => {
    if (!market) return
    const parsed = Number.parseFloat(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPreviewUi(null)
      return
    }

    const action =
      kind === "deposit"
        ? ({
            type: "deposit" as const,
            walletId,
            marketId: market.marketId,
            depositAmount: parsed,
            walletBalance: getWalletBalanceForLendMarket(session.state, walletId, market),
          } as const)
        : ({
            type: "withdraw" as const,
            walletId,
            marketId: market.marketId,
            positionId: position?.positionId ?? "missing",
            withdrawAmount: parsed,
          } as const)

    void session.previewTransaction(session.createIntent(action)).then((preview) => {
      setPreviewUi(
        mapLendPreviewToActionUi(preview, {
          symbol: market.asset.symbol,
          amount: parsed,
          marketLabel: `${market.asset.symbol} · Core`,
          balanceLabel: kind === "deposit" ? "Balance" : "Deposited",
          balanceAmount: kind === "deposit" ? getWalletBalanceForLendMarket(session.state, walletId, market) : (position?.currentSuppliedAmount ?? 0),
          rateLabel: kind === "deposit" ? "Deposit APY" : "Withdrawal",
        }),
      )
    })
  }, [amount, kind, market, position, session, walletId])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(closeHref)
      return
    }
    if (!market || !previewUi?.allowed) return
    setStage("submitting")
    setIsPending(true)
    try {
      const parsed = Number.parseFloat(amount)
      const action =
        kind === "deposit"
          ? {
              type: "deposit" as const,
              walletId,
              marketId: market.marketId,
              depositAmount: parsed,
              walletBalance: getWalletBalanceForLendMarket(session.state, walletId, market),
            }
          : {
              type: "withdraw" as const,
              walletId,
              marketId: market.marketId,
              positionId: position!.positionId,
              withdrawAmount: parsed,
            }
      const intent = session.createIntent(action)
      const preview = await session.previewTransaction(intent)
      if (!preview.allowed) throw new Error(preview.validationErrors[0] ?? "Action unavailable")
      const result = await session.executeTransaction(preview.intent)
      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? "Transaction failed")
      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${parsed.toFixed(4)} ${market.asset.symbol} processed.`,
          receiptHash: result.receipt.hash,
          metrics: previewUi.metrics,
          href: "/lend",
        }),
      )
      setStage("success")
    } catch (error) {
      setOutcome({
        tone: "error",
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Unable to sign the transaction",
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [amount, closeHref, descriptor.primaryVerb, kind, market, position, previewUi, router, session, stage, walletId])

  if (!market) return null

  return (
    <ActionPageShell mode={mode} title={descriptor.title} subtitle={descriptor.subtitle} walletLabel={truncateWallet(walletId)} closeHref={closeHref}>
      {stage === "success" && successUi ? (
        <ActionSuccessStage success={successUi} onSecondary={() => router.push(closeHref)} />
      ) : (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={amount}
          onAmountChange={setAmount}
          preview={previewUi}
          onPrimary={() => void handlePrimary()}
          onSecondary={() => router.push(closeHref)}
          onMax={() => {
            if (kind === "deposit") {
              setAmount(String(getWalletBalanceForLendMarket(session.state, walletId, market)))
            } else if (position) {
              setAmount(String(position.currentSuppliedAmount))
            }
          }}
          isPending={isPending}
          outcome={outcome}
        />
      )}
    </ActionPageShell>
  )
}
