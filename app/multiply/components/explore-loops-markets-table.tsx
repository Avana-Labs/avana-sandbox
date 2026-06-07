"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LEND_ROWS, PAGE_SIZE } from "./multiply-lend-section"

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
  { label: "All", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/loopscale-icon-light.svg", targetPage: 0 },
  { label: "Bulk", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/logo/bulk.png", targetPage: PROTOCOL_PAGE_INDEX.get("Bulk") },
  {
    label: "Collector Crypt",
    logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/collector-crypto-logo-two.png",
    targetPage: PROTOCOL_PAGE_INDEX.get("Collector Crypt"),
  },
  { label: "Fragmetric", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/organizations/fragmetric-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("Fragmetric") },
  { label: "Hylo", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/hylo.png", targetPage: PROTOCOL_PAGE_INDEX.get("Hylo") },
  { label: "OnRe", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/logo/onre_general.jpeg", targetPage: PROTOCOL_PAGE_INDEX.get("OnRe") },
  { label: "Oro", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/oro-logo.jpg", targetPage: PROTOCOL_PAGE_INDEX.get("Oro") },
  { label: "Solstice", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/solstice-logo.png", targetPage: PROTOCOL_PAGE_INDEX.get("Solstice") },
  { label: "Etherfuse", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/etherfuse-logo.jpg", noActiveRewards: true },
  { label: "Exponent", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/exponent-logo-v1.png", noActiveRewards: true },
  { label: "Flash", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/organizations/flash-trade-logo.jpeg", noActiveRewards: true },
  { label: "RateX", logoSrc: "https://bridgesplit-app.s3.amazonaws.com/organizations/rate-x-logo.jpeg", noActiveRewards: true },
  { label: "xStocks", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/xstocks-logo.jpg", noActiveRewards: true },
  { label: "Zenrock", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/zenrock-logo.png", noActiveRewards: true },
  { label: "Zeus", logoSrc: "https://bridgesplit-app.s3.us-east-1.amazonaws.com/organizations/zeus-logo.jpg", noActiveRewards: true },
]

export function ExploreLoopsMarketsTable() {
  const [page, setPage] = React.useState(0)
  const pageCount = Math.max(1, Math.ceil(LEND_ROWS.length / PAGE_SIZE))
  const visibleRows = LEND_ROWS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="mt-1 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="mt-1 text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">Explore</h2>
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
              {visibleRows.map((row, index) => (
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
