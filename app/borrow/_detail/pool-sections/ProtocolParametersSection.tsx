"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import type { ProtocolParameterRow } from "@/app/lib/borrow-detail/protocol-parameters"
import { resolveBorrowDetailMetricHelp } from "@/app/lib/borrow-detail/metric-help"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type Props = {
  parameters: ProtocolParameterRow[]
  className?: string
}

export function ProtocolParametersSection({ parameters, className }: Props) {
  const { t } = useTranslation()
  if (parameters.length === 0) return null

  return (
    <section aria-label={t("Protocol parameters")} className={cn("space-y-5", className)}>
      <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">
        {t("Protocol parameters")}
      </h2>
      <div className="grid w-full grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 md:gap-x-10">
        {parameters.map((parameter) => {
          const tooltip = resolveBorrowDetailMetricHelp(parameter.label)

          return (
            <article key={parameter.id} className="min-w-0">
              <div className="font-data text-[19px] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[21px]">
                {parameter.value}
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                <span className="text-[13px] font-normal leading-snug text-muted-foreground">{t(parameter.label)}</span>
                {tooltip ? <ActionMetricHelp text={tooltip} topic={parameter.label} /> : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
