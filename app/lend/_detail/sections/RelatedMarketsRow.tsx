"use client"

import Link from "next/link"
import type { LendMarketDetail } from "@/app/lib/lend-detail"

type Props = { detail: LendMarketDetail }

export function RelatedMarketsRow({ detail }: Props) {
  if (detail.related.length === 0) return null
  return (
    <section id="related-markets" className="min-w-0">
      <div className="mb-3">
        <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">Related markets</h2>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {detail.related.map((rel) => (
          <li key={rel.id} className="shrink-0">
            <Link
              href={`/lend/markets/${rel.id}`}
              className="group relative flex h-[120px] w-60 flex-col overflow-hidden rounded-radius-lg border border-border bg-surface-raised p-3 shadow-elev-1 transition-all hover:border-border/80 hover:shadow-elev-2"
            >
              <div className="pointer-events-none absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border border-border bg-background/80 shadow-sm backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-text-extra-low transition-colors group-hover:text-text-low"
                  aria-hidden="true"
                >
                  <path d="M7 7h10v10" />
                  <path d="M7 17 17 7" />
                </svg>
              </div>

              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center" aria-hidden="true">
                    {rel.visual.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rel.visual.iconUrl} alt="" className="size-8 object-contain" width={32} height={32} loading="lazy" />
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground">{rel.visual.shortLabel}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{rel.name}</div>
                    <div className="text-[11px] text-muted-foreground">{rel.symbol}</div>
                  </div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Total APY</div>
                    <div className="mt-0.5 text-[12px] tabular-nums text-foreground">{rel.apyLabel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Available</div>
                    <div className="mt-0.5 text-[12px] tabular-nums text-foreground">{rel.availableLabel}</div>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
