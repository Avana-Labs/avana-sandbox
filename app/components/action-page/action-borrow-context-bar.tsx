"use client"

import { useState } from "react"
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
  workspace = false,
  amountField,
}: {
  kind: "borrow" | "repay" | "remove" | "claim"
  pool: HomeCollateralPool | null
  pools: HomeCollateralPool[]
  debts: Record<string, number>
  onPoolChange: (poolId: string) => void
  variant?: "card" | "inset"
  workspace?: boolean
  amountField?: React.ReactNode
}) {
  const [poolDialogOpen, setPoolDialogOpen] = useState(false)
  const poolDialogMode = poolDialogModeForKind(kind)

  if (!pool) return null

  const poolField = (
    <HomeActionContextBar
      pool={pool}
      onOpenPool={() => setPoolDialogOpen(true)}
      variant={variant}
      workspace={workspace}
    />
  )

  return (
    <>
      {variant === "inset" ? (
        <SwapStyleFieldStack>
          {poolField}
          {amountField}
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
