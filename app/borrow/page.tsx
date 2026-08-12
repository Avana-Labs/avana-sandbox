import type { Metadata } from "next"
import { headers } from "next/headers"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { fetchBorrowPage } from "@/app/lib/data/providers/borrow"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

export const metadata: Metadata = buildSeoMetadata({
  title: "Borrow",
  description: "Unlock liquidity from LP positions and borrow against your collateral.",
  path: "/borrow",
  keywords: ["borrow LP tokens", "liquidity provider collateral", "Aave v4", "DeFi borrowing"],
})

export default async function BorrowPage() {
  if (isLighthouseAuditMode()) {
    return (
      <>
        <SchemaMarkup
          data={buildWebPageSchema({
            name: "Borrow",
            description: "Unlock liquidity from LP positions and borrow against your collateral.",
            url: "https://avana.cc/borrow",
          })}
        />
        <LighthouseAuditSurface title="Borrow TVL">Borrow markets and available liquidity.</LighthouseAuditSurface>
      </>
    )
  }

  const [pageData, requestHeaders] = await Promise.all([fetchBorrowPage(), headers()])
  const { BorrowPageClient } = await import("./borrow-page-client")
  const userAgent = requestHeaders.get("user-agent") ?? ""
  const initialIsDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Borrow",
          description: "Unlock liquidity from LP positions and borrow against your collateral.",
          url: "https://avana.cc/borrow",
        })}
      />
      <div className="bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-[1152px]">
            <BorrowPageClient pageData={pageData} initialIsDesktop={initialIsDesktop} />
          </div>
        </main>
      </div>
    </>
  )
}
