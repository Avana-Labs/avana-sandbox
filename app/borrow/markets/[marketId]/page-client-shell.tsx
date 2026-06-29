"use client"

import dynamic from "next/dynamic"
import type { PoolDetail } from "@/app/lib/borrow-detail"

const PoolDetailClient = dynamic(
  () => import("@/app/borrow/pool/[poolId]/pool-detail-client").then((mod) => mod.PoolDetailClient),
  { ssr: false },
)

export function BorrowMarketDetailClientShell({ detail }: { detail: PoolDetail }) {
  return <PoolDetailClient detail={detail} />
}
