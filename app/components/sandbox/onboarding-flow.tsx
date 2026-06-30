"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, LoaderCircle, MoveUpRight } from "lucide-react"
import { useMutation } from "convex/react"
import { ConnectKitButton } from "connectkit"
import { api } from "@/convex/_generated/api"
import { SandboxSignInButton } from "@/app/lib/siwe/sandbox-sign-in"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"

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
      <span>Set up your Avana practice account in seconds</span>
      {wallet ? (
        <span className="shrink-0">
          Wallet connected <strong className="ml-1 font-medium text-foreground">{shortWallet(wallet)}</strong>
        </span>
      ) : null}
    </div>
  )
}

function Headline({
  muted,
  active,
  size = "standard",
}: {
  muted?: string
  active: string
  size?: "standard" | "hero"
}) {
  return (
    <h1
      className={
        size === "hero"
          ? "max-w-[760px] text-[clamp(2.8rem,4.4vw,3.6rem)] font-medium leading-[1.1] tracking-[-0.045em]"
          : "max-w-[760px] text-[clamp(1.9rem,3vw,2.25rem)] font-medium leading-[0.98] tracking-[-0.045em]"
      }
    >
      {muted ? (
        <>
          <span className="text-muted-foreground">{muted}</span>
          <br />
        </>
      ) : null}
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
  const label = `${fmtUsd(amount)} PRACTICE FUNDS`
  return (
    <div className="relative left-1/2 my-10 w-screen -translate-x-1/2 overflow-hidden py-2 sm:my-11">
      <div className="flex w-max animate-[marquee_22s_linear_infinite] items-center gap-7 whitespace-nowrap text-4xl font-medium tracking-[-0.05em] sm:text-[58px]">
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
  busy,
  onClaim,
}: {
  amount: number
  busy: boolean
  onClaim: () => void
}) {
  const buckets = [
    { label: "Liquid assets", detail: "12 assets", amount: "$100K" },
    { label: "LP collateral", detail: "8 pools", amount: "$350K" },
    { label: "Lending", detail: "8 markets", amount: "$300K" },
    { label: "Multiply", detail: "6 positions", amount: "$250K" },
  ]
  return (
    <div className="mt-8 w-full max-w-[516px] rounded-[24px] bg-muted/55 p-4 sm:p-6">
      <p className="text-[13px] text-muted-foreground">Claim amount</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="text-3xl font-medium tracking-[-0.04em] sm:text-[44px]">{fmtUsd(amount)}</div>
        <span className="rounded-full bg-background px-3 py-1.5 text-sm text-muted-foreground">Max</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {buckets.map((bucket) => (
          <div className="rounded-2xl bg-background/70 p-3" key={bucket.label}>
            <div className="text-sm font-medium">{bucket.label}</div>
            <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground">
              <span>{bucket.detail}</span>
              <span>{bucket.amount}</span>
            </div>
          </div>
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
  const skipTweet = useMutation(api.sandbox.onboarding.skipTweet)
  const beginClaim = useMutation(api.sandbox.onboarding.beginClaim)
  const claim = useMutation(api.sandbox.onboarding.claim)
  const [busy, setBusy] = useState<null | "analyzing" | "sharing" | "claiming">(null)
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

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

  const claimAllocation = () =>
    wallet
      ? run(
          "claiming",
          async () => {
            await beginClaim({ wallet })
            await sleep(800)
            await claim({ wallet })
          },
          1200,
        )
      : undefined
  const step = busy === "analyzing" ? "analyzing" : busy === "claiming" ? "claimPending" : state?.onboardingStep
  const economy = state?.economy ?? {
    status: "open" as const,
    userCount: 0,
    userCap: 0,
    perUserTargetUsd: 0,
  }
  const previewUsd = 1_000_000
  const seatsLeft = Math.max(0, economy.userCap - economy.userCount)

  return (
    <div
      className="mx-auto w-full max-w-[938px] py-4 sm:py-8"
      data-onboarding-step={step ?? "connect"}
      data-testid="onboarding-canvas"
    >
      <StatusRow wallet={wallet} />

      {!wallet && !hasStarted ? (
        <>
          <Headline
            muted="Welcome to Avana."
            active="A risk-free sandbox to practice borrowing against LP, lending, and looped positions."
            size="hero"
          />
          <button className={`${PRIMARY} mt-12`} onClick={() => setHasStarted(true)} type="button">
            Get started
          </button>
          <p className="mt-12 max-w-[470px] text-[13px] leading-5 text-muted-foreground">
            You&apos;ll get a diversified practice portfolio to explore every Avana market. Nothing here uses real
            funds — it&apos;s a safe place to learn the flows before mainnet.
          </p>
        </>
      ) : !wallet || !state ? (
        <>
          <Headline muted="First, we need to analyze your wallet history." active="Connect your wallet and let us do the math." />
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
          <p className="mt-8 max-w-[430px] text-[13px] leading-5 text-muted-foreground">
            By connecting your wallet, you agree to the{" "}
            <a className="text-foreground underline underline-offset-2 hover:text-brand" href={AVANA_EXTERNAL_LINKS.terms} target="_blank" rel="noreferrer">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a className="text-foreground underline underline-offset-2 hover:text-brand" href={AVANA_EXTERNAL_LINKS.privacy} target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </p>
        </>
      ) : economy.status === "closed" && step !== "done" ? (
        <>
          <Headline muted="This allocation round is full." active="Your wallet is on the waitlist." />
          <p className="mt-7 text-muted-foreground">{economy.userCount.toLocaleString()} wallets onboarded.</p>
        </>
      ) : step === "wallet" ? (
        <>
          <Headline muted="Your wallet is connected." active="Analyze it to fund your practice portfolio." />
          <button className={`${PRIMARY} mt-9`} onClick={analyze} type="button">
            Continue
          </button>
          <p className="mt-8 max-w-lg text-sm leading-6 text-muted-foreground">
            Every wallet gets the same $1M of synthetic equity, diversified across markets so you can try every flow.
          </p>
          <ErrorMessage error={error} />
        </>
      ) : step === "analyzing" ? (
        <>
          <Headline muted="First, we need to analyze your wallet history." active="Calculating your $1M sandbox portfolio." />
          <div className="mt-9 inline-flex items-center rounded-full bg-muted px-6 py-4 text-sm">
            <LoaderCircle className="mr-3 size-5 animate-spin" />
            Still calculating — this takes a moment
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "eligible" ? (
        <>
          <AllocationMarquee amount={previewUsd} />
          <Headline
            muted={`Your wallet qualifies for a ${fmtUsd(previewUsd)} practice portfolio.`}
            active="Share Avana on X, or continue straight to your portfolio."
          />
          <p className="mt-7 text-sm text-muted-foreground">{seatsLeft.toLocaleString()} sandbox seats remain.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className={PRIMARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => startTweet({ wallet }))}
              type="button"
            >
              Share on X first
            </button>
            <button
              className={SECONDARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => skipTweet({ wallet }))}
              type="button"
            >
              Continue to allocation
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
            <button
              className={SECONDARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => skipTweet({ wallet }))}
              type="button"
            >
              Skip
            </button>
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "xConfirmed" ? (
        <>
          <Headline
            muted="Your diversified portfolio is ready."
            active="$1M across 12 assets, 8 pools, 8 lend markets, and 6 multiply positions."
          />
          <BasketPanel amount={previewUsd} busy={busy === "claiming"} onClaim={claimAllocation} />
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
            <a
              className={PRIMARY}
              href={`https://x.com/intent/post?text=${encodeURIComponent(`${state.config.tweetTemplate} @${state.config.xHandle} https://avana.cc`)}`}
              rel="noreferrer"
              target="_blank"
            >
              Share on X <MoveUpRight className="ml-2 size-4" />
            </a>
            <Link className={SECONDARY} href="/dashboard">Open dashboard</Link>
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
