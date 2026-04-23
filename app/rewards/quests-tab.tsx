"use client"

import { useState } from "react"
import Image from "next/image"
import { Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DeferredRender } from "@/app/components/deferred-render"
import { PoolGrid } from "@/app/borrow/components/pool-grid"
import type { HomeChain } from "@/app/lib/home-data"

type QuestsTabProps = {
  chains: HomeChain[]
}

function QuestChainCard({ chain }: { chain: HomeChain }) {
  const [completedCount, setCompletedCount] = useState(chain.completed)

  const handleQuestComplete = () => {
    setCompletedCount((previous) => Math.min(previous + 1, chain.pools))
  }

  return (
    <Card className="overflow-hidden border-border bg-surface-raised shadow-elev-1 transition-colors hover:bg-surface-inset">
      <div className="space-y-3.5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative h-7 w-7 overflow-hidden rounded-xs border border-border bg-surface-inset">
              <Image src={chain.logo} alt={chain.name} fill sizes="28px" className="object-contain p-0.5" />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-foreground">{chain.name}</h3>
              <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground mt-0.5">
                <Trophy className="h-3 w-3 text-accent-primary" />
                <span className="font-data tabular-nums">{chain.rewards.points} points</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.06em] text-[10.5px]">Completion</span>
            <span className="font-data tabular-nums">
              {completedCount} of {chain.pools} quests
            </span>
          </div>
          <Progress value={(completedCount / chain.pools) * 100} className="h-1.5" aria-label={`${chain.name} quest completion progress`} />
        </div>

        <PoolGrid
          totalPools={chain.pools}
          completedPools={completedCount}
          chainId={chain.id}
          onQuestComplete={handleQuestComplete}
        />
      </div>
    </Card>
  )
}

function DeferredChainGridFallback({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={`chain-fallback-${index}`} className="overflow-hidden border-border bg-surface-raised shadow-elev-1">
          <div className="space-y-3.5 p-5">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 animate-pulse rounded-xs bg-surface-inset" />
              <div className="space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded-xs bg-surface-inset" />
                <div className="h-2.5 w-16 animate-pulse rounded-xs bg-surface-inset" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2.5 w-full animate-pulse rounded-xs bg-surface-inset" />
              <div className="h-1.5 w-full animate-pulse rounded-xs bg-surface-inset" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((__, cellIndex) => (
                <div key={`chain-cell-${index}-${cellIndex}`} className="aspect-square animate-pulse rounded-xs bg-surface-inset" />
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Default rewards tab: chain quest progress cards, with below-the-fold cards deferred. */
export function QuestsTab({ chains }: QuestsTabProps) {
  const immediatelyVisibleChains = chains.slice(0, 6)
  const deferredChains = chains.slice(6)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {immediatelyVisibleChains.map((chain) => (
          <QuestChainCard key={chain.id} chain={chain} />
        ))}
      </div>

      {deferredChains.length > 0 ? (
        <DeferredRender fallback={<DeferredChainGridFallback count={deferredChains.length} />} rootMargin="400px 0px">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {deferredChains.map((chain) => (
              <QuestChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        </DeferredRender>
      ) : null}
    </div>
  )
}
