"use client"

import { getTokenIconMeta } from "@/app/lib/token-icons"
import { cn } from "@/lib/utils"

export function ActionTokenIcon({ symbol, className }: { symbol: string; className?: string }) {
  const icon = getTokenIconMeta(symbol)

  if (icon.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={icon.iconUrl} alt="" className={cn("size-6 rounded-full", className)} />
    )
  }

  return (
    <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold", icon.bgClass, icon.textClass, className)}>
      {symbol.slice(0, 3)}
    </span>
  )
}
