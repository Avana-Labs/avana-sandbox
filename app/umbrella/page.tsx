"use client"

import Link from "next/link"
import { ActionIcon } from "@/app/components/action-icon"
import { primaryCtaClass, secondaryCtaClass } from "@/app/components/action-page/action-cta"
import { detailSectionStackClass, MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import type { UmbrellaMarketId } from "@/app/lib/umbrella-system/use-umbrella-session"
import { UmbrellaActivity } from "./_detail/market-sections/UmbrellaActivity"
import { UmbrellaCooldown } from "./_detail/market-sections/UmbrellaCooldown"
import { UmbrellaHero } from "./_detail/market-sections/UmbrellaHero"
import { UmbrellaLearn } from "./_detail/market-sections/UmbrellaLearn"
import { UmbrellaPositions } from "./_detail/market-sections/UmbrellaPositions"
import { UmbrellaStress } from "./_detail/market-sections/UmbrellaStress"
import { UmbrellaSidebar } from "./_detail/sidebars/UmbrellaSidebar"

export default function UmbrellaPage() {
  const moduleId: UmbrellaMarketId = "gho"

  return (
    <div className="bg-background">
      <main className="container mx-auto px-3 py-6 pb-28 sm:px-4 md:py-10 lg:pb-10">
        <div className="mx-auto max-w-[1152px]">
          <div className={detailSectionStackClass}>
            <UmbrellaHero />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
              <div className="min-w-0">
                <UmbrellaPositions />
              </div>

              <aside className="hidden space-y-8 lg:block lg:self-start">
                <UmbrellaSidebar moduleId={moduleId} />
              </aside>
            </div>

            <UmbrellaCooldown />
            <UmbrellaActivity />
            <UmbrellaStress />
            <UmbrellaLearn />
          </div>

          <MobileDetailActionBar className="grid grid-cols-2 gap-3">
            <Link
              href={actionPagePath("umbrella", "unstake", { market: moduleId, return: "/umbrella" })}
              className={secondaryCtaClass({ size: "compact", className: "gap-2.5 font-bold [&_svg]:size-5" })}
            >
              <ActionIcon label="Unstake" />
              Unstake
            </Link>
            <Link
              href={actionPagePath("umbrella", "stake", { market: moduleId, return: "/umbrella" })}
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
