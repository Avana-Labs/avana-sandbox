"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

export type ActionWorkspaceTabItem = {
  id: string
  label: string
}

export function ActionWorkspaceTabs({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: ActionWorkspaceTabItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-1", className)} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.id === value
        return (
          <motion.button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            whileHover={reduceMotion ? undefined : { y: -1 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className={cn(
              "rounded-full px-3 py-1.5 text-[15px] font-medium leading-none transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </motion.button>
        )
      })}
    </div>
  )
}
