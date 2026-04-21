"use client"

import { useEffect, useRef } from "react"
import confetti from "canvas-confetti"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog"
import { PillButton } from "./atoms"

export type SuccessRow = { label: string; value: string; tone?: string }

export type SuccessOverlayProps = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  amountLabel: string
  ringEmoji?: string
  ringBgClass?: string
  rows: SuccessRow[]
  primaryLabel?: string
  onPrimary?: () => void
}

export function SuccessOverlay({
  open,
  onClose,
  title,
  subtitle,
  amountLabel,
  ringEmoji = "✓",
  ringBgClass = "bg-emerald-100 text-emerald-700",
  rows,
  primaryLabel = "Done",
  onPrimary,
}: SuccessOverlayProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open || !cardRef.current) return
    const card = cardRef.current
    const canvas = document.createElement("canvas")
    canvas.style.position = "absolute"
    canvas.style.inset = "0"
    canvas.style.pointerEvents = "none"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    card.prepend(canvas)
    const confettiInstance = confetti.create(canvas, { resize: true, useWorker: true })
    const timer = window.setTimeout(() => {
      confettiInstance({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.25 },
        colors: ["#10b981", "#6366f1", "#f59e0b", "#ec4899"],
      })
    }, 50)
    return () => {
      window.clearTimeout(timer)
      confettiInstance.reset()
      canvas.remove()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={cardRef}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="relative px-5 py-7 text-center">
            <div className={`mx-auto inline-flex size-14 items-center justify-center rounded-full text-[22px] ${ringBgClass}`}>
              {ringEmoji}
            </div>
            <h2 className="mt-4 text-[17px] font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
            <div className="mt-4 font-data text-[34px] font-semibold text-slate-900">{amountLabel}</div>

            <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100 text-left">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                  <dt className="text-slate-500">{row.label}</dt>
                  <dd className={row.tone ? `font-data font-semibold tabular-nums ${row.tone}` : "font-data font-medium tabular-nums text-slate-900"}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex items-center justify-center gap-2">
              <PillButton variant="ghost" size="md" onClick={onClose}>
                Close
              </PillButton>
              <PillButton
                variant="primary"
                size="md"
                onClick={() => {
                  onPrimary?.()
                  onClose()
                }}
              >
                {primaryLabel}
              </PillButton>
            </div>
          </div>

          <DialogClose className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <span className="sr-only">Close</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}
