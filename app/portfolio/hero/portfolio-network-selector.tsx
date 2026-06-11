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
          className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border border-border bg-background px-2 text-[14px] font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-surface-inset sm:h-10 sm:gap-2 sm:rounded-[14px] sm:px-2.5 sm:pr-3"
        >
          <span className="sm:hidden">
            <NetworkIcon id={selectedNetwork} size={20} />
          </span>
          <span className="hidden sm:inline-flex">
            <NetworkIcon id={selectedNetwork} size={22} />
          </span>
          <span className="hidden sm:inline">{activeNetwork.label}</span>
          <ChevronDown24Regular className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 sm:h-4 sm:w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[240px] rounded-[18px] border-border/70 p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
      >
        {networks.map((network) => {
          const isSelected = selectedNetwork === network.id
          return (
            <DropdownMenuItem
              key={network.id}
              onSelect={() => onNetworkChange(network.id)}
              className="flex cursor-pointer items-center gap-2.5 rounded-[12px] px-2.5 py-2.5 text-[14px] font-medium text-foreground"
            >
              <NetworkIcon id={network.id} size={24} />
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
