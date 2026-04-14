"use client"

import { useState } from "react"
import Image from "next/image"
import { Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DeferredRender } from "@/app/components/deferred-render"
import { PoolGrid } from "@/app/explore/components/pool-grid"
import type { HomeChain } from "@/app/lib/home-data"

type HomeBorrowTabProps = {
  chains: HomeChain[]
}

function ChainCard({ chain }: { chain: HomeChain }) {
  const [completedCount, setCompletedCount] = useState(chain.completed)

  const handleQuestComplete = () => {
    setCompletedCount((previous) => Math.min(previous + 1, chain.pools))
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-card transition-colors hover:border-border">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted">
              <Image src={chain.logo} alt={chain.name} fill sizes="32px" className="object-contain p-0.5" />
            </div>
            <div>
              <h3 className="font-semibold">{chain.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4 text-primary" />
                <span>{chain.rewards.points} points</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Completion</span>
            <span>
              {completedCount} of {chain.pools} quests
            </span>
          </div>
          <Progress value={(completedCount / chain.pools) * 100} className="h-2" aria-label={`${chain.name} quest completion progress`} />
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
        <Card key={`chain-fallback-${index}`} className="overflow-hidden border-border/70 bg-card">
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((__, cellIndex) => (
                <div key={`chain-cell-${index}-${cellIndex}`} className="aspect-square animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/** Keeps the default homepage tab interactive while deferring the below-the-fold chain cards. */
export function HomeBorrowTab({ chains }: HomeBorrowTabProps) {
  const immediatelyVisibleChains = chains.slice(0, 6)
  const deferredChains = chains.slice(6)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {immediatelyVisibleChains.map((chain) => (
          <ChainCard key={chain.id} chain={chain} />
        ))}
      </div>

      {deferredChains.length > 0 ? (
        <DeferredRender fallback={<DeferredChainGridFallback count={deferredChains.length} />} rootMargin="400px 0px">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {deferredChains.map((chain) => (
              <ChainCard key={chain.id} chain={chain} />
            ))}
          </div>
        </DeferredRender>
      ) : null}
    </div>
  )
}
