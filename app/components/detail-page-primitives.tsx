"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export const DETAIL_PAGE_MAX_W = "max-w-[1152px]"

/** Vertical stack of detail page sections with horizontal dividers centered between siblings. */
export const detailSectionStackClass =
  "flex flex-col [&>*:not(:last-child)]:pb-10 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-10"

/** Larger spacing variant for deferred analytics blocks below the fold. */
export const detailAnalyticsStackClass =
  "flex flex-col [&>*:not(:last-child)]:pb-10 md:[&>*:not(:last-child)]:pb-12 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-10 md:[&>*+*]:pt-12"

/** Top divider centered between the about block and analytics sections. */
export const detailAnalyticsSectionClass = "mt-10 border-t border-border pt-10 md:mt-12 md:pt-12"

export function DetailPageWidth({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto", DETAIL_PAGE_MAX_W, className)}>{children}</div>
}

export function DeferredDetailContent({
  children,
  className,
  placeholderClassName = "min-h-[120px]",
}: {
  children: ReactNode
  className?: string
  placeholderClassName?: string
}) {
  const markerRef = useRef<HTMLDivElement | null>(null)
  const [shouldMount, setShouldMount] = useState(() => process.env.NODE_ENV === "test")

  useEffect(() => {
    if (shouldMount) return
    const marker = markerRef.current
    if (!marker || typeof IntersectionObserver === "undefined") {
      setShouldMount(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShouldMount(true)
        observer.disconnect()
      },
      { rootMargin: "200px 0px", threshold: 0 },
    )
    observer.observe(marker)
    return () => observer.disconnect()
  }, [shouldMount])

  return (
    <div ref={markerRef} className={className}>
      {shouldMount ? (
        children
      ) : (
        <div aria-hidden className={cn("space-y-3 rounded-radius-md p-2", placeholderClassName)}>
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-20 w-full animate-pulse rounded bg-muted/70" />
          <div className="h-20 w-full animate-pulse rounded bg-muted/50" />
        </div>
      )}
    </div>
  )
}

export function MobileDetailActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden",
        className,
      )}
    >
      {children}
    </div>
  )
}

const DETAIL_PAGE_NOTICES = {
  borrow:
    "Borrowing against LP tokens involves risk, including liquidation if market conditions move against your position. Avana does not custody your funds, rehypothecate LP positions, or alter how your liquidity operates on underlying AMMs. Loan terms, interest rates, and collateral values are enforced on-chain using transparent oracle systems and automated risk parameters. You remain in full control of your position at all times and can repay or adjust collateral whenever you choose. Only borrow amounts you are comfortable maintaining through market volatility.",
  lend: "Supplying assets involves risk, including smart-contract, oracle, and liquidity risk if market conditions change. Avana does not custody your funds or alter how your deposits operate in the lending market. Supply rates, utilization, and available liquidity are enforced on-chain using transparent oracle systems and automated risk parameters. You remain in full control of your position at all times and can withdraw available liquidity whenever market conditions allow. Only supply amounts you are comfortable keeping deployed through changes in utilization and demand.",
  multiply:
    "Opening a multiply position involves risk, including liquidation if market conditions move against your leveraged loop. Avana does not custody your funds or alter how the underlying collateral and debt legs operate. Leverage limits, interest rates, and collateral values are enforced on-chain using transparent oracle systems and automated risk parameters. You remain in full control of your position at all times and can deleverage, repay, or close whenever you choose. Only use leverage you are comfortable maintaining through market volatility.",
} as const

export type DetailPageNoticeProduct = keyof typeof DETAIL_PAGE_NOTICES

export function DetailPageNotice({
  className,
  product = "borrow",
}: {
  className?: string
  product?: DetailPageNoticeProduct
}) {
  return (
    <section
      role="note"
      className={cn(
        "mt-12 rounded-radius-md border border-border bg-surface-raised/60 px-4 py-4 text-sm leading-6 text-muted-foreground md:px-5 md:py-5",
        className,
      )}
    >
      {DETAIL_PAGE_NOTICES[product]}
    </section>
  )
}
