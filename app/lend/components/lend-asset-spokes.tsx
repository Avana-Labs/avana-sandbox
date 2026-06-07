"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type StableAssetRow = {
  symbol: string
  name: string
  apy: string
  apyValue: number
  totalDepositsPrimary: string
  totalDepositsSecondary: string
  totalDepositsValue: number
  availableLiquidityPrimary: string
  availableLiquiditySecondary: string
  availableLiquidityValue: number
  icon: "eurc" | "frxusd" | "gho" | "usdg" | "rlusd"
  hub: string
  market: string
  apyAccent?: boolean
}

const HUB_OPTIONS = ["All Hubs", "Aave", "Circle", "Frax", "Paxos", "Ripple"] as const
const MARKET_OPTIONS = ["All Markets", "Core", "Stable", "Prime"] as const

const STABLE_ASSETS: StableAssetRow[] = [
  {
    symbol: "EURC",
    name: "Euro Coin",
    apy: "0.49%",
    apyValue: 0.49,
    totalDepositsPrimary: "85.73K EURC",
    totalDepositsSecondary: "$98.60K",
    totalDepositsValue: 85.73,
    availableLiquidityPrimary: "60.18K EURC",
    availableLiquiditySecondary: "$69.22K",
    availableLiquidityValue: 60.18,
    icon: "eurc",
    hub: "Circle",
    market: "Core",
  },
  {
    symbol: "frxUSD",
    name: "Frax USD",
    apy: "6.20%",
    apyValue: 6.2,
    totalDepositsPrimary: "30.00M frxUSD",
    totalDepositsSecondary: "$29.98M",
    totalDepositsValue: 30000,
    availableLiquidityPrimary: "25.39M frxUSD",
    availableLiquiditySecondary: "$25.37M",
    availableLiquidityValue: 25390,
    icon: "frxusd",
    hub: "Frax",
    market: "Stable",
    apyAccent: true,
  },
  {
    symbol: "GHO",
    name: "Gho Token",
    apy: "0.21% - 2.99%",
    apyValue: 2.99,
    totalDepositsPrimary: "1.27M GHO",
    totalDepositsSecondary: "$1.27M",
    totalDepositsValue: 1270,
    availableLiquidityPrimary: "455.75K GHO",
    availableLiquiditySecondary: "$455.75K",
    availableLiquidityValue: 455.75,
    icon: "gho",
    hub: "Aave",
    market: "Prime",
  },
  {
    symbol: "USDG",
    name: "Global Dollar",
    apy: "8.00%",
    apyValue: 8,
    totalDepositsPrimary: "30.00M USDG",
    totalDepositsSecondary: "$30.00M",
    totalDepositsValue: 30000,
    availableLiquidityPrimary: "25.07M USDG",
    availableLiquiditySecondary: "$25.07M",
    availableLiquidityValue: 25070,
    icon: "usdg",
    hub: "Paxos",
    market: "Stable",
    apyAccent: true,
  },
  {
    symbol: "RLUSD",
    name: "RLUSD",
    apy: "30.10%",
    apyValue: 30.1,
    totalDepositsPrimary: "0.15 RLUSD",
    totalDepositsSecondary: "$0.15",
    totalDepositsValue: 0.15,
    availableLiquidityPrimary: "<0.01 RLUSD",
    availableLiquiditySecondary: "$0.00",
    availableLiquidityValue: 0.01,
    icon: "rlusd",
    hub: "Ripple",
    market: "Stable",
  },
]

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6 text-muted-foreground/70 dark:text-white/40">
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 16" fill="none" className="size-[14px] text-muted-foreground/70 dark:text-white/60">
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3 text-muted-foreground/70 dark:text-white/60">
      <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function YieldsBadge({ accent }: { accent?: boolean }) {
  if (!accent) return null

  return (
    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-[#8f8cff]/70 text-[#8f8cff]">
      <svg aria-hidden="true" viewBox="0 0 14 14" fill="none" className="size-[8px]">
        <path
          d="M2.5 7c0-2.485 2.015-4.5 4.5-4.5S11.5 4.515 11.5 7 9.485 11.5 7 11.5 2.5 9.485 2.5 7Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M5.1 7.05c.37-.92 1.08-1.47 1.9-1.47.82 0 1.53.56 1.9 1.47"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

function AssetIcon({ icon }: { icon: StableAssetRow["icon"] }) {
  const base = "relative flex size-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full"
  const logos: Record<StableAssetRow["icon"], { src: string; alt: string }> = {
    eurc: {
      src: "https://token-logos.family.co/asset?id=1:0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c&token=EURC",
      alt: "EURC logo",
    },
    frxusd: {
      src: "https://token-logos.family.co/asset?id=1:0xCAcd6fd266aF91b8AeD52aCCc382b4e165586E29&token=frxUSD",
      alt: "frxUSD logo",
    },
    gho: {
      src: "https://token-logos.family.co/asset?id=1:0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&token=GHO",
      alt: "GHO logo",
    },
    usdg: {
      src: "https://token-logos.family.co/asset?id=1:0xe343167631d89B6Ffc58B88d6b7fB0228795491D&token=USDG",
      alt: "USDG logo",
    },
    rlusd: {
      src: "https://token-logos.family.co/asset?id=1:0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD&token=RLUSD",
      alt: "RLUSD logo",
    },
  }

  const logo = logos[icon]
  return (
    <span className={cn(base, "bg-transparent")}>
      <Image alt={logo.alt} src={logo.src} width={44} height={44} className="h-full w-full object-contain" unoptimized />
    </span>
  )
}

function StableAssetRowView({ row }: { row: StableAssetRow }) {
  return (
    <tr className="group border-t border-border transition-colors hover:bg-surface-1 dark:border-white/6 dark:hover:bg-white/[0.015]">
      <td className="py-4 pl-6 pr-4">
        <div className="flex min-w-0 items-center gap-4">
          <AssetIcon icon={row.icon} />
          <div className="min-w-0">
            <div className="truncate text-[16px] font-medium tracking-[-0.03em] text-foreground dark:text-white/96 md:text-[16px]">
              {row.name}
            </div>
            <div className="mt-1 text-[14px] font-medium tracking-[-0.03em] text-muted-foreground dark:text-white/44 md:text-[14px]">
              {row.symbol}
            </div>
          </div>
        </div>
      </td>

      <td className="py-4 px-4 text-[16px] font-normal tracking-[-0.03em] text-foreground dark:text-white/90 md:text-[16px]">
        <div className={cn("flex items-center gap-2", row.apyAccent && "text-[#6d6afb] dark:text-white")}>
          <YieldsBadge accent={row.apyAccent} />
          <span className="tabular-nums">{row.apy}</span>
        </div>
      </td>

      <td className="py-4 px-4">
        <div className="text-[16px] font-normal tracking-[-0.03em] text-foreground dark:text-white/90 md:text-[16px]">
          {row.totalDepositsPrimary}
        </div>
        <div className="mt-1 text-[14px] font-medium tracking-[-0.03em] text-muted-foreground dark:text-white/44 md:text-[14px]">
          {row.totalDepositsSecondary}
        </div>
      </td>

      <td className="py-4 px-6 text-right">
        <div className="text-[16px] font-normal tracking-[-0.03em] text-foreground dark:text-white/90 md:text-[16px]">
          {row.availableLiquidityPrimary}
        </div>
        <div className="mt-1 text-[14px] font-medium tracking-[-0.03em] text-muted-foreground dark:text-white/44 md:text-[14px]">
          {row.availableLiquiditySecondary}
        </div>
      </td>
    </tr>
  )
}

export function LendAssetSpokes() {
  const [search, setSearch] = useState("")
  const [selectedHub, setSelectedHub] = useState<(typeof HUB_OPTIONS)[number]>("All Hubs")
  const [selectedMarket, setSelectedMarket] = useState<(typeof MARKET_OPTIONS)[number]>("All Markets")
  const [sortKey, setSortKey] = useState<"asset" | "apy" | "deposits" | "liquidity">("asset")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === "asset" ? "asc" : "desc")
  }

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = STABLE_ASSETS.filter((row) => {
      const matchesSearch =
        query.length === 0 ||
        row.name.toLowerCase().includes(query) ||
        row.symbol.toLowerCase().includes(query)
      const matchesHub = selectedHub === "All Hubs" || row.hub === selectedHub
      const matchesMarket = selectedMarket === "All Markets" || row.market === selectedMarket
      return matchesSearch && matchesHub && matchesMarket
    })

    const direction = sortDirection === "asc" ? 1 : -1
    return rows.sort((a, b) => {
      switch (sortKey) {
        case "apy":
          return (a.apyValue - b.apyValue) * direction
        case "deposits":
          return (a.totalDepositsValue - b.totalDepositsValue) * direction
        case "liquidity":
          return (a.availableLiquidityValue - b.availableLiquidityValue) * direction
        case "asset":
        default:
          return a.name.localeCompare(b.name) * direction
      }
    })
  }, [search, selectedHub, selectedMarket, sortKey, sortDirection])

  return (
    <section className="mt-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="flex h-12 w-full max-w-[420px] items-center gap-3 rounded-full border border-border bg-white px-4 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-white/7 dark:bg-[#111111] dark:text-white/96 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] dark:focus-within:border-white/18 md:px-5">
          <SearchIcon />
          <input
            aria-label="Filter assets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter assets"
            className="w-full bg-transparent text-[14px] font-normal tracking-[-0.03em] text-foreground outline-none placeholder:text-muted-foreground/70 dark:text-white/88 dark:placeholder:text-white/38"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <div className="relative">
            <select
              aria-label="Filter hub"
              value={selectedHub}
              onChange={(event) => setSelectedHub(event.target.value as (typeof HUB_OPTIONS)[number])}
              className="h-12 appearance-none rounded-full border border-border bg-white px-4 pr-10 text-[14px] font-medium tracking-[-0.03em] text-foreground shadow-elev-1 outline-none transition-colors hover:bg-surface-1 dark:border-white/6 dark:bg-[#242424] dark:text-white/94 dark:hover:bg-[#2b2b2b] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            >
              {HUB_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 dark:text-white/60">
              <ChevronDownIcon />
            </span>
          </div>

          <div className="relative">
            <select
              aria-label="Filter market"
              value={selectedMarket}
              onChange={(event) =>
                setSelectedMarket(event.target.value as (typeof MARKET_OPTIONS)[number])
              }
              className="h-12 appearance-none rounded-full border border-border bg-white px-4 pr-10 text-[14px] font-medium tracking-[-0.03em] text-foreground shadow-elev-1 outline-none transition-colors hover:bg-surface-1 dark:border-white/6 dark:bg-[#242424] dark:text-white/94 dark:hover:bg-[#2b2b2b] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            >
              {MARKET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 dark:text-white/60">
              <ChevronDownIcon />
            </span>
          </div>

        </div>
      </div>

      <h2 className="mt-16 text-[24px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[32px]">Stablecoins</h2>

      <div className="mt-10 overflow-hidden rounded-[20px] border border-border bg-white shadow-elev-1 dark:border-white/6 dark:bg-[#171717] dark:shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground dark:border-white/6 dark:text-white/52">
                <th className="pb-3 pt-4 pl-6 text-[10.5px] font-medium uppercase tracking-[0.06em] text-foreground dark:text-white/88">
                  <button type="button" onClick={() => toggleSort("asset")} className="flex items-center gap-2">
                    <span>ASSET</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[10.5px] font-medium uppercase tracking-[0.06em] text-foreground dark:text-white/88">
                  <button type="button" onClick={() => toggleSort("apy")} className="flex items-center gap-2">
                    <span>APY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[10.5px] font-medium uppercase tracking-[0.06em] text-foreground dark:text-white/88">
                  <button type="button" onClick={() => toggleSort("deposits")} className="flex items-center gap-2">
                    <span>TOTAL DEPOSITS</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 pr-6 text-right text-[10.5px] font-medium uppercase tracking-[0.06em] text-foreground dark:text-white/88">
                  <button type="button" onClick={() => toggleSort("liquidity")} className="ml-auto flex items-center gap-2">
                    <span>AVAILABLE LIQUIDITY</span>
                    <SortIcon />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((row) => <StableAssetRowView key={row.symbol} row={row} />)
              ) : (
                <tr>
                  <td className="px-6 py-10 text-[13px] text-muted-foreground dark:text-white/60" colSpan={4}>
                    No assets match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
