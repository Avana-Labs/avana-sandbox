"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { TokenIcon } from "@/app/components/token-icon"
import { cn } from "@/lib/utils"

type AssetRow = {
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
  hub: string
  market: string
  logoSrc?: string
  logoAlt?: string
  apyAccent?: boolean
}

type AssetGroup = {
  title: string
  subtitle?: string
  rows: AssetRow[]
}

const ASSET_GROUPS: AssetGroup[] = [
  {
    title: "Stablecoins",
    rows: [
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
        logoSrc: "https://token-logos.family.co/asset?id=1:0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c&token=EURC",
        logoAlt: "EURC logo",
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
        logoSrc: "https://token-logos.family.co/asset?id=1:0xCAcd6fd266aF91b8AeD52aCCc382b4e165586E29&token=frxUSD",
        logoAlt: "frxUSD logo",
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
        logoSrc: "https://token-logos.family.co/asset?id=1:0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f&token=GHO",
        logoAlt: "GHO logo",
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
        logoSrc: "https://token-logos.family.co/asset?id=1:0xe343167631d89B6Ffc58B88d6b7fB0228795491D&token=USDG",
        logoAlt: "USDG logo",
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
        logoSrc: "https://token-logos.family.co/asset?id=1:0x8292Bb45bf1Ee4d140127049757C2E0fF06317eD&token=RLUSD",
        logoAlt: "RLUSD logo",
        hub: "Ripple",
        market: "Stable",
      },
    ],
  },
  {
    title: "Ethereum-Based",
    rows: [
      {
        symbol: "ETH",
        name: "Ethereum",
        apy: "3.82%",
        apyValue: 3.82,
        totalDepositsPrimary: "31.50M ETH",
        totalDepositsSecondary: "$103.20M",
        totalDepositsValue: 31500,
        availableLiquidityPrimary: "12.18M ETH",
        availableLiquiditySecondary: "$39.89M",
        availableLiquidityValue: 12180,
        hub: "Ethereum",
        market: "Native",
      },
      {
        symbol: "stETH",
        name: "Lido Staked ETH",
        apy: "4.14%",
        apyValue: 4.14,
        totalDepositsPrimary: "8.44M stETH",
        totalDepositsSecondary: "$27.68M",
        totalDepositsValue: 8440,
        availableLiquidityPrimary: "3.98M stETH",
        availableLiquiditySecondary: "$13.05M",
        availableLiquidityValue: 3980,
        hub: "Lido",
        market: "Liquid Staking",
      },
      {
        symbol: "wstETH",
        name: "Wrapped stETH",
        apy: "5.14%",
        apyValue: 5.14,
        totalDepositsPrimary: "8.40M wstETH",
        totalDepositsSecondary: "$27.53M",
        totalDepositsValue: 8400,
        availableLiquidityPrimary: "2.88M wstETH",
        availableLiquiditySecondary: "$9.44M",
        availableLiquidityValue: 2880,
        hub: "Lido",
        market: "Liquid Staking",
      },
      {
        symbol: "cbETH",
        name: "Coinbase Wrapped ETH",
        apy: "4.62%",
        apyValue: 4.62,
        totalDepositsPrimary: "1.90M cbETH",
        totalDepositsSecondary: "$6.24M",
        totalDepositsValue: 1900,
        availableLiquidityPrimary: "0.84M cbETH",
        availableLiquiditySecondary: "$2.75M",
        availableLiquidityValue: 840,
        hub: "Coinbase",
        market: "Liquid Staking",
      },
      {
        symbol: "rETH",
        name: "Rocket Pool ETH",
        apy: "4.87%",
        apyValue: 4.87,
        totalDepositsPrimary: "2.80M rETH",
        totalDepositsSecondary: "$9.18M",
        totalDepositsValue: 2800,
        availableLiquidityPrimary: "1.14M rETH",
        availableLiquiditySecondary: "$3.74M",
        availableLiquidityValue: 1140,
        hub: "Rocket Pool",
        market: "Liquid Staking",
      },
      {
        symbol: "weETH",
        name: "Wrapped eETH",
        apy: "5.31%",
        apyValue: 5.31,
        totalDepositsPrimary: "2.10M weETH",
        totalDepositsSecondary: "$6.88M",
        totalDepositsValue: 2100,
        availableLiquidityPrimary: "0.95M weETH",
        availableLiquiditySecondary: "$3.11M",
        availableLiquidityValue: 950,
        hub: "EtherFi",
        market: "Liquid Restaking",
      },
    ],
  },
  {
    title: "Bitcoin Based",
    rows: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        apy: "2.91%",
        apyValue: 2.91,
        totalDepositsPrimary: "0.84M BTC",
        totalDepositsSecondary: "$56.44M",
        totalDepositsValue: 840,
        availableLiquidityPrimary: "0.42M BTC",
        availableLiquiditySecondary: "$28.22M",
        availableLiquidityValue: 420,
        hub: "Bitcoin",
        market: "Native",
      },
      {
        symbol: "WBTC",
        name: "Wrapped Bitcoin",
        apy: "3.48%",
        apyValue: 3.48,
        totalDepositsPrimary: "0.90M WBTC",
        totalDepositsSecondary: "$60.65M",
        totalDepositsValue: 900,
        availableLiquidityPrimary: "0.29M WBTC",
        availableLiquiditySecondary: "$19.54M",
        availableLiquidityValue: 290,
        hub: "Wrapped BTC",
        market: "Wrapped",
      },
      {
        symbol: "cbBTC",
        name: "Coinbase Wrapped BTC",
        apy: "4.25%",
        apyValue: 4.25,
        totalDepositsPrimary: "2.10M cbBTC",
        totalDepositsSecondary: "$141.68M",
        totalDepositsValue: 2100,
        availableLiquidityPrimary: "0.77M cbBTC",
        availableLiquiditySecondary: "$51.88M",
        availableLiquidityValue: 770,
        hub: "Coinbase",
        market: "Wrapped",
      },
    ],
  },
  {
    title: "Other Assets",
    rows: [
      {
        symbol: "AAVE",
        name: "Aave",
        apy: "7.60%",
        apyValue: 7.6,
        totalDepositsPrimary: "4.70M AAVE",
        totalDepositsSecondary: "$449.46M",
        totalDepositsValue: 4700,
        availableLiquidityPrimary: "1.95M AAVE",
        availableLiquiditySecondary: "$186.57M",
        availableLiquidityValue: 1950,
        hub: "Aave",
        market: "Governance",
      },
      {
        symbol: "UNI",
        name: "Uniswap",
        apy: "6.40%",
        apyValue: 6.4,
        totalDepositsPrimary: "3.20M UNI",
        totalDepositsSecondary: "$34.40M",
        totalDepositsValue: 3200,
        availableLiquidityPrimary: "1.24M UNI",
        availableLiquiditySecondary: "$13.33M",
        availableLiquidityValue: 1240,
        hub: "Uniswap",
        market: "Governance",
      },
      {
        symbol: "CRV",
        name: "Curve DAO",
        apy: "5.45%",
        apyValue: 5.45,
        totalDepositsPrimary: "1.80M CRV",
        totalDepositsSecondary: "$2.74M",
        totalDepositsValue: 1800,
        availableLiquidityPrimary: "0.92M CRV",
        availableLiquiditySecondary: "$1.40M",
        availableLiquidityValue: 920,
        hub: "Curve",
        market: "Governance",
      },
      {
        symbol: "LDO",
        name: "Lido DAO",
        apy: "6.80%",
        apyValue: 6.8,
        totalDepositsPrimary: "5.10M LDO",
        totalDepositsSecondary: "$9.98M",
        totalDepositsValue: 5100,
        availableLiquidityPrimary: "2.11M LDO",
        availableLiquiditySecondary: "$4.13M",
        availableLiquidityValue: 2110,
        hub: "Lido",
        market: "Governance",
      },
      {
        symbol: "BAL",
        name: "Balancer",
        apy: "4.95%",
        apyValue: 4.95,
        totalDepositsPrimary: "1.60M BAL",
        totalDepositsSecondary: "$5.30M",
        totalDepositsValue: 1600,
        availableLiquidityPrimary: "0.70M BAL",
        availableLiquiditySecondary: "$2.32M",
        availableLiquidityValue: 700,
        hub: "Balancer",
        market: "Governance",
      },
      {
        symbol: "GNO",
        name: "Gnosis",
        apy: "5.31%",
        apyValue: 5.31,
        totalDepositsPrimary: "2.80M GNO",
        totalDepositsSecondary: "$621.48M",
        totalDepositsValue: 2800,
        availableLiquidityPrimary: "1.15M GNO",
        availableLiquiditySecondary: "$255.45M",
        availableLiquidityValue: 1150,
        hub: "Gnosis",
        market: "Governance",
      },
      {
        symbol: "AERO",
        name: "Aerodrome",
        apy: "8.20%",
        apyValue: 8.2,
        totalDepositsPrimary: "6.30M AERO",
        totalDepositsSecondary: "$14.15M",
        totalDepositsValue: 6300,
        availableLiquidityPrimary: "2.70M AERO",
        availableLiquiditySecondary: "$6.06M",
        availableLiquidityValue: 2700,
        hub: "Aerodrome",
        market: "Governance",
      },
      {
        symbol: "ARB",
        name: "Arbitrum",
        apy: "3.90%",
        apyValue: 3.9,
        totalDepositsPrimary: "12.40M ARB",
        totalDepositsSecondary: "$7.43M",
        totalDepositsValue: 12400,
        availableLiquidityPrimary: "4.90M ARB",
        availableLiquiditySecondary: "$2.94M",
        availableLiquidityValue: 4900,
        hub: "Arbitrum",
        market: "Governance",
      },
      {
        symbol: "OP",
        name: "Optimism",
        apy: "4.10%",
        apyValue: 4.1,
        totalDepositsPrimary: "9.50M OP",
        totalDepositsSecondary: "$13.87M",
        totalDepositsValue: 9500,
        availableLiquidityPrimary: "3.85M OP",
        availableLiquiditySecondary: "$5.62M",
        availableLiquidityValue: 3850,
        hub: "Optimism",
        market: "Governance",
      },
    ],
  },
]

const ALL_ROWS = ASSET_GROUPS.flatMap((group) => group.rows)
const HUB_OPTIONS = ["All Hubs", ...Array.from(new Set(ALL_ROWS.map((row) => row.hub)))]
const MARKET_OPTIONS = ["All Markets", ...Array.from(new Set(ALL_ROWS.map((row) => row.market)))]

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

function AssetIcon({ row }: { row: AssetRow }) {
  if (row.logoSrc) {
    return (
      <span className="relative flex size-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent">
        <Image
          alt={row.logoAlt ?? `${row.symbol} logo`}
          src={row.logoSrc}
          width={44}
          height={44}
          className="h-full w-full object-contain"
          unoptimized
        />
      </span>
    )
  }

  return <TokenIcon symbol={row.symbol} size="xl" ring className="bg-white dark:bg-[#111111]" />
}

function AssetRowView({ row, delay }: { row: AssetRow; delay: number }) {
  return (
    <tr
      className="asset-swap group border-t border-border transition-colors hover:bg-surface-1 dark:border-white/6 dark:hover:bg-white/[0.015]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <td className="py-4 pl-6 pr-4">
        <div className="flex min-w-0 items-center gap-4">
          <AssetIcon row={row} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88 md:text-[15px]">
              {row.name}
            </div>
            <div className="mt-1 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[13px]">
              {row.symbol}
            </div>
          </div>
        </div>
      </td>

      <td className="py-4 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[15px]">
        <div className={cn("flex items-center gap-2", row.apyAccent && "text-[#6d6afb] dark:text-white")}>
          <YieldsBadge accent={row.apyAccent} />
          <span className="tabular-nums">{row.apy}</span>
        </div>
      </td>

      <td className="py-4 px-4">
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[15px]">
          {row.totalDepositsPrimary}
        </div>
        <div className="mt-1 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[13px]">
          {row.totalDepositsSecondary}
        </div>
      </td>

      <td className="py-4 px-6 text-right">
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[15px]">
          {row.availableLiquidityPrimary}
        </div>
        <div className="mt-1 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[13px]">
          {row.availableLiquiditySecondary}
        </div>
      </td>
    </tr>
  )
}

function AssetSection({
  title,
  subtitle,
  rows,
}: {
  title: string
  subtitle?: string
  rows: AssetRow[]
}) {
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

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1

    return [...rows].sort((a, b) => {
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
  }, [rows, sortDirection, sortKey])

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={cn(
              "text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]",
              title === "Ethereum-Based" ? "md:text-[23px]" : "",
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[13px] text-muted-foreground dark:text-white/44">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-white shadow-elev-1 dark:border-white/6 dark:bg-[#171717] dark:shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground dark:border-white/6 dark:text-white/52">
                <th className="pb-3 pt-4 pl-6 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("asset")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "asset"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>ASSET</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("apy")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "apy"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>APY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("deposits")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "deposits"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>TOTAL DEPOSITS</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 pr-6 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("liquidity")}
                    className={cn(
                      "ml-auto flex items-center gap-2 transition-colors",
                      sortKey === "liquidity"
                        ? "text-foreground dark:text-white/90"
                        : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>AVAILABLE LIQUIDITY</span>
                    <SortIcon />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody key={`${title}-${sortKey}-${sortDirection}-${rows.length}`} className="divide-y divide-border dark:divide-white/6">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => (
                  <AssetRowView key={row.symbol} row={row} delay={index * 40} />
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-[12px] text-muted-foreground dark:text-white/60" colSpan={4}>
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

export function LendAssetSpokes() {
  const [search, setSearch] = useState("")
  const [selectedHub, setSelectedHub] = useState("All Hubs")
  const [selectedMarket, setSelectedMarket] = useState("All Markets")

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    return ASSET_GROUPS.map((group) => {
      const rows = group.rows.filter((row) => {
        const matchesSearch =
          query.length === 0 ||
          row.name.toLowerCase().includes(query) ||
          row.symbol.toLowerCase().includes(query)
        const matchesHub = selectedHub === "All Hubs" || row.hub === selectedHub
        const matchesMarket = selectedMarket === "All Markets" || row.market === selectedMarket
        return matchesSearch && matchesHub && matchesMarket
      })

      return { ...group, rows }
    }).filter((group) => group.rows.length > 0)
  }, [search, selectedHub, selectedMarket])

  return (
    <section className="mt-16 space-y-8">
      <div className="flex items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-white px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-white/7 dark:bg-[#111111] dark:text-white/96 dark:focus-within:border-white/18 md:flex-none md:w-[280px]">
            <SearchIcon />
            <input
              aria-label="Filter assets"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter assets"
              className="w-full bg-transparent text-[12px] font-normal tracking-[-0.03em] text-foreground outline-none placeholder:text-muted-foreground/70 dark:text-white/88 dark:placeholder:text-white/38"
            />
        </label>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="relative">
            <select
              aria-label="Filter hub"
              value={selectedHub}
              onChange={(event) => setSelectedHub(event.target.value)}
              className="h-9 appearance-none rounded-full border border-border bg-white px-2.5 pr-7 text-[11px] font-medium tracking-[-0.03em] text-foreground shadow-elev-1 outline-none transition-colors hover:bg-surface-1 dark:border-white/6 dark:bg-[#242424] dark:text-white/88 dark:hover:bg-[#2b2b2b] md:h-10 md:px-3 md:pr-9 md:text-[12px]"
            >
              {HUB_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 dark:text-white/60 md:right-2.5">
              <ChevronDownIcon />
            </span>
          </div>

          <div className="relative">
            <select
              aria-label="Filter market"
              value={selectedMarket}
              onChange={(event) => setSelectedMarket(event.target.value)}
              className="h-9 appearance-none rounded-full border border-border bg-white px-2.5 pr-7 text-[11px] font-medium tracking-[-0.03em] text-foreground shadow-elev-1 outline-none transition-colors hover:bg-surface-1 dark:border-white/6 dark:bg-[#242424] dark:text-white/88 dark:hover:bg-[#2b2b2b] md:h-10 md:px-3 md:pr-9 md:text-[12px]"
            >
              {MARKET_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 dark:text-white/60 md:right-2.5">
              <ChevronDownIcon />
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-14">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <div key={group.title} className="space-y-8">
              <AssetSection
                title={group.title}
                subtitle={group.subtitle}
                rows={group.rows}
              />
              {group.title === "Ethereum-Based" ? (
                <div className="flex justify-center">
                  <div className="h-px w-full max-w-[980px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/10" />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-border bg-white px-6 py-10 text-[13px] text-muted-foreground shadow-elev-1 dark:border-white/6 dark:bg-[#171717] dark:text-white/60">
            No assets match these filters.
          </div>
        )}
      </div>
    </section>
  )
}
