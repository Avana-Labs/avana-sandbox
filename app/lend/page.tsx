import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { LendClient } from "./lend-client"
import { fetchLendPage } from "@/app/lib/data/providers/lend"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Lend",
  description: "Supply assets to the protocol and earn yield.",
  path: "/lend",
  keywords: ["lend crypto", "supply assets", "earn yield", "DeFi lending"],
})

export const dynamic = "force-dynamic"

export default async function LendPage() {
  const pageData = await fetchLendPage()

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Lend",
          description: "Supply assets to the protocol and earn yield.",
          url: "https://avana.cc/lend",
        })}
      />
      <LendClient pageData={pageData} />
    </>
  )
}
