"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export const DETAIL_PAGE_MAX_W = "max-w-[1152px]"

export function DetailPageWidth({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto", DETAIL_PAGE_MAX_W, className)}>{children}</div>
}

export function DeferredDetailContent({
  children,
  className,
  placeholderClassName = "min-h-[1200px]",
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
        <div aria-hidden className={cn("rounded-radius-md bg-table-row", placeholderClassName)} />
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

export function DetailPageNotice({ className }: { className?: string }) {
  return (
    <section
      role="note"
      className={cn(
        "mt-12 rounded-radius-md border border-border bg-surface-raised/60 px-4 py-4 text-sm leading-6 text-muted-foreground md:px-5 md:py-5",
        className,
      )}
    >
      Borrowing against LP tokens involves risk, including liquidation if market conditions move against your position.
      Avana does not custody your funds, rehypothecate LP positions, or alter how your liquidity operates on underlying
      AMMs. Loan terms, interest rates, and collateral values are enforced on-chain using transparent oracle systems and
      automated risk parameters. You remain in full control of your position at all times and can repay or adjust
      collateral whenever you choose. Only borrow amounts you are comfortable maintaining through market volatility.
    </section>
  )
}
