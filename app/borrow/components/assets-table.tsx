"use client"

import {
  aprToneClass,
  formatCompactUsd,
  utilizationToneClass,
  type BorrowableAsset,
} from "@/app/lib/borrow-sim"
import { PillButton, TokenSingleCell, TrendSpark } from "./atoms"
import { cn } from "@/lib/utils"

type AssetsTableProps = {
  rows: BorrowableAsset[]
  onBorrow: (asset: BorrowableAsset) => void
}

export function AssetsPanel({ rows, onBorrow }: AssetsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-[13px] text-slate-500">
        No assets match your filter.
      </div>
    )
  }

  return (
    <div>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-medium text-slate-500">
                <th className="w-10 px-2 py-3">#</th>
                <th className="px-2 py-3">Asset</th>
                <th className="px-2 py-3 text-right">Borrow APR</th>
                <th className="px-2 py-3 text-right">Total Borrowed</th>
                <th className="px-2 py-3 text-right">Utilization</th>
                <th className="px-2 py-3 text-right">Available</th>
                <th className="px-2 py-3 text-right">Wallet Balance</th>
                <th className="px-2 py-3 text-right">7D</th>
                <th className="w-32 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((asset, index) => (
                <tr key={asset.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                  <td className="px-2 py-3.5 text-[12px] text-slate-400 tabular-nums">{index + 1}</td>
                  <td className="px-2 py-3.5">
                    <TokenSingleCell visual={asset.visual} name={asset.name} subtitle={asset.subtitle} />
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className={cn("font-data text-[13px] font-semibold tabular-nums", aprToneClass(asset.borrowApr))}>
                      {asset.borrowApr.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right font-data text-[13px] tabular-nums text-slate-900">
                    {formatCompactUsd(asset.totalBorrowedUsd)}
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className={cn("font-data text-[13px] font-semibold tabular-nums", utilizationToneClass(asset.utilization))}>
                      {asset.utilization}%
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right font-data text-[13px] tabular-nums text-slate-900">
                    {formatCompactUsd(asset.availableUsd)}
                  </td>
                  <td className={cn("px-2 py-3.5 text-right font-data text-[13px] tabular-nums", asset.hasWalletBalance ? "text-slate-900" : "text-slate-400")}>
                    {asset.walletBalanceLabel}
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="flex justify-end">
                      <TrendSpark isPositive={asset.trendUp} seed={`asset-${asset.id}`} />
                    </div>
                  </td>
                  <td className="px-2 py-3.5 text-right">
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

      <ul className="space-y-3 md:hidden">
        {rows.map((asset) => (
          <li key={asset.id} className="space-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <TokenSingleCell visual={asset.visual} name={asset.name} subtitle={asset.subtitle} />
              <TrendSpark isPositive={asset.trendUp} seed={`asset-${asset.id}`} width={52} />
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-[12px]">
              <MobileField label="Borrow APR" value={`${asset.borrowApr.toFixed(1)}%`} tone={aprToneClass(asset.borrowApr)} />
              <MobileField label="Utilization" value={`${asset.utilization}%`} tone={utilizationToneClass(asset.utilization)} />
              <MobileField label="Available" value={formatCompactUsd(asset.availableUsd)} />
              <MobileField label="Wallet" value={asset.walletBalanceLabel} tone={asset.hasWalletBalance ? undefined : "text-slate-400"} />
            </div>
            <PillButton variant="primary" size="md" className="w-full" onClick={() => onBorrow(asset)}>
              Borrow {asset.symbol}
            </PillButton>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MobileField({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.07em] text-slate-400">{label}</div>
      <div className={cn("mt-0.5 font-data text-[13px] font-semibold tabular-nums text-slate-900", tone)}>{value}</div>
    </div>
  )
}
