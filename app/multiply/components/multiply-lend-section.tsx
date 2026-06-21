"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import {
  MULTIPLY_MARKET_ROWS,
  type MultiplyMarketRow as LendRow,
} from "@/app/lib/data/mock/shared/multiply"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { hasImageSrc } from "@/lib/image-src"

export {
  MULTIPLY_TOKEN_BORROW_APYS as TOKEN_BORROW_APYS,
  MULTIPLY_TOKEN_LOGOS as TOKEN_LOGOS,
  MULTIPLY_TOKEN_SUPPLY_APYS as TOKEN_SUPPLY_APYS,
} from "@/app/lib/data/mock/shared/multiply"

export const LEND_ROWS: LendRow[] = MULTIPLY_MARKET_ROWS

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
                      {hasImageSrc(row.protocolLogo) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={row.protocolLogo}
                            alt=""
                            aria-hidden="true"
                            className="size-9 shrink-0 rounded-full bg-card object-cover ring-2 ring-background"
                          />
                        </>
                      ) : null}
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
