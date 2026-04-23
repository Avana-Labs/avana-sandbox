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
import { BipolarBar, DeltaPill, FlashValue } from "@/app/components/ui/live"

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
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface-raised transition-[left] duration-200 ease-out"
        style={{ left: `${safePercent}%` }}
        aria-hidden
      />
    </div>
  )
}

function PreviewHeroCard({
  hero,
  heroValue,
  heroLabel,
  subLabel,
  statusLabel,
  statusDotClass,
  statusTextClass,
  gaugePercent,
  gaugeBarClass,
  minLabel,
  maxLabel,
  deltaValue,
  deltaFormat,
  deltaLabel,
  deltaGoodDirection = "up",
  flashGoodDirection = "up",
}: {
  hero: string
  heroValue: number | string
  heroLabel: string
  subLabel?: string
  statusLabel: string
  statusDotClass: string
  statusTextClass: string
  gaugePercent: number
  gaugeBarClass: string
  minLabel: string
  maxLabel: string
  deltaValue?: number | null
  deltaFormat?: "percent" | "number" | "usd" | "bps"
  deltaLabel?: string
  deltaGoodDirection?: "up" | "down"
  flashGoodDirection?: "up" | "down"
}) {
  return (
    <div className="rounded-radius-md border border-border bg-surface-raised shadow-elev-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <FlashValue
            value={heroValue}
            goodDirection={flashGoodDirection}
            className="font-data text-[28px] font-medium leading-none tracking-tight text-foreground"
          >
            {hero}
          </FlashValue>
          <div className="mt-2 flex items-center gap-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {heroLabel}
            </div>
            {deltaValue !== undefined && deltaValue !== null && Number.isFinite(deltaValue) ? (
              <DeltaPill
                value={deltaValue}
                format={deltaFormat ?? "number"}
                goodDirection={deltaGoodDirection}
                label={deltaLabel}
              />
            ) : null}
          </div>
          {subLabel ? <div className="mt-1 text-[11px] text-muted-foreground">{subLabel}</div> : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          <span className={cn("inline-block size-1.5 rounded-full", statusDotClass)} />
          <span className={statusTextClass}>{statusLabel}</span>
        </span>
      </div>

      <GaugeBar percent={gaugePercent} barClass={gaugeBarClass} className="mt-4" />
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-muted-foreground">
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
  leftBarClass,
  rightBarClass,
  leftLabelClass,
  rightLabelClass,
  thresholds,
}: {
  percent: number
  percentLabel: string
  leftLabel: string
  leftValue: string
  rightLabel: string
  rightValue: string
  leftBarClass: string
  rightBarClass?: string
  leftLabelClass?: string
  rightLabelClass?: string
  thresholds?: Array<{ at: number; label: string }>
}) {
  const safePercent = Math.max(0, Math.min(100, percent))
  return (
    <div className="mt-2 rounded-radius-md border border-border bg-surface-raised shadow-elev-1 p-4">
      <div className="flex items-baseline gap-2">
        <FlashValue value={safePercent} goodDirection="down" className="font-data text-[22px] font-medium tracking-tight text-foreground">
          {Number.isFinite(percent) ? `${safePercent.toFixed(0)}%` : "—"}
        </FlashValue>
        <span className="text-[12px] text-muted-foreground">{percentLabel}</span>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-3 text-[11px] text-muted-foreground">
        <span>
          {leftLabel}: <strong className="font-medium text-foreground">{leftValue}</strong>
        </span>
        <span>
          {rightLabel}: <strong className="font-medium text-foreground">{rightValue}</strong>
        </span>
      </div>

      <div className="mt-2.5">
        <BipolarBar
          leftValue={safePercent}
          rightValue={100 - safePercent}
          leftLabel={`${safePercent.toFixed(0)}%`}
          rightLabel={`${(100 - safePercent).toFixed(0)}%`}
          leftClass={leftBarClass}
          rightClass={rightBarClass ?? "bg-muted-foreground/20"}
          leftLabelClass={leftLabelClass}
          rightLabelClass={rightLabelClass ?? "text-muted-foreground"}
          heightClass="h-1.5"
          labelPosition="inside"
        />
      </div>

      {thresholds && thresholds.length > 0 ? (
        <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
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
  const leftLabelClass = used >= 85 ? "text-rose-600" : used >= 60 ? "text-amber-600" : "text-emerald-600"

  return (
    <div>
      <PreviewHeroCard
        hero={Number.isFinite(hf) ? hf.toFixed(2) : "∞"}
        heroValue={Number.isFinite(hf) ? hf : 99}
        heroLabel="Health factor"
        subLabel={pool.name}
        statusLabel={status.label}
        statusDotClass={status.dotClass}
        statusTextClass={status.textClass}
        gaugePercent={gaugePercent}
        gaugeBarClass={status.barClass}
        minLabel="1.0"
        maxLabel="3.0+"
        flashGoodDirection="up"
      />
      <PreviewStatCard
        percent={used}
        percentLabel="borrow power used"
        leftLabel="Used"
        leftValue={formatCompactUsd(pool.borrowPowerUsd - preview.remainingBorrowPowerUsd)}
        rightLabel="Headroom"
        rightValue={formatCompactUsd(preview.remainingBorrowPowerUsd)}
        leftBarClass={barClass}
        leftLabelClass={leftLabelClass}
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
  const hfBefore = debtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / debtUsd : Number.POSITIVE_INFINITY
  const status = getHealthStatus(hfAfter)
  const gaugePercent = healthGaugePercent(hfAfter)

  const paidPercent = debtUsd > 0 ? ((debtUsd - preview.remainingDebtUsd) / debtUsd) * 100 : 0

  const hfDelta =
    Number.isFinite(hfAfter) && Number.isFinite(hfBefore) && !preview.isEmpty
      ? hfAfter - hfBefore
      : null

  return (
    <div>
      <PreviewHeroCard
        hero={formatCompactUsd(preview.remainingDebtUsd)}
        heroValue={preview.remainingDebtUsd}
        heroLabel="Debt remaining"
        subLabel={pool.name}
        statusLabel={status.label}
        statusDotClass={status.dotClass}
        statusTextClass={status.textClass}
        gaugePercent={gaugePercent}
        gaugeBarClass={status.barClass}
        minLabel="HF 1.0"
        maxLabel="HF 3.0+"
        deltaValue={hfDelta}
        deltaFormat="number"
        deltaLabel="HF"
        deltaGoodDirection="up"
        flashGoodDirection="down"
      />
      <PreviewStatCard
        percent={paidPercent}
        percentLabel="of debt repaid"
        leftLabel="Repaid"
        leftValue={formatCompactUsd(debtUsd - preview.remainingDebtUsd)}
        rightLabel="Interest saved"
        rightValue={`${formatCompactUsd(preview.yearlyInterestSavedUsd)}/yr`}
        leftBarClass="bg-emerald-500"
        leftLabelClass="text-emerald-600"
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
  debtUsd,
}: {
  pool: HomeCollateralPool
  percent: number
  preview: ReturnType<typeof calculateRemovePreview>
  debtUsd: number
}) {
  void percent
  const hfAfter = preview.healthFactorAfter ?? Number.POSITIVE_INFINITY
  const hfBefore = debtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / debtUsd : Number.POSITIVE_INFINITY
  const status = preview.isUnsafe
    ? { label: "UNSAFE", dotClass: "bg-rose-500", textClass: "text-rose-600", barClass: "bg-rose-500" }
    : getHealthStatus(hfAfter)
  const gaugePercent = healthGaugePercent(hfAfter)

  const remainingPercent = pool.collateralUsd > 0 ? (preview.afterCollateralUsd / pool.collateralUsd) * 100 : 0
  const removedPercent = 100 - remainingPercent
  const barClass = removedPercent >= 75 ? "bg-rose-500" : removedPercent >= 50 ? "bg-amber-500" : "bg-emerald-500"
  const leftLabelClass = removedPercent >= 75 ? "text-rose-600" : removedPercent >= 50 ? "text-amber-600" : "text-emerald-600"

  const hfDelta =
    Number.isFinite(hfAfter) && Number.isFinite(hfBefore) && preview.removeUsd > 0
      ? hfAfter - hfBefore
      : null

  return (
    <div>
      <PreviewHeroCard
        hero={formatCompactUsd(preview.removeUsd)}
        heroValue={preview.removeUsd}
        heroLabel="You receive"
        subLabel={pool.name}
        statusLabel={status.label}
        statusDotClass={status.dotClass}
        statusTextClass={status.textClass}
        gaugePercent={gaugePercent}
        gaugeBarClass={status.barClass}
        minLabel="HF 1.0"
        maxLabel="HF 3.0+"
        deltaValue={hfDelta}
        deltaFormat="number"
        deltaLabel="HF"
        deltaGoodDirection="up"
        flashGoodDirection="up"
      />
      <PreviewStatCard
        percent={removedPercent}
        percentLabel="collateral removed"
        leftLabel="Remaining"
        leftValue={formatCompactUsd(preview.afterCollateralUsd)}
        rightLabel="Max safe"
        rightValue={`${preview.safePercent}%`}
        leftBarClass={barClass}
        leftLabelClass={leftLabelClass}
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
  removeDebtUsd,
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
  removeDebtUsd?: number
}) {
  if (mode === "borrow") {
    return <BorrowPreviewPanel pool={borrowPool} preview={borrowPreview} />
  }
  if (mode === "repay") {
    return <RepayPreviewPanel pool={repayPool} debtUsd={repayDebtUsd} preview={repayPreview} />
  }
  if (mode === "remove") {
    return (
      <RemovePreviewPanel
        pool={removePool}
        percent={removePercent}
        preview={removePreview}
        debtUsd={removeDebtUsd ?? 0}
      />
    )
  }
  return null
}
