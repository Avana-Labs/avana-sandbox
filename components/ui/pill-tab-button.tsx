"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Shared class for Radix TabsTrigger (active state via data-state). */
export const pillTabTriggerClassName = cn(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-xs font-medium",
  "text-muted-foreground transition-colors hover:text-foreground",
  "data-[state=active]:bg-black/5 data-[state=active]:text-foreground dark:data-[state=active]:bg-secondary dark:data-[state=active]:text-secondary-foreground",
  "data-[state=active]:hover:bg-black/10 dark:data-[state=active]:hover:bg-secondary dark:data-[state=active]:hover:text-secondary-foreground",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
)

export type PillTabButtonProps = Omit<ButtonProps, "variant" | "size"> & {
  active?: boolean
}

/**
 * Card section tabs — 12px pill labels, secondary fill when active.
 * Matches perps `AccountTabs` pattern.
 */
export const PillTabButton = React.forwardRef<HTMLButtonElement, PillTabButtonProps>(
  ({ active, className, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "rounded-full px-4 text-xs font-medium",
        active
          ? "bg-black/5 text-foreground hover:bg-black/10 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary dark:hover:text-secondary-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  ),
)
PillTabButton.displayName = "PillTabButton"
