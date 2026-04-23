"use client"

import * as React from "react"
import Link from "next/link"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { TokenSingleCell } from "@/app/borrow/components/atoms"

type Props = { detail: AssetDetail }

export function RelatedAssetsRow({ detail }: Props) {
  if (detail.related.length === 0) return null
  return (
    <section className="min-w-0">
      <div className="mb-3">
        <h2 className="text-[14px] font-medium tracking-tight leading-tight text-foreground">Related markets</h2>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">Same category, different asset.</p>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {detail.related.map((rel) => (
          <li key={rel.id} className="shrink-0">
            <Link
              href={`/borrow/asset/${rel.id}`}
              className="flex w-56 flex-col gap-3 rounded-radius-md border border-border bg-surface-raised p-3.5 shadow-elev-1 transition-colors hover:bg-surface-inset"
            >
              <TokenSingleCell visual={rel.visual} name={rel.name} subtitle={rel.symbol} size="sm" />
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">Borrow APY</span>
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
