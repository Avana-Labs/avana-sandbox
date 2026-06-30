"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, LoaderCircle, MoveUpRight } from "lucide-react"
import { useMutation } from "convex/react"
import { ConnectKitButton } from "connectkit"
import { api } from "@/convex/_generated/api"
import { SandboxSignInButton } from "@/app/lib/siwe/sandbox-sign-in"

type BasketSlot = { tokenId: string; weight: number }
type BasketClaim = { tokenId: string; amount: number; priceUsdAtClaim: number }

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
  profile: {
    eligibilityTier?: number
    allocatedUsd?: number
    basketSnapshot?: BasketClaim[]
    tweetUrl?: string
    claimTxSynthetic?: string
  } | null
  config: {
    basket: BasketSlot[]
    tweetTemplate: string
    xHandle: string
    resourcesLinks: Array<{ label: string; href: string }>
  }
  economy: { status: "open" | "closed"; userCount: number; userCap: number; perUserTargetUsd: number }
}

const PRIMARY =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-7 text-[15px] font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
const SECONDARY =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-muted px-7 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted/75 disabled:opacity-50"

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))
const fmtUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
const shortWallet = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-4)}`

function StatusRow({ wallet }: { wallet: string | null }) {
  return (
    <div className="mb-10 flex min-h-12 items-center justify-between gap-4 border-b border-border pb-4 text-xs text-muted-foreground sm:mb-12 sm:text-sm">
      <span>Claim your Avana sandbox allocation in seconds</span>
      {wallet ? (
        <span className="shrink-0">
          Wallet connected <strong className="ml-1 font-medium text-foreground">{shortWallet(wallet)}</strong>
        </span>
      ) : null}
    </div>
  )
}

function Headline({ muted, active }: { muted: string; active: string }) {
  return (
    <h1 className="max-w-4xl text-[clamp(2.15rem,5vw,4.65rem)] font-medium leading-[0.98] tracking-[-0.055em]">
      <span className="text-muted-foreground">{muted}</span>
      <br />
      <span className="text-foreground">{active}</span>
    </h1>
  )
}

function ErrorMessage({ error }: { error: string | null }) {
  return error ? (
    <div className="mt-5 flex items-center gap-3 text-sm text-destructive">
      <span>{error}</span>
      <button className="underline underline-offset-4" onClick={() => window.location.reload()} type="button">
        Retry
      </button>
    </div>
  ) : null
}

function AllocationMarquee({ amount }: { amount: number }) {
  const label = `${fmtUsd(amount)} sandbox USD`
  return (
    <div className="relative left-1/2 my-10 w-screen -translate-x-1/2 overflow-hidden border-y border-border py-4 sm:my-12">
      <div className="flex w-max animate-[marquee_22s_linear_infinite] items-center gap-7 whitespace-nowrap text-4xl font-medium tracking-[-0.05em] sm:text-6xl">
        {[0, 1, 2, 3].map((item) => (
          <span className="flex items-center gap-7" key={item}>
            <span className="flex size-10 items-center justify-center rounded-full bg-brand text-xl text-brand-foreground sm:size-12">
              A
            </span>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function BasketPanel({
  amount,
  basket,
  busy,
  onClaim,
}: {
  amount: number
  basket: BasketSlot[]
  busy: boolean
  onClaim: () => void
}) {
  return (
    <div className="mt-8 w-full max-w-xl rounded-3xl bg-muted/55 p-5 sm:p-7">
      <p className="text-sm text-muted-foreground">Claim amount</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="text-3xl font-medium tracking-[-0.04em] sm:text-5xl">{fmtUsd(amount)}</div>
        <span className="rounded-full bg-background px-3 py-1.5 text-sm text-muted-foreground">Max</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {basket.map((slot) => (
          <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs uppercase" key={slot.tokenId}>
            {slot.tokenId} {Math.round(slot.weight * 100)}%
          </span>
        ))}
      </div>
      <button className={`${PRIMARY} mt-7 w-full`} disabled={busy} onClick={onClaim} type="button">
        {busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
        {busy ? "Claiming allocation…" : "Claim your allocation"}
      </button>
    </div>
  )
}

export function OnboardingFlow({ wallet, state }: { wallet: string | null; state: OnboardingGateState | null }) {
  const beginAnalysis = useMutation(api.sandbox.onboarding.beginAnalysis)
  const completeAnalysis = useMutation(api.sandbox.onboarding.startAnalysis)
  const startTweet = useMutation(api.sandbox.onboarding.startTweet)
  const confirmTweet = useMutation(api.sandbox.onboarding.confirmTweet)
  const claim = useMutation(api.sandbox.onboarding.claim)
  const [busy, setBusy] = useState<null | "analyzing" | "sharing" | "claiming">(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (label: NonNullable<typeof busy>, task: () => Promise<unknown>, minimumMs = 0) => {
    setBusy(label)
    setError(null)
    try {
      await Promise.all([task(), sleep(minimumMs)])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.")
    } finally {
      setBusy(null)
    }
  }

  const analyze = () =>
    wallet
      ? run(
          "analyzing",
          async () => {
            await beginAnalysis({ wallet })
            await sleep(900)
            await completeAnalysis({ wallet })
          },
          1400,
        )
      : undefined

  const claimAllocation = () => (wallet ? run("claiming", () => claim({ wallet }), 1200) : undefined)
  const step = busy === "analyzing" ? "analyzing" : busy === "claiming" ? "claimPending" : state?.onboardingStep
  const economy = state?.economy ?? {
    status: "open" as const,
    userCount: 0,
    userCap: 0,
    perUserTargetUsd: 0,
  }
  const tier = state?.profile?.eligibilityTier
  const previewUsd = tier != null ? economy.perUserTargetUsd * tier : economy.perUserTargetUsd
  const seatsLeft = Math.max(0, economy.userCap - economy.userCount)

  return (
    <div className="mx-auto w-full max-w-[1152px] px-1 py-4 sm:px-5 sm:py-8">
      <StatusRow wallet={wallet} />

      {!wallet || !state ? (
        <>
          <Headline muted="First, connect your wallet." active="Then sign in to enter the sandbox." />
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ConnectKitButton.Custom>
              {({ show, isConnected, truncatedAddress, ensName }) => (
                <button className={PRIMARY} onClick={show} type="button">
                  {isConnected ? (ensName ?? truncatedAddress ?? "Wallet connected") : "Connect wallet"}
                </button>
              )}
            </ConnectKitButton.Custom>
            <SandboxSignInButton size="desktop" />
          </div>
        </>
      ) : economy.status === "closed" && step !== "done" ? (
        <>
          <Headline muted="This allocation round is full." active="Your wallet is on the waitlist." />
          <p className="mt-7 text-muted-foreground">{economy.userCount.toLocaleString()} wallets onboarded.</p>
        </>
      ) : step === "wallet" ? (
        <>
          <Headline muted="Secure your sandbox liquidity." active="Claim an Avana starter allocation." />
          <button className={`${PRIMARY} mt-9`} onClick={analyze} type="button">
            Proceed
          </button>
          <p className="mt-8 max-w-lg text-sm leading-6 text-muted-foreground">
            We use a deterministic wallet score to size synthetic assets for borrowing, lending, and multiply flows.
          </p>
          <ErrorMessage error={error} />
        </>
      ) : step === "analyzing" ? (
        <>
          <Headline muted="We’re analyzing your wallet history." active="Calculating your sandbox allocation." />
          <div className="mt-9 inline-flex items-center rounded-full bg-muted px-6 py-4 text-sm">
            <LoaderCircle className="mr-3 size-5 animate-spin" />
            Still calculating — this takes a moment
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "eligible" ? (
        <>
          <AllocationMarquee amount={previewUsd} />
          <Headline muted={`Your wallet qualifies for ${fmtUsd(previewUsd)}.`} active="Claim now or share Avana on X first." />
          <p className="mt-7 text-sm text-muted-foreground">{seatsLeft.toLocaleString()} sandbox seats remain.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className={PRIMARY} disabled={busy != null} onClick={claimAllocation} type="button">
              Claim allocation
            </button>
            <button
              className={SECONDARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => startTweet({ wallet }))}
              type="button"
            >
              Share on X
            </button>
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "xPending" ? (
        <>
          <Headline muted="Tell your network about Avana." active="Post the prepared message on X." />
          <div className="mt-8 max-w-2xl rounded-3xl border border-border p-5 text-base leading-7 sm:p-7">
            {state.config.tweetTemplate}
            <span className="ml-1 text-brand">@{state.config.xHandle}</span>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              className={PRIMARY}
              href={`https://x.com/intent/post?text=${encodeURIComponent(`${state.config.tweetTemplate} @${state.config.xHandle}`)}`}
              rel="noreferrer"
              target="_blank"
            >
              Open X <MoveUpRight className="ml-2 size-4" />
            </a>
            <button
              className={SECONDARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => confirmTweet({ wallet }))}
              type="button"
            >
              I posted it
            </button>
            <button className={SECONDARY} disabled={busy != null} onClick={claimAllocation} type="button">
              Skip
            </button>
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "xConfirmed" ? (
        <>
          <Headline muted="Thanks for sharing Avana." active="Your allocation is ready to claim." />
          <BasketPanel amount={previewUsd} basket={state.config.basket} busy={busy === "claiming"} onClaim={claimAllocation} />
          <ErrorMessage error={error} />
        </>
      ) : step === "claimPending" ? (
        <>
          <Headline muted="Your claim is being finalized." active="Building your starter token basket." />
          <div className="mt-9 inline-flex items-center rounded-full bg-muted px-6 py-4 text-sm">
            <LoaderCircle className="mr-3 size-5 animate-spin" />
            Writing the transaction to your sandbox
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "waitlisted" ? (
        <>
          <Headline muted="The allocation cap was reached." active="Your wallet is on the waitlist." />
          <p className="mt-7 text-muted-foreground">{economy.userCount.toLocaleString()} wallets onboarded.</p>
        </>
      ) : step === "done" ? (
        <>
          <div className="mb-7 flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-6" />
          </div>
          <Headline
            muted={`You claimed ${fmtUsd(state.profile?.allocatedUsd ?? 0)}.`}
            active="Your Avana sandbox is ready."
          />
          {state.profile?.claimTxSynthetic ? (
            <div className="mt-8 max-w-2xl rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Synthetic transaction receipt</p>
              <p className="mt-2 break-all font-mono text-sm">{state.profile.claimTxSynthetic}</p>
            </div>
          ) : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className={PRIMARY} href="/dashboard">
              Open dashboard
            </Link>
            {state.profile?.claimTxSynthetic ? (
              <Link className={SECONDARY} href={`/sandbox/transactions/${encodeURIComponent(state.profile.claimTxSynthetic)}`}>
                View transaction
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
