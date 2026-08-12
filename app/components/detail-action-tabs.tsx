"use client"

import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

export type DetailActionTabItem<T extends string = string> = {
  id: T
  label: string
}

type Props<T extends string> = {
  items: readonly DetailActionTabItem<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function DetailActionTabs<T extends string>({ items, value, onChange, ariaLabel, className }: Props<T>) {
  const { t } = useTranslation()

  return (
    <div role="tablist" aria-label={t(ariaLabel)} className={cn("flex items-center gap-0", className)}>
      {items.map((item) => {
        const active = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-state={active ? "active" : "inactive"}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[15px] font-semibold leading-none text-foreground/65 transition-colors hover:text-foreground",
              active && "bg-muted px-4 py-2.5 text-foreground",
            )}
          >
            {t(item.label)}
          </button>
        )
      })}
    </div>
  )
}
