"use client"

import Link from "next/link"
import type { PortfolioStrategyBucket } from "@/app/lib/data/providers/portfolio"
import { actionPagePath } from "@/app/lib/action-system/contracts"

function formatApy(value: number) {
  return `${value.toFixed(1)}%`
}

export function PortfolioLendingOpportunities({ buckets }: { buckets: PortfolioStrategyBucket[] }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">Lending Opportunities</h2>
        <Link
          href={actionPagePath("lend", "deposit")}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          View markets
        </Link>
      </div>

      {buckets.length === 0 ? (
        <p className="py-6 text-[14px] text-muted-foreground">
          No curated opportunities right now. Browse markets on the lend page to supply assets.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {buckets.map((bucket) => (
            <article key={bucket.title} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-[15px] font-medium tracking-[-0.02em] text-foreground">{bucket.title}</h3>
                <span className="font-data text-[13px] tabular-nums text-muted-foreground">{bucket.apyRangeLabel}</span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{bucket.description}</p>
              <ul className="mt-4 space-y-3">
                {bucket.pools.map((pool) => (
                  <li key={pool.name} className="flex items-center justify-between gap-4 text-[14px]">
                    <span className="min-w-0 truncate text-foreground">{pool.name}</span>
                    <span className="shrink-0 font-data tabular-nums text-foreground">{formatApy(pool.apyPct)}</span>
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
