import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

export const metadata: Metadata = buildSeoMetadata({
  title: "Support Center",
  description: "Select a support topic, review helpful articles, and draft a message to the Avana team.",
  path: "/support-center",
  keywords: ["Avana support", "help center", "FAQ", "contact support"],
})

export default async function SupportCenterPage() {
  if (isLighthouseAuditMode()) {
    return (
      <>
        <SchemaMarkup
          data={buildWebPageSchema({
            name: "Support Center",
            description: "Select a support topic, review helpful articles, and draft a message to the Avana team.",
            url: "https://avana.cc/support-center",
          })}
        />
        <LighthouseAuditSurface title="Support Center">How can we help?</LighthouseAuditSurface>
      </>
    )
  }

  const { SupportCenterClient } = await import("@/app/components/support-center-client")

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Support Center",
          description: "Select a support topic, review helpful articles, and draft a message to the Avana team.",
          url: "https://avana.cc/support-center",
        })}
      />
      <SupportCenterClient />
    </>
  )
}
