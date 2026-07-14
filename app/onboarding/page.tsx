import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { OnboardingPageClient } from "./onboarding-page-client"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Onboarding",
  description: "Connect a wallet and claim your simulated Avana sandbox allocation.",
  path: "/onboarding",
  keywords: ["Avana onboarding", "wallet connect", "sandbox allocation", "DeFi walkthrough"],
})

export default function OnboardingPage() {
  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Onboarding",
          description: "Connect a wallet and claim your simulated Avana sandbox allocation.",
          url: "https://avana.cc/onboarding",
        })}
      />
      <OnboardingPageClient />
    </>
  )
}
