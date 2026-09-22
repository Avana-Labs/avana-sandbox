import type { Metadata } from "next"
import { headers } from "next/headers"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { fetchLendPage } from "@/app/lib/data/providers/lend"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { SITE_URL } from "@/app/lib/site-url"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"
import { isGuestRequest } from "@/app/lib/siwe/guest-request"
import { GuestPagePlaceholder } from "@/app/components/sandbox/guest-page-placeholder"

export const metadata: Metadata = buildSeoMetadata({
  title: "Lend",
  description: "Supply assets to the protocol and earn yield.",
  path: "/lend",
  keywords: ["lend crypto", "supply assets", "earn yield", "DeFi lending"],
})

export default async function LendPage() {
  if (isLighthouseAuditMode()) {
    return (
      <>
        <SchemaMarkup
          data={buildWebPageSchema({
            name: "Lend",
            description: "Supply assets to the protocol and earn yield.",
            url: `${SITE_URL}/lend`,
          })}
        />
        <LighthouseAuditSurface title="Lend TVL">Lend assets and supply markets.</LighthouseAuditSurface>
      </>
    )
  }

  // Guests only ever see the gate's onboarding flow; skip the Convex reads for them.
  if (await isGuestRequest()) return <GuestPagePlaceholder />

  const [pageData, requestHeaders, { LendClient }] = await Promise.all([
    fetchLendPage(),
    headers(),
    import("./lend-client"),
  ])
  const userAgent = requestHeaders.get("user-agent") ?? ""
  const initialIsDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Lend",
          description: "Supply assets to the protocol and earn yield.",
          url: `${SITE_URL}/lend`,
        })}
      />
      <LendClient pageData={pageData} initialIsDesktop={initialIsDesktop} />
    </>
  )
}
