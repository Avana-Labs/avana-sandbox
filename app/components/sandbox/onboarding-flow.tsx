"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, LoaderCircle, MoveUpRight } from "lucide-react"
import { motion } from "framer-motion"
import { useMutation } from "convex/react"
import { WalletControl } from "@/app/components/wallet-control"
import { api } from "@/convex/_generated/api"
import { AVANA_EXTERNAL_LINKS } from "@/app/components/external-links"
import {
  CURRENCY_OPTIONS,
  LANGUAGE_OPTIONS,
  useOptionalDisplayPreferences,
} from "@/app/components/display-preferences"
import { useThemeOptional } from "@/app/components/theme-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"

/** Display-name cap — kept in sync with the server clamp in `savePreferences`. */
const MAX_NAME_LENGTH = 10

/**
 * Decentralized exchanges a user might bring LP liquidity from. Captured purely as a
 * research signal (where our sandbox users' real positions originate). Extend freely —
 * "Other" is the catch-all for anything not listed.
 */
const DEX_SOURCES: Array<{ id: string; label: string }> = [
  { id: "uniswap", label: "Uniswap" },
  { id: "pancakeswap", label: "PancakeSwap" },
  { id: "sushiswap", label: "SushiSwap" },
  { id: "curve", label: "Curve" },
  { id: "balancer", label: "Balancer" },
  { id: "aerodrome", label: "Aerodrome" },
  { id: "velodrome", label: "Velodrome" },
  { id: "camelot", label: "Camelot" },
  { id: "traderjoe", label: "Trader Joe" },
  { id: "other", label: "Other" },
]

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
    preferences?: {
      theme?: string
      language?: string
      currency?: string
      showDollarAmounts?: boolean
      name?: string
      dexSources?: string[]
    }
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
const shortWallet = (wallet: string) => `${wallet.slice(0, 6)}…${wallet.slice(-4)}`

const SHARE_URL = "https://app.avana.cc"
/**
 * Launch-style tweet auto-populated into the X composer. (X Web Intents can't attach an
 * image — the preview card comes from SHARE_URL's twitter:image meta, served by /og.)
 * Used only as the fallback when Convex config carries no tweetTemplate.
 */
const DEFAULT_SHARE_TEXT = [
  "Just claimed my sandbox spot at Avana.",
  "A new Aave v4 lending market built for AMM markets.",
  "Borrow against AMM LP positions, lend, and loop — all risk-free before mainnet.",
  `Try it 👉 ${SHARE_URL}`,
].join("\n")

/**
 * Build the X composer text/href from the live Convex config so the share sub-flow
 * stays in sync with server config (no drift). Falls back to the launch copy when the
 * config carries no template. The template is appended with the app URL (and @handle
 * when configured) so the shared tweet always links back and credits the account.
 */
function buildShareText(config: OnboardingGateState["config"] | null | undefined) {
  const template = config?.tweetTemplate?.trim()
  if (!template) return DEFAULT_SHARE_TEXT
  const handle = config?.xHandle?.trim()
  const mention = handle ? `\n@${handle.replace(/^@/, "")}` : ""
  return `${template}${mention}\nTry it 👉 ${SHARE_URL}`
}
const xIntentHref = (shareText: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`

// Onboarding progress (%) per phase — drives the animated rail + AnimatePresence key.
const PROGRESS: Record<string, number> = {
  intro: 10,
  connect: 25,
  personalize: 32,
  dexSources: 38,
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
  const { t } = useTranslation()
  return (
    <div className="mb-9 sm:mb-11">
      {wallet ? (
        <div className="mb-2.5 text-right text-xs text-muted-foreground">
          {t("Wallet")} <strong className="ml-1 font-medium text-foreground">{shortWallet(wallet)}</strong>
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
  const { t } = useTranslation()
  return error ? (
    <div className="mt-5 flex items-center gap-3 text-sm text-destructive">
      <span>{error}</span>
      <button className="underline underline-offset-4" onClick={() => window.location.reload()} type="button">
        {t("Retry")}
      </button>
    </div>
  ) : null
}

/**
 * Recovery footer for the loading screens. Surfaces any error, and ALWAYS offers a
 * manual continue that is not gated on a live error — so a stranded reload (spinner
 * with no active task) is never a dead end even if auto-resume didn't fire.
 */
function LoadingRecovery({ error, onResume }: { error: string | null; onResume: () => void }) {
  const { t } = useTranslation()
  return error ? (
    <ErrorMessage error={error} />
  ) : (
    <button
      className="mt-6 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      onClick={onResume}
      type="button"
    >
      {t("Taking longer than expected? Continue")}
    </button>
  )
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
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-[938px] py-4 sm:py-8">
      <StatusRow wallet={null} pct={10} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Headline muted={t(headlineMuted)} active={t(headlineActive)} size="hero" />
        <p className="mt-6 max-w-[520px] text-[15px] leading-6 text-muted-foreground">{t(note)}</p>
        <button className={`${PRIMARY} mt-9`} onClick={onRetry} type="button">
          {t("Retry")}
        </button>
      </motion.div>
    </div>
  )
}

/**
 * Persistent "you're all set" state for an ALREADY-onboarded wallet revisiting
 * /onboarding (issue #140). This is distinct from OnboardingFlow's `done` branch, which
 * is the one-time just-claimed celebration (practice funds landed, spring
 * checkmark). A returning user has no claim to make, so we show a calm completed state
 * that points them to the dashboard — never the re-runnable welcome/claim flow.
 */
export function OnboardingComplete({ pct = 100 }: { pct?: number }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-[938px] py-4 sm:py-8" data-onboarding-step="done">
      <StatusRow wallet={null} pct={pct} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-7 flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="size-6" strokeWidth={3} />
        </div>
        <Headline muted={t("You're all set.")} active={t("Your Avana sandbox is ready.")} size="hero" />
        <p className="mt-6 max-w-[520px] text-[15px] leading-6 text-muted-foreground">
          {t("You've already claimed your practice funds. Jump back into the dashboard to keep exploring.")}
        </p>
        <Link className={`${PRIMARY} mt-9`} href="/dashboard">
          {t("Open dashboard")}
        </Link>
      </motion.div>
    </div>
  )
}

const ANALYSIS_STEPS = [
  "Reading your wallet history",
  "Checking sandbox eligibility",
  "Selecting markets to fund",
  "Sizing your practice portfolio",
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
  const { t } = useTranslation()
  const [done, setDone] = useState(0)
  useEffect(() => {
    const timers = steps.map((_, i) => window.setTimeout(() => setDone(i + 1), STEP_STAGGER_MS * (i + 1)))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [steps])
  return (
    <>
      <Headline muted={muted ? t(muted) : undefined} active={t(active)} />
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
              <span className={state === "pending" ? "text-muted-foreground" : "text-foreground"}>{t(label)}</span>
            </motion.li>
          )
        })}
      </ul>
    </>
  )
}

function BasketPanel({
  busy,
  onClaim,
}: {
  busy: boolean
  onClaim: () => void
}) {
  const { t } = useTranslation()
  const buckets = [
    { label: t("Liquid assets"), detail: t("Hold & swap tokens") },
    { label: t("LP collateral"), detail: t("Borrow against LP") },
    { label: t("Lending"), detail: t("Supply to earn") },
    { label: t("Multiply"), detail: t("Leverage loops") },
  ]
  return (
    <div className="mt-8 w-full max-w-[460px]">
      <div>
        <p className="text-[13px] text-muted-foreground">{t("You'll get")}</p>
        <div className="mt-1 text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">
          {t("A full practice portfolio")}
        </div>
      </div>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {buckets.map((bucket) => (
          <li className="flex items-center justify-between py-3" key={bucket.label}>
            <span className="text-[15px] font-medium">{bucket.label}</span>
            <span className="text-sm text-muted-foreground">{bucket.detail}</span>
          </li>
        ))}
      </ul>
      <button className={`${PRIMARY} mt-7 w-full`} disabled={busy} onClick={onClaim} type="button">
        {busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
        {busy ? t("Claiming allocation…") : t("Claim your allocation")}
      </button>
    </div>
  )
}

const FIELD_LABEL = "block text-[13px] font-medium text-muted-foreground"
const FIELD_CONTROL =
  "mt-2 h-12 w-full rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground outline-none transition-colors focus:border-brand"

/**
 * Step 1 of the personalize flow — a short display name, preferred language + currency,
 * and light/dark theme. Language/currency/theme apply app-wide immediately via the shared
 * providers (so this screen itself localizes as you pick), and all four persist to Convex
 * so they follow the wallet on the next sign-in. Name is optional and capped at 10 chars.
 */
function PersonalizeStep({
  wallet,
  existing,
  onContinue,
}: {
  wallet: string
  existing: OnboardingGateState["profile"]
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const savePreferences = useMutation(api.sandbox.onboarding.savePreferences)
  const prefs = useOptionalDisplayPreferences()
  const themeCtx = useThemeOptional()
  const setTheme = themeCtx?.setTheme ?? (() => {})
  const [name, setName] = useState(existing?.preferences?.name ?? "")
  const [saving, setSaving] = useState(false)

  const language = prefs?.language ?? "EN"
  const currency = prefs?.currency ?? "USD"
  const isDark = themeCtx?.resolvedTheme === "dark"

  const submit = async () => {
    setSaving(true)
    try {
      const preferences: {
        name?: string
        language: string
        currency: string
        theme: "light" | "dark"
      } = { language, currency, theme: isDark ? "dark" : "light" }
      const trimmed = name.trim().slice(0, MAX_NAME_LENGTH)
      if (trimmed) preferences.name = trimmed
      await savePreferences({ wallet, preferences })
    } catch {
      // Best-effort: a save blip must never trap the user on this screen.
    } finally {
      setSaving(false)
      onContinue()
    }
  }

  return (
    <>
      <Headline muted={t("Wallet connected.")} active={t("Help us personalize your experience.")} />
      <div className="mt-8 flex max-w-[460px] flex-col gap-5">
        <div>
          <label className={FIELD_LABEL} htmlFor="onboarding-name">
            {t("What should we call you?")} <span className="text-muted-foreground/70">({t("optional")})</span>
          </label>
          <input
            id="onboarding-name"
            className={FIELD_CONTROL}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("Your name")}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="onboarding-language">
            {t("Preferred language")}
          </label>
          <select
            id="onboarding-language"
            className={FIELD_CONTROL}
            value={language}
            onChange={(event) => prefs?.setLanguage(event.target.value as typeof language)}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="onboarding-currency">
            {t("Preferred currency")}
          </label>
          <select
            id="onboarding-currency"
            className={FIELD_CONTROL}
            value={currency}
            onChange={(event) => prefs?.setCurrency(event.target.value as typeof currency)}
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.flag} {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={FIELD_LABEL}>{t("Appearance")}</span>
          <div className="mt-2 inline-flex rounded-full border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-full px-5 py-2 text-[14px] font-medium transition-colors ${
                isDark ? "text-muted-foreground" : "bg-foreground text-background"
              }`}
            >
              {t("Light")}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-full px-5 py-2 text-[14px] font-medium transition-colors ${
                isDark ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              {t("Dark")}
            </button>
          </div>
        </div>
      </div>
      <button className={`${PRIMARY} mt-9`} disabled={saving} onClick={submit} type="button">
        {saving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
        {t("Continue")}
      </button>
    </>
  )
}

/**
 * Step 2 of the personalize flow — a multi-select grid of DEXes the user brings LP
 * liquidity from. Persisted to `preferences.dexSources` purely as a research signal
 * (where our users' real positions originate). Optional; both selecting and skipping
 * advance to funding.
 */
function LiquiditySourceStep({
  wallet,
  existing,
  onBack,
  onContinue,
}: {
  wallet: string
  existing: OnboardingGateState["profile"]
  onBack: () => void
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const savePreferences = useMutation(api.sandbox.onboarding.savePreferences)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(existing?.preferences?.dexSources ?? []))
  const [saving, setSaving] = useState(false)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = async () => {
    setSaving(true)
    try {
      await savePreferences({ wallet, preferences: { dexSources: [...selected] } })
    } catch {
      // Best-effort: never trap the user on this screen.
    } finally {
      setSaving(false)
      onContinue()
    }
  }

  return (
    <>
      <Headline muted={t("Almost there.")} active={t("Where does your liquidity come from?")} />
      <p className="mt-4 text-[15px] text-muted-foreground">{t("Select all that apply")}</p>
      <div className="mt-7 grid max-w-[560px] grid-cols-2 gap-3 sm:grid-cols-3">
        {DEX_SOURCES.map((dex) => {
          const active = selected.has(dex.id)
          return (
            <button
              key={dex.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(dex.id)}
              className={`relative flex h-[68px] items-center justify-center rounded-2xl border px-3 text-[15px] font-medium transition-colors ${
                active
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {active ? (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              ) : null}
              {dex.label}
            </button>
          )
        })}
      </div>
      <div className="mt-9 flex items-center gap-5">
        <button className={PRIMARY} disabled={saving} onClick={submit} type="button">
          {saving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
          {t("Continue")}
        </button>
        <button
          className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={onBack}
          type="button"
        >
          {t("Back")}
        </button>
      </div>
    </>
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
  // Client-only sub-steps shown once, right after wallet connect and before the funding
  // card: personalize (name/language/currency/theme) → liquidity source (DEXes). A returning
  // wallet that already saved these skips straight to funding.
  const [prefStep, setPrefStep] = useState<"personalize" | "dexSources" | "fund">("personalize")
  const prefStepInit = useRef(false)
  const { t } = useTranslation()

  // Drive the X composer + done-state resources from the live Convex config so the
  // fetched config never drifts from what the UI shows (issue #139: config was fetched
  // but never rendered).
  const shareText = buildShareText(state?.config)
  const intentHref = xIntentHref(shareText)
  const resourcesLinks = state?.config?.resourcesLinks ?? []

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

  // Resume a loading step that persisted server-side but has no client task driving it —
  // i.e. the user reloaded (or dropped the network) mid-analysis/claim. Without this the
  // gate would render a forever spinner: `step` falls back to the persisted
  // "analyzing"/"claimPending" while `busy` is null, so no mutation ever advances it.
  const resume = () => {
    if (!wallet) return
    const persisted = state?.onboardingStep
    if (persisted === "analyzing") void run("analyzing", () => completeAnalysis({ wallet }), 4200)
    else if (persisted === "claimPending") void claimAllocation()
  }

  // Auto-resume once when we land on a stranded loading step (busy null but the persisted
  // step is a loading state). Guarded by a ref so a resume that errors doesn't hot-loop.
  const resumedFor = useRef<string | null>(null)
  useEffect(() => {
    const persisted = state?.onboardingStep
    const resumable = persisted === "analyzing" || persisted === "claimPending"
    if (!wallet || !resumable) {
      resumedFor.current = null
      return
    }
    // Preserve the guard while the resumed task is running. Clearing it when `busy`
    // becomes non-null caused every failed claim to immediately auto-resume again,
    // producing an endless beginClaim/claim loop instead of surfacing the error.
    if (busy !== null) return
    if (resumedFor.current === persisted) return
    resumedFor.current = persisted
    resume()
  }, [wallet, busy, state?.onboardingStep])

  const step = busy === "analyzing" ? "analyzing" : busy === "claiming" ? "claimPending" : state?.onboardingStep

  // Skip the personalize sub-steps for a wallet that has already saved them; otherwise show
  // them once when we first land on the "wallet" step. Init in an effect (not render) so a
  // late-resolving profile still initializes correctly.
  const savedPrefs = state?.profile?.preferences
  const prefsAlreadySet = Boolean(savedPrefs?.name || (savedPrefs?.dexSources && savedPrefs.dexSources.length > 0))
  useEffect(() => {
    if (step === "wallet" && !prefStepInit.current) {
      prefStepInit.current = true
      setPrefStep(prefsAlreadySet ? "fund" : "personalize")
    }
  }, [step, prefsAlreadySet])

  const economy = state?.economy ?? {
    status: "open" as const,
    userCount: 0,
    userCap: 0,
    perUserTargetUsd: 0,
  }
  const seatsLeft = Math.max(0, economy.userCap - economy.userCount)

  const phase =
    !wallet && !hasStarted
      ? "intro"
      : !wallet || !state
        ? "connect"
        : economy.status === "closed" && step !== "done"
          ? "closed"
          : (step ?? "connect")
  // The personalize/dexSources sub-steps live inside the "wallet" phase; surface them in the
  // progress rail + phase key so the rail advances and the screen swaps as the user moves.
  const viewPhase =
    phase === "wallet" && prefStep !== "fund" ? (prefStep === "dexSources" ? "dexSources" : "personalize") : phase
  const pct = PROGRESS[viewPhase] ?? 10

  return (
    <div
      className="mx-auto w-full max-w-[938px] py-4 sm:py-8"
      data-onboarding-step={step ?? "connect"}
      data-testid="onboarding-canvas"
    >
      <StatusRow wallet={wallet} pct={pct} />

      {/* Screen wrapper is a plain div (no framer-motion): the above-the-fold hero must
          paint from the SSR HTML and never be re-touched by JS on hydration, or LCP is
          pinned to hydration completion (~4s on throttled mobile). Step changes swap
          instantly; a CSS-only fade could be added later without an opacity:0 start. */}
      <div key={viewPhase} data-onboarding-phase={viewPhase}>
      {!wallet && !hasStarted ? (
        <>
          <Headline
            active={t("Welcome to the Avana Sandbox")}
            size="hero"
          />
          <p className="mt-6 max-w-[520px] text-[15px] leading-6 text-muted-foreground">
            {t("This risk-free Avana Sandbox lets you borrow against practice LP positions, lend, and loop strategies using sandbox funds. No real assets. No wallet signatures. Just a fast way to understand how Avana works before switching to the live app.")}
          </p>
          <ul className="mt-7 space-y-2.5">
            {["Unlimited practice funds", "No transactions to sign", "No real assets involved"].map((perk) => (
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
          <Headline muted={t("Connect a wallet.")} active={t("We'll set up your sandbox and scope it to your address.")} />
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {/* One control: connect → sign in → account, all via the ConnectKit modal. */}
            <WalletControl size="desktop" />
          </div>
          <p className="mt-8 max-w-[430px] text-[13px] leading-5 text-muted-foreground">
            {t("By connecting your wallet, you agree to the")}{" "}
            <a className="text-foreground underline underline-offset-2 hover:text-brand" href={AVANA_EXTERNAL_LINKS.terms} target="_blank" rel="noreferrer">
              {t("Terms & Conditions")}
            </a>{" "}
            {t("and")}{" "}
            <a className="text-foreground underline underline-offset-2 hover:text-brand" href={AVANA_EXTERNAL_LINKS.privacy} target="_blank" rel="noreferrer">
              {t("Privacy Policy")}
            </a>
            .
          </p>
        </>
      ) : economy.status === "closed" && step !== "done" ? (
        <>
          <Headline muted={t("This allocation round is full.")} active={t("Your wallet is on the waitlist.")} />
          <p className="mt-7 text-muted-foreground">{economy.userCount.toLocaleString()} {t("wallets onboarded.")}</p>
        </>
      ) : step === "wallet" && prefStep === "personalize" ? (
        <PersonalizeStep wallet={wallet!} existing={state.profile} onContinue={() => setPrefStep("dexSources")} />
      ) : step === "wallet" && prefStep === "dexSources" ? (
        <LiquiditySourceStep
          wallet={wallet!}
          existing={state.profile}
          onBack={() => setPrefStep("personalize")}
          onContinue={() => setPrefStep("fund")}
        />
      ) : step === "wallet" ? (
        <>
          <Headline muted={t("Wallet connected.")} active={t("Fund your sandbox to start exploring.")} />
          <p className="mt-6 max-w-lg text-[15px] leading-6 text-muted-foreground">
            {t("Every wallet gets sandbox funds to practice with, spread across markets so you can try every flow risk-free.")}
          </p>
          <button className={`${PRIMARY} mt-7`} onClick={analyze} type="button">
            {t("Fund my sandbox")}
          </button>
          <ErrorMessage error={error} />
        </>
      ) : step === "analyzing" ? (
        <>
          <ThinkingSteps muted="One moment." active="Analyzing your wallet…" steps={ANALYSIS_STEPS} />
          <LoadingRecovery error={error} onResume={resume} />
        </>
      ) : step === "eligible" ? (
        <>
          <Headline
            muted={t("You're eligible.")}
            active={t("Your practice portfolio is ready.")}
          />
          <p className="mt-6 text-sm text-muted-foreground">{seatsLeft.toLocaleString()} {t("sandbox seats remain.")}</p>
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
          <Headline muted={t("Tell your network about Avana.")} active={t("Post the prepared message on X.")} />
          <div className="mt-8 max-w-2xl whitespace-pre-line rounded-3xl border border-border p-5 text-[15px] leading-7 sm:p-7">
            {shareText}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a className={PRIMARY} href={intentHref} rel="noreferrer" target="_blank">
              {t("Open X")} <MoveUpRight className="ml-2 size-4" />
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
              {t("Skip")}
            </button>
          </div>
          <ErrorMessage error={error} />
        </>
      ) : step === "xConfirmed" ? (
        <>
          <Headline
            muted={t("Here's what you'll get.")}
            active={t("Practice funds across assets, LP collateral, lending, and multiply.")}
          />
          <BasketPanel busy={busy === "claiming"} onClaim={claimAllocation} />
          <ErrorMessage error={error} />
        </>
      ) : step === "claimPending" ? (
        <>
          <ThinkingSteps muted="Hang tight." active="Funding your sandbox…" steps={CLAIM_STEPS} />
          <LoadingRecovery error={error} onResume={resume} />
        </>
      ) : step === "waitlisted" ? (
        <>
          <Headline muted={t("The allocation cap was reached.")} active={t("Your wallet is on the waitlist.")} />
          <p className="mt-7 text-muted-foreground">{economy.userCount.toLocaleString()} {t("wallets onboarded.")}</p>
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
          <Headline muted={t("You're all set.")} active={t("Your Avana sandbox is ready to explore.")} />
          <p className="mt-4 max-w-md text-pretty text-[15px] leading-6 text-muted-foreground">
            {t("Your practice funds are now in your wallet. Jump into the dashboard to start exploring.")}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link className={PRIMARY} href="/dashboard">{t("Open dashboard")}</Link>
            <a className={SECONDARY} href={intentHref} rel="noreferrer" target="_blank">
              {t("Share on X")} <MoveUpRight className="ml-2 size-4" />
            </a>
          </div>
          {resourcesLinks.length > 0 ? (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {resourcesLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    className="inline-flex items-center text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                    href={link.href}
                  >
                    {link.label} <MoveUpRight className="ml-1 size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      </div>
    </div>
  )
}
