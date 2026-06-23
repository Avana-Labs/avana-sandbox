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
        "rounded-[20px] px-4 py-4",
        tone === "raised" && "border border-border bg-card",
        tone === "inset" && "bg-surface-inset",
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
  return <div className={cn("flex flex-col gap-0.5", className)} data-testid="swap-style-field-stack">{children}</div>
}
