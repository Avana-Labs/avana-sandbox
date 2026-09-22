import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getLendMarketDetail } from "@/app/lib/lend-detail"
import { applyLendPreloadedOverlays, getLendMarketDetailFromConvex } from "@/app/lib/lend-detail/convex-detail"
import { preloadLendHero } from "@/app/lib/lend-detail/hero-preload"
import { preloadDetailQuickStats } from "@/app/lib/detail-page/quick-stats-preload"
import { preloadDetailCashflow } from "@/app/lib/detail-page/cashflow-preload"
import { readPreloadedCashflow, readPreloadedQuickStats } from "@/app/lib/detail-page/apply-preloaded-overlays"
import { preferLive } from "@/app/lib/data/providers/prefer-live"
import { LendMarketDetailClientShell } from "./page-client-shell"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { SITE_URL } from "@/app/lib/site-url"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"
import { isGuestRequest } from "@/app/lib/siwe/guest-request"
import { GuestPagePlaceholder } from "@/app/components/sandbox/guest-page-placeholder"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  // Audit build has no live backend: resolve metadata statically so the description lands in the
  // initial <head> for Lighthouse instead of streaming in late.
  if (isLighthouseAuditMode())
    return buildSeoMetadata({
      title: "Lend market · Avana",
      description: "Explore lend market details, supply APY, and available liquidity on Avana.",
      path: `/lend/markets/${marketId}`,
      keywords: ["supply yield", "DeFi lend market"],
    })
  const detail = preferLive(
    // Guests get catalog metadata: the Convex detail batch is only for the signed-in page.
    (await isGuestRequest()) ? null : await getLendMarketDetailFromConvex(marketId),
    getLendMarketDetail(marketId),
    `lend market metadata:${marketId}`,
  )
  if (!detail)
    return {
      title: "Lend market · Avana",
      description: "Explore lend market details, supply APY, and available liquidity on Avana.",
    }
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
  // Guests only ever see the gate's onboarding flow; skip the Convex reads for them.
  if (await isGuestRequest()) return <GuestPagePlaceholder />

  const [detailRaw, heroBundle, quickStatsPreload, cashflowPreload] = await Promise.all([
    getLendMarketDetailFromConvex(marketId),
    preloadLendHero(marketId),
    preloadDetailQuickStats("lend", marketId),
    preloadDetailCashflow("lend", marketId),
  ])
  if (!detailRaw) notFound()
  const detail = applyLendPreloadedOverlays(detailRaw, {
    quickStats: readPreloadedQuickStats(quickStatsPreload),
    cashflow: readPreloadedCashflow(cashflowPreload),
    baselinePriceSymbol: detailRaw.hero.symbol,
  })
  const { feeds } = heroBundle
  const detailWithFeeds = { ...detail, ...feeds }
  const canonicalUrl = `${SITE_URL}/lend/markets/${marketId}`
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
            { name: "Home", url: SITE_URL },
            { name: "Lend", url: `${SITE_URL}/lend` },
            { name: detail.hero.name, url: canonicalUrl },
          ]),
          buildFaqSchema(detail.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))),
        ]}
      />
      <LendMarketDetailClientShell detail={detailWithFeeds} />
    </>
  )
}
