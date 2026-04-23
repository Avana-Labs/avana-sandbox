import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-radius-sm border border-border bg-surface-raised px-3 py-2 text-[13px] ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-muted-foreground hover:border-border focus-visible:border-accent-emphasis/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-emphasis/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
