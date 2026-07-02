"use client"

import Link from "next/link"
import type { PortfolioStrategyBucket } from "@/app/lib/data/providers/portfolio"
import { actionPagePath } from "@/app/lib/action-system/contracts"

function formatApy(value: number) {
  return `${value.toFixed(1)}%`
}

export function PortfolioLendingOpportunities({
  buckets,
  returnHref,
}: {
  buckets: PortfolioStrategyBucket[]
  returnHref?: string
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">Lending Opportunities</h2>
        <Link href={actionPagePath("lend", "deposit", returnHref ? { return: returnHref } : undefined)} className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          View markets
        </Link>
      </div>

      {buckets.length === 0 ? (
        <p className="py-6 text-[14px] text-muted-foreground">
          No curated opportunities right now. Browse markets on the lend page to supply assets.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buckets.map((bucket) => (
            <article
              key={bucket.title}
              className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-elev-1 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] font-medium tracking-[-0.02em] text-foreground">{bucket.title}</h3>
                <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-data text-[12px] font-medium tabular-nums text-success">
                  {bucket.apyRangeLabel}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{bucket.description}</p>
              <ul className="mt-4 space-y-2 border-t border-border/60 pt-3">
                {bucket.pools.map((pool) => (
                  <li key={pool.name} className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="min-w-0 truncate text-foreground">{pool.name}</span>
                    <span className="shrink-0 font-data tabular-nums text-success">{formatApy(pool.apyPct)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
