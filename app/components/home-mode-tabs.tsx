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
    <TabsList className="w-full justify-center md:justify-start">
      {HOME_MODE_ITEMS.map((item) => {
        const Icon = item.icon

        return (
          <TabsTrigger key={item.value} value={item.value} className="gap-1.5">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {item.label}
          </TabsTrigger>
        )
      })}
    </TabsList>
  )
}
