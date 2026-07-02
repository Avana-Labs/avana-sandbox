"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DesktopTableSurface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-radius-xl bg-transparent", className)}>{children}</div>
}

export function SilentActionHeader({ className }: { className?: string }) {
  return <th className={cn("rounded-r-radius-lg bg-table-header px-4 py-3.5 pr-4", className)} />
}

export function HoverActionGroup({
  children,
  className,
  align = "end",
}: {
  children: ReactNode
  className?: string
  align?: "start" | "end"
}) {
  return (
    <div
      className={cn(
        "flex gap-1.5 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
        align === "start" ? "justify-start" : "justify-end",
        className,
      )}
    >
      {children}
    </div>
  )
}
