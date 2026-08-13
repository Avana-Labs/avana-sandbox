"use client"

import { Suspense, type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

/**
 * Underline sub-tab strip for the account sections (Borrow/Multiply) on the
 * portfolio page — same treatment as the old dashboard SectionTabStrip.
 */
export function SectionTabStrip<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const { t } = useTranslation()
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" aria-label={ariaLabel} className="flex w-max min-w-max gap-8">
        {items.map((tab) => {
          const active = tab.id === value
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              data-state={active ? "active" : "inactive"}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 pb-2 text-left text-[15px] font-normal tracking-[-0.03em] transition-colors md:text-[17px]",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tab.label)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AccountModuleBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Skeleton className="h-64 w-full rounded-radius-md" />}>{children}</Suspense>
}
