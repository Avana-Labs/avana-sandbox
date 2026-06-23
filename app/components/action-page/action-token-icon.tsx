"use client"

import { getTokenIconMeta } from "@/app/lib/token-icons"
import { cn } from "@/lib/utils"

export function ActionTokenIcon({ symbol, className }: { symbol: string; className?: string }) {
  const icon = getTokenIconMeta(symbol)
  const fallbackLabel = symbol.includes("/")
    ? symbol
        .split("/")
        .map((part) => part.trim().slice(0, 1))
        .join("")
        .slice(0, 2)
    : symbol.slice(0, 3)

  if (icon.iconUrl) {
    return (
      <img src={icon.iconUrl} alt="" className={cn("size-6 rounded-full", className)} />
    )
  }

  return (
    <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold", icon.bgClass, icon.textClass, className)}>
      {fallbackLabel}
    </span>
  )
}
