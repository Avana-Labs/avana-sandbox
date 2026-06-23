"use client"

import { useEffect, useState } from "react"
import type { RewardTask, UserRewardProgress } from "@/app/lib/rewards-engine"
import type { RewardTaskActionKind } from "@/app/lib/rewards-engine/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const rewardsPrimaryButtonClass =
  "bg-brand text-brand-foreground shadow-none hover:bg-brand/90 disabled:bg-muted/60 disabled:text-muted-foreground"

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
            className={rewardsPrimaryButtonClass}
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

function referralDialogCopy(actionKind: RewardTaskActionKind) {
  switch (actionKind) {
    case "copy_referral":
      return {
        title: "Your sandbox invite link",
        description: "Copy this link and share it with friends. The quest completes once you copy it.",
        actionLabel: "Copy invite link",
      }
    case "sandbox_referral_invite":
      return {
        title: "Send a sandbox invite",
        description: "Simulate inviting a friend wallet into your Avana crew.",
        actionLabel: "Send sandbox invite",
      }
    case "sandbox_referral_activate":
      return {
        title: "Activate sandbox friends",
        description: "Each activation simulates a referred wallet completing a product action.",
        actionLabel: "Activate next friend",
      }
    case "sandbox_referral_fund":
      return {
        title: "Fund referred wallets",
        description: "Mark sandbox friends as funded after they try a product flow.",
        actionLabel: "Mark next friend funded",
      }
    default:
      return {
        title: "Referral quest",
        description: "Complete the sandbox referral step below.",
        actionLabel: "Continue",
      }
  }
}

export function RewardsReferralDialog({
  open,
  onOpenChange,
  task,
  progress,
  referralLink,
  referralCode,
  onEnsureProfile,
  onCopyLink,
  onSendInvite,
  onActivateNext,
  onMarkFunded,
  onClaim,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: RewardTask | null
  progress: UserRewardProgress | null
  referralLink: string
  referralCode: string
  onEnsureProfile: () => Promise<void>
  onCopyLink: () => Promise<void>
  onSendInvite: () => Promise<void>
  onActivateNext: () => Promise<void>
  onMarkFunded: () => Promise<void>
  onClaim: () => Promise<void>
}) {
  const [loadingAction, setLoadingAction] = useState<"profile" | "step" | "claim" | null>(null)
  const actionKind = task?.actionKind ?? "copy_referral"
  const copy = referralDialogCopy(actionKind)
  const isClaimable = progress?.status === "claimable"
  const isComplete = progress?.status === "claimed"
  const canRunStep =
    progress != null &&
    !isComplete &&
    !isClaimable &&
    (actionKind === "sandbox_referral_invite" ||
      actionKind === "sandbox_referral_activate" ||
      actionKind === "sandbox_referral_fund")

  useEffect(() => {
    if (!open) return

    setLoadingAction("profile")
    void onEnsureProfile().finally(() => setLoadingAction(null))
  }, [onEnsureProfile, open])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task?.title ?? copy.title}</DialogTitle>
          <DialogDescription>{task?.description ?? copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {actionKind === "copy_referral" ? (
            <div className="space-y-2 rounded-[12px] border border-border bg-surface-inset p-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Invite link</div>
              <div className="break-all font-data text-[12px] text-foreground">{referralLink || "Generating link..."}</div>
              <div className="text-[11px] text-muted-foreground">Code: {referralCode || "—"}</div>
            </div>
          ) : null}

          {progress ? (
            <div className="text-[12px] text-muted-foreground">
              {progress.status === "claimed"
                ? "Quest claimed."
                : progress.status === "claimable"
                  ? "Quest complete — claim your AVA below."
                  : task?.requirement.type === "aggregate_volume"
                    ? `Progress: $${Math.round(progress.progress)} / $${progress.target}`
                    : `Progress: ${Math.min(Math.round(progress.progress), progress.target)} / ${progress.target}`}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {actionKind === "copy_referral" && !isComplete ? (
            <Button
              variant="outline"
              disabled={loadingAction != null || !referralLink}
              onClick={() => {
                setLoadingAction("step")
                void onCopyLink().finally(() => setLoadingAction(null))
              }}
            >
              {loadingAction === "step" ? "Copying..." : copy.actionLabel}
            </Button>
          ) : null}

          {canRunStep ? (
            <Button
              variant="outline"
              disabled={loadingAction != null}
              onClick={() => {
                setLoadingAction("step")
                const runStep =
                  actionKind === "sandbox_referral_invite"
                    ? onSendInvite
                    : actionKind === "sandbox_referral_activate"
                      ? onActivateNext
                      : onMarkFunded
                void runStep().finally(() => setLoadingAction(null))
              }}
            >
              {loadingAction === "step" ? "Working..." : copy.actionLabel}
            </Button>
          ) : null}

          {isClaimable ? (
            <Button
              className={rewardsPrimaryButtonClass}
              disabled={loadingAction != null}
              onClick={() => {
                setLoadingAction("claim")
                void onClaim().finally(() => {
                  setLoadingAction(null)
                  onOpenChange(false)
                })
              }}
            >
              {loadingAction === "claim" ? "Claiming..." : `Claim ${task?.rewardAmount ?? 0} AVA`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
