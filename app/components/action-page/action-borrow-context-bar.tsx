"use client"

import { useState } from "react"
import type { HomeBorrowToken, HomeCollateralPool } from "@/app/lib/home-sim"
import { HomeActionContextBar } from "@/app/components/home/home-action-context-bar"
import { PoolPickerDialog } from "@/app/components/home/pool-picker-dialog"
import { TokenPickerDialog } from "@/app/components/home/token-picker-dialog"
import type { PoolDialogMode } from "@/app/components/home/types"

function poolDialogModeForKind(kind: "borrow" | "repay" | "remove" | "claim"): PoolDialogMode {
  if (kind === "repay") return "repay"
  if (kind === "remove") return "remove"
  return "borrow"
}

export function ActionBorrowContextBar({
  kind,
  pool,
  pools,
  token,
  tokens,
  debts,
  onPoolChange,
  onTokenChange,
}: {
  kind: "borrow" | "repay" | "remove" | "claim"
  pool: HomeCollateralPool | null
  pools: HomeCollateralPool[]
  token?: HomeBorrowToken | null
  tokens?: HomeBorrowToken[]
  debts: Record<string, number>
  onPoolChange: (poolId: string) => void
  onTokenChange?: (tokenId: string) => void
}) {
  const [poolDialogOpen, setPoolDialogOpen] = useState(false)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const showToken = (kind === "borrow" || kind === "repay") && Boolean(onTokenChange)
  const poolDialogMode = poolDialogModeForKind(kind)

  if (!pool) return null

  return (
    <>
      <HomeActionContextBar
        pool={pool}
        token={token}
        showToken={showToken}
        onOpenPool={() => setPoolDialogOpen(true)}
        onOpenToken={showToken ? () => setTokenDialogOpen(true) : undefined}
      />

      <PoolPickerDialog
        open={poolDialogOpen}
        onOpenChange={setPoolDialogOpen}
        selectedPoolId={pool.id}
        onSelect={(poolId) => {
          onPoolChange(poolId)
          setPoolDialogOpen(false)
        }}
        mode={poolDialogMode}
        pools={pools}
        debts={debts}
      />

      {showToken && onTokenChange ? (
        <TokenPickerDialog
          open={tokenDialogOpen}
          onOpenChange={setTokenDialogOpen}
          selectedTokenId={token?.id ?? null}
          tokens={tokens ?? []}
          onSelect={(tokenId) => {
            onTokenChange(tokenId)
            setTokenDialogOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
