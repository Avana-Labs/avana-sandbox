import type { Metadata } from "next"
import { headers } from "next/headers"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { fetchMultiplyPage } from "@/app/lib/data/providers/multiply"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { SITE_URL } from "@/app/lib/site-url"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"
import { isGuestRequest } from "@/app/lib/siwe/guest-request"
import { GuestPagePlaceholder } from "@/app/components/sandbox/guest-page-placeholder"

export const metadata: Metadata = buildSeoMetadata({
  title: "Multiply",
  description: "Multiply LP-backed positions.",
  path: "/multiply",
  keywords: ["multiply LP positions", "leveraged DeFi", "looping strategies", "Aave v4"],
})

export default async function MultiplyPage() {
  if (isLighthouseAuditMode()) {
    return (
      <>
        <SchemaMarkup
          data={buildWebPageSchema({
            name: "Multiply",
            description: "Multiply LP-backed positions.",
            url: `${SITE_URL}/multiply`,
          })}
        />
        <LighthouseAuditSurface title="Multiply TVL">Multiply LP-backed positions.</LighthouseAuditSurface>
      </>
    )
  }

  // Guests only ever see the gate's onboarding flow; skip the Convex reads for them.
  if (await isGuestRequest()) return <GuestPagePlaceholder />

  const [pageData, requestHeaders, { MultiplyClient }] = await Promise.all([
    fetchMultiplyPage(),
    headers(),
    import("./multiply-client"),
  ])
  const userAgent = requestHeaders.get("user-agent") ?? ""
  const initialIsDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Multiply",
          description: "Multiply LP-backed positions.",
          url: `${SITE_URL}/multiply`,
        })}
      />
      <MultiplyClient pageData={pageData} initialIsDesktop={initialIsDesktop} />
    </>
  )
}
