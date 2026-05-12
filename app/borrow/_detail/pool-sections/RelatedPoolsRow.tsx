"use client"

import * as React from "react"
import Link from "next/link"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { TokenPairCell } from "@/app/borrow/components/atoms"

type Props = { detail: PoolDetail }

export function RelatedPoolsRow({ detail }: Props) {
  if (detail.related.length === 0) return null
  return (
    <section className="min-w-0">
      <div className="mb-3">
        <h2 className="text-[14px] font-medium tracking-tight leading-tight text-foreground">Related pools</h2>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">Same spoke, different pair.</p>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {detail.related.map((rel) => (
          <li key={rel.id} className="shrink-0">
            <Link
              href={`/borrow/pool/${rel.id}`}
              className="flex w-60 flex-col gap-3 rounded-radius-md border border-border bg-surface-raised p-3.5 shadow-elev-1 transition-colors hover:bg-surface-inset"
            >
              <TokenPairCell visuals={rel.visuals} name={rel.name} subtitle={rel.venue} size="sm" />
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">Supply APY</span>
                <span className="font-data font-medium tabular-nums text-foreground">{rel.aprLabel}</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">Available</span>
                <span className="font-data font-medium tabular-nums text-foreground">{rel.availableLabel}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
