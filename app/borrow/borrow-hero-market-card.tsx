"use client"

import Link from "next/link"
import type { BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import { cn } from "@/lib/utils"
import { TokenPairCell } from "./components/atoms"

export type HeroMarketCardProps = {
  title: string
  subtitle?: string
  hideTitleOnMobile?: boolean
  className?: string
  rows: Array<{
    id: string
    href: string
    pool: BorrowPoolRow
    title: string
    subtitle: string
    value: string
    delta: string
    deltaClassName: string
  }>
}

export function HeroMarketCard({ title, subtitle, hideTitleOnMobile = false, className, rows }: HeroMarketCardProps) {
  return (
    <section
      className={cn(
        "min-w-[19rem] max-w-[19rem] shrink-0 rounded-radius-md border-0 bg-card p-3.5 shadow-none md:min-w-[20rem] md:max-w-[20rem] md:p-4",
        className,
      )}
    >
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

      <div className="space-y-3.5">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="flex items-center gap-3 rounded-xs px-1 py-1 transition-colors hover:bg-surface-inset"
          >
            <div className="min-w-0 flex-1">
              <TokenPairCell visuals={row.pool.visuals} name={row.title} subtitle={row.subtitle} size="md" />
            </div>

            <div className="ml-auto flex min-w-0 shrink-0 flex-col items-end gap-1 text-right">
              <div className="font-data text-[13px] font-medium tabular-nums leading-tight tracking-tight text-foreground md:text-[14px]">
                {row.value}
              </div>
              <div className={cn("font-data text-[11px] font-medium tabular-nums leading-tight md:text-[12px]", row.deltaClassName)}>
                {row.delta}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
