"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "@/app/components/theme-provider"
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

const STABLE_SYMBOLS = new Set(ASSET_GROUPS[0]?.rows.map((row) => row.symbol) ?? [])
const ALL_HUBS_LABEL = "All Hubs"
const ALL_MARKETS_LABEL = "All Markets"
const HUB_OPTIONS = ["Stable", "Volatile"]
const MARKET_OPTIONS = ASSET_GROUPS.map((group) => group.title)

function getHubBucket(row: AssetRow) {
  return STABLE_SYMBOLS.has(row.symbol) ? "Stable" : "Volatile"
}

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
    <svg aria-hidden="true" viewBox="0 0 12 14" fill="none" className="size-3.5 text-current">
      <path d="M3 4.5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilterCheckIcon({ checked, dark }: { checked: boolean; dark: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked
          ? "border-[#01AACF] bg-[#01AACF] text-white"
          : dark
            ? "border-white/55 bg-transparent text-transparent"
            : "border-black/35 bg-transparent text-transparent",
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3">
        <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function MultiSelectDropdown({
  allLabel,
  countLabel,
  options,
  selectedValues,
  onChange,
  ariaLabel,
}: {
  allLabel: string
  countLabel: string
  options: string[]
  selectedValues: string[]
  onChange: (nextValues: string[]) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [panelStyle, setPanelStyle] = useState<{
    left: number
    top: number
    width: number
    maxHeight: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.length
  const triggerLabel = isAllSelected ? allLabel : `${countLabel} (${selectedValues.length})`

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => document.removeEventListener("pointerdown", handlePointerDown, true)
  }, [open])

  useEffect(() => {
    if (!open) return

    const updatePanelPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      const nextOpenUpward = spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const maxHeight = Math.max(140, Math.min(220, (nextOpenUpward ? spaceAbove : spaceBelow) - 12))
      const top = nextOpenUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setOpenUpward(nextOpenUpward)
      setPanelStyle({ left, top, width, maxHeight })
    }

    updatePanelPosition()

    const updateAnchoredPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const availableSpace = openUpward ? triggerRect.top : window.innerHeight - triggerRect.bottom
      const maxHeight = Math.max(140, Math.min(220, availableSpace - 12))
      const top = openUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setPanelStyle({ left, top, width, maxHeight })
    }

    window.addEventListener("resize", updateAnchoredPosition)
    window.addEventListener("scroll", updateAnchoredPosition, true)

    return () => {
      window.removeEventListener("resize", updateAnchoredPosition)
      window.removeEventListener("scroll", updateAnchoredPosition, true)
    }
  }, [open, openUpward, options.length])

  const toggleOption = (option: string, checked: boolean) => {
    if (!checked) {
      const nextValues = selectedValues.filter((value) => value !== option)
      onChange(nextValues)
      return
    }

    onChange(Array.from(new Set([...selectedValues, option])))
  }

  return (
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium tracking-[-0.03em] shadow-elev-1 outline-none transition-colors focus-visible:ring-2 md:h-10 md:px-4 md:text-[14px]",
          isDark
            ? "border border-white/8 bg-[#1f1f1f] text-white hover:bg-[#262626] focus-visible:ring-white/10"
            : "border border-border bg-white text-foreground hover:bg-neutral-50 focus-visible:ring-black/10",
        )}
      >
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <span className={cn(isDark ? "text-white/70" : "text-foreground/55")}>
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={`Close ${ariaLabel}`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />

          <div
            ref={panelRef}
            className={cn(
              "fixed z-30 overflow-hidden rounded-[18px] border shadow-[0_22px_44px_rgba(0,0,0,0.24)]",
              isDark ? "border-white/8 bg-[#232323] text-white" : "border-border bg-white text-foreground",
            )}
            style={
              panelStyle
                ? {
                    left: panelStyle.left,
                    top: panelStyle.top,
                    width: panelStyle.width,
                    maxHeight: panelStyle.maxHeight,
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => {
                onChange([])
                setOpen(false)
              }}
              className={cn(
                "flex h-10 w-full items-center gap-3 px-3.5 text-left text-[13px] font-medium tracking-[-0.03em] transition-colors md:h-11 md:px-4 md:text-[14px]",
                isDark
                  ? "text-white hover:bg-white/5"
                  : "text-foreground hover:bg-black/[0.04]",
              )}
            >
              <FilterCheckIcon checked={isAllSelected} dark={isDark} />
              <span>{allLabel}</span>
            </button>

            <div
              className={cn(
                "w-full border-t",
                isDark ? "border-white/20" : "border-black/12",
              )}
            />

            <div className="overflow-y-auto py-1 pb-3" style={panelStyle ? { maxHeight: panelStyle.maxHeight - 41 } : undefined}>
              {options.map((option) => {
                const checked = selectedValues.includes(option)

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option, !checked)}
                    className={cn(
                      "flex h-9 w-full items-center gap-3 px-3.5 text-left text-[13px] tracking-[-0.03em] transition-colors",
                      isDark
                        ? checked
                          ? "bg-white/6 font-medium text-white"
                          : "text-white/82 hover:bg-white/5"
                        : checked
                          ? "bg-black/[0.05] font-medium text-foreground"
                          : "text-foreground/82 hover:bg-black/[0.04]",
                    )}
                  >
                    <FilterCheckIcon checked={checked} dark={isDark} />
                    <span className="truncate">{option}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
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

function AssetRowView({ row, delay, index }: { row: AssetRow; delay: number; index: number }) {
  return (
    <tr
      className="asset-swap group transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <td className="py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52">
        {index + 1}
      </td>
      <td className="py-3 pl-6 pr-4">
        <div className="flex min-w-0 items-center gap-3">
          <AssetIcon row={row} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88 md:text-[14px]">
              {row.name}
            </div>
            <div className="mt-0.5 text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[12px]">
              {row.symbol}
            </div>
          </div>
        </div>
      </td>

      <td className="py-3 px-4 text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px]">
        <div className={cn("flex items-center gap-2", row.apyAccent && "text-[#6d6afb] dark:text-white")}>
          <YieldsBadge accent={row.apyAccent} />
          <span className="tabular-nums">{row.apy}</span>
        </div>
      </td>

      <td className="py-3 px-4">
        <div className="text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px]">
          {row.totalDepositsPrimary}
        </div>
        <div className="mt-0.5 text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[12px]">
          {row.totalDepositsSecondary}
        </div>
      </td>

      <td className="py-3 px-6">
        <div className="text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px]">
          {row.availableLiquidityPrimary}
        </div>
        <div className="mt-0.5 text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[12px]">
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

      <div className="rounded-[18px] bg-white dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-[12px]">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[29%]" />
              <col className="w-[17%]" />
              <col className="w-[24%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-2xl bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  #
                </th>
                <th className="bg-slate-50 px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
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
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
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
                <th className="bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
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
                <th className="rounded-r-2xl bg-slate-50 px-4 py-3.5 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-slate-900/90 dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("liquidity")}
                    className={cn(
                      "flex w-full items-center gap-2 transition-colors",
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
            <tbody key={`${title}-${sortKey}-${sortDirection}`} className="divide-y divide-border dark:divide-white/6">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => (
                  <AssetRowView key={row.symbol} row={row} delay={index * 40} index={index} />
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-[12px] text-muted-foreground dark:text-white/60" colSpan={5}>
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
  const [selectedHubs, setSelectedHubs] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    return ASSET_GROUPS.map((group) => {
      const matchesMarketGroup = selectedMarkets.length === 0 || selectedMarkets.includes(group.title)
      const rows = group.rows.filter((row) => {
        const matchesSearch =
          query.length === 0 ||
          row.name.toLowerCase().includes(query) ||
          row.symbol.toLowerCase().includes(query)
        const matchesHub = selectedHubs.length === 0 || selectedHubs.includes(getHubBucket(row))
        const matchesMarket = matchesMarketGroup
        return matchesSearch && matchesHub && matchesMarket
      })

      return { ...group, rows }
    }).filter((group) => group.rows.length > 0)
  }, [search, selectedHubs, selectedMarkets])

  return (
    <section className="mt-16 space-y-8" style={{ overflowAnchor: "none" }}>
      <div className="hidden items-center gap-2 py-2.5 md:flex">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-white px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-white/7 dark:bg-[#111111] dark:text-white/96 dark:focus-within:border-white/18 md:flex-none md:w-[280px]">
          <SearchIcon />
          <input
            aria-label="Filter assets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter assets"
            className="lend-filter-input w-full bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none md:text-[15px] md:font-normal"
          />
        </label>

        <div className="ml-auto flex min-w-0 flex-nowrap gap-2">
          <MultiSelectDropdown
            allLabel={ALL_HUBS_LABEL}
            countLabel="Hubs"
            options={HUB_OPTIONS}
            selectedValues={selectedHubs}
            onChange={setSelectedHubs}
            ariaLabel="Filter hubs"
          />

          <MultiSelectDropdown
            allLabel={ALL_MARKETS_LABEL}
            countLabel="Markets"
            options={MARKET_OPTIONS}
            selectedValues={selectedMarkets}
            onChange={setSelectedMarkets}
            ariaLabel="Filter markets"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2.5 md:hidden">
        <label className="flex h-10 min-w-[11rem] flex-1 items-center gap-2 rounded-full border border-border bg-white px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-white/7 dark:bg-[#111111] dark:text-white/96 dark:focus-within:border-white/18">
          <SearchIcon />
          <input
            aria-label="Filter assets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter assets"
            className="w-full min-w-0 bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none"
          />
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <MultiSelectDropdown
            allLabel={ALL_HUBS_LABEL}
            countLabel="Hubs"
            options={HUB_OPTIONS}
            selectedValues={selectedHubs}
            onChange={setSelectedHubs}
            ariaLabel="Filter hubs"
          />

          <MultiSelectDropdown
            allLabel={ALL_MARKETS_LABEL}
            countLabel="Markets"
            options={MARKET_OPTIONS}
            selectedValues={selectedMarkets}
            onChange={setSelectedMarkets}
            ariaLabel="Filter markets"
          />
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
