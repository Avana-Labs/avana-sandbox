"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RewardRow = {
  label: string
  value: string
}

export type LendRow = {
  href: string
  protocol: string
  protocolLogo: string
  asset: string
  kind: "Lend" | "Loop" | "Borrow"
  apy: string
  apyLabel: string
  partnerRewards?: string
  points?: string
  rewardRows?: RewardRow[]
  waitlistHref?: string
}

export const TOKEN_LOGOS = {
  ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  stETH: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png",
  wstETH: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png",
  rETH: "https://cryptologos.cc/logos/rocket-pool-rpl-logo.png",
  cbETH: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  USDT: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  DAI: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png",
  GHO: "https://cryptologos.cc/logos/aave-aave-logo.png",
  crvUSD: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png",
  EURC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  WBTC: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png",
  cbBTC: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  AAVE: "https://cryptologos.cc/logos/aave-aave-logo.png",
  UNI: "https://cryptologos.cc/logos/uniswap-uni-logo.png",
  CRV: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png",
} as const

export const TOKEN_SUPPLY_APYS: Partial<Record<keyof typeof TOKEN_LOGOS, string>> = {
  ETH: "3.82%",
  stETH: "4.14%",
  wstETH: "5.14%",
  rETH: "4.87%",
  cbETH: "4.62%",
  USDC: "5.20%",
  USDT: "4.80%",
  DAI: "4.01%",
  GHO: "2.99%",
  crvUSD: "4.40%",
  EURC: "0.49%",
  WBTC: "3.48%",
  cbBTC: "4.25%",
  AAVE: "7.60%",
  UNI: "6.40%",
  CRV: "5.45%",
}

export const TOKEN_BORROW_APYS: Partial<Record<keyof typeof TOKEN_LOGOS, string>> = {
  ETH: "4.00%",
  stETH: "3.40%",
  wstETH: "3.40%",
  rETH: "3.50%",
  cbETH: "3.60%",
  USDC: "5.20%",
  USDT: "4.80%",
  DAI: "5.70%",
  GHO: "3.90%",
  crvUSD: "4.40%",
  EURC: "4.10%",
  WBTC: "3.70%",
  cbBTC: "3.90%",
  AAVE: "4.50%",
  UNI: "4.20%",
  CRV: "5.10%",
}

const TOKEN_IDS: Partial<Record<keyof typeof TOKEN_LOGOS, string>> = {
  ETH: "eth",
  stETH: "steth",
  wstETH: "wsteth",
  rETH: "reth",
  cbETH: "cbeth",
  USDT: "usdt",
  USDC: "usdc",
  DAI: "dai",
  GHO: "gho",
  crvUSD: "crvusd",
  EURC: "eurc",
  WBTC: "wbtc",
  cbBTC: "cbbtc",
  AAVE: "aave",
  UNI: "uni",
  CRV: "crv",
}

const TOKEN_AVAILABLE_USD: Partial<Record<keyof typeof TOKEN_LOGOS, number>> = {
  ETH: 5_000_000,
  stETH: 7_500_000,
  wstETH: 6_600_000,
  rETH: 3_100_000,
  cbETH: 2_400_000,
  USDT: 7_200_000,
  USDC: 9_900_000,
  DAI: 6_600_000,
  GHO: 9_100_000,
  crvUSD: 5_100_000,
  EURC: 2_500_000,
  WBTC: 6_100_000,
  cbBTC: 3_400_000,
  AAVE: 3_500_000,
  UNI: 2_800_000,
  CRV: 1_900_000,
}

const COLLATERAL_FACTORS: Partial<Record<keyof typeof TOKEN_LOGOS, number>> = {
  ETH: 0.8,
  stETH: 0.88,
  wstETH: 0.91,
  rETH: 0.89,
  cbETH: 0.86,
  USDT: 0.85,
  USDC: 0.87,
  DAI: 0.85,
  GHO: 0.78,
  crvUSD: 0.8,
  EURC: 0.75,
  WBTC: 0.8,
  cbBTC: 0.78,
  AAVE: 0.7,
  UNI: 0.68,
  CRV: 0.6,
}

const LIQUIDATION_THRESHOLDS: Partial<Record<keyof typeof TOKEN_LOGOS, number>> = {
  ETH: 0.83,
  stETH: 0.9,
  wstETH: 0.93,
  rETH: 0.91,
  cbETH: 0.89,
  USDT: 0.88,
  USDC: 0.9,
  DAI: 0.88,
  GHO: 0.82,
  crvUSD: 0.84,
  EURC: 0.8,
  WBTC: 0.83,
  cbBTC: 0.81,
  AAVE: 0.75,
  UNI: 0.73,
  CRV: 0.68,
}

const LOOP_DEFINITIONS: Array<{ collateral: keyof typeof TOKEN_LOGOS; borrowable: keyof typeof TOKEN_LOGOS }> = [
  { collateral: "wstETH", borrowable: "ETH" },
  { collateral: "stETH", borrowable: "ETH" },
  { collateral: "rETH", borrowable: "ETH" },
  { collateral: "cbETH", borrowable: "ETH" },
  { collateral: "ETH", borrowable: "wstETH" },
  { collateral: "ETH", borrowable: "USDT" },
  { collateral: "ETH", borrowable: "GHO" },
  { collateral: "USDC", borrowable: "USDT" },
  { collateral: "USDC", borrowable: "GHO" },
  { collateral: "DAI", borrowable: "USDT" },
  { collateral: "DAI", borrowable: "GHO" },
  { collateral: "crvUSD", borrowable: "USDT" },
  { collateral: "EURC", borrowable: "GHO" },
  { collateral: "WBTC", borrowable: "cbBTC" },
  { collateral: "WBTC", borrowable: "USDT" },
  { collateral: "cbBTC", borrowable: "WBTC" },
  { collateral: "cbBTC", borrowable: "USDT" },
  { collateral: "AAVE", borrowable: "GHO" },
  { collateral: "UNI", borrowable: "USDC" },
  { collateral: "CRV", borrowable: "crvUSD" },
]

function parsePct(value?: string) {
  if (!value) return 0
  return Number.parseFloat(value.replace("%", "")) || 0
}

function formatPct(value: number) {
  return `${value.toFixed(2)}%`
}

function formatFactor(value: number) {
  return `${value.toFixed(2)}x`
}

function buildLoopRow(collateral: keyof typeof TOKEN_LOGOS, borrowable: keyof typeof TOKEN_LOGOS): LendRow | null {
  const supplyApy = parsePct(TOKEN_SUPPLY_APYS[collateral])
  const borrowApy = parsePct(TOKEN_BORROW_APYS[borrowable])
  const cf = COLLATERAL_FACTORS[collateral]
  const lt = LIQUIDATION_THRESHOLDS[collateral]
  const collateralId = TOKEN_IDS[collateral]
  const availableUsd = TOKEN_AVAILABLE_USD[borrowable]

  if (!cf || !lt || !collateralId || !availableUsd) return null

  const maxLeverage = 1 / (1 - lt)
  const maxLoopApy = maxLeverage * supplyApy - (maxLeverage - 1) * borrowApy

  return {
    href: `/borrow/asset/${collateralId}`,
    protocol: collateral,
    protocolLogo: TOKEN_LOGOS[collateral],
    asset: borrowable,
    kind: "Loop",
    apy: formatPct(maxLoopApy),
    apyLabel: "APY derived from supply and borrow APRs",
    points: formatCompactUsd(availableUsd),
    rewardRows: [{ label: `CF ${Math.round(cf * 100)}% · LT ${Math.round(lt * 100)}%`, value: formatFactor(maxLeverage) }],
  }
}

export const LEND_ROWS: LendRow[] = LOOP_DEFINITIONS.map(({ collateral, borrowable }) => buildLoopRow(collateral, borrowable)).filter(
  (row): row is LendRow => Boolean(row),
)

export const PAGE_SIZE = 12

export function MultiplyLendSection() {
  const [page, setPage] = React.useState(0)
  const pageCount = Math.max(1, Math.ceil(LEND_ROWS.length / PAGE_SIZE))
  const visibleRows = LEND_ROWS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="mt-1 space-y-4">
      <InlineTableSection
        title="Lend"
        rows={visibleRows}
        pagination={
          <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2.5">
            <span className="text-[12px] text-muted-foreground">
              {page + 1} of {pageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next page"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />
    </section>
  )
}

function InlineTableSection({ rows, pagination }: { title: string; rows: LendRow[]; pagination?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div />

      <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pt-3 pl-5 text-[10.5px] font-medium uppercase tracking-[0.06em]">Protocol</th>
                <th className="pb-2 pt-3 pl-4 text-left text-[10.5px] font-medium uppercase tracking-[0.06em]">Asset</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">APY</th>
                <th className="pb-2 pt-3 pl-4 text-left text-[10.5px] font-medium uppercase tracking-[0.06em]">Partner Rewards</th>
                <th className="pb-2 pt-3 pl-4 pr-5 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => (
                <tr key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`} className="transition-colors hover:bg-surface-inset/60">
                  <td className="py-2.5 pl-5">
                    <CellLink href={row.href} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.protocolLogo}
                        alt=""
                        aria-hidden="true"
                        className="size-9 shrink-0 rounded-full bg-card object-cover ring-2 ring-background"
                      />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium leading-tight text-foreground">{row.protocol}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.kind}</span>
                      </span>
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4">
                    <CellLink href={row.href} className="min-w-0">
                      <span className="block text-[14px] font-medium leading-tight text-foreground">{row.asset}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.apyLabel}</span>
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <CellLink
                      href={row.href}
                      className={cn(
                        "font-data text-[13px] font-medium tabular-nums",
                        row.apy ? (row.apy.startsWith("-") ? "text-rose-600" : "text-emerald-600") : "text-muted-foreground",
                      )}
                    >
                      {row.apy || "—"}
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4">
                    <CellLink href={row.href} className="text-foreground">
                      {row.rewardRows?.[1] ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground">{row.rewardRows[1].label}</span>
                          <span className="font-data tabular-nums text-foreground">{row.rewardRows[1].value}</span>
                        </span>
                      ) : row.rewardRows?.[0] ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground">{row.rewardRows[0].label}</span>
                          <span className="font-data tabular-nums text-foreground">{row.rewardRows[0].value}</span>
                        </span>
                      ) : row.partnerRewards ? (
                        row.partnerRewards
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </CellLink>
                  </td>
                  <td className="py-2.5 pl-4 pr-5 text-right">
                    {row.waitlistHref ? (
                      <div className="inline-flex items-center">
                        <Button asChild size="sm" className="h-7 rounded-xs px-2.5 text-[12px]">
                          <a href={row.waitlistHref} target="_blank" rel="noreferrer">
                            Join waitlist
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <CellLink href={row.href} className="inline-flex items-center justify-end gap-1 font-medium text-foreground">
                        <Star className="h-3 w-3" />
                        <span>{row.points ?? "—"}</span>
                      </CellLink>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination}
    </div>
  )
}

function CellLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("block text-left", className)}>
      {children}
    </Link>
  )
}
