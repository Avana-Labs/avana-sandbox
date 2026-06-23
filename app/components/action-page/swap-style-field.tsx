"use client"

import { cn } from "@/lib/utils"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

export function SwapStyleField({
  label,
  children,
  tone = "raised",
  className,
  ...props
}: {
  label: string
  children: React.ReactNode
  tone?: "raised" | "inset"
  className?: string
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "px-4 py-4",
        tone === "raised" && "rounded-[20px] border border-border bg-background dark:bg-[hsl(220,7%,10%)]",
        tone === "inset" && "rounded-[20px] bg-[hsl(0,0%,98%)] dark:bg-surface-inset",
        className,
      )}
      data-testid="swap-style-field"
      data-tone={tone}
      {...props}
    >
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

export function SwapStyleFieldStack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)} data-testid="swap-style-field-stack">
      {children}
    </div>
  )
}
