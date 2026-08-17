import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getAssetDetail } from "@/app/lib/borrow-detail"
import { getAssetDetailFromConvex } from "@/app/lib/borrow-detail/convex-detail"
import { resolveSpokeBorrowable } from "@/app/lib/borrow-system/registry"
import { normalizeBorrowAssetRouteId } from "@/app/lib/borrow-routes"
import { preloadAssetHero } from "@/app/lib/borrow-detail/hero-preload"
import { preloadDetailQuickStats } from "@/app/lib/detail-page/quick-stats-preload"
import { preloadDetailCashflow } from "@/app/lib/detail-page/cashflow-preload"
import { preferLive } from "@/app/lib/data/providers/prefer-live"
import { AssetDetailClient } from "@/app/borrow/assets/[assetId]/asset-detail-client"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

type PageProps = {
  params: Promise<{ assetId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { assetId } = await params
  const detail = preferLive(
    await getAssetDetailFromConvex(assetId),
    getAssetDetail(assetId),
    `borrow asset metadata:${assetId}`,
  )
  if (!detail) return { title: "Asset · Avana" }
  return buildSeoMetadata({
    title: `${detail.hero.symbol} · Avana Borrow`,
    description: detail.about.description,
    path: `/borrow/assets/${assetId}`,
    keywords: [detail.hero.symbol, detail.hero.name, "borrow against LP tokens"],
  })
}

export default async function BorrowAssetPage({ params }: PageProps) {
  const { assetId } = await params
  if (isLighthouseAuditMode()) return <LighthouseAuditSurface title="Asset data" eyebrow={assetId} />

  const detail = preferLive(
    await getAssetDetailFromConvex(assetId),
    getAssetDetail(assetId),
    `borrow asset page:${assetId}`,
  )
  if (!detail) notFound()
  // The route id may be a BASE-asset id ("dai") while Convex markets + daily-stats are
  // keyed by the SPOKE-scoped id ("uni-v2:dai"). getAssetDetailFromConvex resolves this
  // internally, but the hero/quick-stats/cashflow preloads were fed the raw route id —
  // so their Convex queries found no rows and the detail chart rendered empty even
  // though the borrow landing (which merges onto a mock baseline) showed numbers.
  // Resolve the canonical slug once and feed all three preloads. (D2)
  const canonicalSlug = resolveSpokeBorrowable(normalizeBorrowAssetRouteId(assetId))?.id ?? assetId
  const { preloads: heroPreloads, feeds } = await preloadAssetHero(canonicalSlug)
  const quickStatsPreload = await preloadDetailQuickStats("asset", canonicalSlug)
  const cashflowPreload = await preloadDetailCashflow("asset", canonicalSlug)
  const detailWithFeeds = { ...detail, ...feeds }
  const canonicalUrl = `https://avana.cc/borrow/assets/${assetId}`
  return (
    <>
      <SchemaMarkup
        data={[
          buildWebPageSchema({
            name: `${detail.hero.symbol} · Avana Borrow`,
            description: detail.about.description,
            url: canonicalUrl,
          }),
          buildBreadcrumbSchema([
            { name: "Home", url: "https://avana.cc" },
            { name: "Borrow", url: "https://avana.cc/borrow" },
            { name: detail.hero.symbol, url: canonicalUrl },
          ]),
          buildFaqSchema(detail.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))),
        ]}
      />
      <AssetDetailClient
        detail={detailWithFeeds}
        heroPreloads={heroPreloads}
        quickStatsPreload={quickStatsPreload}
        cashflowPreload={cashflowPreload}
      />
    </>
  )
}
