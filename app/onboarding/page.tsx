import type { Metadata } from "next"
import { OnboardingPageClient } from "./onboarding-page-client"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Connect a wallet and claim your simulated Avana sandbox allocation.",
}

export default function OnboardingPage() {
  return <OnboardingPageClient />
}
