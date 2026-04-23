"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Shared class for Radix TabsTrigger — underline-tab grammar. */
export const pillTabTriggerClassName = cn(
  "relative inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap px-3 text-[12px] font-medium",
  "text-muted-foreground transition-colors hover:text-foreground",
  "data-[state=active]:text-foreground",
  "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:bg-transparent after:transition-colors after:content-['']",
  "data-[state=active]:after:bg-foreground",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-xs",
  "disabled:pointer-events-none disabled:opacity-50",
)

export type PillTabButtonProps = Omit<ButtonProps, "variant" | "size"> & {
  active?: boolean
}

/**
 * Card section tabs — underline indicator when active.
 */
export const PillTabButton = React.forwardRef<HTMLButtonElement, PillTabButtonProps>(
  ({ active, className, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "relative h-9 rounded-none px-3 text-[12px] font-medium hover:bg-transparent",
        "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:bg-transparent after:transition-colors after:content-['']",
        active
          ? "text-foreground after:bg-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  ),
)
PillTabButton.displayName = "PillTabButton"
