import { SchemaMarkup, buildOrganizationSchema, buildWebSiteSchema } from "@/app/components/seo/schema"
import type { Metadata } from "next"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { HomePageClient } from "@/app/components/home-page-client"

export const metadata: Metadata = buildSeoMetadata({
  title: "Avana",
  description: "Borrow against LP positions on Aave v4, lend, and multiply liquidity.",
  path: "/",
  keywords: ["Avana", "borrow LP tokens", "DeFi lending", "Aave v4"],
})

export default async function HomePage() {
  return (
    <>
      <SchemaMarkup data={[buildWebSiteSchema(), buildOrganizationSchema()]} />
      <HomePageClient />
    </>
  )
}
