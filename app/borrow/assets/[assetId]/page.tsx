import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getAssetDetail } from "@/app/lib/borrow-detail"
import { getAssetDetailFromConvex } from "@/app/lib/borrow-detail/convex-detail"
import { AssetDetailClient } from "@/app/borrow/asset/[assetId]/asset-detail-client"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

type PageProps = {
  params: Promise<{ assetId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { assetId } = await params
  const detail = getAssetDetail(assetId)
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

  const detail = await getAssetDetailFromConvex(assetId)
  if (!detail) notFound()
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
      <AssetDetailClient detail={detail} />
    </>
  )
}
