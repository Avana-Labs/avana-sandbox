"use client"

import dynamic from "next/dynamic"
import { hasConvexClient } from "@/app/lib/convex/market-liquidity-provider"
import { useSiweAuth } from "@/app/lib/siwe/use-siwe-auth"
import type { SupportSubmit } from "./support-center-client"

const ConvexSupportSubmissionBridge = dynamic(
  () => import("./support-center-connected").then((mod) => mod.ConvexSupportSubmissionBridge),
  { ssr: false },
)

export function SupportCenterSubmissionBridge({ onReady }: { onReady: (submit: SupportSubmit | null) => void }) {
  const { authedWallet, isSignedIn } = useSiweAuth()
  if (!hasConvexClient || !isSignedIn || !authedWallet) return null
  return <ConvexSupportSubmissionBridge onReady={onReady} />
}
