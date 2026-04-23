"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SectionCardProps = {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  rightSlot?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  /** Render the wrapper as a landmark. */
  as?: "section" | "div"
  id?: string
}

/**
 * Canonical section shell used across `/perps`, `/lend`, and now the borrow
 * detail pages. Title sits OUTSIDE the Card (matches `HotMarkets`,
 * `MyInvestments`) and the Card itself uses the soft `border-border/40 bg-card/50`
 * surface with `shadow-none`. Body padding defaults to `p-6`; tables should
 * pass `bodyClassName="p-0"` so rows can reach the gutter.
 */
export function SectionCard({
  title,
  subtitle,
  rightSlot,
  children,
  className,
  bodyClassName = "p-6",
  as: Tag = "section",
  id,
}: SectionCardProps) {
  const hasHeader = Boolean(title || subtitle || rightSlot)
  return (
    <Tag id={id} className={cn("min-w-0", className)}>
      {hasHeader ? (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            {title ? <h2 className="text-[14px] font-medium tracking-tight leading-tight text-foreground">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-[11.5px] text-muted-foreground">{subtitle}</p> : null}
          </div>
          {rightSlot ? <div className="flex shrink-0 items-center gap-2">{rightSlot}</div> : null}
        </div>
      ) : null}
      <Card className="overflow-hidden border-border bg-surface-raised shadow-elev-1">
        <CardContent className={cn(bodyClassName)}>{children}</CardContent>
      </Card>
    </Tag>
  )
}
