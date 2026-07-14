import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { SupportCenterClient } from "@/app/components/support-center-client"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Support Center",
  description: "Select a support topic, review helpful articles, and draft a message to the Avana team.",
  path: "/support-center",
  keywords: ["Avana support", "help center", "FAQ", "contact support"],
})

export default function SupportCenterPage() {
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
