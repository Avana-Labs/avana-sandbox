"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LEND_ROWS, PAGE_SIZE, TOKEN_BORROW_APYS, TOKEN_LOGOS, TOKEN_SUPPLY_APYS } from "./multiply-lend-section"

type Partner = {
  label: string
  logoSrc: string
  noActiveRewards?: boolean
}

type ExploreLoopsMarketsPartner = Partner & {
  targetPage?: number
}

const PROTOCOL_PAGE_INDEX = new Map<string, number>()

LEND_ROWS.forEach((row, index) => {
  if (!PROTOCOL_PAGE_INDEX.has(row.protocol)) {
    PROTOCOL_PAGE_INDEX.set(row.protocol, Math.floor(index / PAGE_SIZE))
  }
})

const PARTNERS: ExploreLoopsMarketsPartner[] = [
  { label: "All", logoSrc: "https://cryptologos.cc/logos/aave-aave-logo.png", targetPage: 0 },
  { label: "ETH", logoSrc: "https://cryptologos.cc/logos/ethereum-eth-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("ETH") },
  { label: "stETH", logoSrc: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("stETH") },
  { label: "wstETH", logoSrc: "https://cryptologos.cc/logos/lido-dao-ldo-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("wstETH") },
  { label: "USDC", logoSrc: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("USDC") },
  { label: "USDT", logoSrc: "https://cryptologos.cc/logos/tether-usdt-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("USDT") },
  { label: "DAI", logoSrc: "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("DAI") },
  { label: "crvUSD", logoSrc: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("crvUSD") },
  { label: "EURC", logoSrc: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("EURC") },
  { label: "WBTC", logoSrc: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("WBTC") },
  { label: "cbBTC", logoSrc: "https://cryptologos.cc/logos/bitcoin-btc-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("cbBTC") },
]

export function ExploreLoopsMarketsTable() {
  const [page, setPage] = React.useState(0)
  const [sortKey, setSortKey] = React.useState<"protocol" | "asset" | "apy" | "rewards" | "points">("protocol")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const pageCount = Math.max(1, Math.ceil(LEND_ROWS.length / PAGE_SIZE))
  const sortedRows = React.useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1
    const parseValue = (value?: string) => {
      if (!value) return Number.NEGATIVE_INFINITY
      const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
      return Number.isFinite(numeric) ? numeric : Number.NEGATIVE_INFINITY
    }

    return [...LEND_ROWS].sort((a, b) => {
      switch (sortKey) {
        case "asset":
          return a.asset.localeCompare(b.asset) * direction
        case "apy":
          return (parseValue(a.apy) - parseValue(b.apy)) * direction
        case "rewards":
          return (
            parseValue(a.rewardRows?.[1]?.value ?? a.rewardRows?.[0]?.value ?? a.partnerRewards) -
            parseValue(b.rewardRows?.[1]?.value ?? b.rewardRows?.[0]?.value ?? b.partnerRewards)
          ) * direction
        case "points":
          return (parseValue(a.points) - parseValue(b.points)) * direction
        case "protocol":
        default:
          return a.protocol.localeCompare(b.protocol) * direction
      }
    })
  }, [sortDirection, sortKey])
  const visibleRows = sortedRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "protocol" || nextKey === "asset" ? "asc" : "desc")
  }

  const getAssetLogo = (asset: string) => TOKEN_LOGOS[asset as keyof typeof TOKEN_LOGOS]
  const getSupplyApy = (asset: string) => TOKEN_SUPPLY_APYS[asset as keyof typeof TOKEN_SUPPLY_APYS]
  const getBorrowApy = (asset: string) => TOKEN_BORROW_APYS[asset as keyof typeof TOKEN_BORROW_APYS]

  return (
    <section className="mt-1 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">Explore</h2>
        </div>
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
          {PARTNERS.map((partner) => (
            <PartnerCard
              key={partner.label}
              partner={partner}
              active={partner.targetPage !== undefined && page === partner.targetPage}
              onClick={() => setPage(partner.targetPage ?? 0)}
            />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-surface-raised shadow-elev-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-[12px] lg:min-w-full">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground dark:border-white/6 dark:text-white/52">
                <th className="pb-3 pt-4 pl-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("protocol")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "protocol" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>COLLATERAL</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("asset")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "asset" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>BORROWABLE</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("apy")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "apy" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>MAX APY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("rewards")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "rewards" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>MAX LEVERAGE</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="pb-3 pt-4 px-4 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  <button
                    type="button"
                    onClick={() => toggleSort("points")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "points" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                    )}
                  >
                    <span>AVAILABLE</span>
                    <SortIcon />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody key={`multiply-${sortKey}-${sortDirection}-${visibleRows.length}`} className="divide-y divide-border dark:divide-white/6">
              {visibleRows.map((row, index) => (
                <tr key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`} className="asset-swap border-t border-border transition-colors hover:bg-surface-inset/60" style={{ animationDelay: `${index * 40}ms` }}>
                  <td className="py-2.5 pl-6 pr-4">
                    <CellLink href={row.href} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.protocolLogo}
                        alt=""
                        aria-hidden="true"
                        className="size-11 shrink-0 rounded-full bg-card object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">{row.protocol}</span>
                        <span className="mt-1 inline-flex items-center gap-1.5 truncate text-[13px] font-normal tracking-[-0.03em]">
                          <span className="text-muted-foreground dark:text-white/38">APY</span>
                          <span className="font-data tabular-nums text-emerald-600 dark:text-emerald-400">
                            {getSupplyApy(row.protocol) ?? "—"}
                          </span>
                        </span>
                      </span>
                    </CellLink>
                  </td>
                  <td className="py-2.5 px-4">
                    <CellLink href={row.href} className="flex min-w-0 items-center gap-3">
                      {getAssetLogo(row.asset) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getAssetLogo(row.asset)}
                            alt=""
                            aria-hidden="true"
                            className="size-11 shrink-0 rounded-full bg-card object-cover"
                          />
                        </>
                      ) : null}
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">{row.asset}</span>
                        <span className="mt-1 inline-flex items-center gap-1.5 truncate text-[13px] font-normal tracking-[-0.03em]">
                          <span className="text-muted-foreground dark:text-white/38">APY</span>
                          <span className="font-data tabular-nums text-rose-600 dark:text-rose-400">
                            {getBorrowApy(row.asset) ?? "—"}
                          </span>
                        </span>
                      </span>
                    </CellLink>
                  </td>
                  <td className="py-2.5 px-4">
                    <CellLink
                      href={row.href}
                      className={cn(
                        "font-data text-[15px] font-normal tracking-[-0.03em] tabular-nums",
                        row.apy ? (row.apy.startsWith("-") ? "text-rose-600" : "text-emerald-600") : "text-muted-foreground",
                      )}
                    >
                      {row.apy || "—"}
                    </CellLink>
                  </td>
                  <td className="py-2.5 px-4">
                    <CellLink href={row.href} className="text-foreground">
                      {row.rewardRows?.[1] ? (
                        <span className="block">
                          <span className="block text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">{row.rewardRows[1].value}</span>
                          <span className="mt-1 block text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">{row.rewardRows[1].label}</span>
                        </span>
                      ) : row.rewardRows?.[0] ? (
                        <span className="block">
                          <span className="block text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">{row.rewardRows[0].value}</span>
                          <span className="mt-1 block text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">{row.rewardRows[0].label}</span>
                        </span>
                      ) : row.partnerRewards ? (
                        <span className="block text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">{row.partnerRewards}</span>
                      ) : (
                        <span className="block text-[15px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">—</span>
                      )}
                    </CellLink>
                  </td>
                  <td className="py-2.5 px-4 pr-6">
                    {row.waitlistHref ? (
                      <div className="inline-flex items-center">
                        <Button asChild size="sm" className="h-7 rounded-xs px-2.5 text-[12px]">
                          <a href={row.waitlistHref} target="_blank" rel="noreferrer">
                            Join waitlist
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <CellLink href={row.href} className="inline-flex items-center text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                        <span>{row.points ?? "—"}</span>
                      </CellLink>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
      </div>
    </section>
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

function PartnerCard({
  partner,
  active,
  onClick,
}: {
  partner: Partner
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 bg-transparent px-0.5 py-0.5 transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]",
      )}
      aria-pressed={active}
    >
      <div className="flex h-full w-[108px] flex-col items-center justify-center gap-1.5 px-2 py-1.5">
        <div
          className={cn(
            "flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-background transition-transform duration-150",
            active ? "scale-[1.02]" : "",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={partner.logoSrc} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        </div>
        <p className={cn("max-w-full truncate text-center text-[12px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
          {partner.label}
        </p>
      </div>
    </button>
  )
}

function CellLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("block text-left", className)}>
      {children}
    </Link>
  )
}
