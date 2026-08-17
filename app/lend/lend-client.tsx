"use client"

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { LendHero } from "./components/lend-hero"
import { useLendPageLive } from "./use-lend-page-live"
import { HotMarkets } from "./components/hot-markets"
import { LendAssetSpokes } from "./components/lend-asset-spokes"

export function LendClient({
  pageData,
  initialIsDesktop = true,
}: {
  pageData: LendPageData
  initialIsDesktop?: boolean
}) {
  const router = useRouter()
  const lendSession = useLendSessionContext()
  const livePageData = useLendPageLive(lendSession.walletId, lendSession)
  const resolvedPageData = useMemo(() => livePageData ?? pageData, [livePageData, pageData])
  const withdrawableMarketIds = useMemo(
    () =>
      new Set(
        Object.values(lendSession.state.positions)
          .filter(
            (position) =>
              position.walletId === lendSession.walletId &&
              position.status === "active" &&
              position.currentSuppliedAmount > 0,
          )
          .map((position) => position.marketId),
      ),
    [lendSession.state.positions, lendSession.walletId],
  )
  const { markets, featuredAssets, featuredSequence, featuredSnapshots, assetGroups } = resolvedPageData

  // Token prices come from the global TokenPricesProvider in ProductRuntimeProviders (seeded
  // with the live oracle on the server). A local provider here would shadow that seed with an
  // empty context and pin every price to the fixture.
  return (
    <div className="bg-background">
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-[1152px]">
            <LendHero markets={markets} />

            <div className="mt-7">
              <HotMarkets assets={featuredAssets} sequence={featuredSequence} snapshots={featuredSnapshots} />
            </div>

            <LendAssetSpokes
              groups={assetGroups}
              initialIsDesktop={initialIsDesktop}
              withdrawableMarketIds={withdrawableMarketIds}
              onDeposit={(marketId) => router.push(actionPagePath("lend", "deposit", { market: marketId }))}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
