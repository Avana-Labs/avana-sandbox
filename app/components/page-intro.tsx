import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageIntroProps = {
  title: ReactNode
  description?: ReactNode
  className?: string
  /** Right-side actions (buttons, toggles) */
  children?: ReactNode
}

/**
 * Compact page title row: sits below the global header without competing with the logo.
 */
export function PageIntro({ title, description, className, children }: PageIntroProps) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-base font-semibold leading-snug tracking-tight text-foreground">{title}</h1>
        {description != null ? (
          <div className="max-w-md text-xs leading-relaxed text-muted-foreground [&_p]:m-0">{description}</div>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">{children}</div>
      ) : null}
    </div>
  )
}
