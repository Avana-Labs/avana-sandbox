"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const FAVORITE_MARKET_OPTIONS = [
  { id: "gho", label: "GHO Lend market" },
  { id: "uni-v3-bluechip-weth-usdc", label: "WETH / USDC borrow pool" },
  { id: "eth-usdt", label: "ETH / USDT multiply market" },
] as const

export function RewardsEducationDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sandbox risk primer</DialogTitle>
          <DialogDescription>60-second briefing before you simulate LP positions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>LP collateral can lose value if the pool diverges, fees drop, or leverage gets too tight.</p>
          <p>In this sandbox, every transaction is simulated — use previews to learn before sizing up.</p>
          <p>Keep health factor headroom and treat rewards as practice, not production yield.</p>
        </div>
        <DialogFooter>
          <Button
            disabled={loading}
            onClick={() => {
              setLoading(true)
              void onComplete().finally(() => {
                setLoading(false)
                onOpenChange(false)
              })
            }}
          >
            I read it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RewardsFavoriteDialog({
  open,
  onOpenChange,
  onFavorite,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFavorite: (marketId: string) => Promise<void>
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pin a sandbox market</DialogTitle>
          <DialogDescription>Choose one market to add to your watchlist.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {FAVORITE_MARKET_OPTIONS.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              disabled={loadingId != null}
              onClick={() => {
                setLoadingId(option.id)
                void onFavorite(option.id).finally(() => {
                  setLoadingId(null)
                  onOpenChange(false)
                })
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function RewardsSimulateDialog({
  open,
  onOpenChange,
  onSimulate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSimulate: (product: "borrow" | "lend" | "multiply") => Promise<void>
}) {
  const [loading, setLoading] = useState<"borrow" | "lend" | "multiply" | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview a sandbox trade</DialogTitle>
          <DialogDescription>Run a real preview in the session — nothing executes on-chain.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {(["lend", "borrow", "multiply"] as const).map((product) => (
            <Button
              key={product}
              variant="outline"
              disabled={loading != null}
              onClick={() => {
                setLoading(product)
                void onSimulate(product).finally(() => {
                  setLoading(null)
                  onOpenChange(false)
                })
              }}
            >
              Preview {product}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
