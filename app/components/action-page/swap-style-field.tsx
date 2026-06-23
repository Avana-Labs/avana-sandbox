"use client"

import { cn } from "@/lib/utils"

export function SwapStyleField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("rounded-[20px] border border-border/70 bg-surface-inset px-4 py-4", className)}
      data-testid="swap-style-field"
    >
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

export function SwapStyleFieldStack({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-1", className)}>{children}</div>
}
