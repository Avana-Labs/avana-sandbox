"use client"

import { useState, type ReactNode } from "react"
import type { HomeCollateralPool } from "@/app/lib/home-sim"
import { HomeActionContextBar } from "@/app/components/home/home-action-context-bar"
import { PoolPickerDialog } from "@/app/components/home/pool-picker-dialog"
import { SwapStyleFieldStack } from "@/app/components/action-page/swap-style-field"
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
  debts,
  onPoolChange,
  variant = "card",
  tokenField,
}: {
  kind: "borrow" | "repay" | "remove" | "claim"
  pool: HomeCollateralPool | null
  pools: HomeCollateralPool[]
  debts: Record<string, number>
  onPoolChange: (poolId: string) => void
  variant?: "card" | "inset"
  tokenField?: ReactNode
}) {
  const [poolDialogOpen, setPoolDialogOpen] = useState(false)
  const poolDialogMode = poolDialogModeForKind(kind)

  if (!pool) return null

  const poolField = <HomeActionContextBar pool={pool} onOpenPool={() => setPoolDialogOpen(true)} variant={variant} />

  return (
    <>
      {variant === "inset" ? (
        <SwapStyleFieldStack>
          {poolField}
          {tokenField}
        </SwapStyleFieldStack>
      ) : (
        poolField
      )}

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
    </>
  )
}
