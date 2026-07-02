"use client"

import { Info } from "lucide-react"
import { useTranslation } from "@/app/lib/i18n/use-translation"

export function ActionMetricHelp({ text, topic }: { text: string; topic?: string }) {
  const { t } = useTranslation()
  const ariaLabel = topic ? t("More information about {topic}").replace("{topic}", t(topic)) : t("More information")

  return (
    <button
      type="button"
      className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={ariaLabel}
      title={t(text)}
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  )
}
