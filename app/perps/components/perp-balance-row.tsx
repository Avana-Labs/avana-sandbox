import { Eye, EyeOff, Plus, Minus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function PerpBalanceRow() {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <h2>My Perp Balance</h2>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:text-foreground">
            {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="font-data text-4xl font-semibold tracking-tight">
            {showBalance ? "$48,250.00" : "••••••••"}
          </span>
          <span className="text-sm font-medium text-emerald-500">
            +$1,240.50 (2.6%)
          </span>
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
