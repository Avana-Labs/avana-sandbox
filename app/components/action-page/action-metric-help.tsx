"use client"

import { Info } from "lucide-react"

export function ActionMetricHelp({ text, topic }: { text: string; topic?: string }) {
  const ariaLabel = topic ? `More information about ${topic}` : "More information"

  return (
    <span
      className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70"
      aria-label={ariaLabel}
      title={text}
      role="img"
    >
      <Info className="size-3.5" aria-hidden />
    </span>
  )
}
