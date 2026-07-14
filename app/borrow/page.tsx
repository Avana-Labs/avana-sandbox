import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { BorrowPageClient } from "./borrow-page-client"
import { fetchBorrowPage } from "@/app/lib/data/providers/borrow"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const dynamic = "force-dynamic"
export const metadata: Metadata = buildSeoMetadata({
  title: "Borrow",
  description: "Unlock liquidity from LP positions and borrow against your collateral.",
  path: "/borrow",
  keywords: ["borrow LP tokens", "liquidity provider collateral", "Aave v4", "DeFi borrowing"],
})

export default async function BorrowPage() {
  const pageData = await fetchBorrowPage()

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
            <BorrowPageClient pageData={pageData} />
          </div>
        </main>
      </div>
    </>
  )
}
