"use client"

import { useEffect, useState } from "react"
import { PortfolioNetworkSelector } from "./portfolio-network-selector"
import type { NetworkId } from "./types"

type PortfolioHeroHeaderProps = {
  selectedNetwork: NetworkId
  onNetworkChange: (networkId: NetworkId) => void
}

function resolveGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function PortfolioHeroHeader({ selectedNetwork, onNetworkChange }: PortfolioHeroHeaderProps) {
  const [title, setTitle] = useState("Welcome back")

  useEffect(() => {
    setTitle(resolveGreeting())
  }, [])

  return (
    <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-[24px] font-medium tracking-[-0.04em] text-foreground sm:text-[30px]">{title}</h1>
      </div>

      <PortfolioNetworkSelector selectedNetwork={selectedNetwork} onNetworkChange={onNetworkChange} />
    </div>
  )
}
