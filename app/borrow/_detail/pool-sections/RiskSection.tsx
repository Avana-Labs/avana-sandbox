"use client"

import * as React from "react"
import type { PoolDetail, AssetDetail } from "@/app/lib/borrow-detail"
import { formatBpsAsPct, riskLevelLabel } from "@/app/lib/borrow-detail"
import { RiskGauge, RiskLevelPill, SectionCard } from "../ui"
import { DeltaPill } from "@/app/components/ui/live/delta-pill"

type Props = { detail: PoolDetail | AssetDetail }

export function RiskSection({ detail }: Props) {
  const { risk } = detail
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const metricByLabel = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of risk.metrics) map[m.label.toLowerCase()] = m.value
    return map
  }, [risk.metrics])

  return (
    <SectionCard
      title="Risk assessment"
      subtitle="Composite rating combining volatility, depth, oracle and dependency risks."
      rightSlot={<RiskLevelPill level={risk.level} size="md" />}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Risk premium</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-data text-[26px] font-medium tabular-nums text-foreground md:text-[30px]">
                {formatBpsAsPct(risk.premiumBps)}
              </span>
              <span className="text-[12px] text-muted-foreground">({risk.premiumBps} bps)</span>
            </div>
            <p className="mt-2 max-w-prose text-[13px] leading-6 text-foreground/80">{risk.headline}</p>
          </div>
          <div className="flex flex-col items-center">
            <RiskGauge score={risk.score} level={risk.level} label={`${riskLevelLabel(risk.level)} risk`} size={140} />
            {risk.lastReviewed ? (
              <p className="mt-1 text-[10.5px] text-muted-foreground">Last reviewed {risk.lastReviewed}</p>
            ) : null}
          </div>
        </div>

        <p className="text-[13px] leading-6 text-foreground/80">{risk.summary}</p>

        <div>
          <div className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Breakdown</div>
          <ul className="divide-y divide-border rounded-radius-sm border border-border bg-surface-inset">
            {risk.breakdown.map((item) => {
              const open = expanded.has(item.id)
              const relatedMetric = metricByLabel[item.label.toLowerCase()]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggle(item.id)}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-raised/60"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="truncate text-[13px] font-medium text-foreground">{item.label}</span>
                      <RiskLevelPill level={item.level} withDot={false} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {relatedMetric ? (
                        <span className="hidden font-data text-[11.5px] tabular-nums text-muted-foreground sm:inline">
                          {relatedMetric}
                        </span>
                      ) : null}
                      <DeltaPill value={item.bps / 100} format="percent" digits={2} hideZero={false} />
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 14 14"
                        aria-hidden
                        className={open ? "rotate-180 text-muted-foreground transition-transform" : "text-muted-foreground transition-transform"}
                      >
                        <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                  {open ? (
                    <div className="px-3.5 pb-3 text-[11.5px] leading-5 text-muted-foreground">
                      {item.description}
                      {relatedMetric ? (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-xs border border-border bg-surface-raised px-2 py-1 font-data text-[11px] tabular-nums text-foreground">
                          {item.label}: {relatedMetric}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}
