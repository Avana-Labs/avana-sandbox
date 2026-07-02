"use client"

import { ArrowUpRight } from "lucide-react"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type Props = { about: AboutCardData; title?: string; compact?: boolean; plain?: boolean }

function translateAboutDescription(description: string, t: (key: string) => string) {
  const lendMatch = description.match(
    /^(.*?) \((.*?)\) is a single-asset supply market on Avana\. Suppliers earn the supply APY( plus active rewards)? from borrower interest, net of the reserve factor\. Yield tracks utilization, so the page focuses on the live supply rate, the supply\/utilization mix, and the latest risk posture for this (stablecoin|tier-[a-z]+) market\.$/,
  )
  if (lendMatch) {
    const [, name, symbol, rewardsClause = "", marketType] = lendMatch
    return t(
      "{name} ({symbol}) is a single-asset supply market on Avana. Suppliers earn the supply APY{rewardsClause} from borrower interest, net of the reserve factor. Yield tracks utilization, so the page focuses on the live supply rate, the supply/utilization mix, and the latest risk posture for this {marketType} market.",
    )
      .replace("{name}", name)
      .replace("{symbol}", symbol)
      .replace("{rewardsClause}", rewardsClause)
      .replace("{marketType}", marketType)
  }

  return t(description)
}

export function AboutCard({ about, title = "About", compact = false, plain = false }: Props) {
  const { t } = useTranslation()
  return (
    <section
      className={
        plain ? "space-y-4" : "overflow-hidden rounded-radius-lg border border-border bg-surface-raised shadow-elev-1"
      }
    >
      <div className={plain ? "flex items-center justify-between gap-3" : "flex items-center justify-between gap-3 px-4 py-3"}>
        <h2
          className={
            compact
              ? "truncate text-[18px] font-normal leading-none tracking-[-0.02em] text-brand-readable"
              : "truncate text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable"
          }
        >
          {t(title)}
        </h2>
      </div>
      <div
        className="
          text-[14px] text-text-high leading-[1.5]
          [&>p]:mb-4 [&>p:last-child]:mb-0
          [&>br]:block [&>br]:mb-2
          [&_a]:text-text-high [&_a]:underline [&_a]:underline-offset-2
          [&_a:hover]:text-text-extra-high
          [&_strong]:font-semibold [&_b]:font-semibold
          [&_em]:italic [&_i]:italic
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
          [&_li]:mb-1
        "
      >
        {translateAboutDescription(about.description, t)}
      </div>
      {about.stats.length > 0 ? (
        <dl className={plain ? "space-y-1.5 text-[12.5px]" : "mt-4 space-y-1.5 text-[12.5px]"}>
          {about.stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4 border-b border-border/70 py-2 last:border-b-0">
              <dt className={s.href ? "min-w-0 flex-1 text-text-low" : "shrink-0 text-text-low"}>{t(s.label)}</dt>
              <dd className={s.href ? "min-w-0" : "min-w-0 truncate text-right font-data font-medium tabular-nums text-text-extra-high"}>
                {s.href ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-end gap-2 text-text-extra-high transition-colors hover:text-text-high"
                  >
                    <span className="truncate font-data font-medium tabular-nums">{t(s.value)}</span>
                    <ArrowUpRight className="size-4 shrink-0 text-text-low transition-colors group-hover:text-text-high" aria-hidden />
                  </a>
                ) : (
                  t(s.value)
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  )
}
