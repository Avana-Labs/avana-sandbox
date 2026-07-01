"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, LoaderCircle, MoveUpRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useMutation } from "convex/react"
import { WalletControl } from "@/app/components/wallet-control"
import { api } from "@/convex/_generated/api"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
  "inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-7 text-[15px] font-semibold text-brand-foreground shadow-elev-1 transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
const SECONDARY =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-muted px-7 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted/75 disabled:opacity-50"

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))
const fmtUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
const shortWallet = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-4)}`

const SHARE_URL = "https://app.avana.cc"
/**
 * Launch-style tweet auto-populated into the X composer. (X Web Intents can't attach an
 * image — the preview card comes from SHARE_URL's twitter:image meta, served by /og.)
 */
const SHARE_TEXT = [
  "Just claimed my sandbox spot at Avana.",
  "A new Aave v4 lending market built for AMM markets.",
  "Borrow against AMM LP positions, lend, and loop — all risk-free before mainnet.",
  `Try it 👉 ${SHARE_URL}`,
].join("\n")
const X_INTENT_HREF = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}`

// Onboarding progress (%) per phase — drives the animated rail + AnimatePresence key.
const PROGRESS: Record<string, number> = {
  intro: 10,
  connect: 25,
  wallet: 45,
  analyzing: 60,
  eligible: 72,
  xPending: 78,
  xConfirmed: 88,
  claimPending: 96,
  done: 100,
  waitlisted: 100,
  closed: 100,
}

/** Full-width animated progress rail — it IS the divider (no extra border line). */
function StatusRow({ wallet, pct }: { wallet: string | null; pct: number }) {
  return (
    <div className="mb-9 sm:mb-11">
      {wallet ? (
        <div className="mb-2.5 text-right text-xs text-muted-foreground">
          Wallet <strong className="ml-1 font-medium text-foreground">{shortWallet(wallet)}</strong>
        </div>
      ) : null}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
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
          ? "max-w-[600px] text-balance text-[clamp(1.85rem,3.2vw,2.4rem)] font-medium leading-[1.14] tracking-[-0.03em]"
          : "max-w-[560px] text-balance text-[clamp(1.4rem,2.3vw,1.75rem)] font-medium leading-[1.16] tracking-[-0.03em]"
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

export function OnboardingUnavailable({
  onRetry,
  headlineMuted = "We couldn't verify your onboarding status.",
  headlineActive = "Reconnect your wallet and try again.",
  note = "Authenticated sessions stay locked until Convex confirms access.",
}: {
  onRetry: () => void
  headlineMuted?: string
  headlineActive?: string
  note?: string
}) {
  return (
    <div className="mx-auto w-full max-w-[938px] py-4 sm:py-8">
      <StatusRow wallet={null} pct={10} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Headline muted={headlineMuted} active={headlineActive} size="hero" />
        <p className="mt-6 max-w-[520px] text-[15px] leading-6 text-muted-foreground">{note}</p>
        <button className={`${PRIMARY} mt-9`} onClick={onRetry} type="button">
          Retry
        </button>
      </motion.div>
    </div>
  )
}

const ANALYSIS_STEPS = [
  "Reading your wallet history",
  "Checking sandbox eligibility",
  "Selecting markets to fund",
  "Sizing your $1M portfolio",
]
const CLAIM_STEPS = [
  "Minting your practice funds",
  "Opening LP & lending positions",
  "Building your multiply loops",
  "Finalizing your sandbox",
]
const STEP_STAGGER_MS = 950

/** Fake-but-believable staged "thinking" sequence: each check completes in turn so the
 *  moment feels earned. Timed to land just before the flow advances to the next step. */
function ThinkingSteps({ muted, active, steps }: { muted?: string; active: string; steps: string[] }) {
  const [done, setDone] = useState(0)
  useEffect(() => {
    const timers = steps.map((_, i) => window.setTimeout(() => setDone(i + 1), STEP_STAGGER_MS * (i + 1)))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [steps])
  return (
    <>
      <Headline muted={muted} active={active} />
      <ul className="mt-8 max-w-[420px] space-y-3.5">
        {steps.map((label, i) => {
          const state = i < done ? "done" : i === done ? "active" : "pending"
          return (
            <motion.li
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: state === "pending" ? 0.45 : 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.12 }}
              className="flex items-center gap-3 text-[15px]"
            >
              {state === "done" ? (
                <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 360, damping: 16 }}>
                  <Check className="size-[18px] text-emerald-500" strokeWidth={2.75} />
                </motion.span>
              ) : (
                <LoaderCircle className={`size-[18px] ${state === "active" ? "animate-spin text-brand" : "text-muted-foreground/40"}`} />
              )}
              <span className={state === "pending" ? "text-muted-foreground" : "text-foreground"}>{label}</span>
            </motion.li>
          )
        })}
      </ul>
    </>
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
    <div className="mt-8 w-full max-w-[460px]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-muted-foreground">You&apos;ll claim</p>
          <div className="mt-1 text-4xl font-semibold tracking-[-0.03em] sm:text-[44px]">{fmtUsd(amount)}</div>
        </div>
      </div>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {buckets.map((bucket) => (
          <li className="flex items-center justify-between py-3" key={bucket.label}>
            <span className="text-[15px] font-medium">{bucket.label}</span>
            <span className="flex items-baseline gap-2 text-sm text-muted-foreground">
              <span>{bucket.detail}</span>
              <span className="font-data tabular-nums text-foreground">{bucket.amount}</span>
            </span>
          </li>
        ))}
      </ul>
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
  const { t } = useTranslation()

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
          // Hold the analysis screen long enough for the step-by-step "thinking"
          // sequence to play out, so eligibility feels earned — not an instant jump.
          4200,
        )
      : undefined

  const claimAllocation = () =>
    wallet
      ? run(
          "claiming",
          async () => {
            await beginClaim({ wallet })
            // Let the staged build sequence play out BEFORE claim() flips the profile to
            // "done" — that flip unmounts onboarding (the gate opens the app), so the
            // delay must live here, not in run()'s minimumMs.
            await sleep(CLAIM_STEPS.length * STEP_STAGGER_MS + 250)
            await claim({ wallet })
          },
          0,
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

  const phase =
    !wallet && !hasStarted
      ? "intro"
      : !wallet || !state
        ? "connect"
        : economy.status === "closed" && step !== "done"
          ? "closed"
          : (step ?? "connect")
  const pct = PROGRESS[phase] ?? 10

  return (
    <div
      className="mx-auto w-full max-w-[938px] py-4 sm:py-8"
      data-onboarding-step={step ?? "connect"}
      data-testid="onboarding-canvas"
    >
      <StatusRow wallet={wallet} pct={pct} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
      {!wallet && !hasStarted ? (
        <>
          <Headline
            muted={t("Welcome to the Avana Sandbox.")}
            active={t("A risk-free space to test the app and learn how it works.")}
            size="hero"
          />
          <p className="mt-6 max-w-[520px] text-[15px] leading-6 text-muted-foreground">
            {t("Borrow against LP, lend, and loop positions with practice funds. When you're ready, switch to the real world. Have fun exploring.")}
          </p>
          <ul className="mt-7 space-y-2.5">
            {["Unlimited practice funds", "Risk-free exploration", "No real assets involved", "Fast — no transactions to sign"].map((perk) => (
              <li className="flex items-center gap-2.5 text-[15px] font-medium" key={perk}>
                <Check className="size-4 shrink-0 text-emerald-500" strokeWidth={2.75} />
                {t(perk)}
              </li>
            ))}
          </ul>
          <button className={`${PRIMARY} mt-9`} onClick={() => setHasStarted(true)} type="button">
            {t("Get started")}
          </button>
        </>
      ) : !wallet || !state ? (
        <>
          <Headline muted="Connect a wallet." active="We&apos;ll set up your sandbox and scope it to your address." />
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {/* One control: connect → sign in → account, all via the ConnectKit modal. */}
            <WalletControl size="desktop" />
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
          <Headline muted="Wallet connected." active="Fund your sandbox to start exploring." />
          <p className="mt-6 max-w-lg text-[15px] leading-6 text-muted-foreground">
            Every wallet gets $1M in practice funds, spread across markets so you can try every flow risk-free.
          </p>
          <button className={`${PRIMARY} mt-7`} onClick={analyze} type="button">
            {t("Fund my sandbox")}
          </button>
          <ErrorMessage error={error} />
        </>
      ) : step === "analyzing" ? (
        <>
          <ThinkingSteps muted="One moment." active="Analyzing your wallet…" steps={ANALYSIS_STEPS} />
          <ErrorMessage error={error} />
        </>
      ) : step === "eligible" ? (
        <>
          <Headline
            muted="You're eligible."
            active={`A ${fmtUsd(previewUsd)} practice portfolio is ready.`}
          />
          <p className="mt-6 text-sm text-muted-foreground">{seatsLeft.toLocaleString()} sandbox seats remain.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className={PRIMARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => skipTweet({ wallet }))}
              type="button"
            >
              {t("Continue to allocation")}
            </button>
            <button
              className={SECONDARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => startTweet({ wallet }))}
              type="button"
            >
              {t("Share on X first")}
            </button>
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "xPending" ? (
        <>
          <Headline muted="Tell your network about Avana." active="Post the prepared message on X." />
          <div className="mt-8 max-w-2xl whitespace-pre-line rounded-3xl border border-border p-5 text-[15px] leading-7 sm:p-7">
            {SHARE_TEXT}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a className={PRIMARY} href={X_INTENT_HREF} rel="noreferrer" target="_blank">
              Open X <MoveUpRight className="ml-2 size-4" />
            </a>
            <button
              className={SECONDARY}
              disabled={busy != null}
              onClick={() => run("sharing", () => confirmTweet({ wallet }))}
              type="button"
            >
              {t("I posted it")}
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
            muted="Here's what you'll get."
            active="$1M across assets, LP collateral, lending, and multiply."
          />
          <BasketPanel amount={previewUsd} busy={busy === "claiming"} onClaim={claimAllocation} />
          <ErrorMessage error={error} />
        </>
      ) : step === "claimPending" ? (
        <>
          <ThinkingSteps muted="Hang tight." active="Funding your sandbox…" steps={CLAIM_STEPS} />
          <ErrorMessage error={error} />
        </>
      ) : step === "waitlisted" ? (
        <>
          <Headline muted="The allocation cap was reached." active="Your wallet is on the waitlist." />
          <p className="mt-7 text-muted-foreground">{economy.userCount.toLocaleString()} wallets onboarded.</p>
        </>
      ) : step === "done" ? (
        <>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="mb-7 flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white"
          >
            <Check className="size-6" strokeWidth={3} />
          </motion.div>
          <Headline muted="You're all set." active="Your Avana sandbox is ready to explore." />
          <p className="mt-4 max-w-md text-pretty text-[15px] leading-6 text-muted-foreground">
            $1M in practice funds is now in your wallet. Jump into the dashboard to start exploring.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className={PRIMARY} href="/dashboard">{t("Open dashboard")}</Link>
            <a className={SECONDARY} href={X_INTENT_HREF} rel="noreferrer" target="_blank">
              Share on X <MoveUpRight className="ml-2 size-4" />
            </a>
          </div>
        </>
      ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
