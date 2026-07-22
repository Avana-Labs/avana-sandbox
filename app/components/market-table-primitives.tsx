"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DesktopTableSurface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-radius-xl bg-transparent", className)}>{children}</div>
}

export function SilentActionHeader({ className }: { className?: string }) {
  return <th className={cn("rounded-r-radius-lg bg-table-header px-4 pb-2 pt-2.5 pr-4", className)} />
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
  // Always visible on desktop, but faded at rest (both chips share the muted
  // fill) so the row stays calm; hovering (or keyboard focus) fades them to full
  // opacity while the primary chip morphs to the brand fill.
  return (
    <div
      className={cn(
        "flex gap-1.5 opacity-60 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100",
        align === "start" ? "justify-start" : "justify-end",
        className,
      )}
    >
      {children}
    </div>
  )
}
