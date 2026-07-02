"use client"

import { useState, type ReactNode } from "react"
import type { HomeCollateralPool } from "@/app/lib/home-sim"
import { HomeActionContextBar } from "@/app/components/home/home-action-context-bar"
import { PoolPickerDialog } from "@/app/components/home/pool-picker-dialog"
import { SwapStyleFieldStack } from "@/app/components/action-page/swap-style-field"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export function ActionSupplyContextBar({
  pool,
  pools,
  debts,
  onPoolChange,
  amountField,
  switchable = true,
}: {
  pool: HomeCollateralPool
  pools: HomeCollateralPool[]
  debts: Record<string, number>
  onPoolChange: (poolId: string) => void
  amountField?: ReactNode
  switchable?: boolean
}) {
  const { t } = useTranslation()
  const [poolDialogOpen, setPoolDialogOpen] = useState(false)

  return (
    <>
      <SwapStyleFieldStack>
        <HomeActionContextBar
          label={t("Supply")}
          pool={pool}
          onOpenPool={() => setPoolDialogOpen(true)}
          variant="inset"
          switchable={switchable}
        />
        {amountField}
      </SwapStyleFieldStack>

      {switchable ? (
        <PoolPickerDialog
          open={poolDialogOpen}
          onOpenChange={setPoolDialogOpen}
          selectedPoolId={pool.id}
          onSelect={(poolId) => {
            onPoolChange(poolId)
            setPoolDialogOpen(false)
          }}
          mode="borrow"
          pools={pools}
          debts={debts}
        />
      ) : null}
    </>
  )
}
