"use client"

import dynamic from "next/dynamic"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import { GuestOnboardingFlow } from "@/app/components/sandbox/guest-onboarding-flow"

const OnboardingPageConnected = dynamic(
  () => import("./onboarding-page-connected").then((mod) => mod.OnboardingPageConnected),
  { ssr: false },
)

export function OnboardingPageClient() {
  const { t } = useTranslation()
  const { authedWallet, isSignedIn } = useSiweAuth()

  return (
    <main className="min-h-[calc(100vh-4rem)] px-5 py-6 sm:px-8">
      {!hasConvexClient ? (
        <div className="mx-auto w-full max-w-md rounded-radius-lg border border-border bg-surface p-7 text-center text-[14px] text-muted-foreground">
          {t("Sandbox onboarding requires a Convex connection. Set")} <code>NEXT_PUBLIC_CONVEX_URL</code>{" "}
          {t("to continue.")}
        </div>
      ) : isSignedIn && authedWallet ? (
        <OnboardingPageConnected wallet={authedWallet} />
      ) : (
        <GuestOnboardingFlow />
      )}
    </main>
  )
}
