"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { ActionCard } from "@/app/components/action-page/action-metrics"

function formatMultiplier(value: number) {
  return Number.isInteger(value) ? `${value}x` : `${value.toFixed(1)}x`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function snap(value: number, step: number) {
  return Math.round(value / step) * step
}

export function ActionLeverageRuler({
  value,
  onChange,
  min = 1,
  max = 20,
  step = 0.1,
  label = "Leverage",
}: {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number
  label?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const parsed = Number.parseFloat(value)
  const activeValue = Number.isFinite(parsed) ? clamp(snap(parsed, step), min, max) : min

  const ticks = useMemo(() => {
    const items: number[] = []
    for (let current = min; current <= max + 1e-9; current = snap(current + (Number.isInteger(min) && Number.isInteger(max) ? 1 : step), step)) {
      items.push(Number(current.toFixed(2)))
      if (items.length > 400) break
    }
    return items
  }, [max, min, step])

  const setValue = useCallback(
    (next: number) => {
      onChange(String(clamp(snap(next, step), min, max)))
    },
    [max, min, onChange, step],
  )

  useEffect(() => {
    if (!scrollRef.current) return
    const index = ticks.findIndex((tick) => Math.abs(tick - activeValue) < step / 2)
    if (index < 0) return
    const tickWidth = 28
    const centerOffset = scrollRef.current.clientWidth / 2 - tickWidth / 2
    scrollRef.current.scrollLeft = index * tickWidth - centerOffset
  }, [activeValue, step, ticks])

  return (
    <ActionCard className="p-4">
      <div data-testid="action-leverage-ruler">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setValue(min)}
        >
          Min
        </button>
        <div className="font-data text-[clamp(2rem,8vw,2.75rem)] font-semibold leading-none tracking-[-0.05em] text-foreground">
          {formatMultiplier(activeValue)}
        </div>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setValue(max)}
        >
          Max
        </button>
      </div>

      <div className="relative mt-5">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-foreground" aria-hidden />
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const target = event.currentTarget
            const tickWidth = 28
            const center = target.scrollLeft + target.clientWidth / 2
            const index = Math.round(center / tickWidth)
            const tick = ticks[index]
            if (tick != null) setValue(tick)
          }}
        >
          <div className="flex min-w-max items-end px-[50%]">
            {ticks.map((tick) => {
              const isMajor = Math.abs(tick - Math.round(tick)) < 1e-9
              const isActive = Math.abs(tick - activeValue) < step / 2
              return (
                <button
                  key={tick}
                  type="button"
                  aria-label={`Set leverage to ${formatMultiplier(tick)}`}
                  aria-pressed={isActive}
                  onClick={() => setValue(tick)}
                  className="flex w-7 shrink-0 flex-col items-center gap-1"
                >
                  <span className={isMajor ? "text-[11px] tabular-nums text-muted-foreground" : "text-[10px] text-transparent"}>
                    {Math.round(tick)}
                  </span>
                  <span className={isMajor ? "h-4 w-px bg-border" : "h-2.5 w-px bg-border/70"} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      </div>
    </ActionCard>
  )
}
