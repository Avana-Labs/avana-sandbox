"use client"

import { Info } from "@/app/components/icons"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useEffect, useId, useRef, useState } from "react"

export function ActionMetricHelp({ text, topic }: { text: string; topic?: string }) {
  const { t } = useTranslation()
  const ariaLabel = topic ? t("More information about {topic}").replace("{topic}", t(topic)) : t("More information")
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const tooltipId = useId()

  useEffect(() => {
    if (!open) return

    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setPinned(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        setPinned(false)
      }
    }

    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", close)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false)
      }}
    >
      <button
        type="button"
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false)
        }}
        onClick={() => {
          setPinned((current) => {
            setOpen(!current)
            return !current
          })
        }}
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 rounded-radius-sm border border-border bg-background px-3 py-2 text-left text-xs font-normal leading-5 text-foreground shadow-elev-2"
        >
          {t(text)}
        </span>
      ) : null}
    </span>
  )
}
