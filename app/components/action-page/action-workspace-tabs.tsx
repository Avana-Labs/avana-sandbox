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
    <div
      className={cn(
        // Stay on one row on mobile (all four express tabs + the gear must fit at
        // 390px) — compact padding/size below sm; scroll rather than wrap if a
        // locale's labels ever overflow.
        "flex min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto sm:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
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
              "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[14px] font-medium leading-none transition-colors sm:px-3 sm:text-[15px]",
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
