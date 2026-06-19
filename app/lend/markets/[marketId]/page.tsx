import { LendMarketDetailClient } from "./market-detail-client"
import { getLendMarketById } from "@/app/lib/lend-system/catalog"
import { notFound } from "next/navigation"

export default async function LendMarketDetailPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params
  const market = getLendMarketById(marketId)
  if (!market) notFound()

  return <LendMarketDetailClient marketId={market.marketId} />
}
