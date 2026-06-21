"use client"

import { Delete } from "lucide-react"
import { cn } from "@/lib/utils"

const KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "backspace"],
] as const

function appendKey(value: string, key: string) {
  if (key === "backspace") return value.slice(0, -1)
  if (key === ".") {
    if (value.includes(".")) return value
    return value.length === 0 ? "0." : `${value}.`
  }
  if (value === "0") return key
  return `${value}${key}`
}

export function ActionNumericKeypad({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div
      data-testid="action-numeric-keypad"
      className={cn("grid grid-cols-3 gap-y-1 px-1", className)}
      role="group"
      aria-label="Numeric keypad"
    >
      {KEY_ROWS.flat().map((key) => {
        const label = key === "backspace" ? "Delete" : key
        return (
          <button
            key={key}
            type="button"
            aria-label={label}
            onClick={() => onChange(appendKey(value, key))}
            className="flex h-14 items-center justify-center rounded-xl text-[1.375rem] font-medium tracking-[-0.03em] text-foreground transition-colors active:bg-muted/60"
          >
            {key === "backspace" ? <Delete className="size-5" strokeWidth={1.75} aria-hidden /> : key}
          </button>
        )
      })}
    </div>
  )
}
