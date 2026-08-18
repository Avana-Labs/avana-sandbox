import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getMultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { getMultiplyMarketDetailFromConvex } from "@/app/lib/multiply-detail/convex-detail"
import { preloadMultiplyHero } from "@/app/lib/multiply-detail/hero-preload"
import { preloadDetailQuickStats } from "@/app/lib/detail-page/quick-stats-preload"
import { preloadDetailCashflow } from "@/app/lib/detail-page/cashflow-preload"
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
  // Audit build has no live backend: resolve metadata statically so the description lands in the
  // initial <head> for Lighthouse instead of streaming in late.
  if (isLighthouseAuditMode())
    return buildSeoMetadata({
      title: "Multiply market · Avana",
      description: "Explore multiply market details, leverage strategies, and total value locked on Avana.",
      path: `/multiply/markets/${marketId}`,
      keywords: ["leveraged LP strategy", "multiply market"],
    })
  const detail = preferLive(
    await getMultiplyMarketDetailFromConvex(marketId),
    getMultiplyMarketDetail(marketId),
    `multiply market metadata:${marketId}`,
  )
  if (!detail)
    return { title: "Multiply market · Avana", description: "Explore multiply market details, leverage strategies, and total value locked on Avana." }
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
  const quickStatsPreload = await preloadDetailQuickStats("multiply", marketId)
  const cashflowPreload = await preloadDetailCashflow("multiply", marketId)
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
      <MultiplyMarketDetailClientShell
        detail={detailWithFeeds}
        heroPreloads={heroPreloads}
        quickStatsPreload={quickStatsPreload}
        cashflowPreload={cashflowPreload}
      />
    </>
  )
}
