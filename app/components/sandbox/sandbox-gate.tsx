"use client"

import dynamic from "next/dynamic"
import { Component, type ReactNode } from "react"
import { Header } from "@/app/components/header"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useHydrated, useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { useWalletGate } from "@/app/lib/web3/wallet-gate"
import { IS_DEV_SHORTCUT_MODE } from "@/app/lib/test-mode"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { GuestOnboardingFlow } from "./guest-onboarding-flow"
import styles from "./onboarding-flow.module.css"

const AuthedGate = dynamic(() => import("./authed-sandbox-gate").then((mod) => mod.AuthedSandboxGate), {
  ssr: false,
  loading: () => (
    <LockedShell>
      <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label="Verifying onboarding access" />
    </LockedShell>
  ),
})

class GateErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false }
  static getDerivedStateFromError() {
    return { errored: true }
  }
  render() {
    return this.state.errored ? <GateUnavailable variant="error" /> : <>{this.props.children}</>
  }
}

function LockedShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 px-5 py-6 sm:px-8">{children}</main>
    </div>
  )
}

function GateUnavailable({ variant = "error" }: { variant?: "error" | "offline" }) {
  const { t } = useTranslation()
  // A crash inside the gated app is OUR bug, not an auth problem — don't tell the
  // user to "reconnect their wallet" for a render error. Only the genuine
  // Convex-unreachable case talks about connectivity.
  const copy =
    variant === "offline"
      ? {
          headlineMuted: "We can't reach the sandbox right now.",
          headlineActive: "Please try again in a moment.",
          note: "Your session is safe. This is a temporary connection issue, not your wallet.",
        }
      : {
          headlineMuted: "Something went wrong.",
          headlineActive: "We couldn't load this page.",
          note: "This is on our side, not your wallet. Try again, and let us know if it keeps happening.",
        }
  return (
    <LockedShell>
      <div className="mx-auto w-full max-w-[938px] py-4 sm:py-8">
        <div className="mb-9 sm:mb-11">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[10%] rounded-full bg-brand" />
          </div>
        </div>
        <div className={styles.reveal}>
          <h1 className="max-w-[600px] text-balance text-[clamp(1.85rem,3.2vw,2.4rem)] font-medium leading-[1.14] tracking-[-0.03em]">
            <span className="text-muted-foreground">{t(copy.headlineMuted)}</span>
            <br />
            <span className="text-foreground">{t(copy.headlineActive)}</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-[15px] leading-6 text-muted-foreground">{t(copy.note)}</p>
          <button
            className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-7 text-[15px] font-semibold text-brand-foreground shadow-elev-1 transition-colors hover:bg-brand/90"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t("Retry")}
          </button>
        </div>
      </div>
    </LockedShell>
  )
}

/** Every wallet stays inside the gate until Convex confirms completed onboarding. */
export function SandboxGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const hydrated = useHydrated()
  const { authedWallet, isSignedIn } = useSiweAuth()
  const { active: walletActive } = useWalletGate()
  if (IS_DEV_SHORTCUT_MODE) return <>{children}</>
  if (!hasConvexClient) return <GateUnavailable variant="offline" />
  // The SIWE session is read from a client-only store that reads as signed-out on the
  // server and the first hydration render. Rendering OnboardingFlow in that window is
  // what flashed the onboarding screen at already-onboarded users on every load/refresh.
  // Hold a neutral placeholder until the client has hydrated — never onboarding.
  if (!hydrated) {
    return (
      <LockedShell>
        {/* The guest intro is SSR-safe and matches the first hydrated OnboardingFlow
            render. Showing it here lets the LCP paint from HTML instead of waiting for
            localStorage/session hydration to settle. */}
        <GuestOnboardingFlow />
      </LockedShell>
    )
  }
  // Signed-in from the persisted token, but the wallet SDK is still mounting (its chunk is
  // deferred off the critical path). Hold a neutral loading state: rendering the authed app
  // now would let action pages call wagmi hooks before the provider exists. This window is
  // brief and only affects returning users — guests never mount the SDK here.
  if (isSignedIn && !walletActive) {
    return (
      <LockedShell>
        <div className="h-2 w-40 animate-pulse rounded-full bg-muted" aria-label={t("Restoring your session")} />
      </LockedShell>
    )
  }
  if (!isSignedIn || !authedWallet) {
    return (
      <LockedShell>
        <GuestOnboardingFlow />
      </LockedShell>
    )
  }
  return (
    <GateErrorBoundary key={authedWallet}>
      <AuthedGate wallet={authedWallet}>{children}</AuthedGate>
    </GateErrorBoundary>
  )
}
