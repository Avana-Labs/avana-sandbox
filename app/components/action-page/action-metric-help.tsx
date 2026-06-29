"use client"

import { Info } from "lucide-react"

export function ActionMetricHelp({ text, topic }: { text: string; topic?: string }) {
  const ariaLabel = topic ? `More information about ${topic}` : "More information"

  return (
    <button
      type="button"
      className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={ariaLabel}
      title={text}
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  )
}
