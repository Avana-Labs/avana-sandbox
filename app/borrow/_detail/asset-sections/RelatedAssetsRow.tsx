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
      <div className="mb-4">
        <h2 className="text-lg font-medium leading-tight">Related markets</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Same category, different asset.</p>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {detail.related.map((rel) => (
          <li key={rel.id} className="shrink-0">
            <Link
              href={`/borrow/asset/${rel.id}`}
              className="flex w-56 flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
            >
              <TokenSingleCell visual={rel.visual} name={rel.name} subtitle={rel.symbol} size="md" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Borrow APY</span>
                <span className="font-data font-semibold tabular-nums text-foreground">{rel.aprLabel}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Available</span>
                <span className="font-data font-semibold tabular-nums text-foreground">{rel.availableLabel}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
