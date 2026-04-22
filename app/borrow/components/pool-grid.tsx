"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { Check } from "lucide-react"
import type { Quest } from "./quest-dialog"

const QuestDialog = dynamic(() => import("./quest-dialog").then((mod) => mod.QuestDialog), {
  ssr: false,
})

interface PoolGridProps {
  totalPools: number
  completedPools: number
  chainId: string
  onQuestComplete: (questId: number) => void
}

const quests: Quest[] = [
  {
    id: 1,
    title: "Risk Taker",
    description: "Lend to a pool with an experimental token",
    points: 50,
    pool: "WBTC-USDC",
    protocol: "Uniswap v4",
    tvl: "$15M",
    usersCount: 1530,
    minLend: "$500",
    isUp: true,
    change: 2.3,
  },
  {
    id: 2,
    title: "High APY, High Reward",
    description: "Lend to a 30%+ APY pool",
    points: 100,
    pool: "ETH-USDC",
    protocol: "Uniswap v4",
    tvl: "$15M",
    usersCount: 2150,
    minLend: "$1,000",
    isUp: true,
    change: 4.5,
  },
  {
    id: 3,
    title: "Arbitrage Beginner",
    description: "Find a price difference between two pools",
    points: 50,
    pool: "DAI-USDC",
    protocol: "Uniswap v4",
    tvl: "$163M",
    usersCount: 890,
    minLend: "$250",
    isUp: false,
    change: 1.2,
  },
]

/** Quest grid that loads the detailed dialog only when a quest is opened. */
export function PoolGrid({ totalPools, completedPools, chainId, onQuestComplete }: PoolGridProps) {
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handlePoolClick = (index: number) => {
    // Get quest based on pool index
    const quest = quests[index % quests.length]
    setSelectedQuest(quest)
    setIsDialogOpen(true)
  }

  const handleQuestComplete = (questId: number) => {
    onQuestComplete(questId)
    setIsDialogOpen(false)
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: totalPools }).map((_, index) => {
          const isCompleted = index < completedPools
          return (
            <button
              key={`${chainId}-pool-${index}`}
              type="button"
              onClick={() => !isCompleted && handlePoolClick(index)}
              aria-label={
                isCompleted
                  ? `${chainId} quest ${index + 1} completed`
                  : `Open ${chainId} quest ${index + 1}`
              }
              className={`relative aspect-square overflow-hidden rounded-lg transition-transform duration-150 ${
                isCompleted
                  ? "bg-primary/10 cursor-default"
                  : "cursor-pointer bg-muted hover:scale-95 hover:bg-muted/80 active:scale-90"
              }`}
            >
              {isCompleted ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">{index + 1}</div>
              )}
            </button>
          )
        })}
      </div>

      {selectedQuest && (
        <QuestDialog
          quest={selectedQuest}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onComplete={handleQuestComplete}
        />
      )}
    </div>
  )
}
