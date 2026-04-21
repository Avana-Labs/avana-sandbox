"use client"

import { ArrowDownLeft, Coins, HandCoins, RotateCcw } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { HomeMode } from "@/app/lib/home-sim"

const HOME_MODE_ITEMS: Array<{
  value: HomeMode
  label: string
  icon: typeof HandCoins
}> = [
  { value: "borrow", label: "Borrow", icon: HandCoins },
  { value: "repay", label: "Repay", icon: RotateCcw },
  { value: "claim", label: "Claim", icon: Coins },
  { value: "remove", label: "Remove", icon: ArrowDownLeft },
]

export function HomeModeTabs() {
  return (
    <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/70 p-2 md:grid-cols-4">
      {HOME_MODE_ITEMS.map((item) => {
        const Icon = item.icon

        return (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="h-11 rounded-full border border-transparent bg-background/40 px-4 data-[state=active]:border-border/70 data-[state=active]:bg-background"
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.label}
          </TabsTrigger>
        )
      })}
    </TabsList>
  )
}
