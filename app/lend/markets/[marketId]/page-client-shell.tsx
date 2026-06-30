"use client"

import dynamic from "next/dynamic"
import type { LendMarketDetail } from "@/app/lib/lend-detail"

const LendMarketDetailClient = dynamic(
  () => import("./market-detail-client").then((mod) => mod.LendMarketDetailClient),
  { ssr: false },
)

export function LendMarketDetailClientShell({ detail }: { detail: LendMarketDetail }) {
  return <LendMarketDetailClient detail={detail} />
}
