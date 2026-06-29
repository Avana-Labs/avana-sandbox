import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getMultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { MultiplyMarketDetailClientShell } from "./page-client-shell"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  const detail = getMultiplyMarketDetail(marketId)
  if (!detail) return { title: "Multiply market · Avana" }
  return {
    title: `${detail.hero.name} · Avana Multiply`,
    description: detail.about.description,
  }
}

export default async function MarketDetailPage({ params }: PageProps) {
  const { marketId } = await params
  const detail = getMultiplyMarketDetail(marketId)
  if (!detail) notFound()
  return <MultiplyMarketDetailClientShell detail={detail} />
}
