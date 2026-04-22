"use client"

import {
  BORROWABLE_CATEGORIES,
  aprToneClass,
  formatCompactUsd,
  utilizationToneClass,
  type BorrowableAsset,
  type BorrowableAssetCategory,
} from "@/app/lib/borrow-sim"
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
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
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
          <section key={group.id} className="space-y-3">
            <div className="px-1">
              <h3 className="text-base font-semibold text-slate-900">{group.label}</h3>
            </div>
            <ul className="space-y-3">
              {group.assets.map((asset) => {
                const aprTone = aprToneClass(asset.borrowApr)
                return (
                  <li
                    key={asset.id}
                    className="space-y-4 rounded-3xl bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <TokenBubble visual={asset.visual} size="lg" />
                        <div className="min-w-0">
                          <div className="text-[18px] font-semibold text-slate-900">{asset.symbol}</div>
                          <div className="text-sm text-slate-400">{asset.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("flex items-center justify-end gap-1.5 font-data text-[22px] font-semibold tabular-nums", aprTone)}>
                          <SparkIcon className={cn("size-3.5", aprTone)} />
                          {asset.borrowApr.toFixed(2)}%
                        </div>
                        <div className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Borrow APR</div>
                      </div>
                    </div>

                    <dl className="divide-y divide-slate-100 text-sm">
                      <AssetStatLine label="Available to Borrow" value={formatCompactUsd(asset.availableUsd)} />
                      <AssetStatLine label="Total Borrowed" value={formatCompactUsd(asset.totalBorrowedUsd)} />
                      <AssetStatLine
                        label="Utilization"
                        value={`${asset.utilization}%`}
                        tone={utilizationToneClass(asset.utilization)}
                      />
                    </dl>

                    <div className="flex items-stretch gap-3">
                      <button
                        type="button"
                        onClick={() => onBorrow(asset)}
                        className="flex-[2] rounded-2xl bg-rose-500 px-5 py-3.5 text-center text-[15px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(244,63,94,0.55)] transition-colors hover:bg-rose-600"
                      >
                        Borrow
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewMarket?.(asset)}
                        className="flex-1 rounded-2xl bg-slate-100 px-5 py-3.5 text-center text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-200"
                      >
                        View market
                      </button>
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
    <section>
      <div className="mb-3 px-1">
        <h3 className="text-base font-semibold text-slate-900">{label}</h3>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-sm font-medium text-slate-500">
                <th className="px-2 py-3">Asset</th>
                <th className="px-2 py-3 text-right">Borrow APR</th>
                <th className="px-2 py-3 text-right">Utilization</th>
                <th className="px-2 py-3 text-right">Available</th>
                <th className="px-2 py-3 text-right">Wallet Balance</th>
                <th className="px-2 py-3 text-right">7D</th>
                <th className="w-32 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                  <td className="px-2 py-3.5">
                    <TokenSingleCell visual={asset.visual} name={asset.name} subtitle={asset.subtitle} size="lg" />
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className={cn("font-data text-sm font-semibold tabular-nums", aprToneClass(asset.borrowApr))}>
                      {asset.borrowApr.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className={cn("font-data text-sm font-semibold tabular-nums", utilizationToneClass(asset.utilization))}>
                      {asset.utilization}%
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right font-data text-sm tabular-nums text-slate-900">
                    {formatCompactUsd(asset.availableUsd)}
                  </td>
                  <td className={cn("px-2 py-3.5 text-right font-data text-sm tabular-nums", asset.hasWalletBalance ? "text-slate-900" : "text-slate-400")}>
                    {asset.walletBalanceLabel}
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="flex justify-end">
                      <TrendSpark isPositive={asset.trendUp} seed={`asset-${asset.id}`} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <PillButton variant="primary" onClick={() => onBorrow(asset)}>
                      Borrow
                    </PillButton>
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
    <div className="flex items-center justify-between py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn("font-data font-semibold tabular-nums text-slate-900", tone)}>{value}</dd>
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
