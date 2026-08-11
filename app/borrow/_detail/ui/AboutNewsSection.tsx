"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import type { AboutCard as AboutCardData } from "@/app/lib/borrow-detail"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { AboutCard } from "@/app/borrow/_detail/pool-sections"
import { NewsCard } from "./NewsCard"
import { buildNewsItems } from "@/app/borrow/_detail/lib/news"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type Props = {
  about: AboutCardData
  newsImageUrl?: string
  newsImageLabel?: string
  aboutTitle?: string
  compactAboutTitle?: boolean
  newsTitle?: string
  /** Optional outbound link for "View all" / items. Never default to Aave governance. */
  governanceUrl?: string
  /** Legacy prop; media placement is now fixed to the news-style thumbnail. */
  mediaVariant?: "card" | "icon"
  afterAbout?: React.ReactNode
  className?: string
}

export function AboutNewsSection({
  about,
  newsImageUrl,
  newsImageLabel,
  aboutTitle = "About",
  compactAboutTitle = false,
  newsTitle = "Risk Parameters",
  governanceUrl,
  afterAbout,
  className,
}: Props) {
  const { t } = useTranslation()
  const newsItems = buildNewsItems(about, newsImageUrl, newsImageLabel)
  const governanceParameters = about.governanceParameters

  return (
    <div className={cn("space-y-12 pt-10", className)}>
      <AboutCard about={about} title={aboutTitle} compact={compactAboutTitle} plain />
      {afterAbout}
      {governanceParameters ? (
        <>
          <section aria-label={t(newsTitle)} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="truncate text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
                {t(newsTitle)}
              </h2>
              {governanceUrl ? (
                <a
                  href={governanceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[13px] font-medium text-sky-500 transition-colors hover:text-sky-400"
                >
                  {t("View all")}
                </a>
              ) : null}
            </div>

            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {governanceParameters.parameters.map((parameter) => {
                const parameterContent = (
                  <>
                    <div className="flex min-w-0 items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[14px] font-normal leading-snug text-muted-foreground">
                          {t(parameter.label)}
                          {parameter.description ? (
                            <ActionMetricHelp text={parameter.description} topic={parameter.label} />
                          ) : null}
                        </div>
                      </div>
                      {parameter.status ? (
                        <span className="shrink-0 rounded-full bg-surface-inset px-2.5 py-1 text-[12px] font-medium leading-none text-muted-foreground">
                          {t(parameter.status)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 font-data text-[22px] font-semibold leading-none tracking-[-0.03em] text-foreground">
                      {t(parameter.value)}
                    </div>
                  </>
                )

                return parameter.href ? (
                  <a
                    key={parameter.id}
                    href={parameter.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group min-w-0 border-b border-border/70 pb-4 transition-colors hover:border-border-medium"
                  >
                    {parameterContent}
                  </a>
                ) : (
                  <article key={parameter.id} className="min-w-0 border-b border-border/70 pb-4">
                    {parameterContent}
                  </article>
                )
              })}
            </div>
          </section>

          <section aria-label={t("Parameter changelog")} className="space-y-5">
            <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
              {t("Parameter changelog")}
            </h2>
            <div className="overflow-hidden rounded-radius-md border border-border">
              <div className="hidden grid-cols-[1.2fr_0.75fr_0.75fr_0.85fr_1fr] gap-4 border-b border-border bg-surface-inset px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground md:grid">
                <span>{t("Parameter")}</span>
                <span>{t("Previous")}</span>
                <span>{t("Current")}</span>
                <span>{t("Date")}</span>
                <span>{t("Source")}</span>
              </div>
              <div className="divide-y divide-border/70">
                {governanceParameters.changelog.map((entry) => {
                  const row = (
                    <div className="grid gap-2 px-4 py-3 text-[14px] md:grid-cols-[1.2fr_0.75fr_0.75fr_0.85fr_1fr] md:items-center md:gap-4">
                      <div className="font-medium text-foreground">{t(entry.parameter)}</div>
                      <div className="text-muted-foreground">
                        <span className="md:hidden">{t("Previous")}: </span>
                        {t(entry.previous)}
                      </div>
                      <div className="font-medium text-foreground">
                        <span className="md:hidden">{t("Current")}: </span>
                        {t(entry.current)}
                      </div>
                      <div className="text-muted-foreground">{t(entry.date)}</div>
                      <div className="min-w-0 text-muted-foreground">
                        <span className="block truncate">{t(entry.source)}</span>
                        <span className="block truncate text-[12px] text-text-low">{t(entry.executor)}</span>
                      </div>
                    </div>
                  )

                  return entry.href ? (
                    <a
                      key={entry.id}
                      href={entry.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block transition-colors hover:bg-surface-inset/70"
                    >
                      {row}
                    </a>
                  ) : (
                    <div key={entry.id}>{row}</div>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      ) : newsItems.length > 0 ? (
        <NewsCard
          items={newsItems}
          title={newsTitle}
          viewAllHref={governanceUrl}
          itemHrefFallback={governanceUrl}
          plain
        />
      ) : null}
    </div>
  )
}
