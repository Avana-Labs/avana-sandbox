"use client"

/**
 * Shared shell for the per-tab Outlook sections. Small, presentational, and
 * self-contained so the whole `_outlook/` tree can be removed in one delete.
 */

import type { ReactNode } from "react"
import { PillTabStrip } from "@/app/components/tab-primitives"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { SCENARIO_ORDER, SCENARIOS, type ScenarioId } from "./forecast-core"

/**
 * Top-level Outlook section: title + an (i) tooltip carrying the description, with
 * controls on the right. `info` is a raw English string — ActionMetricHelp handles
 * translation, so don't pre-wrap it in t().
 */
export function OutlookSection({
  title,
  info,
  controls,
  children,
}: {
  title: string
  info?: string
  controls?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="scroll-mt-24">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{title}</h2>
          {info ? (
            <span className="inline-flex -translate-y-[3px]">
              <ActionMetricHelp text={info} topic={title} />
            </span>
          ) : null}
        </div>
        {controls ? <div className="flex flex-none items-center gap-2">{controls}</div> : null}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

/** Inner card surface used by every outlook widget — matches the what-if panel. */
export function OutlookCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-radius-md border border-border bg-background/40 p-4 md:p-5 ${className}`}>
      {title || right ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title ? (
              <h3 className="text-[16px] font-medium tracking-tight text-foreground md:text-[17px]">{title}</h3>
            ) : null}
            {subtitle ? <p className="text-[13px] text-muted-foreground">{subtitle}</p> : null}
          </div>
          {right ? <div className="flex flex-none items-center">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

/** Bear / Base / Bull scenario toggle. */
export function ScenarioToggle({ value, onChange }: { value: ScenarioId; onChange: (value: ScenarioId) => void }) {
  const { t } = useTranslation()
  return (
    <PillTabStrip
      cssOnly
      ariaLabel={t("Scenario")}
      value={value}
      onChange={onChange}
      className="rounded-full border border-border bg-background p-0.5"
      tabClassName="!text-[12px] sm:!text-[13px] !px-3 !py-1"
      items={SCENARIO_ORDER.map((id) => ({ id, label: t(SCENARIOS[id].label) }))}
    />
  )
}

/** The standard "estimates, not guarantees" disclaimer line. */
export function OutlookDisclaimer({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground/80">{children}</p>
}
