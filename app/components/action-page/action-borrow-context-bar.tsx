"use client"

import { useState } from "react"
import type { HomeCollateralPool } from "@/app/lib/borrow-system/home-contracts"
import { HomeActionContextBar } from "@/app/components/home/home-action-context-bar"
import { PoolPickerDialog } from "@/app/components/home/pool-picker-dialog"
import { SwapStyleFieldStack } from "@/app/components/action-page/swap-style-field"
import { ActionContextSelectorCard } from "@/app/components/action-page/action-context-selector-card"
import type { PoolDialogMode } from "@/app/components/home/types"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
  const { t } = useTranslation()
  const [poolDialogOpen, setPoolDialogOpen] = useState(false)
  const poolDialogMode = poolDialogModeForKind(kind)

  const poolField = (
    pool ? (
      <HomeActionContextBar
        pool={pool}
        onOpenPool={() => setPoolDialogOpen(true)}
        variant={variant}
        workspace={workspace}
        label={t("Collateral")}
      />
    ) : (
      <ActionContextSelectorCard
        label="Collateral"
        value="0"
        approxUsdLabel={t("≈ $0")}
        collateralSymbol="LP"
        onClick={() => setPoolDialogOpen(true)}
        workspace={workspace}
      />
    )
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
        selectedPoolId={pool?.id ?? ""}
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
