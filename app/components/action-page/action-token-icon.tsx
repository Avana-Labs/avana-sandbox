"use client"

import { getTokenIconMeta } from "@/app/lib/token-icons"
import { TOKEN_ICON_TABLE_PX } from "@/app/lib/token-icon-sizes"
import { cn } from "@/lib/utils"

const ICON_SIZES = {
  sm: { box: "size-7", text: "text-[9px]", px: 28, container: "h-7 w-[46px]", offset: "left-[18px]" },
  md: { box: "size-10", text: "text-[11px]", px: TOKEN_ICON_TABLE_PX, container: "h-10 w-[62px]", offset: "left-5" },
} as const

function ActionTokenIconBase({
  symbol,
  size = "md",
  className,
}: {
  symbol: string
  size?: keyof typeof ICON_SIZES
  className?: string
}) {
  const icon = getTokenIconMeta(symbol)
  const { box, text } = ICON_SIZES[size]
  // No asset picked yet: the default label is the literal word "Asset". Render a neutral
  // placeholder glyph instead of slicing it to the first three letters ("Ass").
  const isPlaceholder = !symbol || /^asset$/i.test(symbol.trim())
  const fallbackLabel = isPlaceholder
    ? "?"
    : symbol.includes("/")
      ? symbol
          .split("/")
          .map((part) => part.trim().slice(0, 1))
          .join("")
          .slice(0, 2)
      : symbol.slice(0, 3)

  if (icon.iconUrl && !isPlaceholder) {
    return <img src={icon.iconUrl} alt="" className={cn(box, "rounded-full object-cover", className)} />
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        box,
        text,
        isPlaceholder ? "bg-muted text-muted-foreground" : icon.bgClass,
        isPlaceholder ? undefined : icon.textClass,
        className,
      )}
      aria-hidden={isPlaceholder ? true : undefined}
    >
      {fallbackLabel}
    </span>
  )
}

export function ActionTokenIcon({ symbol, className }: { symbol: string; className?: string }) {
  return <ActionTokenIconBase symbol={symbol} size="md" className={className} />
}

export function ActionTokenPairIcon({
  collateralSymbol,
  borrowSymbol,
  size = "sm",
  className,
}: {
  collateralSymbol: string
  borrowSymbol: string
  size?: keyof typeof ICON_SIZES
  className?: string
}) {
  const { container, offset } = ICON_SIZES[size]

  return (
    <span className={cn("relative inline-flex shrink-0 items-center", container, className)} aria-hidden>
      <ActionTokenIconBase
        symbol={collateralSymbol}
        size={size}
        className="absolute left-0 top-0 z-10 ring-2 ring-background"
      />
      <ActionTokenIconBase symbol={borrowSymbol} size={size} className={cn("absolute top-0 ring-2 ring-background", offset)} />
    </span>
  )
}
