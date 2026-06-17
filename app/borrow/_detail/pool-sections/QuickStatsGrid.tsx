"use client"

import { cn } from "@/lib/utils"

type QuickStatLike = {
  id: string
  label: string
  value: string
}

type Props = {
  detail: { quickStats: QuickStatLike[] }
  className?: string
}

export function QuickStatsGrid({ detail, className }: Props) {
  const stats = detail.quickStats.slice(0, 8)

  return (
    <section
      aria-label="Stats"
      className={cn("grid grid-cols-2 overflow-hidden md:grid-cols-4", className)}
    >
      {stats.map((stat, index) => {
        const isDesktopFirstCol = index % 4 === 0
        const isDesktopSecondRowLeftHalf = index >= 4 && index < 6
        const isDesktopSecondRowRightHalf = index >= 6
        const isMobileFirstCol = index % 2 === 0
        const isMobileSecondRow = index >= 2

        return (
          <div
            key={stat.id}
            className={cn(
              "min-h-[114px] border-border px-4 py-5 md:px-3 md:py-5",
              !isMobileFirstCol && "border-l",
              isMobileSecondRow && "border-t md:border-t-0",
              !isDesktopFirstCol && "md:border-l",
              isDesktopSecondRowLeftHalf && "md:border-t",
              isDesktopSecondRowRightHalf && "md:border-t",
            )}
          >
            <div className="text-[12px] font-normal leading-[1.1] tracking-[-0.02em] text-text-extra-high md:text-[13px]">
              {stat.label}
            </div>
            <div className="mt-3 text-[17px] font-normal leading-none tracking-[-0.03em] text-text-extra-high md:text-[18px]">
              {stat.value}
            </div>
          </div>
        )
      })}
    </section>
  )
}
