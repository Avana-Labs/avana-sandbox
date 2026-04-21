"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowRight, Wallet, Users } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { EnhancedGraph } from "../components/enhanced-graph"

export interface Quest {
  id: number
  title: string
  description: string
  points: number
  pool: string
  tvl: string
  isCompleted?: boolean
  usersCount?: number
  minInvestment?: string
  isUp?: boolean
  change?: number
  protocol?: string
}

interface QuestDialogProps {
  quest: Quest
  isOpen: boolean
  onClose: () => void
  onComplete: (questId: number) => void
}

export function QuestDialog({ quest, isOpen, onClose, onComplete }: QuestDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative p-6 bg-gradient-to-b from-primary/10 via-primary/5 to-background">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">{quest.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 text-muted-foreground">{quest.description}</div>
        </div>

        {/* Pool Performance Graph */}
        <div className="px-6 pb-2">
          <div className="h-[100px] -mt-4">
            <EnhancedGraph
              isPositive={quest.isUp ?? true}
              points={24}
              height={100}
              className="scale-110 origin-bottom"
            />
          </div>
        </div>

        {/* Quest Details */}
        <div className="p-6 space-y-6">
          {/* Pool Information */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Protocol</p>
              <p className="font-medium">{quest.protocol || "Uniswap v4"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">TVL</p>
              <p className="font-data font-medium">{quest.tvl}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Users</p>
              <p className="font-data font-medium flex items-center justify-center gap-1">
                <Users className="h-3 w-3" />
                {quest.usersCount?.toLocaleString() || "1,530"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Rewards Section with Pool Name */}
          <div className="grid grid-cols-3 items-center">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Reward</p>
                <p className="font-data font-medium">{quest.points} points</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pool</p>
              <p className="font-medium">{quest.pool}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Min Investment</p>
              <p className="font-data font-medium">{quest.minInvestment || "$500"}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-12" onClick={onClose}>
              View
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button className="flex-1 h-12" onClick={() => onComplete(quest.id)}>
              Invest
              <Wallet className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuestDialog
