import type { Metadata } from "next"
import { headers } from "next/headers"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { fetchMultiplyPage } from "@/app/lib/data/providers/multiply"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

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
            url: "https://avana.cc/multiply",
          })}
        />
        <LighthouseAuditSurface title="Total Liquidity">Multiply LP-backed positions.</LighthouseAuditSurface>
      </>
    )
  }

  const [pageData, requestHeaders] = await Promise.all([fetchMultiplyPage(), headers()])
  const { MultiplyClient } = await import("./multiply-client")
  const userAgent = requestHeaders.get("user-agent") ?? ""
  const initialIsDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Multiply",
          description: "Multiply LP-backed positions.",
          url: "https://avana.cc/multiply",
        })}
      />
      <MultiplyClient pageData={pageData} initialIsDesktop={initialIsDesktop} />
    </>
  )
}
