"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { ConnectKitButton } from "connectkit"
import { api } from "@/convex/_generated/api"
import { SandboxSignInButton } from "@/app/lib/siwe/sandbox-sign-in"

/** Structural shape of `api.sandbox.onboarding.getState`'s return (the bits the UI uses). */
export type OnboardingGateState = {
  onboardingStep:
    | "wallet"
    | "analyzing"
    | "eligible"
    | "xPending"
    | "xConfirmed"
    | "claimPending"
    | "done"
    | "waitlisted"
  profile: { eligibilityTier?: number; allocatedUsd?: number; tweetUrl?: string } | null
  economy: { status: "open" | "closed"; userCount: number; userCap: number; perUserTargetUsd: number }
}

const PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-[15px] font-medium text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-60"
const GHOST =
  "inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-inset disabled:opacity-60"

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-7 shadow-sm">
      <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-6 flex flex-col gap-3">{children}</div>
    </div>
  )
}

/**
 * The onboarding step machine, mapped 1:1 onto getState().onboardingStep. The
 * persisted steps come from the mutations; `analyzing` / `claimPending` are shown as
 * client-transient spinners while the corresponding mutation is in flight. The query
 * lives in the parent (SandboxGate / the /onboarding page) and is passed in as `state`,
 * so this component advances reactively when a mutation lands.
 */
export function OnboardingFlow({ wallet, state }: { wallet: string | null; state: OnboardingGateState | null }) {
  const startAnalysis = useMutation(api.sandbox.onboarding.startAnalysis)
  const startTweet = useMutation(api.sandbox.onboarding.startTweet)
  const confirmTweet = useMutation(api.sandbox.onboarding.confirmTweet)
  const claim = useMutation(api.sandbox.onboarding.claim)
  const [busy, setBusy] = useState<null | "analyzing" | "sharing" | "claiming">(null)
  const [error, setError] = useState<string | null>(null)
  const [xHandle, setXHandle] = useState("")
  const [tweetUrl, setTweetUrl] = useState("")

  const run = async (label: "analyzing" | "sharing" | "claiming", fn: () => Promise<unknown>) => {
    setBusy(label)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(null)
    }
  }

  // Connected-but-not-signed-in (or no wallet): show the connect + sign-in funnel.
  if (!wallet || !state) {
    return (
      <Shell title="Enter the Avana sandbox" subtitle="Connect a wallet and sign in to claim your simulated allocation.">
        <ConnectKitButton.Custom>
          {({ show, isConnected, truncatedAddress, ensName }) => (
            <button type="button" onClick={show} className={PRIMARY}>
              {isConnected ? (ensName ?? truncatedAddress ?? "Wallet connected") : "Connect wallet"}
            </button>
          )}
        </ConnectKitButton.Custom>
        <SandboxSignInButton size="desktop" />
      </Shell>
    )
  }

  const { onboardingStep: step, economy } = state
  const tier = state.profile?.eligibilityTier
  const previewUsd = tier != null ? economy.perUserTargetUsd * tier : null
  const seatsLeft = Math.max(0, economy.userCap - economy.userCount)

  if (economy.status === "closed" && step !== "done") {
    return (
      <Shell title="The sandbox is full" subtitle="The simulated allocation cap has been reached. You've been added to the waitlist.">
        <p className="text-[13px] text-muted-foreground">{economy.userCount.toLocaleString()} wallets onboarded.</p>
      </Shell>
    )
  }

  switch (step) {
    case "wallet":
    case "analyzing":
      return (
        <Shell title="Check your eligibility" subtitle="We derive a deterministic eligibility tier from your wallet to size your simulated allocation.">
          <button type="button" disabled={busy != null} className={PRIMARY} onClick={() => run("analyzing", () => startAnalysis({ wallet }))}>
            {busy === "analyzing" ? "Analyzing…" : "Analyze eligibility"}
          </button>
          {error ? <p className="text-[13px] text-red-500">{error}</p> : null}
        </Shell>
      )

    case "eligible":
      return (
        <Shell
          title="You're eligible"
          subtitle={previewUsd != null ? `Your simulated allocation is about ${fmtUsd(previewUsd)}.` : "You're eligible for a simulated allocation."}
        >
          <p className="text-[13px] text-muted-foreground">{seatsLeft.toLocaleString()} sandbox seats remaining.</p>
          <button type="button" disabled={busy != null} className={PRIMARY} onClick={() => run("claiming", () => claim({ wallet }))}>
            {busy === "claiming" ? "Claiming…" : "Claim allocation"}
          </button>
          <button type="button" disabled={busy != null} className={GHOST} onClick={() => run("sharing", () => startTweet({ wallet }))}>
            Share on X first (optional)
          </button>
          {error ? <p className="text-[13px] text-red-500">{error}</p> : null}
        </Shell>
      )

    case "xPending":
      return (
        <Shell title="Share to boost your allocation" subtitle="Post about Avana, then confirm below. This is a sandbox attestation — no verification.">
          <input
            value={xHandle}
            onChange={(e) => setXHandle(e.target.value)}
            placeholder="@yourhandle"
            className="h-11 rounded-full border border-border bg-surface-inset px-4 text-[15px] text-foreground outline-none focus:border-brand"
          />
          <input
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            placeholder="https://x.com/…/status/…"
            className="h-11 rounded-full border border-border bg-surface-inset px-4 text-[15px] text-foreground outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={busy != null}
            className={PRIMARY}
            onClick={() =>
              run("sharing", () =>
                confirmTweet({ wallet, xHandle: xHandle || undefined, tweetUrl: tweetUrl || undefined }),
              )
            }
          >
            {busy === "sharing" ? "Confirming…" : "Confirm post"}
          </button>
          <button type="button" disabled={busy != null} className={GHOST} onClick={() => run("claiming", () => claim({ wallet }))}>
            Skip & claim
          </button>
          {error ? <p className="text-[13px] text-red-500">{error}</p> : null}
        </Shell>
      )

    case "xConfirmed":
      return (
        <Shell title="Thanks for sharing" subtitle={previewUsd != null ? `Claim your simulated allocation of about ${fmtUsd(previewUsd)}.` : "Claim your simulated allocation."}>
          <button type="button" disabled={busy != null} className={PRIMARY} onClick={() => run("claiming", () => claim({ wallet }))}>
            {busy === "claiming" ? "Claiming…" : "Claim allocation"}
          </button>
          {error ? <p className="text-[13px] text-red-500">{error}</p> : null}
        </Shell>
      )

    case "claimPending":
      return <Shell title="Finalizing your claim…" subtitle="Allocating your starter basket." children={<span className="text-[13px] text-muted-foreground">One moment…</span>} />

    case "waitlisted":
      return (
        <Shell title="You're on the waitlist" subtitle="The simulated allocation cap was reached before your claim. We'll open more seats soon.">
          <p className="text-[13px] text-muted-foreground">{economy.userCount.toLocaleString()} wallets onboarded.</p>
        </Shell>
      )

    case "done":
      return (
        <Shell title="You're in" subtitle={state.profile?.allocatedUsd ? `Allocated ${fmtUsd(state.profile.allocatedUsd)} to your sandbox.` : "Your sandbox is ready."}>
          <a href="/dashboard" className={PRIMARY}>
            Go to dashboard
          </a>
        </Shell>
      )

    default:
      return null
  }
}
