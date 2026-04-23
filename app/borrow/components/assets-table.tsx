"use client"

import {
  BORROWABLE_CATEGORIES,
  aprToneClass,
  formatCompactUsd,
  utilizationToneClass,
  type BorrowableAsset,
  type BorrowableAssetCategory,
} from "@/app/lib/borrow-sim"
import Link from "next/link"
import { PillButton, TokenBubble, TokenSingleCell, TrendSpark } from "./atoms"
import { cn } from "@/lib/utils"

type AssetsTableProps = {
  rows: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
  onViewMarket?: (asset: BorrowableAsset) => void
}

export function AssetsPanel({ rows, onBorrow, onViewMarket }: AssetsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        No assets match your filter.
      </div>
    )
  }

  const groups = BORROWABLE_CATEGORIES.map((cat) => ({
    ...cat,
    assets: rows.filter((row) => row.category === cat.id),
  })).filter((group) => group.assets.length > 0)

  return (
    <div>
      <div className="hidden space-y-8 md:block">
        {groups.map((group) => (
          <AssetsSection
            key={group.id}
            label={group.label}
            dotClass={group.dotClass}
            assets={group.assets}
            onBorrow={onBorrow}
          />
        ))}
      </div>

      <div className="space-y-6 md:hidden">
        {groups.map((group) => (
          <section key={group.id} className="space-y-2">
            <div className="mb-1">
              <h3 className="text-[14px] font-medium tracking-tight">{group.label}</h3>
            </div>
            <ul className="space-y-2">
              {group.assets.map((asset) => {
                const aprTone = aprToneClass(asset.borrowApr)
                return (
                  <li
                    key={asset.id}
                    className="space-y-3 rounded-radius-md border border-border bg-surface-raised px-4 py-4 shadow-elev-1"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <TokenBubble visual={asset.visual} size="md" />
                        <div className="min-w-0">
                          <div className="text-[14px] font-medium text-foreground">{asset.symbol}</div>
                          <div className="text-[12px] text-muted-foreground">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("flex items-center justify-end gap-1 font-data text-[18px] font-medium tabular-nums", aprTone)}>
                          {asset.borrowApr.toFixed(2)}%
                        </div>
                        <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Borrow APR</div>
                      </div>
                    </div>

                    <dl className="divide-y divide-border text-[12.5px]">
                      <AssetStatLine label="Available to Borrow" value={formatCompactUsd(asset.availableUsd)} />
                      <AssetStatLine label="Total Borrowed" value={formatCompactUsd(asset.totalBorrowedUsd)} />
                      <AssetStatLine
                        label="Utilization"
                        value={`${asset.utilization}%`}
                        tone={utilizationToneClass(asset.utilization)}
                      />
                    </dl>

                    <div className="flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => onBorrow(asset)}
                        className="flex-[2] rounded-radius-sm bg-accent-primary px-4 py-2.5 text-center text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
                      >
                        Borrow
                      </button>
                      <Link
                        href={`/borrow/asset/${asset.id}`}
                        onClick={() => onViewMarket?.(asset)}
                        className="flex flex-1 items-center justify-center rounded-radius-sm border border-border bg-surface-raised px-4 py-2.5 text-center text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
                      >
                        Details
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function AssetsSection({
  label,
  dotClass,
  assets,
  onBorrow,
}: {
  label: string
  dotClass: string
  assets: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
}) {
  return (
    <section className="mb-2">
      <div className="mb-3">
        <h3 className="text-[14px] font-medium tracking-tight">{label}</h3>
      </div>

      <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pt-3 pl-5 text-[10.5px] font-medium uppercase tracking-[0.06em]">Asset</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Borrow APR</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Utilization</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Available</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Wallet Balance</th>
                <th className="w-20 pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">7D</th>
                <th className="w-44 pb-2 pt-3 pl-4 pr-5 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => (
                <tr key={asset.id} className="transition-colors hover:bg-surface-inset/60">
                  <td className="py-2.5 pl-5">
                    <TokenSingleCell visual={asset.visual} name={asset.name} subtitle={asset.subtitle} size="md" />
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <span className={cn("font-data text-[13px] font-medium tabular-nums", aprToneClass(asset.borrowApr))}>
                      {asset.borrowApr.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <span className={cn("font-data text-[13px] font-medium tabular-nums", utilizationToneClass(asset.utilization))}>
                      {asset.utilization}%
                    </span>
                  </td>
                  <td className="py-2.5 pl-4 text-right font-data text-[13px] tabular-nums text-foreground">
                    {formatCompactUsd(asset.availableUsd)}
                  </td>
                  <td className={cn("py-2.5 pl-4 text-right font-data text-[13px] tabular-nums", asset.hasWalletBalance ? "text-foreground" : "text-muted-foreground")}>
                    {asset.walletBalanceLabel}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="flex justify-end">
                      <TrendSpark isPositive={asset.trendUp} seed={`asset-${asset.id}`} values={asset.trendValues} />
                    </div>
                  </td>
                  <td className="py-2.5 pl-4 pr-5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/borrow/asset/${asset.id}`}
                        className="inline-flex h-7 items-center rounded-xs border border-border bg-surface-raised px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
                      >
                        Details
                      </Link>
                      <PillButton variant="primary" onClick={() => onBorrow(asset)}>
                        Borrow
                      </PillButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function AssetStatLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-data font-medium tabular-nums text-foreground", tone)}>{value}</dd>
    </div>
  )
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M8 1.5l1.35 3.65L13 6.5l-3.65 1.35L8 11.5 6.65 7.85 3 6.5l3.65-1.35L8 1.5z"
        fill="currentColor"
      />
    </svg>
  )
}
