"use client"

import { Children, Fragment } from "react"
import { ArrowDown } from "@/app/components/icons"
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
        "px-4 py-3 transition-[border-color,box-shadow,transform] duration-200 motion-safe:active:scale-[0.985]",
        tone === "raised" &&
          "rounded-radius-xl border border-border bg-field-top text-card-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] focus-within:border-brand/35 focus-within:shadow-[0_0_0_1px_hsl(var(--brand)/0.18),0_12px_32px_-20px_hsl(var(--brand)/0.22)] dark:shadow-none",
        tone === "inset" &&
          "rounded-radius-xl border border-transparent bg-field-bottom focus-within:border-brand/30 focus-within:shadow-[0_0_0_1px_hsl(var(--brand)/0.12),0_8px_24px_-18px_hsl(var(--brand)/0.16)]",
        className,
      )}
      data-testid="swap-style-field"
      data-tone={tone}
      {...props}
    >
      <div className="text-[15px] font-medium text-foreground/75">{label}</div>
      {children}
    </div>
  )
}

export function SwapStyleFieldStack({ children, className }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children)
  return (
    <div className={cn("flex flex-col gap-1", className)} data-testid="swap-style-field-stack">
      {items.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index === 0 && items.length > 1 ? (
            // Uniswap-style directional affordance between the two fields. Decorative
            // only (not a swap button): borrow's collateral→borrow flow isn't
            // reversible, so this indicates direction without implying a toggle.
            <div aria-hidden className="relative z-10 -my-3 flex justify-center">
              <span className="flex size-7 items-center justify-center rounded-radius-md border-4 border-background bg-field-bottom text-muted-foreground">
                <ArrowDown className="size-3.5" />
              </span>
            </div>
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}
