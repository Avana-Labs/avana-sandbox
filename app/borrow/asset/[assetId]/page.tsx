import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getAssetDetail } from "@/app/lib/borrow-detail"
import { AssetDetailClient } from "./asset-detail-client"

type PageProps = {
  params: Promise<{ assetId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { assetId } = await params
  const detail = getAssetDetail(assetId)
  if (!detail) return { title: "Asset · Avana" }
  return {
    title: `${detail.hero.symbol} · Avana Borrow`,
    description: detail.about.description,
  }
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { assetId } = await params
  const detail = getAssetDetail(assetId)
  if (!detail) notFound()
  return <AssetDetailClient detail={detail} />
}
