"use client"

import type { ReactNode } from "react"
import { ArrowUpRightLong } from "@/app/components/icons"
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

/**
 * Shared classes for the bare "open this row" affordance at the end of a desktop
 * table row: a long diagonal arrow that rests muted and sharpens to full
 * contrast on row hover or keyboard focus (same read as the borrow detail
 * tables). Replaces the round chevron chip, which looked like a control rather
 * than a pointer to the detail page the whole row already opens.
 */
export const ROW_OPEN_ARROW_CLASS =
  "inline-flex size-9 items-center justify-center rounded-full text-muted-foreground/60 transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background group-hover:text-foreground group-focus-within:text-foreground"

/**
 * The arrow itself. Rendered well above the 14px table-icon default: hugeicons
 * draws the diagonal inside the middle ~13 units of its 24-unit box, so the
 * glyph has to be sized up before the shaft reads as long rather than stubby.
 */
export function RowOpenArrowIcon({ className }: { className?: string }) {
  return <ArrowUpRightLong className={cn("!size-[26px]", className)} strokeWidth={1.5} aria-hidden />
}
