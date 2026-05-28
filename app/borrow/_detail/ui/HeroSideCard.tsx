"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type HeroSideTab = {
  id: string
  label: string
}

type HeroSideCardProps = {
  title: React.ReactNode
  subtitle?: React.ReactNode
  tabs: HeroSideTab[]
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function HeroSideCard({
  title,
  subtitle,
  tabs,
  value,
  onValueChange,
  children,
  className,
}: HeroSideCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[28px] border-border/60 bg-surface-raised shadow-elev-1",
        className,
      )}
    >
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[14px] font-medium tracking-tight text-foreground">{title}</div>
              {subtitle ? <div className="mt-0.5 text-[11.5px] text-muted-foreground">{subtitle}</div> : null}
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Detail rail"
            className="grid grid-cols-3 rounded-full bg-surface-inset p-1"
          >
            {tabs.map((tab) => {
              const active = tab.id === value
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onValueChange(tab.id)}
                  className={cn(
                    "rounded-full px-3 py-2 text-[12px] font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">{children}</div>
      </CardContent>
    </Card>
  )
}
