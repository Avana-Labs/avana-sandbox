"use client"

import { cn } from "@/lib/utils"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { formatTokenDisplaySymbol } from "@/app/lib/token-icons"

const FACE =
  "block truncate transition-[transform,opacity] duration-300 ease-out [backface-visibility:hidden] motion-reduce:transition-none"

/**
 * Line under a token name in a table row. Touch / phone: `detail` (a unit price, "$18.5M Supply").
 * Desktop (hover-capable, md+): the ticker, which flips over to `detail` while the row is hovered —
 * the row must carry Tailwind's `group` class. Without a detail it shows the ticker everywhere; when
 * the name already is the ticker ("OP") it shows the detail everywhere, since the ticker adds nothing.
 */
export function TickerPriceFlip({
  symbol,
  name,
  detail,
}: {
  symbol: string
  /** The row's primary label. */
  name: string
  detail: string | undefined
}) {
  const ticker = formatTokenDisplaySymbol(symbol)
  if (detail === undefined) return <>{ticker}</>
  if (name.trim().toUpperCase() === ticker.toUpperCase()) return <>{detail}</>
  return (
    <>
      <span className="block truncate [@media(hover:hover)_and_(min-width:768px)]:hidden">{detail}</span>
      <span className="relative hidden [perspective:240px] [@media(hover:hover)_and_(min-width:768px)]:block">
        <span
          className={cn(
            FACE,
            "origin-top group-hover:opacity-0 group-hover:[transform:translateY(-50%)_rotateX(90deg)]",
          )}
        >
          {ticker}
        </span>
        <span
          className={cn(
            FACE,
            "absolute inset-0 origin-bottom opacity-0 [transform:translateY(50%)_rotateX(-90deg)] group-hover:opacity-100 group-hover:[transform:none]",
          )}
        >
          {detail}
        </span>
      </span>
    </>
  )
}

/** `TickerPriceFlip` with the live canonical (DefiLlama) unit price. */
export function TokenTickerPriceLabel({ symbol, name }: { symbol: string; name: string }) {
  const priceFor = useCanonicalPriceFor()
  const price = priceFor(symbol)
  return (
    <TickerPriceFlip symbol={symbol} name={name} detail={price === undefined ? undefined : formatTokenPrice(price)} />
  )
}
