"use client"

import {
  calculateBorrowPreview,
  calculateRemovePreview,
  calculateRepayPreview,
  formatCompactUsd,
  getHealthStatus,
  healthGaugePercent,
  type HomeCollateralPool,
  type HomeMode,
} from "@/app/lib/home-sim"
import { cn } from "@/lib/utils"

function GaugeBar({
  percent,
  barClass,
  className,
}: {
  percent: number
  barClass: string
  className?: string
}) {
  const safePercent = Math.max(0, Math.min(100, percent))
  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out", barClass)}
        style={{ width: `${safePercent}%` }}
      />
      <div
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card transition-[left] duration-300 ease-out"
        style={{ left: `${safePercent}%` }}
        aria-hidden
      />
    </div>
  )
}

function PreviewHeroCard({
  hero,
  heroLabel,
  subLabel,
  statusLabel,
  statusDotClass,
  statusTextClass,
  gaugePercent,
  gaugeBarClass,
  minLabel,
  maxLabel,
}: {
  hero: string
  heroLabel: string
  subLabel?: string
  statusLabel: string
  statusDotClass: string
  statusTextClass: string
  gaugePercent: number
  gaugeBarClass: string
  minLabel: string
  maxLabel: string
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-data text-[44px] font-bold leading-none tracking-tight text-foreground">
            {hero}
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {heroLabel}
          </div>
          {subLabel ? <div className="mt-1 text-[11px] text-muted-foreground">{subLabel}</div> : null}
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold tracking-wide", statusTextClass)}>
          <span className={cn("inline-block size-1.5 rounded-full", statusDotClass)} />
          {statusLabel}
        </span>
      </div>

      <GaugeBar percent={gaugePercent} barClass={gaugeBarClass} className="mt-5" />
      <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

function PreviewStatCard({
  percent,
  percentLabel,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  barClass,
  thresholds,
}: {
  percent: number
  percentLabel: string
  leftLabel: string
  leftValue: string
  rightLabel: string
  rightValue: string
  barClass: string
  thresholds?: Array<{ at: number; label: string }>
}) {
  const safePercent = Math.max(0, Math.min(100, percent))
  return (
    <div className="mt-3 rounded-[24px] border border-border/70 bg-card p-5">
      <div className="flex items-baseline gap-2">
        <span className="font-data text-[28px] font-bold tracking-tight text-foreground">
          {Number.isFinite(percent) ? `${safePercent.toFixed(0)}%` : "—"}
        </span>
        <span className="text-sm text-muted-foreground">{percentLabel}</span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3 text-[11px] text-muted-foreground">
        <span>
          {leftLabel}: <strong className="text-foreground">{leftValue}</strong>
        </span>
        <span>
          {rightLabel}: <strong className="text-foreground">{rightValue}</strong>
        </span>
      </div>

      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out", barClass)}
          style={{ width: `${safePercent}%` }}
        />
        {thresholds?.map((threshold) => (
          <div
            key={threshold.at}
            className="absolute inset-y-0 w-px bg-border/80"
            style={{ left: `${threshold.at}%` }}
            aria-hidden
          />
        ))}
      </div>
      {thresholds && thresholds.length > 0 ? (
        <div className="mt-1.5 flex justify-between text-[10px] font-medium text-muted-foreground">
          {thresholds.map((threshold) => (
            <span key={`${threshold.at}-label`}>{threshold.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function BorrowPreviewPanel({
  pool,
  preview,
}: {
  pool: HomeCollateralPool
  preview: ReturnType<typeof calculateBorrowPreview>
}) {
  const hf = preview.healthFactor ?? Number.POSITIVE_INFINITY
  const status = getHealthStatus(hf)
  const gaugePercent = healthGaugePercent(hf)

  const used = pool.borrowPowerUsd > 0 ? ((pool.borrowPowerUsd - preview.remainingBorrowPowerUsd) / pool.borrowPowerUsd) * 100 : 0
  const barClass = used >= 85 ? "bg-rose-500" : used >= 60 ? "bg-amber-500" : "bg-emerald-500"

  return (
    <div>
      <PreviewHeroCard
        hero={Number.isFinite(hf) ? hf.toFixed(2) : "∞"}
        heroLabel="Health factor"
        subLabel={pool.name}
        statusLabel={status.label}
        statusDotClass={status.dotClass}
        statusTextClass={status.textClass}
        gaugePercent={gaugePercent}
        gaugeBarClass={status.barClass}
        minLabel="1.0"
        maxLabel="3.0+"
      />
      <PreviewStatCard
        percent={used}
        percentLabel="borrow power used"
        leftLabel="Used"
        leftValue={formatCompactUsd(pool.borrowPowerUsd - preview.remainingBorrowPowerUsd)}
        rightLabel="Limit"
        rightValue={formatCompactUsd(pool.borrowPowerUsd)}
        barClass={barClass}
        thresholds={[
          { at: 0, label: "Safe" },
          { at: 60, label: "Caution" },
          { at: 85, label: "High risk" },
        ]}
      />
    </div>
  )
}

function RepayPreviewPanel({
  pool,
  debtUsd,
  preview,
}: {
  pool: HomeCollateralPool
  debtUsd: number
  preview: ReturnType<typeof calculateRepayPreview>
}) {
  const hfAfter = preview.healthFactorAfter ?? Number.POSITIVE_INFINITY
  const status = getHealthStatus(hfAfter)
  const gaugePercent = healthGaugePercent(hfAfter)

  const paidPercent = debtUsd > 0 ? ((debtUsd - preview.remainingDebtUsd) / debtUsd) * 100 : 0

  return (
    <div>
      <PreviewHeroCard
        hero={formatCompactUsd(preview.remainingDebtUsd)}
        heroLabel="Debt remaining"
        subLabel={pool.name}
        statusLabel={status.label}
        statusDotClass={status.dotClass}
        statusTextClass={status.textClass}
        gaugePercent={gaugePercent}
        gaugeBarClass={status.barClass}
        minLabel="HF 1.0"
        maxLabel="HF 3.0+"
      />
      <PreviewStatCard
        percent={paidPercent}
        percentLabel="of debt repaid"
        leftLabel="Repaid"
        leftValue={formatCompactUsd(debtUsd - preview.remainingDebtUsd)}
        rightLabel="Interest saved"
        rightValue={`${formatCompactUsd(preview.yearlyInterestSavedUsd)}/yr`}
        barClass="bg-emerald-500"
        thresholds={[
          { at: 0, label: "Start" },
          { at: 50, label: "Half" },
          { at: 100, label: "Cleared" },
        ]}
      />
    </div>
  )
}

function RemovePreviewPanel({
  pool,
  percent,
  preview,
}: {
  pool: HomeCollateralPool
  percent: number
  preview: ReturnType<typeof calculateRemovePreview>
}) {
  void percent
  const hfAfter = preview.healthFactorAfter ?? Number.POSITIVE_INFINITY
  const status = preview.isUnsafe
    ? { label: "UNSAFE", dotClass: "bg-rose-500", textClass: "text-rose-600", barClass: "bg-rose-500" }
    : getHealthStatus(hfAfter)
  const gaugePercent = healthGaugePercent(hfAfter)

  const remainingPercent = pool.collateralUsd > 0 ? (preview.afterCollateralUsd / pool.collateralUsd) * 100 : 0
  const removedPercent = 100 - remainingPercent
  const barClass = removedPercent >= 75 ? "bg-rose-500" : removedPercent >= 50 ? "bg-amber-500" : "bg-emerald-500"

  return (
    <div>
      <PreviewHeroCard
        hero={formatCompactUsd(preview.removeUsd)}
        heroLabel="You receive"
        subLabel={pool.name}
        statusLabel={status.label}
        statusDotClass={status.dotClass}
        statusTextClass={status.textClass}
        gaugePercent={gaugePercent}
        gaugeBarClass={status.barClass}
        minLabel="HF 1.0"
        maxLabel="HF 3.0+"
      />
      <PreviewStatCard
        percent={removedPercent}
        percentLabel="collateral removed"
        leftLabel="Remaining"
        leftValue={formatCompactUsd(preview.afterCollateralUsd)}
        rightLabel="Max safe"
        rightValue={`${preview.safePercent}%`}
        barClass={barClass}
        thresholds={[
          { at: 0, label: "0%" },
          { at: preview.safePercent, label: "Safe cap" },
          { at: 100, label: "100%" },
        ]}
      />
    </div>
  )
}

export function HomePreviewPanel({
  mode,
  borrowPool,
  borrowPreview,
  repayPool,
  repayDebtUsd,
  repayPreview,
  removePool,
  removePercent,
  removePreview,
}: {
  mode: HomeMode
  borrowPool: HomeCollateralPool
  borrowPreview: ReturnType<typeof calculateBorrowPreview>
  repayPool: HomeCollateralPool
  repayDebtUsd: number
  repayPreview: ReturnType<typeof calculateRepayPreview>
  removePool: HomeCollateralPool
  removePercent: number
  removePreview: ReturnType<typeof calculateRemovePreview>
}) {
  if (mode === "borrow") {
    return <BorrowPreviewPanel pool={borrowPool} preview={borrowPreview} />
  }
  if (mode === "repay") {
    return <RepayPreviewPanel pool={repayPool} debtUsd={repayDebtUsd} preview={repayPreview} />
  }
  if (mode === "remove") {
    return <RemovePreviewPanel pool={removePool} percent={removePercent} preview={removePreview} />
  }
  return null
}
