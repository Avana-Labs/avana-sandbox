"use client"

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
  return (
    <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span className="shrink-0">
          <WalletMark size={40} />
        </span>
        <h1 className="truncate text-[16px] font-medium tracking-[-0.03em] text-foreground sm:text-[18px]">{walletName}</h1>
      </div>

      <PortfolioNetworkSelector selectedNetwork={selectedNetwork} onNetworkChange={onNetworkChange} />
    </div>
  )
}
