"use client"

import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HomeSuccessRow } from "@/app/lib/home-sim"

export type TransactionFlowStage = "review" | "approve" | "processing" | "success"

export type TransactionSuccessState = {
  amountLabel: string
  title: string
  description: string
  rows: HomeSuccessRow[]
}

type TransactionFlowPanelProps = {
  stage: TransactionFlowStage
  actionLabel: string
  amountLabel: string
  title: string
  subtitle: string
  hero?: React.ReactNode
  visual?: React.ReactNode
  rows: HomeSuccessRow[]
  note?: string
  progressLabel?: string
  progressPercent?: number
  progressLeftLabel?: string
  progressRightLabel?: string
  feeValue?: string
  footerNote?: React.ReactNode
  primaryLabel: string
  onPrimary?: () => void
  onBack?: () => void
  onClose?: () => void
  className?: string
  variant?: "surface" | "bare"
}

type TransactionPageProgressBarProps = {
  label: string
  className?: string
}

export function TransactionPageProgressBar({ label, className }: TransactionPageProgressBarProps) {
  return (
    <div className={cn("hidden border-b border-border bg-background/90 backdrop-blur md:block", className)}>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-inset">
          <div className="absolute inset-y-0 left-0 w-[42%] rounded-full bg-[hsl(var(--brand))]/20" />
          <div
            className="absolute inset-y-0 left-0 w-[34%] rounded-full bg-gradient-to-r from-transparent via-[hsl(var(--brand))] to-transparent opacity-90"
            style={{ animation: "loading-shimmer 1.8s ease-in-out infinite" }}
          />
        </div>
        <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}

export function TransactionFlowPanel({
  stage,
  actionLabel,
  amountLabel,
  title,
  subtitle,
  hero,
  visual,
  rows,
  note,
  progressLabel,
  progressPercent,
  progressLeftLabel,
  progressRightLabel,
  feeValue = "$0",
  footerNote,
  primaryLabel,
  onPrimary,
  onBack,
  onClose,
  className,
  variant = "surface",
}: TransactionFlowPanelProps) {
  const titleText =
    stage === "approve"
      ? "Approve in wallet"
      : stage === "processing"
        ? `Processing ${actionLabel}`
        : stage === "success"
          ? title
          : ""

  const shouldStretch = stage === "processing" || variant === "bare"
  const showCloseButton = variant !== "bare" && stage !== "processing" && Boolean(onClose)
  const useReviewHeading = stage === "review" || stage === "approve"
  const reviewHeadingClass =
    "mt-6 text-[clamp(2.2rem,8vw,3.5rem)] font-medium tracking-tight text-foreground sm:mt-4 sm:max-w-[24rem] sm:text-[1.55rem] sm:leading-[1.08]"
  const amountLabelClass =
    useReviewHeading
      ? ""
      : "mt-3 font-data text-[15px] font-medium tracking-tight text-muted-foreground sm:mt-3 sm:text-[16px]"
  const titleClass =
    stage === "review"
      ? ""
      : "mt-6 max-w-[24rem] text-[clamp(2.2rem,8vw,3.5rem)] font-medium tracking-tight text-foreground sm:mt-4 sm:text-[1.55rem] sm:leading-[1.08]"
  const showProgressSummary =
    progressLabel &&
    progressLeftLabel &&
    progressRightLabel &&
    Number.isFinite(progressPercent)
  const headerClass =
    variant === "bare"
      ? "flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)]"
      : "flex items-center justify-between px-5 pt-5 sm:px-5 sm:pt-5"
  const contentClass =
    variant === "bare"
      ? "flex min-h-0 flex-col px-8 pb-3 pt-6"
      : "flex min-h-0 flex-col px-8 pb-3 pt-6"
  const contentColumnClass =
    "flex w-full min-h-0 flex-col"
  const footerClass =
    variant === "bare"
      ? "border-t border-border px-5 pb-[calc(1.1rem+env(safe-area-inset-bottom))] pt-4"
      : "border-t border-border px-5 pb-6 pt-5"

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-background",
        shouldStretch ? "h-full" : "h-auto",
        variant === "surface" && "rounded-radius-md border border-border bg-background",
        variant === "bare" && "bg-background",
        className,
      )}
    >
      <div className={headerClass}>
        {stage !== "processing" && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <div className="size-8" aria-hidden />
        )}

        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        ) : (
          <div className="size-8" aria-hidden />
        )}
      </div>

      <div className={cn(contentClass, shouldStretch && "flex-1")}>
        <div className={cn(contentColumnClass, shouldStretch && "h-full")}>
          <div className="flex flex-col items-center text-center">
            {hero ? (
              <div className="flex items-center justify-center">{hero}</div>
            ) : stage === "processing" ? (
              <div className="relative flex size-[72px] items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-[hsl(var(--brand))]/15 bg-[hsl(var(--brand-soft))]/25" />
                <div
                  className="absolute inset-2 rounded-full border border-[hsl(var(--brand))]/15"
                  style={{ animation: "pulse 2.2s ease-in-out infinite" }}
                />
                <div className="absolute inset-4 rounded-full bg-[hsl(var(--brand))]/12" />
                <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                  <span className="size-1.5 rounded-full bg-[hsl(var(--brand))]" style={{ animation: "processing-dot 1.2s ease-in-out infinite" }} />
                  <span
                    className="size-1.5 rounded-full bg-[hsl(var(--brand))]"
                    style={{ animation: "processing-dot 1.2s ease-in-out infinite", animationDelay: "0.18s" }}
                  />
                  <span
                    className="size-1.5 rounded-full bg-[hsl(var(--brand))]"
                    style={{ animation: "processing-dot 1.2s ease-in-out infinite", animationDelay: "0.36s" }}
                  />
                </div>
                <LoaderCircle className="relative z-10 size-7 animate-spin text-[hsl(var(--brand))]" />
              </div>
            ) : stage === "success" ? (
              <div className="relative flex size-[72px] items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10" />
                <div className="absolute inset-2 rounded-full border border-emerald-500/20 bg-emerald-500/10" />
                <div className="absolute inset-4 rounded-full bg-emerald-500/10" />
                <CheckCircle2 className="relative z-10 size-8 text-emerald-600" />
                <SparkleDot className="absolute left-1 top-1" delay="0s" />
                <SparkleDot className="absolute right-1 top-2" delay="0.18s" />
                <SparkleDot className="absolute bottom-2 left-3" delay="0.32s" />
              </div>
            ) : (
              <div className="flex size-[72px] items-center justify-center rounded-full bg-background text-foreground">
                {visual ? (
                  <div className="scale-[2.2] sm:scale-[1.8]">
                    {visual}
                  </div>
                ) : (
                  <ShieldCheck className="size-7 text-[hsl(var(--brand))]" />
                )}
              </div>
            )}

            {!useReviewHeading ? (
              <div className={titleClass}>
                {titleText}
              </div>
            ) : null}
            {useReviewHeading ? (
              <div className={reviewHeadingClass}>{amountLabel}</div>
            ) : (
              <div className={amountLabelClass}>{amountLabel}</div>
            )}
            {useReviewHeading ? (
              <p className="mt-3 text-[15px] text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>

          <div
            className={cn(
              "mt-8 pb-1",
              shouldStretch && "min-h-0 flex-1 overflow-y-auto",
              stage === "processing" && "animate-in fade-in slide-in-from-bottom-2 duration-300",
            )}
          >
            {stage === "processing" ? (
              <div className="space-y-4 pt-2">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-inset">
                  <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-[hsl(var(--brand))]/18" />
                  <div
                    className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[hsl(var(--brand))] to-transparent opacity-90"
                    style={{ animation: "loading-shimmer 1.4s ease-in-out infinite" }}
                  />
                </div>
                <div className="space-y-2.5">
                  <ProgressRow label="Wallet approved" done />
                  <ProgressRow label="Transaction submitted" done />
                  <ProgressRow label="Waiting for confirmation" active />
                </div>
              </div>
            ) : rows.length > 0 ? (
              <div className="space-y-5">
                {rows.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4">
                    <div className="min-w-0 text-[14px] font-medium text-muted-foreground">{row.label}</div>
                    <div
                      className={cn(
                        "text-right text-[15px] font-medium",
                        (!row.tone || row.tone === "default") && "text-foreground",
                        row.tone === "positive" && "text-emerald-600",
                        row.tone === "warning" && "text-amber-600",
                        row.tone === "danger" && "text-rose-600",
                      )}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {showProgressSummary ? (
              <div className="mt-7">
                <div className="flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="text-muted-foreground">{progressLabel}</span>
                  <span className="font-medium text-foreground">{Math.max(0, Math.min(100, progressPercent!)).toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--brand))]"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent!))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3 text-[11.5px] text-muted-foreground">
                  <span>{progressLeftLabel}</span>
                  <span>{progressRightLabel}</span>
                </div>
              </div>
            ) : null}

            {note ? <p className="mt-4 text-[12px] leading-5 text-muted-foreground">{note}</p> : null}
          </div>

        </div>
      </div>

      <div className={footerClass}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-foreground">Fees paid</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Estimated transaction cost</div>
          </div>
          <div className="font-data text-[20px] font-medium tracking-tight text-foreground">{feeValue}</div>
        </div>
        {stage === "processing" ? (
          <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin text-[hsl(var(--brand))]" />
            Processing transaction
          </div>
        ) : (
          <Button
            type="button"
            className="h-12 w-full rounded-[14px] bg-[hsl(var(--brand))] text-[15px] text-white hover:bg-[hsl(var(--brand))]/90"
            onClick={onPrimary}
          >
            {primaryLabel}
          </Button>
        )}

        {footerNote ? <div className="mt-3 text-center text-[12px] text-muted-foreground">{footerNote}</div> : null}
      </div>
    </div>
  )
}

function ProgressRow({
  label,
  done = false,
  active = false,
}: {
  label: string
  done?: boolean
  active?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-radius-sm border border-border bg-surface-inset px-3 py-2 transition-all duration-300">
      <span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full transition-all duration-300",
          done && "bg-emerald-500/10 text-emerald-600",
          active && "bg-[hsl(var(--brand-soft))] text-[hsl(var(--brand))]",
        )}
      >
        {done ? <CheckCircle2 className="size-3.5" /> : <LoaderCircle className={cn("size-3.5", active && "animate-spin")} />}
      </span>
      <span className={cn("text-[12.5px]", done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  )
}

function SparkleDot({ className, delay = "0s" }: { className?: string; delay?: string }) {
  return (
    <span
      className={cn("size-1 rounded-full bg-amber-400/80", className)}
      style={{ animation: "sparkle 1.8s ease-in-out infinite", animationDelay: delay }}
      aria-hidden
    />
  )
}
