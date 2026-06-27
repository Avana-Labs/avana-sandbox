"use client"

import dynamic from "next/dynamic"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"

const MarketDetailClient = dynamic(() => import("./market-detail-client").then((mod) => mod.MarketDetailClient), {
  ssr: false,
})

export function MultiplyMarketDetailClientShell({ detail }: { detail: MultiplyMarketDetail }) {
  return <MarketDetailClient detail={detail} />
}
