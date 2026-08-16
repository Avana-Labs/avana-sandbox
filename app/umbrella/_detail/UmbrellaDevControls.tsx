"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { useAvanaIdentity } from "@/app/lib/avana-session/avana-sessions-provider"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"

// Client-visible mirror of the server-side `SANDBOX_DEV_CONTROLS` env flag. The
// Convex mutations themselves still enforce the real gate via
// `assertSandboxDevControlsEnabled` — this check just decides whether we ever
// render the drawer trigger. Rendering nothing when the flag is off is the
// production-safe posture (no floating pill leaking sandbox affordances).
//
// Hard production floor: even if `NEXT_PUBLIC_SANDBOX_DEV_CONTROLS` is somehow
// "true" in a deploy build, the drawer must never render. This mirrors the
// `isProductionBuild()` floor in app/lib/test-mode.ts (which is not exported, so
// the NODE_ENV check is replicated here); every `next build` runs with
// NODE_ENV="production", so the flag can only unlock the drawer in local dev.
const IS_PRODUCTION_BUILD = process.env.NODE_ENV === "production"
const DEV_CONTROLS_ENABLED = process.env.NEXT_PUBLIC_SANDBOX_DEV_CONTROLS === "true" && !IS_PRODUCTION_BUILD

const UMBRELLA_MARKETS: readonly { id: UmbrellaMarketId; label: string }[] = [
  { id: "gho", label: "GHO" },
  { id: "usdc", label: "USDC" },
  { id: "usdt", label: "USDT" },
  { id: "weth", label: "WETH" },
]

type FeedbackTone = "success" | "error"
type Feedback = { tone: FeedbackTone; message: string } | null

const inputClass =
  "h-9 w-full rounded-radius-sm border border-border bg-surface-inset px-2 text-[12.5px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"

export function UmbrellaDevControls() {
  // The env flag is a build-time constant, so this branch is stable across
  // renders — safe under the rules of hooks. Returning here BEFORE calling
  // `useMutation` also keeps unit tests (which mount /umbrella without a
  // ConvexProvider) from crashing when the flag is off.
  if (!DEV_CONTROLS_ENABLED) return null
  return <UmbrellaDevControlsInner />
}

function UmbrellaDevControlsInner() {
  const { walletId } = useAvanaIdentity()
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const advanceCooldown = useMutation(api.sandbox.dev.advanceCooldown)
  const simulateDeficit = useMutation(api.sandbox.umbrella.simulateDeficit)
  const simulateSlash = useMutation(api.sandbox.umbrella.simulateSlash)

  const [cooldownMarket, setCooldownMarket] = useState<UmbrellaMarketId>("usdc")
  const [cooldownDays, setCooldownDays] = useState("1")
  const [cooldownPending, setCooldownPending] = useState(false)

  const [deficitMarket, setDeficitMarket] = useState<UmbrellaMarketId>("usdc")
  const [deficitUsd, setDeficitUsd] = useState("100000")
  const [deficitPending, setDeficitPending] = useState(false)

  const [slashMarket, setSlashMarket] = useState<UmbrellaMarketId>("usdc")
  const [slashPending, setSlashPending] = useState(false)

  const runAdvance = async () => {
    const days = Number.parseFloat(cooldownDays)
    if (!Number.isFinite(days) || days <= 0) {
      setFeedback({ tone: "error", message: "Enter a positive number of days." })
      return
    }
    setCooldownPending(true)
    setFeedback(null)
    try {
      const result = await advanceCooldown({
        wallet: walletId,
        marketId: cooldownMarket,
        byMs: Math.round(days * 86_400_000),
      })
      setFeedback({
        tone: "success",
        message: `Advanced ${cooldownMarket.toUpperCase()} by ${days}d (${result.advanced}ms).`,
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "advanceCooldown failed",
      })
    } finally {
      setCooldownPending(false)
    }
  }

  const runDeficit = async () => {
    const usd = Number.parseFloat(deficitUsd)
    if (!Number.isFinite(usd) || usd < 0) {
      setFeedback({ tone: "error", message: "Enter a non-negative USD amount." })
      return
    }
    setDeficitPending(true)
    setFeedback(null)
    try {
      const result = await simulateDeficit({
        wallet: walletId,
        marketId: deficitMarket,
        realizedUsd: usd,
      })
      setFeedback({
        tone: "success",
        message: `Deficit for ${result.marketId.toUpperCase()} set to $${result.currentDeficitUsd.toLocaleString()}.`,
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "simulateDeficit failed",
      })
    } finally {
      setDeficitPending(false)
    }
  }

  const runSlash = async () => {
    setSlashPending(true)
    setFeedback(null)
    try {
      const result = await simulateSlash({ wallet: walletId, marketId: slashMarket })
      setFeedback({
        tone: "success",
        message: `Slashed $${result.slashedUsd.toLocaleString()} across ${result.affected} position(s) in ${slashMarket.toUpperCase()}.`,
      })
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "simulateSlash failed",
      })
    } finally {
      setSlashPending(false)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-end px-4 sm:right-6 sm:inset-x-auto sm:px-0">
      <div className="pointer-events-auto flex w-full max-w-[360px] flex-col items-end gap-2">
        {expanded ? (
          <div
            role="dialog"
            aria-label="Sandbox dev controls"
            className="w-full rounded-radius-md border border-border bg-card p-4 text-foreground shadow-elev-2"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-foreground">Sandbox controls</div>
                <div className="text-[11px] text-muted-foreground">Dev-only. Requires SANDBOX_DEV_CONTROLS=true.</div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Collapse sandbox controls"
                className="h-7 rounded-radius-sm border border-border bg-surface-raised px-2 text-[11px] font-medium text-muted-foreground hover:bg-surface-hover"
              >
                Close
              </button>
            </div>

            <section className="space-y-2 border-t border-border pt-3">
              <div className="text-[12px] font-semibold text-foreground">Advance cooldown</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Market</span>
                  <select
                    className={inputClass}
                    value={cooldownMarket}
                    onChange={(event) => setCooldownMarket(event.target.value as UmbrellaMarketId)}
                  >
                    {UMBRELLA_MARKETS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Days</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.5"
                    value={cooldownDays}
                    onChange={(event) => setCooldownDays(event.target.value)}
                  />
                </label>
              </div>
              <Button
                variant="brand"
                size="sm"
                onClick={() => void runAdvance()}
                disabled={cooldownPending}
                className="w-full"
              >
                {cooldownPending ? "Advancing…" : "Advance"}
              </Button>
            </section>

            <section className="mt-3 space-y-2 border-t border-border pt-3">
              <div className="text-[12px] font-semibold text-foreground">Simulate deficit</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Market</span>
                  <select
                    className={inputClass}
                    value={deficitMarket}
                    onChange={(event) => setDeficitMarket(event.target.value as UmbrellaMarketId)}
                  >
                    {UMBRELLA_MARKETS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Realized USD</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="1000"
                    value={deficitUsd}
                    onChange={(event) => setDeficitUsd(event.target.value)}
                  />
                </label>
              </div>
              <Button
                variant="brand"
                size="sm"
                onClick={() => void runDeficit()}
                disabled={deficitPending}
                className="w-full"
              >
                {deficitPending ? "Applying…" : "Apply deficit"}
              </Button>
            </section>

            <section className="mt-3 space-y-2 border-t border-border pt-3">
              <div className="text-[12px] font-semibold text-foreground">Simulate slash</div>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Market</span>
                <select
                  className={inputClass}
                  value={slashMarket}
                  onChange={(event) => setSlashMarket(event.target.value as UmbrellaMarketId)}
                >
                  {UMBRELLA_MARKETS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="brand"
                size="sm"
                onClick={() => void runSlash()}
                disabled={slashPending}
                className="w-full"
              >
                {slashPending ? "Slashing…" : "Trigger slash"}
              </Button>
            </section>

            {feedback ? (
              <div
                role="status"
                className={
                  feedback.tone === "success"
                    ? "mt-3 rounded-radius-sm border border-border bg-surface-inset px-3 py-2 text-[12px] text-foreground"
                    : "mt-3 rounded-radius-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
                }
              >
                {feedback.message}
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label="Toggle sandbox dev controls"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-[12px] font-semibold text-foreground shadow-elev-1 hover:bg-surface-hover"
        >
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-brand" />
          Sandbox controls
        </button>
      </div>
    </div>
  )
}
