import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPoolDetail } from "@/app/lib/borrow-detail"
import { getPoolDetailFromConvex } from "@/app/lib/borrow-detail/convex-detail"
import { BorrowMarketDetailClientShell } from "./page-client-shell"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  const detail = getPoolDetail(marketId)
  if (!detail) return { title: "Market · Avana" }
  return {
    title: `${detail.hero.name} · Avana Borrow`,
    description: detail.about.description,
  }
}

export default async function MarketDetailPage({ params }: PageProps) {
  const { marketId } = await params
  const detail = await getPoolDetailFromConvex(marketId)
  if (!detail) notFound()
  return <BorrowMarketDetailClientShell detail={detail} />
}
