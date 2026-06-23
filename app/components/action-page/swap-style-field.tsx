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
        "px-4 py-4 transition-[border-color,box-shadow,transform] duration-200 motion-safe:active:scale-[0.985]",
        tone === "raised" &&
          "rounded-[20px] border border-border/80 bg-card text-card-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] focus-within:border-brand/35 focus-within:shadow-[0_0_0_1px_hsl(var(--brand)/0.18),0_12px_32px_-20px_hsl(var(--brand)/0.22)] dark:shadow-none",
        tone === "inset" &&
          "rounded-[20px] border border-border/60 bg-surface-inset focus-within:border-brand/30 focus-within:shadow-[0_0_0_1px_hsl(var(--brand)/0.12),0_8px_24px_-18px_hsl(var(--brand)/0.16)]",
        className,
      )}
      data-testid="swap-style-field"
      data-tone={tone}
      {...props}
    >
      <div className="text-[14px] font-medium text-muted-foreground">{label}</div>
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
