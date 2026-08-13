import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getPoolDetail } from "@/app/lib/borrow-detail"
import { getPoolDetailFromConvex } from "@/app/lib/borrow-detail/convex-detail"
import { BorrowMarketDetailClientShell } from "./page-client-shell"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"
import { LighthouseAuditSurface } from "@/app/components/lighthouse-audit-surface"
import { isLighthouseAuditMode } from "@/app/lib/test-mode"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  const detail = (await getPoolDetailFromConvex(marketId)) ?? getPoolDetail(marketId)
  if (!detail) return { title: "Market · Avana" }
  return buildSeoMetadata({
    title: `${detail.hero.name} · Avana Borrow`,
    description: detail.about.description,
    path: `/borrow/markets/${marketId}`,
    keywords: [detail.hero.name, "LP collateral", "borrow against AMM positions"],
  })
}

export default async function MarketDetailPage({ params }: PageProps) {
  const { marketId } = await params
  if (isLighthouseAuditMode()) return <LighthouseAuditSurface title="Total supplied" eyebrow={marketId} />

  const detail = await getPoolDetailFromConvex(marketId)
  if (!detail) notFound()
  const canonicalUrl = `https://avana.cc/borrow/markets/${marketId}`
  return (
    <>
      <SchemaMarkup
        data={[
          buildWebPageSchema({
            name: `${detail.hero.name} · Avana Borrow`,
            description: detail.about.description,
            url: canonicalUrl,
          }),
          buildBreadcrumbSchema([
            { name: "Home", url: "https://avana.cc" },
            { name: "Borrow", url: "https://avana.cc/borrow" },
            { name: detail.hero.name, url: canonicalUrl },
          ]),
          buildFaqSchema(detail.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))),
        ]}
      />
      <BorrowMarketDetailClientShell detail={detail} />
    </>
  )
}
