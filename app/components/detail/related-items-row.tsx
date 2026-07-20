"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type RelatedItemMetric = { label: string; value: string }

export type RelatedItem = {
  key: string
  href: string
  /** Optional per-card background layers (dot grid, gradient, blurred token art). */
  background?: ReactNode
  /** Identity block incl. its own flex wrapper (single icon, token pair, etc.). */
  identity: ReactNode
  metrics: RelatedItemMetric[]
}

/**
 * Shared horizontal carousel of related-market/pool/asset cards used by the
 * borrow, lend, and multiply detail pages. The card shell (link, hover arrow,
 * 2-column metric grid) is identical across verticals; each vertical supplies
 * its own href, background art, and identity block via `items`.
 */
export function RelatedItemsRow({
  sectionId,
  heading,
  items,
  metricLabelClassName = "text-[10px]",
}: {
  sectionId: string
  heading: string
  items: RelatedItem[]
  metricLabelClassName?: string
}) {
  if (items.length === 0) return null
  return (
    <section id={sectionId} className="min-w-0">
      <div className="mb-3">
        <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">{heading}</h2>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              className="group relative flex h-[120px] w-60 flex-col overflow-hidden rounded-radius-lg border border-border bg-surface-raised p-3 shadow-elev-1 transition-all hover:border-border/80 hover:shadow-elev-2"
            >
              {item.background}

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
                {item.identity}
                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                  {item.metrics.map((metric, index) => (
                    <div key={index}>
                      <div className={cn(metricLabelClassName, "text-muted-foreground")}>{metric.label}</div>
                      <div className="mt-0.5 text-[12px] tabular-nums text-foreground">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
