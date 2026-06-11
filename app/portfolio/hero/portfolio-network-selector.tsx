"use client"

import { ChevronDown24Regular } from "@fluentui/react-icons"
import { Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NetworkIcon } from "./network-icon"
import { PORTFOLIO_NETWORKS } from "./portfolio-network-data"
import type { NetworkConfig, NetworkId } from "./types"

type PortfolioNetworkSelectorProps = {
  selectedNetwork: NetworkId
  onNetworkChange: (networkId: NetworkId) => void
  networks?: NetworkConfig[]
}

export function PortfolioNetworkSelector({
  selectedNetwork,
  onNetworkChange,
  networks = PORTFOLIO_NETWORKS,
}: PortfolioNetworkSelectorProps) {
  const activeNetwork = networks.find((network) => network.id === selectedNetwork) ?? networks[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Network: ${activeNetwork.label}`}
          className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[16px] border border-border bg-background px-2.5 text-[14px] font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-surface-inset dark:border-white/10 dark:bg-[#11161d] dark:hover:bg-[#161d26] sm:h-11 sm:gap-2 sm:px-3 sm:pr-3.5"
        >
          <span className="sm:hidden">
            <NetworkIcon id={selectedNetwork} size={20} />
          </span>
          <span className="hidden sm:inline-flex">
            <NetworkIcon id={selectedNetwork} size={selectedNetwork === "all" ? 18 : 22} />
          </span>
          <span className="hidden sm:inline">{activeNetwork.label}</span>
          <ChevronDown24Regular className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 sm:h-4 sm:w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[240px] rounded-[20px] border-border/70 bg-background p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#11161d]"
      >
        {networks.map((network) => {
          const isSelected = selectedNetwork === network.id
          return (
            <DropdownMenuItem
              key={network.id}
              onSelect={() => onNetworkChange(network.id)}
              className="flex cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14px] font-medium text-foreground focus:bg-surface-inset dark:focus:bg-[#161d26]"
            >
              <NetworkIcon id={network.id} size={22} />
              <span>{network.label}</span>
              {network.isNew ? (
                <span className="rounded-full bg-[#FFE3F3] px-2 py-0.5 text-[11px] font-semibold leading-none text-[#FF007A]">
                  New
                </span>
              ) : null}
              {isSelected ? (
                <span className="ml-auto flex h-[18px] w-[18px] items-center justify-center rounded-full bg-foreground">
                  <Check className="h-3 w-3 text-background" strokeWidth={3} />
                </span>
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
