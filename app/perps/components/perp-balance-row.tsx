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
        <div className="flex items-center gap-2 text-[12px] font-medium tracking-tight text-muted-foreground">
          <h2 className="m-0 leading-none">My Perp Balance</h2>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:text-foreground">
            {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-baseline gap-3">
          <FlashValue
            value={showBalance ? MOCK_BALANCE : "hidden"}
            goodDirection="up"
            className="font-data text-[1.45rem] font-semibold tracking-tight md:text-[1.8rem]"
          >
            {showBalance ? "$48,250.00" : "••••••••"}
          </FlashValue>
          {showBalance ? (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${MOCK_PNL_USD >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {MOCK_PNL_USD >= 0 ? "+" : "−"}${Math.abs(MOCK_PNL_USD).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <DeltaPill value={MOCK_PNL_PCT} format="percent" digits={2} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Funds
        </Button>
        <Button variant="secondary" className="gap-2 rounded-full">
          <X className="h-4 w-4" />
          Close Positions
        </Button>
        <Button variant="secondary" className="gap-2 rounded-full">
          <Minus className="h-4 w-4" />
          Remove Funds
        </Button>
      </div>
    </div>
  )
}
