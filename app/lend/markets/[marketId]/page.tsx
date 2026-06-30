import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLendMarketDetail } from "@/app/lib/lend-detail"
import { getLendMarketDetailFromConvex } from "@/app/lib/lend-detail/convex-detail"
import { LendMarketDetailClientShell } from "./page-client-shell"

type PageProps = {
  params: Promise<{ marketId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marketId } = await params
  const detail = getLendMarketDetail(marketId)
  if (!detail) return { title: "Lend market · Avana" }
  return {
    title: `${detail.hero.name} · Avana Lend`,
    description: detail.about.description,
  }
}

export default async function LendMarketDetailPage({ params }: PageProps) {
  const { marketId } = await params
  const detail = await getLendMarketDetailFromConvex(marketId)
  if (!detail) notFound()
  return <LendMarketDetailClientShell detail={detail} />
}
