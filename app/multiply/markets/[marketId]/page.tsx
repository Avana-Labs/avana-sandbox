import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getMultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { getMultiplyMarketDetailFromConvex } from "@/app/lib/multiply-detail/convex-detail"
import { preloadMultiplyHero } from "@/app/lib/multiply-detail/hero-preload"
import { preferLive } from "@/app/lib/data/providers/prefer-live"
import { MultiplyMarketDetailClientShell } from "./page-client-shell"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  const detail = preferLive(
    await getMultiplyMarketDetailFromConvex(marketId),
    getMultiplyMarketDetail(marketId),
    `multiply market metadata:${marketId}`,
  )
  if (!detail) return { title: "Multiply market · Avana" }
  return buildSeoMetadata({
    title: `${detail.hero.name} · Avana Multiply`,
    description: detail.about.description,
    path: `/multiply/markets/${marketId}`,
    keywords: [detail.hero.name, "leveraged LP strategy", "multiply market"],
  })
}

export default async function MarketDetailPage({ params }: PageProps) {
  const { marketId } = await params
  if (isLighthouseAuditMode()) return <LighthouseAuditSurface title="Total value locked" eyebrow={marketId} />

  const detail = await getMultiplyMarketDetailFromConvex(marketId)
  if (!detail) notFound()
  const { preloads: heroPreloads, feeds } = await preloadMultiplyHero(marketId)
  const detailWithFeeds = { ...detail, ...feeds }
  const canonicalUrl = `https://avana.cc/multiply/markets/${marketId}`
  return (
    <>
      <SchemaMarkup
        data={[
          buildWebPageSchema({
            name: `${detail.hero.name} · Avana Multiply`,
            description: detail.about.description,
            url: canonicalUrl,
          }),
          buildBreadcrumbSchema([
            { name: "Home", url: "https://avana.cc" },
            { name: "Multiply", url: "https://avana.cc/multiply" },
            { name: detail.hero.name, url: canonicalUrl },
          ]),
          buildFaqSchema(detail.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))),
        ]}
      />
      <MultiplyMarketDetailClientShell detail={detailWithFeeds} heroPreloads={heroPreloads} />
    </>
  )
}
