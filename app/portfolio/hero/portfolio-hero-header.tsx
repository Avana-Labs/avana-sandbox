"use client"

import { Eye, EyeOff } from "lucide-react"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { PortfolioNetworkSelector } from "./portfolio-network-selector"
import type { NetworkId } from "./types"
import { WalletMark } from "./wallet-mark"

type PortfolioHeroHeaderProps = {
  walletName?: string
  selectedNetwork: NetworkId
  onNetworkChange: (networkId: NetworkId) => void
}

export function PortfolioHeroHeader({
  walletName = "Demo wallet",
  selectedNetwork,
  onNetworkChange,
}: PortfolioHeroHeaderProps) {
  const { showDollarAmounts, toggleShowDollarAmounts } = useDisplayPreferences()

  return (
    <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span className="shrink-0 sm:hidden">
          <WalletMark size={36} />
        </span>
        <span className="hidden shrink-0 sm:block">
          <WalletMark size={40} />
        </span>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <h1 className="truncate text-[16px] font-medium tracking-[-0.03em] text-foreground sm:text-[18px]">{walletName}</h1>
          <button
            type="button"
            onClick={toggleShowDollarAmounts}
            className="text-muted-foreground/70 transition-colors hover:text-foreground"
            aria-label={showDollarAmounts ? "Hide balances" : "Show balances"}
          >
            {showDollarAmounts ? <Eye className="h-[15px] w-[15px]" /> : <EyeOff className="h-[15px] w-[15px]" />}
          </button>
        </div>
      </div>

      <PortfolioNetworkSelector selectedNetwork={selectedNetwork} onNetworkChange={onNetworkChange} />
    </div>
  )
}
