"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { TokenPricesProvider } from "@/app/lib/prices/token-prices-context"
import { LendHero } from "./components/lend-hero"
import { useLendPageLive } from "./use-lend-page-live"

const HotMarkets = dynamic(() => import("./components/hot-markets").then((mod) => mod.HotMarkets), {
  loading: () => <div className="h-[228px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

const LendAssetSpokes = dynamic(() => import("./components/lend-asset-spokes").then((mod) => mod.LendAssetSpokes), {
  loading: () => <div className="mt-8 h-[640px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

export function LendClient({ pageData }: { pageData: LendPageData }) {
  const router = useRouter()
  const lendSession = useLendSessionContext()
  const livePageData = useLendPageLive(lendSession.walletId, lendSession)
  const resolvedPageData = useMemo(() => livePageData ?? pageData, [livePageData, pageData])
  const { markets, featuredAssets, featuredSequence, featuredSnapshots, assetGroups } = resolvedPageData

  return (
    <TokenPricesProvider>
      <div className="bg-background">
        <main className="py-8">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-[1152px]">
              <LendHero markets={markets} />

              <div className="mt-7">
                <HotMarkets assets={featuredAssets} sequence={featuredSequence} snapshots={featuredSnapshots} />
              </div>

              <DeferredLendAssetSpokes
                groups={assetGroups}
                onDeposit={(marketId) => router.push(actionPagePath("lend", "deposit", { market: marketId }))}
              />
            </div>
          </div>
        </main>
      </div>
    </TokenPricesProvider>
  )
}

function DeferredLendAssetSpokes({
  groups,
  onDeposit,
}: {
  groups: LendPageData["assetGroups"]
  onDeposit: (marketId: string) => void
}) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShouldMount(true)
        observer.disconnect()
      },
      { rootMargin: "320px 0px", threshold: 0 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={sectionRef} className="mt-8 min-h-[640px] [content-visibility:auto] [contain-intrinsic-size:640px]">
      {shouldMount ? <LendAssetSpokes groups={groups} onDeposit={onDeposit} /> : <div className="h-[640px] rounded-radius-md border border-border bg-surface-raised/60" />}
    </div>
  )
}
