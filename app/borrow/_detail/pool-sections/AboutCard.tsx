"use client"

import * as React from "react"
import { ArrowUpRight, Info } from "@/app/components/icons"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type Props = { about: AboutCardData; title?: string; compact?: boolean; plain?: boolean }

/** Collapsed description length before a "read more" toggle appears. */
const DESCRIPTION_CLAMP = 280

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
  const [expanded, setExpanded] = React.useState(false)

  const description = translateAboutDescription(about.description, t)
  const isLong = typeof description === "string" && description.length > DESCRIPTION_CLAMP
  const shownDescription = !isLong || expanded ? description : `${description.slice(0, DESCRIPTION_CLAMP).trimEnd()}… `

  return (
    <section
      className={
        plain ? "space-y-4" : "overflow-hidden rounded-radius-lg border border-border bg-surface-raised shadow-elev-1"
      }
    >
      <div
        className={
          plain ? "flex items-center justify-between gap-3" : "flex items-center justify-between gap-3 px-4 py-3"
        }
      >
        <h2
          className={
            compact
              ? "truncate text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]"
              : "truncate text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]"
          }
        >
          {t(title)}
        </h2>
      </div>

      <p
        className={
          plain
            ? "text-[15px] leading-[1.6] text-text-high md:text-[16px]"
            : "px-4 text-[15px] leading-[1.6] text-text-high md:text-[16px]"
        }
      >
        {shownDescription}
        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="font-medium text-sky-500 transition-colors hover:text-sky-400 focus-visible:outline-none focus-visible:underline"
          >
            {expanded ? t("show less") : t("read more")}
          </button>
        ) : null}
      </p>

      {about.stats.length > 0 ? (
        <dl className={plain ? "text-[13.5px]" : "px-4 pb-2 text-[13.5px]"}>
          {about.stats.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="flex min-w-0 items-center gap-1.5 text-text-low">
                <span className={s.href ? "min-w-0 truncate" : "truncate"}>{t(s.label)}</span>
                <Info className="size-3.5 shrink-0 text-text-low/60" aria-hidden />
              </dt>
              <dd className="min-w-0 truncate text-right font-data font-medium tabular-nums text-text-extra-high">
                {s.href ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-end gap-2 text-text-extra-high transition-colors hover:text-text-high"
                  >
                    <span className="truncate font-data font-medium tabular-nums">{t(s.value)}</span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-text-low transition-colors group-hover:text-text-high"
                      aria-hidden
                    />
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
