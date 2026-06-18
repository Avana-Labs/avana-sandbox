"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { LendHero } from "./components/lend-hero"
import type { LendModalState } from "./components/lend-modals"

const HotMarkets = dynamic(() => import("./components/hot-markets").then((mod) => mod.HotMarkets), {
  loading: () => <div className="h-[228px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

const LendAssetSpokes = dynamic(() => import("./components/lend-asset-spokes").then((mod) => mod.LendAssetSpokes), {
  loading: () => <div className="mt-8 h-[640px] rounded-radius-md border border-border bg-surface-raised/60" />,
})

const LendModals = dynamic(() => import("./components/lend-modals").then((mod) => mod.LendModals), {
  ssr: false,
})

export function LendClient({ pageData }: { pageData: LendPageData }) {
  const { tokens, markets, featuredAssets, featuredSequence, assetGroups } = pageData
  const [modalState, setModalState] = useState<LendModalState>({
    isOpen: false,
    type: "deposit",
    actionType: "deposit",
    token: null,
    amount: "",
  })

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <div className="bg-background">
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-[1152px] xl:max-w-5xl 2xl:max-w-[1152px]">
            <LendHero markets={markets} />

            <div className="mt-12 space-y-8">
              <HotMarkets assets={featuredAssets} sequence={featuredSequence} />
            </div>

            <LendAssetSpokes groups={assetGroups} />
          </div>
        </div>

        <LendModals
          tokens={tokens}
          markets={markets}
          modalState={modalState}
          setModalState={setModalState}
          closeModal={closeModal} 
        />
      </main>
    </div>
  )
}
