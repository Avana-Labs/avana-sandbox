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
    stage === "review"
      ? `Confirm ${actionLabel}`
      : stage === "approve"
        ? "Approve in wallet"
        : stage === "processing"
          ? `Processing ${actionLabel}`
          : title

  const subtitleText =
    stage === "review"
      ? subtitle
      : stage === "approve"
        ? "Approve this transaction in your wallet."
        : stage === "processing"
          ? "Transaction submitted. Waiting for confirmation."
          : subtitle

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        variant === "surface" && "rounded-radius-md border border-border bg-surface-raised",
        variant === "bare" && "bg-transparent",
        className,
      )}
    >
      <div className="flex items-center justify-between px-5 pt-5">
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

      <div className="flex flex-1 flex-col px-5 pb-5 pt-8">
        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-surface-inset text-foreground">
              {stage === "review" ? (
                visual ?? <ShieldCheck className="size-7" />
              ) : stage === "approve" ? (
                <ShieldCheck className="size-7 text-[hsl(var(--brand))]" />
              ) : stage === "processing" ? (
                <LoaderCircle className="size-7 animate-spin text-[hsl(var(--brand))]" />
              ) : (
                <CheckCircle2 className="size-7 text-emerald-600" />
              )}
            </div>

            <div className="mt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {stage === "processing" ? "Processing" : stage === "approve" ? "Wallet approval" : stage === "success" ? "Confirmed" : "Review"}
            </div>
            <div className="mt-2 text-[17px] font-medium tracking-tight text-foreground">{titleText}</div>
            <div className="mt-2 font-data text-[30px] font-medium tracking-tight text-foreground">{amountLabel}</div>
            <p className="mt-3 text-[13px] leading-5 text-muted-foreground">{subtitleText}</p>
          </div>

          <div className="mt-8">
            {stage === "processing" ? (
              <div className="space-y-3">
                <ProgressRow label="Wallet approval" done />
                <ProgressRow label="Transaction submitted" done />
                <ProgressRow label="Waiting for confirmation" active />
              </div>
            ) : rows.length > 0 ? (
              <dl className="divide-y divide-border border-y border-border">
                {rows.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4 py-3 text-[13px]">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span
                      className={cn(
                        "font-data font-medium tabular-nums",
                        (!row.tone || row.tone === "default") && "text-foreground",
                        row.tone === "positive" && "text-emerald-700 dark:text-emerald-400",
                        row.tone === "warning" && "text-amber-700 dark:text-amber-400",
                        row.tone === "danger" && "text-rose-700 dark:text-rose-400",
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </dl>
            ) : null}

            {note ? <p className="mt-4 text-[12px] leading-5 text-muted-foreground">{note}</p> : null}
          </div>

          <div className="mt-auto pt-6">
            {stage === "processing" ? (
              <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                <LoaderCircle className="size-3.5 animate-spin text-[hsl(var(--brand))]" />
                Processing transaction
              </div>
            ) : (
              <Button
                type="button"
                className="h-11 w-full rounded-2xl bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90"
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
    <div className="flex items-center gap-3 py-1.5">
      <span
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full",
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
