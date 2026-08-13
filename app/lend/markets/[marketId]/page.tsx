import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getLendMarketDetail } from "@/app/lib/lend-detail"
import { getLendMarketDetailFromConvex } from "@/app/lib/lend-detail/convex-detail"
import { preloadLendHero } from "@/app/lib/lend-detail/hero-preload"
import { preferLive } from "@/app/lib/data/providers/prefer-live"
import { LendMarketDetailClientShell } from "./page-client-shell"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  const detail = preferLive(
    await getLendMarketDetailFromConvex(marketId),
    getLendMarketDetail(marketId),
    `lend market metadata:${marketId}`,
  )
  if (!detail) return { title: "Lend market · Avana" }
  return buildSeoMetadata({
    title: `${detail.hero.name} · Avana Lend`,
    description: detail.about.description,
    path: `/lend/markets/${marketId}`,
    keywords: [detail.hero.name, "supply yield", "DeFi lend market"],
  })
}

export default async function LendMarketDetailPage({ params }: PageProps) {
  const { marketId } = await params
  if (isLighthouseAuditMode()) return <LighthouseAuditSurface title="Supply APY" eyebrow={marketId} />

  const detail = await getLendMarketDetailFromConvex(marketId)
  if (!detail) notFound()
  const { preloads: heroPreloads, feeds } = await preloadLendHero(marketId)
  const detailWithFeeds = { ...detail, ...feeds }
  const canonicalUrl = `https://avana.cc/lend/markets/${marketId}`
  return (
    <>
      <SchemaMarkup
        data={[
          buildWebPageSchema({
            name: `${detail.hero.name} · Avana Lend`,
            description: detail.about.description,
            url: canonicalUrl,
          }),
          buildBreadcrumbSchema([
            { name: "Home", url: "https://avana.cc" },
            { name: "Lend", url: "https://avana.cc/lend" },
            { name: detail.hero.name, url: canonicalUrl },
          ]),
          buildFaqSchema(detail.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))),
        ]}
      />
      <LendMarketDetailClientShell detail={detailWithFeeds} heroPreloads={heroPreloads} />
    </>
  )
}
