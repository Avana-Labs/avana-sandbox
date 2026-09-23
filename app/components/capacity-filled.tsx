import { cn } from "@/lib/utils"

type CapacityFilledProps = {
  value?: number | null
  className?: string
}

/** Compact utilization gauge shared by the market tables. `value` is a percentage (0–100). */
export function CapacityFilled({ value, className }: CapacityFilledProps) {
  const hasValue = typeof value === "number" && Number.isFinite(value)
  const percentage = hasValue ? Math.min(100, Math.max(0, value)) : null
  const rounded = percentage === null ? null : Math.round(percentage)
  const circumference = 2 * Math.PI * 12

  return (
    <div
      role="img"
      aria-label={rounded === null ? "Capacity filled unavailable" : `Capacity filled ${rounded}%`}
      className={cn("inline-flex items-center gap-2.5 whitespace-nowrap", className)}
    >
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 shrink-0 -rotate-90">
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-border dark:text-white/10"
        />
        {percentage !== null ? (
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke="#01AACF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percentage / 100)}
          />
        ) : null}
      </svg>
      <span className="font-data text-[15px] font-normal tabular-nums text-foreground dark:text-white">
        {rounded === null ? "—" : `${rounded}%`}
      </span>
    </div>
  )
}
