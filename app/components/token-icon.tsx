"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { getTokenIconMeta, type TokenIconMeta } from "@/app/lib/token-icons"

type TokenIconSize = "xs" | "sm" | "md" | "lg" | "xl"

const DIMENSIONS: Record<TokenIconSize, { box: string; text: string; px: number }> = {
  xs: { box: "h-4 w-4", text: "text-[7px]", px: 16 },
  sm: { box: "h-6 w-6", text: "text-[9px]", px: 24 },
  md: { box: "h-8 w-8", text: "text-[10px]", px: 32 },
  lg: { box: "h-10 w-10", text: "text-[11px]", px: 40 },
  xl: { box: "h-11 w-11", text: "text-[12px]", px: 44 },
}

export function TokenIcon({
  symbol,
  size = "md",
  className,
  ring = false,
  meta: metaOverride,
}: {
  symbol: string
  size?: TokenIconSize
  className?: string
  ring?: boolean
  meta?: TokenIconMeta
}) {
  const meta = metaOverride ?? getTokenIconMeta(symbol)
  const { box, text, px } = DIMENSIONS[size]
  const [failed, setFailed] = useState(false)
  const showIcon = Boolean(meta.iconUrl) && !failed
  const fallbackLabel = meta.symbol[0]?.toUpperCase() ?? "?"

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        ring && "ring-2 ring-background",
        box,
        showIcon ? "bg-card" : cn(meta.bgClass, meta.textClass, text),
        className,
      )}
    >
      {showIcon ? (
        <Image
          src={meta.iconUrl as string}
          alt={meta.symbol}
          width={px}
          height={px}
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        fallbackLabel
      )}
    </span>
  )
}
