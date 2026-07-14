import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SchemaMarkup, buildBreadcrumbSchema, buildFaqSchema, buildWebPageSchema } from "@/app/components/seo/schema"
import { getMultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { getMultiplyMarketDetailFromConvex } from "@/app/lib/multiply-detail/convex-detail"
import { MultiplyMarketDetailClientShell } from "./page-client-shell"
import { buildSeoMetadata } from "@/app/lib/seo-metadata"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  const detail = getMultiplyMarketDetail(marketId)
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
  const detail = await getMultiplyMarketDetailFromConvex(marketId)
  if (!detail) notFound()
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
      <MultiplyMarketDetailClientShell detail={detail} />
    </>
  )
}
