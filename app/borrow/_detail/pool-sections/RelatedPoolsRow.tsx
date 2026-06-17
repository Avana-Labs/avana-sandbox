"use client"

import Link from "next/link"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { TokenPairCell } from "@/app/borrow/components/atoms"

type Props = { detail: PoolDetail }

export function RelatedPoolsRow({ detail }: Props) {
  if (detail.related.length === 0) return null
  return (
    <section id="related-pools" className="min-w-0">
      <div className="mb-3">
        <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-[hsl(var(--brand))]">Related pools</h2>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {detail.related.map((rel) => (
          <li key={rel.id} className="shrink-0">
            <Link
              href={`/borrow/pool/${rel.id}`}
              className="group relative flex h-[120px] w-60 flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised p-3 shadow-elev-1 transition-all hover:border-border/80 hover:shadow-elev-2"
            >
              <div className="pointer-events-none absolute inset-0 z-0 opacity-100 [background-image:radial-gradient(circle,rgba(148,163,184,0.14)_1px,transparent_1.15px)] [background-position:0_4px] [background-size:16px_16px] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1.15px)]" />
              <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.004))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.012),rgba(255,255,255,0.003))]" />

              {rel.visuals[0].iconUrl || rel.visuals[1].iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  aria-hidden="true"
                  width="160"
                  height="160"
                  className="pointer-events-none absolute -left-12 -top-12 size-[320px] rounded-full object-cover opacity-20 blur-3xl saturate-150 mix-blend-screen"
                  loading="lazy"
                  decoding="async"
                  src={rel.visuals[0].iconUrl ?? rel.visuals[1].iconUrl}
                />
              ) : null}

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
                <div className="flex items-start gap-3">
                  <TokenPairCell visuals={rel.visuals} name={rel.name} size="sm" />
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                  <div>
                  <div className="text-[9px] text-muted-foreground">Supply APY</div>
                  <div className="mt-0.5 text-[12px] tabular-nums text-foreground">{rel.aprLabel}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">Available</div>
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
