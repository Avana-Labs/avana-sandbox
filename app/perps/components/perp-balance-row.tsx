"use client"

import { Eye, EyeOff, Plus, Minus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DeltaPill, FlashValue } from "@/app/components/ui/live"

const MOCK_BALANCE = 48_250
const MOCK_PNL_USD = 1_240.5
const MOCK_PNL_PCT = 2.6

export function PerpBalanceRow() {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <h2 className="m-0 leading-none">My perp balance</h2>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:text-foreground">
            {showBalance ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex items-baseline gap-3">
          <FlashValue
            value={showBalance ? MOCK_BALANCE : "hidden"}
            goodDirection="up"
            className="font-data text-[22px] font-medium tracking-tight md:text-[28px]"
          >
            {showBalance ? "$48,250.00" : "••••••••"}
          </FlashValue>
          {showBalance ? (
            <div className="flex items-center gap-2">
              <span className={`font-data text-[12.5px] font-medium tabular-nums ${MOCK_PNL_USD >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {MOCK_PNL_USD >= 0 ? "+" : "−"}${Math.abs(MOCK_PNL_USD).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <DeltaPill value={MOCK_PNL_PCT} format="percent" digits={2} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add funds
        </Button>
        <Button variant="secondary" className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Close positions
        </Button>
        <Button variant="secondary" className="gap-1.5">
          <Minus className="h-3.5 w-3.5" />
          Remove funds
        </Button>
      </div>
    </div>
  )
}
