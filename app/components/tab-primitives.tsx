"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type SharedTabItem<T extends string> = {
  id: T
  label: string
}

export function PillTabStrip<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  items: readonly SharedTabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex min-w-0 flex-nowrap items-center gap-0.5 overflow-x-auto sm:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
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
              active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </motion.button>
        )
      })}
    </div>
  )
}

export function UnderlineTabStrip<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  listClassName,
}: {
  items: readonly SharedTabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  listClassName?: string
}) {
  return (
    <div
      className={cn(
        "max-w-full overflow-x-auto overscroll-x-contain border-b border-border/90 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn("flex h-auto w-full justify-between gap-2 border-0 bg-transparent p-0 sm:inline-flex sm:w-max sm:min-w-max sm:justify-start sm:gap-9", listClassName)}
      >
        {items.map((item) => {
          const active = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              data-state={active ? "active" : "inactive"}
              className={cn(
                "relative h-auto shrink-0 rounded-none border-0 px-0 pb-3 pt-0 text-[15px] font-normal text-muted-foreground transition-colors after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-transparent sm:pb-4",
                active ? "text-[16px] text-foreground after:bg-foreground" : "hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
