"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export const DETAIL_PAGE_MAX_W = "max-w-[1152px]"

export function DetailPageWidth({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto", DETAIL_PAGE_MAX_W, className)}>{children}</div>
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
