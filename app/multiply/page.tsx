import type { Metadata } from "next"
import { SchemaMarkup, buildWebPageSchema } from "@/app/components/seo/schema"
import { MultiplyClient } from "./multiply-client"
import { fetchMultiplyPage } from "@/app/lib/data/providers/multiply"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

export const metadata: Metadata = buildSeoMetadata({
  title: "Multiply",
  description: "Multiply LP-backed positions.",
  path: "/multiply",
  keywords: ["multiply LP positions", "leveraged DeFi", "looping strategies", "Aave v4"],
})

export const dynamic = "force-dynamic"

export default async function MultiplyPage() {
  const pageData = await fetchMultiplyPage()

  return (
    <>
      <SchemaMarkup
        data={buildWebPageSchema({
          name: "Multiply",
          description: "Multiply LP-backed positions.",
          url: "https://avana.cc/multiply",
        })}
      />
      <MultiplyClient pageData={pageData} />
    </>
  )
}
