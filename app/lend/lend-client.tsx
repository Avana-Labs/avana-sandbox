"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { useLendSessionContext } from "@/app/lib/lend-system/lend-session-context"
import { LendHero } from "./components/lend-hero"
import { useLendPageLive } from "./use-lend-page-live"

const HotMarkets = dynamic(() => import("./components/hot-markets").then((mod) => mod.HotMarkets), {
  loading: () => <div className="h-[228px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

const LendAssetSpokes = dynamic(() => import("./components/lend-asset-spokes").then((mod) => mod.LendAssetSpokes), {
  loading: () => <div className="mt-8 h-[640px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

const LendMarketActionDialog = dynamic(
  () => import("./components/lend-market-action-dialog").then((mod) => mod.LendMarketActionDialog),
  { ssr: false },
)

export function LendClient({ pageData }: { pageData: LendPageData }) {
  const lendSession = useLendSessionContext()
  const livePageData = useLendPageLive(lendSession.walletId, lendSession)
  const resolvedPageData = useMemo(() => livePageData ?? pageData, [livePageData, pageData])
  const { markets, featuredAssets, featuredSequence, featuredSnapshots, assetGroups } = resolvedPageData
  const [dialogState, setDialogState] = useState<{ open: boolean; marketId: string; action: "deposit" | "withdraw" }>({
    open: false,
    marketId: "eth",
    action: "deposit",
  })

  return (
    <div className="bg-background">
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
            <LendHero markets={markets} />

            <div className="mt-12 space-y-8">
              <HotMarkets assets={featuredAssets} sequence={featuredSequence} snapshots={featuredSnapshots} />
            </div>

            <LendAssetSpokes
              groups={assetGroups}
              onDeposit={(marketId) =>
                setDialogState({
                  open: true,
                  marketId,
                  action: "deposit",
                })
              }
            />
          </div>
        </div>

        <LendMarketActionDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
          marketId={dialogState.marketId}
          initialAction={dialogState.action}
        />
      </main>
    </div>
  )
}
