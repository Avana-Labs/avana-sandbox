"use client"

import Link from "next/link"
import type { BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import { cn } from "@/lib/utils"
import { TokenBubble } from "./components/atoms"

export type HeroMarketCardProps = {
  title?: string
  subtitle?: string
  hideTitleOnMobile?: boolean
  className?: string
  rows: Array<{
    id: string
    href: string
    pool: BorrowPoolRow
    title: string
    value: string
    delta: string
    deltaClassName: string
  }>
}

export function HeroMarketCard({ title, subtitle, hideTitleOnMobile = false, className, rows }: HeroMarketCardProps) {
  return (
    <section
      data-carousel-card
      className={cn(
        "min-w-[19rem] max-w-[19rem] shrink-0 rounded-radius-md border-0 bg-card p-3.5 shadow-none md:min-w-[20rem] md:max-w-[20rem] md:p-4",
        className,
      )}
    >
      {title ? (
        <div className="mb-3">
          <h3
            className={cn(
              "text-[14px] tracking-tight text-foreground md:text-[15px]",
              hideTitleOnMobile ? "hidden md:block" : "",
            )}
          >
            {title}
          </h3>
          {subtitle ? <p className="mt-0.5 text-[11.5px] leading-4 text-muted-foreground">{subtitle}</p> : null}
        </div>
      ) : null}

      <div className="space-y-3.5">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="flex items-center gap-3 rounded-xs px-1 py-1 transition-colors hover:bg-hover"
          >
            <div className="flex shrink-0 items-center">
              <TokenBubble visual={row.pool.visuals[0]} size="table" />
              <TokenBubble visual={row.pool.visuals[1]} size="table" className="-ml-2.5" />
            </div>

            {/* Metrics sit BELOW the pair name (not in a right-hand column) so long
             * market names like "Fix USDC / GOOGLc" get the full row width and no
             * longer wrap to three lines. The venue subtitle is dropped for the
             * same reason. */}
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-normal leading-tight tracking-normal text-foreground dark:text-white">
                {row.title}
              </div>
              <div className="mt-1 flex items-center gap-x-1.5 font-data text-[12px] font-medium leading-tight">
                <span className="tabular-nums text-foreground">{row.value}</span>
                <span className="text-muted-foreground">·</span>
                <span className={cn("tabular-nums", row.deltaClassName)}>{row.delta}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
