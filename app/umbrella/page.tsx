"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { ActionIcon } from "@/app/components/action-icon"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { detailSectionStackClass, MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { useUmbrellaSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"
import { UmbrellaActivity } from "./_detail/market-sections/UmbrellaActivity"
import { UmbrellaCooldown } from "./_detail/market-sections/UmbrellaCooldown"
import { UmbrellaHero } from "./_detail/market-sections/UmbrellaHero"
import { UmbrellaLearn } from "./_detail/market-sections/UmbrellaLearn"
import { UmbrellaPositions } from "./_detail/market-sections/UmbrellaPositions"
import { UmbrellaStress } from "./_detail/market-sections/UmbrellaStress"
import { UmbrellaSidebar } from "./_detail/sidebars/UmbrellaSidebar"

const VALID_MARKETS: readonly UmbrellaMarketId[] = ["gho", "usdc", "usdt", "weth"]

function isUmbrellaMarketId(value: string | null): value is UmbrellaMarketId {
  return value != null && (VALID_MARKETS as readonly string[]).includes(value)
}

export default function UmbrellaPage() {
  const searchParams = useSearchParams()
  const umbrella = useUmbrellaSessionContext()
  const marketParam = searchParams.get("market")
  // Fallback: if the URL didn't pick a market, choose the one this wallet actually holds
  // most of. Empty state → "usdc". Lazy state initializer runs once on mount so the
  // seed doesn't fight later user selections when positions refresh.
  const [selectedMarket, setSelectedMarket] = useState<UmbrellaMarketId>(() => {
    if (isUmbrellaMarketId(marketParam)) return marketParam
    const withValue = umbrella.marketOrder
      .map((id) => ({ id, value: umbrella.positions[id]?.valueUsd ?? 0 }))
      .sort((a, b) => b.value - a.value)
    if (withValue.length > 0 && withValue[0].value > 0) return withValue[0].id
    return "usdc"
  })

  return (
    <div className="bg-background">
      <main className="container mx-auto px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
        <div className="mx-auto max-w-[1152px]">
          <div className={detailSectionStackClass}>
            <UmbrellaHero />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
              <div className="min-w-0">
                <UmbrellaPositions onSelectMarket={setSelectedMarket} />
              </div>

              <aside className="hidden space-y-8 lg:block lg:self-start">
                <UmbrellaSidebar moduleId={selectedMarket} onMarketChange={setSelectedMarket} />
              </aside>
            </div>

            <UmbrellaCooldown />
            <UmbrellaActivity />
            <UmbrellaStress />
            <UmbrellaLearn />
          </div>

          <MobileDetailActionBar className="grid grid-cols-2 gap-3">
            <Link
              href={actionPagePath("umbrella", "unstake", { market: selectedMarket, return: "/umbrella" })}
              className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
            >
              <ActionIcon label="Unstake" />
              Unstake
            </Link>
            <Link
              href={actionPagePath("umbrella", "stake", { market: selectedMarket, return: "/umbrella" })}
              className={primaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
            >
              <ActionIcon label="Stake" />
              Stake
            </Link>
          </MobileDetailActionBar>
        </div>
      </main>
    </div>
  )
}
