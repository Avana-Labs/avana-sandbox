"use client"

import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react"
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
  visual?: React.ReactNode
  rows: HomeSuccessRow[]
  note?: string
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
  visual,
  rows,
  note,
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

  const subtitleText =
    stage === "review"
      ? subtitle
      : stage === "approve"
        ? "Approve this transaction in your wallet."
        : stage === "processing"
          ? "Transaction submitted. Waiting for confirmation."
          : subtitle

  const showTitleText = stage === "approve" || stage === "processing" || stage === "success"

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden",
        variant === "surface" && "rounded-radius-md border border-border bg-surface-raised",
        variant === "bare" && "bg-transparent",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-center gap-2">
          {stage !== "processing" && stage !== "success" && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <div className="size-8" aria-hidden />
          )}
        </div>

        {stage !== "processing" && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
            aria-label="Close"
          >
            <span className="text-lg leading-none">x</span>
          </button>
        ) : (
          <div className="size-8" aria-hidden />
        )}
      </div>

      <div className="flex flex-1 min-h-0 flex-col px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
        <div className="mx-auto flex h-full w-full max-w-[26rem] min-h-0 flex-col">
          <div className="flex flex-col items-center text-center">
            {stage === "processing" ? (
              <div className="relative flex size-[72px] items-center justify-center sm:size-20">
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
              <div className="relative flex size-[72px] items-center justify-center sm:size-20">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10" />
                <div className="absolute inset-2 rounded-full border border-emerald-500/20 bg-emerald-500/10" />
                <div className="absolute inset-4 rounded-full bg-emerald-500/10" />
                <CheckCircle2 className="relative z-10 size-8 text-emerald-600" />
                <SparkleDot className="absolute left-1 top-1" delay="0s" />
                <SparkleDot className="absolute right-1 top-2" delay="0.18s" />
                <SparkleDot className="absolute bottom-2 left-3" delay="0.32s" />
              </div>
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full bg-surface-inset text-foreground">
                {visual ?? <ShieldCheck className="size-7 text-[hsl(var(--brand))]" />}
              </div>
            )}

            {showTitleText ? (
              <div className="mt-2 text-[15px] font-medium tracking-tight text-foreground sm:mt-4 sm:text-[16px]">{titleText}</div>
            ) : null}
            <div className={cn("font-data text-[24px] font-medium tracking-tight text-foreground sm:text-[30px]", showTitleText ? "mt-1 sm:mt-2" : "mt-2 sm:mt-4")}>
              {amountLabel}
            </div>
            <p className="mt-2 max-w-[22rem] text-[12px] leading-5 text-muted-foreground sm:mt-3 sm:text-[13px]">{subtitleText}</p>
          </div>

          <div className={cn("mt-4 min-h-0 flex-1 overflow-y-auto pb-1 sm:mt-6", stage === "processing" && "animate-in fade-in slide-in-from-bottom-2 duration-300")}>
            {stage === "processing" ? (
              <div className="space-y-4 pt-2">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-inset">
                  <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-[hsl(var(--brand))]/18" />
                  <div
                    className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[hsl(var(--brand))] to-transparent opacity-90"
                    style={{ animation: "loading-shimmer 1.4s ease-in-out infinite" }}
                  />
                </div>
                <div className="space-y-2">
                  <ProgressRow label="Wallet approved" done />
                  <ProgressRow label="Transaction submitted" done />
                  <ProgressRow label="Waiting for confirmation" active />
                </div>
              </div>
            ) : rows.length > 0 ? (
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-muted-foreground">{row.label}</div>
                    </div>
                    <div
                      className={cn(
                        "text-right font-data text-[14px] font-medium tabular-nums",
                        (!row.tone || row.tone === "default") && "text-foreground",
                        row.tone === "positive" && "text-emerald-700 dark:text-emerald-400",
                        row.tone === "warning" && "text-amber-700 dark:text-amber-400",
                        row.tone === "danger" && "text-rose-700 dark:text-rose-400",
                      )}
                    >
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {note ? <p className="mt-4 text-[12px] leading-5 text-muted-foreground">{note}</p> : null}
          </div>

          <div className="mt-4 border-t border-border/70 pt-3 sm:mt-5 sm:pt-4">
            {stage === "processing" ? (
              <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin text-[hsl(var(--brand))]" />
                Processing transaction
              </div>
            ) : (
              <Button
                type="button"
                className="h-11 w-full rounded-2xl bg-[hsl(var(--brand))] text-[14px] text-white hover:bg-[hsl(var(--brand))]/90"
                onClick={onPrimary}
              >
                {primaryLabel}
              </Button>
            )}
          </div>
        </div>
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
